import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

interface DeviceCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewStream: MediaStream | null;
  availableCameras: MediaDeviceInfo[];
  availableMicrophones: MediaDeviceInfo[];
  selectedCamera: string;
  selectedMicrophone: string;
  audioLevel: number;
  onCameraChange: (val: string) => void;
  onMicrophoneChange: (val: string) => void;
  onConfirm: () => void;
}

const DeviceCheckDialog = ({
  open,
  onOpenChange,
  previewStream,
  availableCameras,
  availableMicrophones,
  selectedCamera,
  selectedMicrophone,
  audioLevel,
  onCameraChange,
  onMicrophoneChange,
  onConfirm,
}: DeviceCheckDialogProps) => {
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const attachStream = (el: HTMLVideoElement | null) => {
    if (el && previewStream) {
      el.srcObject = previewStream;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-pink-600/30 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Icon name="Settings" size={24} className="text-pink-500" />
            Проверка камеры и микрофона
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {/* Предпросмотр видео */}
          <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
            <video
              ref={(el) => { previewVideoRef.current = el; attachStream(el); }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            {!previewStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon name="Camera" size={64} className="text-slate-600" />
              </div>
            )}
          </div>

          {/* Выбор камеры */}
          <div>
            <Label className="text-white flex items-center gap-2 mb-2">
              <Icon name="Camera" size={16} />
              Камера
            </Label>
            <Select value={selectedCamera} onValueChange={onCameraChange}>
              <SelectTrigger className="bg-slate-900/50 text-white border-pink-600/30">
                <SelectValue placeholder="Выберите камеру" />
              </SelectTrigger>
              <SelectContent>
                {availableCameras.map(cam => (
                  <SelectItem key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Камера ${cam.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Выбор микрофона */}
          <div>
            <Label className="text-white flex items-center gap-2 mb-2">
              <Icon name="Mic" size={16} />
              Микрофон
            </Label>
            <Select value={selectedMicrophone} onValueChange={onMicrophoneChange}>
              <SelectTrigger className="bg-slate-900/50 text-white border-pink-600/30">
                <SelectValue placeholder="Выберите микрофон" />
              </SelectTrigger>
              <SelectContent>
                {availableMicrophones.map(mic => (
                  <SelectItem key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Микрофон ${mic.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Индикатор уровня звука */}
          <div>
            <Label className="text-white flex items-center gap-2 mb-2">
              <Icon name="Volume2" size={16} />
              Уровень звука
            </Label>
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-pink-500 transition-all duration-150"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <p className="text-slate-400 text-sm mt-2 text-center">
                {audioLevel > 10 ? '🎤 Микрофон работает' : 'Говорите в микрофон для проверки'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1 border-slate-600">
              Отмена
            </Button>
            <Button onClick={onConfirm} className="flex-1 bg-pink-600 hover:bg-pink-700">
              <Icon name="Video" size={20} className="mr-2" />
              Продолжить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceCheckDialog;
