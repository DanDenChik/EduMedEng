from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.db.models import F, Sum
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserManager(BaseUserManager):
    """Define a model manager for User model with no username field."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        """Create and save a User with the given email and password."""
        if not email:
            raise ValueError("The given email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    username = models.CharField(max_length=40, default="")
    email = models.EmailField(_("email address"), unique=True)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()


class Profile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    points = models.IntegerField(default=0)
    rank = models.IntegerField(default=1)

    @staticmethod
    def get_top_users(limit=10):
        return Profile.objects.order_by("-points", "id").select_related("user")[:limit]

    def update_points(self):
        from core.models import Chat

        total_points = (
            Chat.objects.filter(doctor=self.user, is_finished=True).aggregate(
                Sum("score")
            )["score__sum"]
            or 0
        )
        if self.points != total_points:
            self.points = total_points
            self.save(update_fields=["points"])
            self.update_ranks()

    @classmethod
    def update_ranks(cls):
        profiles = cls.objects.order_by("-points", "id")
        rank = 1
        for profile in profiles:
            if profile.rank != rank:
                profile.rank = rank
                profile.save(update_fields=["rank"])
            rank += 1

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new or "points" in kwargs.get("update_fields", []):
            self.update_ranks()


@receiver(post_save, sender=CustomUser)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=CustomUser)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()


@receiver(post_save, sender="core.Chat")
def update_profile_points(sender, instance, **kwargs):
    if instance.is_finished:
        instance.doctor.profile.update_points()
