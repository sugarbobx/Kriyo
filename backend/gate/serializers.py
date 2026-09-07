from rest_framework import serializers

from .models import Question


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'order', 'text']


class AnswerSubmitSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer = serializers.BooleanField()
