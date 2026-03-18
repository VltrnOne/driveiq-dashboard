#!/usr/bin/env node
/**
 * DriveIQ Deployment Agent
 * Autonomously provisions Neon DB, configures Render, deploys, and seeds.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-xxx \
 *   NEON_API_KEY=xxx \
 *   RENDER_API_KEY=rnd_xxx \
 *   node scripts/deploy-agent.mjs
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NEON_API    = 'https://console.neon.tech/api/v2';
const RENDER_API  = 'https://api.render.com/v1';
const RENDER_KEY  = process.env.RENDER_API_KEY;
const NEON_KEY    = process.env.NEON_API_KEY;
const SERVICE_NAME = 'driveiq-dashboard';

// ─── Tool implementations ──────────────────────────────────────────────────

async function neonRequest(method, path, body) {
  const res = await fetch(`${NEON_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${NEON_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function renderRequest(method, path, body) {
  const res = await fetch(`${RENDER_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${RENDER_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

// ─── Tool definitions ──────────────────────────────────────────────────────

const tools = [
  {
    name: 'neon_list_projects',
    description: 'List all Neon PostgreSQL projects for this account.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'neon_create_project',
    description: 'Create a new Neon PostgreSQL project and return the connection string.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name, e.g. driveiq' },
        region_id: { type: 'string', description: 'Region, e.g. aws-us-east-2' },
      },
      required: ['name'],
    },
  },
  {
    name: 'neon_get_connection_string',
    description: 'Get the PostgreSQL connection string for an existing Neon project.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'string' } },
      required: ['project_id'],
    },
  },
  {
    name: 'render_find_service',
    description: 'Find the Render web service by name and return its ID.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Service name to search for' } },
      required: ['name'],
    },
  },
  {
    name: 'render_get_env_vars',
    description: 'Get current environment variables for a Render service.',
    input_schema: {
      type: 'object',
      properties: { service_id: { type: 'string' } },
      required: ['service_id'],
    },
  },
  {
    name: 'render_set_env_vars',
    description: 'Set (upsert) environment variables on a Render service. This replaces ALL env vars so pass the full list.',
    input_schema: {
      type: 'object',
      properties: {
        service_id: { type: 'string' },
        env_vars: {
          type: 'array',
          items: {
            type: 'object',
            properties: { key: { type: 'string' }, value: { type: 'string' } },
            required: ['key', 'value'],
          },
          description: 'Full list of env var key/value pairs',
        },
      },
      required: ['service_id', 'env_vars'],
    },
  },
  {
    name: 'render_trigger_deploy',
    description: 'Trigger a new deployment on a Render service.',
    input_schema: {
      type: 'object',
      properties: {
        service_id: { type: 'string' },
        clear_cache: { type: 'boolean', description: 'Whether to clear build cache' },
      },
      required: ['service_id'],
    },
  },
  {
    name: 'render_get_deploy_status',
    description: 'Get the status of the latest deployment for a Render service.',
    input_schema: {
      type: 'object',
      properties: { service_id: { type: 'string' } },
      required: ['service_id'],
    },
  },
  {
    name: 'render_get_service_url',
    description: 'Get the public URL of a deployed Render service.',
    input_schema: {
      type: 'object',
      properties: { service_id: { type: 'string' } },
      required: ['service_id'],
    },
  },
  {
    name: 'wait_seconds',
    description: 'Wait N seconds before continuing (use while polling deploy status).',
    input_schema: {
      type: 'object',
      properties: { seconds: { type: 'number', description: 'Seconds to wait (max 30)' } },
      required: ['seconds'],
    },
  },
  {
    name: 'run_db_seed',
    description: 'Run the database seed script against a remote DATABASE_URL to populate initial menu items, admin user, and sample customer.',
    input_schema: {
      type: 'object',
      properties: { database_url: { type: 'string' } },
      required: ['database_url'],
    },
  },
  {
    name: 'log',
    description: 'Print a status message to the console so the user can follow progress.',
    input_schema: {
      type: 'object',
      properties: { message: { type: 'string' }, level: { type: 'string', enum: ['info', 'success', 'warning', 'error'] } },
      required: ['message'],
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────

async function executeTool(name, input) {
  switch (name) {

    case 'neon_list_projects': {
      const r = await neonRequest('GET', '/projects');
      return { projects: (r.data?.projects || []).map(p => ({ id: p.id, name: p.name, region: p.region_id })) };
    }

    case 'neon_create_project': {
      const r = await neonRequest('POST', '/projects', {
        project: { name: input.name, region_id: input.region_id || 'aws-us-east-2' },
      });
      if (!r.ok) return { error: `Neon error ${r.status}: ${JSON.stringify(r.data)}` };
      const proj = r.data.project;
      const conn = r.data.connection_uris?.[0]?.connection_uri;
      return { project_id: proj.id, name: proj.name, connection_string: conn };
    }

    case 'neon_get_connection_string': {
      const r = await neonRequest('GET', `/projects/${input.project_id}/connection_uri?role_name=neondb_owner&database_name=neondb`);
      if (!r.ok) return { error: `Neon error ${r.status}: ${JSON.stringify(r.data)}` };
      return { connection_string: r.data.uri };
    }

    case 'render_find_service': {
      const r = await renderRequest('GET', `/services?limit=20&name=${encodeURIComponent(input.name)}`);
      if (!r.ok) return { error: `Render error ${r.status}: ${JSON.stringify(r.data)}` };
      const services = r.data;
      const match = Array.isArray(services)
        ? services.find(s => s.service?.name?.toLowerCase().includes(input.name.toLowerCase()))
        : null;
      if (!match) return { error: `No service found matching "${input.name}"`, all: services };
      return { service_id: match.service.id, name: match.service.name, url: match.service.serviceDetails?.url };
    }

    case 'render_get_env_vars': {
      const r = await renderRequest('GET', `/services/${input.service_id}/env-vars`);
      if (!r.ok) return { error: `Render error ${r.status}: ${JSON.stringify(r.data)}` };
      return { env_vars: r.data };
    }

    case 'render_set_env_vars': {
      const r = await renderRequest('PUT', `/services/${input.service_id}/env-vars`, input.env_vars);
      if (!r.ok) return { error: `Render error ${r.status}: ${JSON.stringify(r.data)}` };
      return { success: true, updated: r.data?.length };
    }

    case 'render_trigger_deploy': {
      const r = await renderRequest('POST', `/services/${input.service_id}/deploys`, {
        clearCache: input.clear_cache ? 'clear' : 'do_not_clear',
      });
      if (!r.ok) return { error: `Render error ${r.status}: ${JSON.stringify(r.data)}` };
      return { deploy_id: r.data.id, status: r.data.status };
    }

    case 'render_get_deploy_status': {
      const r = await renderRequest('GET', `/services/${input.service_id}/deploys?limit=1`);
      if (!r.ok) return { error: `Render error ${r.status}: ${JSON.stringify(r.data)}` };
      const latest = Array.isArray(r.data) ? r.data[0]?.deploy : r.data;
      return { status: latest?.status, id: latest?.id, created: latest?.createdAt };
    }

    case 'render_get_service_url': {
      const r = await renderRequest('GET', `/services/${input.service_id}`);
      if (!r.ok) return { error: `Render error ${r.status}: ${JSON.stringify(r.data)}` };
      return { url: r.data.service?.serviceDetails?.url };
    }

    case 'wait_seconds': {
      const secs = Math.min(input.seconds, 30);
      process.stdout.write(`  ⏳ waiting ${secs}s`);
      for (let i = 0; i < secs; i++) {
        await new Promise(r => setTimeout(r, 1000));
        process.stdout.write('.');
      }
      console.log('');
      return { waited: secs };
    }

    case 'run_db_seed': {
      const { execSync } = await import('child_process');
      try {
        execSync(`DATABASE_URL="${input.database_url}" npx tsx prisma/seed.ts`, {
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 60000,
        });
        return { success: true, message: 'Seed completed: menu items, admin user, and sample customer created.' };
      } catch (e) {
        return { error: e.message?.slice(0, 300) };
      }
    }

    case 'log': {
      const icons = { info: 'ℹ', success: '✅', warning: '⚠️', error: '❌' };
      console.log(`${icons[input.level] || '→'} ${input.message}`);
      return { logged: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Agent loop ────────────────────────────────────────────────────────────

async function runAgent() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║    DriveIQ Deployment Agent  🤖          ║');
  console.log('╚══════════════════════════════════════════╝\n');

  if (!RENDER_KEY) { console.error('❌ RENDER_API_KEY is required'); process.exit(1); }
  if (!NEON_KEY)   { console.error('❌ NEON_API_KEY is required');   process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) { console.error('❌ ANTHROPIC_API_KEY is required'); process.exit(1); }

  const systemPrompt = `You are an autonomous deployment agent for DriveIQ, an AI-powered coffee shop drive-thru dashboard.

Your mission: fully deploy the DriveIQ dashboard to production by completing these steps in order:

1. Check if a Neon project named "driveiq" already exists. If yes, get its connection string. If not, create it (region: aws-us-east-2).
2. Find the Render web service named "${SERVICE_NAME}".
3. Get the current env vars from that service so you don't lose any existing ones.
4. Set ALL environment variables on the Render service, including DATABASE_URL from Neon, NEXT_PUBLIC_BASE_URL set to the service's public URL, and all others from the current set.
5. Trigger a new deployment.
6. Poll deploy status every 20 seconds until status is "live" or "failed" (max 10 attempts).
7. Once live, run the database seed against the Neon DATABASE_URL.
8. Log the final public URL and login credentials.

Use the log tool frequently to report progress. Be autonomous — don't ask for confirmation, just do it.`;

  const messages = [{ role: 'user', content: 'Deploy DriveIQ to production now. Go.' }];

  let iteration = 0;
  const MAX_ITERATIONS = 40;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

    // Add assistant response to history
    messages.push({ role: 'assistant', content: response.content });

    // Check stop reason
    if (response.stop_reason === 'end_turn') {
      console.log('\n✅ Agent completed.');
      const text = response.content.find(b => b.type === 'text');
      if (text) console.log('\n' + text.text);
      break;
    }

    if (response.stop_reason !== 'tool_use') {
      console.log('Agent stopped unexpectedly:', response.stop_reason);
      break;
    }

    // Execute all tool calls
    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      console.log(`\n🔧 ${block.name}(${JSON.stringify(block.input).slice(0, 120)})`);
      const result = await executeTool(block.name, block.input);
      console.log(`   → ${JSON.stringify(result).slice(0, 200)}`);

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  if (iteration >= MAX_ITERATIONS) {
    console.log('⚠️  Max iterations reached.');
  }
}

runAgent().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
