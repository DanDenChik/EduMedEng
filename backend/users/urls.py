from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet, ProfileViewSet

router = DefaultRouter()
router.register(r"users", CustomUserViewSet)
router.register(r"profiles", ProfileViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("profile/", ProfileViewSet.as_view({"get": "my_profile"}), name="my-profile"),
    path("top-users/", ProfileViewSet.as_view({"get": "top_users"}), name="top-users"),
]
