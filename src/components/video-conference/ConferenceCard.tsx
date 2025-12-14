import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface ConferenceCardProps {
  conference: Conference;
  userId: number | null;
  isFavorite: boolean;
  onJoin: (conf: Conference) => void;
  onToggleFavorite: (confId: string) => void;
  showStatus?: boolean;
}

const ConferenceCard = ({
  conference,
  userId,
  isFavorite,
  onJoin,
  onToggleFavorite,
  showStatus = false
}: ConferenceCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  };

  const isCreator = userId === conference.creator_id;

  return (
    <Card className="bg-slate-800/50 border-blue-600/30 p-6 hover:bg-slate-700/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            {conference.name}
            {isCreator && (
              <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded">
                Создатель
              </span>
            )}
          </h3>
          <p className="text-slate-400 text-sm">
            <Icon name="User" size={16} className="inline mr-1" />
            {conference.creator_name}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            <Icon name="Users" size={16} className="inline mr-1" />
            Участников: {conference.participants.length}
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Создана: {formatDate(conference.created_at)}
          </p>
          {showStatus && conference.status === 'ended' && conference.ended_at && (
            <>
              <p className="text-slate-500 text-xs mt-1">
                Завершена: {formatDate(conference.ended_at)}
              </p>
              {conference.duration && (
                <p className="text-slate-500 text-xs mt-1">
                  Длительность: {formatDuration(conference.duration)}
                </p>
              )}
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(conference.id);
          }}
          className="text-yellow-500 hover:text-yellow-400"
        >
          <Icon name={isFavorite ? 'Star' : 'StarOff'} size={24} />
        </Button>
      </div>

      <Button
        onClick={() => onJoin(conference)}
        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
      >
        <Icon name="Video" size={20} className="mr-2" />
        {conference.status === 'ended' ? 'Просмотреть запись' : 'Присоединиться'}
      </Button>
    </Card>
  );
};

export default ConferenceCard;
