import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Conference } from './conferenceTypes';

interface ConferenceCardProps {
  conf: Conference;
  variant: 'active' | 'my' | 'favorites' | 'history';
  isFavorite: boolean;
  loading: boolean;
  onJoin: (conf: Conference) => void;
  onCopyLink: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const ConferenceCard = ({
  conf,
  variant,
  isFavorite,
  loading,
  onJoin,
  onCopyLink,
  onToggleFavorite,
}: ConferenceCardProps) => {
  const isHistory = variant === 'history';

  return (
    <Card className={`${isHistory ? 'bg-slate-800/50 border-slate-600/30' : 'bg-slate-800/50 border-pink-600/30 hover:border-pink-600'} transition-all`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Video" size={20} className={isHistory ? 'text-slate-400' : 'text-pink-500'} />
            {conf.name}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorite(conf.id)}
            className="hover:bg-slate-700/50"
          >
            <Icon
              name={isFavorite ? 'Star' : 'StarOff'}
              size={20}
              className={isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-slate-400 text-sm space-y-1">
          {variant !== 'my' && <p>Организатор: {conf.creator_name}</p>}
          <p>Участников: {conf.participants.length}</p>
          {variant === 'active' && (
            <p>Статус: <span className="text-green-500">Активна</span></p>
          )}
          {variant === 'my' && (
            <>
              <p>Создано: {new Date(conf.created_at).toLocaleDateString('ru-RU')}</p>
              <p>Статус: <span className={conf.status === 'active' ? 'text-green-500' : 'text-slate-500'}>
                {conf.status === 'active' ? 'Активна' : 'Завершена'}
              </span></p>
            </>
          )}
          {variant === 'favorites' && (
            <p>Статус: <span className={conf.status === 'active' ? 'text-green-500' : 'text-slate-500'}>
              {conf.status === 'active' ? 'Активна' : 'Завершена'}
            </span></p>
          )}
          {isHistory && (
            <>
              {conf.ended_at && <p>Завершена: {new Date(conf.ended_at).toLocaleString('ru-RU')}</p>}
              {conf.duration && <p>Длительность: {Math.floor(conf.duration / 60)} мин</p>}
              <p>Статус: <span className="text-slate-500">Завершена</span></p>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {!isHistory ? (
            <>
              <Button
                onClick={() => onJoin(conf)}
                className="flex-1 bg-pink-600 hover:bg-pink-700"
                disabled={loading || conf.status === 'ended'}
              >
                <Icon name="Video" size={16} className="mr-2" />
                Присоединиться
              </Button>
              <Button
                onClick={() => onCopyLink(conf.id)}
                variant="outline"
                className="border-pink-600/50"
              >
                <Icon name="Share2" size={16} />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onCopyLink(conf.id)}
              variant="outline"
              className="flex-1 border-slate-600/50"
            >
              <Icon name="Share2" size={16} className="mr-2" />
              Копировать ссылку
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConferenceCard;
