import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface ViolationItem {
  item_number: number;
  description: string;
  photos: Array<{ data: string }>;
  measures: string;
  deadline: string;
  responsible_user_id?: string;
}

interface ViolationsTableProps {
  violations: ViolationItem[];
  setViolations: (violations: ViolationItem[]) => void;
  orgUsers: Array<{ id: number; fio: string; position: string }>;
}

export default function ViolationsTable({ violations, setViolations, orgUsers }: ViolationsTableProps) {
  const addViolationRow = () => {
    setViolations([
      ...violations,
      {
        item_number: violations.length + 1,
        description: '',
        photos: [],
        measures: '',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ]);
  };

  const deleteViolationRow = () => {
    if (violations.length > 2) {
      const updated = violations.slice(0, -1);
      setViolations(updated);
    } else {
      toast.error('Таблица должна содержать минимум две строки');
    }
  };

  const updateViolation = (index: number, field: 'description' | 'measures' | 'deadline' | 'responsible_user_id', value: string) => {
    const updated = [...violations];
    if (field === 'responsible_user_id') {
      updated[index].responsible_user_id = value;
    } else {
      updated[index][field] = value;
    }
    setViolations(updated);
  };

  const handlePhotoUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const updated = [...violations];
      updated[index].photos.push({
        data: e.target?.result as string
      });
      setViolations(updated);
      toast.success('Фото добавлено');
    };
    
    reader.readAsDataURL(file);
  };

  const removePhoto = (violationIndex: number, photoIndex: number) => {
    const updated = [...violations];
    updated[violationIndex].photos.splice(photoIndex, 1);
    setViolations(updated);
  };

  const handleTextareaChange = (index: number, field: 'description' | 'measures', value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateViolation(index, field, value);
    event.target.style.height = 'auto';
    event.target.style.height = event.target.scrollHeight + 'px';
  };

  return (
    <div className="violations-section mb-6">
      <p className="font-semibold text-slate-900 dark:!text-slate-900 mb-3">Необходимо устранить следующие нарушения в указанные сроки:</p>
      <table className="w-full border-collapse border border-slate-300 dark:!border-slate-300">
        <thead>
          <tr className="bg-slate-100 dark:!bg-slate-100">
            <th className="border border-slate-300 dark:!border-slate-300 p-2 w-12 dark:!text-slate-900">п/п</th>
            <th className="border border-slate-300 dark:!border-slate-300 p-2 dark:!text-slate-900">Краткое изложение выявленных нарушений с указанием места обнаружения (при необходимости вкладывать фото)</th>
            <th className="border border-slate-300 dark:!border-slate-300 p-2 dark:!text-slate-900">Предлагаемые меры, ответственные за выполнение и срок устранения нарушений</th>
          </tr>
        </thead>
        <tbody>
          {violations.map((item, index) => (
            <tr key={index}>
              <td className="border border-slate-300 dark:!border-slate-300 p-2 text-center dark:!text-slate-900">{item.item_number}.</td>
              <td className={`border border-slate-300 dark:!border-slate-300 p-2 transition-colors ${item.description.trim() ? 'bg-green-100' : ''}`}>
                <Textarea
                  value={item.description}
                  onChange={(e) => handleTextareaChange(index, 'description', e.target.value, e)}
                  className="w-full min-h-[80px] resize-none border-none bg-transparent print:border-none"
                  placeholder="Описание нарушения"
                />
                {item.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.photos.map((photo, photoIndex) => (
                      <div key={photoIndex} className="relative group">
                        <img src={photo.data} alt={`Фото ${photoIndex + 1}`} className="w-24 h-24 object-cover rounded border" />
                        <button
                          onClick={() => removePhoto(index, photoIndex)}
                          className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 print:hidden">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => document.getElementById(`photo-input-${index}`)?.click()}
                  >
                    <Icon name="Camera" size={16} className="mr-2" />
                    Добавить фото
                  </Button>
                  <input
                    id={`photo-input-${index}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(index, e)}
                  />
                </div>
              </td>
              <td className={`border border-slate-300 dark:!border-slate-300 p-2 transition-colors ${item.measures.trim() ? 'bg-green-100' : ''}`}>
                <Textarea
                  value={item.measures}
                  onChange={(e) => handleTextareaChange(index, 'measures', e.target.value, e)}
                  className="w-full min-h-[80px] resize-none border-none bg-transparent print:border-none dark:!text-slate-900"
                  placeholder="Меры и сроки устранения"
                />
                <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                  <div>
                    <label className="text-xs text-slate-600 dark:!text-slate-900 mb-1 block">Ответственный:</label>
                    <Select 
                      value={item.responsible_user_id || ''} 
                      onValueChange={(value) => updateViolation(index, 'responsible_user_id', value)}
                    >
                      <SelectTrigger className={`h-8 text-sm ${item.responsible_user_id ? 'bg-green-100 border-green-400' : ''}`}>
                        <SelectValue placeholder="Выберите ответственного" />
                      </SelectTrigger>
                      <SelectContent>
                        {orgUsers.map((user) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.fio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:!text-slate-900 mb-1 block">Срок выполнения:</label>
                    <input
                      type="date"
                      value={item.deadline}
                      onChange={(e) => updateViolation(index, 'deadline', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none dark:!text-slate-900"
                    />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="flex gap-3 mt-4 print:hidden">
        <Button onClick={addViolationRow} size="sm" className="bg-green-600 hover:bg-green-700">
          <Icon name="Plus" size={16} className="mr-2" />
          Добавить строку
        </Button>
        <Button onClick={deleteViolationRow} size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
          <Icon name="Minus" size={16} className="mr-2" />
          Удалить строку
        </Button>
      </div>
    </div>
  );
}