import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const useGoBack = (defaultFallback = '/dashboard') => {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (fallback?: string) => {
      if (location.key !== 'default') {
        navigate(-1);
      } else {
        navigate(fallback || defaultFallback);
      }
    },
    [navigate, location.key, defaultFallback]
  );
};

export default useGoBack;
