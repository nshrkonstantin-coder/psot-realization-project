import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useEmailSender } from '@/hooks/useEmailSender';
import EmailStatusDialog from '@/components/EmailStatusDialog';

export default function EmailTestPage() {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('Тестовое письмо АСУБТ');
  const [message, setMessage] = useState('Это тестовое письмо для проверки работы email системы.');
  const { sendEmail, sending, lastResult } = useEmailSender();
  const [showStatus, setShowStatus] = useState(false);

  const handleSendTest = async () => {
    const emailList = recipients
      .split(/[,;\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emailList.length === 0) {
      return;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">АСУБТ</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Система управления безопасностью труда</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">${subject}</h2>
          <div style="color: #4b5563; line-height: 1.6; font-size: 16px;">
            ${message.split('\n').map(line => `<p style="margin: 0 0 10px 0;">${line}</p>`).join('')}
          </div>
          <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Это автоматическое письмо от системы АСУБТ. Не отвечайте на это письмо.
            </p>
          </div>
        </div>
      </div>
    `;

    const result = await sendEmail({
      recipients: emailList,
      subject,
      html_content: htmlContent,
      sender_name: 'АСУБТ'
    });

    if (result) {
      setShowStatus(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-blue-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Icon name="Mail" size={28} />
              Тестирование Email системы
            </CardTitle>
            <CardDescription className="text-blue-100">
              Проверка работы отправки писем и SMTP настроек
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Информация о настройках */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={20} className="text-blue-600 mt-1 flex-shrink-0" />
                <div className="text-sm text-blue-900 space-y-2">
                  <p className="font-semibold">Требуемые настройки SMTP в секретах проекта:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code className="bg-blue-100 px-2 py-0.5 rounded">SMTP_HOST</code> - SMTP сервер (например: smtp.yandex.ru, smtp.gmail.com)</li>
                    <li><code className="bg-blue-100 px-2 py-0.5 rounded">SMTP_PORT</code> - Порт (обычно 587 для STARTTLS или 465 для SSL)</li>
                    <li><code className="bg-blue-100 px-2 py-0.5 rounded">SMTP_USER</code> - Email для авторизации</li>
                    <li><code className="bg-blue-100 px-2 py-0.5 rounded">SMTP_PASSWORD</code> - Пароль или пароль приложения</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-3">
                    💡 Для Gmail используйте "Пароль приложения" вместо обычного пароля
                  </p>
                </div>
              </div>
            </div>

            {/* Форма */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Получатели (через запятую, точку с запятой или новую строку):
                </label>
                <Textarea
                  placeholder="example1@mail.com, example2@mail.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Тема письма:
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Тема письма"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Сообщение:
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Текст сообщения"
                />
              </div>

              <Button
                onClick={handleSendTest}
                disabled={sending || !recipients || !subject}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                size="lg"
              >
                {sending ? (
                  <>
                    <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={20} className="mr-2" />
                    Отправить тестовое письмо
                  </>
                )}
              </Button>
            </div>

            {/* Последний результат */}
            {lastResult && !showStatus && (
              <div className="border-t pt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowStatus(true)}
                  className="w-full"
                >
                  <Icon name="BarChart3" size={18} className="mr-2" />
                  Показать последний результат отправки
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Примеры ошибок и решений */}
        <Card className="mt-6 border-orange-200">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
              <Icon name="AlertCircle" size={20} />
              Частые ошибки и решения
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">❌ "Ошибка аутентификации SMTP"</h4>
                <p className="text-gray-700 ml-4">
                  → Проверьте правильность SMTP_USER и SMTP_PASSWORD<br />
                  → Для Gmail создайте "Пароль приложения" в настройках аккаунта
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">❌ "Email отклонен сервером"</h4>
                <p className="text-gray-700 ml-4">
                  → Email адрес получателя не существует или неверный<br />
                  → Проверьте правильность написания адреса
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">❌ "Не удалось подключиться к SMTP серверу"</h4>
                <p className="text-gray-700 ml-4">
                  → Проверьте SMTP_HOST и SMTP_PORT<br />
                  → Убедитесь что используется правильный порт (587 или 465)
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">❌ "Неверный формат email адреса"</h4>
                <p className="text-gray-700 ml-4">
                  → Email адрес не соответствует формату name@domain.com<br />
                  → Проверьте наличие @ и доменной части
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Диалог результатов */}
      {lastResult && (
        <EmailStatusDialog
          open={showStatus}
          onOpenChange={setShowStatus}
          results={lastResult.results}
          summary={lastResult.summary}
          total={lastResult.total}
          sent={lastResult.sent}
          failed={lastResult.failed}
        />
      )}
    </div>
  );
}
