import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { Organization } from './useCreateUser';
import CreateUserOrgPanel from './CreateUserOrgPanel';
import CreateUserInfoBlock from './CreateUserInfoBlock';

interface CreateUserFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  fio: string;
  setFio: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  subdivision: string;
  setSubdivision: (v: string) => void;
  position: string;
  setPosition: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  loading: boolean;
  organizations: Organization[];
  loadingOrgs: boolean;
  sendEmail: boolean;
  setSendEmail: (v: boolean) => void;
  generatedLoginUrl: string;
  qrCodeDataUrl: string;
  handleCreateUser: (e: React.FormEvent) => void;
  generatePassword: () => void;
  copyLoginLink: () => void;
  downloadQrCode: () => void;
  printQrCode: () => void;
  printCredentialsWithQr: () => void;
}

const CreateUserForm = ({
  email, setEmail,
  password, setPassword,
  fio, setFio,
  company, setCompany,
  subdivision, setSubdivision,
  position, setPosition,
  role, setRole,
  loading,
  organizations,
  loadingOrgs,
  sendEmail,
  setSendEmail,
  generatedLoginUrl,
  qrCodeDataUrl,
  handleCreateUser,
  generatePassword,
  copyLoginLink,
  downloadQrCode,
  printQrCode,
  printCredentialsWithQr,
}: CreateUserFormProps) => {
  return (
    <form onSubmit={handleCreateUser} className="space-y-6">
      <div>
        <Label className="text-gray-300">ФИО</Label>
        <Input
          value={fio}
          onChange={(e) => setFio(e.target.value)}
          className="bg-slate-700/50 border-purple-600/30 text-white"
          placeholder="Иванов Иван Иванович"
          required
        />
      </div>

      <div>
        <Label className="text-gray-300">Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-slate-700/50 border-purple-600/30 text-white"
          placeholder="user@example.com"
          required
        />
      </div>

      <div>
        <Label className="text-gray-300">Пароль</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-700/50 border-purple-600/30 text-white"
            placeholder="Введите пароль"
            required
          />
          <Button
            type="button"
            onClick={generatePassword}
            variant="outline"
            className="border-purple-600/50 text-purple-400"
          >
            <Icon name="Shuffle" size={20} />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Минимум 6 символов</p>
      </div>

      <div>
        <Label className="text-gray-300">Компания (предприятие)</Label>
        <CreateUserOrgPanel
          company={company}
          setCompany={setCompany}
          organizations={organizations}
          loadingOrgs={loadingOrgs}
          generatedLoginUrl={generatedLoginUrl}
          qrCodeDataUrl={qrCodeDataUrl}
          copyLoginLink={copyLoginLink}
          downloadQrCode={downloadQrCode}
          printQrCode={printQrCode}
        />
      </div>

      <div>
        <Label className="text-gray-300">Подразделение</Label>
        <Input
          value={subdivision}
          onChange={(e) => setSubdivision(e.target.value)}
          className="bg-slate-700/50 border-purple-600/30 text-white"
          placeholder="ОтПБ"
          required
        />
      </div>

      <div>
        <Label className="text-gray-300">Должность</Label>
        <Input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="bg-slate-700/50 border-purple-600/30 text-white"
          placeholder="Инженер"
          required
        />
      </div>

      <div>
        <Label className="text-gray-300">Роль в системе</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="bg-slate-700/50 border-purple-600/30 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Пользователь</SelectItem>
            <SelectItem value="admin">Администратор</SelectItem>
            <SelectItem value="superadmin">Главный администратор</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-3 p-4 bg-slate-700/30 border border-purple-600/30 rounded-lg">
        <Checkbox
          id="send-email"
          checked={sendEmail}
          onCheckedChange={(checked) => setSendEmail(checked as boolean)}
          className="border-purple-600/50"
        />
        <div className="flex-1">
          <label
            htmlFor="send-email"
            className="text-sm font-medium text-white cursor-pointer flex items-center gap-2"
          >
            <Icon name="Mail" size={16} className="text-purple-400" />
            Отправить учётные данные на email пользователя
          </label>
          <p className="text-xs text-gray-400 mt-1">
            После создания пользователя ему автоматически придёт письмо с паролем и ссылкой для входа
          </p>
        </div>
      </div>

      <CreateUserInfoBlock
        company={company}
        organizations={organizations}
        generatedLoginUrl={generatedLoginUrl}
        qrCodeDataUrl={qrCodeDataUrl}
        email={email}
        password={password}
        loading={loading}
        copyLoginLink={copyLoginLink}
        printCredentialsWithQr={printCredentialsWithQr}
      />
    </form>
  );
};

export default CreateUserForm;
