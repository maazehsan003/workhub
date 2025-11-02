from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    path('wallet/', views.wallet_view, name='wallet'),
    path('top-up/', views.top_up_wallet, name='top_up_wallet'),
    path('withdraw/', views.withdraw_funds, name='withdraw_funds'),
    path('transaction-success/', views.transaction_success, name='transaction_success'),
    path('make-payment/', views.make_payment, name='make_payment'),
    path('release-payment/', views.release_payment, name='release_payment'),
    path('cancel-payment/', views.cancel_payment, name='cancel_payment'),
    path('history/', views.payment_history, name='payment_history'),
]