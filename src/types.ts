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
  capacity: number;              // планируемая вместимость (minimum: 0)
  pay: number;                   // int (minimum: 0)
  occupied?: number;             // количество занятых мест (minimum: 0)
  confidence?: number;           // уверенность детекции (0.0 to 1.0)
  // для рисования (4 точки по часовой стрелке)
  image_quad: [PxPoint, PxPoint, PxPoint, PxPoint];
  // для API (4 точки по часовой стрелке)
  points: [GeoPoint, GeoPoint, GeoPoint, GeoPoint];

  created_at?: string;           // ISO 8601 format with Z (UTC)
  updated_at?: string;           // ISO 8601 format with Z (UTC)
};

export type ToolMode = 'select' | 'drawZone' | 'editZone';

export type ViewMode = 'labeler' | 'cameras' | 'cameraMapSelector' | 'zoneMapSelector';

export type ImageMeta = {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
};
