from django.urls import path

from . import views

urlpatterns = [

    path('', views.dashboard, name=""),

    path('my-login', views.my_login, name="my-login"),

    path('dashboard', views.dashboard, name="dashboard"),

    path('user-logout', views.user_logout, name="user-logout"),

    path('user-profile', views.user_profile, name="user-profile"),

    path('api/user-reservations', views.user_reservations_api, name='user_reservations'),

    path("api/toggle-reservation", views.toggle_reservation_api, name="toggle-reservation"),

    path('profile/', views.user_profile, name='user_profile'),

    path('profile/update-username/', views.update_username, name='update_username'),

    path('profile/change-password/', views.change_password, name='change_password'),
    
]
