import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import func2url from '../../backend/func2url.json';

interface RowData { [key: string]: string; }
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';
type TrackStatus = 'sent' | 'opened';
interface RowState {
  sendStatus: SendStatus;
  trackStatus?: TrackStatus;
  trackId?: string;
  errorMsg?: string;
  sendProgress: number;
  sentAt?: string;
  openedAt?: string;
}

const BACKEND_URL = (func2url as Record<string, string>)['excel-mail-sender'] || '';

export default function ExcelMailSenderPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'table'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [rowStates, setRowStates] = useState<RowState[]>([]);
  const [previewRow, setPreviewRow] = useState<{ row: RowData; idx: number } | null>(null);

  // Настройки рассылки
  const [senderName, setSenderName] = useState('АСУБТ');
  const [subject, setSubject] = useState('Информационное сообщение');

  const isUrl = (val: string) => /^https?:\/\//i.test(val.trim());

  const emailCol = headers.find(h => {
    const l = h.toLowerCase().trim();
    return l === 'электронная почта' || l === 'email' || l === 'e-mail' || l === 'почта';
  });
  const includeCol = headers.find(h => {
    const l = h.toLowerCase().trim();
    return l === 'включить в рассылку' || l === 'рассылка';
  });
  const excludeFromBody = new Set([emailCol, includeCol].filter(Boolean) as string[]);
  const bodyColumns = headers.filter(h => !excludeFromBody.has(h));

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const STORAGE_KEY = 'excel_mailer_state';

  // Восстановление из localStorage при монтировании
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const { headers: h, rows: r, fileName: fn, rowStates: rs } = JSON.parse(saved);
      if (h && r && fn) {
        setHeaders(h);
        setRows(r);
        setFileName(fn);
        setRowStates(rs || r.map(() => ({ sendStatus: 'idle', sendProgress: 0 })));
        setStep('table');
      }
    } catch { /* ignore */ }
  }, []);

  // Поллинг статусов
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
      const newlyOpened: number[] = [];
      setRowStates(prev => {
        const next = [...prev];
        toCheck.forEach(({ i, trackId }) => {
          const s = data.statuses[trackId!];
          if (s && s.status === 'opened' && next[i].trackStatus !== 'opened') {
            next[i] = { ...next[i], trackStatus: 'opened', openedAt: s.opened_at };
            newlyOpened.push(i);
          }
        });
        return next;
      });
      newlyOpened.forEach(i => {
        const email = rows[i]?.[emailCol || ''] || '';
        toast({
          title: '📬 Письмо открыто!',
          description: email ? `${email} открыл письмо` : `Строка ${i + 1} — письмо открыто`,
        });
      });
    } catch { /* ignore */ }
  }, [rows, emailCol, toast]);

  useEffect(() => {
    if (step !== 'table') return;
    const hasSent = rowStates.some(s => s.sendStatus === 'sent' && s.trackStatus !== 'opened');
    if (!hasSent) return;
    const timer = setInterval(() => pollStatuses(rowStates), 15000);
    return () => clearInterval(timer);
  }, [step, rowStates, pollStatuses]);

  // Сохранение состояния в localStorage
  useEffect(() => {
    if (step !== 'table' || !headers.length) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ headers, rows, fileName, rowStates }));
    } catch { /* ignore */ }
  }, [step, headers, rows, fileName, rowStates]);

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
      updateRowState(idx, { sendStatus: 'sent', sendProgress: 100, trackId: data.track_id, trackStatus: 'sent', sentAt: new Date().toISOString() });
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
    localStorage.removeItem(STORAGE_KEY);
  };

  // Светлое письмо
  const buildPreviewHtml = (row: RowData) => {
    const renderVal = (val: string) => {
      if (isUrl(val) && !val.includes(' ')) {
        return `<a href="${val}" target="_blank" style="color:#2563eb;word-break:break-all">${val}</a>`;
      }
      return `<span style="white-space:pre-wrap;word-break:break-word">${val}</span>`;
    };
    const rowsHtml = bodyColumns.map(col =>
      `<tr>
        <td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc;width:40%;vertical-align:top;color:#374151">${col}</td>
        <td style="padding:10px 14px;border:1px solid #e2e8f0;vertical-align:top;color:#111827">${renderVal(row[col] || '')}</td>
      </tr>`
    ).join('');

    // Все URL из строки — выводим кнопками
    const urlEntries = Object.entries(row).filter(([, val]) => isUrl(val) && !val.includes(' '));
    const urlButtons = urlEntries.map(([col, val]) =>
      `<a href="${val}" target="_blank"
        style="display:inline-block;margin:4px 6px 4px 0;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
        ${col} →
      </a>`
    ).join('');
    const urlBlock = urlButtons
      ? `<div style="margin-top:20px;padding:16px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe">
           <div style="font-size:13px;font-weight:600;color:#1e40af;margin-bottom:8px">Ссылки для перехода:</div>
           ${urlButtons}
         </div>`
      : '';

    const fromDisplay = senderName;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:16px;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#2563eb;padding:24px 28px">
    <div style="font-size:20px;font-weight:700;color:#fff;margin:0">${senderName}</div>
    <div style="font-size:13px;color:#bfdbfe;margin-top:4px">Информационное сообщение</div>
  </div>
  <div style="padding:24px 28px">
    <p style="margin:0 0 16px;font-size:15px;color:#374151">Уважаемый сотрудник,<br>направляем вам следующую информацию:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
      ${rowsHtml}
    </table>
    ${urlBlock}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
    <div style="font-size:12px;color:#6b7280">${fromDisplay}</div>
  </div>
</div>
</body></html>`;
  };

  const [sendingAll, setSendingAll] = useState(false);

  const handleSendAll = async () => {
    if (!emailCol) {
      toast({ title: 'Ошибка', description: 'Не найдена колонка «Электронная почта»', variant: 'destructive' });
      return;
    }
    const pendingIdxs = rows
      .map((row, i) => {
        const rs = rowStates[i];
        const hasEmail = !!(emailCol && row[emailCol]);
        const notSending = rs.sendStatus !== 'sending';
        const needsSend = rs.sendStatus === 'idle' || rs.sendStatus === 'error';
        return hasEmail && notSending && needsSend ? i : -1;
      })
      .filter(i => i >= 0);

    if (!pendingIdxs.length) {
      toast({ title: 'Нет писем для отправки', description: 'Все строки уже отправлены или не имеют email' });
      return;
    }

    setSendingAll(true);
    for (const idx of pendingIdxs) {
      await handleSendRow(idx);
      // Небольшая пауза между письмами чтобы не перегружать сервер
      await new Promise(r => setTimeout(r, 300));
    }
    setSendingAll(false);
    toast({ title: 'Рассылка завершена', description: `Отправлено ${pendingIdxs.length} писем` });
  };

  const pendingCount = rows.filter((row, i) => {
    const rs = rowStates[i];
    return !!(emailCol && row[emailCol]) && (rs?.sendStatus === 'idle' || rs?.sendStatus === 'error');
  }).length;

  const sentCount = rowStates.filter(s => s.sendStatus === 'sent').length;
  const openedCount = rowStates.filter(s => s.trackStatus === 'opened').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:via-indigo-900 dark:to-slate-900 p-4 md:p-6">
      <div className="w-full">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
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
                Таблица должна содержать колонку <strong>«Электронная почта»</strong>.<br />
                Колонка <strong>«Включить в рассылку»</strong> — необязательная, для фильтрации.
              </p>
              <label className="cursor-pointer block">
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} disabled={loading} />
                <div className="flex flex-col items-center gap-3 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-xl p-10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  {loading
                    ? <Icon name="Loader2" size={36} className="text-blue-500 animate-spin" />
                    : <Icon name="Upload" size={36} className="text-blue-500" />}
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

            {/* ── Настройки письма ── */}
            <Card className="p-4 bg-white dark:bg-slate-800/50 border-blue-600/20">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-40">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm">Имя отправителя в письме</Label>
                  <Input value={senderName} onChange={e => setSenderName(e.target.value)}
                    placeholder="Например: ЭСМО" className="mt-1 h-9 bg-white dark:bg-slate-700 border-blue-600/30" />
                </div>
                <div className="flex-1 min-w-40">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm">Тема письма</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Информационное сообщение" className="mt-1 h-9 bg-white dark:bg-slate-700 border-blue-600/30" />
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2 text-center">
                    <div className="font-bold text-green-600 text-lg leading-none">{sentCount}</div>
                    <div className="text-green-700 dark:text-green-400 text-xs mt-0.5">Отправлено</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-500/30 rounded-lg px-3 py-2 text-center">
                    <div className="font-bold text-blue-600 text-lg leading-none">{openedCount}</div>
                    <div className="text-blue-700 dark:text-blue-400 text-xs mt-0.5">Просмотрено</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-300/30 rounded-lg px-3 py-2 text-center">
                    <div className="font-bold text-slate-600 dark:text-slate-300 text-lg leading-none">{rows.length}</div>
                    <div className="text-slate-500 text-xs mt-0.5">Всего</div>
                  </div>
                </div>
                {emailCol && pendingCount > 0 && (
                  <Button
                    onClick={handleSendAll}
                    disabled={sendingAll}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-10 px-5 whitespace-nowrap"
                  >
                    {sendingAll ? (
                      <>
                        <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                        Рассылка...
                      </>
                    ) : (
                      <>
                        <Icon name="SendHorizonal" size={16} className="mr-2" />
                        Отправить всем ({pendingCount})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>

            {!emailCol && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-400/40 rounded-lg px-4 py-3 text-red-700 dark:text-red-400 text-sm">
                <Icon name="AlertCircle" size={18} />
                Колонка «Электронная почта» не найдена — отправка недоступна
              </div>
            )}

            {/* Таблица */}
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
                          {headers.map((h, ci) => {
                            const val = row[h] || '';
                            const urlOnly = isUrl(val) && !val.includes(' ');
                            return (
                              <td key={ci} className="px-3 py-2.5 text-slate-700 dark:text-slate-300 align-top">
                                {urlOnly ? (
                                  <a href={val} target="_blank" rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                                    {val}
                                  </a>
                                ) : (
                                  <span className="block min-w-[120px] max-w-xs whitespace-pre-wrap break-words">{val}</span>
                                )}
                              </td>
                            );
                          })}
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

        {/* ── Модалка предпросмотра ── */}
        {previewRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setPreviewRow(null)}>
            <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '90vh' }}
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">Предпросмотр письма</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Строка #{previewRow.idx + 1}
                    {emailCol && ` · ${previewRow.row[emailCol]}`}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreviewRow(null)}>
                  <Icon name="X" size={16} />
                </Button>
              </div>

              {/* Meta */}
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex-shrink-0 flex flex-wrap gap-4">
                <span><strong className="text-slate-700 dark:text-slate-300">От:</strong> {senderName}</span>
                <span><strong className="text-slate-700 dark:text-slate-300">Кому:</strong> {emailCol ? previewRow.row[emailCol] : '—'}</span>
                <span><strong className="text-slate-700 dark:text-slate-300">Тема:</strong> {subject}</span>
              </div>

              {/* iframe — большой */}
              <div className="flex-1 overflow-hidden">
                <iframe
                  srcDoc={buildPreviewHtml(previewRow.row)}
                  className="w-full h-full border-0"
                  style={{ minHeight: '500px' }}
                  title="preview"
                  sandbox="allow-same-origin allow-popups allow-top-navigation"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 justify-end flex-shrink-0">
                <Button variant="outline" onClick={() => setPreviewRow(null)}>Закрыть</Button>
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
          <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${rs.sendProgress}%` }} />
        </div>
      </div>
    );
  }

  if (rs.sendStatus === 'sent') {
    const fmtTime = (iso?: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };
    return (
      <div className="space-y-1 min-w-36">
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
          <Icon name="CheckCircle2" size={14} />
          Отправлено {rs.sentAt && <span className="text-green-500/70 font-normal">{fmtTime(rs.sentAt)}</span>}
        </div>
        {rs.trackStatus === 'opened' ? (
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium">
            <Icon name="MailOpen" size={14} />
            Открыто {rs.openedAt && <span className="text-blue-500/70 font-normal">{fmtTime(rs.openedAt)}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            Слежу за открытием...
          </div>
        )}
        <button onClick={onSend}
          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline transition-colors">
          <Icon name="RefreshCcw" size={11} />
          Отправить повторно
        </button>
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
        <p className="text-red-400 text-xs max-w-[180px] break-words" title={rs.errorMsg}>{rs.errorMsg}</p>
        <button onClick={onSend} className="text-xs text-blue-500 hover:underline">Повторить</button>
      </div>
    );
  }

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
        className={`h-7 px-2 text-xs text-white ${isIncluded ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 hover:bg-slate-500'}`}
        onClick={onSend}>
        <Icon name="Send" size={13} className="mr-1" />
        Отправить
      </Button>
    </div>
  );
}