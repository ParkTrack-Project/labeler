import { useStore } from '@/store/useStore';
import { Line, Circle, Group, Rect } from 'react-konva';

export default function LotLayer() {
  const {
    zones, image, activeZoneId, activeLotId, selectLot, updateLot, tool,
    lotDraft, lotDraftAddPoint, lotDraftComplete
  } = useStore();

  const zone = zones.find(z => String(z.id) === String(activeZoneId));
  const W = image?.naturalWidth ?? 0;
  const H = image?.naturalHeight ?? 0;

  function onCanvasClick(e: any) {
    if (tool !== 'drawLot' || !zone) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const imagePos = {
      x: (pos.x - stage.x()) / stage.scaleX(),
      y: (pos.y - stage.y()) / stage.scaleY(),
    };

    const draft = lotDraft ?? [];
    if (draft.length >= 3 && isClose(draft[0], imagePos, 10)) {
      lotDraftComplete();
      return;
    }
    lotDraftAddPoint(imagePos);
  }

  return (
    <Group>
      {tool === 'drawLot' && W>0 && H>0 && (
        <Rect x={0} y={0} width={W} height={H} fill="rgba(0,0,0,0.001)" onClick={onCanvasClick} />
      )}

      {zone?.lots.map(l => {
        const active = String(l.lot_id) === String(activeLotId);
        const pts = l.image_polygon.flatMap(p => [p.x, p.y]);
        return (
          <Group key={String(l.lot_id)} onClick={() => selectLot(String(l.lot_id))}>
            <Line
              points={pts}
              closed
              stroke={active ? '#29d39a' : '#2ea47a'}
              strokeWidth={active ? 2 : 1}
              fill={active ? 'rgba(41,211,154,0.10)' : 'rgba(46,164,122,0.08)'}
            />
            {active && (tool === 'editLot' || tool === 'select') && l.image_polygon.map((p,i)=>(
              <Circle
                key={i}
                x={p.x}
                y={p.y}
                radius={5}
                stroke="#29d39a"
                fill="#0b1020"
                strokeWidth={2}
                draggable
                onDragMove={(e)=>{
                  const {x,y} = e.target.position();
                  const next = l.image_polygon.map((pp,ii)=> ii===i ? {x,y} : pp);
                  // ВАЖНО: lotId как string
                  updateLot(zone.id, String(l.lot_id), { image_polygon: next });
                }}
              />
            ))}
          </Group>
        );
      })}

      {tool === 'drawLot' && lotDraft && lotDraft.length>0 && (
        <Group listening={false}>
          <Line points={lotDraft.flatMap(p=>[p.x,p.y])} closed={false} stroke="#cbbdff" strokeWidth={1.5} dash={[6,6]} />
          {lotDraft.map((p,i)=> <Circle key={i} x={p.x} y={p.y} radius={4} fill="#cbbdff"/>)}
        </Group>
      )}
    </Group>
  );
}

function isClose(a: {x:number;y:number}, b:{x:number;y:number}, dist=10) {
  const dx=a.x-b.x, dy=a.y-b.y;
  return (dx*dx+dy*dy) <= dist*dist;
}
