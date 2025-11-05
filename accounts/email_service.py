from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Simple email service using Django's send_mail"""
    
    @staticmethod
    def send_welcome_email(user):
        """Send welcome email to newly registered user"""
        subject = 'Welcome! Your Account Has Been Created'
        
        # Render HTML template - corrected path to match your template location
        html_message = render_to_string('accounts/welcome_email.html', {
            'username': user.username,
            'email': user.email,
        })
        
        # Create plain text version
        plain_message = strip_tags(html_message)
        
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Welcome email sent successfully to {user.email}")
            return True
        except Exception as e:
            logger.error(f"Error sending welcome email to {user.email}: {e}")
            print(f"Email Error: {e}")  # Added for debugging
            return False