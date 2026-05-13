# Infrastructure (cross-cutting)

Express middleware, health probes, DB bootstrap, and audit hooks live under `server/src/middleware`, `server/src/db`, and `server/src/services` without domain coupling.

Do **not** place clinical/finance/retail business rules here — only technical concerns.
