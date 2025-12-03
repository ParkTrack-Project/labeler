import { useStore } from '@/store/useStore';
import { Button, Field, Input, Select } from './UiKit';

export default function Sidebar() {
  const s = useStore();
  const zone = s.zones.find(z => String(z.id) === String(s.activeZoneId));

  function startDrawZone() {
    s.addZone(); // теперь это включает drawZone и очищает черновик
  }
  function finishEditing() {
    s.setTool('select');
  }

  function openCameraOnMap() {
    // Разрешаем открывать селектор даже без cameraId: внутри покажется подсказка.
    s.setViewMode('cameraMapSelector');
  }

  function openZoneOnMap() {
    if (!zone) return;
    s.setViewMode('zoneMapSelector');
  }

  return (
    <div className="sidebar">
      <div className="row" style={{justifyContent:'space-between'}}>
        <div className="badge">
          Camera: {s.cameraMeta ? `${s.cameraMeta.camera_id} — ${s.cameraMeta.title}` : (s.cameraId || '—')}
        </div>
        <div className="small">Tool: {s.tool}</div>
      </div>

      <hr/>

      <div className="col">
        <Button onClick={startDrawZone}>+ Добавить зону</Button>
        <Button className="ghost" onClick={openCameraOnMap}>
          Отметить камеру на карте
        </Button>
        {s.tool === 'drawZone' && s.zoneDraft && s.zoneDraft.length > 0 && (
          <Button className="danger" onClick={()=>s.zoneDraftClear()}>Отменить рисование</Button>
        )}
        <Button className="ghost" onClick={()=>s.loadZones()}>Загрузить зоны (GET)</Button>
      </div>

      <h4>Зоны</h4>
      <div className="list">
        {s.zones.map(z => (
          <div key={String(z.id)} className={`item ${String(s.activeZoneId)===String(z.id) ? 'active':''}`} onClick={()=>s.selectZone(z.id)}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <div>{String(z.id)}</div>
              <span className="badge">{z.zone_type}</span>
            </div>
            <div className="small">
              capacity: {z.capacity} • pay: {z.pay}
            </div>
          </div>
        ))}
      </div>

      {zone && (
        <>
          <hr/>
          <h4>Свойства зоны</h4>
          <Field label="Zone Type">
            <Select value={zone.zone_type} onChange={e=>s.updateZone(zone.id,{zone_type:e.target.value as any})}>
              <option value="standard">standard</option>
              <option value="parallel">parallel</option>
              <option value="disabled">disabled</option>
            </Select>
          </Field>
          <Field label="Capacity">
            <Input type="number" min={0} value={zone.capacity}
              onChange={e=>s.updateZone(zone.id,{capacity: parseInt(e.target.value||'0',10)})}/>
          </Field>
          <Field label="Pay">
            <Input type="number" min={0} value={zone.pay}
              onChange={e=>s.updateZone(zone.id,{pay: parseInt(e.target.value||'0',10)})}/>
          </Field>

          <div className="row" style={{gap:8}}>
            <Button onClick={()=>s.setTool('editZone')}>Редактировать вершины</Button>
            <Button className="ghost" onClick={finishEditing}>Готово</Button>
          </div>
          <div className="row" style={{gap:8}}>
            <Button onClick={()=>s.saveZone(zone.id)}>Сохранить зону (PUT/POST)</Button>
            <Button className="danger" onClick={()=>s.removeZone(zone.id)}>Удалить зону (DELETE)</Button>
          </div>
          <div className="row" style={{gap:8}}>
            <Button className="ghost" onClick={openZoneOnMap}>
              Отметить зону на карте
            </Button>
          </div>
        </>
      )}

      {s.tool === 'drawZone' && (
        <>
          <hr/>
          <div className="small" style={{opacity:0.8}}>
            Режим рисования зоны: кликните 4 точки на изображении, чтобы замкнуть четырёхугольник.
          </div>
        </>
      )}
    </div>
  );
}
