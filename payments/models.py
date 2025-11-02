from django.db import models
from django.contrib.auth.models import User
from jobs.models import Job
from decimal import Decimal

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Wallet - ${self.balance}"
    
    def can_withdraw(self, amount):
        """Check if user has sufficient balance for withdrawal"""
        return self.balance >= amount
    
    def add_funds(self, amount):
        """Add funds to wallet"""
        self.balance += amount
        self.save()
        return self.balance
    
    def deduct_funds(self, amount):
        """Deduct funds from wallet if sufficient balance exists"""
        if self.can_withdraw(amount):
            self.balance -= amount
            self.save()
            return True
        return False

class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_TYPE_CHOICES = [
        ('job_payment', 'Job Payment'),
        ('wallet_topup', 'Wallet Top-up'),
        ('withdrawal', 'Withdrawal'),
        ('refund', 'Refund'),
    ]
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments_sent')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments_received', null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='job_payment')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Payment {self.id}: ${self.amount} - {self.status}"
    
    class Meta:
        ordering = ['-created_at']

class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    ]
    
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='transactions', null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    description = models.CharField(max_length=255)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.transaction_type.title()}: ${self.amount} - {self.wallet.user.username}"
    
    class Meta:
        ordering = ['-created_at']