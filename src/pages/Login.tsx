import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const AUTH_URL = 'https://functions.poehali.dev/eb523ac0-0903-4780-8f5d-7e0546c1eda5';
const POINTS_URL = 'https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4f6ca';

interface OrgInfo {
  organizationId: number;
  organizationName: string;
  organizationLogo?: string | null;
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fio, setFio] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [position, setPosition] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const verifyCode = async (code: string) => {
    if (!code || code.length < 4) {
      setCodeStatus('idle');
      setOrgInfo(null);
      return;
    }
    setCodeStatus('checking');
    try {
      const res = await fetch(`${AUTH_URL}?action=verify_code&code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.success) {
        setCodeStatus('valid');
        setOrgInfo({
          organizationId: data.organizationId,
          organizationName: data.organizationName,
          organizationLogo: data.organizationLogo,
        });
      } else {
        setCodeStatus('invalid');
        setOrgInfo(null);
      }
    } catch {
      setCodeStatus('invalid');
      setOrgInfo(null);
    }
  };

  useEffect(() => {
    const codeFromUrl = searchParams.get('code') || searchParams.get('invite');
    if (codeFromUrl) {
      const upper = codeFromUrl.toUpperCase();
      setInviteCode(upper);
      setIsRegister(true);
      verifyCode(upper);
    }
  }, [searchParams]);  

  const handleCodeChange = (value: string) => {
    const upper = value.toUpperCase();
    setInviteCode(upper);
    setCodeStatus('idle');
    setOrgInfo(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => verifyCode(upper), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const deviceFingerprint = btoa([
      navigator.userAgent, navigator.language, screen.width, screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('|')).slice(0, 64);

    const action = isRegister ? 'register' : 'login';
    const body = isRegister
      ? { action, email, password, fio, subdivision, position, code: inviteCode, deviceFingerprint }
      : { action, email, password, deviceFingerprint };

    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userFio', data.fio || fio);
        localStorage.setItem('userRole', data.role || 'user');
        localStorage.setItem('userPosition', data.position || position);
        localStorage.setItem('userDepartment', data.subdivision || subdivision);
        localStorage.setItem('userEmail', email);
        if (data.sessionToken) localStorage.setItem('sessionToken', data.sessionToken);
        if (data.organizationId) localStorage.setItem('organizationId', String(data.organizationId));
        if (data.company) localStorage.setItem('userCompany', data.company);

        const orgId = data.organizationId;
        const userId = data.userId;
        if (orgId && userId) {
          try {
            await fetch(POINTS_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                org_id: orgId,
                action_type: isRegister ? 'user_registration' : 'user_login',
                user_id: userId
              })
            });
          } catch (err) {
            console.log('Points award failed:', err);
          }
        }

        toast({ title: isRegister ? 'Регистрация успешна!' : 'Вход выполнен!' });

        const role = data.role || 'user';
        if (role === 'superadmin') {
          navigate('/superadmin');
        } else if (data.registrationCode && !isRegister) {
          navigate(`/org/${data.registrationCode}`);
        } else if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'miniadmin') {
          navigate('/miniadmin');
        } else {
          navigate('/dashboard');
        }
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Неверные учётные данные', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-64 h-64 bg-yellow-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-700 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-amber-800 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, #fff 40px, #fff 42px)',
        }} />
      </div>

      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, transparent 20%, rgba(255,255,255,0.1) 21%, transparent 21%)',
      }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-900 to-orange-900 rounded-2xl transform translate-y-2 blur-xl opacity-50" />

            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border-2 border-yellow-600/30">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center mb-4">
                  <img src="https://cdn.poehali.dev/files/a8450d96-c4de-4091-8a4e-f993560bc89e.png" alt="АСУБТ" className="w-40 h-40 object-contain transform hover:scale-110 transition-transform" />
                </div>
                <p className="text-orange-400 text-sm font-semibold">Автоматизированная система управления безопасностью труда</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <>
                    {/* Код приглашения */}
                    <div>
                      <Label htmlFor="inviteCode" className="text-gray-300">Код предприятия</Label>
                      <div className="relative mt-1">
                        <Input
                          id="inviteCode"
                          value={inviteCode}
                          onChange={(e) => handleCodeChange(e.target.value)}
                          placeholder="XXXXXXXX"
                          className="bg-slate-700/50 border-yellow-600/30 text-white placeholder:text-gray-500 pr-9"
                          required
                        />
                        {codeStatus === 'checking' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {codeStatus === 'valid' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
                            <Icon name="CheckCircle" size={18} />
                          </div>
                        )}
                        {codeStatus === 'invalid' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400">
                            <Icon name="XCircle" size={18} />
                          </div>
                        )}
                      </div>

                      {/* Плашка: организация найдена */}
                      {codeStatus === 'valid' && orgInfo && (
                        <div className="mt-2 flex items-center gap-3 bg-green-900/40 border border-green-500/50 rounded-lg px-3 py-2">
                          {orgInfo.organizationLogo ? (
                            <img src={orgInfo.organizationLogo} alt="Логотип" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-green-700/50 flex items-center justify-center flex-shrink-0">
                              <Icon name="Building2" size={16} className="text-green-300" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon name="CheckCircle2" size={15} className="text-green-400 flex-shrink-0" />
                            <span className="text-green-300 text-sm font-medium truncate">{orgInfo.organizationName}</span>
                          </div>
                        </div>
                      )}

                      {/* Плашка: код неверный */}
                      {codeStatus === 'invalid' && inviteCode.length >= 4 && (
                        <div className="mt-2 flex items-center gap-2 bg-red-900/40 border border-red-500/50 rounded-lg px-3 py-2">
                          <Icon name="XCircle" size={15} className="text-red-400 flex-shrink-0" />
                          <span className="text-red-300 text-sm">Код не найден. Проверьте правильность.</span>
                        </div>
                      )}
                    </div>

                    {/* ФИО */}
                    <div>
                      <Label htmlFor="fio" className="text-gray-300">ФИО</Label>
                      <Input
                        id="fio"
                        value={fio}
                        onChange={(e) => setFio(e.target.value)}
                        placeholder="Иванов Иван Иванович"
                        className="bg-slate-700/50 border-yellow-600/30 text-white placeholder:text-gray-500 mt-1"
                        required
                      />
                    </div>

                    {/* Подразделение */}
                    <div>
                      <Label htmlFor="subdivision" className="text-gray-300">Подразделение</Label>
                      <Input
                        id="subdivision"
                        value={subdivision}
                        onChange={(e) => setSubdivision(e.target.value)}
                        className="bg-slate-700/50 border-yellow-600/30 text-white mt-1"
                        required
                      />
                    </div>

                    {/* Должность */}
                    <div>
                      <Label htmlFor="position" className="text-gray-300">Должность</Label>
                      <Input
                        id="position"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="bg-slate-700/50 border-yellow-600/30 text-white mt-1"
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
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-700 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-3 text-lg shadow-lg transform hover:scale-105 transition-all"
                >
                  <Icon name={isRegister ? 'UserPlus' : 'LogIn'} size={20} className="mr-2" />
                  {isRegister ? 'Регистрация' : 'Войти'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-yellow-500 hover:text-yellow-400 text-sm transition-colors"
                  >
                    {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}