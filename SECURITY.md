# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this library, please **do not** open a public issue. Instead, report it privately via one of the following channels:

1. **GitHub Security Advisory**: https://github.com/johntips/react-native-infinite-tab-view/security/advisories/new (preferred)
2. Email: See the maintainer profile at https://github.com/johntips

We'll acknowledge receipt within 7 days and work on a fix as soon as possible. Please give us a reasonable window to address the issue before public disclosure.

## Supported Versions

Only the latest published version receives security updates. Please keep your dependencies up to date.

## Scope

This library runs entirely on the client (React Native app). Vulnerabilities of interest include:

- Crashes or hangs triggered by crafted input (prop values, data)
- Memory / resource leaks under adversarial use
- Supply chain issues in published npm tarballs
