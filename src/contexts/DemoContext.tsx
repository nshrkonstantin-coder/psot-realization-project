import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DemoContextType {
  isDemo: boolean;
  blockAction: (actionName?: string) => boolean;
}

const DemoContext = createContext<DemoContextType>({
  isDemo: false,
  blockAction: () => false,
});

export const useDemoMode = () => useContext(DemoContext);

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [isDemo, setIsDemo] = useState(
    () => localStorage.getItem('userRole') === 'demo'
  );

  useEffect(() => {
    const check = () => setIsDemo(localStorage.getItem('userRole') === 'demo');
    window.addEventListener('storage', check);
    window.addEventListener('demoModeChange', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('demoModeChange', check);
    };
  }, []);

  const blockAction = (actionName?: string): boolean => {
    if (!isDemo) return false;
    toast({
      title: 'Демо-режим',
      description: actionName
        ? `Действие "${actionName}" недоступно в демо-версии`
        : 'Сохранение и изменение данных недоступно в демо-версии',
      variant: 'destructive',
      duration: 3000,
    });
    return true;
  };

  return (
    <DemoContext.Provider value={{ isDemo, blockAction }}>
      {children}
      {isDemo && <DemoBanner />}
    </DemoContext.Provider>
  );
};

const DemoBanner = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium shadow-lg">
      🎯 Демо-режим: просмотр всех разделов доступен, сохранение данных отключено.{' '}
      <a href="/" className="underline font-bold hover:text-amber-100 transition-colors">
        Войти в полную версию →
      </a>
    </div>
  );
};

export default DemoProvider;