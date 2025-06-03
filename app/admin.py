from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Reservation, ExtraReservation
from django.contrib.auth.models import Group
import csv
from django.http import HttpResponse

admin.site.site_header = "Interface Admin"
admin.site.site_title = "Administration"
admin.site.index_title = "Tableau de bord"


class ExportCsvMixin:
    def export_as_csv(self, request, queryset):
        meta = self.model._meta
        field_names = [field.name for field in meta.fields]

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename={}.csv'.format(meta)
        writer = csv.writer(response)

        writer.writerow(field_names)
        for obj in queryset:
            writer.writerow([getattr(obj, field) for field in field_names])

        return response

    export_as_csv.short_description = "Exporter en CSV"


class CustomUserAdmin(UserAdmin, ExportCsvMixin): 
    model = CustomUser
    list_display = ('name', 'status')  # Ajout du champ Admin
    actions = ["export_as_csv"]
    
    # Override fieldsets completely
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('name', 'status', 'email')}),
        ('Permissions', {'fields': ('is_superuser',)}),  # Ajout du champ Admin
    )
    
    # If you still need to add users via admin, keep this
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'name', 'status', 'is_superuser'),  # Ajout du champ Admin
        }),
    )


class CustomReservationAdmin(admin.ModelAdmin, ExportCsvMixin):
    # Fix: Change 'name' to valid fields that exist in the Reservation model
    list_display = ['user', 'date', 'created_at']
    actions = ["export_as_csv"]
    
    # Fix: Change 'name' to valid fields that exist in the Reservation model
    list_filter = ['date', 'user']
    
    search_fields = ['user__username', 'date']
    date_hierarchy = 'date'



class ExtraReservationAdmin(admin.ModelAdmin, ExportCsvMixin):
    list_display = ['date', 'category', 'count']
    actions = ['export_as_csv']
    list_filter = ['date', 'category']
    search_fields = ['category']
    date_hierarchy = 'date'



admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Reservation, CustomReservationAdmin)
admin.site.register(ExtraReservation, ExtraReservationAdmin)

admin.site.unregister(Group)