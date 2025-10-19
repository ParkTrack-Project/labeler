import { create } from 'zustand';
import { ImageMeta, ParkingLot, ParkingZone, PxPoint, ToolMode } from '@/types';
import { clockwiseSort } from '@/geometry/poly';
import { api } from '@/api/client';
import { genZoneId, genLotId } from '@/utils/id';

type State = {
  apiBase: string;
  token?: string;

  cameraId: string;
  image?: ImageMeta;

  tool: ToolMode;
  zones: ParkingZone[];
  activeZoneId?: string;
  activeLotId?: string;

  // черновик рисуемого лота (для кнопки «Завершить лот»)
  lotDraft: PxPoint[] | null;

  // view transform
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

  selectZone(id?: string): void;
  selectLot(id?: string): void;

  loadZones(): Promise<void>;
  addZone(initial?: Partial<ParkingZone>): ParkingZone;
  updateZone(id: string, patch: Partial<ParkingZone>): void;
  ensureZoneClockwise(id: string): void;
  removeZone(id: string): Promise<void>;
  saveZone(id: string): Promise<void>;

  // lots
  addLot(zoneId: string, poly: PxPoint[]): ParkingLot | null;
  updateLot(zoneId: string, lotId: string, patch: Partial<ParkingLot>): void;
  removeLot(zoneId: string, lotId: string): void;

  // draft helpers
  lotDraftAddPoint(p: PxPoint): void;
  lotDraftClear(): void;
  lotDraftComplete(): void;
};

export const useStore = create<State>((set, get) => ({
  apiBase: 'https://parktrack-api.nawinds.dev/api/v0', // NEW default
  cameraId: '',
  tool: 'select',
  zones: [],
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

  selectZone(id) { set({ activeZoneId: id, activeLotId: undefined, lotDraft: null }); },
  selectLot(id) { set({ activeLotId: id }); },

  async loadZones() {
    const { cameraId } = get();
    if (!cameraId) return;
    set({ loading: true, error: undefined });
    try {
      const zones = await api.listZones(cameraId);
      set({ zones });
    } catch (e: any) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },

  addZone(initial) {
    const { cameraId, zones } = get();
    const id = genZoneId();
    const baseQuad = [{x:10,y:10},{x:120,y:10},{x:120,y:80},{x:10,y:80}] as any;
    const z: ParkingZone = {
      id,
      camera_id: cameraId || 'dev-camera',
      name: initial?.name ?? `Zone ${zones.length+1}`,
      zone_type: initial?.zone_type ?? 'standard',
      capacity: initial?.capacity ?? 0, // NEW: по умолчанию 0 (и будет = lots.length)
      pay: initial?.pay ?? 0,           // NEW
      image_quad: (initial?.image_quad as any) ?? baseQuad,
      lots: initial?.lots ?? []
    };
    set({ zones: [...zones, z], activeZoneId: id, tool: 'editZone' });
    return z;
  },

  updateZone(id, patch) {
    set((s) => ({ zones: s.zones.map(z => z.id === id ? { ...z, ...patch } : z) }));
  },

  ensureZoneClockwise(id) {
    const z = get().zones.find(z => z.id === id);
    if (!z) return;
    const sorted = clockwiseSort(z.image_quad);
    if (sorted) get().updateZone(id, { image_quad: sorted });
  },

  async removeZone(id) {
    set({ loading: true });
    try {
      await api.deleteZone(id);
      set((s) => ({
        zones: s.zones.filter(z => z.id !== id),
        activeZoneId: s.activeZoneId === id ? undefined : s.activeZoneId,
        activeLotId: undefined,
        lotDraft: null
      }));
    } finally { set({ loading: false }); }
  },

  async saveZone(id) {
    const z = get().zones.find(z => z.id === id);
    if (!z) return;
    get().ensureZoneClockwise(id);
    // NEW: нормализуем capacity = числу lots
    const payload: ParkingZone = { ...z, capacity: z.lots.length };
    set({ loading: true, info: undefined });
    try {
      if (z.created_at) {
        const updated = await api.updateZone(id, payload);
        set((s) => ({ zones: s.zones.map(zz => zz.id === id ? { ...zz, ...updated } : zz), info: 'zone-updated' }));
      } else {
        const created = await api.createZone({
          ...payload, id: undefined as any, created_at: undefined, updated_at: undefined
        } as any);
        set((s) => ({ zones: s.zones.map(zz => zz.id === id ? { ...zz, ...created } : zz), info: 'zone-created' }));
      }
    } finally { set({ loading: false }); }
  },

  addLot(zoneId, poly) {
    const s = get();
    const zone = s.zones.find(z => z.id === zoneId);
    if (!zone) return null;

    // Если capacity уже достигнут — автоматически увеличим его на 1,
    // чтобы можно было добавить лот (при сохранении всё равно нормализуем).
    if (zone.lots.length >= zone.capacity) {
      const newCap = zone.lots.length + 1;
      set({
        zones: s.zones.map(z => z.id === zoneId ? { ...z, capacity: newCap } : z)
      });
    }

    const lot: ParkingLot = { lot_id: genLotId(zoneId), image_polygon: poly };
    set({
      zones: s.zones.map(z => z.id === zoneId ? { ...z, lots: [...z.lots, lot] } : z),
      activeLotId: lot.lot_id,
      tool: 'editLot',
      lotDraft: null
    });
    return lot;
  },

  updateLot(zoneId, lotId, patch) {
    set((s) => ({
      zones: s.zones.map(z => z.id === zoneId
        ? { ...z, lots: z.lots.map(l => l.lot_id === lotId ? { ...l, ...patch } : l) }
        : z
      )
    }));
  },

  removeLot(zoneId, lotId) {
    set((s) => ({
      zones: s.zones.map(z => z.id === zoneId
        ? { ...z, lots: z.lots.filter(l => l.lot_id !== lotId) }
        : z
      ),
      activeLotId: undefined
    }));
  },

  // --- DRAFT helpers ---
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
