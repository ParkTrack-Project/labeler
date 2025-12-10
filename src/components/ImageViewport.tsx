import { Stage, Layer, Image as KImage } from 'react-konva';
import useImage from 'use-image';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import ZoneLayer from './ZoneLayer';
import type { KonvaEventObject } from 'konva/lib/Node';

export default function ImageViewport() {
  const { image, scale, offsetX, offsetY, setView, tool } = useStore();
  const [img] = useImage(image?.url ?? '');
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 100, h: 100 });
  const lastImageUrlRef = useRef<string | undefined>(undefined);

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

  // Автоматическое масштабирование изображения при первой загрузке нового изображения
  useEffect(() => {
    if (!image) {
      lastImageUrlRef.current = undefined;
      return;
    }
    if (!img || size.w === 0 || size.h === 0) return;
    
    // Проверяем, изменился ли URL изображения (новая загрузка)
    const isNewImage = lastImageUrlRef.current !== image.url;
    if (!isNewImage) return;
    
    lastImageUrlRef.current = image.url;
    
    const imgWidth = image.naturalWidth;
    const imgHeight = image.naturalHeight;
    
    // Вычисляем масштаб, чтобы изображение поместилось в контейнер
    const scaleX = size.w / imgWidth;
    const scaleY = size.h / imgHeight;
    const newScale = Math.min(scaleX, scaleY, 1); // Не увеличиваем больше оригинала
    
    // Центрируем изображение
    const scaledWidth = imgWidth * newScale;
    const scaledHeight = imgHeight * newScale;
    const newOffsetX = (size.w - scaledWidth) / 2;
    const newOffsetY = (size.h - scaledHeight) / 2;
    
    setView(newScale, newOffsetX, newOffsetY);
  }, [image, img, size.w, size.h, setView]);

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

  const onDragEnd = (_e: KonvaEventObject<DragEvent>) => {
    // Stage draggable только в select — значит, просто фиксируем позицию
    const st = stageRef.current;
    if (!st) return;
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
            <div className="badge">scale: {scale.toFixed(2)} • tool: {tool}</div>
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
            draggable={tool === 'select'}
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
            </Layer>
          </Stage>
        </>
      )}
    </div>
  );
}
