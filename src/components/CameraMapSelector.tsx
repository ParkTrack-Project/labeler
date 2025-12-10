import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { api, Camera } from '@/api/client';
import { Button } from './UiKit';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L, { LatLng, LatLngExpression } from 'leaflet';

const cameraIcon = L.divIcon({
  className: 'camera-marker-selected',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#ff7a45;border:2px solid white;"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

function ClickHandler({ onClick }: { onClick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    }
  });
  return null;
}

function MapAutoFocus({ point, camera }: { point: LatLng | null; camera: Camera | null }) {
  const map = useMap();

  useEffect(() => {
    if (point) {
      map.setView(point, 17);
      return;
    }
    if (camera?.latitude && camera?.longitude) {
      map.setView([camera.latitude, camera.longitude], 17);
    }
  }, [point, camera, map]);

  return null;
}

export default function CameraMapSelector() {
  const { cameraId, setViewMode } = useStore();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [point, setPoint] = useState<LatLng | null>(null);

  useEffect(() => {
    async function load() {
      if (!cameraId) return;
      setLoading(true);
      setError(undefined);
      try {
        const cam = await api.getCamera(parseInt(cameraId, 10));
        setCamera(cam);
        if (cam.latitude && cam.longitude) {
          setPoint(new L.LatLng(cam.latitude, cam.longitude));
        }
      } catch (e: any) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cameraId]);

  const center: LatLngExpression = useMemo(() => {
    if (point) return point;
    if (camera && camera.latitude && camera.longitude) {
      return [camera.latitude, camera.longitude];
    }
    return [59.9386, 30.3141];
  }, [camera, point]);

  async function onSave() {
    if (!cameraId || !point) return;
    try {
      setLoading(true);
      setError(undefined);
      await api.updateCamera(parseInt(cameraId, 10), {
        latitude: point.lat,
        longitude: point.lng
      });
      setViewMode('labeler');
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function onCancel() {
    setViewMode('labeler');
  }

  return (
    <>
      <div className="sidebar">
        <h4>Отметить камеру на карте</h4>
        {!cameraId && <div className="small">Сначала выберите Camera ID.</div>}
        {camera && (
          <div className="small" style={{ marginBottom: 8 }}>
            <div>Camera ID: {camera.camera_id}</div>
            <div>Название: {camera.title}</div>
            <div>Текущие координаты: {camera.latitude?.toFixed(6)}, {camera.longitude?.toFixed(6)}</div>
          </div>
        )}
        {loading && <div className="small">Загрузка…</div>}
        {error && <div className="small" style={{ color: '#ff6b6b' }}>{error}</div>}

        <div className="small" style={{ marginTop: 8 }}>
          Нажмите на карту, чтобы выбрать расположение камеры.
        </div>

        <div className="row" style={{ marginTop: 12, gap: 8 }}>
          <Button onClick={onSave} disabled={!point || loading}>Сохранить</Button>
          <Button className="ghost" onClick={onCancel}>Отмена</Button>
        </div>
      </div>

      <div className="canvas">
        <MapContainer center={center} zoom={15} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapAutoFocus point={point} camera={camera} />
          <ClickHandler onClick={setPoint} />
          {point && <Marker position={point} icon={cameraIcon} />}
        </MapContainer>
      </div>
    </>
  );
}
