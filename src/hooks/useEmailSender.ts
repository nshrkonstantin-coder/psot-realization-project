import { useState } from 'react';
import { toast } from 'sonner';

interface EmailResult {
  email: string;
  success: boolean;
  message: string;
  valid_format: boolean;
}

interface EmailResponse {
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  results: EmailResult[];
  summary: {
    sent_to: string[];
    failed_to: { email: string; reason: string }[];
  };
}

interface SendEmailParams {
  recipients: string[];
  subject: string;
  html_content: string;
  sender_name?: string;
}

export const useEmailSender = () => {
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<EmailResponse | null>(null);

  const sendEmail = async ({
    recipients,
    subject,
    html_content,
    sender_name = 'АСУБТ',
  }: SendEmailParams): Promise<EmailResponse | null> => {
    setSending(true);
    
    try {
      const response = await fetch('https://functions.poehali.dev/ca9e0986-48d7-46a1-b0be-7a98ddf4c429', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          subject,
          html_content,
          sender_name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Ошибка отправки писем', {
          description: data.error || 'Проверьте настройки SMTP',
        });
        return null;
      }

      setLastResult(data);

      // Показываем результат
      if (data.sent > 0 && data.failed === 0) {
        toast.success(`Все письма отправлены (${data.sent})`, {
          description: `Письма доставлены на ${data.sent} адрес(ов)`,
        });
      } else if (data.sent > 0 && data.failed > 0) {
        toast.warning(`Отправлено частично: ${data.sent} из ${data.total}`, {
          description: `Не удалось отправить на ${data.failed} адрес(ов)`,
        });
      } else {
        toast.error('Не удалось отправить письма', {
          description: `Ошибки на всех ${data.failed} адресах`,
        });
      }

      return data;
    } catch (error) {
      toast.error('Ошибка соединения', {
        description: 'Не удалось подключиться к серверу отправки',
      });
      return null;
    } finally {
      setSending(false);
    }
  };

  return {
    sendEmail,
    sending,
    lastResult,
  };
};