#!/usr/bin/env node
/**
 * DriveIQ Deployment Agent
 * Uses Render API only — provisions PostgreSQL, sets env vars, deploys, seeds.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-xxx \
 *   RENDER_API_KEY=rnd_xxx \
 *   node scripts/deploy-agent.mjs
 *
 * Get your Render API key: dashboard.render.com → Account Settings → API Keys
 */

import Anthropic from '@anthropic-ai/sdk';

const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const RENDER_API = 'https://api.render.com/v1';
const RENDER_KEY = process.env.RENDER_API_KEY;

// ─── HTTP helper ───────────────────────────────────────────────────────────

async function render(method, path, body) {
  const res = await fetch(`${RENDER_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${RENDER_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// ─── Tools ────────────────────────────────────────────────────────────────

const tools = [
  {
    name: 'render_list_services',
    description: 'List all Render web services on this account.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'render_get_service',
    description: 'Get details (ID, URL, status) of a Render web service by name.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'render_list_postgres',
    description: 'List all Render PostgreSQL databases on this account.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'render_create_postgres',
    description: 'Create a new Render PostgreSQL database.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'e.g. driveiq-db' },
        plan: { type: 'string', description: 'free or starter. Use free.' },
        region: { type: 'string', description: 'e.g. oregon' },
        version: { type: 'string', description: 'PostgreSQL major version, e.g. 16' },
      },
      required: ['name'],
    },
  },
  {
    name: 'render_get_postgres_connection',
    description: 'Get the internal and external connection strings for a Render PostgreSQL database.',
    input_schema: {
      type: 'object',
      properties: { postgres_id: { type: 'string' } },
      required: ['postgres_id'],
    },
  },
  {
    name: 'render_get_env_vars',
    description: 'Get all current environment variables for a Render web service.',
    input_schema: {
      type: 'object',
      properties: { service_id: { type: 'string' } },
      required: ['service_id'],
    },
  },
  {
    name: 'render_set_env_vars',
    description: 'Replace all environment variables on a Render web service. Pass the COMPLETE list — anything omitted will be deleted.',
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
        },
      },
      required: ['service_id', 'env_vars'],
    },
  },
  {
    name: 'render_deploy',
    description: 'Trigger a new deployment on a Render web service.',
    input_schema: {
      type: 'object',
      properties: {
        service_id: { type: 'string' },
        clear_cache: { type: 'boolean' },
      },
      required: ['service_id'],
    },
  },
  {
    name: 'render_deploy_status',
    description: 'Get the status of the latest deployment (live | build_failed | deactivated | etc).',
    input_schema: {
      type: 'object',
      properties: { service_id: { type: 'string' } },
      required: ['service_id'],
    },
  },
  {
    name: 'render_deploy_logs',
    description: 'Get the last N lines of deploy logs to diagnose build failures.',
    input_schema: {
      type: 'object',
      properties: {
        deploy_id: { type: 'string' },
        service_id: { type: 'string' },
      },
      required: ['service_id'],
    },
  },
  {
    name: 'seed_database',
    description: 'Run the Prisma seed script against a remote PostgreSQL DATABASE_URL. Populates menu items, admin user, and sample customer.',
    input_schema: {
      type: 'object',
      properties: { database_url: { type: 'string' } },
      required: ['database_url'],
    },
  },
  {
    name: 'wait',
    description: 'Pause for N seconds (max 30) while waiting for async operations.',
    input_schema: {
      type: 'object',
      properties: { seconds: { type: 'number' } },
      required: ['seconds'],
    },
  },
  {
    name: 'log',
    description: 'Print a progress message.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        level: { type: 'string', enum: ['info', 'success', 'warn', 'error'] },
      },
      required: ['message', 'level'],
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────

async function run(name, input) {
  switch (name) {

    case 'render_list_services': {
      const r = await render('GET', '/services?type=web_service&limit=20');
      if (!r.ok) return { error: r.data };
      return { services: (r.data || []).map(s => ({ id: s.service?.id, name: s.service?.name, url: s.service?.serviceDetails?.url, status: s.service?.suspended })) };
    }

    case 'render_get_service': {
      const r = await render('GET', `/services?type=web_service&limit=20&name=${encodeURIComponent(input.name)}`);
      if (!r.ok) return { error: r.data };
      const all = Array.isArray(r.data) ? r.data : [];
      const match = all.find(s => s.service?.name?.toLowerCase().includes(input.name.toLowerCase()));
      if (!match) return { error: `No service found matching "${input.name}"`, available: all.map(s => s.service?.name) };
      const svc = match.service;
      return { service_id: svc.id, name: svc.name, url: svc.serviceDetails?.url, status: svc.suspended };
    }

    case 'render_list_postgres': {
      const r = await render('GET', '/postgres?limit=20');
      if (!r.ok) return { error: r.data };
      return { databases: (r.data || []).map(d => ({ id: d.postgres?.id, name: d.postgres?.name, status: d.postgres?.status })) };
    }

    case 'render_create_postgres': {
      const r = await render('POST', '/postgres', {
        name: input.name,
        plan: input.plan || 'free',
        region: input.region || 'oregon',
        version: input.version || '16',
        enableHighAvailability: false,
      });
      if (!r.ok) return { error: r.data };
      return { postgres_id: r.data.id, name: r.data.name, status: r.data.status };
    }

    case 'render_get_postgres_connection': {
      const r = await render('GET', `/postgres/${input.postgres_id}`);
      if (!r.ok) return { error: r.data };
      const db = r.data;
      return {
        postgres_id: db.id,
        status: db.status,
        internal_connection_string: db.connectionInfo?.internalConnectionString,
        external_connection_string: db.connectionInfo?.externalConnectionString,
        psql_command: db.connectionInfo?.psqlCommand,
      };
    }

    case 'render_get_env_vars': {
      const r = await render('GET', `/services/${input.service_id}/env-vars`);
      if (!r.ok) return { error: r.data };
      return { env_vars: r.data };
    }

    case 'render_set_env_vars': {
      const r = await render('PUT', `/services/${input.service_id}/env-vars`, input.env_vars);
      if (!r.ok) return { error: r.data };
      return { success: true, count: Array.isArray(r.data) ? r.data.length : '?' };
    }

    case 'render_deploy': {
      const r = await render('POST', `/services/${input.service_id}/deploys`, {
        clearCache: input.clear_cache ? 'clear' : 'do_not_clear',
      });
      if (!r.ok) return { error: r.data };
      return { deploy_id: r.data.id, status: r.data.status };
    }

    case 'render_deploy_status': {
      const r = await render('GET', `/services/${input.service_id}/deploys?limit=1`);
      if (!r.ok) return { error: r.data };
      const d = Array.isArray(r.data) ? r.data[0]?.deploy : r.data;
      return { deploy_id: d?.id, status: d?.status, created: d?.createdAt, finished: d?.finishedAt };
    }

    case 'render_deploy_logs': {
      // Get latest deploy ID first
      const deploys = await render('GET', `/services/${input.service_id}/deploys?limit=1`);
      const deployId = deploys.data?.[0]?.deploy?.id || input.deploy_id;
      if (!deployId) return { error: 'No deploy ID found' };
      const r = await render('GET', `/services/${input.service_id}/deploys/${deployId}/logs?limit=50`);
      if (!r.ok) return { error: r.data };
      const lines = (r.data || []).map(l => l.message).slice(-30);
      return { logs: lines };
    }

    case 'seed_database': {
      const { execSync } = await import('child_process');
      try {
        execSync(`DATABASE_URL="${input.database_url}" npx tsx prisma/seed.ts`, {
          cwd: process.cwd(), stdio: 'pipe', timeout: 90000,
        });
        return { success: true };
      } catch (e) {
        const msg = (e.stdout?.toString() || '') + (e.stderr?.toString() || '') + e.message;
        return { error: msg.slice(0, 500) };
      }
    }

    case 'wait': {
      const secs = Math.min(input.seconds, 30);
      process.stdout.write(`  ⏳ ${secs}s`);
      for (let i = 0; i < secs; i++) {
        await new Promise(r => setTimeout(r, 1000));
        process.stdout.write('.');
      }
      console.log(' done');
      return { ok: true };
    }

    case 'log': {
      const icon = { info: 'ℹ️ ', success: '✅', warn: '⚠️ ', error: '❌' }[input.level] || '→';
      console.log(`\n${icon}  ${input.message}`);
      return { ok: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Agent loop ────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   DriveIQ Deployment Agent  🚀            ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  if (!RENDER_KEY)                    { console.error('❌  RENDER_API_KEY missing');    process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) { console.error('❌  ANTHROPIC_API_KEY missing'); process.exit(1); }

  const system = `You are an autonomous deployment agent for DriveIQ.

Your job is to fully deploy the DriveIQ dashboard using Render only (no external DB services).

Complete these steps in order:

1. Find the Render web service named "driveiq-dashboard" — get its service ID and URL.
2. List existing Render PostgreSQL databases. If one named "driveiq-db" exists reuse it; otherwise create it (plan: free, region: oregon, version: 16).
3. Wait up to 3 minutes for the database status to become "available" (poll every 20s).
4. Get the database connection strings (use externalConnectionString for DATABASE_URL since we're seeding from outside Render's network; use internalConnectionString in the env vars so the web service uses the internal fast connection).
5. Get the current env vars from the web service so you don't lose any.
6. Set ALL env vars on the web service. Include every existing var plus:
   - DATABASE_URL = internalConnectionString
   - NEXT_PUBLIC_BASE_URL = https://<service-url>
   Keep JWT_SECRET and WEBHOOK_SECRET if they already exist (generateValue), otherwise leave them for Render to manage.
7. Trigger a new deployment.
8. Poll deploy status every 25s until status is "live" or "build_failed" (max 12 polls).
   If build_failed, fetch deploy logs and report what went wrong.
9. If live, seed the database using the externalConnectionString.
10. Log the final URL and credentials: admin@driveiq.local / driveiq-admin-2024.

Use the log tool at every major step. Be fully autonomous — do not ask for confirmation.`;

  const messages = [{ role: 'user', content: 'Deploy DriveIQ to production now.' }];
  let turns = 0;

  while (turns++ < 50) {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason === 'end_turn') {
      const text = resp.content.find(b => b.type === 'text');
      if (text) console.log('\n' + text.text);
      console.log('\n✅ Agent finished.\n');
      break;
    }

    if (resp.stop_reason !== 'tool_use') {
      console.log('Stopped:', resp.stop_reason);
      break;
    }

    const results = [];
    for (const block of resp.content) {
      if (block.type !== 'tool_use') continue;
      const preview = JSON.stringify(block.input).slice(0, 100);
      console.log(`\n🔧 ${block.name}  ${preview}`);
      const result = await run(block.name, block.input);
      const rPreview = JSON.stringify(result).slice(0, 200);
      console.log(`   ↳ ${rPreview}`);
      results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
    }

    messages.push({ role: 'user', content: results });
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
