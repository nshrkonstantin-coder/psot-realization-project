import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fio, setFio] = useState('');
  const [company, setCompany] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [position, setPosition] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Login attempt:', { email, passwordLength: password.length });
    
    const action = isRegister ? 'register' : 'login';
    const body = isRegister 
      ? { action, email, password, fio, company, subdivision, position }
      : { action, email, password };

    console.log('Sending request:', { action, email });

    try {
      const response = await fetch('https://functions.poehali.dev/eb523ac0-0903-4780-8f5d-7e0546c1eda5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        // Если пользователь принадлежит организации и вошёл НЕ через её страницу
        // НО главные администраторы (admin, superadmin) всегда остаются на основной странице
        if (data.registrationCode && !isRegister && data.role !== 'admin' && data.role !== 'superadmin') {
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
        localStorage.setItem('userFio', data.fio || fio);
        localStorage.setItem('userRole', data.role || 'user');
        if (data.organizationId) {
          localStorage.setItem('organizationId', data.organizationId);
        }
        
        if (isRegister && data.organizationId) {
          try {
            await fetch('https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4f6ca', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                org_id: data.organizationId,
                action_type: 'user_registration',
                user_id: data.userId
              })
            });
          } catch (error) {
            console.log('Points award failed:', error);
          }
        } else if (!isRegister && data.organizationId) {
          try {
            await fetch('https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4f6ca', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                org_id: data.organizationId,
                action_type: 'user_login',
                user_id: data.userId
              })
            });
          } catch (error) {
            console.log('Points award failed:', error);
          }
        }
        
        toast({ title: isRegister ? 'Регистрация успешна!' : 'Вход выполнен!' });
        
        const role = data.role || 'user';
        if (role === 'superadmin') {
          navigate('/superadmin');
        } else if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'miniadmin') {
          navigate('/miniadmin');
        } else {
          navigate('/dashboard');
        }
      } else {
        console.error('Login failed:', data.error);
        toast({ title: 'Ошибка', description: data.error || 'Неверные учётные данные', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
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
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-br from-yellow-600 to-orange-700 rounded-xl shadow-lg transform hover:scale-110 transition-transform">
                  <Icon name="Mountain" size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">АСУБТ</h1>
                <p className="text-yellow-500 text-sm">Автоматизированная система управления безопасностью труда</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <>
                    <div>
                      <Label htmlFor="fio" className="text-gray-300">ФИО</Label>
                      <Input
                        id="fio"
                        value={fio}
                        onChange={(e) => setFio(e.target.value)}
                        className="bg-slate-700/50 border-yellow-600/30 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="company" className="text-gray-300">Компания</Label>
                      <Input
                        id="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="bg-slate-700/50 border-yellow-600/30 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="subdivision" className="text-gray-300">Подразделение</Label>
                      <Input
                        id="subdivision"
                        value={subdivision}
                        onChange={(e) => setSubdivision(e.target.value)}
                        className="bg-slate-700/50 border-yellow-600/30 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="position" className="text-gray-300">Должность</Label>
                      <Input
                        id="position"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="bg-slate-700/50 border-yellow-600/30 text-white"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-700/50 border-yellow-600/30 text-white"
                    required
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
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-700 hover:from-yellow-700 hover:to-orange-800 text-white font-bold py-6 shadow-lg transform hover:scale-105 transition-all"
                >
                  <Icon name={isRegister ? "UserPlus" : "LogIn"} size={20} className="mr-2" />
                  {isRegister ? 'Регистрация' : 'Вход'}
                </Button>

                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="w-full text-yellow-500 hover:text-yellow-400 text-sm mt-4 transition-colors"
                >
                  {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
                </button>
              </form>
            </div>
          </div>

          {/* Mining Equipment Icons */}
          <div className="flex justify-center gap-8 mt-8 opacity-30">
            <Icon name="HardHat" size={32} className="text-yellow-600 animate-bounce" />
            <Icon name="Hammer" size={32} className="text-orange-600 animate-bounce delay-100" />
            <Icon name="Pickaxe" size={32} className="text-yellow-700 animate-bounce delay-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;