import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useWsStore } from '@/store/ws.store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const { accessToken, isAuthenticated } = useAuthStore();
  const { setConnected, addEvent } = useWsStore();

  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Connect to v1/ws endpoint through the Kong Gateway
    const ws = new WebSocket(`${WS_URL}/v1/ws?token=${accessToken}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return;
        addEvent(data);
      } catch (err) {
        // Safe try-catch as per Rule 7: WS errors must not crash the app
        console.error("WS event parse error:", err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Exponential backoff: 1s → 2s → 4s → max 30s
      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
      reconnectAttemptsRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

    // Heartbeat ping every 30s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [accessToken, isAuthenticated, setConnected, addEvent]);

  useEffect(() => {
    let cleanupPing: (() => void) | undefined;
    
    if (isAuthenticated && accessToken) {
      cleanupPing = connect();
    }

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (cleanupPing) cleanupPing();
      wsRef.current?.close();
    };
  }, [connect, isAuthenticated, accessToken]);
}
