from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone


def send_payment_confirmation_email(user, payment):
    """
    Send payment confirmation email to user.
    
    Args:
        user: Django User object
        payment: Payment model instance
    """
    if not user.email:
        return False
    
    tier_names = {
        'basic': 'Blue',
        'premium': 'Premium', 
        'organization': 'Organization',
    }
    
    tier_display = tier_names.get(payment.tier, payment.tier.title())
    
    subject = f"✅ Payment Confirmed - {tier_display} Subscription"
    
    # Plain text version
    text_content = f"""
Hi {user.first_name or user.username},

Your payment has been confirmed! 🎉

Receipt Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reference: {payment.reference}
Amount: {payment.amount} {payment.currency}
Plan: {tier_display} ({payment.billing_cycle.title()})
Payment Method: {payment.get_payment_method_display()}
Date: {payment.created_at.strftime('%B %d, %Y at %I:%M %p')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your verified badge is now active! Here's what you can do:
• Your blue checkmark is visible on your profile
• You can edit posts for up to 1 hour after posting
• Enjoy longer posts (up to 10,000 characters)
• Access creator analytics

Thank you for subscribing!

— The Team
"""
    
    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
    <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%); padding: 30px; text-align: center;">
            <div style="width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">✓</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Payment Confirmed!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px;">
                Hi <strong>{user.first_name or user.username}</strong>,
            </p>
            <p style="color: #666; font-size: 15px; margin: 0 0 25px;">
                Your payment has been processed successfully. Your verified badge is now active! 🎉
            </p>
            
            <!-- Receipt Box -->
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #333; margin: 0 0 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Receipt</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Reference</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-family: monospace;">{payment.reference}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Amount</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: bold;">{payment.amount} {payment.currency}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Plan</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">{tier_display} ({payment.billing_cycle.title()})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Payment Method</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">{payment.get_payment_method_display()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Date</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">{payment.created_at.strftime('%B %d, %Y')}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Features -->
            <p style="color: #333; font-size: 15px; margin: 0 0 10px; font-weight: 600;">Your new features:</p>
            <ul style="color: #666; font-size: 14px; margin: 0 0 25px; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Blue checkmark on your profile</li>
                <li style="margin-bottom: 8px;">Edit posts for up to 1 hour</li>
                <li style="margin-bottom: 8px;">Longer posts (up to 10,000 characters)</li>
                <li style="margin-bottom: 8px;">Creator analytics dashboard</li>
            </ul>
            
            <a href="#" style="display: block; background: linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%); color: white; text-decoration: none; padding: 14px 24px; border-radius: 30px; font-weight: 600; text-align: center; font-size: 15px;">
                View Your Profile
            </a>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px 30px; background: #f8f9fa; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
                You can manage your subscription in Settings → Subscription
            </p>
        </div>
    </div>
</body>
</html>
"""
    
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        
        # Update payment record
        payment.email_sent = True
        payment.email_sent_at = timezone.now()
        payment.save(update_fields=['email_sent', 'email_sent_at'])
        
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


def send_subscription_cancelled_email(user, subscription):
    """
    Send subscription cancellation confirmation email.
    """
    if not user.email:
        return False
    
    subject = "Subscription Cancelled"
    
    text_content = f"""
Hi {user.first_name or user.username},

Your subscription has been cancelled as requested.

Your verified status will remain active until {subscription.expires_at.strftime('%B %d, %Y')}.

After that date:
• Your verified badge will be removed
• Premium features will no longer be available

You can resubscribe anytime from the Get Verified page.

Thank you for being a subscriber!

— The Team
"""
    
    try:
        send_mail(
            subject=subject,
            message=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send cancellation email: {e}")
        return False
