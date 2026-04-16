import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useCreateUser } from './createUser/useCreateUser';
import CreateUserForm from './createUser/CreateUserForm';

const CreateUser = () => {
  const navigate = useNavigate();
  const ctx = useCreateUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate(-1)} className="border-purple-600/50">
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-pink-700 p-3 rounded-xl shadow-lg">
              <Icon name="UserPlus" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Создать пользователя</h1>
              <p className="text-purple-400">Регистрация нового пользователя с назначением роли</p>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-purple-600/30 p-8">
          <CreateUserForm
            email={ctx.email}
            setEmail={ctx.setEmail}
            password={ctx.password}
            setPassword={ctx.setPassword}
            fio={ctx.fio}
            setFio={ctx.setFio}
            company={ctx.company}
            setCompany={ctx.setCompany}
            subdivision={ctx.subdivision}
            setSubdivision={ctx.setSubdivision}
            position={ctx.position}
            setPosition={ctx.setPosition}
            role={ctx.role}
            setRole={ctx.setRole}
            loading={ctx.loading}
            organizations={ctx.organizations}
            loadingOrgs={ctx.loadingOrgs}
            sendEmail={ctx.sendEmail}
            setSendEmail={ctx.setSendEmail}
            generatedLoginUrl={ctx.generatedLoginUrl}
            qrCodeDataUrl={ctx.qrCodeDataUrl}
            handleCreateUser={ctx.handleCreateUser}
            generatePassword={ctx.generatePassword}
            copyLoginLink={ctx.copyLoginLink}
            downloadQrCode={ctx.downloadQrCode}
            printQrCode={ctx.printQrCode}
            printCredentialsWithQr={ctx.printCredentialsWithQr}
          />
        </Card>
      </div>

      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 bg-purple-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-700 rounded-full blur-3xl animate-pulse" />
      </div>
    </div>
  );
};

export default CreateUser;
