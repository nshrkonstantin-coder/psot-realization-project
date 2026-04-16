import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Organization } from './useCreateUser';

interface CreateUserOrgPanelProps {
  company: string;
  setCompany: (v: string) => void;
  organizations: Organization[];
  loadingOrgs: boolean;
  generatedLoginUrl: string;
  qrCodeDataUrl: string;
  copyLoginLink: () => void;
  downloadQrCode: () => void;
  printQrCode: () => void;
}

const CreateUserOrgPanel = ({
  company,
  setCompany,
  organizations,
  loadingOrgs,
  generatedLoginUrl,
  qrCodeDataUrl,
  copyLoginLink,
  downloadQrCode,
  printQrCode,
}: CreateUserOrgPanelProps) => {
  return (
    <div>
      {loadingOrgs ? (
        <div className="flex items-center gap-2 bg-slate-700/50 border border-purple-600/30 rounded-md px-3 py-2">
          <Icon name="Loader2" size={16} className="animate-spin text-purple-400" />
          <span className="text-gray-400 text-sm">Загрузка организаций...</span>
        </div>
      ) : organizations.length > 0 ? (
        <>
          <Select value={company} onValueChange={setCompany} required>
            <SelectTrigger className="bg-slate-700/50 border-purple-600/30 text-white">
              <SelectValue placeholder="Выберите предприятие" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.name}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1">
            Доступно {organizations.length} предприятий
          </p>

          {generatedLoginUrl && (
            <div className="mt-3 p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/40 rounded-lg">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-2">
                    <Icon name="Link" size={18} className="text-purple-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-purple-300 font-semibold mb-1">Ссылка для входа с кодом предприятия:</p>
                      <p className="text-sm text-white font-mono break-all bg-slate-800/50 px-2 py-1 rounded">{generatedLoginUrl}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyLoginLink}
                    className="w-full mt-2 border-purple-500/50 hover:bg-purple-500/10"
                  >
                    <Icon name="Copy" size={16} className="mr-2" />
                    Скопировать ссылку
                  </Button>
                </div>

                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-2 rounded-lg shadow-lg">
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-32 h-32" />
                    </div>
                    <p className="text-xs text-purple-300 text-center font-semibold">QR-код для<br/>быстрого входа</p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={downloadQrCode}
                        className="border-purple-500/50 hover:bg-purple-500/10 text-xs flex-1"
                      >
                        <Icon name="Download" size={14} className="mr-1" />
                        Скачать
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={printQrCode}
                        className="border-purple-500/50 hover:bg-purple-500/10 text-xs flex-1"
                      >
                        <Icon name="Printer" size={14} className="mr-1" />
                        Печать
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-purple-300 mt-3 text-center">
                📱 Ссылка и QR-код будут отправлены пользователю на email
              </p>
            </div>
          )}
        </>
      ) : (
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="bg-slate-700/50 border-purple-600/30 text-white"
          placeholder="Введите название компании"
          required
        />
      )}
    </div>
  );
};

export default CreateUserOrgPanel;
