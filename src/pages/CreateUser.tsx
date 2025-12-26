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
        // Находим код регистрации выбранной организации
        const selectedOrg = organizations.find(org => org.name === company);
        const orgCode = selectedOrg?.registration_code || '';
        
        // Формируем ссылку с кодом предприятия
        const loginUrl = orgCode 
          ? `${window.location.origin}/org/${orgCode}`
          : window.location.origin;
        
        const credentialsText = `Добро пожаловать в АСУБТ!\n\n` +
          `Ваши данные для входа:\n` +
          `Email: ${data.email}\n` +
          `Пароль: ${password}\n\n` +
          `Ссылка для входа: ${loginUrl}\n` +
          `${orgCode ? `Код предприятия: ${orgCode}` : ''}`;
        
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
    const selectedOrg = organizations.find(org => org.name === company);
    const orgCode = selectedOrg?.registration_code || '';
    const loginUrl = orgCode 
      ? `${window.location.origin}/org/${orgCode}`
      : window.location.origin;
    
    navigator.clipboard.writeText(loginUrl);
    toast({ title: 'Ссылка скопирована!', description: 'Ссылка для входа в буфере обмена' });
  };

  const sendCredentialsByEmail = async (userEmail: string, userPassword: string) => {
    setSendingEmail(true);
    try {
      const selectedOrg = organizations.find(org => org.name === company);
      const orgCode = selectedOrg?.registration_code || '';
      const loginUrl = orgCode 
        ? `${window.location.origin}/org/${orgCode}`
        : window.location.origin;

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
          loginUrl: loginUrl
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
              ) : (
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-slate-700/50 border-purple-600/30 text-white"
                  placeholder="Введите название компании"
                  required
                />
              )}
              <p className="text-xs text-gray-400 mt-1">
                {organizations.length > 0 
                  ? `Доступно ${organizations.length} предприятий` 
                  : 'Организации не найдены. Введите вручную.'}
              </p>
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

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading || sendingEmail}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800"
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
              <Button
                type="button"
                onClick={() => navigate(-1)}
                variant="outline"
                className="border-red-600/50 text-red-400 hover:bg-red-600/10"
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