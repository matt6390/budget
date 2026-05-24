class UserOwnedQuerySetMixin:
    """Filters querysets to the requesting user and auto-assigns user on create."""

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
