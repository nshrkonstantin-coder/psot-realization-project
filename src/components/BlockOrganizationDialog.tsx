import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import FUNC_URLS from '../../backend/func2url.json';
import { apiFetch } from '@/lib/api';

interface BlockOrganizationDialogProps {
  organization: {
    id: number;
    name: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BlockOrganizationDialog({ organization, isOpen, onClose, onSuccess }: BlockOrganizationDialogProps) {
  const [blockType, setBlockType] = useState<'permanent' | 'temporary'>('permanent');
  const [blockedUntil, setBlockedUntil] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleBlock = async () => {
    setLoading(true);
    try {
      const adminId = parseInt(localStorage.getItem('userId') || '0');
      
      const res = await apiFetch(FUNC_URLS['block-management'], {
        method: 'POST',
        body: JSON.stringify({
          entity_type: 'organization',
          entity_id: organization.id,
          action: 'block',
          blocked_until: blockType === 'temporary' ? new Date(blockedUntil).toISOString() : null,
          reason,
          admin_id: adminId
        })
      });

      if (res.ok) {
        toast.success('Предприятие заблокировано');
        onSuccess();
        onClose();
      } else {
        toast.error('Ошибка блокировки');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      toast.error('Ошибка блокировки');
    } finally {
      setLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 border border-purple-600/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Блокировка предприятия</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="mb-4 p-4 bg-red-600/20 rounded-lg border border-red-600/30">
          <p className="text-white font-semibold">{organization.name}</p>
          <p className="text-sm text-gray-400">ID: {organization.id}</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-white mb-2 block">Тип блокировки</Label>
            <div className="flex gap-2">
              <Button
                onClick={() => setBlockType('permanent')}
                variant={blockType === 'permanent' ? 'default' : 'outline'}
                className={`flex-1 ${blockType === 'permanent' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              >
                <Icon name="Ban" size={16} className="mr-2" />
                Навсегда
              </Button>
              <Button
                onClick={() => setBlockType('temporary')}
                variant={blockType === 'temporary' ? 'default' : 'outline'}
                className={`flex-1 ${blockType === 'temporary' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
              >
                <Icon name="Clock" size={16} className="mr-2" />
                Временная
              </Button>
            </div>
          </div>

          {blockType === 'temporary' && (
            <div>
              <Label className="text-white mb-2 block">Заблокировать до</Label>
              <Input
                type="datetime-local"
                value={blockedUntil}
                onChange={(e) => setBlockedUntil(e.target.value)}
                min={getTomorrowDate()}
                className="bg-slate-700/50 border-purple-600/30 text-white"
              />
            </div>
          )}

          <div>
            <Label className="text-white mb-2 block">Причина (необязательно)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину блокировки для внутреннего использования"
              className="bg-slate-700/50 border-purple-600/30 text-white"
              rows={3}
            />
          </div>

          <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3">
            <p className="text-sm text-yellow-400">
              ⚠️ При блокировке ВСЕ пользователи предприятия будут заблокированы и увидят сообщение: "Ваше предприятие заблокировано. Обратитесь к главному администратору системы."
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleBlock}
              disabled={loading || (blockType === 'temporary' && !blockedUntil)}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                  Блокировка...
                </>
              ) : (
                <>
                  <Icon name="Ban" size={20} className="mr-2" />
                  Заблокировать предприятие
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-purple-600/30"
            >
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}