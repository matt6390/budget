from decimal import Decimal, InvalidOperation

from rest_framework import serializers
from .models import PdfImportSession, MerchantCategory
from apps.budgets.models import Category


class PdfImportSessionSerializer(serializers.ModelSerializer):
    total_amount = serializers.SerializerMethodField()
    confirmed_purchase_count = serializers.SerializerMethodField()

    class Meta:
        model = PdfImportSession
        fields = [
            'id', 'pdf_file', 'status', 'extracted_data',
            'total_amount', 'confirmed_purchase_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'status', 'extracted_data',
            'total_amount', 'confirmed_purchase_count',
            'created_at', 'updated_at',
        ]

    def get_total_amount(self, obj) -> str:
        if not obj.extracted_data:
            return '0.00'
        total = Decimal('0')
        for item in obj.extracted_data:
            try:
                total += Decimal(str(item.get('amount', '0')))
            except (InvalidOperation, TypeError):
                pass
        return str(total.quantize(Decimal('0.01')))

    def get_confirmed_purchase_count(self, obj) -> int:
        return obj.purchases.count()


class MerchantCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = MerchantCategory
        fields = ['id', 'merchant_name', 'category', 'category_name', 'created_at', 'last_used_at']
        read_only_fields = ['created_at', 'last_used_at']
