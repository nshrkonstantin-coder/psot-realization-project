import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = 'https://functions.poehali.dev/9dcd6f1a-ad53-4c5e-af05-0fd74e20e8b4';

interface UploadedFile {
  id: number;
  file_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  rows_count: number;
  uploaded_at: string;
  period_from?: string | null;
  period_to?: string | null;
  new_rows?: number;
  skipped_rows?: number;
}

interface Stats {
  total_workers: number;
  total_esmo: number;
  admitted: number;
  not_admitted: number;
  total_files: number;
}

interface ReportRecord {
  fio: string;
  worker_number: string;
  subdivision: string;
  position: string;
  company: string;
  exam_date: string | null;
  exam_datetime: string | null;
  exam_result: string;
  reject_reason: string | null;
  group_mo: string | null;
  exam_detail: string | null;
}

const ZdravpunktPage = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';
  const userRole = localStorage.getItem('userRole') || '';
  const orgId = localStorage.getItem('organizationId') || '';
  const isAdmin = userRole === 'superadmin' || userRole === 'admin';

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'workers' | 'esmo' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [activeTab, setActiveTab] = useState<'upload' | 'report'>('upload');

  // Фильтры отчёта
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterSubdivision, setFilterSubdivision] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterFio, setFilterFio] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [subdivisions, setSubdivisions] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [reportRecords, setReportRecords] = useState<ReportRecord[] | null>(null);
  const [reportStats, setReportStats] = useState<{ total: number; admitted: number; not_admitted: number; evaded: number; unique_workers: number } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPage, setReportPage] = useState(0);
  const PAGE_SIZE = 500;
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Быстрый отчёт из окошек статистики
  type QuickReportType = 'not_admitted' | 'evaded' | 'all_esmo';
  const [quickReport, setQuickReport] = useState<{
    type: QuickReportType;
    title: string;
    records: ReportRecord[];
    loading: boolean;
  } | null>(null);

  const openQuickReport = async (type: QuickReportType, title: string) => {
    setQuickReport({ type, title, records: [], loading: true });
    try {
      const p = new URLSearchParams({ action: 'report', limit: '5000', offset: '0' });
      if (type !== 'all_esmo') p.set('exam_result', type);
      const res = await fetch(`${API}?${p.toString()}`);
      const data = await res.json();
      if (data.success) {
        setQuickReport({ type, title, records: data.records, loading: false });
      }
    } catch {
      toast.error('Ошибка загрузки');
      setQuickReport(null);
    }
  };

  const exportQuickExcel = (records: ReportRecord[], title: string) => {
    const rows = records.map(r => ({
      'Дата/время': r.exam_datetime ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : r.exam_date || '',
      'Группа МО': r.group_mo || '',
      'Организация': r.company || '',
      'Подразделение': r.subdivision || '',
      'ФИО сотрудника': r.fio,
      'Результат осмотра': r.exam_detail || r.reject_reason || '',
      'Допуск': r.exam_result === 'admitted' ? 'Разрешен' : r.exam_result === 'not_admitted' ? 'Запрещен' : r.exam_result === 'evaded' ? 'Уклонился' : 'Допуск дан медработником',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    XLSX.writeFile(wb, `${title}_${new Date().toLocaleDateString('ru')}.xlsx`);
  };

  const exportQuickPDF = (records: ReportRecord[], title: string) => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    // Заголовок
    doc.setFontSize(14);
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.text(`Сформирован: ${new Date().toLocaleString('ru')}  Всего записей: ${records.length}`, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [['Дата/время', 'Группа МО', 'Организация', 'Подразделение', 'ФИО сотрудника', 'Результат осмотра', 'Допуск']],
      body: records.map(r => [
        r.exam_datetime ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : r.exam_date || '',
        r.group_mo || '',
        r.company || '',
        r.subdivision || '',
        r.fio,
        r.exam_detail || r.reject_reason || '',
        r.exam_result === 'admitted' ? 'Разрешен' : r.exam_result === 'not_admitted' ? 'Запрещен' : r.exam_result === 'evaded' ? 'Уклонился' : 'Допуск дан медработником',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 28 }, 1: { cellWidth: 22 }, 2: { cellWidth: 40 },
        3: { cellWidth: 50 }, 4: { cellWidth: 38 }, 5: { cellWidth: 45 }, 6: { cellWidth: 22 }
      },
    });
    doc.save(`${title}_${new Date().toLocaleDateString('ru')}.pdf`);
  };

  const printQuickReport = (records: ReportRecord[], title: string) => {
    const resultLabel = (r: ReportRecord) =>
      r.exam_result === 'admitted' ? 'Разрешен' :
      r.exam_result === 'not_admitted' ? 'Запрещен' :
      r.exam_result === 'evaded' ? 'Уклонился' : 'Допуск дан медработником';

    const html = `
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
        h2 { font-size: 14px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 10px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f766e; color: white; padding: 5px 6px; text-align: left; font-size: 10px; }
        td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
        tr:nth-child(even) td { background: #f8fafc; }
        @media print { body { margin: 10px; } }
      </style></head><body>
      <h2>${title}</h2>
      <div class="meta">Сформирован: ${new Date().toLocaleString('ru')} &nbsp;|&nbsp; Всего записей: ${records.length}</div>
      <table>
        <thead><tr>
          <th>Дата/время</th><th>Группа МО</th><th>Организация</th>
          <th>Подразделение</th><th>ФИО сотрудника</th>
          <th>Результат осмотра</th><th>Допуск</th>
        </tr></thead>
        <tbody>${records.map(r => `<tr>
          <td>${r.exam_datetime ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : r.exam_date || ''}</td>
          <td>${r.group_mo || ''}</td>
          <td>${r.company || ''}</td>
          <td>${r.subdivision || ''}</td>
          <td><b>${r.fio}</b></td>
          <td>${r.exam_detail || r.reject_reason || ''}</td>
          <td>${resultLabel(r)}</td>
        </tr>`).join('')}</tbody>
      </table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  };

  // Карточка работника
  const [workerModal, setWorkerModal] = useState<{fio: string; records: ReportRecord[]; total: number; admitted: number; not_admitted: number; evaded: number} | null>(null);
  const [workerLoading, setWorkerLoading] = useState(false);

  const workersRef = useRef<HTMLInputElement>(null);
  const esmoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [fRes, sRes, flRes] = await Promise.all([
        fetch(`${API}?action=files&organization_id=${orgId}`),
        fetch(`${API}?action=stats&organization_id=${orgId}`),
        fetch(`${API}?action=filters&organization_id=${orgId}`)
      ]);
      const fData = await fRes.json();
      const sData = await sRes.json();
      const flData = await flRes.json();
      if (fData.success) setFiles(fData.files);
      if (sData.success) setStats(sData);
      if (flData.success) {
        setSubdivisions(flData.subdivisions || []);
        setCompanies(flData.companies || []);
      }
    } catch { toast.error('Ошибка загрузки данных'); }
    finally { setLoading(false); }
  };

  // ── Универсальный загрузчик Excel ───────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'workers' | 'esmo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(fileType);

    try {
      // Читаем Excel
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (raw.length === 0) {
        toast.error('Файл пустой или не содержит данных');
        setUploading(null);
        return;
      }

      // Определяем маппинг колонок по первому ряду
      const keys = Object.keys(raw[0]);

      // Сначала ищем точное совпадение, потом частичное без учёта регистра
      const findKey = (...variants: string[]) =>
        keys.find(k => variants.includes(k)) ||
        keys.find(k => variants.some(v => k.toLowerCase().includes(v.toLowerCase()))) ||
        '';

      // Сохраняем запись о файле в БД
      const saveRes = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_file',
          file_type: fileType,
          file_name: file.name,
          file_url: '',
          file_size: file.size,
          rows_count: raw.length,
          uploaded_by: userId,
          organization_id: orgId
        })
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error);
      const fileId = saveData.file_id;

      // Парсим все строки и отправляем ОДНИМ запросом
      if (fileType === 'workers') {
        const fioKey = findKey('фио', 'имя', 'наименование', 'работник', 'name');
        const numKey = findKey('табел', 'номер', 'id', 'code', 'код');
        const divKey = findKey('подразделение', 'отдел', 'subdivision', 'участок');
        const posKey = findKey('должность', 'position');
        const compKey = findKey('компания', 'организация', 'company', 'предприятие');

        const workers = raw.map(r => ({
          fio: String(r[fioKey] || ''),
          worker_number: String(r[numKey] || ''),
          subdivision: String(r[divKey] || ''),
          position: String(r[posKey] || ''),
          company: String(r[compKey] || ''),
        })).filter(w => w.fio.trim());

        await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import_workers', file_id: fileId, workers, organization_id: orgId })
        });

      } else {
        // Точный маппинг для формата ЭСМО
        const fioKey = findKey('ФИО сотрудника', 'фио', 'имя', 'работник', 'name', 'сотрудник');
        const numKey = findKey('табел', 'номер', 'id', 'code', 'код');
        const divKey = findKey('подразделение', 'отдел', 'subdivision', 'участок');
        const posKey = findKey('должность', 'position');
        const compKey = findKey('Организация', 'компания', 'organization', 'company', 'предприятие');
        const dateKey = findKey('Дата/время', 'дата', 'date', 'прохождение');
        const dopuskKey = findKey('Допуск', 'допуск');
        const resultKey = findKey('Результат осмотра', 'результат', 'result', 'статус');
        const groupKey = findKey('Группа МО', 'группа');

        const records = raw.map(r => {
          const dopuskRaw = String(r[dopuskKey] || '').toLowerCase().trim();
          let examResult = '';
          if (dopuskRaw === 'разрешен' || dopuskRaw.includes('разреш') || dopuskRaw === 'да') {
            examResult = 'admitted';
          } else if (dopuskRaw === 'запрещен' || dopuskRaw.includes('запрещ') || dopuskRaw === 'нет') {
            examResult = 'not_admitted';
          } else if (dopuskRaw === 'уклонился' || dopuskRaw.includes('уклон')) {
            examResult = 'evaded';
          }

          const resultOsmotra = String(r[resultKey] || '').trim();

          let examDate: string | null = null;
          const rawDate = r[dateKey];
          if (rawDate instanceof Date) {
            examDate = rawDate.toISOString().split('T')[0];
          } else if (typeof rawDate === 'string' && rawDate.trim()) {
            examDate = rawDate.trim().split('T')[0];
          }

          return {
            fio: String(r[fioKey] || ''),
            worker_number: String(r[numKey] || ''),
            subdivision: String(r[divKey] || ''),
            position: String(r[posKey] || ''),
            company: String(r[compKey] || ''),
            exam_date: examDate,
            exam_result: examResult,
            reject_reason: examResult === 'not_admitted' ? resultOsmotra : '',
            extra: { ...r, group_mo: String(r[groupKey] || '') }
          };
        }).filter(w => w.fio.trim());

        // Определяем период файла по данным
        const datesInFile = records.map(r => r.exam_date).filter(Boolean).sort() as string[];
        const periodFrom = datesInFile[0] || null;
        const periodTo = datesInFile[datesInFile.length - 1] || null;

        // Батч 2000 строк, последовательно (дедупликация требует порядка)
        const BATCH = 2000;
        const totalBatches = Math.ceil(records.length / BATCH);
        let totalImported = 0;
        let totalSkipped = 0;
        let completedBatches = 0;
        setUploadProgress(10);

        for (let i = 0; i < records.length; i += BATCH) {
          const batch = records.slice(i, i + BATCH);
          const isLastBatch = i + BATCH >= records.length;
          const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'import_esmo',
              file_id: fileId,
              records: batch,
              organization_id: orgId,
              is_last_batch: isLastBatch,
              period_from: periodFrom,
              period_to: periodTo,
            })
          });
          const resData = await res.json();
          if (!resData.success) throw new Error(`Ошибка загрузки: ${resData.error}`);
          totalImported += resData.imported || 0;
          totalSkipped += resData.skipped || 0;
          completedBatches++;
          const progress = 10 + Math.round((completedBatches / totalBatches) * 88);
          setUploadProgress(Math.min(progress, 98));
        }

        if (totalSkipped > 0) {
          toast.info(`Добавлено новых: ${totalImported}, уже было в БД: ${totalSkipped} (пропущено)`);
        }
      }

      setUploadProgress(100);
      toast.success(`Файл "${file.name}" загружен — ${raw.length} строк в файле`);
      loadAll();
    } catch (err: unknown) {
      toast.error(`Ошибка: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(null);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  // ── Удаление конкретного файла вместе с его данными ─────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{fileId: number; fileName: string; rows: number} | null>(null);

  const archiveFile = async (fileId: number, fileName: string, rows: number) => {
    setDeleteConfirm({ fileId, fileName, rows });
  };

  const confirmDeleteFile = async () => {
    if (!deleteConfirm) return;
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_file', file_id: deleteConfirm.fileId, user_id: userId })
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`Файл удалён, убрано ${data.deleted_rows} записей из БД`);
      loadAll();
    } else {
      toast.error('Ошибка удаления');
    }
    setDeleteConfirm(null);
  };

  // ── Отчёт ───────────────────────────────────────────────────────────────
  const buildReport = async (page = 0) => {
    setReportLoading(true);
    setReportPage(page);
    try {
      const p = new URLSearchParams({ action: 'report', limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (dateFrom) p.set('date_from', dateFrom);
      if (dateTo) p.set('date_to', dateTo);
      if (filterSubdivision) p.set('subdivision', filterSubdivision);
      if (filterCompany) p.set('company', filterCompany);
      if (filterFio) p.set('fio', filterFio);
      if (filterResult) p.set('exam_result', filterResult);

      const res = await fetch(`${API}?${p.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setReportRecords(data.records);
        setReportStats({ total: data.total, admitted: data.admitted, not_admitted: data.not_admitted, evaded: data.evaded, unique_workers: data.unique_workers ?? 0 });
      } else {
        toast.error('Ошибка получения данных');
      }
    } catch (e) {
      toast.error(`Ошибка формирования отчёта: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setReportLoading(false);
    }
  };

  // ── Экспорт отчёта в Excel ───────────────────────────────────────────────
  const exportReport = () => {
    if (!reportRecords || reportRecords.length === 0) return;
    const rows = reportRecords.map(r => ({
      'Дата/время': r.exam_datetime
        ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : r.exam_date || '',
      'Группа МО': r.group_mo || '',
      'Организация': r.company || '',
      'Подразделение': r.subdivision || '',
      'ФИО сотрудника': r.fio,
      'Результат осмотра': r.exam_detail || r.reject_reason || '',
      'Допуск': r.exam_result === 'admitted' ? 'Разрешен' : r.exam_result === 'not_admitted' ? 'Запрещен' : r.exam_result === 'evaded' ? 'Уклонился' : 'Допуск дан медработником',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчёт ЭСМО');
    XLSX.writeFile(wb, `Здравпункт_отчёт_${new Date().toLocaleDateString('ru')}.xlsx`);
  };

  // ── Очистка всей БД Здравпункта ─────────────────────────────────────────
  const clearAll = async () => {
    setClearing(true);
    setShowClearConfirm(false);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_all', user_id: userId, user_role: userRole })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`База очищена: ЭСМО ${data.esmo_cleared} записей, работники ${data.workers_cleared}`);
        // Сбрасываем все состояния
        setFiles([]);
        setStats(null);
        setReportRecords(null);
        setReportStats(null);
        setSubdivisions([]);
        setCompanies([]);
        setDateFrom('');
        setDateTo('');
        setFilterSubdivision('');
        setFilterCompany('');
        setFilterFio('');
        setFilterResult('');
        loadAll();
      } else {
        toast.error(data.error || 'Ошибка очистки');
      }
    } catch { toast.error('Ошибка соединения'); }
    finally { setClearing(false); }
  };

  // ── Открыть карточку работника ──────────────────────────────────────────
  const openWorker = async (fio: string) => {
    setWorkerLoading(true);
    setWorkerModal({ fio, records: [], total: 0, admitted: 0, not_admitted: 0, evaded: 0 });
    try {
      const p = new URLSearchParams({ action: 'worker_history', fio });
      if (dateFrom) p.set('date_from', dateFrom);
      if (dateTo) p.set('date_to', dateTo);
      const res = await fetch(`${API}?${p.toString()}`);
      const data = await res.json();
      if (data.success) {
        setWorkerModal({ fio, records: data.records, total: data.total, admitted: data.admitted, not_admitted: data.not_admitted, evaded: data.evaded });
      }
    } catch { /* оставляем пустую карточку */ }
    finally { setWorkerLoading(false); }
  };

  const formatDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('ru'); } catch { return s; }
  };

  const formatSize = (b: number) => {
    if (!b) return '';
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} МБ`;
    return `${(b / 1024).toFixed(0)} КБ`;
  };

  const workerFiles = files.filter(f => f.file_type === 'workers_list');
  const esmoFiles = files.filter(f => f.file_type === 'esmo');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-teal-900/60 to-slate-900 border-b border-teal-700/40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/superadmin')}
              className="text-slate-400 hover:text-white transition-colors">
              <Icon name="ArrowLeft" size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <Icon name="HeartPulse" size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Рабочий стол Здравпункта</h1>
              <p className="text-teal-400 text-xs">Управление медицинскими осмотрами</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'upload' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Загрузки
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'report' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Отчёты
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={clearing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-900/40 border border-red-700/50 text-red-400 hover:bg-red-800/50 hover:text-red-300 transition ml-2"
              >
                {clearing
                  ? <><Icon name="Loader" size={15} className="animate-spin" />Очистка...</>
                  : <><Icon name="Trash2" size={15} />Очистка БД</>}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Работников', value: stats.total_workers, icon: 'Users', color: 'from-blue-500 to-blue-600', clickType: null as null },
              { label: 'Записей ЭСМО', value: stats.total_esmo, icon: 'ClipboardList', color: 'from-purple-500 to-purple-600', clickType: 'all_esmo' as const },
              { label: 'Допущено', value: stats.admitted, icon: 'CheckCircle', color: 'from-green-500 to-emerald-600', clickType: null as null },
              { label: 'Не допущено', value: stats.not_admitted, icon: 'XCircle', color: 'from-red-500 to-red-600', clickType: 'not_admitted' as const },
              { label: 'Уклонились', value: (stats as Stats & {evaded?: number}).evaded ?? 0, icon: 'AlertCircle', color: 'from-yellow-500 to-amber-600', clickType: 'evaded' as const },
              { label: 'Файлов загружено', value: stats.total_files, icon: 'FileSpreadsheet', color: 'from-teal-500 to-cyan-600', clickType: null as null },
            ].map((s, i) => (
              <Card
                key={i}
                onClick={() => s.clickType && openQuickReport(s.clickType, s.label)}
                className={`bg-slate-800/50 border-slate-700 p-4 transition-all ${s.clickType ? 'cursor-pointer hover:border-teal-500/60 hover:bg-slate-700/60 hover:scale-[1.03] group' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`bg-gradient-to-br ${s.color} p-2 rounded-lg ${s.clickType ? 'group-hover:scale-110 transition-transform' : ''}`}>
                    <Icon name={s.icon} size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl font-bold text-white">{s.value.toLocaleString('ru')}</div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                    {s.clickType && <div className="text-xs text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">↗ Открыть список</div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Вкладка Загрузки ── */}
        {activeTab === 'upload' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Загрузка общего списка работников */}
            <Card className="bg-slate-800/50 border-slate-700">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 rounded-xl">
                    <Icon name="Users" size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold">Загрузка общего списка работников</h2>
                    <p className="text-slate-400 text-xs">Общий список работников рудника</p>
                  </div>
                </div>

                <input ref={workersRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => handleFileUpload(e, 'workers')} />
                <Button
                  onClick={() => workersRef.current?.click()}
                  disabled={uploading === 'workers'}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white mb-4"
                >
                  {uploading === 'workers' ? (
                    <><Icon name="Loader" size={16} className="animate-spin mr-2" />Загружаю...</>
                  ) : (
                    <><Icon name="Upload" size={16} className="mr-2" />Загрузить Excel</>
                  )}
                </Button>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="text-slate-500 text-sm text-center py-4">Загрузка...</div>
                  ) : workerFiles.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-6">
                      <Icon name="FileX" size={28} className="mx-auto mb-2 opacity-40" />
                      Файлы ещё не загружались
                    </div>
                  ) : workerFiles.map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name="FileSpreadsheet" size={16} className="text-green-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-white text-xs font-medium truncate">{f.file_name}</div>
                          <div className="text-slate-400 text-xs">{f.rows_count} строк · {formatDate(f.uploaded_at)} · {formatSize(f.file_size)}</div>
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => archiveFile(f.id, f.file_name, f.rows_count)}
                          className="text-slate-500 hover:text-red-400 transition shrink-0 ml-2">
                          <Icon name="Trash2" size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Загрузка результатов ЭСМО */}
            <Card className="bg-slate-800/50 border-slate-700">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-2.5 rounded-xl">
                    <Icon name="Stethoscope" size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold">Загрузка результатов ЭСМО</h2>
                    <p className="text-slate-400 text-xs">Выгрузка из системы ЭСМО</p>
                  </div>
                </div>

                <input ref={esmoRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => handleFileUpload(e, 'esmo')} />
                <Button
                  onClick={() => esmoRef.current?.click()}
                  disabled={uploading === 'esmo'}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white mb-3"
                >
                  {uploading === 'esmo' ? (
                    <><Icon name="Loader" size={16} className="animate-spin mr-2" />Загружаю... {uploadProgress}%</>
                  ) : (
                    <><Icon name="Upload" size={16} className="mr-2" />Загрузить ЭСМО</>
                  )}
                </Button>

                {/* Прогресс-бар */}
                {uploading === 'esmo' && uploadProgress > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Сохранение в базу данных...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="text-slate-500 text-sm text-center py-4">Загрузка...</div>
                  ) : esmoFiles.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-6">
                      <Icon name="FileX" size={28} className="mx-auto mb-2 opacity-40" />
                      Файлы ещё не загружались
                    </div>
                  ) : esmoFiles.map(f => (
                    <div key={f.id} className="bg-slate-700/50 rounded-lg px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Icon name="FileSpreadsheet" size={16} className="text-teal-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-white text-xs font-semibold truncate">{f.file_name}</div>
                            {/* Период файла */}
                            {f.period_from && f.period_to && (
                              <div className="text-teal-400 text-xs font-medium mt-0.5">
                                Период: {formatDate(f.period_from)} — {formatDate(f.period_to)}
                              </div>
                            )}
                            <div className="text-slate-500 text-xs mt-0.5">
                              {f.rows_count} строк в файле · загружен {formatDate(f.uploaded_at)} · {formatSize(f.file_size)}
                            </div>
                            {/* Статистика дедупликации */}
                            {(f.new_rows != null || f.skipped_rows != null) && (
                              <div className="flex gap-2 mt-1">
                                {(f.new_rows ?? 0) > 0 && (
                                  <span className="text-green-400 text-xs">+{f.new_rows} новых</span>
                                )}
                                {(f.skipped_rows ?? 0) > 0 && (
                                  <span className="text-slate-500 text-xs">{f.skipped_rows} уже были</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <button onClick={() => archiveFile(f.id, f.file_name, f.new_rows ?? f.rows_count)}
                            className="text-slate-500 hover:text-red-400 transition shrink-0">
                            <Icon name="Trash2" size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Вкладка Отчёты ── */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {/* Фильтры */}
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <Icon name="Filter" size={18} className="text-teal-400" />
                Параметры отчёта
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Период с</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Период по</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">ФИО работника</label>
                  <input type="text" value={filterFio} onChange={e => setFilterFio(e.target.value)}
                    placeholder="Поиск по ФИО..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Подразделение</label>
                  <select value={filterSubdivision} onChange={e => setFilterSubdivision(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Все подразделения</option>
                    {subdivisions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Подрядчик / компания</label>
                  <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Все компании</option>
                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Допуск</label>
                  <select value={filterResult} onChange={e => setFilterResult(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Все результаты</option>
                    <option value="admitted">Разрешен</option>
                    <option value="not_admitted">Запрещен</option>
                    <option value="evaded">Уклонился</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button onClick={() => buildReport(0)} disabled={reportLoading}
                  className="bg-teal-600 hover:bg-teal-500 text-white">
                  {reportLoading ? <><Icon name="Loader" size={16} className="animate-spin mr-2" />Формирую...</> : <><Icon name="BarChart2" size={16} className="mr-2" />Сформировать отчёт</>}
                </Button>
                {reportRecords && reportRecords.length > 0 && (
                  <Button onClick={exportReport} variant="outline"
                    className="border-green-600 text-green-400 hover:bg-green-600/10">
                    <Icon name="Download" size={16} className="mr-2" />Скачать Excel
                  </Button>
                )}
              </div>
            </Card>

            {/* Результаты — статистика */}
            {reportStats && (
              <div className="space-y-3">
                {/* Главная карточка — уникальные работники */}
                <Card className="bg-gradient-to-r from-teal-900/50 to-cyan-900/30 border-teal-600/50 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-teal-500/20 border border-teal-500/40 p-3 rounded-xl">
                        <Icon name="Users" size={26} className="text-teal-400" />
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">Уникальных работников прошли ЭСМО</div>
                        <div className="text-4xl font-bold text-teal-300 mt-0.5">{reportStats.unique_workers.toLocaleString('ru')}</div>
                      </div>
                    </div>
                    <div className="text-right text-slate-500 text-sm border-l border-slate-700 pl-5">
                      <div>Всего записей осмотров</div>
                      <div className="text-2xl font-bold text-white mt-0.5">{reportStats.total.toLocaleString('ru')}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        в среднем {reportStats.unique_workers > 0 ? (reportStats.total / reportStats.unique_workers).toFixed(1) : '—'} осмотра на работника
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Детализация по допуску */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Разрешен', value: reportStats.admitted, color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30' },
                    { label: 'Запрещен', value: reportStats.not_admitted, color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30' },
                    { label: 'Уклонился', value: reportStats.evaded, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/30' },
                  ].map((s, i) => (
                    <Card key={i} className={`${s.bg} border p-4 text-center`}>
                      <div className={`text-3xl font-bold ${s.color}`}>{s.value.toLocaleString('ru')}</div>
                      <div className="text-slate-400 text-sm mt-1">{s.label}</div>
                      {reportStats.total > 0 && (
                        <div className="text-slate-600 text-xs mt-0.5">
                          {((s.value / reportStats.total) * 100).toFixed(1)}% от всех записей
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {reportRecords && (
              <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
                {reportRecords.length === 0 ? (
                  <div className="text-slate-500 text-center py-12">
                    <Icon name="SearchX" size={36} className="mx-auto mb-3 opacity-40" />
                    Нет данных по выбранным фильтрам
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-700/50 text-xs">
                        <tr>
                          {[
                            'Дата/время',
                            'Группа МО',
                            'Организация',
                            'Подразделение',
                            'ФИО сотрудника',
                            'Результат осмотра',
                            'Допуск',
                          ].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-semibold text-amber-300 bg-slate-700/80 border-b border-slate-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {reportRecords.map((r, i) => (
                          <tr key={i} onClick={() => openWorker(r.fio)}
                            className="hover:bg-teal-900/30 cursor-pointer transition group">
                            {/* Дата/время */}
                            <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                              {r.exam_datetime
                                ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : r.exam_date ? formatDate(r.exam_date) : '—'}
                            </td>
                            {/* Группа МО */}
                            <td className="px-4 py-2.5 text-slate-300">{r.group_mo || '—'}</td>
                            {/* Организация */}
                            <td className="px-4 py-2.5 text-slate-300">{r.company || '—'}</td>
                            {/* Подразделение */}
                            <td className="px-4 py-2.5 text-slate-300">{r.subdivision || '—'}</td>
                            {/* ФИО сотрудника */}
                            <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                              <span className="text-white group-hover:text-teal-300 transition flex items-center gap-1.5">
                                {r.fio}
                                <Icon name="ExternalLink" size={12} className="opacity-0 group-hover:opacity-60 transition" />
                              </span>
                            </td>
                            {/* Результат осмотра */}
                            <td className="px-4 py-2.5 text-slate-300 text-xs">{r.exam_detail || r.reject_reason || '—'}</td>
                            {/* Допуск */}
                            <td className="px-4 py-2.5">
                              {r.exam_result === 'admitted' ? (
                                <span className="inline-flex items-center gap-1.5 bg-green-900/40 border border-green-700/40 text-green-400 font-semibold px-3 py-1 rounded-full text-xs whitespace-nowrap">
                                  <Icon name="CheckCircle" size={13} />Разрешен
                                </span>
                              ) : r.exam_result === 'not_admitted' ? (
                                <span className="inline-flex items-center gap-1.5 bg-red-900/40 border border-red-700/40 text-red-400 font-semibold px-3 py-1 rounded-full text-xs whitespace-nowrap">
                                  <Icon name="XCircle" size={13} />Запрещен
                                </span>
                              ) : r.exam_result === 'evaded' ? (
                                <span className="inline-flex items-center gap-1.5 bg-yellow-900/40 border border-yellow-700/40 text-yellow-400 font-semibold px-3 py-1 rounded-full text-xs whitespace-nowrap">
                                  <Icon name="AlertCircle" size={13} />Уклонился
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 bg-blue-900/30 border border-blue-700/40 text-blue-300 font-semibold px-3 py-1 rounded-full text-xs whitespace-nowrap">
                                  <Icon name="Stethoscope" size={13} />Допуск дан медработником
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* Пагинация */}
            {reportStats && reportStats.total > PAGE_SIZE && (
              <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-3">
                <span className="text-slate-400 text-sm">
                  Показано {reportPage * PAGE_SIZE + 1}–{Math.min((reportPage + 1) * PAGE_SIZE, reportStats.total)} из {reportStats.total.toLocaleString('ru')}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={reportPage === 0 || reportLoading}
                    onClick={() => buildReport(reportPage - 1)}
                    className="border-slate-600 text-slate-300"
                  >
                    <Icon name="ChevronLeft" size={16} />Назад
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={(reportPage + 1) * PAGE_SIZE >= reportStats.total || reportLoading}
                    onClick={() => buildReport(reportPage + 1)}
                    className="border-slate-600 text-slate-300"
                  >
                    Вперёд<Icon name="ChevronRight" size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Быстрый отчёт из окошек статистики ── */}
      {quickReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl">

            {/* Шапка */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${quickReport.type === 'not_admitted' ? 'bg-red-900/50' : quickReport.type === 'evaded' ? 'bg-yellow-900/50' : 'bg-purple-900/50'}`}>
                  <Icon name={quickReport.type === 'not_admitted' ? 'XCircle' : quickReport.type === 'evaded' ? 'AlertCircle' : 'ClipboardList'} size={22}
                    className={quickReport.type === 'not_admitted' ? 'text-red-400' : quickReport.type === 'evaded' ? 'text-yellow-400' : 'text-purple-400'} />
                </div>
                <div>
                  <h2 className="text-white text-lg font-bold">{quickReport.title}</h2>
                  {!quickReport.loading && <p className="text-slate-400 text-sm">Всего записей: {quickReport.records.length.toLocaleString('ru')}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!quickReport.loading && quickReport.records.length > 0 && (<>
                  <button onClick={() => exportQuickExcel(quickReport.records, quickReport.title)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-700/30 border border-green-600/40 text-green-400 text-sm hover:bg-green-700/50 transition">
                    <Icon name="FileSpreadsheet" size={15} />Excel
                  </button>
                  <button onClick={() => exportQuickPDF(quickReport.records, quickReport.title)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-700/30 border border-red-600/40 text-red-400 text-sm hover:bg-red-700/50 transition">
                    <Icon name="FileText" size={15} />PDF
                  </button>
                  <button onClick={() => printQuickReport(quickReport.records, quickReport.title)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700/30 border border-blue-600/40 text-blue-400 text-sm hover:bg-blue-700/50 transition">
                    <Icon name="Printer" size={15} />Печать
                  </button>
                </>)}
                <button onClick={() => setQuickReport(null)}
                  className="text-slate-400 hover:text-white transition ml-1">
                  <Icon name="X" size={22} />
                </button>
              </div>
            </div>

            {/* Содержимое */}
            <div className="p-6">
              {quickReport.loading ? (
                <div className="text-center py-16 text-slate-400">
                  <Icon name="Loader" size={36} className="animate-spin mx-auto mb-3 text-teal-400" />
                  <p>Загружаю данные...</p>
                </div>
              ) : quickReport.records.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Icon name="CheckCircle" size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-lg">Записей нет</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700 max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr>
                        {['Дата/время','Группа МО','Организация','Подразделение','ФИО сотрудника','Результат осмотра','Допуск'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-amber-300 bg-slate-800 border-b border-slate-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {quickReport.records.map((r, i) => (
                        <tr key={i} className={`transition hover:bg-slate-700/20 ${r.exam_result === 'not_admitted' ? 'bg-red-900/10' : r.exam_result === 'evaded' ? 'bg-yellow-900/10' : ''}`}>
                          <td className="px-4 py-2 text-slate-300 whitespace-nowrap text-xs">
                            {r.exam_datetime ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : r.exam_date ? formatDate(r.exam_date) : '—'}
                          </td>
                          <td className="px-4 py-2 text-slate-300 text-xs">{r.group_mo || '—'}</td>
                          <td className="px-4 py-2 text-slate-300 text-xs">{r.company || '—'}</td>
                          <td className="px-4 py-2 text-slate-300 text-xs">{r.subdivision || '—'}</td>
                          <td className="px-4 py-2 text-white font-medium whitespace-nowrap text-xs">{r.fio}</td>
                          <td className="px-4 py-2 text-slate-400 text-xs">{r.exam_detail || r.reject_reason || '—'}</td>
                          <td className="px-4 py-2">
                            {r.exam_result === 'admitted' ? (
                              <span className="inline-flex items-center gap-1 bg-green-900/40 border border-green-700/40 text-green-400 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap"><Icon name="CheckCircle" size={11} />Разрешен</span>
                            ) : r.exam_result === 'not_admitted' ? (
                              <span className="inline-flex items-center gap-1 bg-red-900/40 border border-red-700/40 text-red-400 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap"><Icon name="XCircle" size={11} />Запрещен</span>
                            ) : r.exam_result === 'evaded' ? (
                              <span className="inline-flex items-center gap-1 bg-yellow-900/40 border border-yellow-700/40 text-yellow-400 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap"><Icon name="AlertCircle" size={11} />Уклонился</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-blue-900/30 border border-blue-700/40 text-blue-300 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap"><Icon name="Stethoscope" size={11} />Допуск дан медработником</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Подтверждение удаления файла ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-red-700/40 rounded-2xl shadow-2xl p-7 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-900/50 p-3 rounded-xl shrink-0">
                <Icon name="FileX" size={26} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-bold">Удалить файл?</h2>
                <p className="text-slate-400 text-sm mt-0.5 break-all">{deleteConfirm.fileName}</p>
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-red-300">
                <Icon name="AlertTriangle" size={15} />
                <span>Из базы данных будет удалено <span className="font-bold text-red-200">{deleteConfirm.rows.toLocaleString('ru')} записей</span> этого файла</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <Icon name="CheckCircle" size={15} />
                <span>Данные других файлов <span className="font-bold">останутся нетронутыми</span></span>
              </div>
              <div className="flex items-center gap-2 text-teal-400">
                <Icon name="RefreshCw" size={15} />
                <span>После удаления можно загрузить исправленный файл заново</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteFile}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition flex items-center justify-center gap-2"
              >
                <Icon name="Trash2" size={15} />
                Удалить этот файл
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Карточка работника ── */}
      {workerModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl">

            {/* Шапка карточки */}
            <div className="flex items-start justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shrink-0">
                  <Icon name="User" size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold">{workerModal.fio}</h2>
                  {workerModal.records[0] && (
                    <p className="text-slate-400 text-sm mt-0.5">
                      {workerModal.records[0].company} · {workerModal.records[0].subdivision}
                    </p>
                  )}
                  {(dateFrom || dateTo) && (
                    <p className="text-teal-400 text-xs mt-1">
                      Период: {dateFrom ? new Date(dateFrom).toLocaleDateString('ru') : '—'} — {dateTo ? new Date(dateTo).toLocaleDateString('ru') : '—'}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setWorkerModal(null)}
                className="text-slate-400 hover:text-white transition p-1">
                <Icon name="X" size={22} />
              </button>
            </div>

            {/* Сводная статистика */}
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-slate-700">
              {[
                { label: 'Всего осмотров', value: workerModal.total, color: 'text-white', bg: 'bg-slate-700/50' },
                { label: 'Разрешен', value: workerModal.admitted, color: 'text-green-400', bg: 'bg-green-900/20' },
                { label: 'Запрещен', value: workerModal.not_admitted, color: 'text-red-400', bg: 'bg-red-900/20' },
                { label: 'Уклонился', value: workerModal.evaded, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-slate-400 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Таблица осмотров */}
            <div className="p-6">
              {workerLoading ? (
                <div className="text-center py-12 text-slate-400">
                  <Icon name="Loader" size={32} className="animate-spin mx-auto mb-3" />
                  Загружаю данные...
                </div>
              ) : workerModal.records.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Icon name="SearchX" size={32} className="mx-auto mb-3 opacity-40" />
                  Нет записей за выбранный период
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {['Дата/время', 'Группа МО', 'Подразделение', 'Результат осмотра', 'Допуск'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-amber-300 bg-slate-700/80 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {workerModal.records.map((r, i) => (
                        <tr key={i} className={`transition ${r.exam_result === 'not_admitted' ? 'bg-red-900/10' : r.exam_result === 'evaded' ? 'bg-yellow-900/10' : ''}`}>
                          <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                            {r.exam_datetime
                              ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : r.exam_date ? formatDate(r.exam_date) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">{r.group_mo || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-300 text-xs max-w-xs">{r.subdivision || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-300 text-xs">{r.exam_detail || r.reject_reason || '—'}</td>
                          <td className="px-4 py-2.5">
                            {r.exam_result === 'admitted' ? (
                              <span className="inline-flex items-center gap-1.5 bg-green-900/40 border border-green-700/40 text-green-400 font-semibold px-3 py-1 rounded-full text-xs whitespace-nowrap">
                                <Icon name="CheckCircle" size={13} />Разрешен
                              </span>
                            ) : r.exam_result === 'not_admitted' ? (
                              <span className="inline-flex items-center gap-1.5 bg-red-900/40 border border-red-700/40 text-red-400 font-semibold px-3 py-1 rounded-full text-xs whitespace-nowrap">
                                <Icon name="XCircle" size={13} />Запрещен
                              </span>
                            ) : r.exam_result === 'evaded' ? (
                              <span className="inline-flex items-center gap-1.5 bg-yellow-900/40 border border-yellow-700/40 text-yellow-400 font-semibold px-3 py-1 rounded-full text-xs whitespace-nowrap">
                                <Icon name="AlertCircle" size={13} />Уклонился
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-blue-900/30 border border-blue-700/40 text-blue-300 font-semibold px-3 py-1 rounded-full text-xs whitespace-nowrap">
                                <Icon name="Stethoscope" size={13} />Допуск дан медработником
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Кнопки */}
              <div className="flex justify-between items-center mt-5">
                <button
                  onClick={() => {
                    if (!workerModal.records.length) return;
                    const rows = workerModal.records.map(r => ({
                      'Дата/время': r.exam_datetime ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : r.exam_date || '',
                      'Группа МО': r.group_mo || '',
                      'Организация': r.company || '',
                      'Подразделение': r.subdivision || '',
                      'ФИО сотрудника': r.fio,
                      'Результат осмотра': r.exam_detail || r.reject_reason || '',
                      'Допуск': r.exam_result === 'admitted' ? 'Разрешен' : r.exam_result === 'not_admitted' ? 'Запрещен' : r.exam_result === 'evaded' ? 'Уклонился' : 'Допуск дан медработником',
                    }));
                    const ws = XLSX.utils.json_to_sheet(rows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Осмотры');
                    XLSX.writeFile(wb, `ЭСМО_${workerModal.fio}_${new Date().toLocaleDateString('ru')}.xlsx`);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700/30 border border-green-600/40 text-green-400 text-sm hover:bg-green-700/50 transition"
                >
                  <Icon name="Download" size={16} />Скачать Excel
                </button>
                <button onClick={() => setWorkerModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition">
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения очистки */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-red-700/50 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-900/50 p-3 rounded-xl">
                <Icon name="AlertTriangle" size={28} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Очистка базы данных</h2>
                <p className="text-red-400 text-sm">Это действие нельзя отменить</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-2">
              Будут удалены <span className="text-white font-semibold">все</span> записи ЭСМО, список работников и история загрузок из базы данных Здравпункта.
            </p>
            <p className="text-slate-400 text-xs mb-6 bg-slate-700/50 rounded-lg p-3">
              Используй эту функцию только для очистки тестовых данных перед загрузкой реальных файлов.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition"
              >
                Отмена
              </button>
              <button
                onClick={clearAll}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition flex items-center justify-center gap-2"
              >
                <Icon name="Trash2" size={16} />
                Да, очистить всё
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZdravpunktPage;