# Changelog — Audit Trail Exporter

## [1.0.1] — 2026-06-15

### Fixed
- Added `events` array to manifest: subscribes to `tool:post-execute`, `session:start`, `session:end` for automatic audit log capture via Cortex event bus

## [1.0.0] — 2026-06-15

### Added
- Initial plugin scaffold with 5 audit tools supporting Splunk, Elastic, Datadog, S3 exports
