from django.urls import path
from . import views
from django.shortcuts import redirect

def homepage_redirect(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    else:
        return redirect('login')

urlpatterns = [
    path("", homepage_redirect, name="home"),
    path("register/", views.register, name="register"),
    path("save-role/", views.save_role, name="save_role"),
    path("setup-profile/", views.setup_profile, name="setup_profile"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("edit-profile/", views.edit_profile, name="edit_profile"),
]