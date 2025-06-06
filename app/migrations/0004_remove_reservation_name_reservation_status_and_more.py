# Generated by Django 5.2 on 2025-05-06 12:48

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0003_rename_mealreservation_reservation'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='reservation',
            name='name',
        ),
        migrations.AddField(
            model_name='reservation',
            name='status',
            field=models.CharField(choices=[('pending', 'En attente'), ('approved', 'Approuvé'), ('denied', 'Refusé')], default='pending', max_length=20),
        ),
        migrations.AddField(
            model_name='reservation',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='reservation',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservations', to=settings.AUTH_USER_MODEL),
        ),
    ]
