'use client';

import { ReactNode } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';

export function WsProvider({ children }: { children: ReactNode }) {
  useWebSocket();
  return <>{children}</>;
}
