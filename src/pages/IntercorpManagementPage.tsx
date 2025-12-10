import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MESSAGING_API = 'https://functions.poehali.dev/0bd87c15-af37-4e08-93fa-f921a3c18bee';

interface Connection {
  id: number;
  company1_id: number;
  company2_id: number;
  company1_name: string;
  company2_name: string;
  created_at: string;
  created_by_name: string;
  is_active: boolean;
}

interface Company {
  id: number;
  name: string;
}

const IntercorpManagementPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<number | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany1, setSelectedCompany1] = useState<string>('');
  const [selectedCompany2, setSelectedCompany2] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const id = localStorage.getItem('userId');
    
    if (!id || role !== 'superadmin') {
      navigate('/dashboard');
      return;
    }
    
    setUserId(parseInt(id));
    loadConnections(parseInt(id));
    loadCompanies(parseInt(id));
  }, [navigate]);

  const loadConnections = async (uid: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${MESSAGING_API}?action=list_intercorp`, {
        headers: { 'X-User-Id': uid.toString() }
      });
      const data = await response.json();
      if (data.connections) {
        setConnections(data.connections);
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки связей', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanies = async (uid: number) => {
    try {
      const response = await fetch(`${MESSAGING_API}?action=list_companies`, {
        headers: { 'X-User-Id': uid.toString() }
      });
      const data = await response.json();
      if (data.companies) {
        setCompanies(data.companies);
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки компаний', variant: 'destructive' });
    }
  };

  const handleCreateConnection = async () => {
    if (!userId || !selectedCompany1 || !selectedCompany2) {
      toast({ title: 'Выберите обе компании', variant: 'destructive' });
      return;
    }

    if (selectedCompany1 === selectedCompany2) {
      toast({ title: 'Компании должны быть разными', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`${MESSAGING_API}?action=create_intercorp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId.toString()
        },
        body: JSON.stringify({
          company1_id: parseInt(selectedCompany1),
          company2_id: parseInt(selectedCompany2)
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Связь успешно создана' });
        setIsCreateDialogOpen(false);
        setSelectedCompany1('');
        setSelectedCompany2('');
        loadConnections(userId);
      }
    } catch (error) {
      toast({ title: 'Ошибка создания связи', variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/superadmin')}
              variant="outline"
              className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-xl">
                <Icon name="Link" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Межкорпоративные связи</h1>
                <p className="text-slate-400">Управление связями между предприятиями</p>
              </div>
            </div>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                <Icon name="Plus" size={20} className="mr-2" />
                Создать связь
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 text-white border-yellow-600/30">
              <DialogHeader>
                <DialogTitle>Создать межкорпоративную связь</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Первое предприятие</Label>
                  <Select value={selectedCompany1} onValueChange={setSelectedCompany1}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Выберите предприятие" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <Icon name="ArrowLeftRight" size={24} className="text-yellow-500" />
                </div>

                <div>
                  <Label>Второе предприятие</Label>
                  <Select value={selectedCompany2} onValueChange={setSelectedCompany2}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Выберите предприятие" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCreateConnection}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700"
                >
                  Создать связь
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <Icon name="Network" size={24} className="text-purple-500" />
              Активные связи
            </h2>
            <p className="text-slate-400 text-sm">
              После создания связи сотрудники обеих компаний смогут создавать межкорпоративные чаты
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin">
                <Icon name="Loader2" size={40} className="text-purple-500" />
              </div>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Link" size={64} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg mb-2">Нет активных связей</p>
              <p className="text-slate-500 text-sm">Создайте первую связь между предприятиями</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map(conn => (
                <Card
                  key={conn.id}
                  className="bg-slate-700/50 border-slate-600 p-4 hover:border-purple-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
                      <Icon name="Building2" size={20} className="text-white" />
                    </div>
                    {conn.is_active ? (
                      <span className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-600/30">
                        Активна
                      </span>
                    ) : (
                      <span className="bg-red-600/20 text-red-400 text-xs px-2 py-1 rounded-full border border-red-600/30">
                        Неактивна
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon name="Building" size={16} className="text-blue-400" />
                      <p className="text-white font-medium text-sm">{conn.company1_name}</p>
                    </div>
                    
                    <div className="flex justify-center">
                      <Icon name="ArrowDownUp" size={16} className="text-yellow-500" />
                    </div>

                    <div className="flex items-center gap-2">
                      <Icon name="Building" size={16} className="text-cyan-400" />
                      <p className="text-white font-medium text-sm">{conn.company2_name}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Icon name="User" size={12} />
                      <span>{conn.created_by_name || 'Администратор'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <Icon name="Calendar" size={12} />
                      <span>{formatDate(conn.created_at)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <Card className="bg-blue-900/20 border-blue-600/30 p-6 mt-6">
          <div className="flex items-start gap-4">
            <Icon name="Info" size={24} className="text-blue-400 flex-shrink-0 mt-1" />
            <div className="space-y-2 text-sm text-blue-100">
              <p className="font-semibold text-white">Как работают межкорпоративные связи:</p>
              <ul className="space-y-1 list-disc list-inside text-blue-200">
                <li>После создания связи сотрудники обеих компаний видят друг друга в списках</li>
                <li>Любой сотрудник может создать межкорпоративный чат с участниками из связанной компании</li>
                <li>Все сообщения хранятся с указанием компании отправителя</li>
                <li>Только суперадмин может управлять связями между компаниями</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default IntercorpManagementPage;
