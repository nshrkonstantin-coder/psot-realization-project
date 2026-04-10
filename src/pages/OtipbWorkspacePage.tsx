import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OtipbWorkspacePage = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    const department = localStorage.getItem('userDepartment');
    const hasAccess = department === 'ОТиПБ' || department === 'Отдел ОТиПБ';
    if (!hasAccess) {
      navigate('/otipb-department');
      return;
    }
    navigate('/otipb-workspace-dashboard', { replace: true });
    setChecked(true);
  }, [navigate]);

  if (!checked) return null;
  return null;
};

export default OtipbWorkspacePage;
