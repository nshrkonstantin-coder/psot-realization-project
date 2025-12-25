import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

export const TechnicalSupport = () => {
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState('problem');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; size: number }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      toast.error('Файл слишком большой. Максимум 10 МБ');
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const base64Content = base64Data.split(',')[1];

        const response = await fetch('https://functions.poehali.dev/e519c776-33cc-4cea-bdaa-1d10b684b777', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload_file',
            fileName: file.name,
            fileData: base64Content,
            fileType: file.type
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setUploadedFiles([...uploadedFiles, {
            name: file.name,
            url: data.fileUrl,
            size: file.size
          }]);
          toast.success('Файл загружен');
        } else {
          toast.error(data.error || 'Ошибка загрузки файла');
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Ошибка загрузки файла');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Опишите ваш запрос');
      return;
    }

    setSending(true);

    try {
      const userFio = localStorage.getItem('userFio') || 'Неизвестный пользователь';
      const userCompany = localStorage.getItem('userCompany') || 'Не указана';
      const userEmail = localStorage.getItem('userEmail') || 'Не указан';
      const userId = localStorage.getItem('userId') || 'Не указан';

      const response = await fetch('https://functions.poehali.dev/e519c776-33cc-4cea-bdaa-1d10b684b777', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_request',
          requestType,
          description,
          userFio,
          userCompany,
          userEmail,
          userId,
          attachments: uploadedFiles
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Запрос отправлен! Мы свяжемся с вами в ближайшее время');
        setDescription('');
        setRequestType('problem');
        setUploadedFiles([]);
        setOpen(false);
      } else {
        toast.error(data.error || 'Ошибка отправки запроса');
      }
    } catch (error) {
      console.error('Support request error:', error);
      toast.error('Ошибка соединения');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10"
        >
          <Icon name="Headphones" size={20} className="mr-2" />
          Техническая поддержка
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-blue-600/30 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-400">
            Техническая поддержка
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Опишите проблему, предложите улучшение или закажите разработку нового блока
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-slate-300">Тип запроса</Label>
            <RadioGroup value={requestType} onValueChange={setRequestType}>
              <div className="flex items-center space-x-2 bg-slate-700/50 p-3 rounded-lg">
                <RadioGroupItem value="problem" id="problem" />
                <Label htmlFor="problem" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Icon name="AlertCircle" size={20} className="text-red-400" />
                  <div>
                    <div className="font-semibold">Проблема в работе</div>
                    <div className="text-sm text-slate-400">Сообщить об ошибке или неполадке</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 bg-slate-700/50 p-3 rounded-lg">
                <RadioGroupItem value="recommendation" id="recommendation" />
                <Label htmlFor="recommendation" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Icon name="Lightbulb" size={20} className="text-yellow-400" />
                  <div>
                    <div className="font-semibold">Рекомендация</div>
                    <div className="text-sm text-slate-400">Предложить улучшение</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 bg-slate-700/50 p-3 rounded-lg">
                <RadioGroupItem value="new_feature" id="new_feature" />
                <Label htmlFor="new_feature" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Icon name="Plus" size={20} className="text-green-400" />
                  <div>
                    <div className="font-semibold">Заказать новый блок</div>
                    <div className="text-sm text-slate-400">Разработка нового функционала</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="text-slate-300">
              Описание запроса
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробно опишите вашу проблему, рекомендацию или требования к новому блоку..."
              className="min-h-[150px] bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-slate-300">Прикрепить файлы</Label>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || uploadedFiles.length >= 3}
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {uploading ? (
                  <>
                    <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Icon name="Paperclip" size={20} className="mr-2" />
                    Выбрать файл (макс. 10 МБ)
                  </>
                )}
              </Button>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icon name="FileText" size={20} className="text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{file.name}</div>
                          <div className="text-xs text-slate-400">{formatFileSize(file.size)}</div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 flex-shrink-0"
                      >
                        <Icon name="X" size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400">
                Можно прикрепить до 3 файлов любого формата
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={sending}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={sending || !description.trim()}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {sending ? (
                <>
                  <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Icon name="Send" size={20} className="mr-2" />
                  Отправить запрос
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};