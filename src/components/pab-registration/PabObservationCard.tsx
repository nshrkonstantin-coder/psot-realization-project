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
  email: string;
}

interface PabObservationCardProps {
  observation: Observation;
  index: number;
  dictionaries: Dictionaries;
  orgUsers: OrgUser[];
  subdivisionFilter: string;
  onSubdivisionFilterChange: (value: string) => void;
  onUpdate: (index: number, field: keyof Observation, value: string) => void;
  onPhotoChange: (index: number, file: File | null) => void;
}

export const PabObservationCard = ({
  observation,
  index,
  dictionaries,
  orgUsers,
  subdivisionFilter,
  onSubdivisionFilterChange,
  onUpdate,
  onPhotoChange,
}: PabObservationCardProps) => {
  return (
    <Card className="bg-white border border-gray-200 p-8 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Наблюдение №{observation.observation_number} *
      </h2>
      <div className="space-y-6">
        <div>
          <Label className="text-gray-700 mb-2 block">
            Наблюдение №{observation.observation_number} *
          </Label>
          <Textarea
            value={observation.description}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            className={`border-gray-300 text-gray-900 min-h-[100px] ${observation.description ? 'bg-green-50' : ''}`}
            placeholder="Кратко опишите ситуацию..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-red-600 mb-2 block">Категория наблюдений *</Label>
            <Select
              value={observation.category}
              onValueChange={(value) => onUpdate(index, 'category', value)}
            >
              <SelectTrigger className={`border-gray-300 text-gray-900 ${observation.category ? 'bg-green-50' : ''}`}>
                <SelectValue placeholder="-Не выбрано-" />
              </SelectTrigger>
              <SelectContent>
                {dictionaries.categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-700 mb-2 block">Вид условий и действий *</Label>
            <Select
              value={observation.conditions_actions}
              onValueChange={(value) => onUpdate(index, 'conditions_actions', value)}
            >
              <SelectTrigger className={`border-gray-300 text-gray-900 ${observation.conditions_actions ? 'bg-green-50' : ''}`}>
                <SelectValue placeholder="-Не выбрано-" />
              </SelectTrigger>
              <SelectContent>
                {dictionaries.conditions.map((cond) => (
                  <SelectItem key={cond.id} value={cond.name}>
                    {cond.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-red-600 mb-2 block">Опасные факторы *</Label>
          <Select
            value={observation.hazard_factors}
            onValueChange={(value) => onUpdate(index, 'hazard_factors', value)}
          >
            <SelectTrigger className={`border-gray-300 text-gray-900 ${observation.hazard_factors ? 'bg-green-50' : ''}`}>
              <SelectValue placeholder="-Не выбрано-" />
            </SelectTrigger>
            <SelectContent>
              {dictionaries.hazards.map((hazard) => (
                <SelectItem key={hazard.id} value={hazard.name}>
                  {hazard.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-gray-700 mb-2 block">Мероприятия *</Label>
          <Textarea
            value={observation.measures}
            onChange={(e) => onUpdate(index, 'measures', e.target.value)}
            className={`border-gray-300 text-gray-900 min-h-[100px] ${observation.measures ? 'bg-green-50' : ''}`}
            placeholder="Что нужно сделать..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-gray-700 mb-2 block">Ответственный за выполнение *</Label>
            
            {(() => {
              const uniqueSubdivisions = Array.from(new Set(orgUsers.map(u => u.subdivision)));
              const filteredUsers = subdivisionFilter && subdivisionFilter !== 'all'
                ? orgUsers.filter(u => u.subdivision === subdivisionFilter)
                : orgUsers;
              
              return (
                <>
                  {uniqueSubdivisions.length > 1 && (
                    <Select
                      value={subdivisionFilter}
                      onValueChange={onSubdivisionFilterChange}
                    >
                      <SelectTrigger className="border-gray-300 text-gray-900 mb-2">
                        <SelectValue placeholder="Фильтр по подразделению" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все подразделения</SelectItem>
                        {uniqueSubdivisions.map((subdivision) => (
                          <SelectItem key={subdivision} value={subdivision}>
                            {subdivision}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Select
                    value={observation.responsible_person}
                    onValueChange={(value) => onUpdate(index, 'responsible_person', value)}
                  >
                    <SelectTrigger className={`border-gray-300 text-gray-900 ${observation.responsible_person ? 'bg-green-50' : ''}`}>
                      <SelectValue placeholder="Выберите из списка" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUsers.map((user) => (
                        <SelectItem key={user.id} value={user.fio}>
                          {user.fio} - {user.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              );
            })()}
          </div>

          <div>
            <Label className="text-gray-700 mb-2 block">Срок *</Label>
            <Input
              type="date"
              value={observation.deadline}
              onChange={(e) => onUpdate(index, 'deadline', e.target.value)}
              className={`border-gray-300 text-gray-900 ${observation.deadline ? 'bg-green-50' : ''}`}
            />
          </div>
        </div>

        <div>
          <Label className="text-gray-700 mb-2 block">Фотография нарушения</Label>
          <div className="flex items-center gap-4">
            <label className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 ${observation.photo_file ? 'bg-green-50' : ''}`}>
              <Icon name="Image" size={20} className="text-gray-600" />
              <span className="text-gray-700">Выберите файл</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onPhotoChange(index, e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
            {observation.photo_file && (
              <span className="text-sm text-gray-600">{observation.photo_file.name}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};