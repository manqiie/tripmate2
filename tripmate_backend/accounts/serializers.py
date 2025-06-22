# accounts/serializers.py - Updated RegisterSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from .models import PasswordResetToken

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                 'phone', 'date_of_birth')
        read_only_fields = ('id',)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'email': {'required': True},  # Make email required
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        """Check if username already exists"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()  # Can be username or email
    password = serializers.CharField()
    
    def validate(self, attrs):
        username_or_email = attrs.get('username')
        password = attrs.get('password')
        
        if username_or_email and password:
            # Try to find user by username first, then by email
            user = None
            try:
                user = User.objects.get(username=username_or_email)
            except User.DoesNotExist:
                try:
                    user = User.objects.get(email=username_or_email)
                except User.DoesNotExist:
                    pass
            
            if user:
                # Authenticate with the found user's username
                user = authenticate(username=user.username, password=password)
                if user:
                    if not user.is_active:
                        raise serializers.ValidationError('User account is disabled.')
                    attrs['user'] = user
                    return attrs
            
            raise serializers.ValidationError('Unable to log in with provided credentials.')
        else:
            raise serializers.ValidationError('Must include username/email and password.')

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    token = serializers.CharField(max_length=6)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'phone', 'date_of_birth')
        
    def update(self, instance, validated_data):
        # Update only provided fields
        for attr, value in validated_data.items():
            if value is not None and value != '':
                setattr(instance, attr, value)
        instance.save()
        return instance