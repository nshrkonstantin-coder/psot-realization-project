import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface Organization {
  id: number;
  name: string;
  registration_code: string;
  logo_url: string | null;
}

const OrganizationLogin = () => {
  const { orgCode } = useParams<{ orgCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orgCode) {
      navigate('/');
      return;
    }
    loadOrganization();
  }, [orgCode, navigate]);

  const loadOrganization = async () => {
    try {
      const response = await fetch(`https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b?code=${orgCode}`);
      if (!response.ok) {
        toast({ title: 'Ошибка', description: 'Предприятие не найдено', variant: 'destructive' });
        navigate('/');
        return;
      }
      const data = await response.json();
      setOrganization(data);
    } catch (error) {
      console.error('Failed to load organization:', error);
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('https://functions.poehali.dev/eb523ac0-0903-4780-8f5d-7e0546c1eda5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
          organization_code: orgCode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({ title: 'Ошибка', description: errorData.error || 'Ошибка авторизации', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Проверяем, совпадает ли код организации пользователя с текущим
        if (data.registrationCode && data.registrationCode !== orgCode) {
          toast({ 
            title: 'Неверная страница входа', 
            description: 'Перенаправляем на страницу вашего предприятия...',
            duration: 3000
          });
          setTimeout(() => {
            navigate(`/org/${data.registrationCode}`);
          }, 1500);
          return;
        }
        
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userFio', data.fio);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userPosition', data.position || '');
        localStorage.setItem('userDepartment', data.subdivision || '');
        localStorage.setItem('userRole', data.role || 'user');
        localStorage.setItem('organizationId', organization!.id.toString());
        localStorage.setItem('organizationName', organization!.name);
        localStorage.setItem('userCompany', organization!.name);
        
        toast({ title: 'Вход выполнен!' });
        
        const role = data.role || 'user';
        if (role === 'miniadmin') {
          navigate('/miniadmin');
        } else {
          navigate('/dashboard');
        }
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Неверные учётные данные', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-xl">
          <Icon name="Loader2" size={40} className="animate-spin mx-auto mb-4" />
          Загрузка...
        </div>
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* 3D Mining Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-64 h-64 bg-yellow-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-700 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-amber-800 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Mining Cart Rails Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, #fff 40px, #fff 42px)',
        }} />
      </div>

      {/* Rock Texture Overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, transparent 20%, rgba(255,255,255,0.1) 21%, transparent 21%)',
      }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* 3D Card with Mining Theme */}
          <div className="relative">
            {/* Card Shadow/3D Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-900 to-orange-900 rounded-2xl transform translate-y-2 blur-xl opacity-50" />
            
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border-2 border-yellow-600/30">
              {/* Logo/Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center mb-4">
                  <img src="/favicon.svg" alt="АСУБТ" className="w-32 h-32 transform hover:scale-110 transition-transform" />
                </div>
                
                {/* Название предприятия */}
                <div className="mb-4 px-4 py-3 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-lg border border-orange-600/30">
                  <p className="text-2xl font-bold text-white">{organization.name}</p>
                </div>
                
                <p className="text-orange-400 text-sm font-semibold">
                  Автоматизированная система управления безопасностью труда
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-700/50 border-yellow-600/30 text-white"
                    placeholder="your@email.com"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-300">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-700/50 border-yellow-600/30 text-white"
                    placeholder="••••••••"
                    required
                    disabled={submitting}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-700 hover:from-yellow-700 hover:to-orange-800 text-white font-bold py-6 shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    <>
                      <Icon name="LogIn" size={20} className="mr-2" />
                      Войти
                    </>
                  )}
                </Button>

                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => navigate(`/register?code=${orgCode}`)}
                    className="text-yellow-500 hover:text-yellow-400 text-sm transition-colors"
                  >
                    Нет аккаунта? Зарегистрироваться
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Mining Equipment Decorations */}
          <div className="mt-8 flex justify-center gap-4 opacity-30">
            <Icon name="HardHat" size={24} className="text-yellow-600" />
            <Icon name="Wrench" size={24} className="text-yellow-600" />
            <Icon name="ShieldCheck" size={24} className="text-yellow-600" />
          </div>

          {/* Код организации для справки */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-xs">
              Код предприятия: <span className="text-yellow-600 font-mono">{orgCode}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationLogin;