import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

export interface Organization {
  id: number;
  name: string;
  registration_code: string;
}

export function useCreateUser() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fio, setFio] = useState('');
  const [company, setCompany] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatedLoginUrl, setGeneratedLoginUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    const generateQrCode = async () => {
      if (company) {
        const selectedOrg = organizations.find(org => org.name === company);
        console.log('🔍 Selected organization:', selectedOrg);
        console.log('🔍 Registration code:', selectedOrg?.registration_code);
        const orgCode = selectedOrg?.registration_code || '';
        const loginUrl = orgCode
          ? `${window.location.origin}/org/${orgCode}`
          : window.location.origin;
        console.log('🔗 Generated login URL:', loginUrl);
        setGeneratedLoginUrl(loginUrl);

        try {
          const qrDataUrl = await QRCode.toDataURL(loginUrl, {
            width: 200,
            margin: 2,
            color: {
              dark: '#9333ea',
              light: '#ffffff'
            }
          });
          setQrCodeDataUrl(qrDataUrl);
        } catch (error) {
          console.error('Ошибка генерации QR-кода:', error);
        }
      } else {
        setGeneratedLoginUrl('');
        setQrCodeDataUrl('');
      }
    };

    generateQrCode();
  }, [company, organizations]);

  const loadOrganizations = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b?action=list', {
        headers: {
          'X-User-Id': userId || ''
        }
      });
      const data = await response.json();

      if (data.success && data.organizations) {
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast({ title: 'Ошибка загрузки списка организаций', variant: 'destructive' });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const copyLoginLink = () => {
    navigator.clipboard.writeText(generatedLoginUrl);
    toast({ title: 'Ссылка скопирована!', description: 'Ссылка для входа в буфере обмена' });
  };

  const downloadQrCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `qr-code-${company.replace(/\s+/g, '-')}.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'QR-код скачан!', description: 'Файл сохранён на устройстве' });
  };

  const printQrCode = () => {
    if (!qrCodeDataUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Ошибка', description: 'Не удалось открыть окно печати', variant: 'destructive' });
      return;
    }

    const selectedOrg = organizations.find(org => org.name === company);
    const orgCode = selectedOrg?.registration_code || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR-код для входа - ${company}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 20px;
              background: white;
            }
            .container {
              max-width: 700px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #9333ea;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #9333ea;
              font-size: 32px;
              margin-bottom: 8px;
              font-weight: 700;
            }
            .header h2 {
              color: #333;
              font-size: 22px;
              font-weight: 500;
            }
            .content {
              display: flex;
              gap: 30px;
              margin-bottom: 30px;
              align-items: center;
            }
            .qr-section {
              flex-shrink: 0;
            }
            .qr-container {
              background: white;
              border: 4px solid #9333ea;
              border-radius: 16px;
              padding: 15px;
              box-shadow: 0 4px 12px rgba(147, 51, 234, 0.15);
            }
            .qr-container img {
              display: block;
              width: 250px;
              height: 250px;
            }
            .qr-label {
              text-align: center;
              margin-top: 10px;
              font-size: 14px;
              color: #6b7280;
              font-weight: 500;
            }
            .instructions {
              flex: 1;
            }
            .instructions h3 {
              color: #9333ea;
              font-size: 20px;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .instructions ol {
              margin-left: 20px;
              line-height: 2;
            }
            .instructions li {
              font-size: 15px;
              color: #374151;
              margin-bottom: 8px;
            }
            .details {
              background: #f9fafb;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 25px;
              margin-bottom: 25px;
            }
            .details h3 {
              color: #9333ea;
              font-size: 18px;
              margin-bottom: 15px;
              font-weight: 600;
            }
            .detail-row {
              display: flex;
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #4b5563;
              min-width: 160px;
              font-size: 15px;
            }
            .detail-value {
              color: #111827;
              flex: 1;
              font-size: 15px;
            }
            .code {
              font-family: 'Courier New', monospace;
              background: #e5e7eb;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 16px;
              font-weight: bold;
              color: #9333ea;
              display: inline-block;
            }
            .url {
              word-break: break-all;
              color: #2563eb;
              font-weight: 500;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
              font-size: 13px;
            }
            .footer-date {
              font-weight: 600;
              color: #374151;
              margin-bottom: 5px;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Система АСУБТ</h1>
              <h2>${company}</h2>
            </div>
            
            <div class="content">
              <div class="qr-section">
                <div class="qr-container">
                  <img src="${qrCodeDataUrl}" alt="QR Code" />
                </div>
                <div class="qr-label">📱 Сканируйте камерой</div>
              </div>
              
              <div class="instructions">
                <h3>📋 Инструкция по входу</h3>
                <ol>
                  <li>Откройте камеру телефона</li>
                  <li>Наведите на QR-код</li>
                  <li>Нажмите на уведомление</li>
                  <li>Введите учётные данные</li>
                </ol>
              </div>
            </div>
            
            <div class="details">
              <h3>🔐 Данные для доступа</h3>
              <div class="detail-row">
                <div class="detail-label">🔗 Ссылка для входа:</div>
                <div class="detail-value"><span class="url">${generatedLoginUrl}</span></div>
              </div>
              <div class="detail-row">
                <div class="detail-label">🏢 Код предприятия:</div>
                <div class="detail-value"><span class="code">${orgCode}</span></div>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-date">Дата создания: ${new Date().toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
              <div>Автоматизированная система управления безопасностью труда</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);

    toast({ title: '🖨️ Печать QR-кода', description: 'Открыто окно печати' });
  };

  const printCredentialsWithQr = () => {
    if (!qrCodeDataUrl || !email || !password) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Ошибка', description: 'Не удалось открыть окно печати', variant: 'destructive' });
      return;
    }

    const selectedOrg = organizations.find(org => org.name === company);
    const orgCode = selectedOrg?.registration_code || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Учётные данные - ${fio}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 20px;
              background: white;
            }
            .container {
              max-width: 700px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #9333ea;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #9333ea;
              font-size: 32px;
              margin-bottom: 8px;
              font-weight: 700;
            }
            .header h2 {
              color: #333;
              font-size: 22px;
              font-weight: 500;
            }
            .user-info {
              background: linear-gradient(135deg, #9333ea15, #ec489915);
              border: 2px solid #9333ea;
              border-radius: 12px;
              padding: 25px;
              margin-bottom: 25px;
              text-align: center;
            }
            .user-info h3 {
              color: #9333ea;
              font-size: 24px;
              margin-bottom: 10px;
            }
            .user-info p {
              color: #6b7280;
              font-size: 16px;
            }
            .content {
              display: flex;
              gap: 30px;
              margin-bottom: 30px;
              align-items: flex-start;
            }
            .qr-section {
              flex-shrink: 0;
            }
            .qr-container {
              background: white;
              border: 4px solid #9333ea;
              border-radius: 16px;
              padding: 15px;
              box-shadow: 0 4px 12px rgba(147, 51, 234, 0.15);
            }
            .qr-container img {
              display: block;
              width: 220px;
              height: 220px;
            }
            .qr-label {
              text-align: center;
              margin-top: 10px;
              font-size: 14px;
              color: #6b7280;
              font-weight: 500;
            }
            .credentials {
              flex: 1;
            }
            .credentials h3 {
              color: #9333ea;
              font-size: 20px;
              margin-bottom: 15px;
              font-weight: 600;
            }
            .credential-box {
              background: #f9fafb;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 12px;
            }
            .credential-label {
              font-size: 12px;
              color: #6b7280;
              font-weight: 500;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .credential-value {
              font-size: 18px;
              font-weight: 700;
              color: #111827;
              font-family: 'Courier New', monospace;
            }
            .details {
              background: #f9fafb;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 25px;
              margin-bottom: 25px;
            }
            .details h3 {
              color: #9333ea;
              font-size: 18px;
              margin-bottom: 15px;
              font-weight: 600;
            }
            .detail-row {
              display: flex;
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #4b5563;
              min-width: 160px;
              font-size: 15px;
            }
            .detail-value {
              color: #111827;
              flex: 1;
              font-size: 15px;
            }
            .code {
              font-family: 'Courier New', monospace;
              background: #e5e7eb;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 16px;
              font-weight: bold;
              color: #9333ea;
              display: inline-block;
            }
            .url {
              word-break: break-all;
              color: #2563eb;
              font-weight: 500;
            }
            .instructions {
              background: #fffbeb;
              border: 2px solid #fbbf24;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 25px;
            }
            .instructions h3 {
              color: #d97706;
              font-size: 16px;
              margin-bottom: 12px;
              font-weight: 600;
            }
            .instructions ol {
              margin-left: 20px;
              line-height: 1.8;
            }
            .instructions li {
              font-size: 14px;
              color: #374151;
              margin-bottom: 6px;
            }
            .security-notice {
              background: #fef2f2;
              border: 2px solid #fca5a5;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 25px;
              font-size: 13px;
              color: #991b1b;
              font-weight: 500;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
              font-size: 13px;
            }
            .footer-date {
              font-weight: 600;
              color: #374151;
              margin-bottom: 5px;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Система АСУБТ</h1>
              <h2>${company}</h2>
            </div>
            
            <div class="user-info">
              <h3>👤 ${fio}</h3>
              <p>${position} · ${subdivision}</p>
            </div>
            
            <div class="content">
              <div class="qr-section">
                <div class="qr-container">
                  <img src="${qrCodeDataUrl}" alt="QR Code" />
                </div>
                <div class="qr-label">📱 Сканируйте для входа</div>
              </div>
              
              <div class="credentials">
                <h3>🔐 Данные для входа</h3>
                <div class="credential-box">
                  <div class="credential-label">📧 Email (Логин)</div>
                  <div class="credential-value">${email}</div>
                </div>
                <div class="credential-box">
                  <div class="credential-label">🔑 Пароль</div>
                  <div class="credential-value">${password}</div>
                </div>
              </div>
            </div>
            
            <div class="details">
              <h3>🌐 Информация для доступа</h3>
              <div class="detail-row">
                <div class="detail-label">🔗 Ссылка для входа:</div>
                <div class="detail-value"><span class="url">${generatedLoginUrl}</span></div>
              </div>
              <div class="detail-row">
                <div class="detail-label">🏢 Код предприятия:</div>
                <div class="detail-value"><span class="code">${orgCode}</span></div>
              </div>
            </div>
            
            <div class="instructions">
              <h3>📋 Инструкция по первому входу</h3>
              <ol>
                <li><strong>Через QR-код:</strong> Откройте камеру телефона, наведите на QR-код и нажмите на уведомление</li>
                <li><strong>Через браузер:</strong> Перейдите по ссылке выше или введите её в адресную строку</li>
                <li>Введите ваш Email и Пароль из раздела "Данные для входа"</li>
                <li>После первого входа рекомендуется сменить пароль в настройках профиля</li>
              </ol>
            </div>
            
            <div class="security-notice">
              <p>⚠️ ВАЖНО: Храните эти данные в безопасном месте. Не передавайте пароль третьим лицам.</p>
            </div>
            
            <div class="footer">
              <div class="footer-date">Дата создания: ${new Date().toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
              <div>Автоматизированная система управления безопасностью труда</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);

    toast({ title: '🖨️ Печать учётных данных', description: 'Открыто окно печати с полными данными пользователя' });
  };

  const sendCredentialsByEmail = async (userEmail: string, userPassword: string) => {
    setSendingEmail(true);
    try {
      const response = await fetch('https://functions.poehali.dev/b00816fd-60cd-4a53-9b44-802868bfbb11', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: [
            {
              email: userEmail,
              password: userPassword
            }
          ],
          loginUrl: generatedLoginUrl,
          qrCodeDataUrl: qrCodeDataUrl
        })
      });

      const data = await response.json();

      if (data.success && data.sent_count > 0) {
        toast({
          title: '✉️ Email отправлен!',
          description: `Учётные данные отправлены на ${userEmail}`
        });
      } else {
        toast({
          title: 'Ошибка отправки email',
          description: data.failed_emails?.[0]?.error || 'Неизвестная ошибка',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Ошибка отправки email',
        description: 'Не удалось отправить письмо',
        variant: 'destructive'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          email,
          password,
          fio,
          company,
          subdivision,
          position,
          role,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const credentialsText = `Добро пожаловать в АСУБТ!\n\n` +
          `Ваши данные для входа:\n` +
          `Email: ${data.email}\n` +
          `Пароль: ${password}\n\n` +
          `Ссылка для входа: ${generatedLoginUrl}\n` +
          `${generatedLoginUrl.includes('/org/') ? `Код предприятия: ${generatedLoginUrl.split('/org/')[1]}` : ''}`;

        toast({
          title: 'Пользователь создан!',
          description: `Данные скопированы в буфер обмена`
        });

        navigator.clipboard.writeText(credentialsText);

        if (sendEmail) {
          await sendCredentialsByEmail(email, password);
        }

        navigate('/users-management');
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка создания пользователя', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return {
    email, setEmail,
    password, setPassword,
    fio, setFio,
    company, setCompany,
    subdivision, setSubdivision,
    position, setPosition,
    role, setRole,
    loading,
    organizations,
    loadingOrgs,
    sendEmail, setSendEmail,
    sendingEmail,
    generatedLoginUrl,
    qrCodeDataUrl,
    handleCreateUser,
    generatePassword,
    copyLoginLink,
    downloadQrCode,
    printQrCode,
    printCredentialsWithQr,
  };
}
