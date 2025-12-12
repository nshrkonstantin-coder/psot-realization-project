import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

interface SignatureLine {
  userId: string;
  userName: string;
  date: string;
}

interface SignatureSectionProps {
  issuerName: string;
  issuerPosition: string;
  issueDate: string;
  setIssueDate: (date: string) => void;
  acceptorSignatures: SignatureLine[];
  setAcceptorSignatures: (signatures: SignatureLine[]) => void;
  orgUsers: Array<{ id: number; fio: string; position: string; subdivision: string }>;
}

export default function SignatureSection({
  issuerName,
  issuerPosition,
  issueDate,
  setIssueDate,
  acceptorSignatures,
  setAcceptorSignatures,
  orgUsers
}: SignatureSectionProps) {
  const addSignatureLine = () => {
    setAcceptorSignatures([
      ...acceptorSignatures,
      { userId: '', userName: '', date: new Date().toISOString().split('T')[0] }
    ]);
  };

  const updateSignature = (index: number, userId: string) => {
    const user = orgUsers.find(u => String(u.id) === userId);
    const updated = [...acceptorSignatures];
    updated[index].userId = userId;
    updated[index].userName = user ? `${user.fio}, ${user.position}` : '';
    setAcceptorSignatures(updated);
  };

  const updateSignatureDate = (index: number, date: string) => {
    const updated = [...acceptorSignatures];
    updated[index].date = date;
    setAcceptorSignatures(updated);
  };

  return (
    <>
      <p className="text-slate-900 mb-6">
        О выполнении настоящего предписания прошу предоставить письменное
        уведомление в отдел ОТ и ПБ <strong>согласно дат, указанных в пунктах.</strong>
      </p>

      <div className="signature-area space-y-4 mb-6">
        <div className="flex justify-between items-center border-t border-slate-300 pt-4">
          <div>
            <strong>Предписание выдал:</strong>
            <p className="text-slate-700">{issuerName}, {issuerPosition}</p>
          </div>
          <div>
            <Label className="font-semibold">Дата:</Label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-40 print:border-none print:bg-transparent"
            />
          </div>
        </div>

        <div className="border-t border-slate-300 pt-4">
          <strong className="block mb-3">Предписание принял:</strong>
          {acceptorSignatures.map((sig, index) => (
            <div key={index} className="flex justify-between items-center gap-4 mb-3">
              <Select value={sig.userId} onValueChange={(value) => updateSignature(index, value)} disabled={orgUsers.length === 0}>
                <SelectTrigger className={`flex-grow transition-colors ${sig.userId ? 'bg-green-100 border-green-400' : ''}`}>
                  <SelectValue placeholder={orgUsers.length > 0 ? "Выберите подписавшего" : "Загрузка пользователей..."} />
                </SelectTrigger>
                <SelectContent>
                  {orgUsers.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.fio}, {user.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label className="font-semibold whitespace-nowrap">Дата:</Label>
                <Input
                  type="date"
                  value={sig.date}
                  onChange={(e) => updateSignatureDate(index, e.target.value)}
                  className="w-40 print:border-none print:bg-transparent"
                />
              </div>
            </div>
          ))}
          
          <Button onClick={addSignatureLine} size="sm" variant="outline" className="mt-2 print:hidden">
            <Icon name="Plus" size={16} className="mr-2" />
            Добавить подпись
          </Button>
        </div>
      </div>
    </>
  );
}
