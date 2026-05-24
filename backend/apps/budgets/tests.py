from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import IncomeSource, Purchase, RecurringExpense

User = get_user_model()


class BudgetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='budget-user', email='budget@example.com', password='strongpass123')
        login_response = self.client.post(
            '/api/auth/login/',
            {'username': 'budget-user', 'password': 'strongpass123'},
            format='json',
        )
        token = login_response.data['access']
        self.auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def create_client_for_user(self, username):
        password = 'strongpass123'
        user = User.objects.create_user(username=username, email=f'{username}@example.com', password=password)
        client = APIClient()
        response = client.post('/api/auth/login/', {'username': username, 'password': password}, format='json')
        token = response.data['access']
        return user, client, {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def test_create_category(self):
        response = self.client.post(
            '/api/budget/categories/',
            {'name': 'Housing', 'color': '#123456'},
            format='json',
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Housing')

    def test_create_category_with_theme(self):
        response = self.client.post(
            '/api/budget/categories/',
            {'name': 'Groceries', 'theme': 'Food', 'color': '#22c55e'},
            format='json',
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['theme'], 'Food')

    def test_category_isolation(self):
        other_user, other_client, other_headers = self.create_client_for_user('second-user')

        self.client.post(
            '/api/budget/categories/',
            {'name': 'Groceries', 'color': '#22c55e'},
            format='json',
            **self.auth_headers,
        )
        other_client.post(
            '/api/budget/categories/',
            {'name': 'Travel', 'color': '#3b82f6'},
            format='json',
            **other_headers,
        )

        own_list = self.client.get('/api/budget/categories/', **self.auth_headers)
        other_list = other_client.get('/api/budget/categories/', **other_headers)

        self.assertEqual(own_list.status_code, status.HTTP_200_OK)
        self.assertEqual(other_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(own_list.data), 1)
        self.assertEqual(len(other_list.data), 1)
        self.assertEqual(own_list.data[0]['name'], 'Groceries')
        self.assertEqual(other_list.data[0]['name'], 'Travel')
        self.assertNotEqual(self.user.id, other_user.id)

    def test_create_income_source(self):
        response = self.client.post(
            '/api/budget/income/',
            {'name': 'Salary', 'amount': '5000.00', 'cadence': 'monthly', 'is_active': True},
            format='json',
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('monthly_equivalent', response.data)
        self.assertEqual(Decimal(response.data['monthly_equivalent']), Decimal('5000.00'))

    def test_income_monthly_equivalent_biweekly(self):
        response = self.client.post(
            '/api/budget/income/',
            {'name': 'Paycheck', 'amount': '2000.00', 'cadence': 'biweekly', 'is_active': True},
            format='json',
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertAlmostEqual(float(response.data['monthly_equivalent']), 4333.33, places=2)

    def test_create_purchase(self):
        response = self.client.post(
            '/api/budget/purchases/',
            {'description': 'Desk chair', 'amount': '199.99', 'date': str(date.today()), 'notes': 'Office'},
            format='json',
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['description'], 'Desk chair')

    def test_purchase_filter_by_month(self):
        Purchase.objects.create(user=self.user, description='January purchase', amount='25.00', date=date(2024, 1, 10))
        Purchase.objects.create(user=self.user, description='February purchase', amount='50.00', date=date(2024, 2, 10))

        response = self.client.get('/api/budget/purchases/?month=2024-02', **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['description'], 'February purchase')

    def test_summary_endpoint(self):
        IncomeSource.objects.create(user=self.user, name='Salary', amount='5000.00', cadence='monthly', is_active=True)
        RecurringExpense.objects.create(user=self.user, name='Rent', amount='1200.00', is_active=True)
        Purchase.objects.create(user=self.user, description='Groceries', amount='250.00', date=date(2024, 2, 15))

        response = self.client.get('/api/budget/summary/?month=2024-02', **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['monthly_income']), Decimal('5000.00'))
        self.assertEqual(Decimal(response.data['monthly_expenses']), Decimal('1200.00'))
        self.assertEqual(Decimal(response.data['spending_this_month']), Decimal('250.00'))
        self.assertEqual(Decimal(response.data['net_budget']), Decimal('3550.00'))

    def test_summary_excludes_inactive_income(self):
        IncomeSource.objects.create(user=self.user, name='Active Job', amount='3000.00', cadence='monthly', is_active=True)
        IncomeSource.objects.create(user=self.user, name='Old Job', amount='2000.00', cadence='monthly', is_active=False)

        response = self.client.get('/api/budget/summary/?month=2024-02', **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['monthly_income']), Decimal('3000.00'))

    def test_create_recurring_expense(self):
        response = self.client.post(
            '/api/budget/expenses/',
            {'name': 'Netflix', 'amount': '15.99', 'is_active': True},
            format='json',
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Netflix')
        self.assertEqual(Decimal(response.data['amount']), Decimal('15.99'))

    def test_create_expense_with_category(self):
        cat_response = self.client.post(
            '/api/budget/categories/',
            {'name': 'Subscriptions', 'color': '#6366f1'},
            format='json',
            **self.auth_headers,
        )
        category_id = cat_response.data['id']

        response = self.client.post(
            '/api/budget/expenses/',
            {'name': 'Spotify', 'amount': '9.99', 'category': category_id, 'is_active': True},
            format='json',
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['category_name'], 'Subscriptions')

    def test_summary_spending_by_category(self):
        cat_response = self.client.post(
            '/api/budget/categories/',
            {'name': 'Food', 'color': '#22c55e'},
            format='json',
            **self.auth_headers,
        )
        category_id = cat_response.data['id']
        Purchase.objects.create(user=self.user, description='Lunch', amount='15.00', date=date(2024, 3, 5), category_id=category_id)
        Purchase.objects.create(user=self.user, description='Dinner', amount='30.00', date=date(2024, 3, 10), category_id=category_id)
        Purchase.objects.create(user=self.user, description='Book', amount='20.00', date=date(2024, 3, 15))

        response = self.client.get('/api/budget/summary/?month=2024-03', **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['spending_this_month']), Decimal('65.00'))
        category_totals = {item['category_name']: Decimal(item['total']) for item in response.data['spending_by_category']}
        self.assertEqual(category_totals.get('Food'), Decimal('45.00'))
        self.assertEqual(category_totals.get('Uncategorized'), Decimal('20.00'))

    def test_purchase_requires_auth(self):
        response = self.client.post(
            '/api/budget/purchases/',
            {'description': 'Test', 'amount': '10.00', 'date': str(date.today())},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
