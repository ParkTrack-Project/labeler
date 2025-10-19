import { create } from 'zustand';

export type RequestEntry = {
  id: string;
  ts: number;
  method: 'GET'|'POST'|'PUT'|'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  status?: number;
  response?: any;
};

type LogState = {
  entries: RequestEntry[];
  add: (e: RequestEntry) => void;
  clear: () => void;
};

export const useRequestLog = create<LogState>((set) => ({
  entries: [],
  add: (e) => set((s) => ({ entries: [e, ...s.entries].slice(0, 200) })),
  clear: () => set({ entries: [] })
}));
