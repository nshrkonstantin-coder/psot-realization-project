import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const ImpersonationBanner = () => {
  const navigate = useNavigate();
  const isImpersonating = localStorage.getItem('isImpersonating') === 'true';

  if (!isImpersonating) return null;

  const handleExitImpersonation = () => {
    const originalUserId = localStorage.getItem('impersonation_original_user_id');
    const originalUserRole = localStorage.getItem('impersonation_original_user_role');
    const originalUserEmail = localStorage.getItem('impersonation_original_user_email');
    const returnPath = localStorage.getItem('impersonation_return_path') || '/users-management';

    localStorage.setItem('userId', originalUserId || '');
    localStorage.setItem('userRole', originalUserRole || '');
    localStorage.setItem('userEmail', originalUserEmail || '');

    localStorage.removeItem('isImpersonating');
    localStorage.removeItem('impersonation_original_user_id');
    localStorage.removeItem('impersonation_original_user_role');
    localStorage.removeItem('impersonation_original_user_email');
    localStorage.removeItem('impersonation_return_path');

    navigate(returnPath);
    toast.success('Вы вернулись в свой аккаунт');
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon name="Eye" size={20} />
          <span className="font-semibold">
            Режим просмотра личного кабинета пользователя
          </span>
        </div>
        <Button
          onClick={handleExitImpersonation}
          size="sm"
          variant="outline"
          className="bg-white text-red-600 hover:bg-red-50 border-white"
        >
          <Icon name="LogOut" size={16} className="mr-2" />
          Вернуться в свой аккаунт
        </Button>
      </div>
    </div>
  );
};
