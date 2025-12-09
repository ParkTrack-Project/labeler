import { useStore } from '@/store/useStore';
import { apiConfig, api } from '@/api/client';
import { Button, Field, Input, FilePicker } from './UiKit';
import { useEffect, useState, useCallback } from 'react';

export default function TopBar() {
  const { apiBase, token, cameraId, viewMode, setViewMode, setImage, image } = useStore();
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    apiConfig.set(apiBase, token);
  }, [apiBase, token]);

  async function loadImageFromUrl() {
    const url = imageUrlInput.trim();
    if (!url) return;
    const img = await loadImage(url);
    setImage(img);
    fitToView(img);
  }

  const loadByCameraId = useCallback(async () => {
    if (!cameraId) return;
    setLoadingSnapshot(true);
    try {
      // Убеждаемся, что API настроен перед запросом
      apiConfig.set(apiBase, token);
      const snap = await api.getSnapshot(parseInt(cameraId, 10));
      
      if (snap?.image_url) {
        // Очищаем предыдущий blob URL, если он был
        if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(currentBlobUrl);
        }
        
        // image_url теперь является blob URL, созданным из бинарных данных
        setCurrentBlobUrl(snap.image_url);
        const img = await loadImage(snap.image_url);
        setImage(img);
        fitToView(img);
      } else {
        console.warn('Snapshot не содержит image_url, используем fallback');
        // fallback: локальная картинка для дев-режима
        const img = await loadImage('/sample.jpg');
        setImage(img);
        fitToView(img);
      }
    } catch (error) {
      console.error('Ошибка загрузки snapshot:', error);
      // fallback: локальная картинка для дев-режима
      try {
        const img = await loadImage('/sample.jpg');
        setImage(img);
        fitToView(img);
      } catch (fallbackError) {
        console.error('Ошибка загрузки fallback изображения:', fallbackError);
      }
    } finally {
      setLoadingSnapshot(false);
    }
  }, [cameraId, apiBase, token, setImage, currentBlobUrl]);

  function fitToView(_img: { naturalWidth: number; naturalHeight: number; url: string }) {
    useStore.getState().setView(1, 0, 0);
  }

  const isLabeler = viewMode === 'labeler';

  // Очистка blob URL при размонтировании или изменении изображения
  useEffect(() => {
    return () => {
      if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [currentBlobUrl]);

  // при входе в labeler с выбранной камерой — автоматически загружаем снапшот
  useEffect(() => {
    if (viewMode === 'labeler' && cameraId) {
      // Небольшая задержка для гарантии, что API конфиг применен
      const timer = setTimeout(() => {
        loadByCameraId();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [viewMode, cameraId, loadByCameraId]);

  return (
    <div className="topbar">
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="row" style={{ gap: 6, marginRight: 16 }}>
          <Button
            variant={isLabeler ? 'primary' : 'ghost'}
            onClick={() => setViewMode('labeler')}
          >
            Labeler
          </Button>
          <Button
            variant={viewMode === 'cameras' ? 'primary' : 'ghost'}
            onClick={() => setViewMode('cameras')}
          >
            Cameras
          </Button>
        </div>

        {isLabeler && (
          <Field label="API Base">
            <Input
              value={apiBase}
              onChange={e => useStore.setState({ apiBase: e.target.value })}
placeholder="https://api.parktrack.live"
            />
          </Field>
        )}

        <Field label="Token">
          <Input
            value={token ?? ''}
            onChange={e => useStore.setState({ token: e.target.value })}
            placeholder="вставьте токен"
          />
        </Field>

        {isLabeler && (
          <Field label="Image URL">
            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
              <Input
                style={{ minWidth: 320 }}
                value={imageUrlInput}
                onChange={e => setImageUrlInput(e.target.value)}
                placeholder="http://…/frame.jpg"
              />
              <Button onClick={loadImageFromUrl}>Открыть</Button>
              {loadingSnapshot && <span className="small">Загрузка snapshot...</span>}
            </div>
          </Field>
        )}

        {isLabeler && (
          <Field label=" ">
            <FilePicker
              accept="image/*"
              onPick={async (f) => {
                const url = URL.createObjectURL(f);
                const img = await loadImage(url);
                setImage(img);
                fitToView(img);
              }}
            />
          </Field>
        )}
      </div>
    </div>
  );
}

async function loadImage(url: string) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('Image load error'));
  });
  return { url, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight };
}
