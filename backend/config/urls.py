from django.contrib import admin
from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response(
        {
            'auth': request.build_absolute_uri('/api/auth/'),
            'budget': request.build_absolute_uri('/api/budget/'),
        }
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/auth/', include('apps.users.urls')),
    path('api/budget/', include('apps.budgets.urls')),
]
