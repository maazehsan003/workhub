from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.middleware.csrf import get_token
from .models import Profile, FreelancerProfile, ClientProfile
from jobs.models import Application, Job
from django.http import JsonResponse
from django.urls import reverse
from payments.models import Wallet
from django.db import models

def register(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
        
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        password1 = request.POST.get("password1")
        password2 = request.POST.get("password2")

        if password1 != password2:
            messages.error(request, "Passwords do not match")
            return render(request, "accounts/register.html")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken")
            return render(request, "accounts/register.html")

        # Create user
        user = User.objects.create_user(username=username, email=email, password=password1)
        Profile.objects.create(user=user)
        login(request, user)

        csrf_token = get_token(request)

        return JsonResponse({
            "success": True,
            "message": "Account created successfully!",
            "csrfToken": csrf_token 
        })

    if request.method == "GET":
        return render(request, "accounts/register.html")

def save_role(request):
    if request.method == "POST":
        role = request.POST.get("role")
        
        if not role:
            return JsonResponse({"success": False, "message": "Please select a role"})
        
        # Update profile with role
        profile = Profile.objects.get(user=request.user)
        profile.role = role
        profile.save()
        
        return JsonResponse({"success": True, "redirect": reverse("setup_profile")})

@login_required  
def setup_profile(request):
    profile = Profile.objects.filter(user=request.user).first()
    
    if not profile or not profile.role:
        return redirect("register")

    if request.method == "POST":
        if profile.role == "freelancer":
            title = request.POST.get("title")
            bio = request.POST.get("bio")
            skills = request.POST.get("skills")
            hourly_rate = request.POST.get("hourly_rate")
            picture = request.FILES.get("profile_picture")

            FreelancerProfile.objects.create(
                profile=profile,
                title=title,
                bio=bio,
                skills=skills,
                hourly_rate=hourly_rate,
                profile_picture=picture
            )
            
        elif profile.role == "client":
            first_name = request.POST.get("first_name")
            last_name = request.POST.get("last_name")
            company_name = request.POST.get("company_name")

            ClientProfile.objects.create(
                profile=profile,
                first_name=first_name,
                last_name=last_name,
                company_name=company_name
            )

        messages.success(request, "Profile setup completed!")
        return redirect("dashboard")

    return render(request, "accounts/setup_profile.html", {"role": profile.role})

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
        
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            messages.success(request, "Logged in successfully.")
            return redirect("dashboard")
        else:
            messages.error(request, "Invalid username or password.")

    return render(request, "accounts/login.html")

def logout_view(request):
    logout(request)
    messages.success(request, "You have been logged out.")
    return render(request, "accounts/logout.html")

@login_required
def dashboard(request):
    profile = Profile.objects.filter(user=request.user).first()

    if not profile or not profile.role:
        return redirect("register")
    
    # Create wallet if it doesn't exist
    wallet, created = Wallet.objects.get_or_create(user=request.user)
    
    # Check if profile setup is complete
    if profile.role == "freelancer":
        freelancer_profile = FreelancerProfile.objects.filter(profile=profile).first()
        if not freelancer_profile:
            return redirect("setup_profile")
        
        # Calculate freelancer statistics
        total_applications = request.user.application_set.count()
        completed_jobs = request.user.assigned_jobs.filter(status='completed').count()
        in_progress_jobs = request.user.assigned_jobs.filter(status='in_progress').count()
        
        # Get earnings (completed payments)
        from payments.models import Payment
        total_earnings = Payment.objects.filter(
            to_user=request.user,
            status='completed',
            payment_type='job_payment'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        pending_earnings = Payment.objects.filter(
            to_user=request.user,
            status='on_hold',
            payment_type='job_payment'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        # Split skills into a list
        skills_list = []
        if freelancer_profile.skills:
            skills_list = [skill.strip() for skill in freelancer_profile.skills.split(',') if skill.strip()]
        
        context = {
            'profile': profile,
            'freelancer_profile': freelancer_profile,
            'skills_list': skills_list,
            'total_applications': total_applications,
            'completed_jobs': completed_jobs,
            'in_progress_jobs': in_progress_jobs,
            'wallet': wallet,
            'total_earnings': total_earnings,
            'pending_earnings': pending_earnings,
        }
        
        return render(request, "accounts/freelancer_dashboard.html", context)
    
    elif profile.role == "client":
        client_profile = ClientProfile.objects.filter(profile=profile).first()
        if not client_profile:
            return redirect("setup_profile")
        
        # Calculate client statistics
        posted_jobs_count = request.user.posted_jobs.count()
        completed_jobs_count = request.user.posted_jobs.filter(status='completed').count()
        in_progress_jobs_count = request.user.posted_jobs.filter(status='in_progress').count()
        
        # Calculate total applications received on user's jobs
        total_applications = 0
        for job in request.user.posted_jobs.all():
            total_applications += job.applications.count()
        
        # Calculate total spent and pending payments
        from payments.models import Payment
        total_spent = Payment.objects.filter(
            from_user=request.user,
            status='completed',
            payment_type='job_payment'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        pending_payments = Payment.objects.filter(
            from_user=request.user,
            status='on_hold',
            payment_type='job_payment'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        context = {
            'profile': profile,
            'client_profile': client_profile,
            'posted_jobs_count': posted_jobs_count,
            'completed_jobs_count': completed_jobs_count,
            'in_progress_jobs_count': in_progress_jobs_count,
            'total_applications': total_applications,
            'wallet': wallet,
            'total_spent': total_spent,
            'pending_payments': pending_payments,
        }
        
        return render(request, "accounts/client_dashboard.html", context)
    
@login_required
def edit_profile(request):
    profile = Profile.objects.filter(user=request.user).first()

    if not profile:
        return redirect("register")

    context = {"profile": profile}
    
    if profile.role == "freelancer":
        freelancer_profile = FreelancerProfile.objects.filter(profile=profile).first()
        if not freelancer_profile:
            return redirect("setup_profile")
        context["freelancer_profile"] = freelancer_profile
        
    elif profile.role == "client":
        client_profile = ClientProfile.objects.filter(profile=profile).first()
        if not client_profile:
            return redirect("setup_profile")
        context["client_profile"] = client_profile

    if request.method == "POST":
        if profile.role == "freelancer":
            freelancer_profile = FreelancerProfile.objects.get(profile=profile)
            
            freelancer_profile.first_name = request.POST.get("first_name", freelancer_profile.first_name) 
            freelancer_profile.last_name = request.POST.get("last_name", freelancer_profile.last_name) 
            freelancer_profile.title = request.POST.get("title", freelancer_profile.title)
            freelancer_profile.bio = request.POST.get("bio", freelancer_profile.bio)
            freelancer_profile.skills = request.POST.get("skills", freelancer_profile.skills)
            freelancer_profile.phone_number = request.POST.get("phone_number", freelancer_profile.phone_number) 
            
            hourly_rate = request.POST.get("hourly_rate")
            if hourly_rate:
                freelancer_profile.hourly_rate = hourly_rate
            profile_picture = request.FILES.get("profile_picture")
            if profile_picture:
                freelancer_profile.profile_picture = profile_picture
            
            freelancer_profile.save()
            
        elif profile.role == "client":
            client_profile = ClientProfile.objects.get(profile=profile)
            
            client_profile.first_name = request.POST.get("first_name", client_profile.first_name)
            client_profile.last_name = request.POST.get("last_name", client_profile.last_name)
            client_profile.company_name = request.POST.get("company_name", client_profile.company_name)
            client_profile.phone_number = request.POST.get("phone_number", client_profile.phone_number)
            profile_picture = request.FILES.get("profile_picture")
            if profile_picture:
                client_profile.profile_picture = profile_picture
            
            client_profile.save()

        messages.success(request, "Profile updated successfully!")
        return redirect("dashboard")

    return render(request, "accounts/edit_profile.html", context)