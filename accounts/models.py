from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    ROLE_CHOICES = [
        ('freelancer', 'Freelancer'),
        ('client', 'Client'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.role if self.role else 'No role yet'}"

# for freelancers
class FreelancerProfile(models.Model):
    profile = models.OneToOneField(Profile, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100,)
    last_name = models.CharField(max_length=100,)
    title = models.CharField(max_length=100)
    bio = models.TextField()
    skills = models.CharField(max_length=250)
    phone_number = models.CharField(max_length=20)
    hourly_rate = models.DecimalField(max_digits=6, decimal_places=2)
    profile_picture = models.ImageField(upload_to="profile_pics/")

    def __str__(self):
        return f"Freelancer: {self.first_name} {self.last_name} ({self.profile.user.username})"
    
class ClientProfile(models.Model):
    profile = models.OneToOneField(Profile, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    company_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    profile_picture = models.ImageField(upload_to="profile_pics/")

    def __str__(self):
        return f"Client: {self.first_name} {self.last_name} - {self.company_name} ({self.profile.user.username})"