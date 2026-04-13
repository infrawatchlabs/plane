from django.apps import AppConfig


class IwConfig(AppConfig):
    name = "plane.iw"
    verbose_name = "InfraWatch Extensions"

    def ready(self):
        import plane.iw.signals  # noqa: F401 — register signal handlers
