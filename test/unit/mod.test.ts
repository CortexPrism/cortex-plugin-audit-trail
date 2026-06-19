// deno-lint-ignore-file require-await
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-audit-trail',
  pluginDir: '/tmp/plugins/cortex-plugin-audit-trail',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length, 5);
  assertEquals(tools[0].definition.name, 'audit_export');
  assertEquals(tools[1].definition.name, 'audit_schedule');
  assertEquals(tools[2].definition.name, 'audit_redact');
  assertEquals(tools[3].definition.name, 'audit_compliance_format');
  assertEquals(tools[4].definition.name, 'audit_stats');
});

Deno.test('audit_export — rejects empty destination', async () => {
  const tool = findTool('audit_export');
  const result = await tool.execute({ 'destination': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('audit_schedule — rejects empty action', async () => {
  const tool = findTool('audit_schedule');
  const result = await tool.execute({ 'action': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('audit_redact — rejects empty data', async () => {
  const tool = findTool('audit_redact');
  const result = await tool.execute({ 'data': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('audit_compliance_format — rejects empty data', async () => {
  const tool = findTool('audit_compliance_format');
  const result = await tool.execute({ 'data': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('audit_stats — tool is defined with name and description', () => {
  const tool = findTool('audit_stats');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
