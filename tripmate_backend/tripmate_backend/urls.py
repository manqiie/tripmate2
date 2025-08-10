# /home/ubuntu/app/tripmate2/tripmate_backend/tripmate_backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse   # <-- add this

admin.site.site_header = "TripMate Administration"
admin.site.site_title = "TripMate Admin"
admin.site.index_title = "Welcome to TripMate Administration Portal"

def home(_request):                     # <-- add this
    return JsonResponse({"status": "ok", "app": "tripmate-backend"})

urlpatterns = [
    path("", home, name="home"),        # <-- add this
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/trips/', include('trips.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

