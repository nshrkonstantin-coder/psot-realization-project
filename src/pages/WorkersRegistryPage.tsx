import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import PageLockBadge from '@/components/ui/PageLockBadge';
import { isPageLocked } from '@/hooks/usePageLock';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';

const WORKERS_API = 'https://functions.poehali.dev/85a795aa-16f4-4214-8690-191bbd6e73d2';

// Цвета вкладок
const SHEET_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  'Усть-Нера':        { bg: 'from-blue-600 to-blue-700',     border: 'border-blue-500',   text: 'text-blue-300',   icon: 'Users' },
  'Работники':        { bg: 'from-emerald-600 to-teal-700',  border: 'border-emerald-500',text: 'text-emerald-300',icon: 'UserCheck' },
  'ИТР-1':            { bg: 'from-violet-600 to-purple-700', border: 'border-violet-500', text: 'text-violet-300', icon: 'GraduationCap' },
  'ИТР-В комиссию':   { bg: 'from-orange-600 to-amber-700',  border: 'border-orange-500', text: 'text-orange-300', icon: 'ClipboardCheck' },
  'КР + СОУТ':        { bg: 'from-red-600 to-rose-700',      border: 'border-red-500',    text: 'text-red-300',    icon: 'ShieldAlert' },
  'Периодичность МО': { bg: 'from-cyan-600 to-sky-700',      border: 'border-cyan-500',   text: 'text-cyan-300',   icon: 'Stethoscope' },
  'образование':      { bg: 'from-indigo-600 to-blue-700',   border: 'border-indigo-500', text: 'text-indigo-300', icon: 'BookOpen' },
  'ЕПТ РТН':          { bg: 'from-yellow-600 to-orange-700', border: 'border-yellow-500', text: 'text-yellow-300', icon: 'Award' },
  'СВО и Декрет':     { bg: 'from-pink-600 to-rose-700',     border: 'border-pink-500',   text: 'text-pink-300',   icon: 'Heart' },
  'Уволенные':        { bg: 'from-slate-600 to-slate-700',   border: 'border-slate-500',  text: 'text-slate-300',  icon: 'UserX' },
};

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

interface Column {
  key: string;
  label: string;
  order: number;
  sheet_name: string;
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

  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
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
  const [parsedSheets, setParsedSheets] = useState<Record<string, { headers: string[]; rows: Record<string, string>[] }>>({});
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

  // Проверка QR из URL
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const token = p.get('qr');
    if (token) {
      fetch(`${WORKERS_API}?action=qr&token=${token}`)
        .then(r => r.json())
        .then(d => { if (d.success) openWorker(d.worker.id); });
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wRes, cRes] = await Promise.all([
        fetch(`${WORKERS_API}?action=list&organization_id=${orgId}&user_id=${userId}`),
        fetch(`${WORKERS_API}?action=columns&organization_id=${orgId}`)
      ]);
      const wData = await wRes.json();
      const cData = await cRes.json();

      if (wData.success) {
        setAllWorkers(wData.workers || []);
        // Собираем листы из данных работников
        const sheetSet = Array.from(new Set((wData.workers || []).map((w: Worker) => w.sheet_name).filter(Boolean))) as string[];
        setSheets(sheetSet);
        if (sheetSet.length > 0 && !activeSheet) setActiveSheet(sheetSet[0]);
      }
      if (cData.success) setColumns(cData.columns || []);
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Если данных нет — получить листы из колонок
  useEffect(() => {
    if (sheets.length === 0 && columns.length > 0) {
      const sheetSet = Array.from(new Set(columns.map(c => c.sheet_name).filter(Boolean)));
      setSheets(sheetSet);
      if (sheetSet.length > 0) setActiveSheet(sheetSet[0]);
    }
  }, [columns, sheets]);

  const generateQr = useCallback(async (token: string, size = 80): Promise<string> => {
    const internalUrl = `${window.location.origin}/workers-registry?qr=${token}`;
    try { return await QRCode.toDataURL(internalUrl, { width: size, margin: 1, errorCorrectionLevel: 'M' }); }
    catch { return ''; }
  }, []);

  useEffect(() => {
    const visible = allWorkers.filter(w => w.sheet_name === activeSheet);
    visible.forEach(async (w) => {
      if (w.qr_token && !qrImages[w.qr_token]) {
        const img = await generateQr(w.qr_token);
        setQrImages(prev => ({ ...prev, [w.qr_token]: img }));
      }
    });
  }, [allWorkers, activeSheet]);

  // ── Открыть карточку работника ────────────────────────────────────────────
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

  // ── Excel: чтение всех листов ─────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setUploadStep('analyzing');

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellFormula: false, cellDates: true });

      const sheetsData: Record<string, { headers: string[]; rows: Record<string, string>[] }> = {};

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
        if (!json || json.length < 2) continue;

        // Ищем строку-заголовок (первая непустая строка с несколькими заполненными ячейками)
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(json.length, 10); i++) {
          const row = json[i] as string[];
          const filled = row.filter(c => c && String(c).trim()).length;
          if (filled >= 2) { headerRowIdx = i; break; }
        }

        const headerRow = (json[headerRowIdx] as string[]).map(h => String(h || '').trim());
        const headers = headerRow.filter(Boolean);
        if (headers.length === 0) continue;

        const rows: Record<string, string>[] = [];
        for (let i = headerRowIdx + 1; i < json.length; i++) {
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = String((json[i] as string[])[idx] ?? '');
          });
          if (Object.values(row).some(v => String(v).trim())) rows.push(row);
        }

        sheetsData[sheetName] = { headers, rows };
      }

      setParsedSheets(sheetsData);

      // Отправляем структуру на бекенд (этап 1)
      const sheetsList = Object.entries(sheetsData).map(([name, s]) => ({
        sheet_name: name,
        headers: s.headers
      }));

      const res = await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_excel', sheets: sheetsList, organization_id: orgId })
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        setUploadStep('confirm');
        toast.success(`Структура готова: ${Object.keys(sheetsData).length} листов`);
      } else {
        toast.error(data.error || 'Ошибка анализа');
        setUploadStep('idle');
      }
    } catch (err) {
      console.error(err);
      toast.error('Ошибка разбора файла');
      setUploadStep('idle');
    }
    e.target.value = '';
  };

  // ── Excel: импорт данных (этап 2) ─────────────────────────────────────────
  const confirmImport = async () => {
    setUploadStep('importing');
    let totalImported = 0;
    const skippedSheets: string[] = [];
    try {
      for (const [sheetName, sheetData] of Object.entries(parsedSheets)) {
        // Пропускаем заблокированные листы
        if (isPageLocked(sheetName)) {
          skippedSheets.push(sheetName);
          continue;
        }
        const res = await fetch(WORKERS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'import_sheet',
            sheet_name: sheetName,
            headers: sheetData.headers,
            rows: sheetData.rows,
            organization_id: orgId,
            user_id: userId,
            file_name: pendingFile?.name || 'registry.xlsx',
            file_size: pendingFile?.size || 0
          })
        });
        const data = await res.json();
        if (data.success) totalImported += (data.imported || 0);
      }
      if (skippedSheets.length > 0) {
        toast.info(`Пропущено (защита): ${skippedSheets.join(', ')}`);
      }
      toast.success(`Импортировано ${totalImported} записей по ${Object.keys(parsedSheets).length} листам`);
      setUploadStep('idle');
      setParsedSheets({});
      setPendingFile(null);
      loadData();
    } catch {
      toast.error('Ошибка импорта');
      setUploadStep('idle');
    }
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
          sheet_name: activeSheet || 'Работники',
          ...newWorker
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Добавлен, №${data.worker_number}`);
        setNewWorker({ fio: '', subdivision: '', position_name: '' });
        setShowAddForm(false);
        loadData();
      }
    } catch { toast.error('Ошибка добавления'); }
    finally { setAddingWorker(false); }
  };

  // ── Выгрузка в Excel ──────────────────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const grouped: Record<string, Worker[]> = {};
    for (const w of allWorkers) {
      const s = w.sheet_name || 'Общий';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(w);
    }
    for (const [sheet, workers] of Object.entries(grouped)) {
      const sheetCols = columns.filter(c => c.sheet_name === sheet);
      const data = workers.map(w => {
        const row: Record<string, string> = { '№ID': w.worker_number, 'ФИО': w.fio, 'Подразделение': w.subdivision, 'Должность': w.position };
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.substring(0, 31));
    }
    XLSX.writeFile(wb, 'реестр_работников.xlsx');
  };

  // ── HTML карточки для печати ──────────────────────────────────────────────
  const cardHtml = (w: Worker, qr: string) => `
    <div class="card">
      <div class="qr-wrap"><img src="${qr}" alt="QR"/></div>
      <div class="info">
        <div class="num">${w.worker_number}</div>
        <div class="fio">${w.fio}</div>
        <div class="pos">${w.position || ''}</div>
        <div class="sub">${w.subdivision || ''}</div>
      </div>
    </div>`;

  const CARD_CSS = `
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6mm;
      padding: 0;
    }
    .card {
      border: 1.5px solid #ccc;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #fff;
      page-break-inside: avoid;
    }
    .qr-wrap {
      background: #fff;
      padding: 6px 6px 0;
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .qr-wrap img {
      width: 100%;
      max-width: 120px;
      height: auto;
      display: block;
    }
    .info {
      padding: 5px 6px 7px;
      text-align: center;
      width: 100%;
    }
    .num { font-size: 8pt; color: #888; font-family: monospace; margin-bottom: 3px; }
    .fio { font-size: 8.5pt; font-weight: bold; color: #111; margin-bottom: 2px; line-height: 1.2; }
    .pos { font-size: 7.5pt; color: #555; line-height: 1.2; margin-bottom: 1px; }
    .sub { font-size: 7pt; color: #0066cc; line-height: 1.2; }
  `;

  // ── Печать одной QR визитки ────────────────────────────────────────────────
  const printQrCard = async (worker: Worker) => {
    const qr = await generateQr(worker.qr_token, 200);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>QR - ${worker.fio}</title>
      <style>
        @page { size: A4 portrait; margin: 30mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial; display: flex; justify-content: center; align-items: flex-start; padding-top: 20mm; background: #fff; }
        .card { border: 2px solid #333; border-radius: 10px; width: 65mm; overflow: hidden; }
        .qr-wrap { padding: 8px; background: #fff; display: flex; justify-content: center; }
        .qr-wrap img { width: 49mm; height: 49mm; display: block; }
        .info { padding: 8px 10px 10px; text-align: center; border-top: 1px solid #eee; }
        .num { font-size: 9pt; color: #888; font-family: monospace; margin-bottom: 4px; }
        .fio { font-size: 10pt; font-weight: bold; color: #111; margin-bottom: 3px; line-height: 1.3; }
        .pos { font-size: 8.5pt; color: #555; margin-bottom: 2px; line-height: 1.2; }
        .sub { font-size: 8pt; color: #0066cc; line-height: 1.2; }
      </style></head>
      <body>${cardHtml(worker, qr)}</body>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></html>`);
    win.document.close();
  };

  // ── Печать всех QR — 12 карточек на А4 ────────────────────────────────────
  const printAllQr = async () => {
    toast.info(`Генерирую QR коды (${filtered.length} шт.)...`);
    const cards = await Promise.all(filtered.map(async w => {
      const qr = await generateQr(w.qr_token, 200);
      return cardHtml(w, qr);
    }));

    // По 12 карточек на страницу (4 колонки × 3 ряда)
    const pages: string[] = [];
    for (let i = 0; i < cards.length; i += 12) {
      const chunk = cards.slice(i, i + 12);
      while (chunk.length < 12) chunk.push('<div class="card" style="border:none;"></div>');
      pages.push(`<div class="grid">${chunk.join('')}</div>`);
    }

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>QR реестр работников</title>
      <style>
        ${CARD_CSS}
        .page-wrap { page-break-after: always; padding-bottom: 8mm; }
        .page-wrap:last-child { page-break-after: avoid; }
      </style></head>
      <body>
        ${pages.map((p, i) => `<div class="page-wrap" ${i === pages.length - 1 ? '' : ''}>${p}</div>`).join('')}
      </body>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000)}</script></html>`);
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
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
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

  // ── Данные текущей вкладки ────────────────────────────────────────────────
  const currentWorkers = allWorkers.filter(w => w.sheet_name === activeSheet);
  const filtered = currentWorkers.filter(w =>
    !search ||
    (w.fio || '').toLowerCase().includes(search.toLowerCase()) ||
    (w.subdivision || '').toLowerCase().includes(search.toLowerCase()) ||
    (w.worker_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const sheetColumns = columns
    .filter(c => c.sheet_name === activeSheet)
    .sort((a, b) => a.order - b.order)
    .slice(0, 6); // Показываем первые 6 колонок в таблице

  const color = SHEET_COLORS[activeSheet] || { bg: 'from-slate-600 to-slate-700', border: 'border-slate-500', text: 'text-slate-300', icon: 'Table' };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Шапка */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
              <Icon name="ArrowLeft" size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Реестр работников</h1>
              <p className="text-slate-400 text-xs">{allWorkers.length} записей · {sheets.length} разделов</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {activeSheet && <PageLockBadge pageKey={activeSheet} />}
            <Button variant="outline" size="sm" onClick={startQrScanner} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Icon name="QrCode" size={15} className="mr-1" /> Сканировать QR
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Icon name="Download" size={15} className="mr-1" /> Выгрузить Excel
            </Button>
            {isOtipb && (
              <>
                <Button size="sm" onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Icon name="UserPlus" size={15} className="mr-1" /> Добавить
                </Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-green-600 hover:bg-green-700">
                  <Icon name="Upload" size={15} className="mr-1" /> Загрузить Excel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={handleFileSelect} />

      {/* Статус загрузки */}
      {uploadStep !== 'idle' && (
        <div className="max-w-screen-2xl mx-auto px-4 pt-4">
          <Card className="bg-slate-800 border-blue-500 p-4">
            {uploadStep === 'analyzing' && (
              <div className="flex items-center gap-3 text-blue-400">
                <Icon name="Loader" size={20} className="animate-spin" />
                <span>Анализирую структуру файла...</span>
              </div>
            )}
            {uploadStep === 'confirm' && (
              <div>
                <div className="text-green-400 font-semibold mb-2">
                  ✓ Структура готова: {Object.keys(parsedSheets).length} листов
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(parsedSheets).map(([name, s]) => (
                    <span key={name} className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                      {name}: {s.rows.length} строк, {s.headers.length} колонок
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={confirmImport} className="bg-green-600 hover:bg-green-700">
                    Импортировать все данные
                  </Button>
                  <Button variant="outline" onClick={() => { setUploadStep('idle'); setParsedSheets({}); }} className="border-slate-600 text-slate-300">
                    Отмена
                  </Button>
                </div>
              </div>
            )}
            {uploadStep === 'importing' && (
              <div className="flex items-center gap-3 text-green-400">
                <Icon name="Loader" size={20} className="animate-spin" />
                <span>Импортирую данные по листам...</span>
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-4 py-4">
        {/* Вкладки-кнопки по листам */}
        {sheets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {sheets.map(sheet => {
              const c = SHEET_COLORS[sheet] || { bg: 'from-slate-600 to-slate-700', border: 'border-slate-500', text: 'text-slate-300', icon: 'Table' };
              const isActive = activeSheet === sheet;
              const count = allWorkers.filter(w => w.sheet_name === sheet).length;
              // Периодичность МО — отдельная страница-справочник
              const isSpecial = sheet === 'Периодичность МО';
              return (
                <button
                  key={sheet}
                  onClick={() => {
                    if (isSpecial) { navigate('/periodichnost-mo'); return; }
                    setActiveSheet(sheet); setSearch('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium text-sm ${
                    isSpecial
                      ? 'bg-slate-800 border-cyan-600/50 text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-500'
                      : isActive
                        ? `bg-gradient-to-r ${c.bg} border-transparent text-white shadow-lg scale-105`
                        : `bg-slate-800 ${c.border} ${c.text} hover:scale-102 hover:bg-slate-750`
                  }`}
                >
                  <Icon name={isSpecial ? 'Stethoscope' : c.icon as Parameters<typeof Icon>[0]['name']} size={16} />
                  <span>{sheet}</span>
                  {isSpecial && <Icon name="ExternalLink" size={12} className="opacity-60" />}
                  {!isSpecial && count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-700'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {/* Кнопка "Все" */}
            <button
              onClick={() => { setActiveSheet('__all__'); setSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium text-sm ${
                activeSheet === '__all__'
                  ? 'bg-gradient-to-r from-slate-500 to-slate-600 border-transparent text-white shadow-lg scale-105'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-750'
              }`}
            >
              <Icon name="LayoutGrid" size={16} />
              <span>Все</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700">{allWorkers.length}</span>
            </button>
          </div>
        )}

        {/* Заголовок активной вкладки + поиск */}
        {activeSheet && activeSheet !== '__all__' && (
          <div className={`flex items-center justify-between mb-4 flex-wrap gap-3`}>
            <div className={`flex items-center gap-2 ${color.text}`}>
              <div className={`bg-gradient-to-br ${color.bg} p-2 rounded-lg`}>
                <Icon name={color.icon as Parameters<typeof Icon>[0]['name']} size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{activeSheet}</h2>
                <p className="text-xs text-slate-400">{filtered.length} записей</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="pl-8 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 w-56 h-9 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" onClick={printAllQr} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <Icon name="Printer" size={14} className="mr-1" /> Печать QR
              </Button>
            </div>
          </div>
        )}

        {/* Если нет данных */}
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Icon name="Loader" size={36} className="animate-spin" />
          </div>
        ) : sheets.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-10 text-center">
            <Icon name="FileSpreadsheet" size={52} className="mx-auto text-slate-500 mb-4" />
            <p className="text-white font-semibold text-lg mb-2">Реестр пуст</p>
            <p className="text-slate-400 text-sm mb-4">Загрузите Excel файл — система автоматически создаст разделы по вкладкам</p>
            {isOtipb && (
              <Button onClick={() => fileInputRef.current?.click()} className="bg-green-600 hover:bg-green-700">
                <Icon name="Upload" size={16} className="mr-2" /> Загрузить Excel
              </Button>
            )}
          </Card>
        ) : (
          /* Таблица */
          <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="text-left p-3 text-slate-400 font-medium whitespace-nowrap">№ID</th>
                  <th className="text-left p-3 text-slate-400 font-medium">QR</th>
                  {(activeSheet === '__all__' ? ['ФИО', 'Раздел', 'Подразделение', 'Должность'] : 
                    sheetColumns.length > 0 
                      ? sheetColumns.map(c => c.label)
                      : ['ФИО', 'Подразделение', 'Должность']
                  ).map((h, i) => (
                    <th key={i} className="text-left p-3 text-slate-400 font-medium">{h}</th>
                  ))}
                  <th className="p-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(activeSheet === '__all__' ? allWorkers.filter(w =>
                  !search || (w.fio || '').toLowerCase().includes(search.toLowerCase())
                ) : filtered).map((w, idx) => (
                  <tr
                    key={w.id}
                    onClick={() => openWorker(w.id)}
                    className={`border-b border-slate-700/50 hover:bg-slate-800/80 cursor-pointer transition ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/60'}`}
                  >
                    <td className="p-3">
                      <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">{w.worker_number}</span>
                    </td>
                    <td className="p-2" onClick={e => e.stopPropagation()}>
                      {qrImages[w.qr_token] ? (
                        <div className="flex items-center gap-1">
                          <img
                            src={qrImages[w.qr_token]}
                            alt="QR"
                            style={{ width: 36, height: 36, imageRendering: 'pixelated' }}
                            className="rounded border border-slate-600"
                          />
                          <button
                            onClick={() => printQrCard(w)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition"
                            title="Печать визитки"
                          >
                            <Icon name="Printer" size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ width: 36, height: 36 }} className="bg-slate-700 rounded animate-pulse" />
                      )}
                    </td>
                    {activeSheet === '__all__' ? (
                      <>
                        <td className="p-3 font-medium text-white">{w.fio}</td>
                        <td className="p-3"><span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{w.sheet_name}</span></td>
                        <td className="p-3 text-slate-300">{w.subdivision || '—'}</td>
                        <td className="p-3 text-slate-300">{w.position || '—'}</td>
                      </>
                    ) : sheetColumns.length > 0 ? (
                      sheetColumns.map((col, ci) => (
                        <td key={ci} className="p-3 text-slate-300 max-w-48 truncate" title={String((w as Record<string, unknown>)[col.key] || w.fio || '')}>
                          {ci === 0 ? <span className="text-white font-medium">{w.fio}</span> : ((w as Record<string, unknown>)[col.key] as string) || '—'}
                        </td>
                      ))
                    ) : (
                      <>
                        <td className="p-3 font-medium text-white">{w.fio}</td>
                        <td className="p-3 text-slate-300">{w.subdivision || '—'}</td>
                        <td className="p-3 text-slate-300">{w.position || '—'}</td>
                      </>
                    )}
                    <td className="p-3 text-right">
                      <Icon name="ChevronRight" size={15} className="text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-10 text-center text-slate-500">
                <Icon name="Search" size={28} className="mx-auto mb-2" />
                Ничего не найдено
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модал: карточка работника */}
      {selectedWorker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl my-4 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-gradient-to-r from-blue-900/30 to-slate-900 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 rounded-full p-3"><Icon name="User" size={24} className="text-white" /></div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedWorker.fio}</h2>
                  <p className="text-blue-400 font-mono text-xs">{selectedWorker.worker_number} · {selectedWorker.sheet_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {qrImages[selectedWorker.qr_token] && (
                  <div className="text-center">
                    <img
                      src={qrImages[selectedWorker.qr_token]}
                      alt="QR"
                      style={{ width: 72, height: 72, imageRendering: 'pixelated' }}
                      className="rounded border border-slate-600 mx-auto"
                    />
                    <button
                      onClick={() => printQrCard(selectedWorker as unknown as Worker)}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-1 mx-auto"
                    >
                      <Icon name="Printer" size={11} />Печать
                    </button>
                  </div>
                )}
                <button onClick={() => { setSelectedWorker(null); setEditMode(false); }} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 ml-1">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>
            <div className="p-5">
              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['fio', 'subdivision', 'position', ...Object.keys(selectedWorker.extra_data || {}).filter(k => !['fio', 'subdivision', 'position'].includes(k))].map(key => (
                      <div key={key}>
                        <Label className="text-slate-400 text-xs mb-1 block">
                          {key === 'fio' ? 'ФИО' : key === 'subdivision' ? 'Подразделение' : key === 'position' ? 'Должность' : key}
                        </Label>
                        <Input
                          value={editData[key] || ''}
                          onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))}
                          className="bg-slate-800 border-slate-600 text-white h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={saveWorker} disabled={savingWorker} className="bg-green-600 hover:bg-green-700">
                      {savingWorker && <Icon name="Loader" size={14} className="animate-spin mr-1" />} Сохранить
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)} className="border-slate-600 text-slate-300">Отмена</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoRow label="ФИО" value={selectedWorker.fio} />
                    <InfoRow label="Подразделение" value={selectedWorker.subdivision} />
                    <InfoRow label="Должность" value={selectedWorker.position} />
                    {Object.entries(selectedWorker.extra_data || {})
                      .filter(([k]) => !['fio', 'subdivision', 'position', 'fio_lower'].includes(k))
                      .map(([k, v]) => <InfoRow key={k} label={k} value={String(v)} />)}
                  </div>
                  {isOtipb && (
                    <Button onClick={() => setEditMode(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
                      <Icon name="Edit" size={15} className="mr-1" /> Редактировать
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
          <Card className="bg-slate-800 border-slate-700 p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Добавить работника</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white"><Icon name="X" size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-slate-400 text-xs">Раздел (лист)</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sheets.map(s => (
                    <button key={s} onClick={() => setNewWorker(p => ({ ...p }))}
                      className={`text-xs px-2 py-1 rounded border transition ${activeSheet === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-slate-400 text-xs">ФИО *</Label>
                <Input value={newWorker.fio} onChange={e => setNewWorker(p => ({ ...p, fio: e.target.value }))} className="bg-slate-900 border-slate-600 text-white mt-1 h-8 text-sm" placeholder="Иванов Иван Иванович" />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Подразделение</Label>
                <Input value={newWorker.subdivision} onChange={e => setNewWorker(p => ({ ...p, subdivision: e.target.value }))} className="bg-slate-900 border-slate-600 text-white mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Должность</Label>
                <Input value={newWorker.position_name} onChange={e => setNewWorker(p => ({ ...p, position_name: e.target.value }))} className="bg-slate-900 border-slate-600 text-white mt-1 h-8 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={addWorkerManual} disabled={addingWorker} className="bg-blue-600 hover:bg-blue-700 flex-1 h-9">
                {addingWorker && <Icon name="Loader" size={14} className="animate-spin mr-1" />} Сохранить
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="border-slate-600 text-slate-300 h-9">Отмена</Button>
            </div>
          </Card>
        </div>
      )}

      {/* QR сканер */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center gap-4 p-4">
          <h3 className="text-white text-lg font-bold">Наведите камеру на QR-код</h3>
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
    <div className="text-slate-500 text-xs mb-0.5">{label}</div>
    <div className="text-white text-sm font-medium break-words">{value || '—'}</div>
  </div>
);

export default WorkersRegistryPage;