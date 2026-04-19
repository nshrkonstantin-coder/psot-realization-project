import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/api';

interface EmailConfig {
  success: boolean;
  smtp_configured: boolean;
  smtp: {
    host: string;
    port: number;
    user: string;
    secure: boolean;
  };
  imap: {
    host: string;
    port: number;
  };
  admin_email: string;
  inbox: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    preview: string;
    is_read: boolean;
    has_attachments: boolean;
  }>;
  inbox_count?: number;
  inbox_error?: string;
}

export default function EmailConfigPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingImap, setTestingImap] = useState(false);
  const [imapTest, setImapTest] = useState<{
    success: boolean;
    connected?: boolean;
    stats?: { total: number; unread: number };
    error?: string;
  } | null>(null);
  const [fetchingEmails, setFetchingEmails] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async (withEmails = false) => {
    try {
      setLoading(true);
      const url = withEmails 
        ? 'https://functions.poehali.dev/af46c7f8-4efa-482e-8ed7-2fe62bfbed54?fetch_emails=true&limit=20'
        : 'https://functions.poehali.dev/af46c7f8-4efa-482e-8ed7-2fe62bfbed54';
      
      const response = await apiFetch(url);
      const data = await response.json();
      
      if (data.success) {
        setConfig(data);
        if (withEmails && data.inbox?.length > 0) {
          toast.success(`Загружено писем: ${data.inbox.length}`);
        }
      } else {
        toast.error('Ошибка загрузки конфигурации', {
          description: data.error || 'Проверьте SMTP настройки в секретах'
        });
      }
    } catch (error) {
      toast.error('Ошибка подключения', {
        description: 'Не удалось загрузить конфигурацию почты'
      });
    } finally {
      setLoading(false);
      setFetchingEmails(false);
    }
  };

  const testImapConnection = async () => {
    try {
      setTestingImap(true);
      const response = await apiFetch('https://functions.poehali.dev/af46c7f8-4efa-482e-8ed7-2fe62bfbed54', {
        method: 'POST',
        body: JSON.stringify({ action: 'test_imap' })
      });
      
      const data = await response.json();
      setImapTest(data);
      
      if (data.success && data.connected) {
        toast.success('✅ IMAP подключен!', {
          description: `Всего писем: ${data.stats.total}, непрочитанных: ${data.stats.unread}`
        });
      } else {
        toast.error('Ошибка IMAP', {
          description: data.error || 'Не удалось подключиться'
        });
      }
    } catch (error) {
      toast.error('Ошибка теста IMAP');
    } finally {
      setTestingImap(false);
    }
  };

  const handleFetchEmails = async () => {
    setFetchingEmails(true);
    await loadConfig(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Загрузка конфигурации...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Ошибка загрузки</CardTitle>
            <CardDescription>Не удалось загрузить конфигурацию почты</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => loadConfig()}>
              <Icon name="RefreshCw" className="mr-2 h-4 w-4" />
              Повторить
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Заголовок */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Icon name="Mail" className="h-8 w-8" />
          Автоматическая настройка почты
        </h1>
        <p className="text-muted-foreground">
          Система автоматически определила настройки на основе ваших SMTP параметров
        </p>
      </div>

      <Tabs defaultValue="smtp" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="smtp">
            <Icon name="Send" className="mr-2 h-4 w-4" />
            SMTP (Отправка)
          </TabsTrigger>
          <TabsTrigger value="imap">
            <Icon name="Inbox" className="mr-2 h-4 w-4" />
            IMAP (Получение)
          </TabsTrigger>
          <TabsTrigger value="inbox">
            <Icon name="Mail" className="mr-2 h-4 w-4" />
            Входящие
            {config.inbox_count ? (
              <Badge variant="secondary" className="ml-2">{config.inbox_count}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* SMTP конфигурация */}
        <TabsContent value="smtp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Send" className="h-5 w-5" />
                SMTP Конфигурация
                <Badge variant="secondary" className="ml-auto">✅ Настроено</Badge>
              </CardTitle>
              <CardDescription>Параметры для отправки писем</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Сервер</p>
                  <p className="text-lg font-mono">{config.smtp.host}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Порт</p>
                  <p className="text-lg font-mono">{config.smtp.port}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Пользователь</p>
                  <p className="text-lg font-mono">{config.smtp.user}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Безопасность</p>
                  <Badge variant={config.smtp.secure ? "default" : "secondary"}>
                    {config.smtp.secure ? '🔒 TLS/SSL' : '❌ Нет'}
                  </Badge>
                </div>
              </div>

              {config.admin_email && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Email администратора</p>
                  <p className="text-lg">{config.admin_email}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMAP конфигурация */}
        <TabsContent value="imap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Inbox" className="h-5 w-5" />
                IMAP Конфигурация
                {imapTest?.connected && (
                  <Badge variant="secondary" className="ml-auto">✅ Подключено</Badge>
                )}
              </CardTitle>
              <CardDescription>Параметры для получения писем</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Сервер</p>
                  <p className="text-lg font-mono">{config.imap.host}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Порт</p>
                  <p className="text-lg font-mono">{config.imap.port}</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <Button 
                  onClick={testImapConnection} 
                  disabled={testingImap}
                  className="w-full"
                >
                  {testingImap ? (
                    <>
                      <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                      Проверка подключения...
                    </>
                  ) : (
                    <>
                      <Icon name="TestTube" className="mr-2 h-4 w-4" />
                      Тест IMAP подключения
                    </>
                  )}
                </Button>

                {imapTest && (
                  <Card className={imapTest.success ? 'bg-green-50' : 'bg-red-50'}>
                    <CardContent className="pt-6">
                      {imapTest.success && imapTest.connected ? (
                        <div className="space-y-2">
                          <p className="font-medium flex items-center gap-2 text-green-700">
                            <Icon name="CheckCircle" className="h-5 w-5" />
                            Подключение успешно!
                          </p>
                          {imapTest.stats && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Всего писем</p>
                                <p className="text-2xl font-bold">{imapTest.stats.total}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Непрочитанных</p>
                                <p className="text-2xl font-bold text-blue-600">{imapTest.stats.unread}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="font-medium flex items-center gap-2 text-red-700">
                            <Icon name="XCircle" className="h-5 w-5" />
                            Ошибка подключения
                          </p>
                          <p className="text-sm text-muted-foreground">{imapTest.error}</p>
                          
                          {imapTest.error?.includes('IMAP is disabled') && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="font-medium text-yellow-900 mb-2">
                                💡 Как включить IMAP в Яндекс почте:
                              </p>
                              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                                <li>Откройте почту Яндекс в браузере</li>
                                <li>Перейдите в Настройки → Почтовые программы</li>
                                <li>Включите переключатель "С сервера IMAP"</li>
                                <li>Нажмите "Сохранить изменения"</li>
                                <li>Вернитесь сюда и нажмите "Тест IMAP подключения"</li>
                              </ol>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Входящие письма */}
        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Mail" className="h-5 w-5" />
                Входящие письма
              </CardTitle>
              <CardDescription>Последние письма из вашего почтового ящика</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleFetchEmails} 
                disabled={fetchingEmails}
                className="w-full"
              >
                {fetchingEmails ? (
                  <>
                    <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                    Загрузка писем...
                  </>
                ) : (
                  <>
                    <Icon name="RefreshCw" className="mr-2 h-4 w-4" />
                    Загрузить входящие письма
                  </>
                )}
              </Button>

              {config.inbox_error && (
                <Card className="bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-red-700">{config.inbox_error}</p>
                  </CardContent>
                </Card>
              )}

              {config.inbox && config.inbox.length > 0 ? (
                <div className="space-y-2">
                  {config.inbox.map((email) => (
                    <Card key={email.id} className={email.is_read ? 'bg-gray-50' : 'bg-blue-50'}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              {!email.is_read && (
                                <Badge variant="default" className="text-xs">Новое</Badge>
                              )}
                              <p className="font-medium">{email.subject || '(Без темы)'}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">От: {email.from}</p>
                            <p className="text-sm text-muted-foreground">{email.date}</p>
                            {email.preview && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                {email.preview}
                              </p>
                            )}
                          </div>
                          {email.has_attachments && (
                            <Icon name="Paperclip" className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : config.inbox?.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <Icon name="Inbox" className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нажмите кнопку выше, чтобы загрузить письма</p>
                  </CardContent>
                </Card>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}