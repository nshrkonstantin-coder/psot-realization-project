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

interface Worker {
  id: number;
  worker_number: string;
  qr_token: string;
  fio: string;
  subdivision: string;
  position: string;
  sheet_name: string;
}

interface WorkerFull extends Worker {
  extra_data: Record<string, string>;
  created_at: string;
}

interface SheetInfo {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
}

const WorkersRegistryPage = () => {
  const navigate = useNavigate();
  // Пробуем несколько вариантов ключей
  const orgId = localStorage.getItem('organizationId')
    || localStorage.getItem('organization_id')
    || localStorage.getItem('orgId')
    || '';
  const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
  const userRole = localStorage.getItem('userRole') || '';
  const userDept = (localStorage.getItem('userDepartment') || '').toLowerCase();
  const isAdmin = userRole === 'superadmin' || userRole === 'admin';
  const isOtipb = isAdmin || userDept.includes('отипб') || userDept.includes('охрана труда') || userDept.includes('от и пб') || userDept.includes('от и пб') || !!userId;

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Карточка работника
  const [selectedWorker, setSelectedWorker] = useState<WorkerFull | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [savingWorker, setSavingWorker] = useState(false);

  // QR
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  // Загрузка Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStep, setUploadStep] = useState<'idle' | 'analyzing' | 'confirm' | 'importing'>('idle');
  const [parsedSheets, setParsedSheets] = useState<SheetInfo[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState('');

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

    // Проверяем QR из URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('qr');
    if (token) {
      fetch(`${WORKERS_API}?action=qr&token=${token}`)
        .then(r => r.json())
        .then(d => { if (d.success) openWorker(d.worker.id); });
    }

    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wRes, sRes] = await Promise.all([
        fetch(`${WORKERS_API}?action=list&organization_id=${orgId}`),
        fetch(`${WORKERS_API}?action=sheets&organization_id=${orgId}`)
      ]);
      const wData = await wRes.json();
      const sData = await sRes.json();

      if (wData.success) setWorkers(wData.workers || []);
      if (sData.success) {
        const sheetList: string[] = sData.sheets || [];
        setSheets(sheetList);
        if (sheetList.length > 0 && !activeSheet) setActiveSheet(sheetList[0]);
      }
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const generateQr = useCallback(async (token: string): Promise<string> => {
    const internalUrl = `${window.location.origin}/workers-registry?qr=${token}`;
    try {
      return await QRCode.toDataURL(internalUrl, { width: 120, margin: 1 });
    } catch { return ''; }
  }, []);

  useEffect(() => {
    const visible = filtered;
    visible.forEach(async (w) => {
      if (w.qr_token && !qrImages[w.qr_token]) {
        const img = await generateQr(w.qr_token);
        setQrImages(prev => ({ ...prev, [w.qr_token]: img }));
      }
    });
  }, [workers, activeSheet]);

  // ── Открыть карточку ──────────────────────────────────────────────────────
  const openWorker = async (id: number) => {
    try {
      const res = await fetch(`${WORKERS_API}?action=worker&id=${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedWorker(data.worker);
        setEditData({
          fio: data.worker.fio,
          subdivision: data.worker.subdivision,
          position: data.worker.position,
          ...data.worker.extra_data
        });
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
          action: 'update_worker', id: selectedWorker.id,
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
        setSelectedWorker(null);
        loadData();
      }
    } catch { toast.error('Ошибка сохранения'); }
    finally { setSavingWorker(false); }
  };

  // ── Загрузка Excel ────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setUploadStep('analyzing');
    toast.info('Читаю файл...');

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellFormula: true, cellNF: true });

      const sheetsInfo: SheetInfo[] = [];

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        // Читаем как массив массивов для получения заголовков
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
        if (!raw || raw.length === 0) continue;

        // Находим первую непустую строку как заголовок
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          const rowArr = raw[i] as unknown[];
          if (rowArr.some(c => c !== null && c !== undefined && String(c).trim() !== '')) {
            headerRowIdx = i;
            break;
          }
        }

        const headerRow = (raw[headerRowIdx] as unknown[]).map(c => String(c ?? '').trim());
        const headers = headerRow.filter(h => h !== '');

        // Читаем строки данных
        const rows: Record<string, string>[] = [];
        for (let i = headerRowIdx + 1; i < raw.length; i++) {
          const rowArr = raw[i] as unknown[];
          const rowObj: Record<string, string> = {};
          let hasValue = false;
          headers.forEach((h, idx) => {
            const val = rowArr[idx];
            const strVal = val !== null && val !== undefined ? String(val).trim() : '';
            rowObj[h] = strVal;
            if (strVal) hasValue = true;
          });
          if (hasValue) rows.push(rowObj);
        }

        sheetsInfo.push({ name: sheetName, headers, rows });
      }

      if (sheetsInfo.length === 0) {
        toast.error('Не удалось прочитать листы файла');
        setUploadStep('idle');
        e.target.value = '';
        return;
      }

      setParsedSheets(sheetsInfo);

      // Отправляем структуру на backend
      const res = await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_excel',
          organization_id: orgId,
          sheets: sheetsInfo.map(s => ({ name: s.name, headers: s.headers }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setUploadStep('confirm');
        toast.success(data.message);
        await loadData();
      } else {
        toast.error(data.error || 'Ошибка анализа');
        setUploadStep('idle');
      }
    } catch (err) {
      console.error(err);
      toast.error('Ошибка чтения файла');
      setUploadStep('idle');
    }
    e.target.value = '';
  };

  // ── Импорт данных (этап 2) ────────────────────────────────────────────────
  const confirmImport = async () => {
    setUploadStep('importing');
    let totalImported = 0;

    for (const sheet of parsedSheets) {
      setImportProgress(`Импортирую лист «${sheet.name}»...`);
      try {
        const res = await fetch(WORKERS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'import_sheet',
            organization_id: orgId,
            user_id: userId,
            sheet_name: sheet.name,
            headers: sheet.headers,
            rows: sheet.rows,
            file_name: pendingFile?.name || 'registry.xlsx',
            file_size: pendingFile?.size || 0
          })
        });
        const data = await res.json();
        if (data.success) {
          totalImported += data.imported || 0;
          toast.success(`Лист «${sheet.name}»: ${data.imported} добавлено`);
        } else {
          toast.error(`Лист «${sheet.name}»: ${data.error}`);
        }
      } catch {
        toast.error(`Ошибка импорта листа «${sheet.name}»`);
      }
    }

    setUploadStep('idle');
    setImportProgress('');
    setParsedSheets([]);
    setPendingFile(null);
    toast.success(`Итого импортировано: ${totalImported} работников`);
    await loadData();
  };

  // ── Ручное добавление ─────────────────────────────────────────────────────
  const addWorkerManual = async () => {
    if (!newWorker.fio.trim()) { toast.error('Введите ФИО'); return; }
    setAddingWorker(true);
    try {
      const res = await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_worker', organization_id: orgId, user_id: userId,
          sheet_name: activeSheet, ...newWorker
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Работник добавлен, №${data.worker_number}`);
        setNewWorker({ fio: '', subdivision: '', position_name: '' });
        setShowAddForm(false);
        loadData();
      }
    } catch { toast.error('Ошибка добавления'); }
    finally { setAddingWorker(false); }
  };

  // ── Выгрузка в Excel ──────────────────────────────────────────────────────
  const exportExcel = () => {
    if (workers.length === 0) { toast.error('Нет данных для выгрузки'); return; }
    const wb = XLSX.utils.book_new();
    const bySheet: Record<string, Worker[]> = {};
    workers.forEach(w => {
      const s = w.sheet_name || 'Реестр';
      if (!bySheet[s]) bySheet[s] = [];
      bySheet[s].push(w);
    });
    Object.entries(bySheet).forEach(([sheetName, sheetWorkers]) => {
      const data = sheetWorkers.map(w => ({
        '№ID': w.worker_number, 'ФИО': w.fio,
        'Подразделение': w.subdivision, 'Должность': w.position
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    });
    XLSX.writeFile(wb, 'реестр_работников.xlsx');
  };

  // ── Печать QR визитки ─────────────────────────────────────────────────────
  const printQrCard = async (worker: Worker) => {
    const qr = qrImages[worker.qr_token] || await generateQr(worker.qr_token);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>QR - ${worker.fio}</title>
      <style>body{font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
      .card{border:2px solid #333;border-radius:8px;padding:12px;width:200px;text-align:center}
      .card img{width:120px;height:120px}.id{font-size:10px;color:#666;margin-top:4px}
      .fio{font-size:11px;font-weight:bold;margin:4px 0}.pos{font-size:10px;color:#444}</style></head>
      <body><div class="card"><img src="${qr}"/>
      <div class="id">${worker.worker_number}</div><div class="fio">${worker.fio}</div>
      <div class="pos">${worker.position}</div><div class="pos">${worker.subdivision}</div></div>
      <script>window.onload=()=>{window.print();window.close()}</script></body></html>`);
    win.document.close();
  };

  const printAllQr = async () => {
    const cards = await Promise.all(filtered.map(async w => {
      const qr = qrImages[w.qr_token] || await generateQr(w.qr_token);
      return `<div class="card"><img src="${qr}"/>
        <div class="id">${w.worker_number}</div><div class="fio">${w.fio}</div>
        <div class="pos">${w.position}</div><div class="pos">${w.subdivision}</div></div>`;
    }));
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>QR реестр</title>
      <style>body{font-family:Arial;margin:0;padding:16px}.grid{display:flex;flex-wrap:wrap;gap:12px}
      .card{border:2px solid #333;border-radius:8px;padding:10px;width:180px;text-align:center}
      .card img{width:110px;height:110px}.id{font-size:9px;color:#666}
      .fio{font-size:10px;font-weight:bold;margin:3px 0}.pos{font-size:9px;color:#444}</style></head>
      <body><div class="grid">${cards.join('')}</div>
      <script>window.onload=()=>{window.print();window.close()}</script></body></html>`);
    win.document.close();
  };

  // ── QR сканер ─────────────────────────────────────────────────────────────
  const startQrScanner = async () => {
    setShowQrScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
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
          const match = code.data.match(/[?&]qr=([^&]+)/);
          if (match) {
            stopQrScanner();
            fetch(`${WORKERS_API}?action=qr&token=${match[1]}`)
              .then(r => r.json())
              .then(d => { if (d.success) openWorker(d.worker.id); else toast.error('Работник не найден'); });
          }
        }
      }, 300);
    } catch { toast.error('Нет доступа к камере'); setShowQrScanner(false); }
  };

  const stopQrScanner = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setShowQrScanner(false);
  };

  // ── Фильтрация ────────────────────────────────────────────────────────────
  const filtered = workers.filter(w => {
    const matchSheet = !activeSheet || w.sheet_name === activeSheet || sheets.length === 0;
    const matchSearch = !search ||
      w.fio?.toLowerCase().includes(search.toLowerCase()) ||
      w.subdivision?.toLowerCase().includes(search.toLowerCase()) ||
      w.worker_number?.toLowerCase().includes(search.toLowerCase());
    return matchSheet && matchSearch;
  });

  const totalBySheet = (sheetName: string) =>
    workers.filter(w => w.sheet_name === sheetName).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Шапка */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => {
            const dept = (localStorage.getItem('userDepartment') || '').toLowerCase();
            const role = localStorage.getItem('userRole') || '';
            if (role === 'superadmin' || role === 'admin') navigate('/ot-management');
            else if (dept.includes('отипб') || dept.includes('охрана труда') || dept.includes('от и пб')) navigate('/otipb-department');
            else navigate('/otipb-workspace-dashboard');
          }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition flex items-center gap-2 pr-3">
            <Icon name="ArrowLeft" size={20} />
            <span className="text-sm text-slate-300">Назад</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Реестр работников</h1>
            <p className="text-slate-400 text-xs">{workers.length} работников · {sheets.length} раздел(ов)</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={startQrScanner} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <Icon name="QrCode" size={15} className="mr-1" />Сканировать
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <Icon name="Download" size={15} className="mr-1" />Выгрузить Excel
          </Button>
          {isOtipb && (
            <>
              <Button size="sm" onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Icon name="UserPlus" size={15} className="mr-1" />Добавить работника
              </Button>
              <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-green-600 hover:bg-green-700">
                <Icon name="Upload" size={15} className="mr-1" />Загрузить Excel
              </Button>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Вкладки-листы */}
      {sheets.length > 0 && (
        <div className="bg-slate-800 border-b border-slate-700 px-4 overflow-x-auto">
          <div className="flex gap-1 py-2 min-w-max">
            <button
              onClick={() => setActiveSheet('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeSheet === ''
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Все ({workers.length})
            </button>
            {sheets.map(sheet => (
              <button
                key={sheet}
                onClick={() => setActiveSheet(sheet)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap flex items-center gap-2 ${
                  activeSheet === sheet
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icon name="FileSpreadsheet" size={14} />
                {sheet}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSheet === sheet ? 'bg-blue-500' : 'bg-slate-600'
                }`}>
                  {totalBySheet(sheet)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
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

        {/* Статус загрузки */}
        {uploadStep !== 'idle' && (
          <Card className="bg-slate-800 border-blue-500 p-4 mb-4">
            {uploadStep === 'analyzing' && (
              <div className="flex items-center gap-3 text-blue-400">
                <Icon name="Loader" size={20} className="animate-spin" />
                <span>Читаю файл и анализирую структуру...</span>
              </div>
            )}
            {uploadStep === 'confirm' && (
              <div>
                <div className="text-green-400 font-semibold mb-2">
                  ✓ Найдено {parsedSheets.length} листов:
                </div>
                <div className="space-y-1 mb-3">
                  {parsedSheets.map(s => (
                    <div key={s.name} className="text-slate-300 text-sm flex items-center gap-2">
                      <Icon name="FileSpreadsheet" size={14} className="text-green-400" />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-slate-500">— {s.rows.length} строк, {s.headers.length} колонок</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={confirmImport} className="bg-green-600 hover:bg-green-700">
                    <Icon name="Upload" size={15} className="mr-1" />
                    Импортировать всё
                  </Button>
                  <Button variant="outline" onClick={() => { setUploadStep('idle'); setParsedSheets([]); }}
                    className="border-slate-600 text-slate-300">
                    Отмена
                  </Button>
                </div>
              </div>
            )}
            {uploadStep === 'importing' && (
              <div className="flex items-center gap-3 text-green-400">
                <Icon name="Loader" size={20} className="animate-spin" />
                <span>{importProgress || 'Импортирую...'}</span>
              </div>
            )}
          </Card>
        )}

        {/* Таблица */}
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Icon name="Loader" size={36} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-8 text-center">
            <Icon name="Users" size={48} className="mx-auto text-slate-500 mb-3" />
            <p className="text-slate-400 mb-2">
              {workers.length === 0
                ? 'Реестр пуст. Загрузите Excel файл или добавьте работников вручную.'
                : 'По данному разделу работников нет.'}
            </p>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-sm">{filtered.length} работников</span>
              <Button size="sm" variant="outline" onClick={printAllQr}
                className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <Icon name="Printer" size={14} className="mr-1" />Печать всех QR
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
                    {!activeSheet && sheets.length > 1 && (
                      <th className="text-left p-3 text-slate-400 font-medium">Раздел</th>
                    )}
                    <th className="p-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w, idx) => (
                    <tr
                      key={w.id}
                      onClick={() => openWorker(w.id)}
                      className={`border-b border-slate-700 hover:bg-slate-750 cursor-pointer transition ${
                        idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/50'
                      }`}
                    >
                      <td className="p-3">
                        <span className="text-xs text-blue-400 font-mono">{w.worker_number}</span>
                      </td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        {qrImages[w.qr_token] ? (
                          <div className="flex items-center gap-1">
                            <img src={qrImages[w.qr_token]} alt="QR" className="w-10 h-10 rounded" />
                            <button onClick={() => printQrCard(w)}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              title="Печать">
                              <Icon name="Printer" size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-slate-700 rounded animate-pulse" />
                        )}
                      </td>
                      <td className="p-3 font-medium text-white">{w.fio || '—'}</td>
                      <td className="p-3 text-slate-300">{w.subdivision || '—'}</td>
                      <td className="p-3 text-slate-300">{w.position || '—'}</td>
                      {!activeSheet && sheets.length > 1 && (
                        <td className="p-3">
                          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                            {w.sheet_name}
                          </span>
                        </td>
                      )}
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
      </div>

      {/* Модал: карточка работника */}
      {selectedWorker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl my-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-blue-900/40 to-slate-900 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 rounded-full p-3">
                  <Icon name="User" size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedWorker.fio}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-blue-400 font-mono text-sm">{selectedWorker.worker_number}</span>
                    {selectedWorker.sheet_name && (
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {selectedWorker.sheet_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedWorker.qr_token && qrImages[selectedWorker.qr_token] && (
                  <div className="text-center">
                    <img src={qrImages[selectedWorker.qr_token]} alt="QR" className="w-20 h-20 rounded" />
                    <button onClick={() => printQrCard(selectedWorker as unknown as Worker)}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-1 block w-full">
                      Печать
                    </button>
                  </div>
                )}
                <button onClick={() => { setSelectedWorker(null); setEditMode(false); }}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-400">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.keys(editData).map(key => (
                      <div key={key}>
                        <Label className="text-slate-400 text-xs mb-1 block">
                          {key === 'fio' ? 'ФИО' : key === 'subdivision' ? 'Подразделение' : key === 'position' ? 'Должность' : key}
                        </Label>
                        <Input value={editData[key] || ''} onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))}
                          className="bg-slate-800 border-slate-600 text-white" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={saveWorker} disabled={savingWorker} className="bg-green-600 hover:bg-green-700">
                      {savingWorker && <Icon name="Loader" size={16} className="animate-spin mr-1" />}
                      Сохранить
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)} className="border-slate-600 text-slate-300">
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <InfoRow label="ФИО" value={selectedWorker.fio} />
                    <InfoRow label="Подразделение" value={selectedWorker.subdivision} />
                    <InfoRow label="Должность" value={selectedWorker.position} />
                    {Object.entries(selectedWorker.extra_data)
                      .filter(([k]) => !['fio', 'subdivision', 'position'].includes(k))
                      .map(([k, v]) => <InfoRow key={k} label={k} value={String(v)} />)}
                  </div>
                  {isOtipb && (
                    <Button onClick={() => setEditMode(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
                      <Icon name="Edit" size={16} className="mr-1" />Редактировать
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модал: добавить вручную */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-slate-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Добавить работника</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white">
                <Icon name="X" size={20} />
              </button>
            </div>
            {sheets.length > 1 && (
              <div className="mb-3">
                <Label className="text-slate-400 text-sm">Раздел</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {sheets.map(s => (
                    <button key={s} onClick={() => setNewWorker(p => ({ ...p }))}
                      className={`px-3 py-1 rounded-lg text-sm border transition ${
                        activeSheet === s ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-600 text-slate-400 hover:border-blue-500'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <Label className="text-slate-400 text-sm">ФИО *</Label>
                <Input value={newWorker.fio} onChange={e => setNewWorker(p => ({ ...p, fio: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white mt-1" placeholder="Иванов Иван Иванович" />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Подразделение</Label>
                <Input value={newWorker.subdivision} onChange={e => setNewWorker(p => ({ ...p, subdivision: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Должность</Label>
                <Input value={newWorker.position_name} onChange={e => setNewWorker(p => ({ ...p, position_name: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={addWorkerManual} disabled={addingWorker} className="bg-blue-600 hover:bg-blue-700 flex-1">
                {addingWorker && <Icon name="Loader" size={16} className="animate-spin mr-1" />}
                Сохранить
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="border-slate-600 text-slate-300">
                Отмена
              </Button>
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
            <Icon name="X" size={16} className="mr-1" />Закрыть
          </Button>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-800 rounded-lg p-3">
    <div className="text-slate-500 text-xs mb-1">{label}</div>
    <div className="text-white text-sm font-medium break-words">{value || '—'}</div>
  </div>
);

export default WorkersRegistryPage;