import logging
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser

from apps.mixins import UserOwnedQuerySetMixin
from .models import PdfImportSession, MerchantCategory
from .serializers import PdfImportSessionSerializer, MerchantCategorySerializer
from .extraction import extract_purchases_from_pdf, PdfExtractor
from apps.budgets.models import Purchase, Category

logger = logging.getLogger(__name__)


class PdfImportSessionViewSet(UserOwnedQuerySetMixin, viewsets.ModelViewSet):
    queryset = PdfImportSession.objects.all()
    serializer_class = PdfImportSessionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]

    def _parse_page_numbers(self, page_numbers_param):
        """Parse page numbers from form input; return None when omitted."""
        if not page_numbers_param:
            return None

        if isinstance(page_numbers_param, str):
            parsed = [int(p.strip()) for p in page_numbers_param.split(',') if p.strip().isdigit()]
        elif isinstance(page_numbers_param, list):
            parsed = [int(p) for p in page_numbers_param if isinstance(p, (int, str)) and str(p).isdigit()]
        else:
            parsed = []

        if not parsed:
            raise ValueError('Invalid page numbers')
        return sorted(set(parsed))

    @action(detail=False, methods=['post'], url_path='page-count')
    def page_count(self, request):
        """Return the number of pages in an uploaded PDF (no extraction)."""
        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            return Response({'error': 'No PDF file provided'}, status=status.HTTP_400_BAD_REQUEST)
        if not pdf_file.name.lower().endswith('.pdf'):
            return Response({'error': 'File must be a PDF'}, status=status.HTTP_400_BAD_REQUEST)
        pdf_content = pdf_file.read()
        extractor = PdfExtractor(pdf_content)
        count = extractor.get_page_count()
        return Response({'page_count': count})

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        """Upload PDF and extract purchase data."""
        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            return Response({'error': 'No PDF file provided'}, status=status.HTTP_400_BAD_REQUEST)

        if not pdf_file.name.lower().endswith('.pdf'):
            return Response({'error': 'File must be a PDF'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            page_numbers = self._parse_page_numbers(request.data.get('page_numbers'))
        except ValueError:
            return Response({'error': 'Invalid page numbers'}, status=status.HTTP_400_BAD_REQUEST)

        pdf_content = pdf_file.read()
        if not pdf_content:
            return Response({'error': 'PDF file is empty'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            extracted_data = extract_purchases_from_pdf(pdf_content, page_numbers)
        except ValueError as exc:
            logger.warning('Extraction error for user %s: %s', request.user.id, exc)
            return Response({'error': f'Failed to extract PDF: {exc}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception('Unexpected error during extraction for user %s', request.user.id)
            return Response({'error': 'Failed to process PDF'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        session = PdfImportSession.objects.create(
            user=request.user,
            pdf_file=pdf_file,
            status='extracted',
            extracted_data=extracted_data,
        )
        return Response(PdfImportSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        """Confirm and save extracted purchases."""
        session = self.get_object()

        if session.status == 'confirmed':
            return Response({'error': 'Session already confirmed'}, status=status.HTTP_400_BAD_REQUEST)

        purchases_data = request.data.get('purchases', [])

        if not purchases_data:
            return Response({'error': 'No purchases provided'}, status=status.HTTP_400_BAD_REQUEST)

        pdf_note = f'Imported from PDF: {session.pdf_file.name}' if session.pdf_file else ''

        created_purchases = []
        for i, purchase_data in enumerate(purchases_data):
            try:
                category_id = purchase_data.get('category')
                category = None
                if category_id is not None and category_id != '':
                    try:
                        cid = int(category_id)
                        category = Category.objects.filter(id=cid, user=request.user).first()
                        if category is None:
                            logger.warning(
                                'Category %s not found for user %s during PDF import confirm',
                                cid, request.user.id
                            )
                    except (ValueError, TypeError):
                        logger.warning('Invalid category_id value %r for user %s', category_id, request.user.id)

                merchant_name = purchase_data.get('merchant', '')
                purchase = Purchase.objects.create(
                    user=request.user,
                    category=category,
                    description=merchant_name,
                    amount=purchase_data['amount'],
                    date=purchase_data['date'],
                    notes=pdf_note,
                )

                # Update merchant category lookup
                if merchant_name and category:
                    merchant_cat, _ = MerchantCategory.objects.get_or_create(
                        user=request.user,
                        merchant_name=merchant_name,
                    )
                    merchant_cat.category = category
                    merchant_cat.last_used_at = timezone.now()
                    merchant_cat.save()

                created_purchases.append(purchase.id)
            except Exception as e:
                logger.exception(
                    'Failed to create purchase %d for user %s: %s | data=%r',
                    i, request.user.id, e, purchase_data
                )
                return Response(
                    {'error': f'Failed to create purchase #{i + 1} ({purchase_data.get("merchant", "?")}): {e}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        session.status = 'confirmed'
        session.save()

        return Response({
            'session_id': session.id,
            'created_purchases': created_purchases,
            'count': len(created_purchases),
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='pdf')
    def serve_pdf(self, request, pk=None):
        """Serve the uploaded PDF file for authenticated owners."""
        from django.http import FileResponse
        import os

        session = self.get_object()
        if not session.pdf_file:
            return Response({'error': 'No PDF file attached to this import'}, status=status.HTTP_404_NOT_FOUND)

        try:
            pdf_path = session.pdf_file.path
            filename = os.path.basename(session.pdf_file.name)
            response = FileResponse(open(pdf_path, 'rb'), content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
        except FileNotFoundError:
            logger.warning('PDF file missing on disk for session %s: %s', session.id, session.pdf_file.name)
            return Response({'error': 'PDF file not found on server'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='suggest-category-batch')
    def suggest_category_batch(self, request):
        """Get suggested categories for multiple merchant names in a single request."""
        merchant_names = request.data.get('merchant_names', [])
        if not isinstance(merchant_names, list):
            return Response({'error': 'merchant_names must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch all matching lookups in one query
        merchant_cats = MerchantCategory.objects.filter(
            user=request.user,
            merchant_name__in=merchant_names,
        ).select_related('category')

        lookup = {mc.merchant_name: mc for mc in merchant_cats}
        result = {}
        for name in merchant_names:
            mc = lookup.get(name)
            if mc and mc.category:
                result[name] = {
                    'category_id': mc.category.id,
                    'category_name': mc.category.name,
                }
            else:
                result[name] = None

        return Response(result)

    def destroy(self, request, *args, **kwargs):
        """Delete a session and its uploaded PDF file."""
        session = self.get_object()
        # Delete the stored PDF from disk before removing the record
        if session.pdf_file:
            try:
                session.pdf_file.delete(save=False)
            except Exception:
                logger.warning('Failed to delete PDF file for session %s', session.id, exc_info=True)
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='suggest-category')
    def suggest_category(self, request):
        """Get suggested category for a merchant name."""
        merchant_name = request.query_params.get('merchant_name', '').strip()

        if not merchant_name:
            return Response({'error': 'merchant_name query parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        mc = MerchantCategory.objects.filter(user=request.user, merchant_name=merchant_name).select_related('category').first()
        if mc and mc.category:
            return Response({
                'merchant_name': merchant_name,
                'category_id': mc.category.id,
                'category_name': mc.category.name,
            })

        return Response({
            'merchant_name': merchant_name,
            'category_id': None,
            'category_name': None,
        })


class MerchantCategoryViewSet(UserOwnedQuerySetMixin, viewsets.ModelViewSet):
    queryset = MerchantCategory.objects.all()
    serializer_class = MerchantCategorySerializer
    permission_classes = [IsAuthenticated]
