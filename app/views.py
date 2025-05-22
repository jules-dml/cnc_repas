from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.conf import settings
import json
import os
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
import csv
from io import StringIO
# For PDF generation
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors


from .models import CustomUser


# Path to store settings
SETTINGS_FILE = os.path.join(settings.BASE_DIR, 'app', 'app_settings.json')

# Default settings
DEFAULT_SETTINGS = {
    'deadline_time': '11:00'  # Default deadline: 11:00 AM
}

def load_app_settings():
    """Load application settings from JSON file"""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r') as f:
                return json.load(f)
        return DEFAULT_SETTINGS.copy()
    except Exception as e:
        print(f"Error loading settings: {e}")
        return DEFAULT_SETTINGS.copy()

def save_app_settings(settings_data):
    """Save application settings to JSON file"""
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings_data, f)
        return True
    except Exception as e:
        print(f"Error saving settings: {e}")
        return False

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
        is_volunteer = data.get('benevole', False)  # Récupère le paramètre booléen
        
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Check if the date is in the past
        if date_obj < datetime.now().date():
            return JsonResponse({
                'success': False, 
                'error': 'Cannot modify reservations for past dates'
            })
            
        # Create, update, or delete the reservation
        if reserved:
            # Create or update reservation with volunteer status
            reservation, created = Reservation.objects.update_or_create(
                user=request.user,
                date=date_obj,
                defaults={'benevole': is_volunteer}  # Set boolean field
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
                'reserved': True,
                'benevole': reservation.benevole  # Use the boolean field
            }
            
        return JsonResponse({
            'success': True,
            'reservations': reservations_dict,
            'user_status': request.user.status  # Send user's default status
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
            
            # Use the benevole field to determine status
            status = "Benevole" if reservation.benevole else reservation.user.status
            
            formatted_reservations[date_str].append({
                'id': reservation.id,
                'user_id': reservation.user.id,
                'user_user_id': reservation.user.user_id,  # Ajouté pour affichage dans le détail du jour
                'user_name': str(reservation.user.name),
                'status': status,
                'benevole': reservation.benevole,
                'user_status': reservation.user.status
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
        is_volunteer = data.get('benevole', False)
        
        # Validate required fields
        if not date or not user_id:
            return JsonResponse({'success': False, 'error': 'Date and user ID are required'})
        
        # Get the user
        user = get_object_or_404(CustomUser, id=user_id)
        
        # Create or update the reservation
        reservation, created = Reservation.objects.update_or_create(
            user=user,
            date=date,
            defaults={'benevole': is_volunteer}
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
                'user_id': user.user_id,  # déjà présent
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

@manager_required
def export_reservations(request):
    """Export reservations to CSV or PDF format based on filter criteria"""
    try:
        # Get query parameters
        export_format = request.GET.get('format', 'csv')
        start_date_str = request.GET.get('start_date', '')
        end_date_str = request.GET.get('end_date', '')
        
        # Parse dates
        start_date, end_date = None, None
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%d/%m/%Y').date()
            except ValueError:
                return HttpResponse(f"Format de date invalide pour la date de début: {start_date_str}", status=400)
                
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%d/%m/%Y').date()
            except ValueError:
                return HttpResponse(f"Format de date invalide pour la date de fin: {end_date_str}", status=400)
        
        # Build query for reservations
        query_args = {}
        if start_date and end_date:
            query_args['date__range'] = [start_date, end_date]
        elif start_date:
            query_args['date__gte'] = start_date
        elif end_date:
            query_args['date__lte'] = end_date
            
        # Get all reservations within the date range
        reservations = Reservation.objects.filter(**query_args).select_related('user').order_by('date')
        
        # Generate export file based on format
        if export_format == 'csv':
            return export_to_csv(reservations)
        elif export_format == 'pdf':
            return export_to_pdf(reservations, start_date, end_date)
        else:
            return HttpResponse("Format non supporté", status=400)
            
    except Exception as e:
        return HttpResponse(f"Erreur lors de l'exportation: {str(e)}", status=500)

def export_to_csv(reservations):
    """Generate a CSV file from reservation data"""
    date = datetime.now().strftime('%d-%m-%Y')
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="reservations-{date}.csv"'

    # Utiliser StringIO + UTF-8-sig pour les accents (et compatibilité Excel)
    buffer = StringIO()
    writer = csv.writer(buffer)
    
    writer.writerow(['ID', 'Date', 'Nom', 'Status'])
    for reservation in reservations:
        status = "Bénévole" if reservation.benevole else reservation.user.status
        writer.writerow([
            reservation.user.user_id,
            reservation.date.strftime('%d/%m/%Y'),
            reservation.user.name,
            status,
        ])

    response.content = '\ufeff' + buffer.getvalue()
    return response


def export_to_pdf(reservations, start_date=None, end_date=None):
    """Generate a PDF file from reservation data"""
    response = HttpResponse(content_type='application/pdf')
    date = datetime.now().strftime('%d-%m-%Y')
    response['Content-Disposition'] = f'attachment; filename="repas-{date}.pdf"'
    
    # Create the PDF document
    doc = SimpleDocTemplate(response, pagesize=A4)
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = styles['Title']
    subtitle_style = styles['Heading2']
    normal_style = styles['Normal']
    
    # Add title
    elements.append(Paragraph("Rapport des réservations", title_style))
    elements.append(Paragraph(" ", normal_style))  # Add some spacing

    # Add date range information if provided
    if start_date and end_date:
        date_range = f"Période: du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')}"
        elements.append(Paragraph(date_range, subtitle_style))
    elif start_date:
        date_range = f"Période: à partir du {start_date.strftime('%d/%m/%Y')}"
        elements.append(Paragraph(date_range, subtitle_style))
    elif end_date:
        date_range = f"Période: jusqu'au {end_date.strftime('%d/%m/%Y')}"
        elements.append(Paragraph(date_range, subtitle_style))
    
    elements.append(Paragraph(" ", normal_style))  # Add some spacing

    # Add general stats
    total_meals = len(reservations)
    elements.append(Paragraph(f"Nombre total de repas: {total_meals}", subtitle_style))
    elements.append(Paragraph(" ", normal_style))
    
    # Count meals by status
    status_counts = {}
    for reservation in reservations:
        # Use 'Bénévole' status if benevole flag is True, otherwise use user's status
        status = "Bénévole" if reservation.benevole else reservation.user.status
        if status in status_counts:
            status_counts[status] += 1
        else:
            status_counts[status] = 1
    
    # Display status statistics
    elements.append(Paragraph("Nombre de repas par statut:", subtitle_style))
    status_data = [['Statut', 'Nombre de repas']]
    for status, count in status_counts.items():
        status_data.append([status, str(count)])
    
    status_table = Table(status_data, repeatRows=1)
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(status_table)
    elements.append(Paragraph(" ", normal_style))
    
    # Count meals by user
    user_counts = {}
    for reservation in reservations:
        user_name = reservation.user.name
        user_id = reservation.user.user_id
        # initialize if needed
        if user_name not in user_counts:
            user_counts[user_name] = {"user_id": user_id, "total": 0, "voile": 0, "bar": 0, "benevole": 0}
        
        user_counts[user_name]["user_id"] = user_id  # Toujours mettre à jour (au cas où)
        user_counts[user_name]["total"] += 1
        if reservation.user.status in ["Moniteur", "Aide Moniteur"] and reservation.benevole == False:
            user_counts[user_name]["voile"] += 1
        if reservation.benevole or reservation.user.status == "Bénévole":
            user_counts[user_name]["benevole"] += 1
        elif reservation.user.status == "Bar":
            user_counts[user_name]["bar"] += 1
    
    # Display user statistics
    elements.append(Paragraph("Nombre de repas par utilisateur:", subtitle_style))
    user_data = [['ID', 'Utilisateur', 'Total repas', 'Voile', 'Bar', "Bénévole"]]
    for user_name, counts in user_counts.items():
        user_data.append([
            counts.get("user_id", "-"),
            user_name,
            str(counts["total"]),
            str(counts["voile"]),
            str(counts["bar"]),
            str(counts["benevole"])
        ])
    total = ['-', 'Total',
             str(total_meals),
             str(sum(counts["voile"] for counts in user_counts.values())),
             str(sum(counts["bar"] for counts in user_counts.values())),
             str(sum(counts["benevole"] for counts in user_counts.values()))
            ]
    user_data.append(total)
   
    user_table = Table(user_data, repeatRows=1)
    user_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(user_table)
    elements.append(Paragraph(" ", normal_style))
    elements.append(Paragraph(" ", normal_style))
    
    # Create table data for reservations list
    elements.append(Paragraph("Liste détaillée des réservations:", subtitle_style))
    data = [['ID', 'Date', 'Nom', 'Status']]  # Header row
    
    for reservation in reservations:
        # Use 'Bénévole' status if benevole flag is True, otherwise use user's status
        status = "Bénévole" if reservation.benevole else reservation.user.status
        data.append([
            reservation.user.user_id,
            reservation.date.strftime('%d/%m/%Y'),
            reservation.user.name,
            status,
        ])
    
    # Create table
    table = Table(data, repeatRows=1)
    
    # Add style to table
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    # Add the table to the elements list
    elements.append(table)
    
    # Build the PDF document
    doc.build(elements)
    
    # Return the response
    return response

@manager_required
def get_reservation_stats(request):
    """API endpoint to get reservation statistics within a date range"""
    try:
        # Get query parameters
        start_date_str = request.GET.get('start_date', '')
        end_date_str = request.GET.get('end_date', '')
        
        # Parse dates
        start_date, end_date = None, None
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%d/%m/%Y').date()
            except ValueError:
                return JsonResponse({'success': False, 'error': f"Format de date invalide pour la date de début: {start_date_str}"})
                
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%d/%m/%Y').date()
            except ValueError:
                return JsonResponse({'success': False, 'error': f"Format de date invalide pour la date de fin: {end_date_str}"})
        
        # Build query for reservations
        query_args = {}
        if start_date and end_date:
            query_args['date__range'] = [start_date, end_date]
        elif start_date:
            query_args['date__gte'] = start_date
        elif end_date:
            query_args['date__lte'] = end_date
            
        # Get all reservations within the date range
        reservations = Reservation.objects.filter(**query_args).select_related('user')
        
        # Calculate statistics
        total_meals = reservations.count()
        
        # Count meals by status
        status_counts = {}
        for reservation in reservations:
            status = "Bénévole" if reservation.benevole else reservation.user.status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Count meals by user (total, voile, bar, bénévole)
        user_counts = {}
        for reservation in reservations:
            name = reservation.user.name
            user_id = reservation.user.user_id
            # initialize if needed
            if name not in user_counts:
                user_counts[name] = {"user_id": user_id, "total": 0, "voile": 0, "bar": 0, "benevole": 0}
            
            user_counts[name]["user_id"] = user_id  # Toujours mettre à jour (au cas où)
            user_counts[name]["total"] += 1
            if reservation.user.status in ["Moniteur", "Aide Moniteur"] and reservation.benevole == False:
                user_counts[name]["voile"] += 1
            if reservation.benevole or reservation.user.status == "Bénévole":
                user_counts[name]["benevole"] += 1
            elif reservation.user.status == "Bar":
                user_counts[name]["bar"] += 1
        
        return JsonResponse({
            'success': True,
            'stats': {
                'total_meals': total_meals,
                'by_status': status_counts,
                'by_user': user_counts
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@manager_required
def get_settings(request):
    """API endpoint to get application settings"""
    try:
        settings_data = load_app_settings()
        return JsonResponse({'success': True, 'settings': settings_data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@manager_required
def update_settings(request):
    """API endpoint to update application settings"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Only POST method is allowed'})
    
    try:
        data = json.loads(request.body)
        current_settings = load_app_settings()
        
        # Update only the provided settings
        for key, value in data.items():
            current_settings[key] = value
        
        # Save the updated settings
        if save_app_settings(current_settings):
            return JsonResponse({'success': True, 'settings': current_settings})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to save settings'})
        

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})    
    
@csrf_exempt
@require_POST
def update_reservation_status_api(request):
    """API endpoint to update a reservation's volunteer status"""
    try:
        data = json.loads(request.body)
        date_str = data.get('date')
        is_volunteer = data.get('benevole', False)
        
        if not date_str:
            return JsonResponse({
                'success': False, 
                'error': 'Date is required'
            })
        
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Find the reservation
        try:
            reservation = Reservation.objects.get(
                user=request.user,
                date=date_obj
            )
            # Update the volunteer status
            reservation.benevole = is_volunteer
            reservation.save()
            
            return JsonResponse({
                'success': True
            })
        except Reservation.DoesNotExist:
            return JsonResponse({
                'success': False, 
                'error': 'Reservation not found'
            })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@csrf_exempt
@require_POST
def update_reservation_status(request, reservation_id):
    """API endpoint for manager to update a reservation's status by ID"""
    try:
        data = json.loads(request.body)
        is_volunteer = data.get('benevole', False)
        
        # Find the reservation
        reservation = get_object_or_404(Reservation, id=reservation_id)
        
        # Update the status
        reservation.benevole = is_volunteer
        reservation.save()
        
        return JsonResponse({
            'success': True
        })
    except Reservation.DoesNotExist:
        return JsonResponse({
            'success': False, 
            'error': 'Reservation not found'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })