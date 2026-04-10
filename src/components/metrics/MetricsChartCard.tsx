import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface MetricsChartCardProps {
  userRole: string;
  chartUrl: string | null;
  isUploading: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteChart: () => void;
}

export const MetricsChartCard = ({
  userRole,
  chartUrl,
  isUploading,
  onFileUpload,
  onDeleteChart,
}: MetricsChartCardProps) => {
  return (
    <>
      {(userRole === 'super_admin' || userRole === 'admin') && (
        <Card className="mb-6 p-6 bg-slate-800/50 border-yellow-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-600/20 p-3 rounded-lg">
                <Icon name="BarChart3" size={24} className="text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">График личных показателей ПАБ</h3>
                <p className="text-slate-400 text-sm">Загрузите Excel-файл с графиком для отображения всем пользователям вашей организации</p>
              </div>
            </div>
            <div className="flex gap-3">
              {chartUrl && (
                <Button
                  onClick={onDeleteChart}
                  variant="outline"
                  className="border-red-600/50 text-red-500 hover:bg-red-600/10"
                >
                  <Icon name="Trash2" size={18} className="mr-2" />
                  Удалить
                </Button>
              )}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileUpload}
                id="excel-upload"
                className="hidden"
                disabled={isUploading}
              />
              <Button
                onClick={() => document.getElementById('excel-upload')?.click()}
                disabled={isUploading}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Icon name="Upload" size={18} className="mr-2" />
                {isUploading ? 'Загрузка...' : 'Загрузить Excel'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {chartUrl && (
        <Card className="mb-6 p-6 bg-slate-800/50 border-blue-600/30">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="FileSpreadsheet" size={24} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-white">График личных показателей ПАБ</h3>
          </div>
          <a
            href={chartUrl}
            download="metrics-chart.xlsx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Icon name="Download" size={18} />
            Скачать график
          </a>
        </Card>
      )}
    </>
  );
};
