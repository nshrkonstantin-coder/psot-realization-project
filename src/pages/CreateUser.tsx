import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import QRCode from 'qrcode';

interface Organization {
  id: number;
  name: string;
  registration_code: string;
}

const CreateUser = () => {
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

        // Отправляем email, если выбрана опция
        if (sendEmail) {
          await sendCredentialsByEmail(email, password);
        }
        
        navigate('/users-management');
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка создания пользователя', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  // Обновляем ссылку и QR-код при изменении выбранной компании
  useEffect(() => {
    const generateQrCode = async () => {
      if (company) {
        const selectedOrg = organizations.find(org => org.name === company);
        const orgCode = selectedOrg?.registration_code || '';
        const loginUrl = orgCode 
          ? `${window.location.origin}/org/${orgCode}`
          : window.location.origin;
        setGeneratedLoginUrl(loginUrl);
        
        // Генерируем QR-код
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
              font-weight: 600;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .credential-value {
              font-size: 18px;
              color: #111827;
              font-weight: 600;
              font-family: 'Courier New', monospace;
              word-break: break-all;
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
              font-size: 18px;
              margin-bottom: 12px;
              font-weight: 600;
            }
            .instructions ol {
              margin-left: 20px;
              line-height: 1.8;
            }
            .instructions li {
              font-size: 15px;
              color: #78350f;
              margin-bottom: 6px;
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
            .security-notice {
              background: #fef2f2;
              border: 2px solid #fca5a5;
              border-radius: 8px;
              padding: 15px;
              margin-top: 20px;
              text-align: center;
            }
            .security-notice p {
              color: #991b1b;
              font-size: 13px;
              font-weight: 600;
            }
            @media print {
              body {
                padding: 0;
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
              <p>${position} • ${subdivision}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate(-1)} className="border-purple-600/50">
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-pink-700 p-3 rounded-xl shadow-lg">
              <Icon name="UserPlus" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Создать пользователя</h1>
              <p className="text-purple-400">Регистрация нового пользователя с назначением роли</p>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-purple-600/30 p-8">
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div>
              <Label className="text-gray-300">ФИО</Label>
              <Input
                value={fio}
                onChange={(e) => setFio(e.target.value)}
                className="bg-slate-700/50 border-purple-600/30 text-white"
                placeholder="Иванов Иван Иванович"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-700/50 border-purple-600/30 text-white"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Пароль</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-700/50 border-purple-600/30 text-white"
                  placeholder="Введите пароль"
                  required
                />
                <Button
                  type="button"
                  onClick={generatePassword}
                  variant="outline"
                  className="border-purple-600/50 text-purple-400"
                >
                  <Icon name="Shuffle" size={20} />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Минимум 6 символов</p>
            </div>

            <div>
              <Label className="text-gray-300">Компания (предприятие)</Label>
              {loadingOrgs ? (
                <div className="flex items-center gap-2 bg-slate-700/50 border border-purple-600/30 rounded-md px-3 py-2">
                  <Icon name="Loader2" size={16} className="animate-spin text-purple-400" />
                  <span className="text-gray-400 text-sm">Загрузка организаций...</span>
                </div>
              ) : organizations.length > 0 ? (
                <>
                  <Select value={company} onValueChange={setCompany} required>
                    <SelectTrigger className="bg-slate-700/50 border-purple-600/30 text-white">
                      <SelectValue placeholder="Выберите предприятие" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.name}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    Доступно {organizations.length} предприятий
                  </p>
                  
                  {generatedLoginUrl && (
                    <div className="mt-3 p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/40 rounded-lg">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-2">
                            <Icon name="Link" size={18} className="text-purple-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-purple-300 font-semibold mb-1">Ссылка для входа с кодом предприятия:</p>
                              <p className="text-sm text-white font-mono break-all bg-slate-800/50 px-2 py-1 rounded">{generatedLoginUrl}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={copyLoginLink}
                            className="w-full mt-2 border-purple-500/50 hover:bg-purple-500/10"
                          >
                            <Icon name="Copy" size={16} className="mr-2" />
                            Скопировать ссылку
                          </Button>
                        </div>
                        
                        {qrCodeDataUrl && (
                          <div className="flex flex-col items-center gap-2">
                            <div className="bg-white p-2 rounded-lg shadow-lg">
                              <img src={qrCodeDataUrl} alt="QR Code" className="w-32 h-32" />
                            </div>
                            <p className="text-xs text-purple-300 text-center font-semibold">QR-код для<br/>быстрого входа</p>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={downloadQrCode}
                                className="border-purple-500/50 hover:bg-purple-500/10 text-xs flex-1"
                              >
                                <Icon name="Download" size={14} className="mr-1" />
                                Скачать
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={printQrCode}
                                className="border-purple-500/50 hover:bg-purple-500/10 text-xs flex-1"
                              >
                                <Icon name="Printer" size={14} className="mr-1" />
                                Печать
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-purple-300 mt-3 text-center">
                        📱 Ссылка и QR-код будут отправлены пользователю на email
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-slate-700/50 border-purple-600/30 text-white"
                  placeholder="Введите название компании"
                  required
                />
              )}
            </div>

            <div>
              <Label className="text-gray-300">Подразделение</Label>
              <Input
                value={subdivision}
                onChange={(e) => setSubdivision(e.target.value)}
                className="bg-slate-700/50 border-purple-600/30 text-white"
                placeholder="ОтПБ"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Должность</Label>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="bg-slate-700/50 border-purple-600/30 text-white"
                placeholder="Инженер"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Роль в системе</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-slate-700/50 border-purple-600/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="superadmin">Главный администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-slate-700/30 border border-purple-600/30 rounded-lg">
              <Checkbox 
                id="send-email" 
                checked={sendEmail} 
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                className="border-purple-600/50"
              />
              <div className="flex-1">
                <label
                  htmlFor="send-email"
                  className="text-sm font-medium text-white cursor-pointer flex items-center gap-2"
                >
                  <Icon name="Mail" size={16} className="text-purple-400" />
                  Отправить учётные данные на email пользователя
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  После создания пользователя ему автоматически придёт письмо с паролем и ссылкой для входа
                </p>
              </div>
            </div>

            <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={20} className="text-purple-400 mt-1" />
                <div className="text-sm text-gray-300 w-full">
                  <p className="font-semibold text-white mb-2">После создания пользователя:</p>
                  <ul className="list-disc list-inside space-y-1 mb-3">
                    <li>Данные для входа будут скопированы в буфер обмена</li>
                    <li>Отправьте их пользователю на указанный email</li>
                  </ul>
                  {company && organizations.find(org => org.name === company) && (
                    <div className="mt-3 p-3 bg-slate-800/50 rounded border border-purple-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400">Ссылка для входа:</p>
                        <Button
                          type="button"
                          onClick={copyLoginLink}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-600/20"
                        >
                          <Icon name="Copy" size={12} className="mr-1" />
                          Копировать
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-purple-300 text-sm break-all">
                          {window.location.origin}/org/{organizations.find(org => org.name === company)?.registration_code}
                        </code>
                        <Icon name="Link" size={16} className="text-purple-400 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-gray-400">
                        Код предприятия: <span className="text-yellow-400 font-mono">{organizations.find(org => org.name === company)?.registration_code}</span>
                      </p>
                    </div>
                  )}
                  {!company && (
                    <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                      <Icon name="AlertCircle" size={14} />
                      Выберите компанию для генерации ссылки
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                type="submit"
                disabled={loading || sendingEmail}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800"
              >
                {loading || sendingEmail ? (
                  <>
                    <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                    {sendingEmail ? 'Отправка email...' : 'Создание...'}
                  </>
                ) : (
                  <>
                    <Icon name="UserPlus" size={20} className="mr-2" />
                    Создать пользователя
                  </>
                )}
              </Button>
              
              {qrCodeDataUrl && email && password && (
                <Button
                  type="button"
                  onClick={printCredentialsWithQr}
                  variant="outline"
                  className="w-full border-purple-500/50 hover:bg-purple-500/10"
                >
                  <Icon name="Printer" size={20} className="mr-2" />
                  Распечатать учётные данные с QR-кодом
                </Button>
              )}
              
              <Button
                type="button"
                onClick={() => navigate(-1)}
                variant="outline"
                className="w-full border-red-600/50 text-red-400 hover:bg-red-600/10"
              >
                <Icon name="X" size={20} className="mr-2" />
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 bg-purple-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-700 rounded-full blur-3xl animate-pulse" />
      </div>
    </div>
  );
};

export default CreateUser;