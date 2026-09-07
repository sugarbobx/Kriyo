from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .serializers import AnswerSubmitSerializer, QuestionSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current(request):
    attempt = services.get_current_attempt(request.user)
    return Response(services.build_gate_state(attempt))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def questions(request, criterion_key):
    try:
        qs = services.get_questions(criterion_key)
    except services.InvalidCriterionError:
        return Response({'detail': 'Unknown criterion.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(QuestionSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_answer(request, criterion_key):
    serializer = AnswerSubmitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        result = services.record_answer(
            request.user,
            criterion_key,
            serializer.validated_data['question_id'],
            serializer.validated_data['answer'],
        )
    except services.GateLockedError:
        return Response({'detail': 'Gate is locked or already completed.'}, status=status.HTTP_409_CONFLICT)
    except services.InvalidCriterionError:
        return Response({'detail': 'Unknown criterion.'}, status=status.HTTP_404_NOT_FOUND)
    except services.InvalidQuestionError:
        return Response({'detail': 'Unknown question for this criterion.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(result)
