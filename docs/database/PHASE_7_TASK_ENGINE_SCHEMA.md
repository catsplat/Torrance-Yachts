# Phase 7 database schema

## Template records

- `task_templates`: immutable approved versions and editable drafts.
- `task_template_steps`: numbered workflow definitions, schedule rules, reminders, priority, optionality, and external-action requirements.
- `task_template_step_dependencies`: acyclic prerequisite graph within one template.

## Generated operational records

- `tasks`: authoritative booking tasks with stable references, provenance, status, due date, assignee, priority, blocker, and completion/cancellation fields.
- `task_dependencies`: generated prerequisite graph within one booking.
- `task_history`: append-only lifecycle and schedule evidence.
- `task_notes`: append-only attributed operational notes.

## Principal commands

- `generate_booking_tasks`
- `complete_task`
- `reopen_task`
- `update_task_schedule`
- `add_ad_hoc_task`
- `cancel_ad_hoc_task`
- `add_task_note`
- `clone_task_template`
- `add_task_template_step`
- `update_task_template_step`
- `delete_task_template_step`
- `replace_task_template_dependencies`
- `approve_task_template`

All Phase 7 tables use RLS. Application roles cannot delete tasks, write history, bypass statuses, or modify approved templates.
