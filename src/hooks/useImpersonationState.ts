import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useImpersonationState = () => {
  const location = useLocation();

  useEffect(() => {
    const isImpersonating = localStorage.getItem('isImpersonating') === 'true';
    
    if (isImpersonating) {
      localStorage.setItem('impersonation_current_path', location.pathname);
    }
  }, [location.pathname]);
};
