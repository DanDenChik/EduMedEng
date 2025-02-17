from rest_framework import serializers
from .models import Chat, Message
import json


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "sender", "content", "timestamp"]


class ChatSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    doctor = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Chat
        fields = [
            "id",
            "doctor",
            "patient_data",
            "start_time",
            "end_time",
            "diagnosis",
            "score",
            "feedback",
            "is_finished",
            "messages",
            "difficulty",
        ]
        read_only_fields = [
            "doctor",
            "patient_data",
            "start_time",
            "end_time",
            "diagnosis",
            "score",
            "feedback",
            "is_finished",
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["patient_data"] = json.loads(instance.patient_data)
        return representation
