export type PxPoint = { x: number; y: number };
export type LatLng = { lat: number; lng: number };

export type ParkingLot = {
  lot_id: string;
  image_polygon: PxPoint[];   // >=3
  lat?: number;               // опционально
  long?: number;              // опционально
  points?: LatLng[];          // опционально: гео-полигон
  label?: string;
};

export type ParkingZone = {
  id: string;
  camera_id: string;
  name?: string;
  zone_type: string; // 'parallel' | 'standard' | ...
  capacity: number;
  pay: number;        // NEW: поле оплаты (по умолчанию 0)
  image_quad: [PxPoint, PxPoint, PxPoint, PxPoint];
  lots: ParkingLot[];
  created_at?: string;
  updated_at?: string;
};

export type ToolMode = 'select' | 'drawZone' | 'drawLot' | 'editZone' | 'editLot';

export type ImageMeta = {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
};
