import { useEffect, useRef } from 'react';
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
  onCameraChange: (value: string) => void;
  onMicrophoneChange: (value: string) => void;
  onStartPreview: () => Promise<void>;
  onStopPreview: () => void;
  onProceedToCreate: () => void;
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
  onStartPreview,
  onStopPreview,
  onProceedToCreate
}: DeviceCheckDialogProps) => {
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (previewStream && previewVideoRef.current) {
      previewVideoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      onStopPreview();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-blue-600/30 text-white max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-blue-400 flex items-center gap-2">
            <Icon name="Settings" size={28} />
            Проверка устройств
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Preview */}
          <div className="bg-slate-900 rounded-lg overflow-hidden aspect-video relative">
            {previewStream ? (
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Icon name="VideoOff" size={64} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Нажмите "Начать проверку" для запуска превью</p>
                </div>
              </div>
            )}
          </div>

          {/* Camera Selection */}
          <div>
            <Label className="text-slate-300 mb-2 block">Камера</Label>
            <Select value={selectedCamera} onValueChange={onCameraChange}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Выберите камеру" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {availableCameras.map((camera) => (
                  <SelectItem key={camera.deviceId} value={camera.deviceId} className="text-white">
                    {camera.label || `Камера ${camera.deviceId.substring(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Microphone Selection */}
          <div>
            <Label className="text-slate-300 mb-2 block">Микрофон</Label>
            <Select value={selectedMicrophone} onValueChange={onMicrophoneChange}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Выберите микрофон" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {availableMicrophones.map((mic) => (
                  <SelectItem key={mic.deviceId} value={mic.deviceId} className="text-white">
                    {mic.label || `Микрофон ${mic.deviceId.substring(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audio Level Indicator */}
          <div>
            <Label className="text-slate-300 mb-2 block">Уровень звука</Label>
            <div className="bg-slate-700 rounded-lg h-8 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!previewStream ? (
              <Button
                onClick={onStartPreview}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Icon name="Play" size={20} className="mr-2" />
                Начать проверку
              </Button>
            ) : (
              <>
                <Button
                  onClick={onStopPreview}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Icon name="X" size={20} className="mr-2" />
                  Остановить
                </Button>
                <Button
                  onClick={onProceedToCreate}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  <Icon name="Check" size={20} className="mr-2" />
                  Продолжить
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceCheckDialog;
