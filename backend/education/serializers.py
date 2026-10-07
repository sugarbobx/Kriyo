from rest_framework import serializers


class MarkReadSerializer(serializers.Serializer):
    module_key = serializers.SlugField(max_length=64)
