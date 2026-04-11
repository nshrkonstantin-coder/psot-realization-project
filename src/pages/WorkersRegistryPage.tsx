import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';

const WORKERS_API = 'https://functions.poehali.dev/85a795aa-16f4-4214-8690-191bbd6e73d2';
const QR_EXTERNAL_URL = 'https://pogoda.mail.ru/prognoz/moskva/';

interface Worker {
  id: number;
  worker_number: string;
  qr_token: string;
  fio: string;
  subdivision: string;
  position: string;
}

interface WorkerFull extends Worker {
  extra_data: Record<string, string>;
  created_at: string;
}

interface Column {
  key: string;
  label: string;
  order: number;
  type: string;
  is_core: boolean;
}

const WorkersRegistryPage = () => {
  const navigate = useNavigate();
  const orgId = localStorage.getItem('organizationId') || '';
  const userId = localStorage.getItem('userId') || '';
  const userRole = localStorage.getItem('userRole') || '';
  const userDept = (localStorage.getItem('userDepartment') || '').toLowerCase();
  const isAdmin = userRole === 'superadmin' || userRole === 'admin';
  const isOtipb = isAdmin || userDept.includes('отипб') || userDept.includes('охрана труда') || userDept.includes('от и пб');

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Выбранный работник (полный просмотр)
  const [selectedWorker, setSelectedWorker] = useState<WorkerFull | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [savingWorker, setSavingWorker] = useState(false);

  // QR коды
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  // Загрузка Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStep, setUploadStep] = useState<'idle' | 'analyzing' | 'confirm' | 'importing'>('idle');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Ручное добавление
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWorker, setNewWorker] = useState({ fio: '', subdivision: '', position_name: '' });
  const [addingWorker, setAddingWorker] = useState(false);

  // QR сканер
  const [showQrScanner, setShowQrScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) { navigate('/'); return; }
    if (!isOtipb) { navigate('/dashboard'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wRes, cRes] = await Promise.all([
        fetch(`${WORKERS_API}?action=list&organization_id=${orgId}`),
        fetch(`${WORKERS_API}?action=columns&organization_id=${orgId}`)
      ]);
      const wData = await wRes.json();
      const cData = await cRes.json();
      if (wData.success) setWorkers(wData.workers || []);
      if (cData.success) setColumns(cData.columns || []);
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const generateQr = useCallback(async (token: string): Promise<string> => {
    const internalUrl = `${window.location.origin}/workers-registry?qr=${token}`;
    try {
      return await QRCode.toDataURL(internalUrl, { width: 120, margin: 1, color: { dark: '#000', light: '#fff' } });
    } catch { return ''; }
  }, []);

  useEffect(() => {
    workers.forEach(async (w) => {
      if (!qrImages[w.qr_token]) {
        const img = await generateQr(w.qr_token);
        setQrImages(prev => ({ ...prev, [w.qr_token]: img }));
      }
    });
  }, [workers]);

  // ── Открыть работника ─────────────────────────────────────────────────────
  const openWorker = async (id: number) => {
    try {
      const res = await fetch(`${WORKERS_API}?action=worker&id=${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedWorker(data.worker);
        setEditData({ fio: data.worker.fio, subdivision: data.worker.subdivision, position: data.worker.position, ...data.worker.extra_data });
        setEditMode(false);
      }
    } catch { toast.error('Ошибка загрузки карточки'); }
  };

  const saveWorker = async () => {
    if (!selectedWorker) return;
    setSavingWorker(true);
    try {
      const res = await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_worker',
          id: selectedWorker.id,
          fio: editData.fio || selectedWorker.fio,
          subdivision: editData.subdivision || selectedWorker.subdivision,
          position_name: editData.position || selectedWorker.position,
          extra_data: editData
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Изменения сохранены');
        setEditMode(false);
        loadData();
        setSelectedWorker(null);
      }
    } catch { toast.error('Ошибка сохранения'); } finally { setSavingWorker(false); }
  };

  // ── Excel: анализ (этап 1) ─────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setUploadStep('analyzing');

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
      if (!json.length) { toast.error('Файл пуст'); setUploadStep('idle'); return; }

      const headers = (json[0] as string[]).map(h => String(h || '').trim()).filter(Boolean);
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < json.length; i++) {
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = String(json[i][idx] ?? ''); });
        if (Object.values(row).some(v => v.trim())) rows.push(row);
      }

      setParsedHeaders(headers);
      setParsedRows(rows);

      const res = await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_excel', headers, organization_id: orgId })
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        setUploadStep('confirm');
        toast.success(`Структура сформирована: ${headers.length} колонок`);
      }
    } catch (err) {
      toast.error('Ошибка разбора файла');
      setUploadStep('idle');
    }
    e.target.value = '';
  };

  // ── Excel: импорт данных (этап 2) ─────────────────────────────────────────
  const confirmImport = async () => {
    setUploadStep('importing');
    try {
      const res = await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_excel',
          headers: parsedHeaders,
          rows: parsedRows,
          organization_id: orgId,
          user_id: userId,
          file_name: pendingFile?.name || 'registry.xlsx',
          file_size: pendingFile?.size || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Импортировано ${data.imported} работников`);
        setUploadStep('idle');
        setParsedHeaders([]);
        setParsedRows([]);
        setPendingFile(null);
        loadData();
      } else {
        toast.error(data.error || 'Ошибка импорта');
        setUploadStep('idle');
      }
    } catch { toast.error('Ошибка импорта'); setUploadStep('idle'); }
  };

  // ── Ручное добавление ─────────────────────────────────────────────────────
  const addWorkerManual = async () => {
    if (!newWorker.fio.trim()) { toast.error('Введите ФИО'); return; }
    setAddingWorker(true);
    try {
      const res = await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_worker', organization_id: orgId, user_id: userId, ...newWorker })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Работник добавлен, №${data.worker_number}`);
        setNewWorker({ fio: '', subdivision: '', position_name: '' });
        setShowAddForm(false);
        loadData();
      }
    } catch { toast.error('Ошибка добавления'); } finally { setAddingWorker(false); }
  };

  // ── Выгрузка в Excel ──────────────────────────────────────────────────────
  const exportExcel = () => {
    const data = workers.map(w => ({
      '№ID': w.worker_number,
      'ФИО': w.fio,
      'Подразделение': w.subdivision,
      'Должность': w.position
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Реестр работников');
    XLSX.writeFile(wb, 'реестр_работников.xlsx');
  };

  // ── Печать QR визитки ─────────────────────────────────────────────────────
  const printQrCard = async (worker: Worker) => {
    const qr = qrImages[worker.qr_token] || await generateQr(worker.qr_token);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR - ${worker.fio}</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; }
        .card { border: 2px solid #333; border-radius: 8px; padding: 12px; width: 200px; text-align: center; }
        .card img { width: 120px; height: 120px; }
        .card .id { font-size: 10px; color: #666; margin-top: 4px; }
        .card .fio { font-size: 11px; font-weight: bold; margin: 4px 0; }
        .card .pos { font-size: 10px; color: #444; }
      </style></head><body>
      <div class="card">
        <img src="${qr}" />
        <div class="id">${worker.worker_number}</div>
        <div class="fio">${worker.fio}</div>
        <div class="pos">${worker.position}</div>
        <div class="pos">${worker.subdivision}</div>
      </div>
      <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  // ── Печать всех QR ────────────────────────────────────────────────────────
  const printAllQr = async () => {
    const cards = await Promise.all(filtered.map(async (w) => {
      const qr = qrImages[w.qr_token] || await generateQr(w.qr_token);
      return `<div class="card">
        <img src="${qr}" />
        <div class="id">${w.worker_number}</div>
        <div class="fio">${w.fio}</div>
        <div class="pos">${w.position}</div>
        <div class="pos">${w.subdivision}</div>
      </div>`;
    }));
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR реестр работников</title>
      <style>
        body { font-family: Arial; margin: 0; padding: 16px; }
        .grid { display: flex; flex-wrap: wrap; gap: 12px; }
        .card { border: 2px solid #333; border-radius: 8px; padding: 10px; width: 180px; text-align: center; }
        .card img { width: 110px; height: 110px; }
        .id { font-size: 9px; color: #666; }
        .fio { font-size: 10px; font-weight: bold; margin: 3px 0; }
        .pos { font-size: 9px; color: #444; }
      </style></head><body>
      <div class="grid">${cards.join('')}</div>
      <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  // ── QR сканер (веб-камера) ────────────────────────────────────────────────
  const startQrScanner = async () => {
    setShowQrScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      const { default: jsQR } = await import('jsqr');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      scanIntervalRef.current = window.setInterval(() => {
        if (!videoRef.current || !ctx) return;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const url = code.data;
          const match = url.match(/[?&]qr=([^&]+)/);
          if (match) {
            stopQrScanner();
            fetch(`${WORKERS_API}?action=qr&token=${match[1]}`)
              .then(r => r.json())
              .then(d => {
                if (d.success) openWorker(d.worker.id);
                else toast.error('Работник не найден');
              });
          }
        }
      }, 300);
    } catch {
      toast.error('Нет доступа к камере');
      setShowQrScanner(false);
    }
  };

  const stopQrScanner = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setShowQrScanner(false);
  };

  // ── Проверка QR из URL (редирект после сканирования) ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('qr');
    if (token) {
      fetch(`${WORKERS_API}?action=qr&token=${token}`)
        .then(r => r.json())
        .then(d => { if (d.success) openWorker(d.worker.id); });
    }
  }, []);

  const filtered = workers.filter(w =>
    !search || w.fio.toLowerCase().includes(search.toLowerCase()) ||
    w.subdivision?.toLowerCase().includes(search.toLowerCase()) ||
    w.worker_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition">
            <Icon name="ArrowLeft" size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Реестр работников</h1>
            <p className="text-slate-400 text-sm">ОТиПБ · {workers.length} работников</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={startQrScanner} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <Icon name="QrCode" size={16} className="mr-1" /> Сканировать QR
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <Icon name="Download" size={16} className="mr-1" /> Выгрузить Excel
          </Button>
          {isOtipb && (
            <>
              <Button size="sm" onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Icon name="UserPlus" size={16} className="mr-1" /> Добавить
              </Button>
              <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-green-600 hover:bg-green-700">
                <Icon name="Upload" size={16} className="mr-1" /> Загрузить Excel
              </Button>
            </>
          )}
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={handleFileSelect} />

      {/* Поиск */}
      <div className="relative mb-4">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по ФИО, подразделению, №ID..."
          className="pl-9 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
        />
      </div>

      {/* Статус загрузки Excel */}
      {uploadStep !== 'idle' && (
        <Card className="bg-slate-800 border-blue-500 p-4 mb-4">
          {uploadStep === 'analyzing' && (
            <div className="flex items-center gap-3 text-blue-400">
              <Icon name="Loader" size={20} className="animate-spin" />
              <span>Анализирую структуру файла...</span>
            </div>
          )}
          {uploadStep === 'confirm' && (
            <div>
              <div className="text-green-400 font-semibold mb-2">✓ Структура сформирована: {parsedHeaders.length} колонок, {parsedRows.length} строк</div>
              <div className="text-slate-300 text-sm mb-3">Колонки: {parsedHeaders.join(', ')}</div>
              <div className="flex gap-2">
                <Button onClick={confirmImport} className="bg-green-600 hover:bg-green-700">
                  Импортировать {parsedRows.length} работников
                </Button>
                <Button variant="outline" onClick={() => { setUploadStep('idle'); setParsedHeaders([]); setParsedRows([]); }} className="border-slate-600 text-slate-300">
                  Отмена
                </Button>
              </div>
            </div>
          )}
          {uploadStep === 'importing' && (
            <div className="flex items-center gap-3 text-green-400">
              <Icon name="Loader" size={20} className="animate-spin" />
              <span>Импортирую работников...</span>
            </div>
          )}
        </Card>
      )}

      {/* Таблица работников */}
      {loading ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Icon name="Loader" size={32} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700 p-8 text-center">
          <Icon name="Users" size={48} className="mx-auto text-slate-500 mb-3" />
          <p className="text-slate-400">Реестр пуст. Загрузите Excel файл или добавьте работников вручную.</p>
        </Card>
      ) : (
        <>
          <div className="flex justify-end mb-2">
            <Button size="sm" variant="outline" onClick={printAllQr} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Icon name="Printer" size={14} className="mr-1" /> Печать всех QR
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="text-left p-3 text-slate-400 font-medium">№ID</th>
                  <th className="text-left p-3 text-slate-400 font-medium">QR</th>
                  <th className="text-left p-3 text-slate-400 font-medium">ФИО</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Подразделение</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Должность</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w, idx) => (
                  <tr
                    key={w.id}
                    className={`border-b border-slate-700 hover:bg-slate-800 cursor-pointer transition ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-850'}`}
                    onClick={() => openWorker(w.id)}
                  >
                    <td className="p-3">
                      <span className="text-xs text-blue-400 font-mono">{w.worker_number}</span>
                    </td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      {qrImages[w.qr_token] ? (
                        <div className="flex items-center gap-1">
                          <img src={qrImages[w.qr_token]} alt="QR" className="w-10 h-10 rounded" />
                          <button
                            onClick={() => printQrCard(w)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title="Печать визитки"
                          >
                            <Icon name="Printer" size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-slate-700 rounded animate-pulse" />
                      )}
                    </td>
                    <td className="p-3 font-medium text-white">{w.fio}</td>
                    <td className="p-3 text-slate-300">{w.subdivision || '—'}</td>
                    <td className="p-3 text-slate-300">{w.position || '—'}</td>
                    <td className="p-3 text-right">
                      <Icon name="ChevronRight" size={16} className="text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Модал: карточка работника */}
      {selectedWorker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl my-4 shadow-2xl">
            {/* Шапка карточки */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-blue-900/40 to-slate-900 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 rounded-full p-3">
                  <Icon name="User" size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedWorker.fio}</h2>
                  <p className="text-blue-400 font-mono text-sm">{selectedWorker.worker_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {qrImages[selectedWorker.qr_token] && (
                  <div className="text-center">
                    <img src={qrImages[selectedWorker.qr_token]} alt="QR" className="w-20 h-20 rounded" />
                    <button onClick={() => printQrCard(selectedWorker as unknown as Worker)} className="text-xs text-blue-400 hover:text-blue-300 mt-1 block w-full">
                      Печать
                    </button>
                  </div>
                )}
                <button onClick={() => { setSelectedWorker(null); setEditMode(false); }} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>

            {/* Данные */}
            <div className="p-6">
              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['fio', 'subdivision', 'position', ...Object.keys(selectedWorker.extra_data).filter(k => !['fio', 'subdivision', 'position'].includes(k))].map(key => (
                      <div key={key}>
                        <Label className="text-slate-400 text-xs mb-1 block capitalize">
                          {key === 'fio' ? 'ФИО' : key === 'subdivision' ? 'Подразделение' : key === 'position' ? 'Должность' : key}
                        </Label>
                        <Input
                          value={editData[key] || ''}
                          onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={saveWorker} disabled={savingWorker} className="bg-green-600 hover:bg-green-700">
                      {savingWorker ? <Icon name="Loader" size={16} className="animate-spin mr-1" /> : null}
                      Сохранить
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)} className="border-slate-600 text-slate-300">
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="ФИО" value={selectedWorker.fio} />
                    <InfoRow label="Подразделение" value={selectedWorker.subdivision} />
                    <InfoRow label="Должность" value={selectedWorker.position} />
                    {Object.entries(selectedWorker.extra_data)
                      .filter(([k]) => !['fio', 'subdivision', 'position'].includes(k))
                      .map(([k, v]) => <InfoRow key={k} label={k} value={String(v)} />)}
                  </div>
                  {isOtipb && (
                    <Button onClick={() => setEditMode(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
                      <Icon name="Edit" size={16} className="mr-1" /> Редактировать
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модал: добавить работника вручную */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-slate-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Добавить работника</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-slate-400 text-sm">ФИО *</Label>
                <Input value={newWorker.fio} onChange={e => setNewWorker(p => ({ ...p, fio: e.target.value }))} className="bg-slate-900 border-slate-600 text-white mt-1" placeholder="Иванов Иван Иванович" />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Подразделение</Label>
                <Input value={newWorker.subdivision} onChange={e => setNewWorker(p => ({ ...p, subdivision: e.target.value }))} className="bg-slate-900 border-slate-600 text-white mt-1" placeholder="Цех №1" />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Должность</Label>
                <Input value={newWorker.position_name} onChange={e => setNewWorker(p => ({ ...p, position_name: e.target.value }))} className="bg-slate-900 border-slate-600 text-white mt-1" placeholder="Слесарь" />
              </div>
            </div>
            {columns.filter(c => !c.is_core && c.key).length > 0 && (
              <p className="text-slate-500 text-xs mt-3">Остальные поля можно заполнить после создания через редактирование карточки</p>
            )}
            <div className="flex gap-2 mt-4">
              <Button onClick={addWorkerManual} disabled={addingWorker} className="bg-blue-600 hover:bg-blue-700 flex-1">
                {addingWorker ? <Icon name="Loader" size={16} className="animate-spin mr-1" /> : null} Сохранить
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="border-slate-600 text-slate-300">Отмена</Button>
            </div>
          </Card>
        </div>
      )}

      {/* QR сканер */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center gap-4 p-4">
          <h3 className="text-white text-lg font-bold">Наведите камеру на QR-код работника</h3>
          <div className="relative">
            <video ref={videoRef} className="rounded-xl w-full max-w-sm" autoPlay playsInline muted />
            <div className="absolute inset-0 border-2 border-blue-400 rounded-xl pointer-events-none" />
          </div>
          <Button onClick={stopQrScanner} variant="outline" className="border-white text-white hover:bg-white/10">
            <Icon name="X" size={16} className="mr-1" /> Закрыть
          </Button>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-800 rounded-lg p-3">
    <div className="text-slate-500 text-xs mb-1">{label}</div>
    <div className="text-white text-sm font-medium">{value || '—'}</div>
  </div>
);

export default WorkersRegistryPage;
