import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RegistryRecord {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  company: string;
  department: string;
  position: string;
  pab_number: string;
  audit_date: string;
  audits_completed: number;
  observations_made: number;
}

interface AuditDetail {
  id: number;
  doc_number: string;
  doc_date: string;
  department: string;
  location: string;
  checked_object: string;
  observations_count: number;
}

export default function PabUserRegistryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [audits, setAudits] = useState<AuditDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({ fio: '', totalAudits: 0, totalObservations: 0 });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocNumber, setSelectedDocNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadRegistryData();
  }, []);

  const loadRegistryData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const userFio = localStorage.getItem('userFio') || 'Пользователь';
      
      const response = await fetch(`https://functions.poehali.dev/4c14a615-c04d-48ce-89ab-139999fefa5c?user_id=${userId}&detailed=true`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      
      const data = await response.json();
      setAudits(data.audits || []);
      setUserInfo({
        fio: userFio,
        totalAudits: data.total_audits || 0,
        totalObservations: data.total_observations || 0
      });
    } catch (error) {
      console.error('Ошибка загрузки данных реестра:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные реестра',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  const handleDocClick = async (docNumber: string) => {
    try {
      // Проверяем существует ли документ
      const response = await fetch(`https://functions.poehali.dev/7839a471-e953-4453-9358-b035f047f6e9?doc_number=${docNumber}`);
      const data = await response.json();
      
      if (data.exists && data.file_url) {
        // Открываем документ в новой вкладке
        window.open(data.file_url, '_blank');
      } else {
        // Документ не найден - предлагаем загрузить
        setSelectedDocNumber(docNumber);
        setUploadDialogOpen(true);
      }
    } catch (error) {
      console.error('Ошибка проверки документа:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось проверить наличие документа',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'Ошибка',
        description: 'Выберите файл для загрузки',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Конвертируем файл в base64
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const response = await fetch('https://functions.poehali.dev/f4b1dbb0-b077-4805-9da3-9b1661dc86da', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_number: selectedDocNumber,
          file: fileBase64,
          file_name: selectedFile.name,
          user_id: localStorage.getItem('userId') || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const data = await response.json();
      
      toast({
        title: 'Успешно',
        description: 'Документ успешно загружен',
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      
      // Открываем загруженный документ
      if (data.file_url) {
        window.open(data.file_url, '_blank');
      }
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить документ',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="w-full px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-white/50"
            >
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Реестр пользователя ({userInfo.fio})</h1>
              <p className="text-sm text-gray-600 mt-1">
                Детальная информация по всем аудитам и наблюдениям
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/pab-registration')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Icon name="Plus" size={18} className="mr-2" />
            Создать аудит
          </Button>
        </div>

        {/* Registry Table */}
        <Card>
          <CardHeader>
            <CardTitle>Все аудиты по датам</CardTitle>
            <CardDescription>
              Всего аудитов: {audits.length} | Всего наблюдений: {userInfo.totalObservations}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Icon name="Loader2" className="animate-spin text-blue-600" size={48} />
              </div>
            ) : audits.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="FolderOpen" className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">У вас пока нет проведенных аудитов</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">№</TableHead>
                      <TableHead className="w-[140px]">№ Документа</TableHead>
                      <TableHead className="w-[120px]">Дата</TableHead>
                      <TableHead className="w-[200px]">Подразделение</TableHead>
                      <TableHead className="w-[90px] text-center">Наблюдений</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((audit, index) => (
                      <TableRow key={audit.id} className="hover:bg-blue-50/50">
                        <TableCell className="font-medium text-gray-600">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => handleDocClick(audit.doc_number)}
                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-100 text-blue-800 text-sm font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                          >
                            <Icon name="FileText" size={14} className="mr-1.5" />
                            {audit.doc_number}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{formatDate(audit.doc_date)}</TableCell>
                        <TableCell className="text-sm text-gray-700">{audit.department}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 text-sm font-bold">
                            {audit.observations_count}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Всего проведено аудитов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Icon name="CheckCircle" className="text-green-600" size={32} />
                <span className="text-3xl font-bold text-gray-900">{userInfo.totalAudits}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Всего выписано наблюдений
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Icon name="Eye" className="text-amber-600" size={32} />
                <span className="text-3xl font-bold text-gray-900">{userInfo.totalObservations}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Документ не найден</DialogTitle>
            <DialogDescription>
              Документ <strong>{selectedDocNumber}</strong> отсутствует в системе.
              <br />
              Загрузите файл ПАБ (PDF, Word, Excel), чтобы сохранить его в системе.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Выберите файл документа ПАБ</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <Icon name="File" size={16} />
                  <span>{selectedFile.name}</span>
                  <span className="text-gray-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-blue-900 mb-1">Куда сохраняется документ?</p>
                  <p>Файл будет загружен в облачное хранилище проекта в папку <code className="bg-white px-1.5 py-0.5 rounded text-xs">/pab-documents/</code></p>
                  <p className="mt-2">После загрузки вы сможете открыть его по клику на номер документа в любой момент.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleFileUpload} disabled={!selectedFile} className="bg-blue-600 hover:bg-blue-700">
              <Icon name="Upload" size={16} className="mr-2" />
              Загрузить документ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}