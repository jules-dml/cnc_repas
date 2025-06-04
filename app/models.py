from django.contrib.auth.models import User, AbstractUser
from django.contrib.auth import get_user_model
from django.db import models
from django.conf import settings

class CustomUser(AbstractUser):
    class Status(models.TextChoices):
        MONITEUR = "Moniteur"
        BENEVOLE = "Bénévole"
        AIDE_MONITEUR = "Aide Moniteur"
        BAR = "Bar"
        
    name = models.CharField(max_length=100)
    user_id = models.CharField(
        max_length=2,
        unique=True,
        verbose_name="ID utilisateur",
        null=True,    # <-- Ajouté pour migration initiale
        blank=True    # <-- Ajouté pour migration initiale
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.MONITEUR,
    )

    def __str__(self):
        return f"{self.name} ({self.user_id})"
    
    def save(self, *args, **kwargs):
        if not self.user_id:
            # Génère un id à 2 chiffres unique (01, 02, ..., 99)
            for i in range(1, 100):
                candidate = f"{i:02d}"
                if not CustomUser.objects.filter(user_id=candidate).exists():
                    self.user_id = candidate
                    break
        super().save(*args, **kwargs)

# Define the Profile model correctly
class Profile(models.Model):
    # Call get_user_model() with parentheses to execute the function
    user = models.OneToOneField(to=get_user_model(), on_delete=models.CASCADE, related_name='profile')
    # Add other profile fields here
    
    def __str__(self):
        return f"{self.user.username}'s profile"
    
class Reservation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservations')
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    benevole = models.BooleanField(default=False)  # Remplace le champ status par un booléen
    
    class Meta:
        unique_together = ['user', 'date']
        
    def __str__(self):
        status = "Bénévole" if self.benevole else self.user.status
        return f"{self.user.username} - {self.date} ({status})"

class ExtraReservation(models.Model):
    CATEGORY_CHOICES = [
        ('EDS', 'EDS'),
        ('Bénévole', 'Bénévole'),
        ('Autre', 'Autre'),
    ]
    date = models.DateField()
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ['date', 'category']

    def __str__(self):
        return f"{self.date} - {self.category}: {self.count}"
