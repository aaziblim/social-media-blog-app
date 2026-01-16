from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Subscription(models.Model):
    """
    User subscription for verified status.
    Tracks subscription tier, status, and billing cycle.
    """
    TIER_CHOICES = [
        ('basic', 'Blue'),
        ('premium', 'Premium'),
        ('organization', 'Organization'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('pending', 'Pending'),
    ]
    
    BILLING_CHOICES = [
        ('monthly', 'Monthly'),
        ('annual', 'Annual'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    tier = models.CharField(max_length=20, choices=TIER_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CHOICES, default='monthly')
    
    # Pricing (stored at time of subscription)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    # Dates
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Paystack subscription reference (for recurring)
    paystack_subscription_code = models.CharField(max_length=100, blank=True, null=True)
    paystack_customer_code = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.tier} ({self.status})"
    
    @property
    def is_active(self):
        return self.status == 'active' and self.expires_at > timezone.now()
    
    def cancel(self):
        """Cancel the subscription."""
        self.status = 'cancelled'
        self.cancelled_at = timezone.now()
        self.save()


class Payment(models.Model):
    """
    Individual payment transaction.
    Tracks each payment attempt and its status.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('abandoned', 'Abandoned'),
    ]
    
    METHOD_CHOICES = [
        ('card', 'Credit/Debit Card'),
        ('mobile_money', 'Mobile Money'),
        ('bank', 'Bank Transfer'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    
    # Paystack reference
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    paystack_reference = models.CharField(max_length=100, blank=True, null=True)
    
    # Amount
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    # Payment details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='card')
    tier = models.CharField(max_length=20)  # Subscription tier being purchased
    billing_cycle = models.CharField(max_length=20, default='monthly')
    
    # For mobile money
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    momo_provider = models.CharField(max_length=20, blank=True, null=True)  # mtn, vod, tgo
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Email tracking
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.reference} - {self.amount} {self.currency} ({self.status})"
    
    def mark_success(self, paystack_reference=None):
        """Mark payment as successful."""
        self.status = 'success'
        self.verified_at = timezone.now()
        if paystack_reference:
            self.paystack_reference = paystack_reference
        self.save()
    
    def mark_failed(self):
        """Mark payment as failed."""
        self.status = 'failed'
        self.save()
