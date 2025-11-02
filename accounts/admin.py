from django.contrib import admin
from .models import Profile, FreelancerProfile, ClientProfile

admin.site.register(Profile)
admin.site.register(FreelancerProfile)
admin.site.register(ClientProfile)
