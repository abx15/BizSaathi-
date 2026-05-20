import { create } from 'zustand';

export interface WsEvent {
  id: string;
  type: string;
  title?: string;
  message: string;
  payload?: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

interface WsState {
  connected: boolean;
  events: WsEvent[];
  setConnected: (connected: boolean) => void;
  addEvent: (event: Omit<WsEvent, 'id' | 'timestamp' | 'read'> & { id?: string; timestamp?: string }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearEvents: () => void;
}

export const useWsStore = create<WsState>((set) => ({
  connected: false,
  events: [],
  setConnected: (connected) => set({ connected }),
  addEvent: (event) => set((state) => {
    const newEvent: WsEvent = {
      id: event.id || Math.random().toString(36).substring(2, 9),
      type: event.type,
      title: event.title || "Alert",
      message: event.message,
      payload: event.payload,
      timestamp: event.timestamp || new Date().toISOString(),
      read: false,
    };
    return { events: [newEvent, ...state.events].slice(0, 100) }; // Cap at 100 historical items
  }),
  markAsRead: (id) => set((state) => ({
    events: state.events.map((e) => e.id === id ? { ...e, read: true } : e)
  })),
  markAllAsRead: () => set((state) => ({
    events: state.events.map((e) => ({ ...e, read: true }))
  })),
  clearEvents: () => set({ events: [] }),
}));
