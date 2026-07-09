# One active socket per user

The online system allows one Active Socket per authenticated user. This keeps User Session state, Topic Presence, authorization, and prediction reconciliation unambiguous; supporting multiple tabs or devices for the same user would require a separate decision and a more complex ownership model.
