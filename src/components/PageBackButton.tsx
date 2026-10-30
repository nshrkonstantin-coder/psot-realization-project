import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useGoBack } from '@/hooks/useGoBack';

interface PageBackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
}

const PageBackButton = ({ fallback = '/dashboard', label = 'Назад', className = '' }: PageBackButtonProps) => {
  const goBack = useGoBack(fallback);

  return (
    <Button variant="outline" onClick={() => goBack()} className={className}>
      <Icon name="ArrowLeft" size={18} className="mr-2" />
      {label}
    </Button>
  );
};

export default PageBackButton;
