import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from './UiKit';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import L, { LatLng, LatLngExpression } from 'leaflet';

type LatLngTuple = [number, number];

function ClickHandler({ onClick }: { onClick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    }
  });
  return null;
}

function MapAutoFit({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.2));
  }, [points, map]);

  return null;
}

export default function ZoneMapSelector() {
  const store = useStore();
  const { cameraId, zones, activeZoneId, setViewMode } = store;
  const zone = zones.find(z => String(z.id) === String(activeZoneId));

  const [points, setPoints] = useState<LatLng[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!zone) {
      setPoints([]);
      return;
    }
    // Загружаем только те точки, у которых есть уникальные координаты (не все одинаковые)
    const existing = zone.points
      .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number')
      .slice(0, 4) as any[];
    
    // Проверяем, что координаты не все одинаковые (что может быть, если использовались координаты камеры)
    const uniqueCoords = new Set(existing.map(p => `${p.latitude},${p.longitude}`));
    
    if (existing.length === 4 && uniqueCoords.size > 1) {
      // Есть 4 точки с разными координатами - загружаем их
      setPoints(existing.map(p => new L.LatLng(p.latitude!, p.longitude!)));
    } else {
      // Нет валидных точек или все одинаковые - начинаем с пустого списка
      setPoints([]);
    }
  }, [zone]);

  const center: LatLngExpression = useMemo(() => {
    if (points.length > 0) {
      const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
      const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
      return [lat, lng];
    }
    // fallback: city center
    return [59.9386, 30.3141];
  }, [points]);

  function onMapClick(pos: LatLng) {
    setPoints(prev => {
      if (prev.length >= 4) return prev; // ограничиваемся 4 точками
      return [...prev, pos];
    });
  }

  function onReset() {
    setPoints([]);
    // Сбрасываем координаты в store для точек, которые еще не установлены
    if (zone) {
      const resetPoints = zone.points.map((pt, i) => {
        // Оставляем только пиксельные координаты, сбрасываем географические
        return { ...pt, latitude: null, longitude: null };
      }) as any;
      store.updateZone(zone.id, { points: resetPoints });
    }
  }

  async function onSave() {
    if (!zone || points.length !== 4) return;
    try {
      setLoading(true);
      setError(undefined);

      const updatedPoints = zone.points.map((pt, idx) => {
        if (idx < 4) {
          const p = points[idx];
          return { ...pt, latitude: p.lat, longitude: p.lng };
        }
        return pt;
      }) as any;

      // Обновляем зону в состоянии и сохраняем через API
      store.updateZone(zone.id, { points: updatedPoints });
      await store.saveZone(zone.id);

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

  const polygon: LatLngTuple[] = points.map(p => [p.lat, p.lng]);

  return (
    <>
      <div className="sidebar">
        <h4>Отметить зону на карте</h4>
        {!zone && <div className="small">Сначала выберите зону в списке.</div>}
        {zone && (
          <div className="small" style={{ marginBottom: 8 }}>
            <div>Zone ID: {String(zone.id)}</div>
            <div>Тип: {zone.zone_type}</div>
            <div>Вместимость: {zone.capacity}</div>
          </div>
        )}
        {loading && <div className="small">Сохранение…</div>}
        {error && <div className="small" style={{ color: '#ff6b6b' }}>{error}</div>}

        <div className="small" style={{ marginTop: 8 }}>
          Кликните 4 точки на карте по часовой стрелке, чтобы задать геометку зоны.
        </div>

        <div className="row" style={{ marginTop: 12, gap: 8 }}>
          <Button onClick={onSave} disabled={!zone || points.length !== 4 || loading}>Сохранить</Button>
          <Button className="ghost" onClick={onCancel}>Отмена</Button>
          <Button className="ghost" onClick={onReset}>Сбросить</Button>
        </div>
      </div>

      <div className="canvas">
        <MapContainer center={center} zoom={16} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapAutoFit points={points} />
          <ClickHandler onClick={onMapClick} />
          {polygon.length > 0 && <Polygon positions={polygon} pathOptions={{ color: '#ff7a45' }} />}
          {points.map((p, idx) => (
            <Marker
              key={idx}
              position={p}
              icon={L.divIcon({
                className: 'zone-point-marker',
                html: '<div style="width:12px;height:12px;border-radius:50%;background:#ffd666;border:2px solid white;"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
              })}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const newPos = e.target.getLatLng();
                  const updatedPoints = points.map((pt, i) => i === idx ? new L.LatLng(newPos.lat, newPos.lng) : pt);
                  setPoints(updatedPoints);
                  
                  // Синхронизируем изменения с store в реальном времени только если все 4 точки установлены
                  if (zone && updatedPoints.length === 4) {
                    const updatedZonePoints = zone.points.map((pt, i) => {
                      if (i < 4) {
                        const p = updatedPoints[i];
                        return { ...pt, latitude: p.lat, longitude: p.lng };
                      }
                      return pt;
                    }) as any;
                    store.updateZone(zone.id, { points: updatedZonePoints });
                  }
                }
              }}
            />
          ))}
        </MapContainer>
      </div>
    </>
  );
}
