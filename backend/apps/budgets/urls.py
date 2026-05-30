from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryThemeViewSet,
    CategoryViewSet,
    IncomeSourceViewSet,
    LoanViewSet,
    PurchaseViewSet,
    RecurringExpenseViewSet,
    SavingsGoalViewSet,
    SummaryView,
)

router = DefaultRouter()
router.register('themes', CategoryThemeViewSet, basename='theme')
router.register('categories', CategoryViewSet, basename='category')
router.register('income', IncomeSourceViewSet, basename='income')
router.register('expenses', RecurringExpenseViewSet, basename='expense')
router.register('purchases', PurchaseViewSet, basename='purchase')
router.register('savings', SavingsGoalViewSet, basename='savings')
router.register('loans', LoanViewSet, basename='loan')

urlpatterns = router.urls + [
    path('summary/', SummaryView.as_view(), name='budget-summary'),
]
