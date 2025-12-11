export type Id = number | string;

export type PxPoint = { x: number; y: number };

export type GeoPoint = {
  x: number;
  y: number;
  longitude: number | null;
  latitude: number | null;
};

export type ParkingZone = {
  id: Id;                        // zone_id
  camera_id: number;
  zone_type: 'parallel' | 'standard' | 'disabled';
  capacity: number;
  pay: number;
  occupied?: number;
  confidence?: number;
  image_quad: [PxPoint, PxPoint, PxPoint, PxPoint];
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
