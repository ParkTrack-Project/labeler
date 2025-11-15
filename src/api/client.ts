import { ParkingZone, GeoPoint, PxPoint, Id } from '@/types';
import { useRequestLog } from './requestLog';

type Config = { baseUrl: string; token?: string };
let cfg: Config = { baseUrl: 'https://api.parktrack.live/api/v0' };

export const apiConfig = {
  set(baseUrl: string, token?: string) { cfg = { baseUrl, token }; },
  get() { return cfg; }
};

async function request<T>(method: 'GET'|'POST'|'PUT'|'DELETE', path: string, body?: any): Promise<T> {
  const url = `${cfg.baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;

  const id = crypto.randomUUID();
  useRequestLog.getState().add({ id, ts: Date.now(), method, url, headers, body });

  const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });

  const ct = res.headers.get('content-type') || '';
  let data: any = undefined;
  if (ct.includes('application/json')) { try { data = await res.json(); } catch {} }
  else { try { data = await res.text(); } catch {} }

  useRequestLog.getState().add({ id: id + '-resp', ts: Date.now(), method, url, status: res.status, response: data });

  if (!res.ok) { throw new Error(data?.message || data?.error || `HTTP ${res.status}`); }
  return data as T;
}

// --- helpers & mappers ---
const gp = (x:number, y:number, longitude:number|null=null, latitude:number|null=null): GeoPoint => ({ x,y,longitude,latitude });
const px = (p: GeoPoint): PxPoint => ({ x: p.x, y: p.y });

function mapZoneFromAPI(z: any): ParkingZone {
  const pts = (z.points || []).map((p: any) => gp(+p.x, +p.y, p.longitude ?? null, p.latitude ?? null)) as GeoPoint[];
  const quad = pts.slice(0,4).map(px) as [PxPoint, PxPoint, PxPoint, PxPoint];

  return {
    id: z.zone_id as Id,
    camera_id: +z.camera_id,
    zone_type: z.zone_type,
    capacity: +z.capacity,
    pay: +z.pay,
    image_quad: quad,
    points: pts.slice(0,4) as any,
    created_at: z.created_at,
    updated_at: z.updated_at
  };
}

function buildCreateZoneBody(z: ParkingZone) {
  return {
    camera_id: z.camera_id,
    zone_type: z.zone_type,
    capacity: z.capacity,
    pay: z.pay,
    points: z.points.map(p => ({
      x: p.x, y: p.y, longitude: p.longitude, latitude: p.latitude
    }))
  };
}

function buildUpdateZoneBody(z: ParkingZone) {
  return {
    zone_type: z.zone_type,
    capacity: z.capacity,
    pay: z.pay,
    points: z.points.map(p => ({
      x: p.x, y: p.y, longitude: p.longitude, latitude: p.latitude
    }))
  };
}

// --- public API ---
export const api = {
  async listZones(cameraId?: number) {
    const q = cameraId ? `?camera_id=${encodeURIComponent(cameraId)}` : '';
    const arr = await request<any[]>('GET', `/zones${q}`);
    return arr.map(mapZoneFromAPI);
  },
  async createZone(z: ParkingZone) {
    const resp = await request<any>('POST', `/zones/new`, buildCreateZoneBody(z));
    return resp; // { zone_id } или полная зона — поддерживаем оба
  },
  async updateZone(zoneId: Id, z: ParkingZone) {
    const updated = await request<any>('PUT', `/zones/${encodeURIComponent(String(zoneId))}`, buildUpdateZoneBody(z));
    return mapZoneFromAPI(updated);
  },
  async deleteZone(zoneId: Id) {
    await request<void>('DELETE', `/zones/${encodeURIComponent(String(zoneId))}`);
  },

  async getSnapshot(cameraId: number) {
    return request<{ image_url: string; captured_at?: string; width?: number; height?: number }>(
      'GET',
      `/cameras/${encodeURIComponent(cameraId)}/snapshot`
    );
  }
};
