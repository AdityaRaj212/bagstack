# Security Policy

## Supported Versions

We actively maintain and provide security updates for the current production release of Bagstack:

| Version | Supported          |
| ------- | ------------------ |
| 2.x (Current) | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

The Bagstack team takes security and user privacy seriously. If you discover a security vulnerability, please report it responsibly so it can be fixed before public disclosure:

1. **Do NOT open a public GitHub issue** to report vulnerabilities or security leaks.
2. Please report the issue via GitHub's [Private Vulnerability Reporting](https://github.com/AdityaRaj212/bagstack/security/advisories/new) or by emailing the maintainer directly at `aditya.education212@gmail.com`.
3. Please include:
   - A clear description of the vulnerability and its potential impact.
   - Minimal steps or conceptual proof to reproduce the issue.
   - Any suggested remediation or patch.

## Security Practices in Bagstack

- **Session Security**: Session tokens are cryptographically randomized, stored hashed in SQLite, and issued via `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
- **Data Protection**: All sensitive financial records are strictly isolated by verified owner accounts (`owner_email`). Cross-tenant IDOR access is programmatically forbidden.
- **SQL Security**: All SQLite database interactions use strict parameterized statements (`?` bindings) to prevent SQL injection.
- **Rate Limiting**: Authentication and OTP dispatch endpoints enforce IP and email sliding-window rate limiters.
- **Security Headers**: HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, and Permissions-Policy are enforced on every request.
