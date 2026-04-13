"""
InfraWatch signals — auto-derive epic state from child work items.

When a child issue's state changes, recompute the parent epic's state
based on the aggregate of all children's state groups.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from plane.db.models import Issue, State


def _compute_epic_state(epic):
    """
    Determine the epic's state based on children's state groups.

    Logic (evaluated top-to-bottom, first match wins):
      - No children                           → no change
      - All children backlog                   → Backlog
      - All children cancelled                 → Cancelled
      - All children completed or cancelled    → Done
      - Any child started or completed         → In Progress
      - Otherwise (mix of unstarted/backlog)   → Todo
    """
    children = Issue.issue_objects.filter(
        parent_id=epic.id,
    ).select_related("state")

    if not children.exists():
        return None

    groups = set(children.values_list("state__group", flat=True))

    if groups == {"backlog"}:
        target_group = "backlog"
    elif groups == {"cancelled"}:
        target_group = "cancelled"
    elif groups <= {"completed", "cancelled"}:
        target_group = "completed"
    elif groups & {"started", "completed"}:
        target_group = "started"
    else:
        target_group = "unstarted"

    return target_group


def _get_state_for_group(project_id, group):
    """Get the first state in a project matching the given group."""
    return (
        State.objects.filter(
            project_id=project_id,
            group=group,
        )
        .order_by("sequence")
        .first()
    )


@receiver(post_save, sender=Issue)
def update_parent_epic_state(sender, instance, **kwargs):
    """
    After saving an issue, check if its parent is an epic.
    If so, recompute the epic's state from all children.
    """
    # Skip if no parent
    if not instance.parent_id:
        return

    try:
        parent = Issue.issue_objects.select_related("type", "state").get(
            id=instance.parent_id
        )
    except Issue.DoesNotExist:
        return

    # Only auto-derive state for epics
    if not parent.type_id or not parent.type.is_epic:
        return

    target_group = _compute_epic_state(parent)
    if target_group is None:
        return

    # Skip if already in the right group
    if parent.state and parent.state.group == target_group:
        return

    new_state = _get_state_for_group(parent.project_id, target_group)
    if new_state and new_state.id != parent.state_id:
        # Direct update to avoid recursive signal loops
        Issue.objects.filter(id=parent.id).update(state_id=new_state.id)
