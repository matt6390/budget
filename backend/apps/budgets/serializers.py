from decimal import Decimal
from rest_framework import serializers

from .models import Category, IncomeSource, Loan, Purchase, RecurringExpense, SavingsContribution, SavingsGoal


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']


class IncomeSourceSerializer(serializers.ModelSerializer):
    monthly_equivalent = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = IncomeSource
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'monthly_equivalent']


class RecurringExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = RecurringExpense
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'category_name']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None


class PurchaseSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    month = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'category_name', 'month']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_month(self, obj):
        return obj.date.strftime('%Y-%m') if obj.date else None


class SavingsContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingsContribution
        fields = ['id', 'goal', 'amount', 'date', 'note', 'created_at']
        read_only_fields = ['id', 'created_at']


class SavingsGoalSerializer(serializers.ModelSerializer):
    current_amount = serializers.SerializerMethodField()
    percent_complete = serializers.SerializerMethodField()
    monthly_needed = serializers.SerializerMethodField()
    contributions = SavingsContributionSerializer(many=True, read_only=True)

    class Meta:
        model = SavingsGoal
        fields = [
            'id', 'name', 'target_amount', 'current_amount', 'percent_complete',
            'target_date', 'notes', 'is_complete', 'monthly_needed',
            'contributions', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'current_amount', 'percent_complete', 'monthly_needed', 'created_at', 'updated_at']

    def get_current_amount(self, obj) -> str:
        return f'{obj.current_amount:.2f}'

    def get_percent_complete(self, obj) -> float:
        target = obj.target_amount
        if target <= 0:
            return 0.0
        pct = (obj.current_amount / target) * 100
        return round(float(min(pct, Decimal('100'))), 1)

    def get_monthly_needed(self, obj) -> str | None:
        """Monthly amount required to hit target by target_date (if set)."""
        from datetime import date
        if not obj.target_date:
            return None
        remaining = obj.target_amount - obj.current_amount
        if remaining <= 0:
            return '0.00'
        today = date.today()
        months_left = (obj.target_date.year - today.year) * 12 + (obj.target_date.month - today.month)
        if months_left <= 0:
            return str(f'{remaining:.2f}')
        return f'{(remaining / months_left):.2f}'


class LoanSerializer(serializers.ModelSerializer):
    loan_type_display = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = [
            'id', 'name', 'loan_type', 'loan_type_display',
            'original_amount', 'current_balance', 'interest_rate',
            'monthly_payment', 'start_date', 'term_months',
            'extra_payment', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'loan_type_display']

    def get_loan_type_display(self, obj) -> str:
        return obj.get_loan_type_display()
