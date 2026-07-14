# Simulation returns response payloads directly

`GameSimulation` returns gameplay Response payload DTOs directly, and `GameSessionService` adds authorization, diff sequence, envelope, persistence, and publication concerns. We deliberately do not introduce parallel domain-outcome types and transport mappers because there is only one server gameplay delivery path and the extra seam would duplicate the result model without current leverage.
