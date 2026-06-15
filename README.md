# cortex-plugin-audit-trail

Export audit logs to SIEM/SOAR (Splunk, Elastic, Datadog) with scheduling, redaction, and compliance formatting.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-audit-trail
cortex plugin install github:CortexPrism/cortex-plugin-audit-trail
cortex plugin install ./manifest.json
```

## Tools

### audit_export
Export audit logs to a destination.

**Parameters:**
- `destination` (string, required) — One of: splunk, elastic, datadog, file, s3
- `time_range` (string, default: "24h")
- `format` (string, default: "json") — json, cef, leef, csv
- `filter` (string, optional) — JSON query filter

### audit_schedule
Schedule recurring exports or manage schedules.

**Parameters:**
- `action` (string, required) — create, list, delete
- `destination` (string, optional) — Required for create
- `interval` (string, optional) — hourly, daily, weekly
- `schedule_id` (string, optional) — Required for delete

### audit_redact
Redact sensitive fields from log data.

**Parameters:**
- `data` (string, required) — JSON log data
- `redaction_rules` (string, optional) — JSON array of field paths

### audit_compliance_format
Format logs for compliance frameworks.

**Parameters:**
- `data` (string, required) — JSON log data
- `framework` (string, required) — soc2, hipaa, gdpr, pci_dss

### audit_stats
Get audit trail statistics.

**Parameters:**
- `time_range` (string, default: "30d")

## Configuration

### Export Destinations section
- **Splunk HEC URL** (text) — HEC endpoint
- **Splunk HEC Token** (secret) — Auth token
- **Elastic URL** (text) — Cluster URL
- **Elastic API Key** (secret) — Auth key
- **Datadog API Key** (secret) — Ingestion key
- **S3 Bucket** (text) — Bucket name

### General section
- **Default Format** (select, default: json) — json/cef/leef/csv
- **Default Interval** (select, default: daily) — hourly/daily/weekly

## Capabilities

- `tools` — Audit export and management tools
- `events:listener` — Listens to Cortex events for audit trail
- `network:fetch` — Sends exports to external SIEM/SOAR endpoints

## Development

```bash
deno task test
deno task validate
```

## License

MIT

## Events

This plugin subscribes to the Cortex event bus for real-time processing:

| Event | Purpose |
|-------|---------|
|  | Capture tool execution for audit logs |
|  | Log session start events |
|  | Log session termination events |
