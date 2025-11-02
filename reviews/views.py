from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.db.models import Q
from .models import Review, FreelancerProfile
from jobs.models import Job


@login_required
def write_review(request, job_id):
    """Write a new review for a completed job"""
    job = get_object_or_404(Job, id=job_id)
    
    # Check if user is the client for this job
    if job.client != request.user:
        raise PermissionDenied("Only the client can write a review for this job")
    
    # Check if job is completed
    if job.status != 'completed':
        messages.error(request, "Reviews can only be written for completed jobs")
        return redirect('submit_detail', job.id)
    
    # Check if review already exists
    existing_review = Review.objects.filter(job=job, reviewer=request.user).first()
    if existing_review:
        messages.info(request, "You have already reviewed this job")
        return redirect('reviews:view_review', job.id)
    
    if request.method == 'POST':
        # Get form data
        rating = request.POST.get('rating')
        feedback = request.POST.get('feedback', '').strip()
        is_public = request.POST.get('is_public') == 'on'
        
        # Validate data
        errors = []
        
        if not rating or not rating.isdigit() or not (1 <= int(rating) <= 5):
            errors.append("Please select a valid star rating (1-5)")
        
        if len(feedback) < 10:
            errors.append("Please provide a more detailed review (at least 10 characters)")
        
        if len(feedback) > 1000:
            errors.append("Review must be less than 1000 characters")
        
        if errors:
            for error in errors:
                messages.error(request, error)
        else:
            # Create review
            review = Review.objects.create(
                job=job,
                reviewer=request.user,
                reviewee=job.freelancer,
                rating=int(rating),
                feedback=feedback,
                is_public=is_public
            )
            
            messages.success(request, "Thank you for your review! It has been submitted successfully.")
            return redirect('reviews:view_review', job.id)
    
    context = {
        'job': job,
        'is_editing': False,
    }
    return render(request, 'reviews/review.html', context)


@login_required
def edit_review(request, job_id):
    """Edit an existing review"""
    job = get_object_or_404(Job, id=job_id)
    review = get_object_or_404(Review, job=job, reviewer=request.user)
    
    # Check permissions
    if review.reviewer != request.user:
        raise PermissionDenied("You can only edit your own reviews")
    
    if request.method == 'POST':
        # Get form data
        rating = request.POST.get('rating')
        feedback = request.POST.get('feedback', '').strip()
        is_public = request.POST.get('is_public') == 'on'
        
        # Validate data
        errors = []
        
        if not rating or not rating.isdigit() or not (1 <= int(rating) <= 5):
            errors.append("Please select a valid star rating (1-5)")
        
        if len(feedback) < 10:
            errors.append("Please provide a more detailed review (at least 10 characters)")
        
        if len(feedback) > 1000:
            errors.append("Review must be less than 1000 characters")
        
        if errors:
            for error in errors:
                messages.error(request, error)
        else:
            # Update review
            review.rating = int(rating)
            review.feedback = feedback
            review.is_public = is_public
            review.save()
            
            messages.success(request, "Your review has been updated successfully.")
            return redirect('reviews:view_review', job.id)
    
    context = {
        'job': job,
        'review': review,
        'is_editing': True,
    }
    return render(request, 'reviews/review.html', context)


@login_required
def view_review(request, job_id):
    """View a specific review"""
    job = get_object_or_404(Job, id=job_id)
    review = get_object_or_404(Review, job=job)
    
    # Check if user has permission to view this review
    can_view = (
        request.user == review.reviewer or 
        request.user == review.reviewee or 
        review.is_public
    )
    
    if not can_view:
        raise PermissionDenied("You don't have permission to view this review")
    
    # Check if user can edit the review
    can_edit = request.user == review.reviewer
    
    context = {
        'review': review,
        'job': job,
        'can_edit': can_edit,
    }
    return render(request, 'reviews/view_review.html', context)


def freelancer_reviews(request, username):
    """View all public reviews for a specific freelancer"""
    freelancer = get_object_or_404(User, username=username)
    
    # Get freelancer profile
    freelancer_profile, created = FreelancerProfile.objects.get_or_create(
        user=freelancer
    )
    
    # Get all public reviews for this freelancer
    reviews = Review.objects.filter(
        reviewee=freelancer, 
        is_public=True
    ).select_related('reviewer', 'job').order_by('-created_at')
    
    total_reviews = reviews.count()
    
    context = {
        'freelancer': freelancer,
        'freelancer_profile': freelancer_profile,
        'reviews': reviews,
        'total_reviews': total_reviews,
    }
    return render(request, 'reviews/freelancer_reviews.html', context)


@login_required
def delete_review(request, job_id):
    """Delete a review (only by reviewer)"""
    job = get_object_or_404(Job, id=job_id)
    review = get_object_or_404(Review, job=job, reviewer=request.user)
    
    if request.method == 'POST':
        review.delete()
        messages.success(request, "Your review has been deleted.")
        return redirect('view_work_submission', job.id)
    
    context = {
        'review': review,
        'job': job,
    }
    return render(request, 'reviews/confirm_delete.html', context)


@login_required 
def my_reviews(request):
    """View all reviews written by the current user"""
    reviews_given = Review.objects.filter(
        reviewer=request.user
    ).select_related('reviewee', 'job').order_by('-created_at')
    
    reviews_received = Review.objects.filter(
        reviewee=request.user,
        is_public=True
    ).select_related('reviewer', 'job').order_by('-created_at')
    
    context = {
        'reviews_given': reviews_given,
        'reviews_received': reviews_received,
    }
    return render(request, 'reviews/my_reviews.html', context)


def review_api_stats(request, username):
    """API endpoint to get freelancer review statistics"""
    from django.http import JsonResponse
    
    freelancer = get_object_or_404(User, username=username)
    freelancer_profile = FreelancerProfile.objects.filter(user=freelancer).first()
    
    if not freelancer_profile:
        return JsonResponse({
            'total_reviews': 0,
            'average_rating': 0,
            'rating_breakdown': {
                '5': 0, '4': 0, '3': 0, '2': 0, '1': 0
            }
        })
    
    data = {
        'total_reviews': freelancer_profile.total_reviews,
        'average_rating': float(freelancer_profile.average_rating),
        'rating_breakdown': {
            '5': freelancer_profile.five_star_count,
            '4': freelancer_profile.four_star_count,
            '3': freelancer_profile.three_star_count,
            '2': freelancer_profile.two_star_count,
            '1': freelancer_profile.one_star_count,
        }
    }
    
    return JsonResponse(data)