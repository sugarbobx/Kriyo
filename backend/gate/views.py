from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from . import services
from .serializers import AnswerSubmitSerializer, QuestionSerializer


class GateAnswerRateThrottle(UserRateThrottle):
    """Keyed by user id. Rate set in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['gate_answer']."""
    scope = 'gate_answer'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current(request):
    attempt = services.get_current_attempt(request.user)
    return Response(services.build_gate_state(attempt))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def questions(request, criterion_key):
    qs = services.get_questions(criterion_key)
    return Response(QuestionSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def criterion_review(request, criterion_key):
    answers = services.get_criterion_review(request.user, criterion_key)
    return Response(answers)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([GateAnswerRateThrottle])
def submit_answer(request, criterion_key):
    serializer = AnswerSubmitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    result = services.record_answer(
        request.user,
        criterion_key,
        serializer.validated_data['question_id'],
        serializer.validated_data['answer'],
    )
    return Response(result)
