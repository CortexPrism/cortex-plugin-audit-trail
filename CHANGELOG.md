# Changelog

## [Unreleased]

### Added
- Initial project setup

## [1.0.0] — 2026-06-15

### Added
- Initial release of cortex-plugin-audit-trail
- `audit_export` — Export to Splunk, Elastic, Datadog, file, S3 in JSON/CEF/LEEF/CSV
- `audit_schedule` — Create, list, delete recurring export schedules
- `audit_redact` — Redact sensitive fields (passwords, tokens, keys) from log data
- `audit_compliance_format` — Format logs for SOC 2, HIPAA, GDPR, PCI-DSS
- `audit_stats` — Audit trail statistics by time range
