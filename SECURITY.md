# Security policy

## Supported versions

We address security issues in the **default branch** (`main`) of this repository. Deployments should track recent commits and dependency updates (see Dependabot PRs and `npm audit`).

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security reports.

1. Use **GitHub private vulnerability reporting** (if enabled on the repo): **Security → Report a vulnerability**.
2. Or contact the repository maintainers privately (e.g. via the email on the maintainer’s GitHub profile or your organization’s security contact).

Include:

- A short description of the issue and impact
- Steps to reproduce (or a proof-of-concept)
- Affected component (e.g. `server/src/...`, deployment type)

We aim to acknowledge reports within a few business days. This is a best-effort community project; timelines depend on maintainer availability.

## Scope notes

- **PHI / compliance:** This application can process sensitive clinic data. Deployment security (TLS, backups, access control, hosting hardening) is the **operator’s responsibility** — see `server/DB_SECURITY_AND_BACKUP.md` and `newtodolist.md`.
- **Secrets:** Never commit real `.env` values or paste tokens in issues or chat.
