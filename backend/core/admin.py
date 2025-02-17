from django.contrib import admin
from .models import Chat, Message

class MessageInline(admin.TabularInline):
    model = Message
    extra = 0

@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ['id', 'doctor', 'start_time', 'is_finished', 'score']
    list_filter = ['is_finished', 'start_time']
    search_fields = ['doctor__username', 'diagnosis']
    readonly_fields = ['patient_data', 'start_time', 'end_time']
    inlines = [MessageInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(doctor=request.user)

    def has_change_permission(self, request, obj=None):
        if obj is not None and obj.doctor != request.user and not request.user.is_superuser:
            return False
        return super().has_change_permission(request, obj)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'chat', 'sender', 'timestamp']
    list_filter = ['sender', 'timestamp']
    search_fields = ['content', 'chat__doctor__username']
    readonly_fields = ['chat', 'sender', 'content', 'timestamp']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(chat__doctor=request.user)