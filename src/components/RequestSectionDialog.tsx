import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const SUPPORT_URL = 'https://functions.poehali.dev/e519c776-33cc-4cea-bdaa-1d10b684b777';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionTitle: string;
}

const RequestSectionDialog = ({ open, onOpenChange, sectionTitle }: Props) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState(localStorage.getItem('userCompany') || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !description.trim()) {
      toast.error('Заполните имя, почту и описание задачи');
      return;
    }
    if (!email.includes('@')) {
      toast.error('Проверьте адрес почты');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(SUPPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_request',
          requestType: 'new_feature',
          description: `ЗАЯВКА НА РАЗРАБОТКУ РАЗДЕЛА: «${sectionTitle}»\n\nКонтактный телефон: ${phone || 'не указан'}\n\nЧто нужно заказчику:\n${description}`,
          userFio: name,
          userCompany: company || 'Не указана',
          userEmail: email,
          userId: localStorage.getItem('userId') || 'Не указан',
          attachments: [],
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSent(true);
      } else {
        toast.error(data.error || 'Не удалось отправить заявку');
      }
    } catch {
      toast.error('Не удалось отправить заявку. Проверьте интернет и попробуйте снова');
    } finally {
      setSending(false);
    }
  };

  const handleClose = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setTimeout(() => {
        setSent(false);
        setDescription('');
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {sent ? (
          <div className="text-center py-6">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Icon name="CheckCircle2" size={40} className="text-green-600" />
            </div>
            <DialogTitle className="text-2xl mb-2">Заявка отправлена</DialogTitle>
            <DialogDescription className="mb-6">
              Мы получили вашу заявку на раздел «{sectionTitle}» и свяжемся с вами по указанной почте.
            </DialogDescription>
            <Button onClick={() => handleClose(false)}>Закрыть</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Заявка на разработку</DialogTitle>
              <DialogDescription>
                Раздел «{sectionTitle}». Опишите, что вам нужно, и мы подготовим решение под ваше предприятие.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="req-name">Ваше имя *</Label>
                  <Input id="req-name" value={name} onChange={e => setName(e.target.value)} placeholder="Иванов Иван" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="req-company">Предприятие</Label>
                  <Input id="req-company" value={company} onChange={e => setCompany(e.target.value)} placeholder="ООО «Название»" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="req-email">Почта для ответа *</Label>
                  <Input id="req-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.ru" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="req-phone">Телефон</Label>
                  <Input id="req-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 900 000-00-00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="req-desc">Что нужно в этом разделе *</Label>
                <Textarea
                  id="req-desc"
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Опишите задачи, которые должен решать раздел, какие данные вести, какие отчёты получать"
                />
              </div>
              <Button type="submit" disabled={sending} className="w-full">
                {sending ? (
                  <>
                    <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                    Отправляем...
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={18} className="mr-2" />
                    Отправить заявку
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RequestSectionDialog;
