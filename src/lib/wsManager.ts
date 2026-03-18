// Server-side WebSocket client registry
// Stored on globalThis to survive Next.js hot reloads in dev

import type { WebSocket } from 'ws';

interface GlobalWithWS {
  _driveiqClients?: Set<WebSocket>;
}

const g = globalThis as GlobalWithWS;
if (!g._driveiqClients) g._driveiqClients = new Set();

export function addClient(ws: WebSocket) {
  g._driveiqClients!.add(ws);
}

export function removeClient(ws: WebSocket) {
  g._driveiqClients!.delete(ws);
}

export function broadcast(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const dead: WebSocket[] = [];
  for (const client of g._driveiqClients!) {
    try {
      if (client.readyState === 1 /* OPEN */) {
        client.send(payload);
      } else {
        dead.push(client);
      }
    } catch {
      dead.push(client);
    }
  }
  dead.forEach(c => g._driveiqClients!.delete(c));
}

export function clientCount(): number {
  return g._driveiqClients!.size;
}
