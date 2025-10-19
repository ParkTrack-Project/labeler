import TopBar from '@/components/TopBar';
import ImageViewport from '@/components/ImageViewport';
import Sidebar from '@/components/Sidebar';
import RequestLogPanel from '@/components/RequestLogPanel';

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <Sidebar />
      <ImageViewport />
      <RequestLogPanel />
    </div>
  );
}
