import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface Conference {
  id: string;
  name: string;
  creator_id: number;
  creator_name: string;
  participants: number[];
  created_at: string;
  status: 'active' | 'ended';
  is_favorite?: boolean;
  duration?: number;
  ended_at?: string;
}

interface ActiveCallViewProps {
  conference: Conference | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  participantsCount: number;
  networkQuality: 'high' | 'medium' | 'low';
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

const ActiveCallView = ({
  conference,
  isMuted,
  isVideoOff,
  isScreenSharing,
  participantsCount,
  networkQuality,
  localStream,
  screenStream,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall
}: ActiveCallViewProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (screenStream && screenShareRef.current) {
      screenShareRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const getQualityColor = () => {
    switch (networkQuality) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-red-500';
    }
  };

  const getQualityText = () => {
    switch (networkQuality) {
      case 'high': return 'Отличное';
      case 'medium': return 'Среднее';
      case 'low': return 'Плохое';
    }
  };

  return (
    <div className="h-[calc(100vh-120px)]">
      <Card className="bg-slate-800/50 border-blue-600/30 p-6 h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{conference?.name}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Icon name="Users" size={16} />
                  {participantsCount} участников
                </span>
                <span className={`flex items-center gap-1 ${getQualityColor()}`}>
                  <Icon name="Wifi" size={16} />
                  Качество: {getQualityText()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4 mb-4">
          {/* Main Video (Remote or Screen Share) */}
          <div className="col-span-2 bg-slate-900 rounded-lg overflow-hidden relative aspect-video">
            {isScreenSharing ? (
              <video
                ref={screenShareRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-4 left-4 bg-slate-800/80 px-3 py-1 rounded-lg">
              <p className="text-white text-sm">
                {isScreenSharing ? 'Демонстрация экрана' : 'Удаленный участник'}
              </p>
            </div>
          </div>

          {/* Local Video */}
          <div className="bg-slate-900 rounded-lg overflow-hidden relative aspect-video">
            {isVideoOff ? (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name="VideoOff" size={48} className="text-slate-600" />
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-4 left-4 bg-slate-800/80 px-3 py-1 rounded-lg">
              <p className="text-white text-sm">Вы</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={onToggleMute}
            variant="outline"
            size="lg"
            className={`${
              isMuted
                ? 'bg-red-600 border-red-500 hover:bg-red-700'
                : 'border-slate-600 hover:bg-slate-700'
            }`}
          >
            <Icon name={isMuted ? 'MicOff' : 'Mic'} size={24} />
          </Button>

          <Button
            onClick={onToggleVideo}
            variant="outline"
            size="lg"
            className={`${
              isVideoOff
                ? 'bg-red-600 border-red-500 hover:bg-red-700'
                : 'border-slate-600 hover:bg-slate-700'
            }`}
          >
            <Icon name={isVideoOff ? 'VideoOff' : 'Video'} size={24} />
          </Button>

          <Button
            onClick={onToggleScreenShare}
            variant="outline"
            size="lg"
            className={`${
              isScreenSharing
                ? 'bg-blue-600 border-blue-500 hover:bg-blue-700'
                : 'border-slate-600 hover:bg-slate-700'
            }`}
          >
            <Icon name="Monitor" size={24} />
          </Button>

          <Button
            onClick={onEndCall}
            size="lg"
            className="bg-red-600 hover:bg-red-700"
          >
            <Icon name="PhoneOff" size={24} className="mr-2" />
            Завершить
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ActiveCallView;
