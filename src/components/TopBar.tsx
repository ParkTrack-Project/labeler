import { useStore } from '@/store/useStore';
import { apiConfig, api } from '@/api/client';
import { Button, Field, Input, FilePicker } from './UiKit';
import { useEffect, useState } from 'react';

export default function TopBar() {
  const { apiBase, token, cameraId, setCamera, setImage } = useStore();
  const [imageUrlInput, setImageUrlInput] = useState('');

  useEffect(() => { apiConfig.set(apiBase, token); }, [apiBase, token]);

  async function loadImageFromUrl() {
    const url = imageUrlInput.trim();
    if (!url) return;
    const img = await loadImage(url);
    setImage(img);
    fitToView(img);
  }

  async function loadByCameraId() {
    if (!cameraId) return;
    try {
      const snap = await api.getSnapshot(parseInt(cameraId, 10));
      const url = snap?.image_url || '/sample.jpg';
      const img = await loadImage(url);
      setImage(img);
      fitToView(img);
    } catch {
      // fallback: локальная картинка для дев-режима
      const img = await loadImage('/sample.jpg');
      setImage(img);
      fitToView(img);
    }
  }

  function fitToView(_img: { naturalWidth: number; naturalHeight: number; url: string }) {
    useStore.getState().setView(1, 0, 0);
  }

  return (
    <div className="topbar">
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field label="API Base">
          <Input
            value={apiBase}
            onChange={e=>useStore.setState({ apiBase: e.target.value })}
            placeholder="https://parktrack-api.nawinds.dev/api/v0"
          />
        </Field>

        <Field label="Token">
          <Input
            value={token ?? ''}
            onChange={e=>useStore.setState({ token: e.target.value })}
            placeholder="вставьте токен"
          />
        </Field>

        <Field label="Camera ID">
          <div className="row" style={{ gap: 6 }}>
            <Input value={cameraId} onChange={e=>setCamera(e.target.value)} placeholder="42"/>
            <Button onClick={loadByCameraId}>Загрузить по Camera ID</Button>
          </div>
        </Field>

        <Field label="Image URL">
          <div className="row" style={{ gap: 6 }}>
            <Input style={{ minWidth: 320 }} value={imageUrlInput} onChange={e=>setImageUrlInput(e.target.value)} placeholder="http://…/frame.jpg"/>
            <Button onClick={loadImageFromUrl}>Открыть</Button>
          </div>
        </Field>

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
