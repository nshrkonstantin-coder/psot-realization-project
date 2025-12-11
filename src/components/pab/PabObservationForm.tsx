import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

interface Observation {
  observation_number: number;
  description: string;
  category: string;
  conditions_actions: string;
  hazard_factors: string;
  measures: string;
  responsible_person: string;
  deadline: string;
  photo_file?: File | null;
}

interface Dictionaries {
  categories: Array<{ id: number; name: string }>;
  conditions: Array<{ id: number; name: string }>;
  hazards: Array<{ id: number; name: string }>;
}

interface OrgUser {
  id: number;
  fio: string;
  position: string;
  subdivision: string;
}

interface PabObservationFormProps {
  observation: Observation;
  index: number;
  dictionaries: Dictionaries;
  orgUsers: OrgUser[];
  subdivisionFilter: string;
  onSubdivisionFilterChange: (value: string) => void;
  onUpdate: (index: number, field: keyof Observation, value: string | File | null) => void;
  isFieldFilled: (value: any) => boolean;
}

export const PabObservationForm = ({
  observation,
  index,
  dictionaries,
  orgUsers,
  subdivisionFilter,
  onSubdivisionFilterChange,
  onUpdate,
  isFieldFilled,
}: PabObservationFormProps) => {
  const safeOrgUsers = orgUsers || [];
  const uniqueSubdivisions = Array.from(new Set(safeOrgUsers.map(u => u.subdivision)));
  const filteredUsers = subdivisionFilter
    ? safeOrgUsers.filter(u => u.subdivision === subdivisionFilter)
    : safeOrgUsers;

  return (
    <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
      <h2 className="text-2xl font-bold text-yellow-500 mb-6">
        Наблюдение №{observation.observation_number}
      </h2>
      <div className="space-y-6">
        <div>
          <Label className="text-slate-300">Описание наблюдения *</Label>
          <Textarea
            value={observation.description}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            className={`bg-slate-700 border-slate-600 text-white min-h-[100px] ${!isFieldFilled(observation.description) ? 'border-red-500' : ''}`}
            placeholder="Опишите наблюдение"
          />
        </div>

        <div>
          <Label className="text-slate-300">Категория наблюдений *</Label>
          <Select
            value={observation.category}
            onValueChange={(value) => onUpdate(index, 'category', value)}
          >
            <SelectTrigger className={`bg-slate-700 border-slate-600 text-white ${!isFieldFilled(observation.category) ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {dictionaries.categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name} className="text-white hover:bg-slate-600">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-300">Условия/Действия *</Label>
          <Select
            value={observation.conditions_actions}
            onValueChange={(value) => onUpdate(index, 'conditions_actions', value)}
          >
            <SelectTrigger className={`bg-slate-700 border-slate-600 text-white ${!isFieldFilled(observation.conditions_actions) ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Выберите условие/действие" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {dictionaries.conditions.map((cond) => (
                <SelectItem key={cond.id} value={cond.name} className="text-white hover:bg-slate-600">
                  {cond.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-300">Вредные/опасные факторы *</Label>
          <Select
            value={observation.hazard_factors}
            onValueChange={(value) => onUpdate(index, 'hazard_factors', value)}
          >
            <SelectTrigger className={`bg-slate-700 border-slate-600 text-white ${!isFieldFilled(observation.hazard_factors) ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Выберите фактор" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {dictionaries.hazards.map((hazard) => (
                <SelectItem key={hazard.id} value={hazard.name} className="text-white hover:bg-slate-600">
                  {hazard.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-300">Предложение по устранению *</Label>
          <Textarea
            value={observation.measures}
            onChange={(e) => onUpdate(index, 'measures', e.target.value)}
            className={`bg-slate-700 border-slate-600 text-white min-h-[80px] ${!isFieldFilled(observation.measures) ? 'border-red-500' : ''}`}
            placeholder="Введите меры по устранению"
          />
        </div>

        <div>
          <Label className="text-slate-300">Фильтр по подразделению</Label>
          <Select
            value={subdivisionFilter}
            onValueChange={onSubdivisionFilterChange}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Все подразделения" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="" className="text-white hover:bg-slate-600">
                Все подразделения
              </SelectItem>
              {uniqueSubdivisions.map((subdivision) => (
                <SelectItem key={subdivision} value={subdivision} className="text-white hover:bg-slate-600">
                  {subdivision}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-300">Ответственный за устранение *</Label>
          <Select
            value={observation.responsible_person}
            onValueChange={(value) => onUpdate(index, 'responsible_person', value)}
          >
            <SelectTrigger className={`bg-slate-700 border-slate-600 text-white ${!isFieldFilled(observation.responsible_person) ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Выберите ответственного" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {filteredUsers.map((user) => (
                <SelectItem key={user.id} value={user.fio} className="text-white hover:bg-slate-600">
                  {user.fio} - {user.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-300">Срок устранения *</Label>
          <Input
            type="date"
            value={observation.deadline}
            onChange={(e) => onUpdate(index, 'deadline', e.target.value)}
            className={`bg-slate-700 border-slate-600 text-white ${!isFieldFilled(observation.deadline) ? 'border-red-500' : ''}`}
          />
        </div>

        <div>
          <Label className="text-slate-300">Фото наблюдения</Label>
          <Input
            type="file"
            accept="*/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onUpdate(index, 'photo_file', file);
            }}
            className="bg-slate-700 border-slate-600 text-white"
          />
          {observation.photo_file && (
            <div className="mt-2 flex items-center gap-2 text-green-500">
              <Icon name="CheckCircle" size={16} />
              <span className="text-sm">Файл загружен: {observation.photo_file.name}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};