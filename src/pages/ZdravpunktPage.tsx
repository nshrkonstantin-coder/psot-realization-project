import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '@/lib/api';

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

interface ExamTypeRecord {
  fio: string;
  subdivision: string;
  company: string;
  exam_date: string | null;
  exam_datetime: string | null;
  group_mo: string | null;
  exam_result: string;
  reject_reason: string | null;
  exam_detail: string | null;
}

interface Stats {
  total_workers: number;
  total_esmo: number;
  admitted: number;
  not_admitted: number;
  total_files: number;
}

interface ExamTypeStat {
  total: number;
  admitted: number;
  not_admitted: number;
  evaded: number;
}

interface ExamTypeStats {
  pre_shift?: ExamTypeStat;
  post_shift?: ExamTypeStat;
  pre_trip?: ExamTypeStat;
  post_trip?: ExamTypeStat;
}

interface WorkerPreviewRow {
  fio: string;
  subdivision: string;
  position: string;
  company: string;
  shift_type: '-' | 'Вахта' | 'Межвахта';
}

interface ContractorRecord {
  id?: number;
  record_date: string;
  company_name: string;
  workers_count: number;
  admission: string;
  exam_type: string;
  shift?: string;
  created_at?: string;
  _local?: boolean;
}

interface ProlongationItem {
  id?: number;
  company_name: string;
  workers_count_day: number;
  workers_count_night: number;
  admission: string;
  exam_type: string;
  is_active: boolean;
  last_filled_date?: string | null;
  _local?: boolean;
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
  const [examTypeStats, setExamTypeStats] = useState<ExamTypeStats | null>(null);
  const [examTypeModal, setExamTypeModal] = useState<{ type: string; label: string; records: ExamTypeRecord[]; total: number } | null>(null);
  const [examTypeModalLoading, setExamTypeModalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'workers' | 'esmo' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadSheetStats, setUploadSheetStats] = useState<{ label: string; count: number }[] | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'report' | 'contractors'>('upload');
  const [workerPreview, setWorkerPreview] = useState<{ rows: WorkerPreviewRow[]; fileName: string; fileRef: File | null; columnMap: { field: string; col: string; found: boolean }[]; missingFields: string[]; fileSubdivision: string } | null>(null);
  const [missingFieldValues, setMissingFieldValues] = useState<Record<string, string>>({});
  const [workerPreviewUploading, setWorkerPreviewUploading] = useState(false);
  const [workerSubStats, setWorkerSubStats] = useState<{ subdivision: string; vakhta: number; mezhvakhta: number; other: number; total: number; not_admitted: number; evaded: number }[] | null>(null);
  const [workerSubStatsLoading, setWorkerSubStatsLoading] = useState(false);

  // Фильтры отчёта
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterSubdivisions, setFilterSubdivisions] = useState<string[]>([]);
  const [filterCompanies, setFilterCompanies] = useState<string[]>([]);
  const [filterFio, setFilterFio] = useState('');
  const [filterResults, setFilterResults] = useState<string[]>([]);
  const [subdivisions, setSubdivisions] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [msSubOpen, setMsSubOpen] = useState(false);
  const [msCompOpen, setMsCompOpen] = useState(false);
  const [msResOpen, setMsResOpen] = useState(false);
  const [filterExamTypes, setFilterExamTypes] = useState<string[]>([]);
  const msSubRef = useRef<HTMLDivElement>(null);
  const msCompRef = useRef<HTMLDivElement>(null);
  const msResRef = useRef<HTMLDivElement>(null);
  const [reportRecords, setReportRecords] = useState<ReportRecord[] | null>(null);
  const [reportStats, setReportStats] = useState<{ total: number; admitted: number; not_admitted: number; evaded: number; unique_workers: number; unique_workers_esmo: number; total_esmo: number; contractor_workers: number; unique_not_admitted: number; unique_evaded: number } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPage, setReportPage] = useState(0);
  const PAGE_SIZE = 500;
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Подрядчики — ручной ввод
  const [contractorRecords, setContractorRecords] = useState<ContractorRecord[]>([]);
  const [contractorLoading, setContractorLoading] = useState(false);
  const [contractorSaving, setContractorSaving] = useState(false);
  // Если пользователь без организации (superadmin) — выбор организации для блока подрядчиков
  const [orgList, setOrgList] = useState<{ id: number; name: string }[]>([]);
  const [selectedContractorOrgId, setSelectedContractorOrgId] = useState<string>(
    localStorage.getItem('zdravpunkt_contractor_org_id') || orgId
  );
  // Пролонгация — настройки ежедневного автозаполнения
  const [prolongations, setProlongations] = useState<ProlongationItem[]>([]);
  const [prolongationLoading, setProlongationLoading] = useState(false);
  const [showProlongationPanel, setShowProlongationPanel] = useState(false);
  // Подрядчики в отчёте (секция снизу таблицы)
  const [contractorReportList, setContractorReportList] = useState<ContractorRecord[]>([]);

  // Модальное окно списка уникальных работников
  interface UniqueWorker {
    fio: string; company: string; subdivision: string;
    total_exams: number; has_admitted: boolean;
    has_not_admitted: boolean; has_evaded: boolean;
    first_date: string | null; last_date: string | null;
  }
  const [uniqueModal, setUniqueModal] = useState<{ title: string; workers: UniqueWorker[]; loading: boolean } | null>(null);

  const openUniqueWorkers = async () => {
    setUniqueModal({ title: `Уникальных работников${dateFrom || dateTo ? ` (${dateFrom ? new Date(dateFrom).toLocaleDateString('ru') : ''}–${dateTo ? new Date(dateTo).toLocaleDateString('ru') : ''})` : ''}`, workers: [], loading: true });
    try {
      const p = new URLSearchParams({ action: 'unique_workers' });
      if (dateFrom) p.set('date_from', dateFrom);
      if (dateTo) p.set('date_to', dateTo);
      if (filterSubdivision) p.set('subdivision', filterSubdivision);
      if (filterCompany) p.set('company', filterCompany);
      const res = await apiFetch(`${API}?${p.toString()}`);
      const data = await res.json();
      if (data.success) setUniqueModal(prev => prev ? { ...prev, workers: data.workers, loading: false } : null);
    } catch { toast.error('Ошибка загрузки'); setUniqueModal(null); }
  };

  const exportUniqueExcel = (workers: UniqueWorker[], title: string) => {
    const rows = workers.map(w => ({
      'ФИО': w.fio,
      'Организация': w.company,
      'Подразделение': w.subdivision,
      'Кол-во осмотров': w.total_exams,
      'Первый осмотр': w.first_date ? new Date(w.first_date).toLocaleDateString('ru') : '',
      'Последний осмотр': w.last_date ? new Date(w.last_date).toLocaleDateString('ru') : '',
      'Был запрещён': w.has_not_admitted ? 'Да' : 'Нет',
      'Уклонялся': w.has_evaded ? 'Да' : 'Нет',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Работники');
    XLSX.writeFile(wb, `${title}_${new Date().toLocaleDateString('ru')}.xlsx`);
  };

  const exportUniquePDF = (workers: UniqueWorker[], title: string) => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    doc.setFontSize(14);
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.text(`Сформирован: ${new Date().toLocaleString('ru')}  Всего работников: ${workers.length}`, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [['#', 'ФИО', 'Организация', 'Подразделение', 'Осмотров', 'Первый', 'Последний', 'Запрещён', 'Уклонялся']],
      body: workers.map((w, i) => [
        i + 1,
        w.fio,
        w.company || '',
        w.subdivision || '',
        w.total_exams,
        w.first_date ? new Date(w.first_date).toLocaleDateString('ru') : '',
        w.last_date ? new Date(w.last_date).toLocaleDateString('ru') : '',
        w.has_not_admitted ? 'Да' : '',
        w.has_evaded ? 'Да' : '',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 8 }, 1: { cellWidth: 50 }, 2: { cellWidth: 45 },
        3: { cellWidth: 50 }, 4: { cellWidth: 16 }, 5: { cellWidth: 20 },
        6: { cellWidth: 20 }, 7: { cellWidth: 16 }, 8: { cellWidth: 16 },
      },
      didParseCell: (data) => {
        if (data.column.index === 7 && data.cell.raw === 'Да') data.cell.styles.textColor = [220, 38, 38];
        if (data.column.index === 8 && data.cell.raw === 'Да') data.cell.styles.textColor = [202, 138, 4];
      },
    });
    doc.save(`${title}_${new Date().toLocaleDateString('ru')}.pdf`);
  };

  const printUniqueWorkers = (workers: UniqueWorker[], title: string) => {
    const html = `
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
        h2 { font-size: 13px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 9px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f766e; color: white; padding: 4px 5px; text-align: left; font-size: 9px; }
        td { padding: 3px 5px; border-bottom: 1px solid #e2e8f0; font-size: 9px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .red { color: #dc2626; font-weight: bold; }
        .yellow { color: #ca8a04; font-weight: bold; }
        @media print { body { margin: 8px; } }
      </style></head><body>
      <h2>${title}</h2>
      <div class="meta">Сформирован: ${new Date().toLocaleString('ru')} &nbsp;|&nbsp; Всего работников: ${workers.length}</div>
      <table>
        <thead><tr>
          <th>#</th><th>ФИО</th><th>Организация</th><th>Подразделение</th>
          <th>Осмотров</th><th>Первый</th><th>Последний</th><th>Запрещён</th><th>Уклонялся</th>
        </tr></thead>
        <tbody>${workers.map((w, i) => `<tr>
          <td>${i + 1}</td>
          <td><b>${w.fio}</b></td>
          <td>${w.company || ''}</td>
          <td>${w.subdivision || ''}</td>
          <td style="text-align:center">${w.total_exams}</td>
          <td>${w.first_date ? new Date(w.first_date).toLocaleDateString('ru') : ''}</td>
          <td>${w.last_date ? new Date(w.last_date).toLocaleDateString('ru') : ''}</td>
          <td class="${w.has_not_admitted ? 'red' : ''}">${w.has_not_admitted ? 'Да' : ''}</td>
          <td class="${w.has_evaded ? 'yellow' : ''}">${w.has_evaded ? 'Да' : ''}</td>
        </tr>`).join('')}</tbody>
      </table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  };

  const exportWorkerPDF = (records: ReportRecord[], fio: string) => {
    const title = `ЭСМО — ${fio}`;
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    doc.setFontSize(14);
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.text(`Сформирован: ${new Date().toLocaleString('ru')}  Всего осмотров: ${records.length}`, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [['Дата/время', 'Группа МО', 'Организация', 'Подразделение', 'Результат осмотра', 'Допуск']],
      body: records.map(r => [
        r.exam_datetime ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : r.exam_date || '',
        r.group_mo || '',
        r.company || '',
        r.subdivision || '',
        r.exam_detail || r.reject_reason || '',
        r.exam_result === 'admitted' ? 'Разрешен' : r.exam_result === 'not_admitted' ? 'Запрещен' : r.exam_result === 'evaded' ? 'Уклонился' : 'Допуск дан медработником',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 30 }, 1: { cellWidth: 22 }, 2: { cellWidth: 50 },
        3: { cellWidth: 55 }, 4: { cellWidth: 60 }, 5: { cellWidth: 30 },
      },
      didParseCell: (data) => {
        if (data.column.index === 5) {
          if (data.cell.raw === 'Запрещен') data.cell.styles.textColor = [220, 38, 38];
          else if (data.cell.raw === 'Уклонился') data.cell.styles.textColor = [202, 138, 4];
          else if (data.cell.raw === 'Разрешен') data.cell.styles.textColor = [22, 163, 74];
        }
      },
    });
    doc.save(`${title}_${new Date().toLocaleDateString('ru')}.pdf`);
  };

  const printWorker = (records: ReportRecord[], fio: string) => {
    const title = `ЭСМО — ${fio}`;
    const resultLabel = (r: ReportRecord) =>
      r.exam_result === 'admitted' ? 'Разрешен' :
      r.exam_result === 'not_admitted' ? 'Запрещен' :
      r.exam_result === 'evaded' ? 'Уклонился' : 'Допуск дан медработником';
    const resultColor = (r: ReportRecord) =>
      r.exam_result === 'not_admitted' ? 'color:#dc2626' :
      r.exam_result === 'evaded' ? 'color:#ca8a04' :
      r.exam_result === 'admitted' ? 'color:#16a34a' : '';
    const html = `
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
        h2 { font-size: 14px; margin-bottom: 2px; }
        .sub { color: #555; font-size: 10px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 10px; margin-bottom: 12px; }
        .stats { display: flex; gap: 20px; margin-bottom: 12px; }
        .stat { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 14px; text-align: center; }
        .stat .val { font-size: 20px; font-weight: bold; }
        .stat .lbl { font-size: 9px; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f766e; color: white; padding: 5px 6px; text-align: left; font-size: 10px; }
        td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
        tr:nth-child(even) td { background: #f8fafc; }
        @media print { body { margin: 10px; } }
      </style></head><body>
      <h2>${fio}</h2>
      ${records[0] ? `<div class="sub">${records[0].company || ''} · ${records[0].subdivision || ''}</div>` : ''}
      <div class="meta">Сформирован: ${new Date().toLocaleString('ru')}</div>
      <div class="stats">
        <div class="stat"><div class="val">${records.length}</div><div class="lbl">Всего</div></div>
        <div class="stat"><div class="val" style="color:#16a34a">${records.filter(r => r.exam_result === 'admitted').length}</div><div class="lbl">Разрешен</div></div>
        <div class="stat"><div class="val" style="color:#dc2626">${records.filter(r => r.exam_result === 'not_admitted').length}</div><div class="lbl">Запрещен</div></div>
        <div class="stat"><div class="val" style="color:#ca8a04">${records.filter(r => r.exam_result === 'evaded').length}</div><div class="lbl">Уклонился</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Дата/время</th><th>Группа МО</th><th>Подразделение</th>
          <th>Результат осмотра</th><th>Допуск</th>
        </tr></thead>
        <tbody>${records.map(r => `<tr>
          <td>${r.exam_datetime ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : r.exam_date || ''}</td>
          <td>${r.group_mo || ''}</td>
          <td>${r.subdivision || ''}</td>
          <td>${r.exam_detail || r.reject_reason || ''}</td>
          <td style="${resultColor(r)};font-weight:bold">${resultLabel(r)}</td>
        </tr>`).join('')}</tbody>
      </table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  };

  const exportGroupedPDF = (records: ReportRecord[], title: string, groupKey: 'subdivision' | 'company') => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const grouped = records.reduce((acc, r) => {
      const key = r[groupKey] || '— не указано —';
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {} as Record<string, ReportRecord[]>);
    const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
    const label = groupKey === 'subdivision' ? 'Подразделение' : 'Компания';

    doc.setFontSize(14);
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.text(`Сформирован: ${new Date().toLocaleString('ru')}  Записей: ${records.length}  ${label === 'Подразделение' ? 'Подразделений' : 'Компаний'}: ${sorted.length}`, 14, 23);

    autoTable(doc, {
      startY: 28,
      head: [[label, 'Всего', 'Разрешен', 'Запрещен', 'Уклонился', 'ФИО (краткий список)']],
      body: sorted.map(([name, recs]) => {
        const admitted = recs.filter(r => r.exam_result === 'admitted').length;
        const not_admitted = recs.filter(r => r.exam_result === 'not_admitted').length;
        const evaded = recs.filter(r => r.exam_result === 'evaded').length;
        const uniqueFio = [...new Set(recs.map(r => r.fio))].slice(0, 5).join(', ') + (new Set(recs.map(r => r.fio)).size > 5 ? '...' : '');
        return [name, recs.length, admitted, not_admitted, evaded, uniqueFio];
      }),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 65 }, 1: { cellWidth: 16 }, 2: { cellWidth: 20 },
        3: { cellWidth: 20 }, 4: { cellWidth: 20 }, 5: { cellWidth: 105 },
      },
      didParseCell: (data) => {
        if (data.column.index === 3 && Number(data.cell.raw) > 0) data.cell.styles.textColor = [220, 38, 38];
        if (data.column.index === 4 && Number(data.cell.raw) > 0) data.cell.styles.textColor = [202, 138, 4];
        if (data.column.index === 2 && Number(data.cell.raw) > 0) data.cell.styles.textColor = [22, 163, 74];
      },
    });
    doc.save(`${title}_${new Date().toLocaleDateString('ru')}.pdf`);
  };

  const printGroupedReport = (records: ReportRecord[], title: string, groupKey: 'subdivision' | 'company') => {
    const grouped = records.reduce((acc, r) => {
      const key = r[groupKey] || '— не указано —';
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {} as Record<string, ReportRecord[]>);
    const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
    const label = groupKey === 'subdivision' ? 'Подразделение' : 'Компания';
    const html = `
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
        h2 { font-size: 13px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 9px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #0f766e; color: white; padding: 4px 5px; text-align: left; font-size: 9px; }
        td { padding: 3px 5px; border-bottom: 1px solid #e2e8f0; font-size: 9px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .red { color: #dc2626; font-weight: bold; } .green { color: #16a34a; font-weight: bold; } .yellow { color: #ca8a04; font-weight: bold; }
        @media print { body { margin: 8px; } }
      </style></head><body>
      <h2>${title}</h2>
      <div class="meta">Сформирован: ${new Date().toLocaleString('ru')} &nbsp;|&nbsp; Записей: ${records.length} &nbsp;|&nbsp; ${label === 'Подразделение' ? 'Подразделений' : 'Компаний'}: ${sorted.length}</div>
      <table>
        <thead><tr><th>${label}</th><th>Всего</th><th>Разрешен</th><th>Запрещен</th><th>Уклонился</th><th>Работники</th></tr></thead>
        <tbody>${sorted.map(([name, recs]) => {
          const admitted = recs.filter(r => r.exam_result === 'admitted').length;
          const not_admitted = recs.filter(r => r.exam_result === 'not_admitted').length;
          const evaded = recs.filter(r => r.exam_result === 'evaded').length;
          const uniqueFio = [...new Set(recs.map(r => r.fio))].slice(0, 6).join(', ') + (new Set(recs.map(r => r.fio)).size > 6 ? '...' : '');
          return `<tr>
            <td><b>${name}</b></td>
            <td style="text-align:center">${recs.length}</td>
            <td class="green" style="text-align:center">${admitted || ''}</td>
            <td class="${not_admitted ? 'red' : ''}" style="text-align:center">${not_admitted || ''}</td>
            <td class="${evaded ? 'yellow' : ''}" style="text-align:center">${evaded || ''}</td>
            <td style="font-size:8px">${uniqueFio}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  };

  // Быстрый отчёт из окошек статистики
  type QuickReportType = 'not_admitted' | 'evaded' | 'admitted' | 'all_esmo';
  const [quickReport, setQuickReport] = useState<{
    type: QuickReportType;
    title: string;
    records: ReportRecord[];
    loading: boolean;
  } | null>(null);
  const [quickTab, setQuickTab] = useState<'list' | 'by_subdivision' | 'by_company'>('list');

  const openQuickReport = async (type: QuickReportType, title: string, extraParams?: Record<string, string>) => {
    setQuickTab('list');
    setQuickReport({ type, title, records: [], loading: true });
    try {
      const effectiveOrgId = localStorage.getItem('zdravpunkt_contractor_org_id') || orgId;
      const p = new URLSearchParams({ action: 'report', limit: '5000', offset: '0' });
      if (effectiveOrgId) p.set('organization_id', effectiveOrgId);
      if (type !== 'all_esmo') p.set('exam_result', type);
      if (extraParams) Object.entries(extraParams).forEach(([k, v]) => v && p.set(k, v));
      const res = await apiFetch(`${API}?${p.toString()}`);
      const data = await res.json();
      if (data.success) {
        setQuickReport({ type, title, records: data.records, loading: false });
      }
    } catch {
      toast.error('Ошибка загрузки');
      setQuickReport(null);
    }
  };

  // Открыть быстрый отчёт с текущими фильтрами периода/подразделения/компании из формы отчёта
  const openQuickReportWithPeriod = (type: QuickReportType, title: string) => {
    const periodLabel = dateFrom || dateTo
      ? ` (${dateFrom ? new Date(dateFrom).toLocaleDateString('ru') : ''}–${dateTo ? new Date(dateTo).toLocaleDateString('ru') : ''})`
      : '';
    openQuickReport(type, `${title}${periodLabel}`, {
      date_from: dateFrom,
      date_to: dateTo,
      subdivision: filterSubdivisions.join('||'),
      company: filterCompanies.join('||'),
      fio: filterFio,
    });
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

  const exportQuickPDF = (records: ReportRecord[], title: string, contractors?: ContractorRecord[]) => {
    const etLbl: Record<string, string> = { pre_shift: 'Предсменный', post_shift: 'Послесменный', pre_trip: 'Предрейсовый', post_trip: 'Послерейсовый' };
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
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
    if (contractors && contractors.length > 0) {
      const lastY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 28;
      doc.setFontSize(11);
      doc.text('Подрядчики — ручной ввод', 14, lastY + 10);
      autoTable(doc, {
        startY: lastY + 15,
        head: [['Дата', 'Наименование компании', 'Тип осмотра', 'Кол-во работников', 'Допуск']],
        body: contractors.map(cr => [
          cr.record_date ? new Date(cr.record_date + 'T00:00:00').toLocaleDateString('ru') : '',
          cr.company_name,
          etLbl[cr.exam_type] || cr.exam_type,
          String(cr.workers_count),
          cr.admission === 'admitted' ? 'Допущен' : cr.admission === 'not_admitted' ? 'Не допущен' : 'Уклонился',
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [20, 90, 80], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 250, 248] },
        columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 70 }, 2: { cellWidth: 30 }, 3: { cellWidth: 32 }, 4: { cellWidth: 24 } },
      });
    }
    doc.save(`${title}_${new Date().toLocaleDateString('ru')}.pdf`);
  };

  const printQuickReport = (records: ReportRecord[], title: string, subtitle?: string, contractors?: ContractorRecord[]) => {
    const resultLabel = (r: ReportRecord) =>
      r.exam_result === 'admitted' ? 'Разрешен' :
      r.exam_result === 'not_admitted' ? 'Запрещен' :
      r.exam_result === 'evaded' ? 'Уклонился' : 'Допуск дан медработником';
    const etLbl: Record<string, string> = { pre_shift: 'Предсменный', post_shift: 'Послесменный', pre_trip: 'Предрейсовый', post_trip: 'Послерейсовый' };
    const contrAdmLabel = (a: string) => a === 'admitted' ? 'Допущен' : a === 'not_admitted' ? 'Не допущен' : 'Уклонился';

    const html = `
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
        h2 { font-size: 14px; margin-bottom: 2px; }
        h3 { font-size: 12px; margin: 16px 0 4px; color: #0f5e57; border-top: 2px dashed #0f766e; padding-top: 10px; }
        .subtitle { font-size: 11px; color: #333; margin-bottom: 4px; font-weight: bold; }
        .meta { color: #666; font-size: 10px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th { background: #0f766e; color: white; padding: 5px 6px; text-align: left; font-size: 10px; }
        th.contr { background: #145a50; }
        td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
        tr:nth-child(even) td { background: #f8fafc; }
        @media print { body { margin: 10px; } }
      </style></head><body>
      <h2>${title}</h2>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      <div class="meta">Дата формирования: ${new Date().toLocaleString('ru')} &nbsp;|&nbsp; Всего записей: ${records.length}</div>
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
      </table>
      ${contractors && contractors.length > 0 ? `
        <h3>Подрядчики — ручной ввод (${contractors.length} строк, ${contractors.reduce((s, c) => s + c.workers_count, 0)} работников)</h3>
        <table>
          <thead><tr>
            <th class="contr">Дата</th><th class="contr">Наименование компании</th>
            <th class="contr">Тип осмотра</th><th class="contr">Кол-во работников</th><th class="contr">Допуск</th>
          </tr></thead>
          <tbody>${contractors.map(cr => `<tr>
            <td>${cr.record_date ? new Date(cr.record_date + 'T00:00:00').toLocaleDateString('ru') : ''}</td>
            <td><b>${cr.company_name}</b></td>
            <td>${etLbl[cr.exam_type] || cr.exam_type}</td>
            <td>${cr.workers_count}</td>
            <td>${contrAdmLabel(cr.admission)}</td>
          </tr>`).join('')}</tbody>
        </table>` : ''}
      </body></html>`;
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
    // Если superadmin без организации — подгружаем список организаций для выбора в блоке подрядчиков
    if (!orgId) {
      apiFetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b?action=list')
        .then(r => r.json())
        .then(d => { if (d.success) setOrgList((d.organizations || []).map((o: { id: number; name: string }) => ({ id: o.id, name: o.name }))); })
        .catch(() => {});
    }
  }, []);

  // При смене организации в блоке подрядчиков — запоминаем в localStorage, перезагружаем записи и пролонгации
  useEffect(() => {
    if (!selectedContractorOrgId) return;
    localStorage.setItem('zdravpunkt_contractor_org_id', selectedContractorOrgId);
    setContractorLoading(true);
    Promise.all([
      apiFetch(`${API}?action=contractor_records&organization_id=${selectedContractorOrgId}`).then(r => r.json()),
      apiFetch(`${API}?action=prolongation_list&organization_id=${selectedContractorOrgId}`).then(r => r.json()),
    ]).then(([crData, plData]) => {
      if (crData.success) setContractorRecords(crData.records || []);
      if (plData.success) setProlongations(plData.prolongations || []);
    }).catch(() => {})
      .finally(() => setContractorLoading(false));
  }, [selectedContractorOrgId]);

  const loadAll = async () => {
    setLoading(true);
    // Вычисляем эффективный orgId — из localStorage (запомненный) или из авторизации
    const effectiveOrgForLoad = localStorage.getItem('zdravpunkt_contractor_org_id') || orgId;
    try {
      // Сначала запускаем автозаполнение пролонгации за сегодня (если есть orgId)
      if (effectiveOrgForLoad) {
        apiFetch(API, {
          method: 'POST',
          body: JSON.stringify({ action: 'fill_prolongation_today', organization_id: effectiveOrgForLoad })
        }).then(r => r.json()).then(d => {
          if (d.success && d.inserted > 0) {
            // Если появились новые записи — перезагружаем contractor_records и stats
            Promise.all([
              apiFetch(`${API}?action=contractor_records&organization_id=${effectiveOrgForLoad}`).then(r => r.json()),
              apiFetch(`${API}?action=stats&organization_id=${effectiveOrgForLoad}`).then(r => r.json()),
              apiFetch(`${API}?action=exam_type_stats&organization_id=${effectiveOrgForLoad}`).then(r => r.json()),
            ]).then(([cr, st, et]) => {
              if (cr.success) setContractorRecords(cr.records || []);
              if (st.success) setStats(st);
              if (et.success) setExamTypeStats(et.stats || {});
            });
          }
        }).catch(() => {});
      }

      const [fRes, sRes, flRes, etRes, crRes, wsRes] = await Promise.all([
        apiFetch(`${API}?action=files&organization_id=${effectiveOrgForLoad}`),
        apiFetch(`${API}?action=stats&organization_id=${effectiveOrgForLoad}`),
        apiFetch(`${API}?action=filters&organization_id=${effectiveOrgForLoad}`),
        apiFetch(`${API}?action=exam_type_stats&organization_id=${effectiveOrgForLoad}`),
        apiFetch(`${API}?action=contractor_records&organization_id=${effectiveOrgForLoad}`),
        apiFetch(`${API}?action=workers_sub_stats&organization_id=${effectiveOrgForLoad}`)
      ]);
      const fData = await fRes.json();
      const sData = await sRes.json();
      const flData = await flRes.json();
      const etData = await etRes.json();
      const crData = await crRes.json();
      const wsData = await wsRes.json();
      if (fData.success) setFiles(fData.files);
      if (sData.success) setStats(sData);
      if (etData.success) setExamTypeStats(etData.stats || {});
      if (flData.success) {
        setSubdivisions(flData.subdivisions || []);
        setCompanies(flData.companies || []);
      }
      if (crData.success) setContractorRecords(crData.records || []);
      if (wsData.success) setWorkerSubStats(wsData.stats || []);
    } catch { toast.error('Ошибка загрузки данных'); }
    finally { setLoading(false); }
  };

  const saveContractorRecords = async (records: ContractorRecord[]) => {
    const effectiveOrgId = selectedContractorOrgId || orgId;
    if (!effectiveOrgId) {
      toast.error('Выберите организацию перед сохранением.');
      return;
    }
    setContractorSaving(true);
    try {
      const payload = { action: 'save_contractor_records', organization_id: effectiveOrgId, records };
      const res = await apiFetch(API, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Сохранено');
        // Перезагружаем записи подрядчиков и фильтры (чтобы новые компании появились в выпадашке отчёта)
        const [crRes, flRes] = await Promise.all([
          apiFetch(`${API}?action=contractor_records&organization_id=${effectiveOrgId}`),
          apiFetch(`${API}?action=filters&organization_id=${effectiveOrgId}`)
        ]);
        const crData = await crRes.json();
        const flData = await flRes.json();
        if (crData.success) setContractorRecords(crData.records || []);
        if (flData.success) {
          setSubdivisions(flData.subdivisions || []);
          setCompanies(flData.companies || []);
        }
      } else {
        toast.error(data.error || 'Ошибка сохранения');
      }
    } catch { toast.error('Ошибка сохранения'); }
    finally { setContractorSaving(false); }
  };

  const deleteContractorRecord = async (id: number) => {
    const effectiveOrgId = selectedContractorOrgId || orgId;
    try {
      const res = await apiFetch(API, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_contractor_record', id, organization_id: effectiveOrgId })
      });
      const data = await res.json();
      if (data.success) {
        setContractorRecords(prev => prev.filter(r => r.id !== id));
        toast.success('Удалено');
        // Обновляем фильтры — убираем компанию из выпадашки если записей больше нет
        const flRes = await apiFetch(`${API}?action=filters&organization_id=${currentOrgId}`);
        const flData = await flRes.json();
        if (flData.success) {
          setSubdivisions(flData.subdivisions || []);
          setCompanies(flData.companies || []);
        }
      }
    } catch { toast.error('Ошибка удаления'); }
  };

  // ── Универсальный загрузчик Excel ───────────────────────────────────────
  const openExamTypeModal = async (examType: string, label: string) => {
    setExamTypeModalLoading(true);
    setExamTypeModal({ type: examType, label, records: [], total: 0 });
    try {
      const res = await apiFetch(`${API}?action=exam_type_list&exam_type=${examType}&limit=2000&organization_id=${orgId}`);
      const data = await res.json();
      if (data.success) {
        setExamTypeModal({ type: examType, label, records: data.records || [], total: data.total || 0 });
      }
    } catch { toast.error('Ошибка загрузки данных'); }
    finally { setExamTypeModalLoading(false); }
  };

  const printExamTypeModal = () => {
    if (!examTypeModal) return;
    const RESULT_LABEL: Record<string, string> = { admitted: 'Допущен', not_admitted: 'Не допущен', evaded: 'Уклонился' };
    const rows = examTypeModal.records.map((r, i) =>
      `<tr><td>${i+1}</td><td>${r.fio}</td><td>${r.subdivision||'—'}</td><td>${r.company||'—'}</td><td>${r.exam_date||'—'}</td><td>${RESULT_LABEL[r.exam_result]||r.exam_result}</td></tr>`
    ).join('');
    const html = `<html><head><title>${examTypeModal.label}</title><style>body{font-family:Arial,sans-serif;font-size:11px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f0f0f0}@media print{button{display:none}}</style></head><body><h2>${examTypeModal.label} — список осмотров (${examTypeModal.total})</h2><table><thead><tr><th>#</th><th>ФИО</th><th>Подразделение</th><th>Организация</th><th>Дата</th><th>Результат</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  };

  const exportExamTypeExcel = () => {
    if (!examTypeModal) return;
    const RESULT_LABEL: Record<string, string> = { admitted: 'Допущен', not_admitted: 'Не допущен', evaded: 'Уклонился' };
    const data = examTypeModal.records.map(r => ({
      'ФИО': r.fio, 'Подразделение': r.subdivision||'', 'Организация': r.company||'',
      'Дата осмотра': r.exam_date||'', 'Результат': RESULT_LABEL[r.exam_result]||r.exam_result,
      'Причина': r.reject_reason||'', 'Группа МО': r.group_mo||''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, ws, examTypeModal.label);
    XLSX.writeFile(wb2, `${examTypeModal.label}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'workers' | 'esmo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(fileType);
    setUploadSheetStats(null);

    try {
      // Читаем Excel
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Определяем ключи заголовков (из первой строки данных или из заголовков листа)
      const getSheetKeys = (): string[] => {
        if (raw.length > 0) return Object.keys(raw[0]);
        // Для пустого файла — читаем строку заголовков напрямую
        const rows1: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        return rows1.length > 0 ? (rows1[0] as string[]).map(String) : [];
      };

      // Для workers — сначала показываем предпросмотр с выбором Вахта/Межвахта
      if (fileType === 'workers') {
        const keys = getSheetKeys();

        if (keys.length === 0) {
          toast.error('Файл пустой или не содержит данных');
          setUploading(null);
          return;
        }

        // Сначала ищем точное совпадение, потом частичное без учёта регистра
        const findKeyW = (...variants: string[]) =>
          keys.find(k => variants.includes(k)) ||
          keys.find(k => variants.some(v => k.toLowerCase().includes(v.toLowerCase()))) ||
          '';

        const shiftKeyW = findKeyW('Вахта/Межвахта', 'вахта/межвахта', 'вахта', 'межвахта', 'shift', 'тип вахты', 'вид вахты', 'режим');

        const detectShift = (val: string): '-' | 'Вахта' | 'Межвахта' => {
          const v = val.trim().toLowerCase();
          if (v.includes('межвахта') || v.includes('межвахт')) return 'Межвахта';
          if (v.includes('вахта') || v.includes('вахт')) return 'Вахта';
          return '-';
        };

        // Функция фильтрации ФИО: убираем строки с цифрами, заголовки, пустые
        const isFio = (s: string) => {
          const t = s.trim();
          if (!t || t.length < 3) return false;
          // Заголовочные слова
          const skip = ['фио', 'ф.и.о', 'наименование', 'работник', 'имя', 'name', '№', 'итого', 'всего', 'подразделение', 'должность'];
          if (skip.some(w => t.toLowerCase() === w)) return false;
          // Строки, состоящие только из цифр/символов
          if (/^[\d\s\-.,№#]+$/.test(t)) return false;
          return true;
        };

        const fioKeyW = findKeyW('Ф.И.О. работника', 'ф.и.о. работника', 'ф.и.о', 'ф.и.о.', 'фио', 'имя', 'наименование', 'работник', 'name');
        const divKeyW = findKeyW('Подразделение', 'подразделение', 'отдел', 'subdivision', 'участок', 'цех', 'бригада');
        const posKeyW = findKeyW('Должность', 'должность', 'position', 'профессия');
        const compKeyW = findKeyW('компания', 'организация', 'company', 'предприятие', 'работодатель');

        // Подразделение из имени файла (без расширения) — если в файле не найдена колонка
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '').trim();

        const rawRows: WorkerPreviewRow[] = raw.map(r => {
          const fioRaw = String(r[fioKeyW] || '').trim();
          const divRaw = String(r[divKeyW] || '').trim();
          return {
            fio: fioRaw,
            subdivision: divRaw || (!divKeyW ? fileNameWithoutExt : ''),
            position: String(r[posKeyW] || '').trim(),
            company: String(r[compKeyW] || '').trim(),
            shift_type: shiftKeyW ? detectShift(String(r[shiftKeyW] || '')) : '-',
          };
        }).filter(w => isFio(w.fio));

        // Сортировка: по подразделению А→Я, внутри — Вахта, Межвахта, прочие
        const shiftOrder: Record<string, number> = { 'Вахта': 0, 'Межвахта': 1, '-': 2 };
        const rows = [...rawRows].sort((a, b) => {
          const subCmp = (a.subdivision || '').localeCompare(b.subdivision || '', 'ru');
          if (subCmp !== 0) return subCmp;
          return (shiftOrder[a.shift_type] ?? 2) - (shiftOrder[b.shift_type] ?? 2);
        });

        const columnMap = [
          { field: 'ФИО',            col: fioKeyW,   found: !!fioKeyW },
          { field: 'Подразделение',  col: divKeyW || `из имени файла: «${fileNameWithoutExt}»`, found: true },
          { field: 'Должность',      col: posKeyW,   found: !!posKeyW },
          { field: 'Вахта/Межвахта', col: shiftKeyW, found: !!shiftKeyW },
          { field: 'Компания',       col: compKeyW,  found: !!compKeyW },
        ];

        // Определяем какие поля отсутствуют
        const missingFields: string[] = [];
        if (!shiftKeyW) missingFields.push('Вахта/Межвахта');
        if (!posKeyW) missingFields.push('Должность');
        if (!compKeyW) missingFields.push('Компания');

        setUploading(null);
        setWorkerPreview({ rows, fileName: file.name, fileRef: file, columnMap, missingFields, fileSubdivision: !divKeyW ? fileNameWithoutExt : '' });
        return;
      }

      if (raw.length === 0) {
        toast.error('Файл пустой или не содержит данных');
        setUploading(null);
        return;
      }

      // Сохраняем запись о файле в БД (rows_count уточним после парсинга для esmo)
      const saveRes = await apiFetch(API, {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_file',
          file_type: fileType,
          file_name: file.name,
          file_url: '',
          file_size: file.size,
          rows_count: fileType === 'workers' ? raw.length : 0,
          uploaded_by: userId,
          organization_id: orgId
        })
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error);
      const fileId = saveData.file_id;

      // Парсим ЭСМО и отправляем ОДНИМ запросом
      {
        // Маппинг имён вкладок → exam_type
        const SHEET_TYPE_MAP: Record<string, string> = {
          'предсменный': 'pre_shift',
          'предсменные': 'pre_shift',
          'pre_shift': 'pre_shift',
          'послесменный': 'post_shift',
          'послесменные': 'post_shift',
          'post_shift': 'post_shift',
          'предрейсовый': 'pre_trip',
          'предрейсовые': 'pre_trip',
          'pre_trip': 'pre_trip',
          'послерейсовый': 'post_trip',
          'послерейсовые': 'post_trip',
          'post_trip': 'post_trip',
        };

        // Парсим одну строку из листа в запись ЭСМО
        const parseEsmoRow = (r: Record<string, unknown>, sheetKeys: string[], examType: string) => {
          const fkFind = (...v: string[]) =>
            sheetKeys.find(k => v.includes(k)) ||
            sheetKeys.find(k => v.some(s => k.toLowerCase().includes(s.toLowerCase()))) || '';

          const fioKey = fkFind('ФИО сотрудника', 'фио', 'имя', 'работник', 'name', 'сотрудник');
          const numKey = fkFind('табел', 'номер', 'id', 'code', 'код');
          const divKey = fkFind('подразделение', 'отдел', 'subdivision', 'участок');
          const posKey = fkFind('должность', 'position');
          const compKey = fkFind('Организация', 'компания', 'organization', 'company', 'предприятие');
          const dateKey = fkFind('Дата/время', 'дата', 'date', 'прохождение');
          const dopuskKey = fkFind('Допуск', 'допуск');
          const resultKey = fkFind('Результат осмотра', 'результат', 'result', 'статус');
          const groupKey = fkFind('Группа МО', 'группа');

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
          let examDatetimeLocal: string | null = null;
          const rawDate = r[dateKey];
          // Используем локальное время браузера (не UTC), чтобы 31.03 19:19 UTC = 01.04 04:19 по Якутскому времени (+9)
          const toLocalDateStr = (d: Date) => {
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const s = String(d.getSeconds()).padStart(2, '0');
            return { date: `${y}-${mo}-${day}`, datetime: `${y}-${mo}-${day}T${h}:${min}:${s}` };
          };
          if (rawDate instanceof Date) {
            const { date, datetime } = toLocalDateStr(rawDate);
            examDate = date;
            examDatetimeLocal = datetime;
          } else if (typeof rawDate === 'string' && rawDate.trim()) {
            const parsed = new Date(rawDate.trim());
            if (!isNaN(parsed.getTime())) {
              const { date, datetime } = toLocalDateStr(parsed);
              examDate = date;
              examDatetimeLocal = datetime;
            } else {
              examDate = rawDate.trim().split('T')[0];
              examDatetimeLocal = rawDate.trim();
            }
          }

          const extraObj = { ...r, group_mo: String(r[groupKey] || '') };
          if (examDatetimeLocal) extraObj['Дата/время'] = examDatetimeLocal;

          return {
            fio: String(r[fioKey] || ''),
            worker_number: String(r[numKey] || ''),
            subdivision: String(r[divKey] || ''),
            position: String(r[posKey] || ''),
            company: String(r[compKey] || ''),
            exam_date: examDate,
            exam_result: examResult,
            reject_reason: examResult === 'not_admitted' ? resultOsmotra : '',
            exam_type: examType,
            extra: extraObj
          };
        };

        // Читаем все детальные вкладки (пропускаем "Общий" и неизвестные)
        const allRecords: ReturnType<typeof parseEsmoRow>[] = [];
        const sheetStatsList: { label: string; count: number }[] = [];

        for (const sheetName of wb.SheetNames) {
          const normalized = sheetName.trim().toLowerCase();
          const examType = SHEET_TYPE_MAP[normalized];
          if (!examType) continue;

          const sheetData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
            wb.Sheets[sheetName], { defval: '' }
          );
          if (sheetData.length === 0) continue;
          const sheetKeys = Object.keys(sheetData[0]);
          let sheetCount = 0;
          for (const row of sheetData) {
            const rec = parseEsmoRow(row, sheetKeys, examType);
            if (rec.fio.trim()) { allRecords.push(rec); sheetCount++; }
          }
          sheetStatsList.push({ label: sheetName, count: sheetCount });
        }

        // Если не нашли ни одной детальной вкладки — читаем первую без типа
        if (allRecords.length === 0) {
          const sheetData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
            wb.Sheets[wb.SheetNames[0]], { defval: '' }
          );
          const sheetKeys = sheetData.length > 0 ? Object.keys(sheetData[0]) : [];
          let sheetCount = 0;
          for (const row of sheetData) {
            const rec = parseEsmoRow(row, sheetKeys, 'general');
            if (rec.fio.trim()) { allRecords.push(rec); sheetCount++; }
          }
          sheetStatsList.push({ label: wb.SheetNames[0], count: sheetCount });
        }

        const records = allRecords;
        setUploadSheetStats(sheetStatsList);

        // Определяем период файла по данным
        const datesInFile = records.map(r => r.exam_date).filter(Boolean).sort() as string[];
        const periodFrom = datesInFile[0] || null;
        const periodTo = datesInFile[datesInFile.length - 1] || null;

        // Батч 2000 строк, последовательно (дедупликация требует порядка)
        const BATCH = 2000;
        const totalBatches = Math.ceil(records.length / BATCH) || 1;
        let totalImported = 0;
        let totalSkipped = 0;
        let completedBatches = 0;
        setUploadProgress(10);

        for (let i = 0; i < records.length; i += BATCH) {
          const batch = records.slice(i, i + BATCH);
          const isLastBatch = i + BATCH >= records.length;
          const res = await apiFetch(API, {
            method: 'POST',
            body: JSON.stringify({
              action: 'import_esmo',
              file_id: fileId,
              records: batch,
              organization_id: orgId,
              is_last_batch: isLastBatch,
              period_from: periodFrom,
              period_to: periodTo,
              total_rows: isLastBatch ? records.length : undefined,
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

  const confirmWorkersUpload = async () => {
    if (!workerPreview) return;
    setWorkerPreviewUploading(true);
    try {
      const file = workerPreview.fileRef!;

      // Применяем значения недостающих полей ко всем строкам
      const globalShift = missingFieldValues['Вахта/Межвахта'] as '-' | 'Вахта' | 'Межвахта' | undefined;
      const finalRows = workerPreview.rows.map(row => ({
        ...row,
        position: row.position || missingFieldValues['Должность'] || '',
        company: row.company || missingFieldValues['Компания'] || '',
        subdivision: row.subdivision || missingFieldValues['Подразделение'] || workerPreview.fileSubdivision || '',
        shift_type: (row.shift_type === '-' && globalShift && globalShift !== '-') ? globalShift : row.shift_type,
      }));

      const saveRes = await apiFetch(API, {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_file',
          file_type: 'workers',
          file_name: file.name,
          file_url: '',
          file_size: file.size,
          rows_count: finalRows.length,
          uploaded_by: userId,
          organization_id: orgId
        })
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error);
      const fileId = saveData.file_id;

      const importRes = await apiFetch(API, {
        method: 'POST',
        body: JSON.stringify({ action: 'import_workers', file_id: fileId, workers: finalRows, organization_id: orgId })
      });
      const importData = await importRes.json();

      // Обновляем статистику по подразделениям
      const effectiveOrgForStats = localStorage.getItem('zdravpunkt_contractor_org_id') || orgId;
      apiFetch(`${API}?action=workers_sub_stats&organization_id=${effectiveOrgForStats}`)
        .then(r => r.json()).then(d => { if (d.success) setWorkerSubStats(d.stats || []); }).catch(() => {});

      if (workerPreview.rows.length > 0) {
        const added = importData?.added ?? 0;
        const updated = importData?.updated ?? 0;
        toast.success(`Список работников обновлён — добавлено: ${added}, обновлено: ${updated}`);
      } else {
        toast.success(`Шаблон формы "${file.name}" зафиксирован`);
      }
      setWorkerPreview(null);
      setMissingFieldValues({});
      loadAll();
    } catch (err: unknown) {
      toast.error(`Ошибка: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setWorkerPreviewUploading(false);
    }
  };

  // ── Удаление конкретного файла вместе с его данными ─────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{fileId: number; fileName: string; rows: number} | null>(null);

  const archiveFile = async (fileId: number, fileName: string, rows: number) => {
    setDeleteConfirm({ fileId, fileName, rows });
  };

  const confirmDeleteFile = async () => {
    if (!deleteConfirm) return;
    const res = await apiFetch(API, {
      method: 'POST',
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

  // Закрытие мультиселектов при клике снаружи
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (msSubRef.current && !msSubRef.current.contains(e.target as Node)) setMsSubOpen(false);
      if (msCompRef.current && !msCompRef.current.contains(e.target as Node)) setMsCompOpen(false);
      if (msResRef.current && !msResRef.current.contains(e.target as Node)) setMsResOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleItem = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  // ── Отчёт ───────────────────────────────────────────────────────────────
  const buildReport = async (page = 0) => {
    setReportLoading(true);
    setReportPage(page);
    try {
      const effectiveOrgId = localStorage.getItem('zdravpunkt_contractor_org_id') || orgId;
      const p = new URLSearchParams({ action: 'report', limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (effectiveOrgId) p.set('organization_id', effectiveOrgId);
      if (dateFrom) p.set('date_from', dateFrom);
      if (dateTo) p.set('date_to', dateTo);
      if (filterSubdivisions.length > 0) p.set('subdivision', filterSubdivisions.join('||'));
      if (filterCompanies.length > 0) p.set('company', filterCompanies.join('||'));
      if (filterFio) p.set('fio', filterFio);
      if (filterResults.length > 0) p.set('exam_result', filterResults.join(','));
      if (filterExamTypes.length > 0) p.set('exam_type', filterExamTypes.join(','));

      const res = await apiFetch(`${API}?${p.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setReportRecords(data.records);
        setContractorReportList(data.contractor_records_list || []);
        setReportStats({ total: data.total, admitted: data.admitted, not_admitted: data.not_admitted, evaded: data.evaded, unique_workers: data.unique_workers ?? 0, unique_workers_esmo: data.unique_workers_esmo ?? 0, total_esmo: data.total_esmo ?? 0, contractor_workers: data.contractor_workers ?? 0, unique_not_admitted: data.unique_not_admitted ?? 0, unique_evaded: data.unique_evaded ?? 0 });
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
  const examTypeLabel: Record<string, string> = {
    pre_shift: 'Предсменный', post_shift: 'Послесменный',
    pre_trip: 'Предрейсовый', post_trip: 'Послерейсовый',
  };

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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Отчёт ЭСМО');
    if (contractorReportList.length > 0) {
      const contrRows = contractorReportList.map(cr => ({
        'Дата': cr.record_date ? new Date(cr.record_date + 'T00:00:00').toLocaleDateString('ru') : '',
        'Наименование компании': cr.company_name,
        'Тип осмотра': examTypeLabel[cr.exam_type] || cr.exam_type,
        'Кол-во работников': cr.workers_count,
        'Допуск': cr.admission === 'admitted' ? 'Допущен' : cr.admission === 'not_admitted' ? 'Не допущен' : 'Уклонился',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contrRows), 'Подрядчики');
    }
    const orgPart = filterCompanies.length > 0 ? `_${filterCompanies.join('_')}` : '';
    const periodPart = dateFrom || dateTo ? `_${[dateFrom, dateTo].filter(Boolean).join('-')}` : '';
    const safeName = `Отчёт_ЭСМО${orgPart}${periodPart}`.replace(/[\\/:*?"<>|]/g, '_').slice(0, 100);
    XLSX.writeFile(wb, `${safeName}.xlsx`);
  };

  // ── Очистка всей БД Здравпункта ─────────────────────────────────────────
  const clearAll = async () => {
    setClearing(true);
    setShowClearConfirm(false);
    try {
      const res = await apiFetch(API, {
        method: 'POST',
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
      const res = await apiFetch(`${API}?${p.toString()}`);
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

  const workerFiles = files.filter(f => f.file_type === 'workers' || f.file_type === 'workers_list');
  const esmoFiles = files.filter(f => f.file_type === 'esmo');

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Предпросмотр списка работников */}
      {workerPreview && (() => {
        // Группируем по подразделению
        const grouped: { subdivision: string; rows: { row: WorkerPreviewRow; idx: number }[] }[] = [];
        workerPreview.rows.forEach((row, idx) => {
          const sub = row.subdivision || '—';
          let g = grouped.find(g => g.subdivision === sub);
          if (!g) { g = { subdivision: sub, rows: [] }; grouped.push(g); }
          g.rows.push({ row, idx });
        });

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col">
            <div className="flex flex-col gap-3 px-6 py-4 border-b border-slate-700 bg-slate-900 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-lg">
                    <Icon name="Users" size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold">Предпросмотр списка работников</h2>
                    <p className="text-slate-400 text-xs">
                      {workerPreview.fileName} · {workerPreview.rows.length > 0 ? `${workerPreview.rows.length} чел.` : 'пустой шаблон'} · {grouped.length} подразделений — скорректируйте «Вахта/Межвахта»
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setWorkerPreview(null); setMissingFieldValues({}); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition">
                    Отмена
                  </button>
                  <button onClick={confirmWorkersUpload} disabled={workerPreviewUploading}
                    className="px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 flex items-center gap-2">
                    {workerPreviewUploading
                      ? <><Icon name="Loader" size={15} className="animate-spin" />Загружаю...</>
                      : <><Icon name="Upload" size={15} />{workerPreview.rows.length > 0 ? `Загрузить ${workerPreview.rows.length} чел.` : 'Зафиксировать шаблон'}</>}
                  </button>
                </div>
              </div>
              {/* Распознанные колонки */}
              <div className="flex flex-wrap gap-2">
                {workerPreview.columnMap.map(c => (
                  <div key={c.field} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${c.found ? 'bg-teal-900/40 border-teal-700/50 text-teal-300' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                    <Icon name={c.found ? 'Check' : 'AlertCircle'} size={11} />
                    <span className="font-medium">{c.field}</span>
                    {c.found && <span className="text-teal-500/70">← «{c.col}»</span>}
                  </div>
                ))}
              </div>

              {/* Запрос недостающих данных */}
              {workerPreview.missingFields.length > 0 && (
                <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3">
                  <p className="text-amber-300 text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Icon name="AlertTriangle" size={13} /> Не найдены колонки — укажи значения для всего списка:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {workerPreview.missingFields.map(field => (
                      <div key={field} className="flex flex-col gap-1">
                        <label className="text-xs text-amber-400">{field}</label>
                        {field === 'Вахта/Межвахта' ? (
                          <select
                            value={missingFieldValues[field] || ''}
                            onChange={e => {
                              const val = e.target.value as '-' | 'Вахта' | 'Межвахта';
                              setMissingFieldValues(prev => ({ ...prev, [field]: val }));
                              // Применяем ко всем строкам у которых shift_type = '-'
                              if (val !== '-' && workerPreview) {
                                const updated = workerPreview.rows.map(r =>
                                  r.shift_type === '-' ? { ...r, shift_type: val } : r
                                );
                                const shiftOrder: Record<string, number> = { 'Вахта': 0, 'Межвахта': 1, '-': 2 };
                                updated.sort((a, b) => {
                                  const sc = (a.subdivision || '').localeCompare(b.subdivision || '', 'ru');
                                  if (sc !== 0) return sc;
                                  return (shiftOrder[a.shift_type] ?? 2) - (shiftOrder[b.shift_type] ?? 2);
                                });
                                setWorkerPreview({ ...workerPreview, rows: updated });
                              }
                            }}
                            className="bg-slate-800 border border-amber-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 min-w-[180px]"
                          >
                            <option value="">— не выбрано —</option>
                            <option value="Вахта">Вахта</option>
                            <option value="Межвахта">Межвахта</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder={`Введи ${field.toLowerCase()}...`}
                            value={missingFieldValues[field] || ''}
                            onChange={e => setMissingFieldValues(prev => ({ ...prev, [field]: e.target.value }))}
                            className="bg-slate-800 border border-amber-700/50 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 min-w-[200px]"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-500 text-xs mt-2">Оставь пустым, если хочешь загрузить без этих данных</p>
                </div>
              )}

              {/* Информация о подразделении из имени файла */}
              {workerPreview.fileSubdivision && (
                <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-xs text-blue-300">
                  <Icon name="Info" size={13} />
                  Подразделение не найдено в колонках — взято из имени файла: <span className="font-semibold text-blue-200">«{workerPreview.fileSubdivision}»</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {workerPreview.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <Icon name="FileCheck" size={48} className="text-teal-500 mb-4 opacity-70" />
                  <p className="text-white font-semibold text-lg mb-1">Шаблон формы распознан</p>
                  <p className="text-slate-400 text-sm">Файл пустой — нажмите «Зафиксировать шаблон» чтобы сохранить,<br/>или «Отмена» чтобы загрузить заполненный список</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-800 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700 w-8">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700">ФИО</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700">Подразделение</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700">Должность</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700">Компания</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700 min-w-[150px]">Вахта/Межвахта</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(group => {
                      const vakhta = group.rows.filter(r => r.row.shift_type === 'Вахта').length;
                      const mezhvakhta = group.rows.filter(r => r.row.shift_type === 'Межвахта').length;
                      const total = group.rows.length;
                      return (
                        <>
                          {/* Строки группы */}
                          {group.rows.map(({ row, idx }) => (
                            <tr key={idx} className="hover:bg-slate-800/40 divide-y divide-slate-800/60">
                              <td className="px-4 py-2 text-slate-500 text-xs border-b border-slate-800/60">{idx + 1}</td>
                              <td className="px-4 py-2 text-white font-medium whitespace-nowrap border-b border-slate-800/60">{row.fio}</td>
                              <td className="px-4 py-2 text-slate-300 text-xs border-b border-slate-800/60">{row.subdivision || missingFieldValues['Подразделение'] || workerPreview.fileSubdivision || '—'}</td>
                              <td className="px-4 py-2 text-slate-300 text-xs border-b border-slate-800/60">{row.position || missingFieldValues['Должность'] || '—'}</td>
                              <td className="px-4 py-2 text-slate-300 text-xs border-b border-slate-800/60">{row.company || missingFieldValues['Компания'] || '—'}</td>
                              <td className="px-4 py-2 border-b border-slate-800/60">
                                <select
                                  value={row.shift_type}
                                  onChange={e => {
                                    const updated = [...workerPreview.rows];
                                    updated[idx] = { ...updated[idx], shift_type: e.target.value as '-' | 'Вахта' | 'Межвахта' };
                                    // пересортировать
                                    const shiftOrder: Record<string, number> = { 'Вахта': 0, 'Межвахта': 1, '-': 2 };
                                    updated.sort((a, b) => {
                                      const sc = (a.subdivision || '').localeCompare(b.subdivision || '', 'ru');
                                      if (sc !== 0) return sc;
                                      return (shiftOrder[a.shift_type] ?? 2) - (shiftOrder[b.shift_type] ?? 2);
                                    });
                                    setWorkerPreview({ ...workerPreview, rows: updated });
                                  }}
                                  className="bg-slate-700 border border-slate-600 text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:border-teal-500"
                                >
                                  <option value="-">—</option>
                                  <option value="Вахта">Вахта</option>
                                  <option value="Межвахта">Межвахта</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                          {/* Блок итогов подразделения */}
                          <tr>
                            <td colSpan={6} className="px-0 py-0">
                              <div className="flex items-center gap-0 bg-slate-800/70 border-t-2 border-b-2 border-teal-700/40 px-4 py-2.5">
                                <div className="flex items-center gap-2 mr-6">
                                  <Icon name="Building2" size={14} className="text-teal-400 shrink-0" />
                                  <span className="text-teal-300 font-semibold text-xs">{group.subdivision}</span>
                                </div>
                                <div className="flex items-center gap-4 ml-auto">
                                  <div className="flex items-center gap-1.5 bg-blue-900/40 border border-blue-700/40 rounded-lg px-3 py-1.5">
                                    <span className="text-slate-400 text-xs">Вахта:</span>
                                    <span className="text-blue-300 font-bold text-sm">{vakhta}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-purple-900/40 border border-purple-700/40 rounded-lg px-3 py-1.5">
                                    <span className="text-slate-400 text-xs">Межвахта:</span>
                                    <span className="text-purple-300 font-bold text-sm">{mezhvakhta}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-slate-700/60 border border-slate-600/40 rounded-lg px-3 py-1.5">
                                    <span className="text-slate-400 text-xs">Всего:</span>
                                    <span className="text-white font-bold text-sm">{total}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })()}

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
            <button
              onClick={() => setActiveTab('contractors')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'contractors' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Подрядчики
            </button>
            <button
              onClick={() => navigate('/zdravpunkt/workers')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600/20 border border-blue-600/40 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 transition"
            >
              <Icon name="Users" size={15} />
              Список работников
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

        {/* Карточки по типам осмотра */}
        {examTypeStats && Object.keys(examTypeStats).length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {([
              { key: 'pre_shift',  label: 'Предсменный',   icon: 'Sunrise',  color: 'from-blue-500 to-indigo-600' },
              { key: 'post_shift', label: 'Послесменный',  icon: 'Sunset',   color: 'from-violet-500 to-purple-600' },
              { key: 'pre_trip',   label: 'Предрейсовый',  icon: 'Car',      color: 'from-orange-500 to-amber-600' },
              { key: 'post_trip',  label: 'Послерейсовый', icon: 'CarFront', color: 'from-pink-500 to-rose-600' },
            ] as const).map(({ key, label, icon, color }) => {
              const s = examTypeStats[key];
              if (!s) return null;
              return (
                <Card
                  key={key}
                  onClick={() => openExamTypeModal(key, label)}
                  className="bg-slate-800/50 border-slate-700 p-4 cursor-pointer hover:border-teal-500/60 hover:bg-slate-700/60 hover:scale-[1.02] transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`bg-gradient-to-br ${color} p-2 rounded-lg group-hover:scale-110 transition-transform`}>
                      <Icon name={icon} size={18} className="text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{label}</div>
                      <div className="text-slate-400 text-xs">{s.total.toLocaleString('ru')} осмотров</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <div className="text-green-400 font-bold text-sm">{s.admitted.toLocaleString('ru')}</div>
                      <div className="text-slate-500 text-xs">допущено</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-bold text-sm">{s.not_admitted.toLocaleString('ru')}</div>
                      <div className="text-slate-500 text-xs">не допущ.</div>
                    </div>
                    <div>
                      <div className="text-yellow-400 font-bold text-sm">{s.evaded.toLocaleString('ru')}</div>
                      <div className="text-slate-500 text-xs">уклон.</div>
                    </div>
                  </div>
                  <div className="text-xs text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 text-center">↗ Открыть список</div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Вкладка Загрузки ── */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
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

                <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
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

                {/* Ссылка на страницу общего списка */}
                {workerFiles.length > 0 && (
                  <button
                    onClick={() => navigate('/zdravpunkt/workers')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-700/40 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 hover:text-blue-300 transition text-sm font-medium"
                  >
                    <Icon name="Users" size={15} />
                    Открыть общий список работников
                  </button>
                )}
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
                    {uploadSheetStats && uploadSheetStats.length > 0 && (
                      <div className="mb-2 space-y-0.5">
                        {uploadSheetStats.map((s, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-400">
                            <span>{s.label}</span>
                            <span className="text-slate-300">{s.count.toLocaleString('ru')}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold text-teal-400 pt-0.5 border-t border-slate-700">
                          <span>Итого</span>
                          <span>{uploadSheetStats.reduce((sum, s) => sum + s.count, 0).toLocaleString('ru')}</span>
                        </div>
                      </div>
                    )}
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

                {/* Статистика по вкладкам после загрузки */}
                {uploadSheetStats && uploadSheetStats.length > 0 && !uploading && (
                  <div className="mb-3 bg-slate-700/40 rounded-lg p-3 border border-teal-700/30">
                    <div className="text-teal-400 text-xs font-semibold mb-2">Прочитано из файла по вкладкам:</div>
                    <div className="space-y-1">
                      {uploadSheetStats.map((s, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-300">{s.label}</span>
                          <span className="text-white font-bold">{s.count.toLocaleString('ru')} записей</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs pt-1 border-t border-slate-600 mt-1">
                        <span className="text-slate-400 font-semibold">Итого</span>
                        <span className="text-teal-400 font-bold">
                          {uploadSheetStats.reduce((sum, s) => sum + s.count, 0).toLocaleString('ru')} записей
                        </span>
                      </div>
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

          {/* ── Карточки подразделений ── */}
          {workerSubStats && workerSubStats.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="Building2" size={16} className="text-teal-400" />
                <h3 className="text-white font-semibold text-sm">Статистика по подразделениям</h3>
                <span className="text-slate-500 text-xs ml-1">· за последние 30 дней по ЭСМО</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {workerSubStats.map(s => {
                  const hasIssues = s.not_admitted > 0 || s.evaded > 0;
                  return (
                    <div key={s.subdivision} className={`rounded-xl border p-4 bg-slate-800/50 transition-all ${hasIssues ? 'border-red-700/40' : 'border-slate-700/60'}`}>
                      {/* Заголовок */}
                      <div className="flex items-start gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${hasIssues ? 'bg-red-900/40' : 'bg-teal-900/40'}`}>
                          <Icon name="Building2" size={13} className={hasIssues ? 'text-red-400' : 'text-teal-400'} />
                        </div>
                        <span className="text-white font-medium text-xs leading-snug">{s.subdivision}</span>
                      </div>
                      {/* Окошки статистики */}
                      <div className="grid grid-cols-5 gap-1.5">
                        <div className="flex flex-col items-center bg-blue-900/30 border border-blue-700/30 rounded-lg px-1 py-2">
                          <span className="text-blue-300 font-bold text-base leading-none">{s.vakhta}</span>
                          <span className="text-blue-400/70 text-[10px] mt-1 text-center leading-tight">Вахта</span>
                        </div>
                        <div className="flex flex-col items-center bg-purple-900/30 border border-purple-700/30 rounded-lg px-1 py-2">
                          <span className="text-purple-300 font-bold text-base leading-none">{s.mezhvakhta}</span>
                          <span className="text-purple-400/70 text-[10px] mt-1 text-center leading-tight">Меж­вахта</span>
                        </div>
                        <div className={`flex flex-col items-center rounded-lg px-1 py-2 border ${s.not_admitted > 0 ? 'bg-red-900/40 border-red-600/50' : 'bg-slate-700/40 border-slate-600/30'}`}>
                          <span className={`font-bold text-base leading-none ${s.not_admitted > 0 ? 'text-red-300' : 'text-slate-400'}`}>{s.not_admitted}</span>
                          <span className={`text-[10px] mt-1 text-center leading-tight ${s.not_admitted > 0 ? 'text-red-400/80' : 'text-slate-500'}`}>Не до­пущ.</span>
                        </div>
                        <div className={`flex flex-col items-center rounded-lg px-1 py-2 border ${s.evaded > 0 ? 'bg-amber-900/40 border-amber-600/50' : 'bg-slate-700/40 border-slate-600/30'}`}>
                          <span className={`font-bold text-base leading-none ${s.evaded > 0 ? 'text-amber-300' : 'text-slate-400'}`}>{s.evaded}</span>
                          <span className={`text-[10px] mt-1 text-center leading-tight ${s.evaded > 0 ? 'text-amber-400/80' : 'text-slate-500'}`}>Уклон.</span>
                        </div>
                        <div className="flex flex-col items-center bg-slate-700/40 border border-slate-600/30 rounded-lg px-1 py-2">
                          <span className="text-white font-bold text-base leading-none">{s.total}</span>
                          <span className="text-slate-400/70 text-[10px] mt-1 text-center leading-tight">Всего</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
              {/* Тип осмотра */}
              <div className="mb-4">
                <label className="text-slate-400 text-xs mb-2 block">Тип осмотра</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: 'pre_shift',  l: 'Предсменный' },
                    { v: 'post_shift', l: 'Послесменный' },
                    { v: 'pre_trip',   l: 'Предрейсовый' },
                    { v: 'post_trip',  l: 'Послерейсовый' },
                  ] as const).map(({ v, l }) => {
                    const active = filterExamTypes.includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => toggleItem(filterExamTypes, v, setFilterExamTypes)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          active
                            ? 'bg-teal-600 border-teal-500 text-white'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {active && '✓ '}{l}
                      </button>
                    );
                  })}
                  {filterExamTypes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterExamTypes([])}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all"
                    >
                      Сбросить
                    </button>
                  )}
                  {filterExamTypes.length === 0 && (
                    <span className="text-slate-500 text-xs self-center ml-1">Все типы</span>
                  )}
                </div>
              </div>

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
                {/* Подразделение — мультиселект */}
                <div className="relative" ref={msSubRef}>
                  <label className="text-slate-400 text-xs mb-1 block">Подразделение</label>
                  <button type="button" onClick={() => setMsSubOpen(o => !o)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 hover:border-slate-500 transition-colors">
                    <span className={filterSubdivisions.length === 0 ? 'text-slate-400' : 'text-white truncate'}>
                      {filterSubdivisions.length === 0 ? 'Все подразделения' : filterSubdivisions.length === 1 ? filterSubdivisions[0] : `Выбрано: ${filterSubdivisions.length}`}
                    </span>
                    <Icon name="ChevronDown" size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${msSubOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {msSubOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                      {filterSubdivisions.length > 0 && (
                        <button type="button" onClick={() => setFilterSubdivisions([])}
                          className="w-full px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700 text-left border-b border-slate-700">
                          Сбросить выбор
                        </button>
                      )}
                      {subdivisions.map(s => (
                        <label key={s} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer">
                          <input type="checkbox" checked={filterSubdivisions.includes(s)}
                            onChange={() => toggleItem(filterSubdivisions, s, setFilterSubdivisions)}
                            className="accent-teal-500 w-4 h-4 flex-shrink-0" />
                          <span className="text-sm text-white truncate">{s}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Подрядчик / компания — мультиселект */}
                <div className="relative" ref={msCompRef}>
                  <label className="text-slate-400 text-xs mb-1 block">Подрядчик / компания</label>
                  <button type="button" onClick={() => setMsCompOpen(o => !o)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 hover:border-slate-500 transition-colors">
                    <span className={filterCompanies.length === 0 ? 'text-slate-400' : 'text-white truncate'}>
                      {filterCompanies.length === 0 ? 'Все компании' : filterCompanies.length === 1 ? filterCompanies[0] : `Выбрано: ${filterCompanies.length}`}
                    </span>
                    <Icon name="ChevronDown" size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${msCompOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {msCompOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                      {filterCompanies.length > 0 && (
                        <button type="button" onClick={() => setFilterCompanies([])}
                          className="w-full px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700 text-left border-b border-slate-700">
                          Сбросить выбор
                        </button>
                      )}
                      {companies.map(c => (
                        <label key={c} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer">
                          <input type="checkbox" checked={filterCompanies.includes(c)}
                            onChange={() => toggleItem(filterCompanies, c, setFilterCompanies)}
                            className="accent-teal-500 w-4 h-4 flex-shrink-0" />
                          <span className="text-sm text-white truncate">{c}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Допуск — мультиселект */}
                <div className="relative" ref={msResRef}>
                  <label className="text-slate-400 text-xs mb-1 block">Допуск</label>
                  <button type="button" onClick={() => setMsResOpen(o => !o)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 hover:border-slate-500 transition-colors">
                    <span className={filterResults.length === 0 ? 'text-slate-400' : 'text-white truncate'}>
                      {filterResults.length === 0 ? 'Все результаты' : filterResults.length === 1
                        ? ({ admitted: 'Разрешен', not_admitted: 'Запрещен', evaded: 'Уклонился' }[filterResults[0]] || filterResults[0])
                        : `Выбрано: ${filterResults.length}`}
                    </span>
                    <Icon name="ChevronDown" size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${msResOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {msResOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl">
                      {filterResults.length > 0 && (
                        <button type="button" onClick={() => setFilterResults([])}
                          className="w-full px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700 text-left border-b border-slate-700">
                          Сбросить выбор
                        </button>
                      )}
                      {[{v:'admitted',l:'Разрешен'},{v:'not_admitted',l:'Запрещен'},{v:'evaded',l:'Уклонился'}].map(({v,l}) => (
                        <label key={v} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer">
                          <input type="checkbox" checked={filterResults.includes(v)}
                            onChange={() => toggleItem(filterResults, v, setFilterResults)}
                            className="accent-teal-500 w-4 h-4 flex-shrink-0" />
                          <span className="text-sm text-white">{l}</span>
                        </label>
                      ))}
                    </div>
                  )}
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
                {/* Главная карточка — уникальных работников — кликабельная */}
                <Card
                  onClick={openUniqueWorkers}
                  className="bg-gradient-to-r from-teal-900/50 to-cyan-900/30 border-teal-600/50 p-5 cursor-pointer hover:border-teal-400/70 hover:scale-[1.01] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-teal-500/20 border border-teal-500/40 p-3 rounded-xl group-hover:scale-110 transition-transform">
                        <Icon name="Users" size={26} className="text-teal-400" />
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">Уникальных работников прошли ЭСМО</div>
                        <div className="text-4xl font-bold text-teal-300 mt-0.5">{reportStats.unique_workers.toLocaleString('ru')}</div>
                        {/* Расшифровка: сколько из них с проблемами */}
                        <div className="flex items-center gap-3 mt-2">
                          {reportStats.unique_not_admitted > 0 && (
                            <span className="flex items-center gap-1 text-red-400 text-xs">
                              <Icon name="XCircle" size={12} />
                              {reportStats.unique_not_admitted} не допущен{reportStats.unique_not_admitted === 1 ? '' : reportStats.unique_not_admitted < 5 ? 'ы' : 'о'}
                            </span>
                          )}
                          {reportStats.unique_evaded > 0 && (
                            <span className="flex items-center gap-1 text-yellow-400 text-xs">
                              <Icon name="AlertCircle" size={12} />
                              {reportStats.unique_evaded} уклонил{reportStats.unique_evaded === 1 ? 'ся' : reportStats.unique_evaded < 5 ? 'ись' : 'ись'}
                            </span>
                          )}
                          {reportStats.unique_not_admitted === 0 && reportStats.unique_evaded === 0 && (
                            <span className="flex items-center gap-1 text-green-400 text-xs">
                              <Icon name="CheckCircle" size={12} />все допущены
                            </span>
                          )}
                        </div>
                        <div className="text-teal-600 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">↗ Открыть полный список за период</div>
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

                {/* Карточка МО прошли — между главной и карточками допуска */}
                <Card className="bg-slate-800/60 border-slate-600/60 p-4">
                  <div className="flex items-stretch gap-0 divide-x divide-slate-600/60">
                    {/* Левая часть — ЭСМО */}
                    <div className="flex-1 flex items-center gap-3 pr-5">
                      <div className="bg-blue-500/15 border border-blue-500/30 p-2.5 rounded-xl shrink-0">
                        <Icon name="Stethoscope" size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs">МО прошли — ЭСМО</div>
                        <div className="text-2xl font-bold text-blue-300 leading-tight">{reportStats.total_esmo.toLocaleString('ru')}</div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          осмотров · {reportStats.unique_workers_esmo.toLocaleString('ru')} уник. ФИО
                        </div>
                      </div>
                    </div>
                    {/* Правая часть — ручной ввод */}
                    <div className="flex-1 flex items-center gap-3 pl-5">
                      <div className="bg-amber-500/15 border border-amber-500/30 p-2.5 rounded-xl shrink-0">
                        <Icon name="Building2" size={20} className="text-amber-400" />
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs">МО прошли — Подрядчики</div>
                        <div className="text-2xl font-bold text-amber-300 leading-tight">{reportStats.contractor_workers.toLocaleString('ru')}</div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          {/* Разбивка по допуску из contractorReportList */}
                          {contractorReportList.length > 0 && (() => {
                            const adm = contractorReportList.filter(r => r.admission === 'admitted').reduce((s, r) => s + (r.workers_count || 0), 0);
                            const notAdm = contractorReportList.filter(r => r.admission === 'not_admitted').reduce((s, r) => s + (r.workers_count || 0), 0);
                            const ev = contractorReportList.filter(r => r.admission === 'evaded').reduce((s, r) => s + (r.workers_count || 0), 0);
                            return (
                              <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                                {adm > 0 && <span className="text-green-400">✓ {adm} доп.</span>}
                                {notAdm > 0 && <span className="text-red-400">✗ {notAdm} запр.</span>}
                                {ev > 0 && <span className="text-yellow-400">⚠ {ev} укл.</span>}
                              </span>
                            );
                          })()}
                          {contractorReportList.length === 0 && 'чел. за период'}
                        </div>
                      </div>
                    </div>
                    {/* Итого */}
                    <div className="flex items-center pl-5 shrink-0">
                      <div className="text-center">
                        <div className="text-slate-500 text-xs mb-1">МО прошли</div>
                        <div className="text-3xl font-bold text-white">{(reportStats.total_esmo + reportStats.contractor_workers).toLocaleString('ru')}</div>
                        <div className="text-slate-500 text-xs mt-0.5">всего</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Детализация по допуску — кликабельные карточки с фильтром периода */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Разрешен', value: reportStats.admitted, color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30', hover: 'hover:border-green-500/60 hover:bg-green-900/30', clickType: 'admitted' as const, unique: null as number | null },
                    { label: 'Запрещен', value: reportStats.not_admitted, color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30', hover: 'hover:border-red-500/60 hover:bg-red-900/30', clickType: 'not_admitted' as const, unique: reportStats.unique_not_admitted },
                    { label: 'Уклонился', value: reportStats.evaded, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/30', hover: 'hover:border-yellow-500/60 hover:bg-yellow-900/30', clickType: 'evaded' as const, unique: reportStats.unique_evaded },
                  ].map((s, i) => (
                    <Card
                      key={i}
                      onClick={() => openQuickReportWithPeriod(s.clickType, s.label)}
                      className={`${s.bg} border p-4 text-center transition-all cursor-pointer ${s.hover} hover:scale-[1.02] group`}
                    >
                      <div className={`text-3xl font-bold ${s.color}`}>{s.value.toLocaleString('ru')}</div>
                      <div className="text-slate-400 text-sm mt-1">{s.label}</div>
                      {reportStats.total > 0 && (
                        <div className="text-slate-600 text-xs mt-0.5">
                          {((s.value / reportStats.total) * 100).toFixed(1)}% от всех записей
                        </div>
                      )}
                      {s.unique != null && s.unique > 0 && (
                        <div className={`text-xs mt-1.5 font-medium ${s.color} opacity-80`}>
                          {s.unique} уник. {s.unique === 1 ? 'чел.' : 'чел.'} из {reportStats.unique_workers}
                        </div>
                      )}
                      <div className="text-slate-500 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        ↗ Открыть список за период
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {reportRecords && (
              <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
                {reportRecords.length === 0 && contractorReportList.length === 0 ? (
                  <div className="text-slate-500 text-center py-12">
                    <Icon name="SearchX" size={36} className="mx-auto mb-3 opacity-40" />
                    Нет данных по выбранным фильтрам
                  </div>
                ) : (
                  <div>
                    {/* Панель экспорта основного отчёта */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/80">
                      <span className="text-slate-400 text-sm">
                        Показано: <span className="text-white font-semibold">{reportRecords.length.toLocaleString('ru')}</span> записей
                      </span>
                      <div className="flex gap-2">
                        <button onClick={exportReport}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700/30 border border-green-600/40 text-green-400 text-xs hover:bg-green-700/50 transition">
                          <Icon name="FileSpreadsheet" size={13} />Excel
                        </button>
                        <button onClick={() => exportQuickPDF(reportRecords, 'Отчёт ЭСМО', contractorReportList.length > 0 ? contractorReportList : undefined)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700/30 border border-red-600/40 text-red-400 text-xs hover:bg-red-700/50 transition">
                          <Icon name="FileText" size={13} />PDF
                        </button>
                        <button onClick={() => {
                          const org = filterCompanies.length === 1 ? filterCompanies[0] : filterCompanies.length > 1 ? filterCompanies.join(', ') : 'Все организации';
                          const period = dateFrom || dateTo ? [dateFrom && `с ${dateFrom}`, dateTo && `по ${dateTo}`].filter(Boolean).join(' ') : 'Весь период';
                          printQuickReport(reportRecords, 'Отчёт ЭСМО', `${org} | ${period}`, contractorReportList.length > 0 ? contractorReportList : undefined);
                        }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700/30 border border-blue-600/40 text-blue-400 text-xs hover:bg-blue-700/50 transition">
                          <Icon name="Printer" size={13} />Печать
                        </button>
                      </div>
                    </div>
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

                  {/* Секция подрядчиков */}
                  {contractorReportList.length > 0 && (() => {
                    const examTypeLabel: Record<string, string> = {
                      pre_shift: 'Предсменный', post_shift: 'Послесменный',
                      pre_trip: 'Предрейсовый', post_trip: 'Послерейсовый',
                    };
                    const admissionLabel: Record<string, { label: string; cls: string; icon: string }> = {
                      admitted: { label: 'Допущен', cls: 'bg-green-900/40 border-green-700/40 text-green-400', icon: 'CheckCircle' },
                      not_admitted: { label: 'Не допущен', cls: 'bg-red-900/40 border-red-700/40 text-red-400', icon: 'XCircle' },
                      evaded: { label: 'Уклонился', cls: 'bg-yellow-900/40 border-yellow-700/40 text-yellow-400', icon: 'AlertCircle' },
                    };
                    return (
                      <div className="border-t-2 border-dashed border-teal-700/50 mt-1">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-900/20 border-b border-teal-700/30">
                          <Icon name="Building2" size={14} className="text-teal-400" />
                          <span className="text-teal-300 text-xs font-semibold">Подрядчики — ручной ввод</span>
                          <span className="ml-auto text-teal-500 text-xs">{contractorReportList.length} строк · {contractorReportList.reduce((s, r) => s + (r.workers_count || 0), 0).toLocaleString('ru')} работников</span>
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-700/30 text-xs">
                            <tr>
                              {['Дата', 'Компания', 'Смена', 'Тип осмотра', 'Кол-во работников', 'Допуск'].map(h => (
                                <th key={h} className="px-4 py-2.5 text-left font-semibold text-teal-300/80 border-b border-slate-600 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/40">
                            {contractorReportList.map((cr, i) => {
                              const adm = admissionLabel[cr.admission] || admissionLabel['admitted'];
                              const shiftLabel = (cr as ContractorRecord).shift === 'night' ? '☾ Ночь' : '☀ День';
                              const shiftCls = (cr as ContractorRecord).shift === 'night' ? 'text-blue-300' : 'text-amber-300';
                              return (
                                <tr key={cr.id ?? i} className="hover:bg-teal-900/10 transition">
                                  <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                                    {cr.record_date ? new Date(cr.record_date + 'T00:00:00').toLocaleDateString('ru') : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-white font-medium">{cr.company_name || '—'}</td>
                                  <td className={`px-4 py-2.5 font-medium text-xs ${shiftCls}`}>{shiftLabel}</td>
                                  <td className="px-4 py-2.5 text-slate-300">{examTypeLabel[cr.exam_type] || cr.exam_type}</td>
                                  <td className="px-4 py-2.5 text-white font-bold">{cr.workers_count.toLocaleString('ru')}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center gap-1.5 border font-semibold px-3 py-1 rounded-full text-xs whitespace-nowrap ${adm.cls}`}>
                                      <Icon name={adm.icon as Parameters<typeof Icon>[0]['name']} size={13} />{adm.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-600">
                              <td colSpan={4} className="px-4 pt-2.5 pb-3 text-slate-400 text-xs">
                                Итого строк: {contractorReportList.length}
                                {' · '}☀ День: {contractorReportList.filter(r => (r as ContractorRecord).shift !== 'night').reduce((s, r) => s + (r.workers_count || 0), 0).toLocaleString('ru')}
                                {' · '}☾ Ночь: {contractorReportList.filter(r => (r as ContractorRecord).shift === 'night').reduce((s, r) => s + (r.workers_count || 0), 0).toLocaleString('ru')}
                              </td>
                              <td className="px-4 pt-2.5 pb-3 text-white font-bold">
                                {contractorReportList.reduce((s, r) => s + (r.workers_count || 0), 0).toLocaleString('ru')}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}

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

        {/* ── Вкладка Подрядчики ── */}
        {activeTab === 'contractors' && (
          <div className="space-y-4">
            {/* Выбор организации для superadmin без привязанной организации */}
            {!orgId && (
              <Card className="bg-slate-800/50 border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <Icon name="Building2" size={16} className="text-teal-400 shrink-0" />
                  <span className="text-slate-300 text-sm font-medium">Организация:</span>
                  {orgList.length > 0 ? (
                    <select
                      value={selectedContractorOrgId}
                      onChange={e => setSelectedContractorOrgId(e.target.value)}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-teal-500"
                    >
                      <option value="">— Выберите организацию —</option>
                      {orgList.map(o => (
                        <option key={o.id} value={String(o.id)}>{o.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-500 text-sm">Загрузка списка организаций...</span>
                  )}
                  {selectedContractorOrgId && orgList.length > 0 && (
                    <span className="text-teal-400 text-xs">
                      {orgList.find(o => String(o.id) === selectedContractorOrgId)?.name}
                    </span>
                  )}
                </div>
              </Card>
            )}

            <Card className="bg-slate-800/50 border-slate-700 p-6">
              {/* Заголовок и кнопки */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Icon name="Building2" size={18} className="text-teal-400" />
                  Ручной ввод — Подрядчик / компания
                </h2>
                <div className="flex gap-2 items-center">
                  {/* Кнопка пролонгации */}
                  <button
                    onClick={() => setShowProlongationPanel(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition ${showProlongationPanel ? 'bg-amber-700/40 border-amber-600/60 text-amber-300' : 'bg-amber-700/20 border-amber-600/30 text-amber-400 hover:bg-amber-700/40'}`}
                    title="Настройки ежедневного автозаполнения"
                  >
                    <Icon name="RefreshCw" size={14} />
                    Пролонгация {prolongations.filter(p => p.is_active).length > 0 && <span className="bg-amber-500 text-black text-xs rounded-full px-1.5 ml-1">{prolongations.filter(p => p.is_active).length}</span>}
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setContractorRecords(prev => [...prev, { record_date: today, company_name: '', workers_count: 0, admission: 'admitted', exam_type: 'pre_shift', shift: 'day', _local: true }]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700/30 border border-teal-600/40 text-teal-400 text-sm hover:bg-teal-700/50 transition"
                  >
                    <Icon name="Plus" size={15} />Добавить строку
                  </button>
                  <button
                    onClick={() => {
                      const toSave = contractorRecords.filter(r => r.company_name.trim() && r.record_date);
                      saveContractorRecords(toSave);
                    }}
                    disabled={contractorSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700/40 border border-green-600/50 text-green-400 text-sm hover:bg-green-700/60 transition disabled:opacity-50"
                  >
                    {contractorSaving ? <><Icon name="Loader" size={15} className="animate-spin" />Сохранение...</> : <><Icon name="Save" size={15} />Сохранить</>}
                  </button>
                </div>
              </div>

              <p className="text-slate-500 text-xs mb-4">Записи включаются в численность при формировании отчётов. Укажите смену (День/Ночь) для каждой строки.</p>

              {/* ── Панель пролонгации ── */}
              {showProlongationPanel && (
                <div className="mb-5 rounded-xl bg-amber-950/30 border border-amber-700/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-amber-300 font-semibold text-sm flex items-center gap-2">
                      <Icon name="RefreshCw" size={14} />
                      Ежедневное автозаполнение (пролонгация)
                    </h3>
                    <button
                      onClick={() => setProlongations(prev => [...prev, { company_name: '', workers_count_day: 0, workers_count_night: 0, admission: 'admitted', exam_type: 'pre_shift', is_active: true, _local: true }])}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-amber-700/30 border border-amber-600/40 text-amber-400 text-xs hover:bg-amber-700/50 transition"
                    >
                      <Icon name="Plus" size={12} />Добавить компанию
                    </button>
                  </div>
                  <p className="text-amber-600/80 text-xs mb-3">Включённые компании автоматически добавляют записи в таблицу каждый день при открытии страницы. Сумма попадает в общий отчёт и статистику.</p>
                  {prolongationLoading ? (
                    <div className="text-amber-500 text-xs text-center py-4"><Icon name="Loader" size={16} className="animate-spin inline mr-1" />Загрузка...</div>
                  ) : prolongations.length === 0 ? (
                    <p className="text-amber-700 text-xs text-center py-4">Нет настроек пролонгации. Нажмите «Добавить компанию».</p>
                  ) : (
                    <div className="space-y-2">
                      {prolongations.map((pl, idx) => (
                        <div key={pl.id ?? `pl-${idx}`} className="flex gap-2 items-center flex-wrap bg-amber-900/20 rounded-lg px-3 py-2">
                          {/* Вкл/выкл — сохраняется сразу */}
                          <button
                            onClick={async () => {
                              const newActive = !pl.is_active;
                              setProlongations(prev => prev.map((p, i) => i === idx ? { ...p, is_active: newActive } : p));
                              if (pl.id) {
                                const effectiveOrgId = selectedContractorOrgId || orgId;
                                await fetch(API, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'save_prolongation', organization_id: effectiveOrgId, id: pl.id, company_name: pl.company_name, workers_count_day: pl.workers_count_day, workers_count_night: pl.workers_count_night, admission: pl.admission, exam_type: pl.exam_type, is_active: newActive })
                                });
                                toast.success(newActive ? 'Пролонгация включена' : 'Пролонгация отключена — данные за прошлые дни сохранены');
                              }
                            }}
                            className={`shrink-0 px-2 py-1 rounded text-xs font-medium border transition ${pl.is_active ? 'bg-green-700/40 border-green-600/60 text-green-300' : 'bg-slate-700/60 border-slate-600/60 text-slate-400'}`}
                          >
                            {pl.is_active ? 'Вкл' : 'Выкл'}
                          </button>
                          {/* Компания */}
                          <input
                            type="text"
                            value={pl.company_name}
                            placeholder="Наименование компании"
                            onChange={e => setProlongations(prev => prev.map((p, i) => i === idx ? { ...p, company_name: e.target.value } : p))}
                            className="flex-1 min-w-[140px] bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
                          />
                          {/* Кол-во день */}
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500 text-xs whitespace-nowrap">☀ День:</span>
                            <input
                              type="number" min={0}
                              value={pl.workers_count_day}
                              onChange={e => setProlongations(prev => prev.map((p, i) => i === idx ? { ...p, workers_count_day: parseInt(e.target.value) || 0 } : p))}
                              className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          {/* Кол-во ночь */}
                          <div className="flex items-center gap-1">
                            <span className="text-blue-400 text-xs whitespace-nowrap">☾ Ночь:</span>
                            <input
                              type="number" min={0}
                              value={pl.workers_count_night}
                              onChange={e => setProlongations(prev => prev.map((p, i) => i === idx ? { ...p, workers_count_night: parseInt(e.target.value) || 0 } : p))}
                              className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          {/* Тип осмотра */}
                          <select
                            value={pl.exam_type}
                            onChange={e => setProlongations(prev => prev.map((p, i) => i === idx ? { ...p, exam_type: e.target.value } : p))}
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                          >
                            <option value="pre_shift">Предсменный</option>
                            <option value="post_shift">Послесменный</option>
                            <option value="pre_trip">Предрейсовый</option>
                            <option value="post_trip">Послерейсовый</option>
                          </select>
                          {/* Допуск */}
                          <select
                            value={pl.admission}
                            onChange={e => setProlongations(prev => prev.map((p, i) => i === idx ? { ...p, admission: e.target.value } : p))}
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                          >
                            <option value="admitted">Допущен</option>
                            <option value="not_admitted">Не допущен</option>
                            <option value="evaded">Уклонился</option>
                          </select>
                          {/* Последнее заполнение */}
                          {pl.last_filled_date && (
                            <span className="text-slate-500 text-xs whitespace-nowrap">заполн. {new Date(pl.last_filled_date).toLocaleDateString('ru')}</span>
                          )}
                          {/* Сохранить */}
                          <button
                            onClick={async () => {
                              const effectiveOrgId = selectedContractorOrgId || orgId;
                              if (!effectiveOrgId) { toast.error('Выберите организацию'); return; }
                              if (!pl.company_name.trim()) { toast.error('Укажите наименование компании'); return; }
                              setProlongationLoading(true);
                              const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_prolongation', organization_id: effectiveOrgId, ...pl }) });
                              const d = await res.json();
                              if (d.success) {
                                setProlongations(prev => prev.map((p, i) => i === idx ? { ...p, id: d.id, _local: false } : p));
                                toast.success('Настройка пролонгации сохранена');
                              } else { toast.error(d.error || 'Ошибка'); }
                              setProlongationLoading(false);
                            }}
                            className="px-2 py-1 rounded bg-amber-700/40 border border-amber-600/50 text-amber-300 text-xs hover:bg-amber-700/60 transition"
                          >
                            <Icon name="Save" size={12} />
                          </button>
                          {/* Удалить */}
                          <button
                            onClick={async () => {
                              if (pl.id) {
                                const effectiveOrgId = selectedContractorOrgId || orgId;
                                await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_prolongation', id: pl.id, organization_id: effectiveOrgId }) });
                              }
                              setProlongations(prev => prev.filter((_, i) => i !== idx));
                              toast.success('Удалено');
                            }}
                            className="p-1 rounded hover:bg-red-900/40 text-red-400 transition"
                            title="Удалить"
                          >
                            <Icon name="Trash2" size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Таблица ручного ввода ── */}
              {contractorLoading ? (
                <div className="text-slate-500 text-sm text-center py-8"><Icon name="Loader" size={24} className="animate-spin mx-auto mb-2" />Загрузка...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-3 w-36">Дата</th>
                        <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-3">Наименование компании</th>
                        <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-2 w-24">Смена</th>
                        <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-3 w-36">Тип осмотра</th>
                        <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-3 w-24">Кол-во</th>
                        <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-3 w-32">Допуск</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {contractorRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-slate-500 text-sm text-center py-10">
                            <Icon name="Building2" size={32} className="mx-auto mb-2 opacity-30" />
                            Нет записей. Нажмите «Добавить строку» чтобы начать.
                          </td>
                        </tr>
                      ) : contractorRecords.map((rec, idx) => (
                        <tr key={rec.id ?? `new-${idx}`} className="group">
                          <td className="py-2 pr-3">
                            <input
                              type="date"
                              value={rec.record_date}
                              onChange={e => setContractorRecords(prev => prev.map((r, i) => i === idx ? { ...r, record_date: e.target.value } : r))}
                              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              value={rec.company_name}
                              placeholder="Наименование компании"
                              onChange={e => setContractorRecords(prev => prev.map((r, i) => i === idx ? { ...r, company_name: e.target.value } : r))}
                              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                            />
                          </td>
                          {/* Кнопки смены День/Ночь */}
                          <td className="py-2 pr-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setContractorRecords(prev => prev.map((r, i) => i === idx ? { ...r, shift: 'day' } : r))}
                                className={`px-2 py-1 rounded text-xs font-medium border transition ${(rec.shift || 'day') === 'day' ? 'bg-amber-500/30 border-amber-500/70 text-amber-300' : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-amber-500/50'}`}
                                title="Дневная смена"
                              >☀</button>
                              <button
                                type="button"
                                onClick={() => setContractorRecords(prev => prev.map((r, i) => i === idx ? { ...r, shift: 'night' } : r))}
                                className={`px-2 py-1 rounded text-xs font-medium border transition ${rec.shift === 'night' ? 'bg-blue-500/30 border-blue-500/70 text-blue-300' : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-blue-500/50'}`}
                                title="Ночная смена"
                              >☾</button>
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <select
                              value={rec.exam_type || 'pre_shift'}
                              onChange={e => setContractorRecords(prev => prev.map((r, i) => i === idx ? { ...r, exam_type: e.target.value } : r))}
                              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500"
                            >
                              <option value="pre_shift">Предсменный</option>
                              <option value="post_shift">Послесменный</option>
                              <option value="pre_trip">Предрейсовый</option>
                              <option value="post_trip">Послерейсовый</option>
                            </select>
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={0}
                              value={rec.workers_count}
                              onChange={e => setContractorRecords(prev => prev.map((r, i) => i === idx ? { ...r, workers_count: parseInt(e.target.value) || 0 } : r))}
                              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <select
                              value={rec.admission}
                              onChange={e => setContractorRecords(prev => prev.map((r, i) => i === idx ? { ...r, admission: e.target.value } : r))}
                              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500"
                            >
                              <option value="admitted">Допущен</option>
                              <option value="not_admitted">Не допущен</option>
                              <option value="evaded">Уклонился</option>
                            </select>
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => {
                                if (rec.id) {
                                  deleteContractorRecord(rec.id);
                                } else {
                                  setContractorRecords(prev => prev.filter((_, i) => i !== idx));
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-900/40 text-red-400"
                              title="Удалить строку"
                            >
                              <Icon name="Trash2" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {contractorRecords.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-slate-600">
                          <td colSpan={4} className="pt-3 text-slate-400 text-xs">
                            Итого строк: {contractorRecords.length}
                            {' '}· ☀ День: {contractorRecords.filter(r => (r.shift || 'day') === 'day').reduce((s, r) => s + (r.workers_count || 0), 0).toLocaleString('ru')}
                            {' '}· ☾ Ночь: {contractorRecords.filter(r => r.shift === 'night').reduce((s, r) => s + (r.workers_count || 0), 0).toLocaleString('ru')}
                          </td>
                          <td className="pt-3 text-white font-bold text-sm">
                            {contractorRecords.reduce((s, r) => s + (r.workers_count || 0), 0).toLocaleString('ru')}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* ── Список уникальных работников ── */}
      {uniqueModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="bg-teal-900/50 p-2.5 rounded-xl">
                  <Icon name="Users" size={22} className="text-teal-400" />
                </div>
                <div>
                  <h2 className="text-white text-lg font-bold">{uniqueModal.title}</h2>
                  {!uniqueModal.loading && <p className="text-slate-400 text-sm">{uniqueModal.workers.length} уникальных работников</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!uniqueModal.loading && uniqueModal.workers.length > 0 && (<>
                  <button onClick={() => exportUniqueExcel(uniqueModal.workers, uniqueModal.title)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-700/30 border border-green-600/40 text-green-400 text-sm hover:bg-green-700/50 transition">
                    <Icon name="FileSpreadsheet" size={15} />Excel
                  </button>
                  <button onClick={() => exportUniquePDF(uniqueModal.workers, uniqueModal.title)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-700/30 border border-red-600/40 text-red-400 text-sm hover:bg-red-700/50 transition">
                    <Icon name="FileText" size={15} />PDF
                  </button>
                  <button onClick={() => printUniqueWorkers(uniqueModal.workers, uniqueModal.title)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700/30 border border-blue-600/40 text-blue-400 text-sm hover:bg-blue-700/50 transition">
                    <Icon name="Printer" size={15} />Печать
                  </button>
                </>)}
                <button onClick={() => setUniqueModal(null)} className="text-slate-400 hover:text-white transition ml-1">
                  <Icon name="X" size={22} />
                </button>
              </div>
            </div>
            <div className="p-6">
              {uniqueModal.loading ? (
                <div className="text-center py-16 text-slate-400">
                  <Icon name="Loader" size={36} className="animate-spin mx-auto mb-3 text-teal-400" />
                  <p>Загружаю список работников...</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700 max-h-[65vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr>
                        {['#','ФИО','Организация','Подразделение','Осмотров','Период','Статус'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-amber-300 bg-slate-800 border-b border-slate-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {uniqueModal.workers.map((w, i) => (
                        <tr key={i}
                          onClick={() => { setUniqueModal(null); openWorker(w.fio); }}
                          className={`transition cursor-pointer hover:bg-teal-900/20 group ${w.has_not_admitted ? 'bg-red-900/5' : w.has_evaded ? 'bg-yellow-900/5' : ''}`}>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-white font-medium text-xs group-hover:text-teal-300 transition flex items-center gap-1.5">
                              {w.fio}
                              <Icon name="ExternalLink" size={11} className="opacity-0 group-hover:opacity-60 transition" />
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">{w.company || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">{w.subdivision || '—'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="bg-slate-700/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">{w.total_exams}</span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                            {w.first_date ? new Date(w.first_date).toLocaleDateString('ru') : '—'}
                            {w.first_date !== w.last_date && w.last_date ? ` — ${new Date(w.last_date).toLocaleDateString('ru')}` : ''}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1 flex-wrap">
                              {w.has_not_admitted && (
                                <span className="inline-flex items-center gap-1 bg-red-900/40 border border-red-700/40 text-red-400 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap">
                                  <Icon name="XCircle" size={11} />Запрещён
                                </span>
                              )}
                              {w.has_evaded && (
                                <span className="inline-flex items-center gap-1 bg-yellow-900/40 border border-yellow-700/40 text-yellow-400 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap">
                                  <Icon name="AlertCircle" size={11} />Уклонился
                                </span>
                              )}
                              {!w.has_not_admitted && !w.has_evaded && (
                                <span className="inline-flex items-center gap-1 bg-green-900/40 border border-green-700/40 text-green-400 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap">
                                  <Icon name="CheckCircle" size={11} />Без нарушений
                                </span>
                              )}
                            </div>
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

      {/* ── Быстрый отчёт из окошек статистики ── */}
      {quickReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl">

            {/* Шапка */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${quickReport.type === 'not_admitted' ? 'bg-red-900/50' : quickReport.type === 'evaded' ? 'bg-yellow-900/50' : quickReport.type === 'admitted' ? 'bg-green-900/50' : 'bg-purple-900/50'}`}>
                  <Icon name={quickReport.type === 'not_admitted' ? 'XCircle' : quickReport.type === 'evaded' ? 'AlertCircle' : quickReport.type === 'admitted' ? 'CheckCircle' : 'ClipboardList'} size={22}
                    className={quickReport.type === 'not_admitted' ? 'text-red-400' : quickReport.type === 'evaded' ? 'text-yellow-400' : quickReport.type === 'admitted' ? 'text-green-400' : 'text-purple-400'} />
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

            {/* Вкладки — только для не_допущен и уклонился */}
            {!quickReport.loading && quickReport.records.length > 0 && quickReport.type !== 'all_esmo' && (
              <div className="flex gap-1 px-6 pt-4">
                {([
                  { key: 'list', label: 'Список', icon: 'List' },
                  { key: 'by_subdivision', label: 'По подразделениям', icon: 'Building2' },
                  { key: 'by_company', label: 'По компаниям', icon: 'Briefcase' },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setQuickTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${quickTab === t.key ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
                    <Icon name={t.icon} size={14} />{t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Содержимое */}
            <div className="p-6">
              {quickReport.loading ? (
                <div className="text-center py-16 text-slate-400">
                  <Icon name="Loader" size={36} className="animate-spin mx-auto mb-3 text-teal-400" />
                  <p>Загружаю данные...</p>
                </div>
              ) : quickReport.records.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Icon name={quickReport.type === 'evaded' ? 'UserCheck' : 'CheckCircle'} size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-lg">
                    {quickReport.type === 'evaded' ? 'Уклонившихся нет' : quickReport.type === 'not_admitted' ? 'Запрещённых нет' : 'Записей нет'}
                  </p>
                  <p className="text-sm mt-1 opacity-60">за выбранный период</p>
                </div>
              ) : quickTab === 'list' ? (
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
                            {r.exam_result === 'not_admitted' ? (
                              <span className="inline-flex items-center gap-1 bg-red-900/40 border border-red-700/40 text-red-400 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap"><Icon name="XCircle" size={11} />Запрещен</span>
                            ) : r.exam_result === 'evaded' ? (
                              <span className="inline-flex items-center gap-1 bg-yellow-900/40 border border-yellow-700/40 text-yellow-400 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap"><Icon name="AlertCircle" size={11} />Уклонился</span>
                            ) : r.exam_result === 'admitted' ? (
                              <span className="inline-flex items-center gap-1 bg-green-900/40 border border-green-700/40 text-green-400 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap"><Icon name="CheckCircle" size={11} />Разрешен</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-blue-900/30 border border-blue-700/40 text-blue-300 font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap"><Icon name="Stethoscope" size={11} />Допуск дан медработником</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (() => {
                // Группировка
                const groupKey = quickTab === 'by_subdivision' ? 'subdivision' : 'company';
                const groupLabel = quickTab === 'by_subdivision' ? 'Подразделение' : 'Компания / Подрядчик';
                const grouped = quickReport.records.reduce((acc, r) => {
                  const key = r[groupKey] || '— не указано —';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(r);
                  return acc;
                }, {} as Record<string, ReportRecord[]>);

                const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
                const total = quickReport.records.length;

                return (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {/* Кнопки экспорта для группированного вида */}
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => exportGroupedPDF(quickReport.records, quickReport.title, groupKey as 'subdivision' | 'company')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700/30 border border-red-600/40 text-red-400 text-xs hover:bg-red-700/50 transition">
                        <Icon name="FileText" size={13} />PDF сводки
                      </button>
                      <button onClick={() => printGroupedReport(quickReport.records, quickReport.title, groupKey as 'subdivision' | 'company')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700/30 border border-blue-600/40 text-blue-400 text-xs hover:bg-blue-700/50 transition">
                        <Icon name="Printer" size={13} />Печать сводки
                      </button>
                    </div>
                    {/* Топ-сводка */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-white">{sorted.length}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{quickTab === 'by_subdivision' ? 'Подразделений' : 'Компаний'}</div>
                      </div>
                      <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-white">{total}</div>
                        <div className="text-slate-400 text-xs mt-0.5">Всего записей</div>
                      </div>
                      <div className="bg-slate-800/60 rounded-xl p-3 text-center col-span-2">
                        <div className="text-lg font-bold text-white truncate">{sorted[0]?.[0] || '—'}</div>
                        <div className="text-slate-400 text-xs mt-0.5">Больше всего ({sorted[0]?.[1].length || 0} чел.)</div>
                      </div>
                    </div>

                    {/* Список групп */}
                    {sorted.map(([name, recs]) => (
                      <div key={name} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                        {/* Заголовок группы */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-700/40 border-b border-slate-700">
                          <div className="flex items-center gap-2">
                            <Icon name={quickTab === 'by_subdivision' ? 'Building2' : 'Briefcase'} size={14} className="text-teal-400 shrink-0" />
                            <span className="text-white font-semibold text-sm">{name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${quickReport.type === 'not_admitted' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                              {recs.length} {recs.length === 1 ? 'запись' : recs.length < 5 ? 'записи' : 'записей'}
                            </span>
                            <span className="text-slate-500 text-xs">{((recs.length / total) * 100).toFixed(1)}%</span>
                            {/* Мини прогресс-бар */}
                            <div className="w-16 bg-slate-600 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${quickReport.type === 'not_admitted' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                style={{ width: `${(recs.length / total) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                        {/* Список работников группы */}
                        <div className="divide-y divide-slate-700/30">
                          {recs.map((r, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-slate-700/20 transition">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                                  <Icon name="User" size={12} className="text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white text-xs font-medium">{r.fio}</div>
                                  <div className="text-slate-500 text-xs">
                                    {r.exam_datetime ? new Date(r.exam_datetime).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : r.exam_date || ''}
                                    {quickTab === 'by_subdivision' && r.company ? <span className="ml-2 text-slate-600">· {r.company}</span> : ''}
                                    {quickTab === 'by_company' && r.subdivision ? <span className="ml-2 text-slate-600">· {r.subdivision}</span> : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="text-slate-400 text-xs shrink-0 ml-2">{r.exam_detail || r.reject_reason || ''}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
              <div className="flex justify-between items-center mt-5 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
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
                    <Icon name="FileSpreadsheet" size={15} />Excel
                  </button>
                  {workerModal.records.length > 0 && (<>
                    <button onClick={() => exportWorkerPDF(workerModal.records, workerModal.fio)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700/30 border border-red-600/40 text-red-400 text-sm hover:bg-red-700/50 transition">
                      <Icon name="FileText" size={15} />PDF
                    </button>
                    <button onClick={() => printWorker(workerModal.records, workerModal.fio)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700/30 border border-blue-600/40 text-blue-400 text-sm hover:bg-blue-700/50 transition">
                      <Icon name="Printer" size={15} />Печать
                    </button>
                  </>)}
                </div>
                <button onClick={() => setWorkerModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition">
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно по типу осмотра */}
      {examTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div>
                <h2 className="text-white font-bold text-lg">{examTypeModal.label} — список осмотров</h2>
                <p className="text-slate-400 text-sm">{examTypeModal.total.toLocaleString('ru')} записей</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={printExamTypeModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition"
                >
                  <Icon name="Printer" size={14} />Печать
                </button>
                <button
                  onClick={exportExamTypeExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-sm transition"
                >
                  <Icon name="Download" size={14} />Excel
                </button>
                <button onClick={() => setExamTypeModal(null)} className="text-slate-400 hover:text-white transition ml-1">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>
            <div className="overflow-auto flex-1">
              {examTypeModalLoading ? (
                <div className="flex items-center justify-center h-40 text-slate-400">
                  <Icon name="Loader" size={24} className="animate-spin mr-2" />Загрузка...
                </div>
              ) : examTypeModal.records.length === 0 ? (
                <div className="text-center text-slate-500 py-16">Нет данных</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 z-10">
                    <tr>
                      <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3">#</th>
                      <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3">ФИО</th>
                      <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3">Подразделение</th>
                      <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3">Организация</th>
                      <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3">Дата</th>
                      <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3">Результат</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examTypeModal.records.map((r, i) => (
                      <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 text-white text-xs font-medium">{r.fio}</td>
                        <td className="px-4 py-2.5 text-slate-300 text-xs">{r.subdivision || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-300 text-xs">{r.company || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">{r.exam_date ? formatDate(r.exam_date) : '—'}</td>
                        <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                          {r.exam_result === 'admitted' && <span className="text-green-400 font-semibold">Допущен</span>}
                          {r.exam_result === 'not_admitted' && <span className="text-red-400 font-semibold">Не допущен</span>}
                          {r.exam_result === 'evaded' && <span className="text-yellow-400 font-semibold">Уклонился</span>}
                          {!['admitted','not_admitted','evaded'].includes(r.exam_result) && <span className="text-slate-400">{r.exam_result}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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