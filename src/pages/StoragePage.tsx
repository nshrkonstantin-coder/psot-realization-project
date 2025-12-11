import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Folder {
  id: number;
  folder_name: string;
  created_at: string;
}

const StoragePage = () => {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    loadFolders();
  }, [navigate]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/89ba96e1-c10f-490a-ad91-54a977d9f798?user_id=${userId}`);
      
      if (!response.ok) throw new Error('Ошибка загрузки папок');
      
      const data = await response.json();
      setFolders(data.folders || []);
    } catch (error) {
      toast.error('Не удалось загрузить папки');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Введите название папки');
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      console.log('Creating folder:', { userId, folder_name: newFolderName.trim() });
      const response = await fetch('https://functions.poehali.dev/89ba96e1-c10f-490a-ad91-54a977d9f798', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          user_id: userId,
          folder_name: newFolderName.trim()
        })
      });
      
      console.log('Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания папки');
      }

      const organizationId = localStorage.getItem('organizationId');
      if (organizationId) {
        try {
          await fetch('https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4f6ca', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id: organizationId,
              action_type: 'folder_create',
              user_id: localStorage.getItem('userId')
            })
          });
        } catch (error) {
          console.log('Points award failed:', error);
        }
      }
      
      toast.success('Папка создана');
      setNewFolderName('');
      setIsCreateDialogOpen(false);
      loadFolders();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;

    try {
      const response = await fetch('https://functions.poehali.dev/89ba96e1-c10f-490a-ad91-54a977d9f798', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          folder_id: selectedFolder.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка удаления папки');
      }

      toast.success('Папка удалена');
      setIsDeleteDialogOpen(false);
      setSelectedFolder(null);
      loadFolders();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const openDeleteDialog = (folder: Folder) => {
    setSelectedFolder(folder);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/additional')}
              variant="outline"
              className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-3 rounded-xl shadow-lg">
                <Icon name="FolderOpen" size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Хранилище</h1>
            </div>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
          >
            <Icon name="FolderPlus" size={20} className="mr-2" />
            Создать папку
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
          </div>
        ) : folders.length === 0 ? (
          <Card className="bg-slate-800/50 border-yellow-600/30 p-12 text-center">
            <Icon name="FolderOpen" size={64} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Папок пока нет</h3>
            <p className="text-slate-400 mb-6">Создайте первую папку для хранения файлов</p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
            >
              <Icon name="FolderPlus" size={20} className="mr-2" />
              Создать папку
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {folders.map((folder) => (
              <Card
                key={folder.id}
                onClick={() => navigate(`/storage/folder/${folder.id}`)}
                className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-yellow-600/30 hover:border-yellow-600 transition-all hover:scale-105"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-xl shadow-lg">
                      <Icon name="Folder" size={32} className="text-white" />
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(folder);
                      }}
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-white hover:bg-red-600 bg-red-500/20"
                    >
                      <Icon name="Trash2" size={20} />
                    </Button>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 truncate" title={folder.folder_name}>
                    {folder.folder_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {new Date(folder.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-slate-800 border-yellow-600/30">
          <DialogHeader>
            <DialogTitle className="text-white">Создать новую папку</DialogTitle>
            <DialogDescription className="text-slate-400">
              Введите название для новой папки
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Название папки"
            className="bg-slate-700 border-slate-600 text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewFolderName('');
              }}
              className="border-slate-600 text-slate-300"
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateFolder}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-slate-800 border-red-600/30">
          <DialogHeader>
            <DialogTitle className="text-white">Удалить папку?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Вы уверены, что хотите удалить папку "{selectedFolder?.folder_name}"? 
              Все файлы в этой папке также будут удалены.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedFolder(null);
              }}
              className="border-slate-600 text-slate-300"
            >
              Отмена
            </Button>
            <Button
              onClick={handleDeleteFolder}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoragePage;