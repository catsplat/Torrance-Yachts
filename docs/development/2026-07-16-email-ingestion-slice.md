# Phase 9 development diary

The email layer was built before AI so ingestion, retries, classification correction,
thread association, and enquiry creation remain reliable without a model provider.

The main workflow lesson was that new senders usually do not already exist in the
contact directory. Human approval of a new-enquiry classification therefore creates
or reuses the sender contact and the enquiry in one transaction.

The Settings timeout feature archives low-conversion dead ends instead of deleting
them. A later n8n schedule will run the same tested command automatically; staff can
already run it manually.
