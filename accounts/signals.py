from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from accounts.email_service import EmailService


@receiver(post_save, sender=User)
def send_registration_email(sender, instance, created, **kwargs):
    """
    Automatically send welcome email when new user is created
    """
    if created:
        EmailService.send_welcome_email(instance)
