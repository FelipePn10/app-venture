#!/usr/bin/env node
/** Smoke autenticado das rotas consumidas por VNOT0100 e VEST0500. */
const API = (process.env.API_URL ?? 'http://127.0.0.1:5073').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'instrutor@venturerp.training';
const PASSWORD = process.env.PASSWORD ?? '';
const RUN_WRITES = process.env.RUN_WRITES === '1';
let token = '';
let passed = 0;
let failed = 0;

async function call(method, path, body, expected = [200]) {
  if (!RUN_WRITES && method !== 'GET' && path !== '/users/login') return { skipped: true };
  const response = await fetch(`${API}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* corpo não JSON */ }
  const ok = expected.includes(response.status); ok ? passed++ : failed++;
  console.log(`${ok ? '✓' : '✗'} ${method.padEnd(6)} ${path.padEnd(52)} ${response.status}${ok ? '' : ` ${text.slice(0, 140)}`}`);
  return { status: response.status, json, ok };
}

const login = await call('POST', '/users/login', { email: EMAIL, password: PASSWORD }, [200]);
token = login.json?.token ?? '';
if (!token) throw new Error('Login não retornou token.');

const events = await call('GET', '/api/notifications/events');
await call('GET', '/api/notifications/recipients/users');
await call('GET', '/api/notifications/recipients/departments');
const settings = await call('GET', '/api/notifications/settings');
await call('GET', '/api/notifications/subscriptions');
await call('GET', '/api/notifications/alerts?limit=5&offset=0');
await call('GET', '/api/notifications/deliveries?limit=5&offset=0');
await call('GET', '/api/notifications/dead-letters?limit=5&offset=0');
const existingCounts = await call('GET', '/api/stock/cycle-counts/?limit=100&offset=0');
const existingRows = Array.isArray(existingCounts.json) ? existingCounts.json : existingCounts.json?.data ?? [];
const automatic = existingRows.find((count) => count.origin === 'POLITICA_ITEM');
if (automatic && Number(automatic.policy_days) > 0) {
  passed++; console.log(`✓ contrato ocorrência automática                           origin=POLITICA_ITEM policy_days=${automatic.policy_days}`);
} else {
  failed++; console.log('✗ contrato ocorrência automática sem origin/policy_days válido');
}

if (RUN_WRITES && settings.json) await call('PUT', '/api/notifications/settings', settings.json, [204]);
if (RUN_WRITES && events.json?.[0]) {
  const event = events.json.find((item) => item.producer_status === 'ATIVO');
  if (!event) throw new Error('Catálogo não contém produtor ATIVO.');
  const created = await call('POST', '/api/notifications/subscriptions', { event_key: event.event_key, event_version: event.version, enabled: false, cadence: event.allowed_cadences[0], thresholds: {}, recipients: [{ recipient_type: 'PAPEL', recipient_key: 'ADMIN' }] }, [201]);
  if (created.json?.id) await call('DELETE', `/api/notifications/subscriptions/${created.json.id}`, undefined, [204]);
}

if (RUN_WRITES) {
  const items = await call('GET', '/api/items/');
  const warehouses = await call('GET', '/api/warehouse/list');
  const itemRows = Array.isArray(items.json) ? items.json : items.json?.data ?? [];
  const warehouseRows = Array.isArray(warehouses.json) ? warehouses.json : warehouses.json?.data ?? [];
  const itemCode = itemRows.find((item) => String(item.code ?? '').trim())?.code;
  const warehouseID = warehouseRows.find((warehouse) => Number(warehouse.id ?? warehouse.ID) > 0)?.id ?? warehouseRows[0]?.ID;
  if (itemCode && warehouseID) {
    const created = await call('POST', '/api/stock/cycle-counts/', { warehouse_id: Number(warehouseID), item_code: String(itemCode), mask: '', lot_code: '', scheduled_for: new Date(Date.now() + 86400000).toISOString() }, [201]);
    if (created.json?.id) {
      if (created.json.origin === 'MANUAL' && created.json.policy_days == null) {
        passed++; console.log('✓ contrato ocorrência manual                               origin=MANUAL sem policy_days');
      } else {
        failed++; console.log(`✗ contrato ocorrência manual inválido: ${JSON.stringify({ origin: created.json.origin, policy_days: created.json.policy_days })}`);
      }
      await call('POST', `/api/stock/cycle-counts/${created.json.id}/transition`, { state: 'EM_CONTAGEM', reason: 'Smoke E2E' }, [200]);
      await call('POST', `/api/stock/cycle-counts/${created.json.id}/transition`, { state: 'CANCELADA', reason: 'Encerramento da fixture E2E' }, [200]);
    }
  } else { failed++; console.log('✗ fixture de item/almoxarifado não disponível para contagem'); }
}

console.log(`\n${passed} verificações passaram; ${failed} falharam.`);
if (failed) process.exitCode = 1;
