from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PdfImportSessionViewSet, MerchantCategoryViewSet

router = DefaultRouter()
router.register('import', PdfImportSessionViewSet, basename='pdf-import')
router.register('merchant-categories', MerchantCategoryViewSet, basename='merchant-category')

urlpatterns = router.urls
