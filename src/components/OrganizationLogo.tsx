import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';

interface OrganizationLogoProps {
  size?: number;
  showCompanyName?: boolean;
  className?: string;
}

const OrganizationLogo = ({ size = 48, showCompanyName = true, className = '' }: OrganizationLogoProps) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrganizationData = async () => {
      try {
        const organizationId = localStorage.getItem('organizationId');
        const userCompany = localStorage.getItem('userCompany');
        
        setCompanyName(userCompany || '');

        if (!organizationId) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          `https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b?id=${organizationId}`,
          {
            headers: { 'X-User-Id': localStorage.getItem('userId') || '' }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.logo_url) {
            setLogoUrl(data.logo_url);
          }
          if (data.name && !userCompany) {
            setCompanyName(data.name);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки логотипа организации:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizationData();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div
          className="bg-gradient-to-br from-yellow-600 to-orange-700 rounded-xl shadow-lg animate-pulse"
          style={{ width: size, height: size, padding: size / 6 }}
        />
        {showCompanyName && (
          <div className="h-6 w-32 bg-slate-700 rounded animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={companyName || 'Логотип организации'}
          className="rounded-xl shadow-lg object-contain"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="bg-gradient-to-br from-yellow-600 to-orange-700 rounded-xl shadow-lg flex items-center justify-center"
          style={{ width: size, height: size, padding: size / 6 }}
        >
          <Icon name="Mountain" size={size * 0.6} className="text-white" />
        </div>
      )}
      {showCompanyName && companyName && (
        <div>
          <p className="text-blue-400 font-semibold text-lg">{companyName}</p>
        </div>
      )}
    </div>
  );
};

export default OrganizationLogo;
