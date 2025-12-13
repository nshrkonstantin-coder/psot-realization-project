import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode);
      verifyCode(urlCode);
    }
  }, [searchParams]);

  const verifyCode = async (codeValue: string) => {
    if (!codeValue || codeValue.length < 6) return;
    
    setVerifyingCode(true);
    try {
      const response = await fetch(
        `https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b?code=${encodeURIComponent(codeValue)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setOrganizationName(data.name);
        setOrganizationLogo(data.logo_url);
        toast.success(`Код подтверждён: ${data.name}`);
      } else {
        setOrganizationName(null);
        setOrganizationLogo(null);
      }
    } catch (error) {
      console.error('Code verification error:', error);
      setOrganizationName(null);
      setOrganizationLogo(null);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setCode(upperValue);
    
    if (upperValue.length >= 6) {
      verifyCode(upperValue);
    } else {
      setOrganizationName(null);
      setOrganizationLogo(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code) {
      toast.error('Код приглашения обязателен');
      return;
    }

    if (!email || !password || !fullName) {
      toast.error('Заполните все поля');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/eb523ac0-0903-4780-8f5d-7e0546c1eda5', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          code,
          email,
          password,
          full_name: fullName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Регистрация успешна! Выполняем вход...');
        
        const loginResponse = await fetch('https://functions.poehali.dev/eb523ac0-0903-4780-8f5d-7e0546c1eda5', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'login',
            email,
            password,
          }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok && loginData.success) {
          toast.success('Регистрация успешна! Войдите в систему');
          navigate(`/org/${code}`);
        } else {
          toast.success('Регистрация успешна! Войдите в систему');
          navigate(`/org/${code}`);
        }
      } else {
        toast.error(data.error || 'Ошибка регистрации');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

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
              <div className="text-center mb-6">
                {organizationLogo ? (
                  <div className="inline-block mb-4">
                    <img 
                      src={organizationLogo} 
                      alt={organizationName || 'Organization'}
                      className="w-20 h-20 object-contain rounded-xl shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-br from-yellow-600 to-orange-700 rounded-xl shadow-lg transform hover:scale-110 transition-transform">
                    <Icon name="Mountain" size={40} className="text-white" />
                  </div>
                )}
                
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 mb-2">
                  Регистрация
                </h1>
                
                {organizationName && (
                  <div className="mt-4 mb-2 px-4 py-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-lg border border-yellow-600/30">
                    <p className="text-xl font-bold text-white">{organizationName}</p>
                  </div>
                )}
                
                <p className="text-yellow-500/80 text-sm mt-2">
                  {organizationName ? 'Создайте аккаунт для доступа в систему' : 'Введите код приглашения'}
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="code" className="text-gray-300">Код приглашения</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="XXXXXXXX"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    disabled={loading}
                    className="bg-slate-700/50 border-yellow-600/30 text-white placeholder:text-gray-500"
                    required
                  />
                  {verifyingCode && (
                    <p className="text-sm text-yellow-500 mt-1 flex items-center gap-2">
                      <Icon name="Loader2" size={14} className="animate-spin" />
                      Проверка кода...
                    </p>
                  )}
                  {code.length >= 6 && !verifyingCode && !organizationName && (
                    <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                      <Icon name="XCircle" size={14} />
                      Неверный код приглашения
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fullName" className="text-gray-300">ФИО</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    className="bg-slate-700/50 border-yellow-600/30 text-white placeholder:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ivanov@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="bg-slate-700/50 border-yellow-600/30 text-white placeholder:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-300">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="bg-slate-700/50 border-yellow-600/30 text-white placeholder:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-gray-300">Подтвердите пароль</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="bg-slate-700/50 border-yellow-600/30 text-white placeholder:text-gray-500"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-700 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all border-2 border-yellow-500/50"
                  disabled={loading || !organizationName}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Icon name="Loader2" size={20} className="animate-spin" />
                      Регистрация...
                    </span>
                  ) : (
                    'Зарегистрироваться'
                  )}
                </Button>

                <div className="text-center text-sm text-gray-400 pt-2">
                  Уже есть аккаунт?{' '}
                  <button
                    type="button"
                    onClick={() => navigate(organizationName && code ? `/org/${code}` : '/')}
                    className="text-yellow-500 hover:text-yellow-400 font-medium underline"
                  >
                    Войти
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
