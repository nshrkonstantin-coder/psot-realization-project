import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import PageLockBadge from '@/components/ui/PageLockBadge';
import { isPageLocked, fetchPageLocks } from '@/hooks/usePageLock';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  extra_data: Record<string, string>;
  sort_order: number;
}

interface WorkerFull extends Worker {
  created_at: string;
}

interface Column {
  key: string;
  label: string;
  order: number;
  sheet_name: string;
  is_core: boolean;
}

// ── Сортируемая строка таблицы ───────────────────────────────────────────
interface SortableRowProps {
  worker: Worker;
  idx: number;
  isOtipb: boolean;
  activeSheet: string;
  sheetColumns: Column[];
  qrImages: Record<string, string>;
  confirmDeleteId: number | null;
  pendingEdits: Record<number, Record<string, string>>;
  onOpen: (id: number) => void;
  onPrintQr: (w: Worker) => void;
  onDeleteClick: (id: number) => void;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
  onCellEdit: (workerId: number, key: string, value: string) => void;
}

const SortableRow = ({
  worker: w, idx, isOtipb, activeSheet, sheetColumns, qrImages,
  confirmDeleteId, pendingEdits, onOpen, onPrintQr, onDeleteClick, onDeleteConfirm, onDeleteCancel, onCellEdit,
}: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: w.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const edits = pendingEdits[w.id] || {};
  const canEdit = isOtipb && activeSheet !== '__all__';

  const EditableCell = ({ colKey, defaultVal, isFio }: { colKey: string; defaultVal: string; isFio?: boolean }) => {
    const currentVal = edits[colKey] !== undefined ? edits[colKey] : defaultVal;
    const isDirty = edits[colKey] !== undefined && edits[colKey] !== defaultVal;
    if (!canEdit) {
      return isFio
        ? <span className="text-white font-medium">{currentVal || '—'}</span>
        : <span>{currentVal || '—'}</span>;
    }
    return (
      <input
        className={`w-full bg-transparent border-0 outline-none text-sm px-0 py-0 ${isFio ? 'text-white font-medium' : 'text-slate-300'} ${isDirty ? 'border-b border-yellow-500/60' : ''} focus:border-b focus:border-blue-400/60 min-w-0`}
        value={currentVal === '—' ? '' : currentVal}
        placeholder={defaultVal === '—' ? '—' : ''}
        onChange={e => onCellEdit(w.id, colKey, e.target.value)}
        onClick={e => e.stopPropagation()}
      />
    );
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-700/50 transition group ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/60'} ${isDragging ? 'shadow-lg shadow-blue-900/30 z-10' : 'hover:bg-slate-800/80'} ${Object.keys(edits).length > 0 ? 'ring-1 ring-inset ring-yellow-500/20' : ''}`}
    >
      {/* Drag handle */}
      <td className="p-2 w-8">
        {isOtipb && activeSheet !== '__all__' && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded text-slate-600 hover:text-slate-400 transition opacity-0 group-hover:opacity-100"
            title="Перетащить строку"
            onClick={e => e.stopPropagation()}
          >
            <Icon name="GripVertical" size={14} />
          </button>
        )}
      </td>
      <td className="p-3" onClick={canEdit ? undefined : () => onOpen(w.id)} style={{ cursor: canEdit ? 'default' : 'pointer' }}>
        <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">
          {activeSheet === 'КР + СОУТ' || activeSheet === 'ЕПТ РТН' ? idx + 1 : w.worker_number}
        </span>
      </td>
      {activeSheet !== 'КР + СОУТ' && activeSheet !== 'ЕПТ РТН' && (
        <td className="p-2" onClick={e => e.stopPropagation()}>
          {qrImages[w.qr_token] ? (
            <div className="flex items-center gap-1">
              <img src={qrImages[w.qr_token]} alt="QR" style={{ width: 36, height: 36, imageRendering: 'pixelated' }} className="rounded border border-slate-600" />
              <button onClick={() => onPrintQr(w)} className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition" title="Печать визитки">
                <Icon name="Printer" size={12} />
              </button>
            </div>
          ) : (
            <div style={{ width: 36, height: 36 }} className="bg-slate-700 rounded animate-pulse" />
          )}
        </td>
      )}
      {activeSheet === '__all__' ? (
        <>
          <td className="p-3 font-medium text-white cursor-pointer" onClick={() => onOpen(w.id)}>{w.fio}</td>
          <td className="p-3 cursor-pointer" onClick={() => onOpen(w.id)}><span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{w.sheet_name}</span></td>
          <td className="p-3 text-slate-300 cursor-pointer" onClick={() => onOpen(w.id)}>{w.subdivision || '—'}</td>
          <td className="p-3 text-slate-300 cursor-pointer" onClick={() => onOpen(w.id)}>{w.position || '—'}</td>
        </>
      ) : sheetColumns.length > 0 ? (
        sheetColumns.map((col) => {
          const isFio = col.key === 'ФИО';
          const rawVal = isFio ? w.fio : (w.extra_data?.[col.key] || '—');
          return (
            <td key={col.key} className="p-3 max-w-[180px]" title={rawVal}>
              <EditableCell colKey={col.key} defaultVal={rawVal} isFio={isFio} />
            </td>
          );
        })
      ) : (
        <>
          <td className="p-3"><EditableCell colKey="ФИО" defaultVal={w.fio} isFio /></td>
          <td className="p-3"><EditableCell colKey="Подразделение" defaultVal={w.subdivision || '—'} /></td>
          <td className="p-3"><EditableCell colKey="Должность" defaultVal={w.position || '—'} /></td>
        </>
      )}
      {/* Действия */}
      <td className="p-2 text-right" onClick={e => e.stopPropagation()}>
        {isOtipb && activeSheet !== '__all__' ? (
          confirmDeleteId === w.id ? (
            <div className="flex items-center gap-1 justify-end">
              <span className="text-xs text-red-400 mr-1">Удалить?</span>
              <button onClick={() => onDeleteConfirm(w.id)} className="p-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 transition" title="Да, удалить">
                <Icon name="Check" size={13} />
              </button>
              <button onClick={onDeleteCancel} className="p-1 rounded hover:bg-slate-700 text-slate-400 transition" title="Отмена">
                <Icon name="X" size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => onDeleteClick(w.id)} className="p-1 rounded hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition" title="Удалить">
                <Icon name="Trash2" size={13} />
              </button>
              <Icon name="ChevronRight" size={15} className="text-slate-500 cursor-pointer" onClick={() => onOpen(w.id)} />
            </div>
          )
        ) : (
          <Icon name="ChevronRight" size={15} className="text-slate-500 cursor-pointer" onClick={() => onOpen(w.id)} />
        )}
      </td>
    </tr>
  );
};

const WorkersRegistryPage = () => {
  const navigate = useNavigate();
  const orgId = localStorage.getItem('organizationId') || '';
  const userId = localStorage.getItem('userId') || '';
  const userRole = localStorage.getItem('userRole') || '';
  const userDept = (localStorage.getItem('userDepartment') || '').toLowerCase();
  const isAdmin = userRole === 'superadmin' || userRole === 'admin';
  const isOtipb = isAdmin
    || userDept.includes('отипб')
    || userDept.includes('от и пб')
    || userDept.includes('охрана труда')
    || userDept.includes('дирекция по от')
    || userDept.includes('отдел от')
    || userDept.includes('пб');

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
  const [newWorker, setNewWorker] = useState<{ fio: string; subdivision: string; position_name: string; extra_data: Record<string, string> }>({ fio: '', subdivision: '', position_name: '', extra_data: {} });
  const [addFormSheet, setAddFormSheet] = useState<string>('');
  const [addingWorker, setAddingWorker] = useState(false);

  // QR сканер
  const [showQrScanner, setShowQrScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Удаление / перетаскивание
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Inline-редактирование строк
  const [pendingEdits, setPendingEdits] = useState<Record<number, Record<string, string>>>({});
  const [savingEdits, setSavingEdits] = useState(false);

  const handleCellEdit = useCallback((workerId: number, key: string, value: string) => {
    setPendingEdits(prev => ({
      ...prev,
      [workerId]: { ...(prev[workerId] || {}), [key]: value }
    }));
  }, []);

  const saveAllPendingEdits = async () => {
    const dirtyIds = Object.keys(pendingEdits).map(Number);
    if (dirtyIds.length === 0) return;
    setSavingEdits(true);
    try {
      await Promise.all(dirtyIds.map(async (id) => {
        const worker = allWorkers.find(w => w.id === id);
        if (!worker) return;
        const edits = pendingEdits[id];
        const fio = edits['ФИО'] !== undefined ? edits['ФИО'] : worker.fio;
        const subdivision = edits['Подразделение'] !== undefined ? edits['Подразделение'] : worker.subdivision;
        const position_name = edits['Должность'] !== undefined ? edits['Должность'] : worker.position;
        const extra_data: Record<string, string> = { ...(worker.extra_data || {}) };
        Object.entries(edits).forEach(([k, v]) => {
          if (!['ФИО', 'Подразделение', 'Должность'].includes(k)) extra_data[k] = v;
        });
        await fetch(WORKERS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_worker', id, fio, subdivision, position_name, extra_data })
        });
      }));
      setPendingEdits({});
      toast.success(`Сохранено изменений: ${dirtyIds.length}`);
      loadData();
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSavingEdits(false);
    }
  };

  const pendingCount = Object.keys(pendingEdits).filter(id => Object.keys(pendingEdits[Number(id)]).length > 0).length;

  useEffect(() => {
    if (!userId) { navigate('/'); return; }
    if (!isOtipb) { navigate('/dashboard'); return; }
    // Сначала загружаем блокировки, потом данные — чтобы badge сразу показал правильный статус
    fetchPageLocks().then(() => loadData());
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

  // ── Экспорт карточки работника в Excel ────────────────────────────────────
  const exportWorkerExcel = (worker: WorkerFull) => {
    const workerCols = columns.filter(c => c.sheet_name === worker.sheet_name).sort((a, b) => a.order - b.order);
    const fields = workerCols.length > 0
      ? workerCols.map(c => ({ label: c.label, value: c.key === 'ФИО' ? worker.fio : (worker.extra_data?.[c.key] || '') }))
      : [
          { label: 'ФИО', value: worker.fio },
          { label: 'Подразделение', value: worker.subdivision },
          { label: 'Должность', value: worker.position },
          ...Object.entries(worker.extra_data || {}).filter(([k]) => !['ФИО', 'Подразделение', 'Должность', 'fio_lower'].includes(k)).map(([k, v]) => ({ label: k, value: v })),
        ];
    const ws = XLSX.utils.aoa_to_sheet([
      ['Карточка работника'],
      [`Раздел: ${worker.sheet_name}`, `ID: ${worker.worker_number}`],
      [],
      ['Поле', 'Значение'],
      ...fields.map(f => [f.label, f.value]),
    ]);
    ws['!cols'] = [{ wch: 30 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Карточка');
    XLSX.writeFile(wb, `Работник_${worker.fio.replace(/\s+/g, '_')}.xlsx`);
  };

  // ── Печать карточки работника в PDF ───────────────────────────────────────
  const printWorkerPDF = async (worker: WorkerFull) => {
    const qr = worker.qr_token ? await generateQr(worker.qr_token, 300) : '';
    const workerCols = columns.filter(c => c.sheet_name === worker.sheet_name).sort((a, b) => a.order - b.order);
    const fields = workerCols.length > 0
      ? workerCols.map(c => ({
          label: c.label,
          value: c.key === 'ФИО' ? worker.fio
            : c.key === 'Подразделение' ? (worker.subdivision || worker.extra_data?.[c.key] || '—')
            : c.key === 'Должность' ? (worker.position || worker.extra_data?.[c.key] || '—')
            : (worker.extra_data?.[c.key] || '—')
        }))
      : [
          { label: 'ФИО', value: worker.fio },
          { label: 'Подразделение', value: worker.subdivision || '—' },
          { label: 'Должность', value: worker.position || '—' },
          ...Object.entries(worker.extra_data || {})
            .filter(([k]) => !['ФИО', 'Подразделение', 'Должность', 'fio_lower'].includes(k))
            .map(([k, v]) => ({ label: k, value: v || '—' })),
        ];

    const rows = fields.map(f => `
      <tr>
        <td class="label">${f.label}</td>
        <td class="value">${f.value}</td>
      </tr>`).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Карточка — ${worker.fio}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: #fff; color: #111; }
        .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #1e5078; padding-bottom: 10px; margin-bottom: 14px; }
        .header-left h1 { font-size: 15pt; font-weight: bold; color: #1e5078; margin-bottom: 4px; }
        .header-left p { font-size: 9pt; color: #555; }
        .qr-block { text-align: center; }
        .qr-block img { width: 52mm; height: 52mm; display: block; border: 1px solid #ddd; border-radius: 4px; }
        .qr-block span { font-size: 8pt; color: #888; font-family: monospace; display: block; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
        tr:nth-child(even) { background: #f5f7fa; }
        td { padding: 5px 8px; border: 1px solid #ddd; vertical-align: top; }
        td.label { width: 38%; font-weight: bold; color: #333; background: #eef2f7; }
        td.value { color: #111; }
        .footer { margin-top: 14px; font-size: 8pt; color: #aaa; text-align: right; border-top: 1px solid #eee; padding-top: 6px; }
      </style></head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>Карточка работника</h1>
            <p>Раздел: <b>${worker.sheet_name}</b> &nbsp;|&nbsp; ID: <b>${worker.worker_number}</b></p>
          </div>
          ${qr ? `<div class="qr-block"><img src="${qr}" alt="QR"/><span>${worker.worker_number}</span></div>` : ''}
        </div>
        <table>${rows}</table>
        <div class="footer">Дата печати: ${new Date().toLocaleDateString('ru')}</div>
      </body>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800)}</script>
    </html>`);
    win.document.close();
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
    const formCols = columns.filter(c => c.sheet_name === addFormSheet).sort((a, b) => a.order - b.order);
    const hasFio = formCols.some(c => c.key === 'ФИО');
    if (hasFio && !newWorker.fio.trim()) { toast.error('Введите ФИО'); return; }
    setAddingWorker(true);
    const targetSheet = addFormSheet || activeSheet || 'Работники';
    try {
      const res = await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_worker', organization_id: orgId, user_id: userId,
          sheet_name: targetSheet,
          fio: newWorker.fio,
          subdivision: newWorker.subdivision,
          position_name: newWorker.position_name,
          extra_data: newWorker.extra_data,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Строка добавлена`);
        setNewWorker({ fio: '', subdivision: '', position_name: '', extra_data: {} });
        setShowAddForm(false);
        loadData();
      } else {
        toast.error(data.error || 'Ошибка при добавлении строки');
      }
    } catch (e) {
      console.error('addWorkerManual error:', e);
      toast.error('Ошибка сети при добавлении');
    }
    finally { setAddingWorker(false); }
  };

  // ── Выгрузка в Excel (все поля из extra_data) ────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const grouped: Record<string, Worker[]> = {};
    for (const w of allWorkers) {
      const s = w.sheet_name || 'Общий';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(w);
    }
    for (const [sheet, workers] of Object.entries(grouped)) {
      const sheetCols = columns.filter(c => c.sheet_name === sheet).sort((a, b) => a.order - b.order);
      const data = workers.map(w => {
        if (sheetCols.length > 0) {
          const row: Record<string, string> = {};
          sheetCols.forEach(c => {
            row[c.label] = c.key === 'ФИО' ? w.fio
              : c.key === 'Подразделение' ? (w.subdivision || w.extra_data?.[c.key] || '')
              : c.key === 'Должность' ? (w.position || w.extra_data?.[c.key] || '')
              : (w.extra_data?.[c.key] || '');
          });
          return row;
        }
        const row: Record<string, string> = { 'ФИО': w.fio, 'Подразделение': w.subdivision || '', 'Должность': w.position || '' };
        Object.entries(w.extra_data || {}).forEach(([k, v]) => {
          if (!['ФИО', 'Подразделение', 'Должность', 'fio_lower'].includes(k)) row[k] = v;
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.substring(0, 31));
    }
    XLSX.writeFile(wb, 'реестр_работников.xlsx');
  };

  // ── Печать реестра через браузер ─────────────────────────────────────────
  const printRegistryPDF = () => {
    const sheetName = activeSheet || (sheets[0] ?? '');
    const workers = allWorkers.filter(w => w.sheet_name === sheetName);
    const sheetCols = columns.filter(c => c.sheet_name === sheetName).sort((a, b) => a.order - b.order);

    const headers = sheetCols.length > 0
      ? sheetCols.map(c => c.label)
      : ['ФИО', 'Подразделение', 'Должность'];

    const dataRows = workers.map(w => {
      if (sheetCols.length > 0) {
        return sheetCols.map(c =>
          c.key === 'ФИО' ? w.fio
          : c.key === 'Подразделение' ? (w.subdivision || w.extra_data?.[c.key] || '—')
          : c.key === 'Должность' ? (w.position || w.extra_data?.[c.key] || '—')
          : (w.extra_data?.[c.key] || '—')
        );
      }
      return [w.fio, w.subdivision || '—', w.position || '—'];
    });

    const thCells = headers.map(h => `<th>${h}</th>`).join('');
    const trRows = dataRows.map((r, i) =>
      `<tr class="${i % 2 === 0 ? '' : 'alt'}">${r.map(v => `<td>${v}</td>`).join('')}</tr>`
    ).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Реестр — ${sheetName}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 8pt; color: #111; background: #fff; }
        h1 { font-size: 12pt; color: #1e5078; margin-bottom: 3px; }
        .meta { font-size: 8pt; color: #555; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e5078; color: #fff; padding: 5px 6px; text-align: left; font-size: 8pt; border: 1px solid #1a4568; }
        td { padding: 4px 6px; border: 1px solid #ddd; vertical-align: top; font-size: 7.5pt; }
        tr.alt td { background: #f5f7fa; }
        .footer { margin-top: 8px; font-size: 7pt; color: #aaa; text-align: right; }
      </style></head>
      <body>
        <h1>Реестр работников — ${sheetName}</h1>
        <div class="meta">Дата печати: ${new Date().toLocaleDateString('ru')} &nbsp;|&nbsp; Всего записей: ${workers.length}</div>
        <table><thead><tr>${thCells}</tr></thead><tbody>${trRows}</tbody></table>
        <div class="footer">Реестр работников · ${sheetName}</div>
      </body>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800)}</script>
    </html>`);
    win.document.close();
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

  // ── Удаление работника ───────────────────────────────────────────────────
  const deleteWorker = async (id: number) => {
    try {
      const res = await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_row', id, organization_id: orgId, user_id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Работник удалён');
        setAllWorkers(prev => prev.filter(w => w.id !== id));
        setConfirmDeleteId(null);
      }
    } catch { toast.error('Ошибка удаления'); }
  };

  // ── Перетаскивание строк ─────────────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sheet = activeSheet;
    const sheetWorkers = allWorkers
      .filter(w => w.sheet_name === sheet)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const oldIdx = sheetWorkers.findIndex(w => w.id === active.id);
    const newIdx = sheetWorkers.findIndex(w => w.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(sheetWorkers, oldIdx, newIdx);
    // Оптимистично обновляем UI
    const updatedMap = new Map(reordered.map((w, i) => [w.id, i]));
    setAllWorkers(prev => prev.map(w =>
      updatedMap.has(w.id) ? { ...w, sort_order: updatedMap.get(w.id)! } : w
    ));
    // Сохраняем на бэкенд
    try {
      await fetch(WORKERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder',
          organization_id: orgId,
          user_id: userId,
          sheet_name: sheet,
          order: reordered.map((w, i) => ({ id: w.id, sort_order: i })),
        }),
      });
    } catch { toast.error('Ошибка сохранения порядка'); }
  };

  // ── Данные текущей вкладки ────────────────────────────────────────────────
  const currentWorkers = allWorkers
    .filter(w => w.sheet_name === activeSheet)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
            <Button variant="outline" size="sm" onClick={exportExcel} className="border-green-700/50 text-green-400 hover:bg-green-900/30">
              <Icon name="FileSpreadsheet" size={15} className="mr-1" /> Скачать Excel
            </Button>
            <Button variant="outline" size="sm" onClick={printRegistryPDF} className="border-blue-700/50 text-blue-400 hover:bg-blue-900/30">
              <Icon name="Printer" size={15} className="mr-1" /> Печать PDF
            </Button>
            {isOtipb && (
              <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-green-600 hover:bg-green-700">
                <Icon name="Upload" size={15} className="mr-1" /> Загрузить Excel
              </Button>
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
                    setActiveSheet(sheet); setSearch(''); setPendingEdits({});
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
              onClick={() => { setActiveSheet('__all__'); setSearch(''); setPendingEdits({}); }}
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

        {/* Заголовок активной вкладки + поиск + кнопки управления */}
        {activeSheet && activeSheet !== '__all__' && (
          <div className="flex flex-col gap-3 mb-4">
            <div className={`flex items-center justify-between flex-wrap gap-3`}>
              <div className={`flex items-center gap-2 ${color.text}`}>
                <div className={`bg-gradient-to-br ${color.bg} p-2 rounded-lg`}>
                  <Icon name={color.icon as Parameters<typeof Icon>[0]['name']} size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{activeSheet}</h2>
                  <p className="text-xs text-slate-400">{filtered.length} записей</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
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
                {isOtipb && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => { setAddFormSheet(activeSheet); setNewWorker({ fio: '', subdivision: '', position_name: '', extra_data: {} }); setShowAddForm(true); }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Icon name="Plus" size={15} className="mr-1" /> Добавить строку
                    </Button>
                    {pendingCount > 0 && (
                      <Button
                        size="sm"
                        onClick={saveAllPendingEdits}
                        disabled={savingEdits}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {savingEdits
                          ? <><Icon name="Loader2" size={14} className="mr-1 animate-spin" /> Сохранение...</>
                          : <><Icon name="Save" size={14} className="mr-1" /> Сохранить изменения ({pendingCount})</>
                        }
                      </Button>
                    )}
                  </>
                )}
              </div>
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
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-700">
                    {isOtipb && activeSheet !== '__all__' && <th className="w-8 p-2"></th>}
                    <th className="text-left p-3 text-slate-400 font-medium whitespace-nowrap">{activeSheet === 'КР + СОУТ' || activeSheet === 'ЕПТ РТН' ? '№' : '№ID'}</th>
                    {activeSheet !== 'КР + СОУТ' && activeSheet !== 'ЕПТ РТН' && <th className="text-left p-3 text-slate-400 font-medium">QR</th>}
                    {(activeSheet === '__all__' ? ['ФИО', 'Раздел', 'Подразделение', 'Должность'] :
                      sheetColumns.length > 0
                        ? sheetColumns.map(c => c.label)
                        : ['ФИО', 'Подразделение', 'Должность']
                    ).map((h, i) => (
                      <th key={i} className="text-left p-3 text-slate-400 font-medium">{h}</th>
                    ))}
                    <th className="p-3 w-28"></th>
                  </tr>
                </thead>
                <SortableContext
                  items={(activeSheet === '__all__' ? allWorkers.filter(w => !search || w.fio?.toLowerCase().includes(search.toLowerCase())) : filtered).map(w => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {(activeSheet === '__all__' ? allWorkers.filter(w =>
                      !search || (w.fio || '').toLowerCase().includes(search.toLowerCase())
                    ) : filtered).map((w, idx) => (
                      <SortableRow
                        key={w.id}
                        worker={w}
                        idx={idx}
                        isOtipb={isOtipb}
                        activeSheet={activeSheet}
                        sheetColumns={sheetColumns}
                        qrImages={qrImages}
                        confirmDeleteId={confirmDeleteId}
                        pendingEdits={pendingEdits}
                        onOpen={openWorker}
                        onPrintQr={printQrCard}
                        onDeleteClick={id => setConfirmDeleteId(id)}
                        onDeleteConfirm={deleteWorker}
                        onDeleteCancel={() => setConfirmDeleteId(null)}
                        onCellEdit={handleCellEdit}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
              {filtered.length === 0 && activeSheet !== '__all__' && (
                <div className="py-10 text-center text-slate-500">
                  <Icon name="Search" size={28} className="mx-auto mb-2" />
                  Ничего не найдено
                </div>
              )}
            </div>
          </DndContext>
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
                      <Icon name="Printer" size={11} />QR
                    </button>
                  </div>
                )}
                <button
                  onClick={() => exportWorkerExcel(selectedWorker)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-700/30 border border-green-600/40 text-green-400 text-sm hover:bg-green-700/50 transition"
                  title="Скачать Excel"
                >
                  <Icon name="FileSpreadsheet" size={15} />Excel
                </button>
                <button
                  onClick={() => printWorkerPDF(selectedWorker)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700/30 border border-blue-600/40 text-blue-400 text-sm hover:bg-blue-700/50 transition"
                  title="Распечатать карточку"
                >
                  <Icon name="Printer" size={15} />Печать
                </button>
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
                    {(() => {
                      const workerCols = columns.filter(c => c.sheet_name === selectedWorker.sheet_name).sort((a, b) => a.order - b.order);
                      if (workerCols.length > 0) {
                        return workerCols.map(col => {
                          const val = col.key === 'ФИО' ? selectedWorker.fio
                            : col.key === 'Подразделение' ? (selectedWorker.subdivision || selectedWorker.extra_data?.['Подразделение'] || '')
                            : col.key === 'Должность' ? (selectedWorker.position || selectedWorker.extra_data?.['Должность'] || '')
                            : (selectedWorker.extra_data?.[col.key] || '');
                          return <InfoRow key={col.key} label={col.label} value={val} />;
                        });
                      }
                      const skipKeys = new Set(['ФИО', 'Подразделение', 'Должность', 'fio_lower']);
                      return (
                        <>
                          <InfoRow label="ФИО" value={selectedWorker.fio} />
                          <InfoRow label="Подразделение" value={selectedWorker.subdivision} />
                          <InfoRow label="Должность" value={selectedWorker.position} />
                          {Object.entries(selectedWorker.extra_data || {})
                            .filter(([k]) => !skipKeys.has(k))
                            .map(([k, v]) => <InfoRow key={k} label={k} value={String(v)} />)}
                        </>
                      );
                    })()}
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
      {showAddForm && (() => {
        // Колонки только этой вкладки, в нужном порядке, без служебных
        const formCols = columns
          .filter(c => c.sheet_name === addFormSheet && !['№ п/п', 'fio_lower'].includes(c.key))
          .sort((a, b) => a.order - b.order);

        const hasFio = formCols.some(c => c.key === 'ФИО');
        const hasSubdivision = formCols.some(c => c.key === 'Подразделение');
        const hasDolzhnost = formCols.some(c => c.key === 'Должность');
        const extraCols = formCols.filter(c => !['ФИО', 'Подразделение', 'Должность'].includes(c.key));

        const sheetColor = SHEET_COLORS[addFormSheet] || { bg: 'from-blue-600 to-blue-700', icon: 'Plus' };

        const getFieldValue = (key: string) => {
          if (key === 'ФИО') return newWorker.fio;
          if (key === 'Подразделение') return newWorker.subdivision;
          if (key === 'Должность') return newWorker.position_name;
          return newWorker.extra_data[key] || '';
        };

        const setFieldValue = (key: string, value: string) => {
          if (key === 'ФИО') setNewWorker(p => ({ ...p, fio: value }));
          else if (key === 'Подразделение') setNewWorker(p => ({ ...p, subdivision: value }));
          else if (key === 'Должность') setNewWorker(p => ({ ...p, position_name: value }));
          else setNewWorker(p => ({ ...p, extra_data: { ...p.extra_data, [key]: value } }));
        };

        return (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg my-8">
              {/* Шапка */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className={`bg-gradient-to-br ${sheetColor.bg} rounded-xl p-2`}>
                    <Icon name={sheetColor.icon as Parameters<typeof Icon>[0]['name']} size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Новая строка — {addFormSheet}</h3>
                    <p className="text-slate-400 text-xs">{formCols.length} {formCols.length === 1 ? 'поле' : formCols.length < 5 ? 'поля' : 'полей'}</p>
                  </div>
                </div>
                <button onClick={() => setShowAddForm(false)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 transition">
                  <Icon name="X" size={18} />
                </button>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 gap-4">
                  {/* ФИО — если есть в колонках */}
                  {hasFio && (
                    <div>
                      <Label className="text-slate-400 text-sm mb-1.5 block">ФИО <span className="text-red-400">*</span></Label>
                      <Input
                        value={newWorker.fio}
                        onChange={e => setNewWorker(p => ({ ...p, fio: e.target.value }))}
                        className="bg-slate-800 border-slate-600 text-white h-10"
                        placeholder="Иванов Иван Иванович"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Подразделение + Должность — если есть в колонках */}
                  {(hasSubdivision || hasDolzhnost) && (
                    <div className={`grid gap-4 ${hasSubdivision && hasDolzhnost ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {hasSubdivision && (
                        <div>
                          <Label className="text-slate-400 text-sm mb-1.5 block">Подразделение</Label>
                          <Input
                            value={newWorker.subdivision}
                            onChange={e => setNewWorker(p => ({ ...p, subdivision: e.target.value }))}
                            className="bg-slate-800 border-slate-600 text-white h-10"
                            placeholder="Подразделение"
                          />
                        </div>
                      )}
                      {hasDolzhnost && (
                        <div>
                          <Label className="text-slate-400 text-sm mb-1.5 block">Должность</Label>
                          <Input
                            value={newWorker.position_name}
                            onChange={e => setNewWorker(p => ({ ...p, position_name: e.target.value }))}
                            className="bg-slate-800 border-slate-600 text-white h-10"
                            placeholder="Должность"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Дополнительные поля — только те что реально в колонках */}
                  {extraCols.length > 0 && (
                    <div className={`grid gap-4 ${extraCols.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {extraCols.map(col => (
                        <div key={col.key} className={extraCols.length === 1 ? '' : ''}>
                          <Label className="text-slate-400 text-sm mb-1.5 block">{col.label}</Label>
                          <Input
                            value={getFieldValue(col.key)}
                            onChange={e => setFieldValue(col.key, e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white h-10"
                            autoFocus={!hasFio && extraCols[0]?.key === col.key}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Футер */}
              <div className="flex gap-3 px-6 py-4 border-t border-slate-700 rounded-b-2xl">
                <Button onClick={addWorkerManual} disabled={addingWorker} className="bg-blue-600 hover:bg-blue-700 h-9 px-6 text-sm font-semibold flex-1">
                  {addingWorker
                    ? <><Icon name="Loader2" size={14} className="animate-spin mr-2" />Сохранение...</>
                    : <><Icon name="Plus" size={14} className="mr-2" />Добавить строку</>
                  }
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)} className="border-slate-600 text-slate-300 h-9 px-5">Отмена</Button>
              </div>
            </div>
          </div>
        );
      })()}

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