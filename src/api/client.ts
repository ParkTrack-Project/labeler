import { ParkingZone } from '@/types';
import { useRequestLog } from './requestLog';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Config = {
  baseUrl: string;
  token?: string;
};

let cfg: Config = { baseUrl: 'https://parktrack-api.nawinds.dev/api/v0' }; // NEW default

export const apiConfig = {
  set(baseUrl: string, token?: string) { cfg = { baseUrl, token }; },
  get() { return cfg; }
};

// универсальный запрос + лог
async function request<T>(method: 'GET'|'POST'|'PUT'|'DELETE', path: string, body?: any): Promise<T> {
  const url = `${cfg.baseUrl}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;

  const id = crypto.randomUUID();
  useRequestLog.getState().add({ id, ts: Date.now(), method, url, headers, body });

  await sleep(250);

  // Моки для работы «в одиночку»
  let response: any = { ok: true };

  if (method === 'GET' && path.startsWith('/zones')) {
    // пусто, пока API не готов
    response = [];
  }
  if (method === 'POST' && path === '/zones') {
    response = { ...body, id: body.id ?? crypto.randomUUID(), created_at: new Date().toISOString() };
  }
  if (method === 'PUT' && path.startsWith('/zones/')) {
    response = { ...body, updated_at: new Date().toISOString() };
  }
  if (method === 'DELETE') {
    response = { ok: true };
  }
  if (method === 'GET' && path.startsWith('/cameras/') && path.endsWith('/snapshot')) {
    // Вернём «какую-то» ссылку; подмените, когда появится реальный API.
    response = { image_url: '/sample.jpg' };
  }

  useRequestLog.getState().add({
    id: id + '-resp', ts: Date.now(), method, url, status: 200, response
  });

  return response as T;
}

export const api = {
  async listZones(cameraId: string) {
    return request<ParkingZone[]>('GET', `/zones?camera_id=${encodeURIComponent(cameraId)}`);
  },
  async createZone(z: Omit<ParkingZone, 'id'|'created_at'|'updated_at'>) {
    return request<ParkingZone>('POST', `/zones`, z);
  },
  async updateZone(zoneId: string, z: ParkingZone) {
    return request<ParkingZone>('PUT', `/zones/${encodeURIComponent(zoneId)}`, z);
  },
  async deleteZone(zoneId: string) {
    return request<{ok: boolean}>('DELETE', `/zones/${encodeURIComponent(zoneId)}`);
  },
  // NEW: загрузка snapshot по cameraId
  async getCameraSnapshotUrl(cameraId: string) {
    return request<{ image_url: string }>('GET', `/cameras/${encodeURIComponent(cameraId)}/snapshot`);
  }
};
