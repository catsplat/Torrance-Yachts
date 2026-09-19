# Workflow configuration corrections

Fixed the configuration validator using one incompatible placeholder list for
all templates. It now matches the actual offer and communication renderers.
Unknown, self, forward and duplicate task references fail before import.
The automatic milestone flag survives validation, and the starter marks 0.0
automatic so staff need not manually complete a bookkeeping task to unlock 0.A.

Offer templates can omit their subject. The prepared offer uses its linked
conversation subject, or a yacht-based default for a new conversation. Existing
approved templates and offer snapshots remain unchanged. Migration 20260919120000
only relaxes the template-subject constraint; final offer review remains required.

Migration 20260919130000 marks absent instalments not applicable after contract
review, preserving tasks and audit history. An amended approved schedule can
reactivate them. The legacy readiness refresh now uses the same condition engine.
The project brief section 6.8 starts the default sequence at human-confirmed
contract review; no second pre-booking reservation workflow has been introduced.
Comprehensive live client workflow acceptance remains pending.
