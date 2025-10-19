import { useStore } from '@/store/useStore';
import { Button, Field, Input, Select } from './UiKit';

export default function Sidebar() {
  const s = useStore();
  const zone = s.zones.find(z => String(z.id) === String(s.activeZoneId));
  const lot  = zone?.lots.find(l => String(l.lot_id) === String(s.activeLotId));

  function startNewZone() {
    const z = s.addZone();
    s.selectZone(z.id);
  }
  function startDrawLot() {
    if (!zone) return;
    s.lotDraftClear();
    s.setTool('drawLot');
  }
  function finishEditing() {
    s.setTool('select');
    s.lotDraftClear();
  }

  return (
    <div className="sidebar">
      <div className="row" style={{justifyContent:'space-between'}}>
        <div className="badge">Camera: {s.cameraId || '—'}</div>
        <div className="small">Tool: {s.tool}</div>
      </div>

      <hr/>

      <div className="col">
        <Button onClick={startNewZone}>+ Добавить зону</Button>
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
              capacity: {z.capacity}
              {' • '}lots_count: {z.lots_count ?? 0}
              {' • '}pay: {z.pay}
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
          <Field label="Capacity (lots)">
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
            <Button onClick={()=>s.saveZone(zone.id)}>Сохранить зону (PUT/POST с lots)</Button>
            <Button className="danger" onClick={()=>s.removeZone(zone.id)}>Удалить зону (DELETE)</Button>
          </div>
          <hr/>
          <div className="row" style={{justifyContent:'space-between', alignItems:'baseline'}}>
            <h4>Места (Lots)</h4>
            <div className="row" style={{gap:6}}>
              <Button className="ghost" onClick={startDrawLot}>+ Добавить лот</Button>
              {s.tool==='drawLot' && s.lotDraft && s.lotDraft.length>=3 && (
                <Button onClick={()=>s.lotDraftComplete()}>Завершить лот</Button>
              )}
              {s.tool==='drawLot' && s.lotDraft && s.lotDraft.length>0 && (
                <Button className="danger" onClick={()=>s.lotDraftClear()}>Отменить</Button>
              )}
            </div>
          </div>

          <div className="list">
            {zone.lots.map(l => (
              <div key={String(l.lot_id)}
                   className={`item ${String(s.activeLotId)===String(l.lot_id) ? 'active':''}`}
                   onClick={()=>s.selectLot(String(l.lot_id))}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div>{String(l.lot_id)}</div>
                  <span className="badge">{l.image_polygon.length} pts</span>
                </div>
              </div>
            ))}
          </div>

          {lot && (
            <>
              <hr/>
              <h4>Свойства лота</h4>
              {/* label удалён — оставляем только редактирование вершин */}
              <div className="row" style={{gap:8}}>
                <Button onClick={()=>s.setTool('editLot')}>Редактировать вершины</Button>
                <Button className="ghost" onClick={finishEditing}>Готово</Button>
                <Button className="danger" onClick={()=>s.removeLot(zone.id, String(lot.lot_id))}>Удалить лот</Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
