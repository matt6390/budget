from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Category,
    IncomeSource,
    Loan,
    Purchase,
    RecurringExpense,
    SavingsContribution,
    SavingsGoal,
    calculate_monthly_equivalent,
    quantize_currency,
)
from .serializers import (
    CategorySerializer,
    IncomeSourceSerializer,
    LoanSerializer,
    PurchaseSerializer,
    RecurringExpenseSerializer,
    SavingsContributionSerializer,
    SavingsGoalSerializer,
)


def parse_month_param(month_value: str | None):
    if not month_value:
        return None

    try:
        parsed = datetime.strptime(month_value, '%Y-%m')
    except ValueError as exc:
        raise ValidationError({'month': 'Month must be in YYYY-MM format.'}) from exc

    return parsed.year, parsed.month


def format_currency(amount: Decimal) -> str:
    return f'{quantize_currency(amount):.2f}'


def calculate_payoff(balance: Decimal, annual_rate_pct: Decimal, monthly_payment: Decimal, extra: Decimal = Decimal('0')):
    """
    Simulate loan amortization month-by-month.
    Returns (months_to_payoff, total_interest_paid).
    """
    monthly_rate = annual_rate_pct / Decimal('100') / Decimal('12')
    b = balance
    total_interest = Decimal('0')
    months = 0
    payment = monthly_payment + extra

    if payment <= 0 or b <= 0:
        return 0, Decimal('0')

    while b > 0 and months < 1200:  # cap at 100 years
        interest = (b * monthly_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        principal = min(payment - interest, b)
        if principal <= 0:
            # Payment doesn't cover interest — loan never pays off
            return None, None
        total_interest += interest
        b -= principal
        months += 1

    return months, total_interest


class UserOwnedQuerySetMixin:
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryViewSet(UserOwnedQuerySetMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer


class IncomeSourceViewSet(UserOwnedQuerySetMixin, viewsets.ModelViewSet):
    queryset = IncomeSource.objects.all().order_by('-created_at')
    serializer_class = IncomeSourceSerializer


class RecurringExpenseViewSet(UserOwnedQuerySetMixin, viewsets.ModelViewSet):
    queryset = RecurringExpense.objects.select_related('category').all().order_by('-created_at')
    serializer_class = RecurringExpenseSerializer


class PurchaseViewSet(UserOwnedQuerySetMixin, viewsets.ModelViewSet):
    queryset = Purchase.objects.select_related('category').all().order_by('-date', '-created_at')
    serializer_class = PurchaseSerializer

    def get_queryset(self):
        queryset = Purchase.objects.select_related('category').filter(user=self.request.user).order_by('-date', '-created_at')
        month_value = self.request.query_params.get('month')
        category_id = self.request.query_params.get('category')
        start_date = self.request.query_params.get('start')
        end_date = self.request.query_params.get('end')

        if month_value:
            year, month = parse_month_param(month_value)
            queryset = queryset.filter(date__year=year, date__month=month)

        if category_id:
            queryset = queryset.filter(category_id=category_id)

        if start_date:
            parsed_start = parse_date(start_date)
            if parsed_start is None:
                raise ValidationError({'start': 'Start date must be in YYYY-MM-DD format.'})
            queryset = queryset.filter(date__gte=parsed_start)

        if end_date:
            parsed_end = parse_date(end_date)
            if parsed_end is None:
                raise ValidationError({'end': 'End date must be in YYYY-MM-DD format.'})
            queryset = queryset.filter(date__lte=parsed_end)

        return queryset


class SavingsGoalViewSet(UserOwnedQuerySetMixin, viewsets.ModelViewSet):
    queryset = SavingsGoal.objects.prefetch_related('contributions').all().order_by('-created_at')
    serializer_class = SavingsGoalSerializer

    @action(detail=True, methods=['post'], url_path='contribute')
    def contribute(self, request, pk=None):
        goal = self.get_object()
        serializer = SavingsContributionSerializer(data={**request.data, 'goal': goal.pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Return the updated goal
        return Response(SavingsGoalSerializer(goal).data)

    @action(detail=True, methods=['delete'], url_path='contributions/(?P<contribution_pk>[^/.]+)')
    def delete_contribution(self, request, pk=None, contribution_pk=None):
        goal = self.get_object()
        try:
            contribution = goal.contributions.get(pk=contribution_pk)
        except SavingsContribution.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        contribution.delete()
        return Response(SavingsGoalSerializer(goal).data)


class LoanViewSet(UserOwnedQuerySetMixin, viewsets.ModelViewSet):
    queryset = Loan.objects.all().order_by('-created_at')
    serializer_class = LoanSerializer

    @action(detail=True, methods=['get'], url_path='analysis')
    def analysis(self, request, pk=None):
        loan = self.get_object()

        # Compute net budget from current month (to suggest extra payment)
        today = timezone.localdate()
        active_income = IncomeSource.objects.filter(user=request.user, is_active=True)
        active_expenses = RecurringExpense.objects.filter(user=request.user, is_active=True)
        monthly_purchases = Purchase.objects.filter(user=request.user, date__year=today.year, date__month=today.month)

        monthly_income = sum(
            (calculate_monthly_equivalent(s.amount, s.cadence) for s in active_income),
            Decimal('0.00'),
        )
        monthly_expenses = active_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        spending = monthly_purchases.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        net_budget = monthly_income - monthly_expenses - spending

        # Suggest 20% of positive net budget as extra payment (capped at $2,000 for sanity)
        suggested_extra = Decimal('0')
        if net_budget > 0:
            suggested_extra = quantize_currency(min(net_budget * Decimal('0.20'), Decimal('2000')))

        balance = loan.current_balance
        rate = loan.interest_rate
        payment = loan.monthly_payment
        current_extra = loan.extra_payment

        # Standard payoff
        std_months, std_interest = calculate_payoff(balance, rate, payment)
        # Payoff with current extra
        extra_months, extra_interest = calculate_payoff(balance, rate, payment, current_extra)
        # Payoff with suggested extra
        sug_months, sug_interest = calculate_payoff(balance, rate, payment, suggested_extra)

        def months_to_date(n):
            if n is None:
                return None
            y, m = divmod(today.month - 1 + n, 12)
            return f'{today.year + y:04d}-{m + 1:02d}'

        return Response({
            'loan_id': loan.pk,
            'current_balance': format_currency(balance),
            'interest_rate': str(rate),
            'monthly_payment': format_currency(payment),
            'current_extra_payment': format_currency(current_extra),
            'net_budget_this_month': format_currency(net_budget),
            'suggested_extra_payment': format_currency(suggested_extra),
            # Standard payoff
            'standard': {
                'months': std_months,
                'payoff_date': months_to_date(std_months),
                'total_interest': format_currency(std_interest) if std_interest is not None else None,
            },
            # With current extra payment (if set)
            'with_current_extra': {
                'extra_payment': format_currency(current_extra),
                'months': extra_months,
                'payoff_date': months_to_date(extra_months),
                'total_interest': format_currency(extra_interest) if extra_interest is not None else None,
                'interest_saved': format_currency(std_interest - extra_interest) if std_interest is not None and extra_interest is not None else None,
                'months_saved': (std_months - extra_months) if std_months is not None and extra_months is not None else None,
            },
            # With suggested extra payment
            'with_suggested_extra': {
                'extra_payment': format_currency(suggested_extra),
                'months': sug_months,
                'payoff_date': months_to_date(sug_months),
                'total_interest': format_currency(sug_interest) if sug_interest is not None else None,
                'interest_saved': format_currency(std_interest - sug_interest) if std_interest is not None and sug_interest is not None else None,
                'months_saved': (std_months - sug_months) if std_months is not None and sug_months is not None else None,
            },
        })


class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month_value = request.query_params.get('month')
        parsed_month = parse_month_param(month_value)
        if parsed_month is None:
            today = timezone.localdate()
            year, month = today.year, today.month
        else:
            year, month = parsed_month

        month_label = f'{year:04d}-{month:02d}'
        active_income_sources = IncomeSource.objects.filter(user=request.user, is_active=True)
        active_recurring_expenses = RecurringExpense.objects.filter(user=request.user, is_active=True)
        monthly_purchases = Purchase.objects.filter(user=request.user, date__year=year, date__month=month)

        monthly_income = sum(
            (calculate_monthly_equivalent(source.amount, source.cadence) for source in active_income_sources),
            Decimal('0.00'),
        )
        monthly_expenses = active_recurring_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        spending_this_month = monthly_purchases.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        net_budget = monthly_income - monthly_expenses - spending_this_month

        spending_by_category = []
        grouped_spending = monthly_purchases.values('category_id', 'category__name', 'category__color').annotate(
            total=Sum('amount')
        ).order_by('category__name', 'category_id')
        for item in grouped_spending:
            spending_by_category.append(
                {
                    'category_id': item['category_id'],
                    'category_name': item['category__name'] or 'Uncategorized',
                    'color': item['category__color'] or '#94a3b8',
                    'total': format_currency(item['total'] or Decimal('0.00')),
                }
            )

        return Response(
            {
                'month': month_label,
                'monthly_income': format_currency(monthly_income),
                'monthly_expenses': format_currency(monthly_expenses),
                'spending_this_month': format_currency(spending_this_month),
                'net_budget': format_currency(net_budget),
                'spending_by_category': spending_by_category,
            }
        )
