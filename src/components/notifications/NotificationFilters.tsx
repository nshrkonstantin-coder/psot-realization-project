import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

interface NotificationFiltersProps {
  filterType: string;
  setFilterType: (value: string) => void;
  filterRead: string;
  setFilterRead: (value: string) => void;
  selectedCount: number;
  onMarkRead: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export default function NotificationFilters({
  filterType,
  setFilterType,
  filterRead,
  setFilterRead,
  selectedCount,
  onMarkRead,
  onDelete,
  onRefresh
}: NotificationFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
          <SelectValue placeholder="Тип уведомления" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все типы</SelectItem>
          <SelectItem value="error">Ошибки</SelectItem>
          <SelectItem value="warning">Предупреждения</SelectItem>
          <SelectItem value="success">Успешные</SelectItem>
          <SelectItem value="info">Информация</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterRead} onValueChange={setFilterRead}>
        <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="false">Непрочитанные</SelectItem>
          <SelectItem value="true">Прочитанные</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2 ml-auto">
        {selectedCount > 0 && (
          <>
            <Button
              onClick={onMarkRead}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <Icon name="Check" size={16} className="mr-2" />
              Отметить прочитанными ({selectedCount})
            </Button>
            <Button
              onClick={onDelete}
              variant="outline"
              className="bg-red-900/20 border-red-500/50 text-red-400 hover:bg-red-900/30"
            >
              <Icon name="Trash2" size={16} className="mr-2" />
              Удалить ({selectedCount})
            </Button>
          </>
        )}
        <Button
          onClick={onRefresh}
          variant="outline"
          className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
        >
          <Icon name="RefreshCw" size={16} />
        </Button>
      </div>
    </div>
  );
}
