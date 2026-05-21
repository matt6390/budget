from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models


MONTHLY_EQUIVALENT_PRECISION = Decimal('0.01')


def calculate_monthly_equivalent(amount: Decimal, cadence: str) -> Decimal:
    cadence_multipliers = {
        'monthly': Decimal('1'),
        'biweekly': Decimal('26') / Decimal('12'),
        'weekly': Decimal('52') / Decimal('12'),
        'semimonthly': Decimal('2'),
        'annual': Decimal('1') / Decimal('12'),
    }
    return amount * cadence_multipliers.get(cadence, Decimal('1'))


def quantize_currency(amount: Decimal) -> Decimal:
    return amount.quantize(MONTHLY_EQUIVALENT_PRECISION, rounding=ROUND_HALF_UP)


class Category(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#6366f1')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'name']]

    def __str__(self) -> str:
        return self.name


class IncomeSource(models.Model):
    CADENCE_CHOICES = [
        ('monthly', 'Monthly'),
        ('biweekly', 'Every Two Weeks'),
        ('weekly', 'Weekly'),
        ('semimonthly', 'Twice a Month'),
        ('annual', 'Annual'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    cadence = models.CharField(max_length=20, choices=CADENCE_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def monthly_equivalent(self) -> Decimal:
        return quantize_currency(calculate_monthly_equivalent(self.amount, self.cadence))

    def __str__(self) -> str:
        return self.name


class RecurringExpense(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_day = models.PositiveSmallIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name


class Purchase(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.description


class SavingsGoal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    target_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def current_amount(self) -> Decimal:
        result = self.contributions.aggregate(total=models.Sum('amount'))['total']
        return result or Decimal('0.00')

    def __str__(self) -> str:
        return self.name


class SavingsContribution(models.Model):
    goal = models.ForeignKey(SavingsGoal, on_delete=models.CASCADE, related_name='contributions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    note = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self) -> str:
        return f'{self.goal.name} +{self.amount}'


class Loan(models.Model):
    LOAN_TYPE_CHOICES = [
        ('mortgage', 'Mortgage'),
        ('auto', 'Auto Loan'),
        ('personal', 'Personal Loan'),
        ('student', 'Student Loan'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    loan_type = models.CharField(max_length=20, choices=LOAN_TYPE_CHOICES, default='other')
    original_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=3)  # annual %
    monthly_payment = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    term_months = models.PositiveIntegerField(null=True, blank=True)
    extra_payment = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name
