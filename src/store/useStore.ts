import { create } from 'zustand';
import {
  ImageMeta,
  ParkingLot,
  ParkingZone,
  PxPoint,
  ToolMode,
  GeoPoint,
  Id
} from '@/types';
import { clockwiseSort } from '@/geometry/poly';
import { api } from '@/api/client';
import { genLotId } from '@/utils/id';

let tmpZoneId = -1;
const toGeo = (p: PxPoint): GeoPoint => ({ x: p.x, y: p.y, long: null, lat: null });

type State = {
  apiBase: string;
  token?: string;
  cameraId: string;
  image?: ImageMeta;

  tool: ToolMode;
  zones: ParkingZone[];
  activeZoneId?: Id;
  activeLotId?: string;

  // можно оставить для совместимости, если на сервере есть отдельный GET lots
  lotsLoaded: Record<string, boolean>;

  lotDraft: PxPoint[] | null;

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

  selectZone(id?: Id): Promise<void>;
  selectLot(id?: string): void;

  loadZones(): Promise<void>;
  loadLotsOfZone(zoneId: Id): Promise<void>;

  addZone(initial?: Partial<ParkingZone>): ParkingZone;
  updateZone(id: Id, patch: Partial<ParkingZone>): void;
  ensureZoneClockwise(id: Id): void;
  removeZone(id: Id): Promise<void>;
  saveZone(id: Id): Promise<void>;

  addLot(zoneId: Id, poly: PxPoint[]): ParkingLot | null;
  updateLot(zoneId: Id, lotId: string, patch: Partial<ParkingLot>): void;
  removeLot(zoneId: Id, lotId: string): void;

  lotDraftAddPoint(p: PxPoint): void;
  lotDraftClear(): void;
  lotDraftComplete(): void;
};

export const useStore = create<State>((set, get) => ({
  apiBase: 'https://api.parktrack.live/api/v0',
  cameraId: '',
  tool: 'select',
  zones: [],
  lotsLoaded: {},
  lotDraft: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  loading: false,

  setApi(base, token) { set({ apiBase: base, token }); },
  setCamera(id) { set({ cameraId: id }); },
  setImage(img) { set({ image: img }); },

  setTool(t) { set({ tool: t }); },
  setView(scale, offsetX, offsetY) { set({ scale, offsetX, offsetY }); },

  async selectZone(id) {
    set({ activeZoneId: id, activeLotId: undefined, lotDraft: null });
    if (!id) return;

    // Если сервер начнёт возвращать lots внутри Zone, этот блок можно вырубить.
    const key = String(id);
    if (get().lotsLoaded[key]) return;
    await get().loadLotsOfZone(id);
  },

  selectLot(id) { set({ activeLotId: id }); },

  async loadZones() {
    set({ loading: true, error: undefined });
    try {
      const cid = get().cameraId ? parseInt(get().cameraId, 10) : undefined;
      const zones = await api.listZones(cid);
      set({ zones });
    } catch (e: any) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },

  async loadLotsOfZone(zoneId) {
    try {
      const lots = await api.getLots(zoneId);
      set((s) => ({
        zones: s.zones.map(z => String(z.id) === String(zoneId) ? { ...z, lots } : z),
        lotsLoaded: { ...s.lotsLoaded, [String(zoneId)]: true }
      }));
    } catch (e: any) {
      // если на сервере нет отдельного эндпоинта — просто игнорируем
      set({ error: String(e) });
    }
  },

  addZone(initial) {
    const { cameraId, zones } = get();
    const cid = parseInt(cameraId || '0', 10) || 0;

    const defaultQuad: [PxPoint, PxPoint, PxPoint, PxPoint] = [
      { x: 10, y: 10 }, { x: 140, y: 10 }, { x: 140, y: 90 }, { x: 10, y: 90 }
    ];
    const quad = (initial?.image_quad as any) ?? defaultQuad;

    const z: ParkingZone = {
      id: tmpZoneId--,
      camera_id: cid,
      zone_type: (initial?.zone_type as any) ?? 'standard',
      capacity: initial?.capacity ?? 0,
      pay: initial?.pay ?? 0,
      image_quad: quad,
      points: quad.map(toGeo) as any,
      lots: [],
      lots_count: 0
    };

    set({ zones: [...zones, z], activeZoneId: z.id, tool: 'editZone' });
    return z;
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
      set((s) => ({
        zones: s.zones.filter(z => String(z.id) !== String(id)),
        activeZoneId: String(s.activeZoneId) === String(id) ? undefined : s.activeZoneId,
        activeLotId: undefined,
        lotDraft: null
      }));
    } finally {
      set({ loading: false });
    }
  },

  // ЕДИНЫЙ запрос: POST/PUT зоны С ЛОТАМИ В ТЕЛЕ
  async saveZone(id) {
    const current = get().zones.find(z => String(z.id) === String(id));
    if (!current) return;

    // Обновим порядок вершин и синхронизацию points.x/y
    get().ensureZoneClockwise(id);

    set({ loading: true, info: undefined, error: undefined });
    try {
      let savedZone: ParkingZone = current;
      const existed = (typeof id === 'number' && id > 0) || typeof id === 'string';

      if (existed) {
        // PUT /zones/{id} — в теле уже есть lots
        const updated = await api.updateZone(id, current);
        // Если сервер не возвращает lots внутри зоны — сохраним локальные
        savedZone = { ...updated, lots: current.lots };
        set((s) => ({
          zones: s.zones.map(zz => String(zz.id) === String(id) ? savedZone : zz),
          info: 'zone-updated'
        }));
      } else {
        // POST /zones/new — в теле уже есть lots
        const resp = await api.createZone(current);
        const zone_id: Id = resp?.zone_id ?? resp?.id ?? resp; // подстрахуемся под разные ответы
        savedZone = { ...current, id: zone_id };
        set((s) => ({
          zones: s.zones.map(zz => String(zz.id) === String(id) ? { ...savedZone } : zz),
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

  addLot(zoneId, poly) {
    const s = get();
    const zone = s.zones.find(z => String(z.id) === String(zoneId));
    if (!zone) return null;

    const lot: ParkingLot = {
      lot_id: genLotId(String(zoneId)),
      image_polygon: poly,
      points: poly.map(toGeo),
      long: null,
      lat: null
    };

    set({
      zones: s.zones.map(z => String(z.id) === String(zoneId) ? { ...z, lots: [...z.lots, lot] } : z),
      activeLotId: String(lot.lot_id),
      tool: 'editLot',
      lotDraft: null
    });
    return lot;
  },

  updateLot(zoneId, lotId, patch) {
    set((s) => ({
      zones: s.zones.map(z => String(z.id) === String(zoneId)
        ? {
            ...z,
            lots: z.lots.map(lot => {
              if (String(lot.lot_id) !== String(lotId)) return lot;
              const next = { ...lot, ...patch } as ParkingLot;
              if (patch.image_polygon) {
                next.points = patch.image_polygon.map(toGeo);
              }
              return next;
            })
          }
        : z)
    }));
  },

  removeLot(zoneId, lotId) {
    set((s) => ({
      zones: s.zones.map(z => String(z.id) === String(zoneId)
        ? { ...z, lots: z.lots.filter(lot => String(lot.lot_id) !== String(lotId)) }
        : z),
      activeLotId: undefined
    }));
  },

  lotDraftAddPoint(p) {
    const cur = get().lotDraft ?? [];
    set({ lotDraft: [...cur, p] });
  },
  lotDraftClear() { set({ lotDraft: null }); },
  lotDraftComplete() {
    const { lotDraft, activeZoneId, addLot } = get();
    if (!activeZoneId || !lotDraft || lotDraft.length < 3) return;
    addLot(activeZoneId, lotDraft);
  }
}));
