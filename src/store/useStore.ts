import { create } from 'zustand';
import {
  ImageMeta,
  ParkingZone,
  PxPoint,
  ToolMode,
  GeoPoint,
  Id
} from '@/types';
import { clockwiseSort } from '@/geometry/poly';
import { api } from '@/api/client';

let tmpZoneId = -1;

// Утилита: PxPoint -> GeoPoint (geo пока null)
const toGeo = (p: PxPoint): GeoPoint => ({ x: p.x, y: p.y, longitude: null, latitude: null });

type State = {
  apiBase: string;
  token?: string;
  cameraId: string;
  image?: ImageMeta;

  tool: ToolMode;
  zones: ParkingZone[];
  activeZoneId?: Id;

  // Черновик рисуемой зоны (4 точки)
  zoneDraft: PxPoint[] | null;

  scale: number;
  offsetX: number;
  offsetY: number;

  loading: boolean;
  error?: string;
  info?: string;

  setApi(base: string, token?: string): void;
  setCamera(id: string): void;
  setImage(img: ImageMeta | undefined): void;

  setTool(t: ToolMode): void;
  setView(scale: number, offsetX: number, offsetY: number): void;

  selectZone(id?: Id): void;

  loadZones(): Promise<void>;

  addZone(): void; // теперь: переводит в drawZone и чистит драфт
  createZoneFromDraft(): void; // внутренняя: завершение драфта -> добавление зоны

  updateZone(id: Id, patch: Partial<ParkingZone>): void;
  ensureZoneClockwise(id: Id): void;
  removeZone(id: Id): Promise<void>;
  saveZone(id: Id): Promise<void>;

  // Рисование зоны
  zoneDraftAddPoint(p: PxPoint): void;
  zoneDraftClear(): void;
};

export const useStore = create<State>((set, get) => ({
  apiBase: 'https://api.parktrack.live/api/v0',
  cameraId: '',
  tool: 'select',
  zones: [],
  zoneDraft: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  loading: false,

  setApi(base, token) { set({ apiBase: base, token }); },
  setCamera(id) { set({ cameraId: id }); },
  setImage(img) { set({ image: img }); },

  setTool(t) { set({ tool: t }); },
  setView(scale, offsetX, offsetY) { set({ scale, offsetX, offsetY }); },

  selectZone(id) { set({ activeZoneId: id }); },

  async loadZones() {
    set({ loading: true, error: undefined });
    try {
      const cid = get().cameraId ? parseInt(get().cameraId, 10) : undefined;
      const zones = await api.listZones(cid);

      if (zones.length === 0) {
        tmpZoneId = -1;
      }

      set({ zones });
    } catch (e: any) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },


  // Теперь "Добавить зону" = включить drawZone
  addZone() {
    set({ tool: 'drawZone', zoneDraft: [] });
  },

  // Завершение черновика: создаём зону из ровно 4 точек, выбираем ее, tool -> select
  createZoneFromDraft() {
    const draft = get().zoneDraft;
    if (!draft || draft.length !== 4) return;

    const { cameraId, zones } = get();
    const cid = parseInt(cameraId || '0', 10) || 0;

    // Сортируем точки по часовой
    const quad = clockwiseSort(draft as [PxPoint, PxPoint, PxPoint, PxPoint]) as [PxPoint, PxPoint, PxPoint, PxPoint];

    const z: ParkingZone = {
      id: tmpZoneId--,
      camera_id: cid,
      zone_type: 'standard',
      capacity: 0,
      pay: 0,
      image_quad: quad,
      points: quad.map(toGeo) as any
    };

    set({
      zones: [...zones, z],
      activeZoneId: z.id,
      tool: 'select',
      zoneDraft: null
    });
  },

  updateZone(id, patch) {
    set((s) => ({ zones: s.zones.map(z => String(z.id) === String(id) ? { ...z, ...patch } : z) }));
  },

  ensureZoneClockwise(id) {
    const z = get().zones.find(z => String(z.id) === String(id));
    if (!z) return;
    const sorted = clockwiseSort(z.image_quad);
    if (sorted) {
      const newPoints = z.points.map((pt, i) => ({ ...pt, x: sorted[i].x, y: sorted[i].y })) as any;
      get().updateZone(id, { image_quad: sorted, points: newPoints });
    }
  },

  async removeZone(id) {
    set({ loading: true });
    try {
      const isPersisted = (typeof id === 'number' && id > 0) || typeof id === 'string';
      if (isPersisted) await api.deleteZone(id);

      set((s) => {
        const nextZones = s.zones.filter(z => String(z.id) !== String(id));

        // ⬇️ если не осталось зон — сбрасываем временный счётчик
        if (nextZones.length === 0) {
          tmpZoneId = -1;
        }

        return {
          zones: nextZones,
          activeZoneId: String(s.activeZoneId) === String(id) ? undefined : s.activeZoneId
        };
      });
    } finally {
      set({ loading: false });
    }
  },

  async saveZone(id) {
    const current = get().zones.find(z => String(z.id) === String(id));
    if (!current) return;
    get().ensureZoneClockwise(id);

    set({ loading: true, info: undefined, error: undefined });
    try {
      const existed = (typeof id === 'number' && id > 0) || typeof id === 'string';

      if (existed) {
        const updated = await api.updateZone(id, current);
        set((s) => ({
          zones: s.zones.map(zz => String(zz.id) === String(id) ? { ...updated } : zz),
          info: 'zone-updated'
        }));
      } else {
        const resp = await api.createZone(current);
        const zone_id: Id = resp?.zone_id ?? resp?.id ?? resp;
        set((s) => ({
          zones: s.zones.map(zz => String(zz.id) === String(id) ? { ...current, id: zone_id } : zz),
          activeZoneId: zone_id,
          info: 'zone-created'
        }));
      }
    } catch (e: any) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },

  // ---- Рисование зоны ----
  zoneDraftAddPoint(p) {
    const cur = get().zoneDraft ?? [];
    const next = [...cur, p];
    if (next.length < 4) {
      set({ zoneDraft: next });
    } else if (next.length === 4) {
      set({ zoneDraft: next });
      // автоматическое завершение
      get().createZoneFromDraft();
    } else {
      // игнорируем клики после 4-й точки
    }
  },
  zoneDraftClear() { set({ zoneDraft: null, tool: 'select' }); }
}));
