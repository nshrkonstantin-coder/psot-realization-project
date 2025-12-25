import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductionControlFormProps {
  currentDate: string;
  setCurrentDate: (date: string) => void;
  docNumber: string;
  recipientUserId: string;
  setRecipientUserId: (id: string) => void;
  department: string;
  setDepartment: (dept: string) => void;
  witness: string;
  setWitness: (witness: string) => void;
  orgUsers: Array<{ id: number; fio: string; position: string; subdivision: string }>;
}

export default function ProductionControlForm({
  currentDate,
  setCurrentDate,
  docNumber,
  recipientUserId,
  setRecipientUserId,
  department,
  setDepartment,
  witness,
  setWitness,
  orgUsers
}: ProductionControlFormProps) {
  return (
    <>
      <div className="header text-center mb-6 border-b-2 border-slate-300 pb-4 print:border-black dark:!border-slate-300">
        <h3 className="text-xl font-bold text-slate-900 dark:!text-slate-900">Электронная выдача АКТа производственного контроля</h3>
        <h4 className="text-lg font-semibold text-slate-700 dark:!text-slate-700 mt-2">РОССИЙСКАЯ ФЕДЕРАЦИЯ (РОССИЯ)</h4>
        <h4 className="text-lg font-semibold text-slate-700 dark:!text-slate-700">РЕСПУБЛИКА САХА (ЯКУТИЯ)</h4>
      </div>

      <div className="company-info text-center mb-6">
        <p className="font-bold text-slate-900 dark:!text-slate-900">Акционерное Общество «Горно-рудная компания «Западная»</p>
        <p className="text-slate-700 dark:!text-slate-700">678730, Республика Саха (Якутия), Оймяконский район, п. г. т. Усть-Нера, проезд Северный, д.12.</p>
        <p className="text-slate-700 dark:!text-slate-700">тел. 8 (395) 225-52-88, доб.*1502</p>
        <div className="flex justify-between items-center mt-4">
          <Input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="w-40 print:border-none print:bg-transparent"
          />
          <span className="font-semibold text-slate-700 dark:!text-slate-700">Рудник «Бадран»</span>
        </div>
      </div>

      <div className="document-title text-center mb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:!text-slate-900 underline">ПРЕДПИСАНИЕ (АКТ) {docNumber ? `№${docNumber}` : ''}</h2>
        <p className="text-slate-700 dark:!text-slate-700 mt-2">Проверки по производственному контролю за состоянием ОТ и ПБ</p>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <Label className="font-semibold dark:!text-slate-900">Кому: *</Label>
          <Select value={recipientUserId} onValueChange={setRecipientUserId} disabled={orgUsers.length === 0}>
            <SelectTrigger className={`transition-colors ${recipientUserId ? 'bg-green-100 border-green-400' : ''}`}>
              <SelectValue placeholder={orgUsers.length > 0 ? "Выберите получателя" : "Загрузка пользователей..."} />
            </SelectTrigger>
            <SelectContent>
              {orgUsers.map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {user.fio}, {user.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-semibold dark:!text-slate-900">Наименование обследуемого подразделения общества *</Label>
          <Input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Введите название подразделения"
            className={`transition-colors ${department.trim() ? 'bg-green-100 border-green-400' : ''}`}
          />
        </div>

        <div>
          <Label className="font-semibold dark:!text-slate-900">Проверка проведена в присутствии:</Label>
          <Input
            value={witness}
            onChange={(e) => setWitness(e.target.value)}
            placeholder="ФИО присутствующего"
            className={`transition-colors ${witness.trim() ? 'bg-green-100 border-green-400' : ''}`}
          />
        </div>
      </div>
    </>
  );
}