from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import CustomUser, Profile
from .serializers import (
    CustomUserSerializer,
    ProfileSerializer,
    UserRegistrationSerializer,
)


class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer

    @action(detail=False, methods=["post"])
    def register(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == "top_users":
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=["GET"])
    def my_profile(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user)
        profile.update_points()
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=["GET"])
    def top_users(self, request):
        Profile.update_ranks()  # Обновляем ранги перед получением топ пользователей
        top_profiles = Profile.get_top_users()
        serializer = self.get_serializer(top_profiles, many=True)
        return Response(serializer.data)
