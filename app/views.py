from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth import login, logout
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
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden


from .models import CustomUser


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

def manager_required(view_func):
    """Decorator to check if user has manager privileges"""
    @login_required
    def wrapper(request, *args, **kwargs):
        # Define which statuses can access manager dashboard
        manager_statuses = ['Moniteur', 'Bar']  # Customize based on your needs
        if request.user.status in manager_statuses:
            return view_func(request, *args, **kwargs)
        return HttpResponseForbidden("Vous n'avez pas l'autorisation d'accéder à cette page.")
    return wrapper

@manager_required
def manager_dashboard(request):
    """Render the manager dashboard page"""
    return render(request, 'app/manager/dashboard.html', {'title': 'Manager Dashboard', 'users': CustomUser.objects.all(), "statuses": CustomUser.Status.choices})


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


def get_week_reservations(request):
    try:
        start_date_str = request.GET.get('start_date')
        # Convert start_date string to a datetime object
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        
        # Calculate end date (7 days after start date)
        end_date = start_date + timedelta(days=6)
        
        # Get all reservations within the date range
        reservations = Reservation.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).select_related('user')
        
        # Format reservations data for the frontend
        formatted_reservations = {}
        for reservation in reservations:
            date_str = reservation.date.strftime('%Y-%m-%d')
            if date_str not in formatted_reservations:
                formatted_reservations[date_str] = []
            
            formatted_reservations[date_str].append({
                'id': reservation.id,  # Add the reservation ID
                'user_id': reservation.user.id,
                'user_name': str(reservation.user.name),
                'status': reservation.user.status
            })
        
        return JsonResponse({'success': True, 'reservations': formatted_reservations})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

   
@csrf_exempt
def delete_reservation(request, reservation_id):
    """API endpoint to delete a reservation"""
    try:
        # Allow deletion of any reservation (by manager)
        # Remove the user=request.user filter to allow managers to delete any reservation
        reservation = get_object_or_404(Reservation, id=reservation_id)
        reservation.delete()
        return JsonResponse({'success': True})
    except Reservation.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Reservation not found'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    

@csrf_exempt
@require_POST
def create_reservation(request):
    try:
        data = json.loads(request.body)
        date = data.get('date')
        user_id = data.get('user_id')
        
        # Validate required fields
        if not date or not user_id:
            return JsonResponse({'success': False, 'error': 'Date and user ID are required'})
        
        # Get the user
        user = get_object_or_404(CustomUser, id=user_id)
        
        # Create or update the reservation
        reservation, created = Reservation.objects.update_or_create(
            user=user,
            date=date,
        )
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
@manager_required
def get_users(request):
    """API endpoint to get all users"""
    try:
        users = CustomUser.objects.all()
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'name': user.name,
                'username': user.username,
                'email': user.email or '',
                'status': user.status,
            })
        return JsonResponse({'success': True, 'users': users_data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@manager_required
def add_user(request):
    """API endpoint to add a new user"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Only POST method is allowed'})
    
    try:
        data = json.loads(request.body)
        name = data.get('name')
        username = data.get('username')
        password = data.get('password')
        email = data.get('email', '')
        status = data.get('status')
        
        if not all([name, username, password, status]):
            return JsonResponse({'success': False, 'error': 'All required fields must be provided'})
        
        if CustomUser.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': 'Username already exists'})
        
        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=password,
            name=name,
            status=status
        )
        
        return JsonResponse({
            'success': True,
            'user': {
                'id': user.id,
                'name': user.name,
                'username': user.username,
                'email': user.email,
                'status': user.status
            }
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@manager_required
def update_user(request, user_id):
    """API endpoint to update an existing user"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Only POST method is allowed'})
    
    try:
        user = get_object_or_404(CustomUser, id=user_id)
        data = json.loads(request.body)
        
        if 'name' in data and data['name']:
            user.name = data['name']
        
        if 'username' in data and data['username']:
            if CustomUser.objects.filter(username=data['username']).exclude(id=user_id).exists():
                return JsonResponse({'success': False, 'error': 'Username already exists'})
            user.username = data['username']
        
        if 'email' in data:
            user.email = data['email']
        
        if 'status' in data and data['status']:
            user.status = data['status']
        
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        user.save()
        
        return JsonResponse({
            'success': True,
            'user': {
                'id': user.id,
                'name': user.name,
                'username': user.username,
                'email': user.email,
                'status': user.status
            }
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@manager_required
def delete_user(request, user_id):
    """API endpoint to delete a user"""
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'error': 'Only DELETE method is allowed'})
    
    try:
        user = get_object_or_404(CustomUser, id=user_id)
        
        if user.id == request.user.id:
            return JsonResponse({'success': False, 'error': 'Cannot delete your own account'})
        
        user.delete()
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})