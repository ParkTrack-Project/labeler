import { useStore } from '@/store/useStore';
import { Line, Circle, Group } from 'react-konva';
import { PxPoint } from '@/types';

function handleDragVertex(quad: PxPoint[], idx: number, x: number, y: number): PxPoint[] {
  const next = quad.map(p => ({...p})) as any;
  next[idx] = { x, y };
  return next;
}

export default function ZoneLayer() {
  const { zones, activeZoneId, selectZone, updateZone, tool } = useStore();

  return (
    <>
      {zones.map((z) => {
        const active = z.id === activeZoneId;
        const pts = z.image_quad.flatMap(p => [p.x, p.y]);
        return (
          <Group key={z.id} onClick={() => selectZone(z.id)}>
            <Line
              points={pts}
              closed
              stroke={active ? '#6ea8fe' : '#4b5a86'}
              strokeWidth={active ? 2 : 1}
              fill={active ? 'rgba(110,168,254,0.08)' : 'rgba(78,86,120,0.08)'}
            />
            {active && (tool === 'editZone' || tool === 'select') && z.image_quad.map((p, i) => (
              <Circle
                key={i}
                x={p.x}
                y={p.y}
                radius={6}
                stroke="#6ea8fe"
                fill="#0b1020"
                strokeWidth={2}
                draggable
                onDragMove={(e) => {
                  const { x, y } = e.target.position();
                  const next = handleDragVertex(z.image_quad, i, x, y) as any;
                  updateZone(z.id, { image_quad: next });
                }}
              />
            ))}
          </Group>
        );
      })}
    </>
  );
}
