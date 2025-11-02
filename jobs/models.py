from django.db import models
from django.contrib.auth.models import User
import os

class Job(models.Model):
    CATEGORY_CHOICES = [
        ('web_dev', 'Web Development'),
        ('mobile_dev', 'Mobile Development'),
        ('design', 'Design'),
        ('writing', 'Writing'),
        ('marketing', 'Marketing'),
        ('data_entry', 'Data Entry'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('under_review', 'Under Review'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    deadline = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posted_jobs')
    freelancer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_jobs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-created_at']

class Application(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    freelancer = models.ForeignKey(User, on_delete=models.CASCADE)
    cover_letter = models.TextField()
    proposed_budget = models.DecimalField(max_digits=10, decimal_places=2)
    estimated_duration = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.freelancer.username} - {self.job.title}"
    
    class Meta:
        unique_together = ['job', 'freelancer']
        ordering = ['-applied_at']

class WorkSubmission(models.Model):
    STATUS_CHOICES = [
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revision_requested', 'Revision Requested'),
    ]
    
    job = models.OneToOneField(Job, on_delete=models.CASCADE, related_name='work_submission')
    freelancer = models.ForeignKey(User, on_delete=models.CASCADE)
    description = models.TextField(help_text="Description of the completed work")
    additional_notes = models.TextField(blank=True, help_text="Additional notes or instructions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_review')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    client_feedback = models.TextField(blank=True, help_text="Client's feedback on the submission")
    
    def __str__(self):
        return f"Work submission for {self.job.title} by {self.freelancer.username}"
    
    def get_total_files_size(self):
        """Calculate total size of all uploaded files"""
        total_size = sum(file.file_size for file in self.work_files.all())
        return total_size
    
    def get_files_count(self):
        """Get count of uploaded files"""
        return self.work_files.count()
    
    class Meta:
        ordering = ['-submitted_at']

class WorkFile(models.Model):
    work_submission = models.ForeignKey(WorkSubmission, on_delete=models.CASCADE, related_name='work_files')
    file = models.FileField(upload_to='work_submissions/%Y/%m/%d/')
    original_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.original_name} - {self.work_submission.job.title}"
    
    def get_file_extension(self):
        """Get file extension"""
        return os.path.splitext(self.original_name)[1].lower()
    
    def get_formatted_size(self):
        """Get human readable file size"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    
    def is_image(self):
        """Check if file is an image"""
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        return self.get_file_extension() in image_extensions
    
    def is_document(self):
        """Check if file is a document"""
        doc_extensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf']
        return self.get_file_extension() in doc_extensions
    
    def is_archive(self):
        """Check if file is an archive"""
        archive_extensions = ['.zip', '.rar', '.7z', '.tar', '.gz']
        return self.get_file_extension() in archive_extensions
    
    def is_video(self):
        """Check if file is a video"""
        video_extensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
        return self.get_file_extension() in video_extensions
    
    def get_file_type_icon(self):
        """Get appropriate icon class for file type"""
        ext = self.get_file_extension()
        
        if self.is_image():
            return 'fa-file-image text-success'
        elif ext == '.pdf':
            return 'fa-file-pdf text-danger'
        elif ext in ['.doc', '.docx']:
            return 'fa-file-word text-primary'
        elif self.is_archive():
            return 'fa-file-archive text-secondary'
        elif self.is_video():
            return 'fa-file-video text-warning'
        elif ext == '.txt':
            return 'fa-file-alt text-info'
        else:
            return 'fa-file text-muted'
    
    class Meta:
        ordering = ['-uploaded_at']