import { useStore } from '@/store/useStore';
import { Group, Line, Circle, Rect } from 'react-konva';

export default function ZoneLayer() {
  const {
    zones, image, activeZoneId, selectZone, updateZone, tool,
    zoneDraft, zoneDraftAddPoint
  } = useStore();

  const W = image?.naturalWidth ?? 0;
  const H = image?.naturalHeight ?? 0;

  // Клик по сцене для режима drawZone — добавляем точку
  function onCanvasClick(e: any) {
    if (tool !== 'drawZone') return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const imagePos = {
      x: (pos.x - stage.x()) / stage.scaleX(),
      y: (pos.y - stage.y()) / stage.scaleY()
    };
    zoneDraftAddPoint(imagePos);
  }

  return (
    <Group>
      {/* Прозрачный фон для ловли кликов в режиме drawZone */}
      {tool === 'drawZone' && W>0 && H>0 && (
        <Rect
          x={0} y={0} width={W} height={H}
          fill="rgba(0,0,0,0.001)"
          onClick={onCanvasClick}
        />
      )}

      {/* Существующие зоны */}
      {zones.map(z => {
        const active = String(z.id) === String(activeZoneId);
        const pts = z.image_quad.flatMap(p => [p.x, p.y]);

        return (
          <Group key={String(z.id)} onClick={() => selectZone(z.id)}>
            <Line
              points={pts}
              closed
              stroke={active ? '#ff7a45' : '#6aa0ff'}
              strokeWidth={active ? 4 : 2}
              shadowColor={active ? '#ff7a45' : undefined}
              shadowBlur={active ? 12 : 0}
              shadowOpacity={active ? 0.5 : 0}
              fill={active ? 'rgba(255,122,69,0.12)' : 'rgba(106,160,255,0.10)'}
            />
            {/* Вершины доступны ТОЛЬКО в режиме editZone и для активной зоны */}
            {active && tool === 'editZone' && z.image_quad.map((p,i)=>(
              <Circle
                key={i}
                x={p.x}
                y={p.y}
                radius={6}
                stroke="#ff7a45"
                fill="#0b1020"
                strokeWidth={2}
                draggable
                onMouseDown={(e:any)=>{ e.cancelBubble = true; }}
                onDragMove={(e)=>{
                  const {x,y} = e.target.position();
                  const next = z.image_quad.map((pp,ii)=> ii===i ? {x,y} : pp) as any;
                  // сразу обновим и image_quad, и points.x/y
                  const nextPoints = z.points.map((pt,ii)=> ii===i ? { ...pt, x, y } : pt) as any;
                  updateZone(z.id, { image_quad: next, points: nextPoints });
                }}
                onDragEnd={()=>{
                  // ничего: Stage в edit-режиме не draggable, так что не "прыгает"
                }}
              />
            ))}
          </Group>
        );
      })}

      {/* Черновик зоны (до 4 точек) */}
      {tool === 'drawZone' && zoneDraft && zoneDraft.length>0 && (
        <Group listening={false}>
          <Line
            points={zoneDraft.flatMap(p=>[p.x,p.y])}
            closed={false}
            stroke="#cbbdff"
            strokeWidth={2}
            dash={[6,6]}
          />
          {zoneDraft.map((p,i)=>(
            <Circle key={i} x={p.x} y={p.y} radius={4} fill="#cbbdff"/>
          ))}
        </Group>
      )}
    </Group>
  );
}
