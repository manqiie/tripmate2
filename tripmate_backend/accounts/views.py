# accounts/views.py
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    ProfileUpdateSerializer
)
from .models import PasswordResetToken

User = get_user_model()

# accounts/views.py - Updated register function
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Don't create token - just return success message
        return Response({
            'message': 'Account created successfully! Please sign in to continue.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login user with username or email"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user"""
    try:
        request.user.auth_token.delete()
        return Response({'message': 'Successfully logged out'})
    except:
        return Response({'error': 'Error logging out'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Request password reset with 6-digit code"""
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            reset_token = PasswordResetToken.generate_token(user)
            
            # Send email with 6-digit code
            send_reset_email(user, reset_token.token)
            
            return Response({
                'message': 'A 6-digit reset code has been sent to your email'
            })
        except User.DoesNotExist:
            pass
    
    # Always return success message for security
    return Response({
        'message': 'If the email exists, a reset code has been sent'
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Reset password with 6-digit code"""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(email=email)
            reset_token = PasswordResetToken.objects.get(
                user=user, 
                token=token, 
                is_used=False
            )
            
            if reset_token.is_expired():
                return Response({
                    'error': 'Reset code has expired. Please request a new one.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Reset password and mark token as used
            user.set_password(password)
            user.save()
            reset_token.is_used = True
            reset_token.save()
            
            return Response({'message': 'Password reset successful'})
            
        except (User.DoesNotExist, PasswordResetToken.DoesNotExist):
            return Response({
                'error': 'Invalid reset code'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get and update user profile"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return ProfileUpdateSerializer
        return UserSerializer
    
    def get_object(self):
        return self.request.user

def send_reset_email(user, token):
    """Send password reset email with 6-digit code"""
    subject = 'TripMate - Password Reset Code'
    
    # HTML email template
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .logo {{ color: #3b82f6; font-size: 28px; font-weight: bold; }}
            .code {{ background-color: #3b82f6; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; }}
            .expiry {{ color: #ef4444; font-weight: bold; text-align: center; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🗺️ TripMate</div>
                <h2>Password Reset Request</h2>
            </div>
            
            <p>Hello {user.first_name or user.username},</p>
            
            <p>You recently requested to reset your password for your TripMate account. Use the code below to reset your password:</p>
            
            <div class="code">{token}</div>
            
            <p class="expiry">⏰ This code will expire in 15 minutes</p>
            
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
            
            <div class="footer">
                <p>Best regards,<br>The TripMate Team</p>
                <p><em>This is an automated email. Please do not reply to this message.</em></p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    plain_message = f"""
    TripMate - Password Reset Code
    
    Hello {user.first_name or user.username},
    
    You recently requested to reset your password for your TripMate account.
    
    Your reset code is: {token}
    
    This code will expire in 15 minutes.
    
    If you didn't request this password reset, please ignore this email.
    
    Best regards,
    The TripMate Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as e:
        print(f"Failed to send email: {e}")