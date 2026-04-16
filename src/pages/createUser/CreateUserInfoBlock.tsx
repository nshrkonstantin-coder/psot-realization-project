import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Organization } from './useCreateUser';

interface CreateUserInfoBlockProps {
  company: string;
  organizations: Organization[];
  generatedLoginUrl: string;
  qrCodeDataUrl: string;
  email: string;
  password: string;
  loading: boolean;
  copyLoginLink: () => void;
  printCredentialsWithQr: () => void;
}

const CreateUserInfoBlock = ({
  company,
  organizations,
  generatedLoginUrl,
  qrCodeDataUrl,
  email,
  password,
  loading,
  copyLoginLink,
  printCredentialsWithQr,
}: CreateUserInfoBlockProps) => {
  const navigate = useNavigate();

  return (
    <>
      <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={20} className="text-purple-400 mt-1" />
          <div className="text-sm text-gray-300 w-full">
            <p className="font-semibold text-white mb-2">После создания пользователя:</p>
            <ul className="list-disc list-inside space-y-1 mb-3">
              <li>Данные для входа будут скопированы в буфер обмена</li>
              <li>Отправьте их пользователю на указанный email</li>
            </ul>
            {company && organizations.find(org => org.name === company) && (
              <div className="mt-3 p-3 bg-slate-800/50 rounded border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400">Ссылка для входа:</p>
                  <Button
                    type="button"
                    onClick={copyLoginLink}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-600/20"
                  >
                    <Icon name="Copy" size={12} className="mr-1" />
                    Копировать
                  </Button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-purple-300 text-sm break-all">
                    {window.location.origin}/org/{organizations.find(org => org.name === company)?.registration_code}
                  </code>
                  <Icon name="Link" size={16} className="text-purple-400 flex-shrink-0" />
                </div>
                <p className="text-xs text-gray-400">
                  Код предприятия: <span className="text-yellow-400 font-mono">{organizations.find(org => org.name === company)?.registration_code}</span>
                </p>
              </div>
            )}
            {!company && (
              <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                <Icon name="AlertCircle" size={14} />
                Выберите компанию для генерации ссылки
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800 text-white font-semibold py-3 text-lg"
        >
          {loading ? (
            <>
              <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
              Создание...
            </>
          ) : (
            <>
              <Icon name="UserPlus" size={20} className="mr-2" />
              Создать пользователя
            </>
          )}
        </Button>

        {qrCodeDataUrl && email && password && (
          <Button
            type="button"
            onClick={printCredentialsWithQr}
            variant="outline"
            className="w-full border-purple-500/50 hover:bg-purple-500/10"
          >
            <Icon name="Printer" size={20} className="mr-2" />
            Распечатать учётные данные с QR-кодом
          </Button>
        )}

        <Button
          type="button"
          onClick={() => navigate(-1)}
          variant="outline"
          className="w-full border-red-600/50 text-red-400 hover:bg-red-600/10"
        >
          <Icon name="X" size={20} className="mr-2" />
          Отмена
        </Button>
      </div>
    </>
  );
};

export default CreateUserInfoBlock;
