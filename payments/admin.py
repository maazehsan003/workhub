from django.contrib import admin
from .models import Wallet, Payment, Transaction

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ['user', 'balance', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'from_user', 'to_user', 'amount', 'status', 'payment_type', 'created_at']
    list_filter = ['status', 'payment_type', 'created_at']
    search_fields = ['from_user__username', 'to_user__username', 'job__title']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['job', 'from_user', 'to_user']

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['wallet', 'amount', 'transaction_type', 'balance_after', 'created_at']
    list_filter = ['transaction_type', 'created_at']
    search_fields = ['wallet__user__username', 'description']
    readonly_fields = ['created_at']
    raw_id_fields = ['wallet', 'payment']