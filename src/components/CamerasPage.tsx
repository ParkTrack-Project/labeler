import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { api, Camera } from '@/api/client';
import { Button } from './UiKit';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';

// Simple marker icons fix for Leaflet + Vite
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowAnchor: [12, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

function MapAutoCenter({ cameras, selectedId }: { cameras: Camera[]; selectedId?: number }) {
  const map = useMap();

  useEffect(() => {
    if (!cameras.length) return;
    const selected = cameras.find(c => c.camera_id === selectedId && c.latitude && c.longitude);
    if (selected) {
      map.setView([selected.latitude, selected.longitude], 17);
      return;
    }
    const pts = cameras.filter(c => c.latitude && c.longitude).map(c => [c.latitude, c.longitude] as [number, number]);
    if (!pts.length) return;
    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds.pad(0.2));
  }, [cameras, selectedId, map]);

  return null;
}

export default function CamerasPage() {
  const store = useStore();
  const { setViewMode, setCamera, loadCameraMeta } = store;
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [hoverId, setHoverId] = useState<number | undefined>();
  const [zoneCounts, setZoneCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const list = await api.listCameras();
        if (!cancelled) {
          setCameras(list);
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // подгружаем количество зон для каждой камеры
  useEffect(() => {
    if (!cameras.length) return;
    let cancelled = false;
    async function loadCounts() {
      try {
        const entries = await Promise.all(
          cameras.map(async (cam) => {
            try {
              const zones = await api.listZones(cam.camera_id);
              return [cam.camera_id, zones.length] as const;
            } catch {
              return [cam.camera_id, 0] as const;
            }
          })
        );
        if (cancelled) return;
        const map: Record<number, number> = {};
        for (const [id, count] of entries) map[id] = count;
        setZoneCounts(map);
      } catch {
        // игнорируем, счётчики зон не критичны для работы страницы
      }
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [cameras]);

  const center: LatLngExpression = useMemo(() => {
    const first = cameras.find(c => c.latitude && c.longitude);
    if (first) return [first.latitude, first.longitude];
    // default city center (e.g. Saint Petersburg)
    return [59.9386, 30.3141];
  }, [cameras]);

  function onEditCamera(cam: Camera) {
    setCamera(String(cam.camera_id));
    // автоматически подтягиваем метаданные камеры и зоны
    loadCameraMeta(cam.camera_id);
    store.loadZones();
    setViewMode('labeler');
  }

  return (
    <>
      <div className="sidebar">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h4>Камеры</h4>
          <Button className="ghost" onClick={() => setViewMode('labeler')}>Вернуться к разметке</Button>
        </div>

        {loading && <div className="small">Загрузка камер…</div>}
        {error && <div className="small" style={{ color: '#ff6b6b' }}>{error}</div>}

        <div className="list">
          {cameras.map(cam => {
            const isActive = cam.camera_id === selectedId;
            const isHover = cam.camera_id === hoverId;
            const zonesCount = zoneCounts[cam.camera_id];
            return (
              <div
                key={cam.camera_id}
                className={`item ${isActive ? 'active' : ''} ${isHover ? 'hover' : ''}`}
                onMouseEnter={() => setHoverId(cam.camera_id)}
                onMouseLeave={() => setHoverId(id => (id === cam.camera_id ? undefined : id))}
                onClick={() => setSelectedId(cam.camera_id)}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>{cam.title}</div>
                </div>
                <div className="small">ID: {cam.camera_id}</div>
                <div className="small">Зон: {typeof zonesCount === 'number' ? zonesCount : '—'}</div>
                <div className="row" style={{ marginTop: 6, gap: 6 }}>
                  <Button onClick={() => onEditCamera(cam)}>Редактировать</Button>
                </div>
                {isHover && <div className="small">Наведи на метку на карте, чтобы увидеть камеру</div>}
              </div>
            );
          })}
          {!loading && !cameras.length && !error && (
            <div className="small">Камеры не найдены</div>
          )}
        </div>
      </div>

      <div className="canvas">
        <MapContainer center={center} zoom={14} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapAutoCenter cameras={cameras} selectedId={selectedId} />
          {cameras.filter(c => c.latitude && c.longitude).map(cam => {
            const isActive = cam.camera_id === selectedId;
            const isHover = cam.camera_id === hoverId;
            const color = isActive ? '#ff7a45' : isHover ? '#ffd666' : '#2f54eb';
            const icon = L.divIcon({
              className: 'camera-marker',
              html: `<div style="width:${isActive ? 18 : 12}px;height:${isActive ? 18 : 12}px;border-radius:50%;background:${color};border:2px solid white;"></div>`,
              iconSize: [isActive ? 18 : 12, isActive ? 18 : 12],
              iconAnchor: [9, 9]
            });
            return (
              <Marker
                key={cam.camera_id}
                position={[cam.latitude, cam.longitude]}
                eventHandlers={{
                  click: () => setSelectedId(cam.camera_id),
                  mouseover: () => setHoverId(cam.camera_id),
                  mouseout: () => setHoverId(id => (id === cam.camera_id ? undefined : id))
                }}
                icon={icon}
              >
                <Popup>
                  <div style={{ maxWidth: 220 }}>
                    <div><b>{cam.title}</b></div>
                    <div className="small">ID: {cam.camera_id}</div>
                    <div style={{ marginTop: 6 }}>
                      <Button onClick={() => onEditCamera(cam)}>Редактировать</Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}
