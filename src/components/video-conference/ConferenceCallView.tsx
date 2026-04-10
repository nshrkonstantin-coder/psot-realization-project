import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Conference } from './conferenceTypes';

interface ConferenceCallViewProps {
  conference: Conference;
  loading: boolean;
  onEndCall: () => void;
  onCopyLink: (id: string) => void;
}

const ConferenceCallView = ({ conference, loading, onEndCall, onCopyLink }: ConferenceCallViewProps) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Icon name="Video" size={24} className="text-pink-500" />
            <div>
              <h2 className="text-white font-semibold">{conference.name}</h2>
              <p className="text-slate-400 text-sm">{conference.participants.length} участников</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => window.open(`https://meet.jit.si/${conference.id}`, '_blank')}
              variant="outline"
            >
              <Icon name="ExternalLink" size={20} className="mr-2" />
              Открыть в новой вкладке
            </Button>
            <Button onClick={() => onCopyLink(conference.id)} variant="outline">
              <Icon name="Share2" size={20} className="mr-2" />
              Пригласить
            </Button>
            <Button onClick={onEndCall} variant="destructive">
              <Icon name="PhoneOff" size={20} className="mr-2" />
              Покинуть
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div id="jitsi-container" className="w-full h-full"></div>
        {loading && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-lg mx-auto px-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-pink-600/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-pink-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon name="Video" size={32} className="text-pink-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-white text-xl font-semibold">Подключение к конференции</h3>
                <p className="text-slate-400">Загружаем Jitsi Meet...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  );
};

export default ConferenceCallView;
