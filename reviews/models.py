from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg
from django.db.models.signals import post_save
from django.dispatch import receiver

class Review(models.Model):
    job = models.OneToOneField('jobs.Job', on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    reviewee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rate from 1 to 5 stars"
    )
    feedback = models.TextField(
        max_length=1000,
        help_text="Share your experience working with this freelancer"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(default=True, help_text="Make this review visible to others")
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['job', 'reviewer'] 
    
    def __str__(self):
        return f"Review for {self.reviewee.username} by {self.reviewer.username} - {self.rating} stars"
    
    @property
    def star_display(self):
        """Return stars as HTML for display"""
        full_stars = '★' * self.rating
        empty_stars = '☆' * (5 - self.rating)
        return full_stars + empty_stars


class FreelancerProfile(models.Model):
    """Extended profile for freelancers to store review statistics"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='freelancer_profile')
    total_reviews = models.IntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    five_star_count = models.IntegerField(default=0)
    four_star_count = models.IntegerField(default=0)
    three_star_count = models.IntegerField(default=0)
    two_star_count = models.IntegerField(default=0)
    one_star_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def update_review_stats(self):
        """Update review statistics for this freelancer"""
        reviews = Review.objects.filter(reviewee=self.user, is_public=True)
        
        self.total_reviews = reviews.count()
        
        if self.total_reviews > 0:
            self.average_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0
            
            # Count ratings by stars
            self.five_star_count = reviews.filter(rating=5).count()
            self.four_star_count = reviews.filter(rating=4).count()
            self.three_star_count = reviews.filter(rating=3).count()
            self.two_star_count = reviews.filter(rating=2).count()
            self.one_star_count = reviews.filter(rating=1).count()
        else:
            self.average_rating = 0.00
            self.five_star_count = 0
            self.four_star_count = 0
            self.three_star_count = 0
            self.two_star_count = 0
            self.one_star_count = 0
        
        self.save()
    
    def __str__(self):
        return f"{self.user.username} - {self.average_rating:.1f}★ ({self.total_reviews} reviews)"
    
    @property
    def star_display(self):
        """Return average stars as HTML for display"""
        if self.average_rating == 0:
            return '☆☆☆☆☆'
        
        full_stars = int(self.average_rating)
        half_star = 1 if (self.average_rating - full_stars) >= 0.5 else 0
        empty_stars = 5 - full_stars - half_star
        
        stars = '★' * full_stars
        if half_star:
            stars += '☆'
        stars += '☆' * empty_stars
        
        return stars


# Signal to create freelancer profile when user is created
@receiver(post_save, sender=User)
def create_freelancer_profile(sender, instance, created, **kwargs):
    """Create freelancer profile for new users"""
    if created:
        FreelancerProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=Review)
def update_freelancer_stats(sender, instance, created, **kwargs):
    """Update freelancer statistics when a review is created or updated"""
    freelancer_profile, created = FreelancerProfile.objects.get_or_create(
        user=instance.reviewee
    )
    freelancer_profile.update_review_stats()