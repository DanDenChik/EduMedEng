from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Chat, Message
from .serializers import ChatSerializer, MessageSerializer
from openai import OpenAI
import os
from dotenv import load_dotenv, find_dotenv
import logging
import json
from .disease_lists import COMMON_DISEASES, MEDIUM_DISEASES, HARD_DISEASES
import random

logger = logging.getLogger(__name__)

load_dotenv(find_dotenv())

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]
    queryset = Chat.objects.all()

    def get_queryset(self):
        return Chat.objects.filter(doctor=self.request.user)

    def check_object_permissions(self, request, obj):
        if obj.doctor != request.user:
            raise PermissionDenied("You do not have permission to access this chat.")
        return super().check_object_permissions(request, obj)

    def list(self, request, *args, **kwargs):
        logger.info(f"User {request.user.id} requested chat list")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        logger.info(f"User {request.user.id} requested chat {kwargs.get('pk')}")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        logger.info(f"User {request.user.id} is creating a new chat")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        patient_data = self.generate_patient()
        serializer.save(doctor=self.request.user, patient_data=json.dumps(patient_data))

    def generate_patient(self, difficulty):
        if difficulty == "easy":
            disease = random.choice(COMMON_DISEASES)
            description_quality = "detailed and accurate"
        elif difficulty == "medium":
            disease = random.choice(COMMON_DISEASES + MEDIUM_DISEASES)
            description_quality = "fairly accurate but may miss some details"
        else:  # hard
            disease = random.choice(COMMON_DISEASES + MEDIUM_DISEASES + HARD_DISEASES)
            description_quality = "inaccurate, may confuse descriptions and complain about unrelated symptoms"

        prompt = f"""Create virtual patient data with the disease: {disease}.
        The patient should describe their symptoms {description_quality}.
        Include the following information:
        1. Name
        2. Age
        3. Gender
        4. Main complaints
        5. Medical history
        6. Additional information

        Also create preliminary patient responses to the following questions:
        1. Describe your symptoms
        2. How long have you had these symptoms?
        3. Do you have any allergies or chronic diseases?
        4. Are you taking any medications?
        5. Describe your appearance
        6. What do you feel when touching or pressing the area of discomfort?
        IMPORTANT: DO NOT MENTION THE NAME OF YOUR DISEASE

        Return the data in JSON format with three keys: 'patient_data', 'patient_responses', and 'correct_diagnosis'."""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": prompt},
            ],
        )

        generated_data = json.loads(response.choices[0].message.content)
        generated_data["correct_diagnosis"] = (
            disease
        )
        return generated_data

    def create(self, request, *args, **kwargs):
        difficulty = request.data.get("difficulty", "easy")
        generated_data = self.generate_patient(difficulty)

        chat = Chat.objects.create(
            doctor=request.user,
            patient_data=json.dumps(generated_data["patient_data"]),
            patient_responses=json.dumps(generated_data["patient_responses"]),
            difficulty=difficulty,
            correct_diagnosis=generated_data[
                "correct_diagnosis"
            ],
        )

        serializer = self.get_serializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def evaluate_answer(self, chat, doctor_answer):
        doctor_questions = Message.objects.filter(
            chat=chat, sender="doctor"
        ).values_list("content", flat=True)

        prompt = f"""You are a medical expert. Evaluate the doctor's work based on the following criteria:
        

        Evaluate the following aspects:
        1. Accuracy of diagnosis (0-2000 points)
        2. Quality of symptom information gathering (0-1000 points)
        3. Questions about the patient's appearance (0-500 points)
        4. Questions about tactile sensations (0-500 points)
        5. Overall approach and logic (0-1000 points)

    
        Correct diagnosis: {chat.correct_diagnosis}
        
        Doctor's questions:
        {json.dumps(list(doctor_questions), indent=2)}
        
        Doctor's final diagnosis: {doctor_answer}

        Provide the evaluation in the format:
        Score: [total points across all criteria, 0-5000 points]
        Feedback: [brief comment on each criterion]"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": prompt},
            ],
        )

        evaluation = response.choices[0].message.content
        score_line = next(
            line for line in evaluation.split("\n") if line.startswith("Score:")
        )
        feedback = evaluation.split("Feedback:")[1].strip()

        score = int(score_line.split(" ")[1].strip())

        return {
            "correct_diagnosis": chat.correct_diagnosis,
            "score": score,
            "feedback": feedback,
        }

    def get_patient_response(self, chat, doctor_message):
        patient_data = json.loads(chat.patient_data)
        patient_responses = json.loads(chat.patient_responses)
        difficulty = chat.difficulty

        if difficulty == "easy":
            response_style = "Answer the doctor's questions accurately and in detail."
        elif difficulty == "medium":
            response_style = "Answer fairly accurately, but you may sometimes miss some details or get a bit confused."
        else: 
            response_style = "Answer inaccurately, get confused in descriptions, and sometimes complain about symptoms unrelated to your main disease."

        prompt = f"""You are a virtual patient with the following data:
        {json.dumps(patient_data, indent=2)}

        You have the following pre-prepared responses:
        {json.dumps(patient_responses, indent=2)}

        {response_style}

        Doctor's question: {doctor_message}

        If the doctor's question matches one of the pre-prepared responses, use it as a basis, 
        but adapt it to the specific question. If the question is new, answer it based on the patient's data and response style.
        Answer the doctor's question as the patient.
        IMPORTANT: DO NOT MENTION THE NAME OF THE DISEASE"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": prompt},
            ],
        )

        return response.choices[0].message.content

    @action(detail=True, methods=["post"])
    def send_message(self, request, pk=None):
        chat = self.get_object()
        content = request.data.get("content")

        if chat.doctor != request.user:
            return Response(
                {"error": "You are not authorized to send messages in this chat"},
                status=status.HTTP_403_FORBIDDEN,
            )

        patient_response = self.get_patient_response(chat, content)

        Message.objects.create(chat=chat, sender="doctor", content=content)
        patient_message = Message.objects.create(
            chat=chat, sender="patient", content=patient_response
        )

        return Response(MessageSerializer(patient_message).data)

    @action(detail=True, methods=["post"])
    def end_game(self, request, pk=None):
        chat = self.get_object()
        answer = request.data.get("answer")

        if chat.doctor != request.user:
            return Response(
                {"error": "You are not authorized to end this game"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if chat.is_finished:
            return Response(
                {"error": "This game has already ended"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        evaluation = self.evaluate_answer(chat, answer)

        chat.diagnosis = answer
        chat.score = evaluation["score"]
        chat.feedback = evaluation["feedback"]
        chat.is_finished = True
        chat.save()

        return Response(evaluation)
