from django.conf import settings
from django.db import models


class PdfImportSession(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('extracted', 'Extracted'),
        ('confirmed', 'Confirmed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    pdf_file = models.FileField(upload_to='pdf_imports/%Y/%m/%d/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    extracted_data = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.user} - {self.pdf_file.name}'


class MerchantCategory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='merchant_categories')
    merchant_name = models.CharField(max_length=200)
    category = models.ForeignKey('budgets.Category', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [['user', 'merchant_name']]
        ordering = ['-last_used_at', '-created_at']

    def __str__(self) -> str:
        return f'{self.merchant_name} → {self.category.name if self.category else "Unset"}'

