import { Stage, Layer, Image as KImage } from 'react-konva';
import useImage from 'use-image';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import ZoneLayer from './ZoneLayer';
import LotLayer from './LotLayer';
import type { KonvaEventObject } from 'konva/lib/Node';

export default function ImageViewport() {
  const { image, scale, offsetX, offsetY, setView } = useStore();
  const [img] = useImage(image?.url ?? '');
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 100, h: 100 });

  useEffect(() => {
    function onResize() {
      if (!containerRef.current) return;
      setSize({
        w: containerRef.current.clientWidth,
        h: containerRef.current.clientHeight
      });
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const st = stageRef.current;
    if (!st) return;

    const oldScale = scale;
    const pointer = st.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - st.x()) / oldScale,
      y: (pointer.y - st.y()) / oldScale
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    };
    setView(newScale, newPos.x, newPos.y);
  };

  const onDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const st = e.target; // Stage
    setView(scale, st.x(), st.y());
  };

  return (
    <div className="canvas" ref={containerRef}>
      {!image ? (
        <div style={{ padding: 16, color: '#7f86a8' }}>
          Загрузите изображение сверху
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="badge">scale: {scale.toFixed(2)}</div>
          </div>
          <Stage
            ref={stageRef}
            width={size.w}
            height={size.h}
            scaleX={scale}
            scaleY={scale}
            x={offsetX}
            y={offsetY}
            onWheel={onWheel}
            draggable
            onDragEnd={onDragEnd}
          >
            <Layer>
              {img && (
                <KImage
                  image={img}
                  width={image.naturalWidth}
                  height={image.naturalHeight}
                />
              )}
              <ZoneLayer />
              <LotLayer />
            </Layer>
          </Stage>
        </>
      )}
    </div>
  );
}
