import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

export default function DemoPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loginAsDemo = async () => {
      try {
        const response = await fetch(
          'https://functions.poehali.dev/eb523ac0-0903-4780-8f5d-7e0546c1eda5',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'login',
              email: 'demo@demo.ru',
              password: 'demo',
            }),
          }
        );
        const data = await response.json();

        const DEMO_COMPANY = 'ДЕМО: ООО "Западная Нефтяная Компания"';

        if (data.success) {
          localStorage.setItem('userId', String(data.userId));
          localStorage.setItem('userFio', data.fio || 'Демо Пользователь');
          localStorage.setItem('userRole', 'demo');
          localStorage.setItem('userEmail', 'demo@demo.ru');
          localStorage.setItem('userCompany', data.company || DEMO_COMPANY);
          if (data.organizationId) {
            localStorage.setItem('organizationId', String(data.organizationId));
          }
          window.dispatchEvent(new Event('demoModeChange'));
          navigate('/dashboard');
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Ошибка входа в демо-режим');
        }
      } catch (e) {
        setStatus('error');
        setErrorMsg('Не удалось подключиться к серверу');
      }
    };

    loginAsDemo();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {status === 'loading' ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <Icon name="Loader2" className="animate-spin text-amber-500" size={56} />
          <h1 className="text-2xl font-bold text-gray-700">Загружаем демо-версию...</h1>
          <p className="text-gray-500 text-sm">Подождите несколько секунд</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <Icon name="AlertCircle" className="text-red-400" size={56} />
          <h1 className="text-2xl font-bold text-gray-700">Не удалось войти</h1>
          <p className="text-gray-500 text-sm">{errorMsg}</p>
          <a
            href="/"
            className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
          >
            Перейти на главную
          </a>
        </div>
      )}
    </div>
  );
}