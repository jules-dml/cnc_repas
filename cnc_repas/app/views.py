from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
import json
from .forms import LoginForm
from datetime import datetime, timedelta
from .models import Reservation
from django.contrib import messages
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model


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
    return render(request, 'app/users/dashboard.html')


@login_required
def user_profile(request):
    """Vue pour afficher le profil utilisateur avec ses statistiques."""
    # Récupérer toutes les réservations de l'utilisateur
    user_reservations = Reservation.objects.filter(user=request.user)
    
    # Calculer les statistiques
    total_meals = user_reservations.count()
    upcoming_meals = user_reservations.filter(date__gte=timezone.now()).count()
    
    # Récupérer les 5 dernières réservations
    recent_meals = user_reservations.order_by('-date')[:5]
    
    # Préparer les données pour le template
    stats = {
        'total_meals': total_meals,
        'upcoming_meals': upcoming_meals,
        'recent_meals': recent_meals,
    }
    
    return render(request, 'app/users/user_profile.html', {'stats': stats})


@login_required
def update_username(request):
    """Vue pour mettre à jour les informations utilisateur."""
    if request.method == 'POST':
        new_username = request.POST.get('username')
        new_name = request.POST.get('name')
        new_email = request.POST.get('email')
        
        User = get_user_model()
        
        if new_username:
            if User.objects.filter(username=new_username).exclude(id=request.user.id).exists():
                messages.error(request, "Ce nom d'utilisateur est déjà pris.")
            else:
                request.user.username = new_username
                if new_name:
                    request.user.name = new_name
                if new_email:
                    request.user.email = new_email
                request.user.save()
                messages.success(request, "Vos informations ont été mises à jour avec succès.")
        else:
            messages.error(request, "Le nom d'utilisateur ne peut pas être vide.")
    return redirect('user_profile')


@login_required
def change_password(request):
    """Vue pour changer le mot de passe de l'utilisateur."""
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            # Mise à jour de la session pour éviter la déconnexion
            update_session_auth_hash(request, user)
            messages.success(request, 'Votre mot de passe a été changé avec succès!')
        else:
            for error in form.errors.values():
                messages.error(request, error)
    return redirect('user_profile')

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
