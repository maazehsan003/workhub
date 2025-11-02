from django.contrib import admin
from .models import Job, Application, WorkSubmission, WorkFile


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'budget', 'status', 'client', 'freelancer', 'deadline', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['title', 'description', 'client__username', 'freelancer__username']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'category', 'budget', 'deadline')
        }),
        ('Status & Assignment', {
            'fields': ('status', 'client', 'freelancer')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['freelancer', 'job', 'proposed_budget', 'status', 'applied_at']
    list_filter = ['status', 'applied_at']
    search_fields = ['freelancer__username', 'job__title', 'cover_letter']
    readonly_fields = ['applied_at']
    
    fieldsets = (
        ('Application Details', {
            'fields': ('job', 'freelancer', 'cover_letter')
        }),
        ('Proposal', {
            'fields': ('proposed_budget', 'estimated_duration')
        }),
        ('Status', {
            'fields': ('status', 'applied_at')
        }),
    )


@admin.register(WorkSubmission)
class WorkSubmissionAdmin(admin.ModelAdmin):
    list_display = ['job', 'freelancer', 'status', 'submitted_at', 'reviewed_at', 'get_files_count']
    list_filter = ['status', 'submitted_at', 'reviewed_at']
    search_fields = ['job__title', 'freelancer__username', 'description']
    readonly_fields = ['submitted_at', 'get_files_count', 'get_total_files_size']
    date_hierarchy = 'submitted_at'
    
    fieldsets = (
        ('Submission Information', {
            'fields': ('job', 'freelancer', 'description', 'additional_notes')
        }),
        ('Review', {
            'fields': ('status', 'client_feedback', 'reviewed_at')
        }),
        ('File Information', {
            'fields': ('get_files_count', 'get_total_files_size'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('submitted_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_files_count(self, obj):
        return obj.get_files_count()
    get_files_count.short_description = 'Files Count'
    
    def get_total_files_size(self, obj):
        return f"{obj.get_total_files_size() / (1024*1024):.2f} MB"
    get_total_files_size.short_description = 'Total Files Size'


@admin.register(WorkFile)
class WorkFileAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'work_submission', 'get_formatted_size', 'get_file_extension', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['original_name', 'work_submission__job__title']
    readonly_fields = ['uploaded_at', 'file_size', 'get_formatted_size', 'get_file_extension']
    
    fieldsets = (
        ('File Information', {
            'fields': ('work_submission', 'file', 'original_name')
        }),
        ('Metadata', {
            'fields': ('file_size', 'get_formatted_size', 'get_file_extension', 'uploaded_at')
        }),
    )
    
    def get_formatted_size(self, obj):
        return obj.get_formatted_size()
    get_formatted_size.short_description = 'File Size'
    
    def get_file_extension(self, obj):
        return obj.get_file_extension()
    get_file_extension.short_description = 'Extension'