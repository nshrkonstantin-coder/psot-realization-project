import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import func2url from '../../backend/func2url.json';

interface RowData {
  [key: string]: string;
}

type SendStatus = 'idle' | 'sending' | 'sent' | 'error';
type TrackStatus = 'sent' | 'opened';

interface RowState {
  sendStatus: SendStatus;
  trackStatus?: TrackStatus;
  trackId?: string;
  errorMsg?: string;
  sendProgress: number;
}

const BACKEND_URL = (func2url as Record<string, string>)['excel-mail-sender'] || '';

export default function ExcelMailSenderPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'table'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [senderName, setSenderName] = useState('АСУБТ');
  const [subject, setSubject] = useState('Информационное сообщение');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [rowStates, setRowStates] = useState<RowState[]>([]);
  const [previewRow, setPreviewRow] = useState<{ row: RowData; idx: number } | null>(null);

  const emailCol = headers.find(h => {
    const l = h.toLowerCase();
    return l.includes('электронная почта') || l === 'email' || l === 'e-mail' || l === 'почта';
  });
  const includeCol = headers.find(h => {
    const l = h.toLowerCase();
    return l.includes('включить в рассылку') || l.includes('рассылка');
  });

  const excludeFromBody = new Set([emailCol, includeCol].filter(Boolean));
  const bodyColumns = headers.filter(h => !excludeFromBody.has(h));

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  // Поллинг статусов отправленных писем
  const pollStatuses = useCallback(async (states: RowState[]) => {
    const toCheck = states
      .map((s, i) => ({ i, trackId: s.trackId }))
      .filter(x => x.trackId && states[x.i].trackStatus !== 'opened');

    if (!toCheck.length) return;

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', track_ids: toCheck.map(x => x.trackId) }),
      });
      const data = await res.json();
      if (!data.success) return;

      setRowStates(prev => {
        const next = [...prev];
        toCheck.forEach(({ i, trackId }) => {
          const s = data.statuses[trackId!];
          if (s && s.status === 'opened' && next[i].trackStatus !== 'opened') {
            next[i] = { ...next[i], trackStatus: 'opened' };
          }
        });
        return next;
      });
    } catch {
      // ignore
    }
  }, []);

  // Запускаем поллинг каждые 15 сек
  useEffect(() => {
    if (step !== 'table') return;
    const hasSent = rowStates.some(s => s.sendStatus === 'sent' && s.trackStatus !== 'opened');
    if (!hasSent) return;
    const timer = setInterval(() => pollStatuses(rowStates), 15000);
    return () => clearInterval(timer);
  }, [step, rowStates, pollStatuses]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({ title: 'Ошибка', description: 'Загрузите файл .xlsx или .xls', variant: 'destructive' });
      return;
    }
    setFileName(file.name);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse', file_base64: b64 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка парсинга');
      setHeaders(data.headers);
      setRows(data.rows);
      setRowStates(data.rows.map(() => ({ sendStatus: 'idle', sendProgress: 0 })));
      setStep('table');
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateRowState = (idx: number, patch: Partial<RowState>) => {
    setRowStates(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleSendRow = async (idx: number) => {
    if (!emailCol) {
      toast({ title: 'Ошибка', description: 'Не найдена колонка «Электронная почта»', variant: 'destructive' });
      return;
    }
    setPreviewRow(null);
    updateRowState(idx, { sendStatus: 'sending', sendProgress: 10, errorMsg: undefined });

    // Анимируем прогресс-бар
    let progress = 10;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + 15, 85);
      updateRowState(idx, { sendProgress: progress });
    }, 400);

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          headers,
          row: rows[idx],
          sender_name: senderName,
          subject,
          user_id: userId ? parseInt(userId) : null,
        }),
      });
      const data = await res.json();
      clearInterval(progressInterval);
      if (!data.success) throw new Error(data.error || 'Ошибка отправки');
      updateRowState(idx, { sendStatus: 'sent', sendProgress: 100, trackId: data.track_id, trackStatus: 'sent' });
    } catch (err: unknown) {
      clearInterval(progressInterval);
      const msg = err instanceof Error ? err.message : 'Ошибка';
      updateRowState(idx, { sendStatus: 'error', sendProgress: 0, errorMsg: msg });
      toast({ title: 'Ошибка отправки', description: msg, variant: 'destructive' });
    }
  };

  const reset = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setRowStates([]);
    setFileName('');
    setPreviewRow(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const buildPreviewHtml = (row: RowData) => {
    const rowsHtml = bodyColumns.map(col =>
      `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;background:#f5f5f5;width:40%">${col}</td><td style="padding:8px 12px;border:1px solid #ddd;">${row[col] || ''}</td></tr>`
    ).join('');
    return `<html><body style="font-family:Arial,sans-serif;color:#333;max-width:560px;margin:0 auto">
<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:20px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0;font-size:18px">${senderName}</h2>
  <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">Информационное сообщение</p>
</div>
<div style="padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
  <p style="margin-top:0;font-size:14px">Уважаемый сотрудник,<br>направляем вам следующую информацию:</p>
  <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">${rowsHtml}</table>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
  <p style="color:#64748b;font-size:12px;margin:0">${senderName}</p>
</div></body></html>`;
  };

  const sentCount = rowStates.filter(s => s.sendStatus === 'sent').length;
  const openedCount = rowStates.filter(s => s.trackStatus === 'opened').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:via-indigo-900 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/admin')} className="border-blue-600/50 text-blue-600 dark:text-blue-400">
            <Icon name="ArrowLeft" size={18} className="mr-2" />
            Назад
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Рассылка по Excel</h1>
            {fileName && <p className="text-slate-500 dark:text-slate-400 text-sm">{fileName}</p>}
          </div>
          {step === 'table' && (
            <Button variant="outline" onClick={reset} className="border-slate-400/50 text-slate-600 dark:text-slate-400">
              <Icon name="RefreshCcw" size={16} className="mr-2" />
              Новый файл
            </Button>
          )}
        </div>

        {/* Upload */}
        {step === 'upload' && (
          <Card className="p-8 bg-white dark:bg-slate-800/50 border-blue-600/20 max-w-xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <Icon name="FileSpreadsheet" size={40} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Загрузите Excel-файл</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                Таблица должна содержать колонку <strong>«Электронная почта»</strong>.<br/>
                Колонка <strong>«Включить в рассылку»</strong> — необязательная, для фильтрации.
              </p>
              <label className="cursor-pointer block">
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} disabled={loading} />
                <div className="flex flex-col items-center gap-3 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-xl p-10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  {loading
                    ? <Icon name="Loader2" size={36} className="text-blue-500 animate-spin" />
                    : <Icon name="Upload" size={36} className="text-blue-500" />
                  }
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {loading ? 'Обрабатываю файл...' : 'Нажмите для выбора .xlsx / .xls'}
                  </span>
                </div>
              </label>
            </div>
          </Card>
        )}

        {/* Table view */}
        {step === 'table' && (
          <div className="space-y-4">
            {/* Settings bar */}
            <Card className="p-4 bg-white dark:bg-slate-800/50 border-blue-600/20">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-48">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm">Отправитель (отображается в письме)</Label>
                  <Input value={senderName} onChange={e => setSenderName(e.target.value)}
                    placeholder="Например: ЭСМО" className="mt-1 bg-white dark:bg-slate-700 border-blue-600/30 h-9" />
                </div>
                <div className="flex-1 min-w-48">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm">Тема письма</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Информационное сообщение" className="mt-1 bg-white dark:bg-slate-700 border-blue-600/30 h-9" />
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2 text-center">
                    <div className="font-bold text-green-600 text-lg">{sentCount}</div>
                    <div className="text-green-700 dark:text-green-400">Отправлено</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-500/30 rounded-lg px-3 py-2 text-center">
                    <div className="font-bold text-blue-600 text-lg">{openedCount}</div>
                    <div className="text-blue-700 dark:text-blue-400">Просмотрено</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-300/30 rounded-lg px-3 py-2 text-center">
                    <div className="font-bold text-slate-600 dark:text-slate-300 text-lg">{rows.length}</div>
                    <div className="text-slate-500">Всего</div>
                  </div>
                </div>
              </div>
            </Card>

            {!emailCol && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-400/40 rounded-lg px-4 py-3 text-red-700 dark:text-red-400 text-sm">
                <Icon name="AlertCircle" size={18} />
                Колонка «Электронная почта» не найдена в файле — отправка недоступна
              </div>
            )}

            {/* Main table */}
            <Card className="overflow-hidden bg-white dark:bg-slate-800/50 border-blue-600/20 p-0">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-600">
                      <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 w-10">#</th>
                      {headers.map((h, i) => (
                        <th key={i} className={`px-3 py-3 text-left font-semibold whitespace-nowrap
                          ${h === emailCol ? 'text-blue-600 dark:text-blue-400' : ''}
                          ${h === includeCol ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {h}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 w-48 sticky right-0 bg-slate-50 dark:bg-slate-700/60">
                        Статус / Действие
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => {
                      const rs = rowStates[ri] || { sendStatus: 'idle', sendProgress: 0 };
                      const isIncluded = includeCol
                        ? ['да', 'yes', '1', 'true', '+', 'х', 'x'].includes((row[includeCol] || '').toLowerCase().trim())
                        : true;

                      return (
                        <tr key={ri} className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors
                          ${rs.sendStatus === 'sent' ? 'bg-green-50/40 dark:bg-green-900/10' : ''}
                          ${rs.sendStatus === 'error' ? 'bg-red-50/40 dark:bg-red-900/10' : ''}
                          ${rs.sendStatus === 'sending' ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}
                          hover:bg-slate-50/60 dark:hover:bg-slate-700/20`}>
                          <td className="px-3 py-2.5 text-slate-400 text-xs">{ri + 1}</td>
                          {headers.map((h, ci) => (
                            <td key={ci} className="px-3 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-xs">
                              <span className="truncate block max-w-[200px]">{row[h] || ''}</span>
                            </td>
                          ))}
                          <td className="px-3 py-2.5 sticky right-0 bg-white dark:bg-slate-800 border-l border-slate-100 dark:border-slate-700">
                            <RowAction
                              rs={rs}
                              isIncluded={isIncluded}
                              hasEmail={!!emailCol}
                              onPreview={() => setPreviewRow({ row, idx: ri })}
                              onSend={() => handleSendRow(ri)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Preview Modal */}
        {previewRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setPreviewRow(null)}>
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Предпросмотр письма</h3>
                  <p className="text-sm text-slate-500">Строка #{previewRow.idx + 1} · {emailCol ? previewRow.row[emailCol] : ''}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreviewRow(null)}>
                  <Icon name="X" size={16} />
                </Button>
              </div>
              {/* Email preview */}
              <div className="p-4 max-h-[60vh] overflow-auto">
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-medium">От:</span> {senderName} &nbsp;|&nbsp;
                    <span className="font-medium">Кому:</span> {emailCol ? previewRow.row[emailCol] : '—'} &nbsp;|&nbsp;
                    <span className="font-medium">Тема:</span> {subject}
                  </div>
                  <iframe
                    srcDoc={buildPreviewHtml(previewRow.row)}
                    className="w-full h-80 border-0"
                    title="preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 justify-end">
                <Button variant="outline" onClick={() => setPreviewRow(null)}>Отмена</Button>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={() => { handleSendRow(previewRow.idx); setPreviewRow(null); }}
                  disabled={!emailCol}
                >
                  <Icon name="Send" size={16} className="mr-2" />
                  Отправить
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface RowActionProps {
  rs: RowState;
  isIncluded: boolean;
  hasEmail: boolean;
  onPreview: () => void;
  onSend: () => void;
}

function RowAction({ rs, isIncluded, hasEmail, onPreview, onSend }: RowActionProps) {
  if (rs.sendStatus === 'sending') {
    return (
      <div className="space-y-1 min-w-36">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs">
          <Icon name="Loader2" size={14} className="animate-spin" />
          Отправляю...
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${rs.sendProgress}%` }}
          />
        </div>
      </div>
    );
  }

  if (rs.sendStatus === 'sent') {
    return (
      <div className="space-y-0.5 min-w-36">
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
          <Icon name="CheckCircle2" size={14} />
          Отправлено
        </div>
        {rs.trackStatus === 'opened' ? (
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium">
            <Icon name="Eye" size={14} />
            Просмотрено
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Icon name="Clock" size={12} />
            Ожидает открытия
          </div>
        )}
      </div>
    );
  }

  if (rs.sendStatus === 'error') {
    return (
      <div className="space-y-1 min-w-36">
        <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
          <Icon name="XCircle" size={14} />
          Ошибка
        </div>
        <p className="text-red-400 text-xs truncate max-w-36" title={rs.errorMsg}>{rs.errorMsg}</p>
        <button onClick={onSend} className="text-xs text-blue-500 hover:underline">Повторить</button>
      </div>
    );
  }

  // idle
  if (!hasEmail) return <span className="text-slate-400 text-xs">Нет email</span>;

  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline"
        className="h-7 px-2 text-xs border-slate-300 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        onClick={onPreview}>
        <Icon name="Eye" size={13} className="mr-1" />
        Просмотр
      </Button>
      <Button size="sm"
        className={`h-7 px-2 text-xs text-white ${isIncluded
          ? 'bg-blue-600 hover:bg-blue-700'
          : 'bg-slate-400 hover:bg-slate-500'}`}
        onClick={onSend}>
        <Icon name="Send" size={13} className="mr-1" />
        Отправить
      </Button>
    </div>
  );
}
