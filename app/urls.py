from django.urls import path

from . import views

urlpatterns = [

    path('', views.dashboard, name=""),

    path('my-login', views.my_login, name="my-login"),

    path('dashboard', views.dashboard, name="dashboard"),

    path('manager/', views.manager_dashboard, name="manager-dashboard"),

    path('user-logout', views.user_logout, name="user-logout"),

    path('user-profile', views.user_profile, name="user-profile"),

    path('api/user-reservations', views.user_reservations_api, name='user_reservations'),

    path("api/toggle-reservation", views.toggle_reservation_api, name="toggle-reservation"),

    path("api/update-reservation-status", views.update_reservation_status_api, name="update-reservation-status"),

    path("manager/api/create_reservation", views.create_reservation, name="create_reservation"),

    path('api/week-reservations', views.get_week_reservations, name='week_reservations'),

    path('profile/', views.user_profile, name='user_profile'),

    path('profile/update-username/', views.update_username, name='update_username'),

    path('profile/change-password/', views.change_password, name='change_password'),

    path("api/delete_reservation/<int:reservation_id>", views.delete_reservation, name="delete_reservation"),
    
    # User management API endpoints
    path("manager/api/users", views.get_users, name="get_users"),
    path("manager/api/users/add", views.add_user, name="add_user"),
    path("manager/api/users/update/<int:user_id>", views.update_user, name="update_user"),

    # Export API endpoint
    path("manager/api/export_reservations", views.export_reservations, name="export_reservations"),

    # Reservation statistics API endpoint
    path('manager/api/reservation-stats', views.get_reservation_stats, name='get_reservation_stats'),

    # Settings API endpoints
    path("api/get-settings", views.get_settings, name="get_settings"),
    path("manager/api/settings/update", views.update_settings, name="update_settings"),

    # Add this new URL pattern for updating reservation status by ID
    path("api/update_reservation_status/<int:reservation_id>", views.update_reservation_status, name="update_reservation_status_by_id"),
]
