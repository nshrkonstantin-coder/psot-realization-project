import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface PabHeaderFormProps {
  docNumber: string;
  docDate: string;
  inspectorFio: string;
  inspectorPosition: string;
  location: string;
  checkedObject: string;
  department: string;
  violationPhoto: File | null;
  onDocDateChange: (value: string) => void;
  onInspectorFioChange: (value: string) => void;
  onInspectorPositionChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onCheckedObjectChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PabHeaderForm = ({
  docNumber,
  docDate,
  inspectorFio,
  inspectorPosition,
  location,
  checkedObject,
  department,
  violationPhoto,
  onDocDateChange,
  onInspectorFioChange,
  onInspectorPositionChange,
  onLocationChange,
  onCheckedObjectChange,
  onDepartmentChange,
  onPhotoChange,
}: PabHeaderFormProps) => {
  return (
    <Card className="bg-white border border-gray-200 p-8 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="text-gray-700 mb-2 block">Название листа</Label>
          <Input
            value={docNumber}
            disabled
            className="bg-gray-50 border-gray-300 text-gray-900"
          />
        </div>
        <div>
          <Label className="text-gray-700 mb-2 block">Номер документа</Label>
          <Input
            value={docNumber}
            disabled
            className="bg-gray-50 border-gray-300 text-gray-900"
          />
        </div>
        <div>
          <Label className="text-gray-700 mb-2 block">Дата *</Label>
          <Input
            type="date"
            value={docDate}
            onChange={(e) => onDocDateChange(e.target.value)}
            className={`border-gray-300 text-gray-900 ${docDate ? 'bg-green-50' : ''}`}
          />
        </div>
        <div>
          <Label className="text-gray-700 mb-2 block">ФИО проверяющего *</Label>
          <Input
            value={inspectorFio}
            onChange={(e) => onInspectorFioChange(e.target.value)}
            className={`border-gray-300 text-gray-900 ${inspectorFio ? 'bg-green-50' : ''}`}
            placeholder="УЧЕБНЫЙ"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-gray-700 mb-2 block">Должность проверяющего *</Label>
          <Input
            value={inspectorPosition}
            onChange={(e) => onInspectorPositionChange(e.target.value)}
            className={`border-gray-300 text-gray-900 ${inspectorPosition ? 'bg-green-50' : ''}`}
            placeholder="Обучение"
          />
        </div>
        <div>
          <Label className="text-gray-700 mb-2 block">Участок *</Label>
          <Input
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className={`border-gray-300 text-gray-900 ${location ? 'bg-green-50' : ''}`}
            placeholder="Участок"
          />
        </div>
        <div>
          <Label className="text-gray-700 mb-2 block">Проверяемый объект *</Label>
          <Input
            value={checkedObject}
            onChange={(e) => onCheckedObjectChange(e.target.value)}
            className={`border-gray-300 text-gray-900 ${checkedObject ? 'bg-green-50' : ''}`}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-gray-700 mb-2 block">Подразделение *</Label>
          <Input
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className={`border-gray-300 text-gray-900 ${department ? 'bg-green-50' : ''}`}
            placeholder="Напр. З/ИО"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-gray-700 mb-2 block">Фотография нарушения</Label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
              <Icon name="Image" size={20} className="text-gray-600" />
              <span className="text-gray-700">Выберите файл</span>
              <input
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
                className="hidden"
              />
            </label>
            {violationPhoto && (
              <span className="text-sm text-gray-600">{violationPhoto.name}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};