from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.signup_url = '/api/auth/signup/'
        self.login_url = '/api/auth/login/'
        self.me_url = '/api/auth/me/'
        self.logout_url = '/api/auth/logout/'
        self.password = 'strongpass123'

    def signup_payload(self, username='alice'):
        return {
            'username': username,
            'email': f'{username}@example.com',
            'password': self.password,
        }

    def signup(self, username='alice'):
        return self.client.post(self.signup_url, self.signup_payload(username), format='json')

    def login(self, username='alice', password=None):
        return self.client.post(
            self.login_url,
            {'username': username, 'password': password or self.password},
            format='json',
        )

    def auth_headers_from_response(self, response):
        return {'HTTP_AUTHORIZATION': f"Bearer {response.data['access']}"}

    def test_signup_success(self):
        response = self.signup()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'alice')

    def test_signup_duplicate_username(self):
        self.signup()
        response = self.signup()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_signup_short_password(self):
        response = self.client.post(
            self.signup_url,
            {'username': 'shorty', 'email': 'shorty@example.com', 'password': 'short'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_login_success(self):
        self.signup()
        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_wrong_password(self):
        self.signup()
        response = self.login(password='wrongpass123')

        self.assertIn(response.status_code, {status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED})

    def test_me_requires_auth(self):
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_user(self):
        signup_response = self.signup()
        response = self.client.get(self.me_url, **self.auth_headers_from_response(signup_response))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'alice')

    def test_logout(self):
        signup_response = self.signup()
        response = self.client.post(self.logout_url, format='json', **self.auth_headers_from_response(signup_response))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_profile_email(self):
        signup_response = self.signup()
        headers = self.auth_headers_from_response(signup_response)
        response = self.client.patch(
            self.me_url,
            {'email': 'newemail@example.com'},
            format='json',
            **headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'newemail@example.com')

    def test_update_password_success(self):
        signup_response = self.signup()
        headers = self.auth_headers_from_response(signup_response)
        response = self.client.patch(
            self.me_url,
            {'password': 'newpassword99', 'current_password': self.password},
            format='json',
            **headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Confirm new password works
        login_response = self.login(password='newpassword99')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_update_password_wrong_current(self):
        signup_response = self.signup()
        headers = self.auth_headers_from_response(signup_response)
        response = self.client.patch(
            self.me_url,
            {'password': 'newpassword99', 'current_password': 'wrongcurrentpass'},
            format='json',
            **headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_refresh(self):
        signup_response = self.signup()
        refresh_token = signup_response.data['refresh']
        response = self.client.post(
            '/api/auth/token/refresh/',
            {'refresh': refresh_token},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
