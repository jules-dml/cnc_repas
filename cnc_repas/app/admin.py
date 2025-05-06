from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser
from django.contrib.auth.models import Group
from django.contrib import admin

admin.site.site_header = "Interface Admin"
admin.site.site_title = "Administration"
admin.site.index_title = "Tableau de bord"


class CustomUserAdmin(UserAdmin): 
    model = CustomUser
    list_display = ('name', 'status')
    
    # Override fieldsets completely
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('name', 'status', 'email')}),
        # Permissions and Important dates sections removed
    )
    
    # If you still need to add users via admin, keep this
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'name', 'status'),
        }),
    )

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.unregister(Group)