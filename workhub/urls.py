from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path("", include("accounts.urls")),
    path("", include("jobs.urls")),
    path("", include("payments.urls")),
    path("", include("reviews.urls")),
    path("", include("messaging.urls")),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)