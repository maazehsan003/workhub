from django.contrib import admin
from .models import Review, FreelancerProfile


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'job',
        'reviewer',
        'reviewee',
        'rating',
        'is_public',
        'created_at',
    )
    list_filter = ('rating', 'is_public', 'created_at')
    search_fields = ('reviewer__username', 'reviewee__username', 'feedback', 'job__title')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(FreelancerProfile)
class FreelancerProfileAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'average_rating',
        'total_reviews',
        'five_star_count',
        'four_star_count',
        'three_star_count',
        'two_star_count',
        'one_star_count',
    )
    search_fields = ('user__username', 'user__email')
    ordering = ('-average_rating', '-total_reviews')
