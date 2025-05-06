from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
import json
from .forms import LoginForm
from datetime import datetime, timedelta
from .models import Reservation


def homepage(request):
    return render(request, 'app/index.html')


def my_login(request):
    """Handle user login"""
    if request.method == 'POST':
        form = LoginForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('dashboard')
    else:
        form = LoginForm()
    
    return render(request, 'app/my-login.html', {'loginform': form})


@login_required
def user_logout(request):
    """Handle user logout"""
    logout(request)
    return redirect('my-login')


@login_required
def dashboard(request):
    """Render the dashboard page"""
    return render(request, 'app/dashboard.html')


@login_required
def user_profile(request):
    """Render the user profile page"""
    return render(request, 'app/user_profile.html')


@login_required
def user_reservations_api(request):
    """API endpoint to get user reservations for a specific week"""
    start_date_str = request.GET.get('start_date')
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = start_date + timedelta(days=6)
        
        # Query user's reservations for the specified week
        reservations = Reservation.objects.filter(
            user=request.user,
            date__range=[start_date, end_date]
        )
        
        # Format the data as a dictionary keyed by date
        reservations_dict = {}
        for reservation in reservations:
            date_key = reservation.date.strftime('%Y-%m-%d')
            reservations_dict[date_key] = {
                'reserved': True,
                'status': reservation.get_status_display()
            }
            
        return JsonResponse({
            'success': True,
            'reservations': reservations_dict
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })


def toggle_reservation_api(request):
    """API endpoint to toggle a reservation for a specific date"""
    try:
        data = json.loads(request.body)
        date_str = data.get('date')
        reserved = data.get('reserved', False)
        
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Check if the date is in the past
        if date_obj < datetime.now().date():
            return JsonResponse({
                'success': False, 
                'error': 'Cannot modify reservations for past dates'
            })
            
        # Simply create or delete the reservation without status concerns
        if reserved:
            # Create reservation if it doesn't exist
            Reservation.objects.get_or_create(
                user=request.user,
                date=date_obj
            )
        else:
            # Delete the reservation if it exists
            Reservation.objects.filter(
                user=request.user,
                date=date_obj
            ).delete()
            
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

# ...existing code...

def user_reservations_api(request):
    """API endpoint to get user reservations for a specific week"""
    start_date_str = request.GET.get('start_date')
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = start_date + timedelta(days=6)
        
        # Query user's reservations for the specified week
        reservations = Reservation.objects.filter(
            user=request.user,
            date__range=[start_date, end_date]
        )
        
        # Format the data as a dictionary keyed by date
        reservations_dict = {}
        for reservation in reservations:
            date_key = reservation.date.strftime('%Y-%m-%d')
            reservations_dict[date_key] = {
                'reserved': True
            }
            
        return JsonResponse({
            'success': True,
            'reservations': reservations_dict
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })
