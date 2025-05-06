from django.contrib.auth.models import User, AbstractUser
from django.contrib.auth import get_user_model
from django.db import models

class CustomUser(AbstractUser):
    class Status(models.TextChoices):
        MONITEUR = "Moniteur"
        BENEVOLE = "Bénévole"
        AIDE_MONITEUR = "Aide Moniteur"
        BAR = "Bar"
        
    name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.MONITEUR,
    )

    def __str__(self):
        return self.name
    

# Define the Profile model correctly
class Profile(models.Model):
    # Call get_user_model() with parentheses to execute the function
    user = models.OneToOneField(to=get_user_model(), on_delete=models.CASCADE, related_name='profile')
    # Add other profile fields here
    
    def __str__(self):
        return f"{self.user.username}'s profile"
