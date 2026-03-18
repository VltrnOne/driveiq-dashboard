'use client';
import { useEffect, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';

export default function CameraFeed() {
  const [visionStatus, setVisionStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const visionUrl = process.env.NEXT_PUBLIC_VISION_URL ?? 'http://localhost:8010';
  const visionKey = process.env.NEXT_PUBLIC_VISION_API_KEY ?? 'devkey';

  useEffect(() => {
    fetch(`${visionUrl}/api/health`)
      .then(r => r.ok ? 'online' : 'offline')
      .then(status => setVisionStatus(status as 'online' | 'offline'))
      .catch(() => setVisionStatus('offline'));
  }, [visionUrl]);

  return (
    <div className="bg-[#0D0D0D] rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative">
      {visionStatus === 'online' ? (
        // MJPEG stream — uses ?api_key= because <img> cannot send custom headers
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${visionUrl}/api/camera/feed?api_key=${visionKey}`}
          alt="Drive-thru camera feed"
          className="w-full h-full object-cover"
          onError={() => setVisionStatus('offline')}
        />
      ) : (
        <div className="text-center text-white/40">
          <Camera className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <div className="font-medium text-sm">
            {visionStatus === 'checking' ? 'Connecting to camera…' : 'Camera offline'}
          </div>
          <div className="text-xs mt-1 opacity-50">
            {visionStatus === 'offline' ? `Vision service: ${visionUrl}` : ''}
          </div>
          {visionStatus === 'offline' && (
            <div className="flex items-center gap-1 justify-center mt-2 text-red-400 text-xs">
              <AlertCircle className="w-3 h-3" />
              Start driveiq-vision service
            </div>
          )}
        </div>
      )}

      {/* Live indicator overlay */}
      {visionStatus === 'online' && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </div>
      )}
    </div>
  );
}
