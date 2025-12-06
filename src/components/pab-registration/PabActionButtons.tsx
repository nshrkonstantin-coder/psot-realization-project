import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface PabActionButtonsProps {
  loading: boolean;
  canAddObservation: boolean;
  onBack: () => void;
  onAddObservation: () => void;
  onSubmit: () => void;
  onDownloadPdf: () => void;
  onDownloadWord: () => void;
}

export const PabActionButtons = ({
  loading,
  canAddObservation,
  onBack,
  onAddObservation,
  onSubmit,
  onDownloadPdf,
  onDownloadWord,
}: PabActionButtonsProps) => {
  return (
    <>
      {canAddObservation && (
        <Button
          onClick={onAddObservation}
          variant="outline"
          className="mb-6 w-full md:w-auto"
        >
          <Icon name="Plus" size={20} className="mr-2" />
          Добавить наблюдение
        </Button>
      )}

      <div className="flex flex-wrap gap-4">
        <Button
          onClick={onBack}
          variant="outline"
        >
          Назад на главную
        </Button>
        <Button
          onClick={onSubmit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Отправка...' : 'Отправить'}
        </Button>
        <Button variant="outline" onClick={onDownloadPdf}>
          Скачать в PDF
        </Button>
        <Button variant="outline" onClick={onDownloadWord}>
          <Icon name="FileText" size={20} className="mr-2" />
          Скачать в Word
        </Button>
      </div>
    </>
  );
};
