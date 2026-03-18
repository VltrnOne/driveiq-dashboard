'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export interface DetectionEvent {
  type: 'detection' | 'order_update' | 'ping' | 'connected';
  sessionId?: string;
  detectedPlate?: string;
  customerId?: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
    photoUrl?: string;
    rewardPoints: number;
    tier: string;
    preferences?: string[];
    allergies?: string[];
    notes?: string;
    visitCount: number;
    qrToken: string;
  };
  confidence?: number;
  method?: string;
  orderId?: string;
  status?: string;
  ts?: number;
}

export function useDetectionStream(token?: string) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [latest, setLatest] = useState<DetectionEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/ws/operators${token ? `?token=${token}` : ''}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => { setConnected(true); };
    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        const event: DetectionEvent = JSON.parse(e.data);
        if (event.type === 'ping') { ws.send(JSON.stringify({ type: 'pong' })); return; }
        if (event.type === 'connected') return;
        setEvents(prev => [event, ...prev].slice(0, 50));
        if (event.type === 'detection') setLatest(event);
      } catch { /* ignore bad frames */ }
    };
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const dismiss = useCallback(() => setLatest(null), []);

  return { connected, events, latest, dismiss };
}
