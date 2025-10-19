export type Id = number | string;

export type PxPoint = { x: number; y: number };

// Точка для API/лотов/зоны (px + geo, geo пока null)
export type GeoPoint = {
  x: number;
  y: number;
  long: number | null;
  lat: number | null;
};

export type ParkingLot = {
  lot_id: Id;
  // для рисования
  image_polygon: PxPoint[];   // >=3
  // для API (bulk)
  points: GeoPoint[];         // >=3 [{x,y,long,lat}]
  // опционально центроид (пока не используем)
  long?: number | null;
  lat?: number | null;
};

export type ParkingZone = {
  id: Id; // zone_id
  camera_id: number;
  zone_type: 'parallel' | 'standard' | 'disabled';
  capacity: number;
  pay: number; // int
  // рисуем
  image_quad: [PxPoint, PxPoint, PxPoint, PxPoint];
  // в API
  points: [GeoPoint, GeoPoint, GeoPoint, GeoPoint];
  // лоты (грузим отдельно)
  lots: ParkingLot[];
  // агрегат с сервера
  lots_count?: number;

  created_at?: string;
  updated_at?: string;
};

export type ToolMode = 'select' | 'drawZone' | 'drawLot' | 'editZone' | 'editLot';

export type ImageMeta = {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
};
