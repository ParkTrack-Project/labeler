import TopBar from '@/components/TopBar';
import ImageViewport from '@/components/ImageViewport';
import Sidebar from '@/components/Sidebar';
import RequestLogPanel from '@/components/RequestLogPanel';
import CamerasPage from '@/components/CamerasPage';
import CameraMapSelector from '@/components/CameraMapSelector';
import ZoneMapSelector from '@/components/ZoneMapSelector';
import { useStore } from '@/store/useStore';

export default function App() {
  const { viewMode } = useStore();

  let main: JSX.Element;
  if (viewMode === 'labeler') {
    main = (
      <>
        <Sidebar />
        <ImageViewport />
      </>
    );
  } else if (viewMode === 'cameras') {
    main = <CamerasPage />;
  } else if (viewMode === 'cameraMapSelector') {
    main = <CameraMapSelector />;
  } else {
    main = <ZoneMapSelector />;
  }

  return (
    <div className="app">
      <TopBar />
      {main}
      <RequestLogPanel />
    </div>
  );
}
