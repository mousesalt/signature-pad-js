# Security Policy

## Supported versions

The latest commit on the default branch is the actively maintained version.

## Reporting a vulnerability

Please do not publish exploitable security details in a public issue.

Use a private GitHub security advisory for this repository when available. Include:

- a clear description of the issue,
- affected browser/version if relevant,
- reproduction steps or a minimal proof of concept,
- potential impact.

The library itself is client-side and does not transmit signature data to a remote service. Applications integrating it are responsible for authentication, authorization, transport security, and server-side storage controls.
