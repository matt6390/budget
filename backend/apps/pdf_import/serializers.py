from rest_framework import serializers
from .models import PdfImportSession, MerchantCategory
from apps.budgets.models import Category


class PdfImportSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PdfImportSession
        fields = ['id', 'pdf_file', 'status', 'extracted_data', 'created_at', 'updated_at']
        read_only_fields = ['status', 'extracted_data', 'created_at', 'updated_at']


class MerchantCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = MerchantCategory
        fields = ['id', 'merchant_name', 'category', 'category_name', 'created_at', 'last_used_at']
        read_only_fields = ['created_at', 'last_used_at']
