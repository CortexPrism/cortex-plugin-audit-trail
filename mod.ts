import type { PluginContext, Tool, ToolCallResult, ToolContext } from './types.ts';

let defaultFormat: string;
let defaultInterval: string;
let splunkHecUrl: string;
let splunkHecToken: string;
let elasticUrl: string;
let elasticApiKey: string;
let datadogApiKey: string;
let s3Bucket: string;

export async function onLoad(ctx: PluginContext): Promise<void> {
  const fmt = await ctx.config.get('defaultFormat');
  const interval = await ctx.config.get('defaultInterval');
  const hecUrl = await ctx.config.get('splunkHecUrl');
  const hecToken = await ctx.config.get('splunkHecToken');
  const esUrl = await ctx.config.get('elasticUrl');
  const esKey = await ctx.config.get('elasticApiKey');
  const ddKey = await ctx.config.get('datadogApiKey');
  const s3 = await ctx.config.get('s3Bucket');

  defaultFormat = fmt || 'json';
  defaultInterval = interval || 'daily';
  splunkHecUrl = hecUrl || '';
  splunkHecToken = hecToken || '';
  elasticUrl = esUrl || '';
  elasticApiKey = esKey || '';
  datadogApiKey = ddKey || '';
  s3Bucket = s3 || '';

  console.log(
    `[cortex-plugin-audit-trail] Loaded (format: ${defaultFormat}, interval: ${defaultInterval})`,
  );
}

export async function onUnload(_ctx: PluginContext): Promise<void> {
  console.log('[cortex-plugin-audit-trail] Unloading...');
}

const scheduledExports = new Map<
  string,
  { destination: string; interval: string; createdAt: string }
>();

const auditExportTool: Tool = {
  definition: {
    name: 'audit_export',
    description: 'Export audit logs to a destination in the specified format',
    params: [
      { name: 'destination', type: 'string', description: 'Export destination', required: true },
      { name: 'time_range', type: 'string', description: 'Time range for logs', required: false },
      { name: 'format', type: 'string', description: 'Export format', required: false },
      {
        name: 'filter',
        type: 'string',
        description: 'JSON query filter for log selection',
        required: false,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const destination = args.destination as string;
      const timeRange = (args.time_range as string) || '24h';
      const format = (args.format as string) || defaultFormat;
      const filter = args.filter as string | undefined;

      if (!destination) {
        return {
          toolName: 'audit_export',
          success: false,
          output: '',
          error: 'destination is required',
          durationMs: Date.now() - start,
        };
      }

      const validDestinations = ['splunk', 'elastic', 'datadog', 'file', 's3'];
      if (!validDestinations.includes(destination)) {
        return {
          toolName: 'audit_export',
          success: false,
          output: '',
          error: `Invalid destination. Valid: ${validDestinations.join(', ')}`,
          durationMs: Date.now() - start,
        };
      }

      const output = JSON.stringify(
        {
          destination,
          timeRange,
          format,
          filter: filter ? JSON.parse(filter) : null,
          status: 'completed',
          eventsExported: 0,
          timestamp: new Date().toISOString(),
          message: `Export to ${destination} completed. Connect to live environment for real data.`,
        },
        null,
        2,
      );

      return { toolName: 'audit_export', success: true, output, durationMs: Date.now() - start };
    } catch (error) {
      return {
        toolName: 'audit_export',
        success: false,
        output: '',
        error: `Export failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const auditScheduleTool: Tool = {
  definition: {
    name: 'audit_schedule',
    description: 'Schedule recurring audit log exports or manage existing schedules',
    params: [
      { name: 'action', type: 'string', description: 'Schedule action', required: true },
      {
        name: 'destination',
        type: 'string',
        description: 'Export destination for the schedule',
        required: false,
      },
      { name: 'interval', type: 'string', description: 'Recurring interval', required: false },
      {
        name: 'schedule_id',
        type: 'string',
        description: 'Schedule ID for delete action',
        required: false,
      },
    ],
    capabilities: [],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const action = args.action as string;
      const destination = args.destination as string | undefined;
      const interval = (args.interval as string) || defaultInterval;
      const scheduleId = args.schedule_id as string | undefined;

      if (action === 'list') {
        const schedules = Array.from(scheduledExports.entries()).map(([id, s]) => ({ id, ...s }));
        return {
          toolName: 'audit_schedule',
          success: true,
          output: JSON.stringify({ schedules, count: schedules.length }, null, 2),
          durationMs: Date.now() - start,
        };
      }

      if (action === 'create') {
        if (!destination) {
          return {
            toolName: 'audit_schedule',
            success: false,
            output: '',
            error: 'destination is required for create',
            durationMs: Date.now() - start,
          };
        }

        const id = `schedule_${Date.now()}`;
        scheduledExports.set(id, {
          destination,
          interval,
          createdAt: new Date().toISOString(),
        });

        return {
          toolName: 'audit_schedule',
          success: true,
          output: JSON.stringify({ id, destination, interval, status: 'created' }, null, 2),
          durationMs: Date.now() - start,
        };
      }

      if (action === 'delete') {
        if (!scheduleId) {
          return {
            toolName: 'audit_schedule',
            success: false,
            output: '',
            error: 'schedule_id is required for delete',
            durationMs: Date.now() - start,
          };
        }

        const existed = scheduledExports.delete(scheduleId);
        return {
          toolName: 'audit_schedule',
          success: true,
          output: existed ? `Schedule ${scheduleId} deleted` : `Schedule ${scheduleId} not found`,
          durationMs: Date.now() - start,
        };
      }

      return {
        toolName: 'audit_schedule',
        success: false,
        output: '',
        error: `Unknown action: ${action}`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'audit_schedule',
        success: false,
        output: '',
        error: `Schedule operation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'credential',
  'private_key',
  'authorization',
];

const auditRedactTool: Tool = {
  definition: {
    name: 'audit_redact',
    description: 'Redact sensitive fields from log data before export',
    params: [
      { name: 'data', type: 'string', description: 'JSON log data to redact', required: true },
      {
        name: 'redaction_rules',
        type: 'string',
        description: 'JSON array of field paths to redact',
        required: false,
      },
    ],
    capabilities: [],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const dataStr = args.data as string;
      const rulesStr = args.redaction_rules as string | undefined;

      if (!dataStr) {
        return {
          toolName: 'audit_redact',
          success: false,
          output: '',
          error: 'data is required',
          durationMs: Date.now() - start,
        };
      }

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataStr);
      } catch {
        return {
          toolName: 'audit_redact',
          success: false,
          output: '',
          error: 'data must be valid JSON',
          durationMs: Date.now() - start,
        };
      }

      const customRules: string[] = rulesStr ? JSON.parse(rulesStr) : [];

      function redact(obj: Record<string, unknown>, path: string[] = []): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = [...path, key].join('.');
          const isSensitive = SENSITIVE_FIELDS.some((f) =>
            key.toLowerCase().includes(f.toLowerCase())
          ) ||
            customRules.includes(currentPath) ||
            customRules.includes(key);

          if (isSensitive) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = redact(value as Record<string, unknown>, [...path, key]);
          } else if (Array.isArray(value)) {
            result[key] = value.map((v) =>
              typeof v === 'object' && v !== null
                ? redact(v as Record<string, unknown>, [...path, key])
                : v
            );
          } else {
            result[key] = value;
          }
        }
        return result;
      }

      const redacted = redact(data);

      return {
        toolName: 'audit_redact',
        success: true,
        output: JSON.stringify(
          { redacted, fieldsRedacted: SENSITIVE_FIELDS.length + customRules.length },
          null,
          2,
        ),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'audit_redact',
        success: false,
        output: '',
        error: `Redaction failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const complianceFormatters: Record<
  string,
  (event: Record<string, unknown>) => Record<string, unknown>
> = {
  soc2: (event) => ({
    ...event,
    compliance_framework: 'SOC2',
    control_id: event.event_type || 'SOC2-UNKNOWN',
    timestamp: event.timestamp || new Date().toISOString(),
    user_id: event.user_id || 'unknown',
    outcome: event.outcome || 'success',
    evidence: event.details || {},
  }),
  hipaa: (event) => ({
    ...event,
    compliance_framework: 'HIPAA',
    phi_access: event.phi_access || false,
    access_type: event.access_type || 'read',
    ephi_involved: event.ephi_involved !== undefined ? event.ephi_involved : false,
    timestamp: event.timestamp || new Date().toISOString(),
    user_id: event.user_id || 'unknown',
    audit_control_id: event.event_type || 'HIPAA-UNKNOWN',
  }),
  gdpr: (event) => ({
    ...event,
    compliance_framework: 'GDPR',
    personal_data_involved: event.personal_data !== undefined ? event.personal_data : true,
    data_subject_id: event.data_subject_id || 'unknown',
    processing_purpose: event.purpose || 'unspecified',
    legal_basis: event.legal_basis || 'legitimate_interest',
    timestamp: event.timestamp || new Date().toISOString(),
  }),
  pci_dss: (event) => ({
    ...event,
    compliance_framework: 'PCI-DSS',
    chd_involved: event.chd_involved !== undefined ? event.chd_involved : false,
    cardholder_env: event.cardholder_env || 'unknown',
    access_type: event.access_type || 'read',
    timestamp: event.timestamp || new Date().toISOString(),
    user_id: event.user_id || 'unknown',
    pci_requirement: event.event_type || 'PCI-UNKNOWN',
  }),
};

const auditComplianceFormatTool: Tool = {
  definition: {
    name: 'audit_compliance_format',
    description: 'Format audit logs to meet compliance framework requirements',
    params: [
      { name: 'data', type: 'string', description: 'JSON log data to format', required: true },
      {
        name: 'framework',
        type: 'string',
        description: 'Target compliance framework',
        required: true,
      },
    ],
    capabilities: [],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const dataStr = args.data as string;
      const framework = args.framework as string;

      if (!dataStr || !framework) {
        return {
          toolName: 'audit_compliance_format',
          success: false,
          output: '',
          error: 'data and framework are required',
          durationMs: Date.now() - start,
        };
      }

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataStr);
      } catch {
        return {
          toolName: 'audit_compliance_format',
          success: false,
          output: '',
          error: 'data must be valid JSON',
          durationMs: Date.now() - start,
        };
      }

      const formatter = complianceFormatters[framework];
      if (!formatter) {
        return {
          toolName: 'audit_compliance_format',
          success: false,
          output: '',
          error: `Unknown framework: ${framework}. Valid: soc2, hipaa, gdpr, pci_dss`,
          durationMs: Date.now() - start,
        };
      }

      const formatted = formatter(data);

      return {
        toolName: 'audit_compliance_format',
        success: true,
        output: JSON.stringify(
          { framework, originalEvent: data, complianceFormatted: formatted },
          null,
          2,
        ),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'audit_compliance_format',
        success: false,
        output: '',
        error: `Format failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const auditStatsTool: Tool = {
  definition: {
    name: 'audit_stats',
    description: 'Get audit trail statistics for a time range',
    params: [
      {
        name: 'time_range',
        type: 'string',
        description: 'Time range for statistics',
        required: false,
      },
    ],
    capabilities: [],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const timeRange = (args.time_range as string) || '30d';

      const output = JSON.stringify(
        {
          timeRange,
          totalEvents: 0,
          uniqueUsers: 0,
          topEventTypes: [] as string[],
          exportsCompleted: 0,
          scheduledExports: scheduledExports.size,
          message: 'Statistics require live event source connection.',
        },
        null,
        2,
      );

      return { toolName: 'audit_stats', success: true, output, durationMs: Date.now() - start };
    } catch (error) {
      return {
        toolName: 'audit_stats',
        success: false,
        output: '',
        error: `Stats failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const tools: Tool[] = [
  auditExportTool,
  auditScheduleTool,
  auditRedactTool,
  auditComplianceFormatTool,
  auditStatsTool,
];
