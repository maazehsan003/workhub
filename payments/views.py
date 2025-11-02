from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib import messages
from django.db import transaction, models
from django.utils import timezone
from decimal import Decimal
from .models import Wallet, Payment, Transaction
from jobs.models import Job, Application
import json

@login_required
def wallet_view(request):
    """Display user's wallet and transaction history"""
    wallet, created = Wallet.objects.get_or_create(user=request.user)
    transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')[:20]  # Last 20 transactions
    
    # Get pending payments (money on hold)
    pending_payments_sent = Payment.objects.filter(
        from_user=request.user, 
        status='on_hold'
    )
    
    pending_payments_received = Payment.objects.filter(
        to_user=request.user, 
        status='on_hold'
    )
    
    # Calculate stats based on user role
    if hasattr(request.user, 'profile') and request.user.profile.role == 'freelancer':
        # For freelancers: total earned (completed payments) and pending earnings
        total_earnings = Payment.objects.filter(
            to_user=request.user, 
            status='completed'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        pending_earnings = pending_payments_received.aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        
        stats = {
            'total_earnings': total_earnings,
            'pending_earnings': pending_earnings,
        }
    else:
        # For clients: total spent (completed payments) and payments on hold
        total_spent = Payment.objects.filter(
            from_user=request.user,
            status='completed'
        ).exclude(payment_type='wallet_topup').aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        
        pending_payments = pending_payments_sent.aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        
        stats = {
            'total_spent': total_spent,
            'pending_payments': pending_payments,
        }
    
    context = {
        'wallet': wallet,
        'transactions': transactions,
        'pending_payments_sent': pending_payments_sent,
        'pending_payments_received': pending_payments_received,
        **stats,  # Add the calculated stats to context
    }
    
    return render(request, 'payments/wallet.html', context)

@login_required
def top_up_wallet(request):
    """Add funds to user's wallet (simulation) - Only for clients"""
    # Check if user is a client
    if hasattr(request.user, 'profile') and request.user.profile.role != 'client':
        messages.error(request, 'Only clients can add funds to their wallet')
        return redirect('payments:wallet')
    
    if request.method == 'POST':
        amount = request.POST.get('amount')
        
        try:
            amount = Decimal(amount)
            if amount <= 0:
                messages.error(request, 'Amount must be greater than 0')
                return redirect('payments:wallet')
                
            if amount > 10000:  # Set a reasonable limit
                messages.error(request, 'Maximum top-up amount is $10,000')
                return redirect('payments:wallet')
            
            with transaction.atomic():
                wallet, created = Wallet.objects.get_or_create(user=request.user)
                
                # Create payment record
                payment = Payment.objects.create(
                    from_user=request.user,
                    amount=amount,
                    status='completed',
                    payment_type='wallet_topup',
                    description=f'Wallet top-up of ${amount}',
                    completed_at=timezone.now()
                )
                
                # Add funds to wallet
                old_balance = wallet.balance
                wallet.add_funds(amount)
                
                # Create transaction record
                Transaction.objects.create(
                    wallet=wallet,
                    payment=payment,
                    amount=amount,
                    transaction_type='credit',
                    description=f'Wallet top-up',
                    balance_after=wallet.balance
                )
                
                # Store success message in session for transaction success page
                request.session['transaction_success'] = {
                    'type': 'top_up',
                    'amount': str(amount),
                    'new_balance': str(wallet.balance)
                }
                
                return redirect('payments:transaction_success')
                
        except (ValueError, TypeError):
            messages.error(request, 'Invalid amount entered')
        except Exception as e:
            messages.error(request, 'An error occurred while processing your request')
    
    return redirect('payments:wallet')

@login_required
def transaction_success(request):
    """Display transaction success page"""
    success_data = request.session.get('transaction_success')
    if not success_data:
        return redirect('payments:wallet')
    
    # Clear the session data after displaying
    del request.session['transaction_success']
    
    context = {
        'success_data': success_data
    }
    
    return render(request, 'payments/transaction.html', context)

@login_required
def make_payment(request):
    """Handle job payment when application is accepted"""
    if request.method == 'POST':
        data = json.loads(request.body)
        job_id = data.get('job_id')
        application_id = data.get('application_id')
        
        try:
            job = get_object_or_404(Job, id=job_id)
            application = get_object_or_404(Application, id=application_id)
            
            # Verify user is the client
            if job.client != request.user:
                return JsonResponse({'success': False, 'error': 'Unauthorized'})
            
            # Verify application is for this job
            if application.job != job:
                return JsonResponse({'success': False, 'error': 'Invalid application'})
            
            # Check if payment already exists
            existing_payment = Payment.objects.filter(job=job, from_user=request.user).first()
            if existing_payment:
                return JsonResponse({'success': False, 'error': 'Payment already made for this job'})
            
            amount = application.proposed_budget
            
            with transaction.atomic():
                wallet, created = Wallet.objects.get_or_create(user=request.user)
                
                # Check if user has sufficient balance
                if not wallet.can_withdraw(amount):
                    return JsonResponse({
                        'success': False, 
                        'error': f'Insufficient balance. You need ${amount} but only have ${wallet.balance}'
                    })
                
                # Deduct from client's wallet
                if not wallet.deduct_funds(amount):
                    return JsonResponse({'success': False, 'error': 'Failed to deduct funds'})
                
                # Create payment on hold
                payment = Payment.objects.create(
                    job=job,
                    from_user=request.user,
                    to_user=application.freelancer,
                    amount=amount,
                    status='on_hold',
                    payment_type='job_payment',
                    description=f'Payment for job: {job.title}'
                )
                
                # Create transaction record for client (debit)
                Transaction.objects.create(
                    wallet=wallet,
                    payment=payment,
                    amount=amount,
                    transaction_type='debit',
                    description=f'Payment on hold for job: {job.title}',
                    balance_after=wallet.balance
                )
                
                return JsonResponse({
                    'success': True, 
                    'message': f'Payment of ${amount} has been placed on hold'
                })
                
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@login_required
def release_payment(request):
    """Release payment when job is completed"""
    if request.method == 'POST':
        data = json.loads(request.body)
        job_id = data.get('job_id')
        
        try:
            job = get_object_or_404(Job, id=job_id)
            
            # Verify user is the assigned freelancer
            if job.freelancer != request.user:
                return JsonResponse({'success': False, 'error': 'Unauthorized'})
            
            # Verify job is completed
            if job.status != 'completed':
                return JsonResponse({'success': False, 'error': 'Job must be completed first'})
            
            # Find the payment on hold
            payment = Payment.objects.filter(
                job=job, 
                status='on_hold', 
                to_user=request.user
            ).first()
            
            if not payment:
                return JsonResponse({'success': False, 'error': 'No payment found on hold for this job'})
            
            with transaction.atomic():
                # Create or get freelancer's wallet
                freelancer_wallet, created = Wallet.objects.get_or_create(user=request.user)
                
                # Add funds to freelancer's wallet
                freelancer_wallet.add_funds(payment.amount)
                
                # Update payment status
                payment.status = 'completed'
                payment.completed_at = timezone.now()
                payment.save()
                
                # Create transaction record for freelancer (credit)
                Transaction.objects.create(
                    wallet=freelancer_wallet,
                    payment=payment,
                    amount=payment.amount,
                    transaction_type='credit',
                    description=f'Payment received for job: {job.title}',
                    balance_after=freelancer_wallet.balance
                )
                
                return JsonResponse({
                    'success': True, 
                    'message': f'Payment of ${payment.amount} has been released to your wallet'
                })
                
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@login_required
def payment_history(request):
    """Display user's payment history based on role"""
    user_role = getattr(request.user.profile, 'role', None) if hasattr(request.user, 'profile') else None
    
    if user_role == 'freelancer':
        # Freelancer only sees received payments with total amount
        payments_received = Payment.objects.filter(
            to_user=request.user, 
            status='completed'
        ).order_by('-completed_at')
        
        total_received = sum(payment.amount for payment in payments_received)
        
        context = {
            'payments_received': payments_received,
            'total_received': total_received,
            'is_freelancer': True,
        }
    else:
        # Client sees sent payments with total amount
        payments_sent = Payment.objects.filter(
            from_user=request.user
        ).exclude(payment_type='wallet_topup').order_by('-created_at')
        
        total_sent = sum(payment.amount for payment in payments_sent if payment.status in ['completed', 'on_hold'])
        on_hold_count = payments_sent.filter(status='on_hold').count()
        
        context = {
            'payments_sent': payments_sent,
            'total_sent': total_sent,
            'on_hold_count': on_hold_count,
            'is_freelancer': False,
        }
    
    return render(request, 'payments/payment_history.html', context)

@login_required
def withdraw_funds(request):
    """Allow freelancer to withdraw funds from wallet"""
    # Check if user is a freelancer
    if hasattr(request.user, 'profile') and request.user.profile.role != 'freelancer':
        messages.error(request, 'Only freelancers can withdraw funds')
        return redirect('payments:wallet')
    
    if request.method == 'POST':
        amount = request.POST.get('amount')
        
        try:
            amount = Decimal(amount)
            if amount <= 0:
                messages.error(request, 'Amount must be greater than 0')
                return redirect('payments:wallet')
            
            wallet, created = Wallet.objects.get_or_create(user=request.user)
            
            if not wallet.can_withdraw(amount):
                messages.error(request, f'Insufficient balance. You have ${wallet.balance}')
                return redirect('payments:wallet')
            
            with transaction.atomic():
                # Deduct funds from wallet
                if wallet.deduct_funds(amount):
                    # Create payment record for withdrawal
                    payment = Payment.objects.create(
                        from_user=request.user,
                        amount=amount,
                        status='completed',
                        payment_type='withdrawal',
                        description=f'Withdrawal of ${amount}',
                        completed_at=timezone.now()
                    )
                    
                    # Create transaction record
                    Transaction.objects.create(
                        wallet=wallet,
                        payment=payment,
                        amount=amount,
                        transaction_type='debit',
                        description=f'Funds withdrawal',
                        balance_after=wallet.balance
                    )
                    
                    # Store success message in session
                    request.session['transaction_success'] = {
                        'type': 'withdrawal',
                        'amount': str(amount),
                        'new_balance': str(wallet.balance)
                    }
                    
                    return redirect('payments:transaction_success')
                else:
                    messages.error(request, 'Failed to process withdrawal')
                    
        except (ValueError, TypeError):
            messages.error(request, 'Invalid amount entered')
        except Exception as e:
            messages.error(request, 'An error occurred while processing your request')
    
    return redirect('payments:wallet')

@login_required
def cancel_payment(request):
    """Cancel payment and refund to client (only if job is cancelled)"""
    if request.method == 'POST':
        data = json.loads(request.body)
        payment_id = data.get('payment_id')
        
        try:
            payment = get_object_or_404(Payment, id=payment_id)
            
            # Verify user is the client who made the payment
            if payment.from_user != request.user:
                return JsonResponse({'success': False, 'error': 'Unauthorized'})
            
            # Only allow cancellation if payment is on hold and job is cancelled
            if payment.status != 'on_hold':
                return JsonResponse({'success': False, 'error': 'Payment cannot be cancelled'})
            
            if payment.job and payment.job.status != 'cancelled':
                return JsonResponse({'success': False, 'error': 'Job must be cancelled first'})
            
            with transaction.atomic():
                client_wallet = Wallet.objects.get(user=request.user)
                
                # Refund to client's wallet
                client_wallet.add_funds(payment.amount)
                
                # Update payment status
                payment.status = 'refunded'
                payment.completed_at = timezone.now()
                payment.save()
                
                # Create transaction record for client (credit/refund)
                Transaction.objects.create(
                    wallet=client_wallet,
                    payment=payment,
                    amount=payment.amount,
                    transaction_type='credit',
                    description=f'Refund for cancelled job: {payment.job.title if payment.job else "N/A"}',
                    balance_after=client_wallet.balance
                )
                
                return JsonResponse({
                    'success': True, 
                    'message': f'Payment of ${payment.amount} has been refunded to your wallet'
                })
                
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})