import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Icon from "@/components/ui/icon";

interface EmailStatus {
  email: string;
  success: boolean;
  message: string;
  valid_format: boolean;
}

interface EmailStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: EmailStatus[];
  summary: {
    sent_to: string[];
    failed_to: { email: string; reason: string }[];
  };
  total: number;
  sent: number;
  failed: number;
}

const EmailStatusDialog = ({
  open,
  onOpenChange,
  results,
  summary,
  total,
  sent,
  failed,
}: EmailStatusDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Mail" size={20} />
            Результат отправки писем
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-sm text-muted-foreground">Всего</div>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{sent}</div>
              <div className="text-sm text-muted-foreground">Отправлено</div>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{failed}</div>
              <div className="text-sm text-muted-foreground">Не отправлено</div>
            </div>
          </div>

          {/* Успешные отправки */}
          {summary.sent_to.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-green-600">
                <Icon name="CheckCircle2" size={18} />
                Письма отправлены ({summary.sent_to.length}):
              </h3>
              <ScrollArea className="h-32 w-full rounded-md border p-3">
                <div className="space-y-2">
                  {summary.sent_to.map((email, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Icon name="Mail" size={14} className="text-green-600" />
                      <span className="font-mono">{email}</span>
                      <Badge variant="outline" className="ml-auto text-green-600 border-green-600">
                        Доставлено
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Неудачные отправки */}
          {summary.failed_to.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-red-600">
                <Icon name="AlertCircle" size={18} />
                Ошибки отправки ({summary.failed_to.length}):
              </h3>
              <ScrollArea className="h-40 w-full rounded-md border p-3">
                <div className="space-y-3">
                  {summary.failed_to.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-red-500/5 rounded-lg border border-red-200"
                    >
                      <div className="flex items-start gap-2">
                        <Icon name="XCircle" size={16} className="text-red-600 mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="font-mono text-sm font-medium">
                            {item.email}
                          </div>
                          <div className="text-xs text-red-600">
                            {item.reason}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Детальный список всех результатов */}
          <details className="border rounded-lg p-3">
            <summary className="cursor-pointer font-semibold text-sm">
              Детальная информация по всем адресам
            </summary>
            <ScrollArea className="h-48 mt-3">
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-2 rounded hover:bg-muted"
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        name={result.success ? "CheckCircle2" : "XCircle"}
                        size={16}
                        className={result.success ? "text-green-600" : "text-red-600"}
                      />
                      <div>
                        <div className="font-mono text-sm">{result.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {result.message}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge
                        variant={result.success ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {result.success ? "Успех" : "Ошибка"}
                      </Badge>
                      {!result.valid_format && (
                        <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                          Неверный формат
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailStatusDialog;
