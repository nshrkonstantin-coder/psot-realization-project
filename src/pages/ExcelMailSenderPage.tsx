import { useState, useRef } from 'react';
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

const BACKEND_URL = (func2url as Record<string, string>)['excel-mail-sender'] || '';

export default function ExcelMailSenderPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'sending' | 'done'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [senderName, setSenderName] = useState('АСУБТ');
  const [subject, setSubject] = useState('Информационное сообщение');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ email: string; success: boolean; message: string }[]>([]);

  const emailCol = headers.find(h => {
    const l = h.toLowerCase();
    return l.includes('электронная почта') || l === 'email' || l === 'e-mail' || l === 'почта';
  });
  const includeCol = headers.find(h => {
    const l = h.toLowerCase();
    return l.includes('включить в рассылку') || l.includes('рассылка');
  });

  const toSendRows = includeCol
    ? rows.filter(r => {
        const v = (r[includeCol] || '').toLowerCase().trim();
        return ['да', 'yes', '1', 'true', '+', 'х', 'x'].includes(v);
      })
    : rows;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowed.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({ title: 'Ошибка', description: 'Загрузите файл формата .xlsx или .xls', variant: 'destructive' });
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
      setStep('preview');
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!emailCol) {
      toast({ title: 'Ошибка', description: 'Не найдена колонка с Email-адресами', variant: 'destructive' });
      return;
    }
    setStep('sending');
    setLoading(true);
    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          headers,
          rows,
          sender_name: senderName,
          subject,
        }),
      });
      const data = await res.json();
      if (!data.success && !data.results) throw new Error(data.error || 'Ошибка отправки');
      setResults(data.results || []);
      setStep('done');
      toast({ title: `Отправлено: ${data.sent} из ${data.total}` });
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка', variant: 'destructive' });
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setResults([]);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:via-indigo-900 dark:to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate('/admin')} className="border-blue-600/50 text-blue-600 dark:text-blue-400">
            <Icon name="ArrowLeft" size={18} className="mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Рассылка по Excel</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Загрузите таблицу и отправьте персональные письма работникам</p>
          </div>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <Card className="p-8 bg-white dark:bg-slate-800/50 border-blue-600/20">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <Icon name="FileSpreadsheet" size={40} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Загрузите Excel-файл</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Таблица должна содержать колонку <strong>«Электронная почта»</strong> и
                колонку <strong>«Включить в рассылку»</strong> (значения: да / yes / + / х)
              </p>
              <label className="cursor-pointer inline-block">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <div className="flex flex-col items-center gap-2 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-xl p-10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  {loading ? (
                    <Icon name="Loader2" size={32} className="text-blue-500 animate-spin" />
                  ) : (
                    <Icon name="Upload" size={32} className="text-blue-500" />
                  )}
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {loading ? 'Обрабатываю файл...' : 'Нажмите для выбора файла .xlsx / .xls'}
                  </span>
                </div>
              </label>
            </div>
          </Card>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-6">
            {/* Settings */}
            <Card className="p-6 bg-white dark:bg-slate-800/50 border-blue-600/20">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Icon name="Settings" size={20} className="text-blue-500" />
                Настройки рассылки
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Отображаемое имя отправителя</Label>
                  <Input
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Например: ЭСМО или АСУБТ"
                    className="mt-1 bg-white dark:bg-slate-700 border-blue-600/30"
                  />
                  <p className="text-xs text-slate-400 mt-1">Под этим именем придёт письмо работнику</p>
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Тема письма</Label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Информационное сообщение"
                    className="mt-1 bg-white dark:bg-slate-700 border-blue-600/30"
                  />
                </div>
              </div>
            </Card>

            {/* Info */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 border border-blue-600/20 rounded-lg px-4 py-2">
                <Icon name="FileText" size={16} className="text-blue-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{fileName}</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 border border-blue-600/20 rounded-lg px-4 py-2">
                <Icon name="Rows" size={16} className="text-slate-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Строк всего: {rows.length}</span>
              </div>
              {includeCol && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-500/30 rounded-lg px-4 py-2">
                  <Icon name="Send" size={16} className="text-green-500" />
                  <span className="text-sm text-green-700 dark:text-green-400">Будет отправлено: {toSendRows.length}</span>
                </div>
              )}
              {!emailCol && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-2">
                  <Icon name="AlertCircle" size={16} className="text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-400">Колонка «Электронная почта» не найдена</span>
                </div>
              )}
            </div>

            {/* Table Preview */}
            <Card className="p-0 bg-white dark:bg-slate-800/50 border-blue-600/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-600/10 flex items-center gap-2">
                <Icon name="Table" size={18} className="text-blue-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Предпросмотр таблицы</h3>
              </div>
              <div className="overflow-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50">
                      {headers.map((h, i) => (
                        <th key={i} className={`px-3 py-2 text-left font-semibold border-b border-slate-200 dark:border-slate-600 whitespace-nowrap
                          ${h === includeCol ? 'text-green-600 dark:text-green-400' : ''}
                          ${h === emailCol ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {h}
                          {h === emailCol && <span className="ml-1 text-xs opacity-60">(email)</span>}
                          {h === includeCol && <span className="ml-1 text-xs opacity-60">(фильтр)</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((row, ri) => {
                      const included = includeCol
                        ? ['да', 'yes', '1', 'true', '+', 'х', 'x'].includes((row[includeCol] || '').toLowerCase().trim())
                        : true;
                      return (
                        <tr key={ri} className={`border-b border-slate-100 dark:border-slate-700 ${included ? 'bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                          {headers.map((h, ci) => (
                            <td key={ci} className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-xs truncate">
                              {row[h] || ''}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {rows.length > 50 && (
                      <tr>
                        <td colSpan={headers.length} className="px-3 py-2 text-slate-400 text-center text-xs">
                          ... и ещё {rows.length - 50} строк
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="border-slate-400/50 text-slate-600 dark:text-slate-400">
                <Icon name="RefreshCcw" size={16} className="mr-2" />
                Загрузить другой файл
              </Button>
              <Button
                onClick={handleSend}
                disabled={!emailCol || toSendRows.length === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Icon name="Send" size={16} className="mr-2" />
                Отправить {toSendRows.length} писем
              </Button>
            </div>
          </div>
        )}

        {/* Step: Sending */}
        {step === 'sending' && (
          <Card className="p-12 bg-white dark:bg-slate-800/50 border-blue-600/20 text-center">
            <Icon name="Loader2" size={48} className="text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Отправляю письма...</h2>
            <p className="text-slate-500">Пожалуйста, не закрывайте страницу</p>
          </Card>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="space-y-6">
            <Card className="p-8 bg-white dark:bg-slate-800/50 border-blue-600/20 text-center">
              <Icon name="CheckCircle2" size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Рассылка завершена</h2>
              <div className="flex justify-center gap-6 mt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">{results.filter(r => r.success).length}</div>
                  <div className="text-sm text-slate-500">Доставлено</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400">{results.filter(r => !r.success && r.message !== 'Пропущено (не включён в рассылку)').length}</div>
                  <div className="text-sm text-slate-500">Ошибок</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-400">{results.filter(r => r.message === 'Пропущено (не включён в рассылку)').length}</div>
                  <div className="text-sm text-slate-500">Пропущено</div>
                </div>
              </div>
            </Card>

            <Card className="p-0 bg-white dark:bg-slate-800/50 border-blue-600/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-600/10">
                <h3 className="font-semibold text-slate-900 dark:text-white">Результаты отправки</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-96 overflow-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <Icon
                      name={r.success ? 'CheckCircle2' : r.message.includes('Пропущено') ? 'MinusCircle' : 'XCircle'}
                      size={18}
                      className={r.success ? 'text-green-500' : r.message.includes('Пропущено') ? 'text-slate-400' : 'text-red-400'}
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{r.email}</span>
                    <span className="text-xs text-slate-500">{r.message}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Button onClick={reset} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <Icon name="RefreshCcw" size={16} className="mr-2" />
              Новая рассылка
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}