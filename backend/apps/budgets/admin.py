from django.contrib import admin

from .models import Category, IncomeSource, Purchase, RecurringExpense


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'color', 'created_at')
    search_fields = ('name', 'user__email')


@admin.register(IncomeSource)
class IncomeSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'amount', 'cadence', 'is_active', 'created_at')
    list_filter = ('cadence', 'is_active')
    search_fields = ('name', 'user__email')


@admin.register(RecurringExpense)
class RecurringExpenseAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'category', 'amount', 'due_day', 'is_active', 'created_at')
    list_filter = ('is_active', 'category')
    search_fields = ('name', 'user__email')


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('description', 'user', 'category', 'amount', 'date', 'created_at')
    list_filter = ('category', 'date')
    search_fields = ('description', 'user__email')
