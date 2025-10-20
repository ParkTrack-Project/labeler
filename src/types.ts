export type Id = number | string;

export type PxPoint = { x: number; y: number };

// Точка с пикселями и (пока) пустой геопривязкой
export type GeoPoint = {
  x: number;
  y: number;
  longitude: number | null;
  latitude: number | null;
};

export type ParkingZone = {
  id: Id;                        // zone_id
  camera_id: number;             // числовой camera_id
  zone_type: 'parallel' | 'standard' | 'disabled';
  capacity: number;              // планируемая вместимость
  pay: number;                   // int
  // для рисования
  image_quad: [PxPoint, PxPoint, PxPoint, PxPoint];
  // для API
  points: [GeoPoint, GeoPoint, GeoPoint, GeoPoint];

  created_at?: string;
  updated_at?: string;
};

export type ToolMode = 'select' | 'drawZone' | 'editZone';

export type ImageMeta = {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
};
