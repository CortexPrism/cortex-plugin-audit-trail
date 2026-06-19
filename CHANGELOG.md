# Changelog

## [Unreleased]

### Changed

- Renamed manifest file from `cortex.json` to `manifest.json` for consistency with Cortex standard
- Standardized UI section structure to `ui.settings` format
- Normalized parameter naming: `defaultValue` → `default`, `options` → `enum`
- Added `homepage` field with repository URL
- Added `dependencies` field to manifest

### Fixed

- Replaced `console.log` with `ctx.logger.info()` in lifecycle hooks

## [1.0.2] — 2026-06-15

### Added

- Initial release

## [1.0.2] — 2026-06-17

### Fixed

- Replaced non-existent `cortex/plugins` import with local `types.ts` containing inline type
  definitions
- Removed broken `cortex/plugins` import map from `deno.json`
- Fixed test files with complete mock contexts (`state.delete`, `state.list`,
  `config.get/set/getAll`, `logger`, `host`)
- Rewrote scaffold test files to test actual plugin tools instead of template leftovers
- Added `defaultValue` and `default` fields to `ToolParam` type for compatibility

## [1.0.1] — 2026-06-15

### Fixed

- Added `events` array to manifest: subscribes to `tool:post-execute`, `session:start`,
  `session:end` for automatic audit log capture via Cortex event bus

## [1.0.0] — 2026-06-15

### Added

- Initial plugin scaffold with 5 audit tools supporting Splunk, Elastic, Datadog, S3 exports
