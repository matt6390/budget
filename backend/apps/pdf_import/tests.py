import os
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase, SimpleTestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import PdfImportSession
from .extraction import extract_purchases_from_pdf

User = get_user_model()


class PdfImportSessionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='pdf-user',
            email='pdf-user@example.com',
            password='strongpass123',
        )
        login_response = self.client.post(
            '/api/auth/login/',
            {'username': 'pdf-user', 'password': 'strongpass123'},
            format='json',
        )
        token = login_response.data['access']
        self.auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def test_delete_extracted_session(self):
        session = PdfImportSession.objects.create(
            user=self.user,
            status='extracted',
            extracted_data=[],
        )
        session.pdf_file.save(
            'test-statement.pdf',
            ContentFile(b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
            save=True,
        )
        pdf_path = session.pdf_file.path

        response = self.client.delete(
            f'/api/purchases/import/{session.id}/',
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PdfImportSession.objects.filter(id=session.id).exists())
        self.assertFalse(os.path.exists(pdf_path))


class PdfExtractionTests(SimpleTestCase):
    def test_chase_all_pages_finds_transactions(self):
        pdf_path = Path(__file__).resolve().parents[3] / 'test_pdfs' / '20260504-statements-8200-.pdf'
        purchases = extract_purchases_from_pdf(pdf_path.read_bytes())
        self.assertGreater(len(purchases), 0)

    def test_usaa_statement_finds_transactions(self):
        pdf_path = Path(__file__).resolve().parents[3] / 'test_pdfs' / 'march 2026 bank statement.pdf'
        purchases = extract_purchases_from_pdf(pdf_path.read_bytes())
        self.assertGreater(len(purchases), 0)
