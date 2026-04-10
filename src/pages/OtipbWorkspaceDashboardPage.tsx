import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const OT_ORDERS_URL = 'https://functions.poehali.dev/64c3f34b-05da-451e-bd8e-fae26e931120';
const SEND_EMAIL_URL = 'https://functions.poehali.dev/2dab48c9-57c0-4f55-90e7-d93b326a6891';

interface OrderDocument {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_at: string | null;
}

interface Order {
  id: number;
  title: string;
  issued_date: string;
  deadline: string;
  responsible_person: string;
  issued_by: string;
  status: 'new' | 'completed' | 'extended';
  extended_deadline: string | null;
  organization_id: number | null;
  assigned_to_user_id: number | null;
  assigned_fio: string | null;
  notes: string | null;
  last_action: string | null;
  updated_at: string | null;
  documents: OrderDocument[];
}

interface Specialist {
  id: number;
  fio: string;
  position: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  completed: 'Выполнено',
  extended: 'Срок продлен',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  completed: 'bg-green-600/20 text-green-300 border-green-500/40',
  extended: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40',
};

const emptyForm = {
  title: '',
  issued_date: new Date().toISOString().slice(0, 10),
  deadline: '',
  responsible_person: '',
  issued_by: '',
  notes: '',
  last_action: '',
  assigned_to_user_id: '' as string | number,
};

const OtipbWorkspaceDashboardPage = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Record<number, string>>({});
  const [editingExtDeadline, setEditingExtDeadline] = useState<Record<number, string>>({});
  const [editingLastAction, setEditingLastAction] = useState<Record<number, string>>({});
  const [transferTarget, setTransferTarget] = useState<Order | null>(null);
  const [transferUserId, setTransferUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState<Record<number, boolean>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<number, File | null>>({});
  const [checklistRecipientEmail, setChecklistRecipientEmail] = useState('');
  const [checklistRecipientFio, setChecklistRecipientFio] = useState('');
  const [checklistRecipientId, setChecklistRecipientId] = useState('');
  const [sendingChecklist, setSendingChecklist] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showWorkReport, setShowWorkReport] = useState(false);
  const [workReportDateFrom, setWorkReportDateFrom] = useState('');
  const [workReportDateTo, setWorkReportDateTo] = useState('');
  const [checklistDateFrom, setChecklistDateFrom] = useState('');
  const [checklistDateTo, setChecklistDateTo] = useState('');
  const [now, setNow] = useState(new Date());

  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const checklistRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const orgId = localStorage.getItem('organizationId') || '';
  const userFio = localStorage.getItem('userFio') || '';
  const userPosition = localStorage.getItem('userPosition') || '';
  const userDepartment = localStorage.getItem('userDepartment') || '';
  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName') || 'Коллега';
    setUserName(storedUserName);

    if (!uid) { navigate('/'); return; }

    const department = localStorage.getItem('userDepartment');
    const access = department === 'ОТиПБ' || department === 'Отдел ОТиПБ';
    setHasAccess(access);

    if (access) loadData(uid);
  }, [navigate]);

  const loadData = async (uid?: string) => {
    setLoading(true);
    try {
      const currentUserId = uid || userId;
      const params = new URLSearchParams();
      if (orgId) params.set('organization_id', orgId);
      if (currentUserId) params.set('user_id', currentUserId);
      const res = await fetch(`${OT_ORDERS_URL}?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setSpecialists(data.specialists);
        const statusMap: Record<number, string> = {};
        const extMap: Record<number, string> = {};
        const actionMap: Record<number, string> = {};
        data.orders.forEach((o: Order) => {
          statusMap[o.id] = o.status;
          extMap[o.id] = o.extended_deadline || '';
          actionMap[o.id] = o.last_action || '';
        });
        setEditingStatus(statusMap);
        setEditingExtDeadline(extMap);
        setEditingLastAction(actionMap);
      }
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.deadline || !form.responsible_person.trim() || !form.issued_by.trim()) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(OT_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          organization_id: orgId ? Number(orgId) : null,
          created_by_user_id: userId ? Number(userId) : null,
          assigned_to_user_id: form.assigned_to_user_id ? Number(form.assigned_to_user_id) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Поручение создано');
        setShowForm(false);
        setForm({ ...emptyForm });
        await loadData();
      } else {
        toast.error(data.error || 'Ошибка создания');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (orderId: number, file: File): Promise<boolean> => {
    setUploadingDoc(prev => ({ ...prev, [orderId]: true }));
    try {
      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const base64 = btoa(binary);
      const res = await fetch(OT_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_document',
          order_id: orderId,
          file_name: file.name,
          file_data: base64,
          file_size: file.size,
          uploaded_by_user_id: userId ? Number(userId) : null,
        }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Ошибка загрузки файла'); return false; }
      return true;
    } catch {
      toast.error('Ошибка загрузки файла');
      return false;
    } finally {
      setUploadingDoc(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleStatusSave = async (order: Order) => {
    const status = editingStatus[order.id];
    const extDeadline = editingExtDeadline[order.id];
    const lastAction = editingLastAction[order.id];
    if (status === 'extended' && !extDeadline) {
      toast.error('Укажите новый срок выполнения');
      return;
    }
    // При статусе "Выполнено" — обязателен подтверждающий документ
    if (status === 'completed' && order.status !== 'completed') {
      const file = pendingFiles[order.id];
      if (!file) {
        toast.error('Для подтверждения выполнения необходимо загрузить документ');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Файл превышает 50 МБ');
        return;
      }
      const uploaded = await uploadDocument(order.id, file);
      if (!uploaded) return;
      setPendingFiles(prev => { const n = { ...prev }; delete n[order.id]; return n; });
    }
    try {
      const res = await fetch(OT_ORDERS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status,
          extended_deadline: status === 'extended' ? extDeadline : null,
          last_action: lastAction || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Статус обновлён');
        await loadData();
      } else {
        toast.error(data.error || 'Ошибка обновления');
      }
    } catch {
      toast.error('Ошибка соединения');
    }
  };

  const handleTransfer = async () => {
    if (!transferTarget || !transferUserId) {
      toast.error('Выберите специалиста');
      return;
    }
    try {
      const spec = specialists.find(s => s.id === Number(transferUserId));
      const res = await fetch(OT_ORDERS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: transferTarget.id,
          assigned_to_user_id: Number(transferUserId),
          responsible_person: spec?.fio || transferTarget.responsible_person,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Поручение передано');
        setTransferTarget(null);
        setTransferUserId('');
        await loadData();
      } else {
        toast.error(data.error || 'Ошибка');
      }
    } catch {
      toast.error('Ошибка соединения');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить поручение?')) return;
    try {
      const res = await fetch(`${OT_ORDERS_URL}?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Поручение удалено');
        await loadData();
      }
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const downloadTable = () => {
    if (!orders.length) return;
    const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const rows = orders.map((o, i) => {
      const statusLabel = STATUS_LABELS[o.status] || o.status;
      const statusColor = o.status === 'completed' ? '#16a34a' : o.status === 'extended' ? '#d97706' : o.status === 'in_progress' ? '#2563eb' : '#dc2626';
      const docsHtml = (o.documents || []).length > 0
        ? (o.documents || []).map(d => `<a href="${d.file_url}" style="display:block;color:#2563eb;font-size:11px;text-decoration:underline;word-break:break-all">${d.file_name}</a>`).join('')
        : '—';
      return `<tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc' : ''}">
        <td style="padding:8px 10px;font-weight:600;vertical-align:top">${i + 1}. ${o.title}</td>
        <td style="padding:8px 10px;vertical-align:top;white-space:nowrap">${o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—'}</td>
        <td style="padding:8px 10px;vertical-align:top;white-space:nowrap">${o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}</td>
        <td style="padding:8px 10px;vertical-align:top">${o.responsible_person || '—'}</td>
        <td style="padding:8px 10px;vertical-align:top">${o.issued_by || '—'}</td>
        <td style="padding:8px 10px;vertical-align:top;color:${statusColor};font-weight:600">${statusLabel}</td>
        <td style="padding:8px 10px;vertical-align:top;font-size:12px;color:#64748b">${o.last_action || '—'}</td>
        <td style="padding:8px 10px;vertical-align:top">${docsHtml}</td>
      </tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/>
      <title>Поручения — ${date}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1e293b}
        h1{font-size:20px;margin:0 0 4px}
        .sub{color:#64748b;font-size:13px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#f97316;color:#fff;padding:9px 10px;text-align:left;font-weight:700}
        td{vertical-align:top}
        @media print{body{padding:10px}}
      </style>
    </head><body>
      <h1>Мои поручения</h1>
      <div class="sub">Сформировано: ${date} · Всего: ${orders.length}</div>
      <table>
        <thead><tr>
          <th>Поручение</th><th>Дата выдачи</th><th>Срок</th>
          <th>Ответственный</th><th>Выдал</th><th>Статус</th><th>Что сделано</th><th>Ссылка на документ</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(html);
    pw.document.close();
    pw.onload = () => setTimeout(() => pw.print(), 300);
  };

  const pendingOrders = orders.filter(o => o.status !== 'completed');
  const countByStatus = (s: string) => orders.filter(o => o.status === s).length;
  const overdueCount = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return orders.filter(o => {
      if (o.status === 'completed') return false;
      const raw = o.extended_deadline || o.deadline;
      if (!raw) return false;
      const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d) < today;
    }).length;
  })();

  // Фильтрация по периоду для чек-листа (невыполненные в диапазоне дат)
  const checklistFilteredOrders = (() => {
    if (!checklistDateFrom && !checklistDateTo) return pendingOrders;
    return pendingOrders.filter(o => {
      const d = o.issued_date ? new Date(o.issued_date) : null;
      if (!d) return true;
      if (checklistDateFrom && d < new Date(checklistDateFrom)) return false;
      if (checklistDateTo && d > new Date(checklistDateTo + 'T23:59:59')) return false;
      return true;
    });
  })();

  // Выполненные поручения для отчёта «Проделанная работа»
  const completedOrders = orders.filter(o => o.status === 'completed');

  const workReportFilteredOrders = (() => {
    if (!workReportDateFrom && !workReportDateTo) return completedOrders;
    return completedOrders.filter(o => {
      const d = o.updated_at ? new Date(o.updated_at) : (o.issued_date ? new Date(o.issued_date) : null);
      if (!d) return true;
      if (workReportDateFrom && d < new Date(workReportDateFrom)) return false;
      if (workReportDateTo && d > new Date(workReportDateTo + 'T23:59:59')) return false;
      return true;
    });
  })();

  const buildWorkReportHtml = () => {
    const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const periodLabel = workReportDateFrom || workReportDateTo
      ? `${workReportDateFrom ? new Date(workReportDateFrom).toLocaleDateString('ru-RU') : '—'} — ${workReportDateTo ? new Date(workReportDateTo).toLocaleDateString('ru-RU') : '—'}`
      : 'Весь период';
    const rows = workReportFilteredOrders.map((o, i) => {
      const docsHtml = (o.documents || []).length > 0
        ? (o.documents || []).map(d => `<a href="${d.file_url}" target="_blank" style="display:block;color:#2563eb;font-size:11px;text-decoration:underline;margin-bottom:2px;word-break:break-all">${d.file_name}</a>`).join('')
        : '<span style="color:#94a3b8;font-size:11px;font-style:italic">—</span>';
      return `<tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc' : ''}">
        <td style="padding:9px 8px;font-weight:600;vertical-align:top">${i + 1}. ${o.title}</td>
        <td style="padding:9px 8px;vertical-align:top;white-space:nowrap">${o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—'}</td>
        <td style="padding:9px 8px;vertical-align:top;white-space:nowrap">${o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}</td>
        <td style="padding:9px 8px;vertical-align:top">${o.responsible_person}</td>
        <td style="padding:9px 8px;vertical-align:top">${o.issued_by}</td>
        <td style="padding:9px 8px;vertical-align:top;background:#f0fdf4;color:#166534;font-style:${o.last_action ? 'normal' : 'italic'}">${o.last_action || '—'}</td>
        <td style="padding:9px 8px;vertical-align:top">${docsHtml}</td>
      </tr>`;
    }).join('');
    return `<div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;padding:20px">
      <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #16a34a;padding-bottom:16px">
        <h1 style="font-size:22px;color:#1e293b;margin:0 0 4px">ПРОДЕЛАННАЯ РАБОТА ЗА ВАХТУ</h1>
        <p style="color:#64748b;margin:0;font-size:14px">Отдел ОТиПБ — Охрана труда и промышленная безопасность</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
        <tr><td style="padding:5px 12px;color:#64748b;width:40%">ФИО:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${userFio || userName}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:5px 12px;color:#64748b">Должность:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${userPosition || '—'}</td></tr>
        <tr><td style="padding:5px 12px;color:#64748b">Подразделение:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${userDepartment}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:5px 12px;color:#64748b">Период вахты:</td><td style="padding:5px 12px;font-weight:600;color:#16a34a">${periodLabel}</td></tr>
        <tr><td style="padding:5px 12px;color:#64748b">Дата формирования:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${now}</td></tr>
      </table>
      <h2 style="font-size:16px;color:#1e293b;margin:20px 0 12px">Выполненные поручения (${workReportFilteredOrders.length})</h2>
      ${workReportFilteredOrders.length === 0
        ? '<p style="color:#64748b;font-style:italic;padding:16px;background:#f8fafc;border-radius:8px">Выполненных поручений за выбранный период не найдено.</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#16a34a;color:#fff">
            <th style="padding:9px 8px;text-align:left">Поручение</th>
            <th style="padding:9px 8px;text-align:left;white-space:nowrap">Дата выдачи</th>
            <th style="padding:9px 8px;text-align:left;white-space:nowrap">Срок</th>
            <th style="padding:9px 8px;text-align:left">Ответственный</th>
            <th style="padding:9px 8px;text-align:left">Выдал</th>
            <th style="padding:9px 8px;text-align:left">Что сделано</th>
            <th style="padding:9px 8px;text-align:left">Ссылка на документ</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`
      }
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
        Документ сформирован автоматически системой ОТиПБ • ${now}
      </div>
    </div>`;
  };

  const buildChecklistHtml = (recipientFio: string, recipientPosition?: string) => {
    const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const periodLabel = checklistDateFrom || checklistDateTo
      ? `${checklistDateFrom ? new Date(checklistDateFrom).toLocaleDateString('ru-RU') : '—'} — ${checklistDateTo ? new Date(checklistDateTo).toLocaleDateString('ru-RU') : '—'}`
      : '';
    const rows = checklistFilteredOrders.map((o, i) => {
      const docsHtml = (o.documents || []).length > 0
        ? (o.documents || []).map(d => `<a href="${d.file_url}" style="display:block;color:#2563eb;font-size:11px;text-decoration:underline;margin-bottom:2px;word-break:break-all">${d.file_name}</a>`).join('')
        : '<span style="color:#94a3b8;font-size:11px;font-style:italic">—</span>';
      return `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:10px 8px;font-weight:600;vertical-align:top">${i + 1}. ${o.title}</td>
        <td style="padding:10px 8px;vertical-align:top;white-space:nowrap">${o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—'}</td>
        <td style="padding:10px 8px;vertical-align:top;white-space:nowrap;color:${o.status === 'extended' ? '#d97706' : '#dc2626'}">
          ${o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}
          ${o.extended_deadline ? `<br><span style="font-size:11px">Продлён до: ${new Date(o.extended_deadline).toLocaleDateString('ru-RU')}</span>` : ''}
        </td>
        <td style="padding:10px 8px;vertical-align:top">${o.responsible_person}</td>
        <td style="padding:10px 8px;vertical-align:top">${o.issued_by}</td>
        <td style="padding:10px 8px;vertical-align:top">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:${o.status === 'new' ? '#dbeafe' : '#fef9c3'};color:${o.status === 'new' ? '#1d4ed8' : '#92400e'}">
            ${STATUS_LABELS[o.status] || o.status}
          </span>
        </td>
        <td style="padding:10px 8px;vertical-align:top;background:#fffbeb;font-style:${o.last_action ? 'normal' : 'italic'};color:${o.last_action ? '#1e293b' : '#94a3b8'}">
          ${o.last_action || 'Не указано'}
        </td>
        <td style="padding:10px 8px;vertical-align:top">${docsHtml}</td>
      </tr>`;
    }).join('');

    return `
      <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px">
        <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #f97316;padding-bottom:16px">
          <h1 style="font-size:22px;color:#1e293b;margin:0 0 4px">ЧЕК-ЛИСТ ПЕРЕДАЧИ ВАХТЫ</h1>
          <p style="color:#64748b;margin:0;font-size:14px">Отдел ОТиПБ — Охрана труда и промышленная безопасность</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
          <tr>
            <td style="padding:6px 12px;color:#64748b;width:40%">ФИО передающего:</td>
            <td style="padding:6px 12px;font-weight:600;color:#1e293b">${userFio || userName}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:6px 12px;color:#64748b">Должность:</td>
            <td style="padding:6px 12px;font-weight:600;color:#1e293b">${userPosition || '—'}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;color:#64748b">Подразделение:</td>
            <td style="padding:6px 12px;font-weight:600;color:#1e293b">${userDepartment}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:6px 12px;color:#64748b">Дата формирования:</td>
            <td style="padding:6px 12px;font-weight:600;color:#1e293b">${date}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;color:#64748b">Кому передаётся:</td>
            <td style="padding:6px 12px;font-weight:600;color:#f97316">${recipientFio || '—'}</td>
          </tr>
        </table>

        ${periodLabel ? `<div style="margin-bottom:12px;padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;font-size:13px;color:#9a3412"><b>Период:</b> ${periodLabel}</div>` : ''}
        <h2 style="font-size:16px;color:#1e293b;margin:20px 0 12px">Невыполненные поручения (${checklistFilteredOrders.length})</h2>
        ${checklistFilteredOrders.length === 0
          ? '<p style="color:#16a34a;font-style:italic">Все поручения выполнены. Передача проходит в штатном режиме.</p>'
          : `<table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0">
                <th style="padding:10px 8px;text-align:left">Поручение</th>
                <th style="padding:10px 8px;text-align:left;white-space:nowrap">Дата выдачи</th>
                <th style="padding:10px 8px;text-align:left;white-space:nowrap">Срок</th>
                <th style="padding:10px 8px;text-align:left">Ответственный</th>
                <th style="padding:10px 8px;text-align:left">Выдал</th>
                <th style="padding:10px 8px;text-align:left">Статус</th>
                <th style="padding:10px 8px;text-align:left;background:#fffbeb">Последнее действие / Что сделано</th>
                <th style="padding:10px 8px;text-align:left">Ссылка на документ</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`
        }
        <div style="margin-top:48px;padding-top:24px;border-top:2px solid #e2e8f0">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr>
              <td style="width:50%;padding:0 24px 0 0;vertical-align:top">
                <p style="font-weight:700;color:#1e293b;margin:0 0 20px">Передал:</p>
                <table style="width:100%;border-collapse:collapse">
                  <tr>
                    <td style="padding:4px 0;color:#64748b;width:36%">ФИО:</td>
                    <td style="padding:4px 0;font-weight:600;color:#1e293b">${userFio || userName}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b">Должность:</td>
                    <td style="padding:4px 0;color:#1e293b">${userPosition || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b">Дата:</td>
                    <td style="padding:4px 0;color:#1e293b">${date}</td>
                  </tr>
                </table>
                <div style="margin-top:32px;border-top:1px solid #94a3b8;width:80%;padding-top:4px;color:#64748b;font-size:11px">подпись</div>
              </td>
              <td style="width:50%;padding:0 0 0 24px;vertical-align:top;border-left:1px solid #e2e8f0">
                <p style="font-weight:700;color:#1e293b;margin:0 0 20px;padding-left:24px">Принял:</p>
                <table style="width:100%;border-collapse:collapse">
                  <tr>
                    <td style="padding:4px 24px;color:#64748b;width:36%">ФИО:</td>
                    <td style="padding:4px 0;font-weight:600;color:${recipientFio ? '#1e293b' : '#94a3b8'}">${recipientFio || '____________________'}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px;color:#64748b">Должность:</td>
                    <td style="padding:4px 0;color:${recipientPosition ? '#1e293b' : '#94a3b8'}">${recipientPosition || '____________________'}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px;color:#64748b">Дата:</td>
                    <td style="padding:4px 0;color:#1e293b">${date}</td>
                  </tr>
                </table>
                <div style="margin-top:32px;margin-left:24px;border-top:1px solid #94a3b8;width:80%;padding-top:4px;color:#64748b;font-size:11px">подпись</div>
              </td>
            </tr>
          </table>
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
            Документ сформирован автоматически системой ОТиПБ • ${date}
          </div>
        </div>
      </div>
    `;
  };

  const fileDate = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');

  const recipientSpec = specialists.find(s => String(s.id) === checklistRecipientId);

  const downloadChecklistHtml = () => {
    const html = buildChecklistHtml(checklistRecipientFio, recipientSpec?.position);
    const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Чек-лист передачи вахты</title>
    <style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}@media print{.no-print{display:none!important}body{padding:0}}</style>
    </head><body>
    <div class="no-print" style="text-align:center;margin-bottom:16px">
      <button onclick="window.print()" style="padding:10px 28px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
        🖨️ Распечатать
      </button>
    </div>
    ${html}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `чек-лист_передачи_вахты_${fileDate}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadModal(false);
    toast.success('HTML-файл скачан');
  };

  const downloadChecklistXlsx = () => {
    const info = [
      ['ЧЕК-ЛИСТ ПЕРЕДАЧИ ВАХТЫ'],
      ['Отдел ОТиПБ — Охрана труда и промышленная безопасность'],
      [],
      ['ФИО передающего:', userFio || userName],
      ['Должность:', userPosition || '—'],
      ['Подразделение:', userDepartment],
      ['Дата формирования:', new Date().toLocaleString('ru-RU')],
      ['Кому передаётся:', checklistRecipientFio || '—'],
      [],
      [`Невыполненных поручений: ${pendingOrders.length}`],
      [],
    ];

    const headers = ['№', 'Наименование поручения', 'Дата выдачи', 'Срок выполнения', 'Ответственный', 'Выдал поручение', 'Статус', 'Последнее действие / На чём остановился'];
    const rows = pendingOrders.map((o, i) => [
      i + 1,
      o.title,
      o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—',
      o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—',
      o.responsible_person,
      o.issued_by,
      STATUS_LABELS[o.status] || o.status,
      o.last_action || 'Не указано',
    ]);

    const wsData = [...info, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 4 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Чек-лист вахты');
    XLSX.writeFile(wb, `чек-лист_передачи_вахты_${fileDate}.xlsx`);
    setShowDownloadModal(false);
    toast.success('Excel-файл скачан');
  };

  const downloadChecklistPdf = async () => {
    setDownloadingFormat('pdf');
    try {
      const html = buildChecklistHtml(checklistRecipientFio, recipientSpec?.position);
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;background:#fff;font-family:Arial,sans-serif;';
      container.innerHTML = html;
      document.body.appendChild(container);

      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(container, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgH = pdfW / ratio;

      let yPos = 0;
      let remainH = imgH;
      while (remainH > 0) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yPos, pdfW, imgH);
        yPos += pdfH;
        remainH -= pdfH;
      }

      pdf.save(`чек-лист_передачи_вахты_${fileDate}.pdf`);
      setShowDownloadModal(false);
      toast.success('PDF-файл скачан');
    } catch {
      toast.error('Ошибка создания PDF');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const sendChecklistEmail = async () => {
    if (!checklistRecipientEmail.trim()) {
      toast.error('Укажите email получателя');
      return;
    }
    setSendingChecklist(true);
    try {
      const checklistBody = buildChecklistHtml(checklistRecipientFio, recipientSpec?.position);
      const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Чек-лист передачи вахты</title>
        <style>
          body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}
          .print-bar{background:#fff3e0;border:2px solid #f97316;border-radius:12px;padding:18px 24px;margin-bottom:24px;text-align:center}
          .print-bar p{margin:0 0 12px;font-size:15px;color:#7c3005;font-weight:600}
          .print-btn{display:inline-block;padding:12px 36px;background:#f97316;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;font-family:Arial,sans-serif;cursor:pointer;border:none}
          @media print{.print-bar{display:none!important}}
        </style>
      </head><body>
        <div class="print-bar">
          <p>📄 Чек-лист передачи вахты — нажмите кнопку для печати</p>
          <button class="print-btn" onclick="window.print()">🖨️&nbsp;&nbsp;Распечатать чек-лист</button>
        </div>
        ${checklistBody}
      </body></html>`;
      const res = await fetch(OT_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_checklist_email',
          to_email: checklistRecipientEmail.trim(),
          subject: `Чек-лист передачи вахты — ${userFio || userName} — ${new Date().toLocaleDateString('ru-RU')}`,
          html_content: html,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Чек-лист отправлен на почту');
      } else {
        toast.error(`Ошибка отправки письма: ${data.error || ''}`);
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSendingChecklist(false);
    }
  };

  const sendChecklistInternal = async () => {
    if (!checklistRecipientId) {
      toast.error('Выберите сменщика из списка');
      return;
    }
    const spec = specialists.find(s => String(s.id) === checklistRecipientId);
    const senderId = userId ? Number(userId) : null;
    if (!senderId) { toast.error('Не определён отправитель'); return; }

    setSendingChecklist(true);
    try {
      const msgText = `📋 Чек-лист передачи вахты от ${userFio || userName}\n\nНевыполненных поручений: ${pendingOrders.length}\nДата: ${new Date().toLocaleDateString('ru-RU')}`;
      const res = await fetch(OT_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_checklist_internal',
          sender_id: senderId,
          receiver_id: Number(checklistRecipientId),
          message: msgText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Чек-лист отправлен коллеге ${spec?.fio || ''}`);
      } else {
        toast.error(`Ошибка внутренней отправки: ${data.error || ''}`);
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSendingChecklist(false);
    }
  };

  if (hasAccess === null) return null;
  if (!hasAccess) { navigate('/otipb-department'); return null; }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
          <Button variant="ghost" onClick={() => navigate('/otipb-department')} className="text-red-400 hover:text-red-300">
            <Icon name="ArrowLeft" size={20} className="mr-2" />Назад
          </Button>
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-slate-400 text-sm">Добро пожаловать, {userName}!</p>
            {/* Часы и дата */}
            <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-600/50 rounded-xl px-4 py-2 shadow-inner select-none">
              <Icon name="Clock" size={15} className="text-orange-400 shrink-0" />
              <div className="text-right leading-tight">
                <div className="text-white font-mono font-bold text-lg leading-none tracking-wide">
                  {now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5 capitalize">
                  {now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="bg-gradient-to-br from-orange-600 to-red-700 p-3 rounded-xl shadow-lg">
            <Icon name="HardHat" size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Отдел ОТиПБ</h1>
            <p className="text-orange-400">Охрана труда и промышленная безопасность</p>
          </div>
        </div>

        {/* Основные блоки */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* Поручения */}
          <Card
            onClick={() => { setShowList(true); setShowChecklist(false); setShowWorkReport(false); }}
            className="bg-slate-800/50 border-orange-600/40 p-6 cursor-pointer hover:border-orange-500 hover:shadow-xl hover:scale-105 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Icon name="ClipboardList" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Мои поручения</p>
                <div className="text-4xl font-bold text-white">{loading ? '...' : orders.length}</div>
                <p className="text-orange-400 text-xs mt-1">Нажмите, чтобы открыть список</p>
              </div>
            </div>
            {!loading && (
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-1 text-xs text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  Новые: {countByStatus('new')}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Выполнено: {countByStatus('completed')}
                </div>
                <div className="flex items-center gap-1 text-xs text-yellow-400">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                  Продлено: {countByStatus('extended')}
                </div>
                {overdueCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
                    Просрочено: {overdueCount}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Чек-лист передачи вахты */}
          <Card
            onClick={() => { setShowChecklist(true); setShowList(false); setShowWorkReport(false); }}
            className="bg-slate-800/50 border-violet-600/40 p-6 cursor-pointer hover:border-violet-500 hover:shadow-xl hover:scale-105 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Icon name="ClipboardCheck" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Чек-лист передачи вахты</p>
                <div className="text-4xl font-bold text-white">{loading ? '...' : pendingOrders.length}</div>
                <p className="text-violet-400 text-xs mt-1">Невыполненных поручений</p>
              </div>
            </div>
            {!loading && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-400">
                  {pendingOrders.length === 0
                    ? '✅ Все поручения выполнены'
                    : `⚠️ ${pendingOrders.length} пункт(ов) требуют передачи`}
                </p>
              </div>
            )}
          </Card>

          {/* Проделанная работа за вахту */}
          <Card
            onClick={() => { setShowWorkReport(true); setShowChecklist(false); setShowList(false); }}
            className="bg-slate-800/50 border-green-600/40 p-6 cursor-pointer hover:border-green-500 hover:shadow-xl hover:scale-105 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Icon name="CheckSquare" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Проделанная работа за вахту</p>
                <div className="text-4xl font-bold text-white">{loading ? '...' : completedOrders.length}</div>
                <p className="text-green-400 text-xs mt-1">Выполненных поручений</p>
              </div>
            </div>
            {!loading && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-400">
                  {completedOrders.length === 0
                    ? 'Нет выполненных поручений'
                    : `✅ ${completedOrders.length} поручений закрыто`}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Список поручений */}
        {showList && (
          <Card className="bg-slate-800/50 border-orange-600/30 p-6">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icon name="ClipboardList" size={22} className="text-orange-400" />
                Мои поручения
              </h2>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={downloadTable} variant="outline"
                  className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10 h-9 text-sm">
                  <Icon name="Printer" size={16} className="mr-1" />Распечатать
                </Button>
                <Button onClick={() => { setShowForm(true); setForm({ ...emptyForm, issued_by: userFio, responsible_person: userFio }); }}
                  className="bg-orange-600 hover:bg-orange-700 h-9">
                  <Icon name="Plus" size={18} className="mr-2" />Новое поручение
                </Button>
                <Button variant="ghost" onClick={() => setShowList(false)} className="text-gray-400 h-9">
                  <Icon name="X" size={20} />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Icon name="Loader2" size={40} className="text-orange-400 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="ClipboardList" size={56} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Поручений пока нет</p>
                <Button onClick={() => { setShowForm(true); setForm({ ...emptyForm, issued_by: userFio, responsible_person: userFio }); }}
                  className="mt-4 bg-orange-600 hover:bg-orange-700">
                  Добавить поручение
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-gray-400">
                      <th className="text-left py-3 px-3 font-medium">Наименование поручения</th>
                      <th className="text-left py-3 px-3 font-medium">Дата выдачи</th>
                      <th className="text-left py-3 px-3 font-medium">Срок</th>
                      <th className="text-left py-3 px-3 font-medium">Ответственный</th>
                      <th className="text-left py-3 px-3 font-medium">Выдал</th>
                      <th className="text-left py-3 px-3 font-medium">Статус / Последнее действие</th>
                      <th className="text-left py-3 px-3 font-medium">Ссылка на документ</th>
                      <th className="text-left py-3 px-3 font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-3 text-white font-medium max-w-[200px]">
                          <div className="break-words">{order.title}</div>
                          {order.notes && <div className="text-xs text-gray-400 mt-1">{order.notes}</div>}
                        </td>
                        <td className="py-3 px-3 text-gray-300 whitespace-nowrap">
                          {order.issued_date ? new Date(order.issued_date).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-300 whitespace-nowrap">
                          {order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : '—'}
                          {order.extended_deadline && (
                            <div className="text-xs text-yellow-400 mt-1">
                              Продлён: {new Date(order.extended_deadline).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-300">{order.responsible_person}</td>
                        <td className="py-3 px-3 text-gray-300">{order.issued_by}</td>
                        <td className="py-3 px-3 min-w-[220px]">
                          <div className="flex flex-col gap-2">
                            <select
                              value={editingStatus[order.id] || order.status}
                              onChange={e => setEditingStatus(prev => ({ ...prev, [order.id]: e.target.value }))}
                              className="bg-slate-700 border border-slate-600 text-white text-xs rounded px-2 py-1"
                            >
                              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                            {editingStatus[order.id] === 'extended' && (
                              <Input
                                type="date"
                                value={editingExtDeadline[order.id] || ''}
                                onChange={e => setEditingExtDeadline(prev => ({ ...prev, [order.id]: e.target.value }))}
                                className="bg-slate-700 border-slate-600 text-white text-xs h-7 px-2"
                              />
                            )}
                            <textarea
                              value={editingLastAction[order.id] || ''}
                              onChange={e => setEditingLastAction(prev => ({ ...prev, [order.id]: e.target.value }))}
                              placeholder="Последнее действие по заданию..."
                              rows={2}
                              className="bg-slate-700/80 border border-orange-500/30 text-white text-xs rounded px-2 py-1 resize-none focus:outline-none focus:border-orange-500"
                            />
                            {editingStatus[order.id] === 'completed' && order.status !== 'completed' && (
                              <div className="flex flex-col gap-1 p-2 bg-green-900/20 border border-green-500/30 rounded">
                                <span className="text-xs text-green-400 font-medium">Подтверждающий документ (обязательно)</span>
                                <input
                                  type="file"
                                  accept="*/*"
                                  onChange={e => {
                                    const f = e.target.files?.[0] || null;
                                    setPendingFiles(prev => ({ ...prev, [order.id]: f }));
                                  }}
                                  className="text-xs text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
                                />
                                {pendingFiles[order.id] && (
                                  <span className="text-xs text-green-400 truncate max-w-[180px]">
                                    {pendingFiles[order.id]!.name}
                                  </span>
                                )}
                              </div>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded border w-fit ${STATUS_COLORS[order.status]}`}>
                              {STATUS_LABELS[order.status]}
                            </span>
                            <Button size="sm" onClick={() => handleStatusSave(order)}
                              disabled={uploadingDoc[order.id]}
                              className="h-6 text-xs bg-orange-600 hover:bg-orange-700 px-2">
                              {uploadingDoc[order.id] ? 'Загрузка...' : 'Сохранить'}
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-3 min-w-[180px]">
                          {(order.documents || []).length === 0 ? (
                            <span className="text-xs text-gray-500 italic">—</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {(order.documents || []).map(doc => (
                                <a
                                  key={doc.id}
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1 max-w-[180px]"
                                >
                                  <Icon name="FileDown" size={12} className="shrink-0" />
                                  <span className="truncate">{doc.file_name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1">
                            <Button size="sm" variant="outline"
                              onClick={() => { setTransferTarget(order); setTransferUserId(''); }}
                              className="h-7 text-xs border-blue-500/40 text-blue-400 hover:bg-blue-500/10">
                              <Icon name="Send" size={12} className="mr-1" />Передать
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => handleDelete(order.id)}
                              className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10">
                              <Icon name="Trash2" size={12} className="mr-1" />Удалить
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Чек-лист передачи вахты */}
        {showChecklist && (
          <Card className="bg-slate-800/50 border-violet-600/30 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icon name="ClipboardCheck" size={22} className="text-violet-400" />
                Чек-лист передачи вахты
              </h2>
              <Button variant="ghost" onClick={() => setShowChecklist(false)} className="text-gray-400">
                <Icon name="X" size={20} />
              </Button>
            </div>

            {/* Период отчётности */}
            <div className="mb-5 p-4 bg-slate-700/30 rounded-xl border border-violet-500/30">
              <p className="text-sm text-violet-300 font-medium mb-3 flex items-center gap-2">
                <Icon name="Calendar" size={16} />
                Период отчётности (необязательно)
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-xs whitespace-nowrap">С:</Label>
                  <Input type="date" value={checklistDateFrom} onChange={e => setChecklistDateFrom(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white text-sm h-8 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-xs whitespace-nowrap">По:</Label>
                  <Input type="date" value={checklistDateTo} onChange={e => setChecklistDateTo(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white text-sm h-8 w-40" />
                </div>
                {(checklistDateFrom || checklistDateTo) && (
                  <Button size="sm" variant="ghost" onClick={() => { setChecklistDateFrom(''); setChecklistDateTo(''); }}
                    className="text-slate-400 hover:text-white h-8 text-xs">
                    <Icon name="X" size={12} className="mr-1" />Сбросить
                  </Button>
                )}
              </div>
              {(checklistDateFrom || checklistDateTo) && (
                <p className="text-xs text-slate-400 mt-2">
                  Показано поручений в периоде: <span className="text-violet-400 font-medium">{checklistFilteredOrders.length}</span> из {pendingOrders.length} невыполненных
                </p>
              )}
            </div>

            {/* Информация о передающем */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/40">
              <div>
                <p className="text-xs text-slate-400 mb-1">ФИО передающего</p>
                <p className="text-white font-medium text-sm">{userFio || userName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Должность</p>
                <p className="text-white font-medium text-sm">{userPosition || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Подразделение</p>
                <p className="text-white font-medium text-sm">{userDepartment}</p>
              </div>
            </div>

            {/* Кому передаётся */}
            <div className="mb-6 space-y-3">
              <div>
                <Label className="text-white mb-2 block text-sm">Кому передаётся вахта</Label>
                {specialists.length > 0 ? (
                  <select
                    value={checklistRecipientId}
                    onChange={e => {
                      const id = e.target.value;
                      setChecklistRecipientId(id);
                      if (id) {
                        const spec = specialists.find(s => String(s.id) === id);
                        if (spec) {
                          setChecklistRecipientFio(spec.fio);
                          setChecklistRecipientEmail(spec.email || '');
                        }
                      } else {
                        setChecklistRecipientFio('');
                        setChecklistRecipientEmail('');
                      }
                    }}
                    className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-violet-500/40 text-white text-sm"
                  >
                    <option value="">— Выберите сменщика из списка —</option>
                    {specialists.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fio}{s.position ? ` — ${s.position}` : ''}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 mb-1 block text-xs">ФИО принимающего</Label>
                  <Input
                    value={checklistRecipientFio}
                    onChange={e => { setChecklistRecipientFio(e.target.value); setChecklistRecipientId(''); }}
                    placeholder="Иванов Иван Иванович"
                    className="bg-slate-700/50 border-slate-600 text-white text-sm"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 mb-1 block text-xs">Email для отправки</Label>
                  <Input
                    value={checklistRecipientEmail}
                    onChange={e => setChecklistRecipientEmail(e.target.value)}
                    placeholder="colleague@company.ru"
                    type="email"
                    className="bg-slate-700/50 border-slate-600 text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Невыполненные поручения */}
            <div className="mb-6">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Icon name="AlertCircle" size={18} className="text-yellow-400" />
                Невыполненные поручения ({checklistFilteredOrders.length})
              </h3>
              {checklistFilteredOrders.length === 0 ? (
                <div className="text-center py-8 bg-green-900/20 border border-green-500/30 rounded-xl">
                  <Icon name="CheckCircle2" size={40} className="mx-auto text-green-400 mb-2" />
                  <p className="text-green-400 font-medium">Все поручения выполнены!</p>
                  <p className="text-slate-400 text-sm mt-1">Передача вахты проходит в штатном режиме</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checklistFilteredOrders.map((o, i) => (
                    <div key={o.id} className="bg-slate-700/40 border border-slate-600/40 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{i + 1}. {o.title}</p>
                          {o.notes && <p className="text-slate-400 text-xs mt-1">{o.notes}</p>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${STATUS_COLORS[o.status]}`}>
                          {STATUS_LABELS[o.status]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-400 mb-2">
                        <span>Срок: <span className="text-yellow-400">{o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}</span></span>
                        <span>Ответственный: {o.responsible_person}</span>
                        <span>Выдал: {o.issued_by}</span>
                      </div>
                      <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                        <p className="text-xs text-orange-400 font-medium mb-1">Последнее действие / На чём остановился:</p>
                        <p className="text-white text-xs">{o.last_action || <span className="text-slate-500 italic">Не указано — заполните в списке поручений</span>}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
              <Button onClick={() => {
                  const html = buildChecklistHtml(checklistRecipientFio, recipientSpec?.position);
                  const w = window.open('', '_blank');
                  if (w) {
                    w.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Чек-лист передачи вахты</title>
                      <style>body{font-family:Arial,sans-serif;margin:0;padding:20px}@media print{.no-print{display:none!important}}</style>
                    </head><body>
                      <div class="no-print" style="text-align:center;margin-bottom:16px">
                        <button onclick="window.print()" style="padding:10px 28px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
                          🖨️ Распечатать
                        </button>
                      </div>
                      ${html}</body></html>`);
                    w.document.close();
                  }
                }} variant="outline"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                <Icon name="Printer" size={16} className="mr-2" />Распечатать
              </Button>
              <Button onClick={() => setShowDownloadModal(true)} variant="outline"
                className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10">
                <Icon name="Download" size={16} className="mr-2" />Скачать
              </Button>
              <Button onClick={sendChecklistEmail} disabled={sendingChecklist}
                className="bg-blue-600 hover:bg-blue-700">
                {sendingChecklist ? <Icon name="Loader2" size={16} className="mr-2 animate-spin" /> : <Icon name="Mail" size={16} className="mr-2" />}
                Отправить на почту
              </Button>
              <Button onClick={sendChecklistInternal}
                disabled={sendingChecklist || !checklistRecipientId}
                className="bg-violet-600 hover:bg-violet-700">
                {sendingChecklist
                  ? <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  : <Icon name="Send" size={16} className="mr-2" />}
                Отправить в системе
              </Button>
            </div>
          </Card>
        )}

        {/* Проделанная работа за вахту */}
        {showWorkReport && (
          <Card className="bg-slate-800/50 border-green-600/30 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icon name="CheckSquare" size={22} className="text-green-400" />
                Проделанная работа за вахту
              </h2>
              <Button variant="ghost" onClick={() => setShowWorkReport(false)} className="text-gray-400">
                <Icon name="X" size={20} />
              </Button>
            </div>

            {/* Информация о сотруднике */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 p-4 bg-slate-700/30 rounded-xl border border-slate-600/40">
              <div>
                <p className="text-xs text-slate-400 mb-1">ФИО</p>
                <p className="text-white font-medium text-sm">{userFio || userName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Должность</p>
                <p className="text-white font-medium text-sm">{userPosition || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Подразделение</p>
                <p className="text-white font-medium text-sm">{userDepartment}</p>
              </div>
            </div>

            {/* Выбор периода */}
            <div className="mb-5 p-4 bg-slate-700/30 rounded-xl border border-green-500/30">
              <p className="text-sm text-green-300 font-medium mb-3 flex items-center gap-2">
                <Icon name="Calendar" size={16} />
                Период вахты
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-xs whitespace-nowrap">С:</Label>
                  <Input type="date" value={workReportDateFrom} onChange={e => setWorkReportDateFrom(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white text-sm h-8 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-xs whitespace-nowrap">По:</Label>
                  <Input type="date" value={workReportDateTo} onChange={e => setWorkReportDateTo(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white text-sm h-8 w-40" />
                </div>
                {(workReportDateFrom || workReportDateTo) && (
                  <Button size="sm" variant="ghost" onClick={() => { setWorkReportDateFrom(''); setWorkReportDateTo(''); }}
                    className="text-slate-400 hover:text-white h-8 text-xs">
                    <Icon name="X" size={12} className="mr-1" />Сбросить
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Показано выполненных: <span className="text-green-400 font-medium">{workReportFilteredOrders.length}</span> из {completedOrders.length}
              </p>
            </div>

            {/* Список выполненных */}
            <div className="mb-6">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Icon name="CheckCircle2" size={18} className="text-green-400" />
                Выполненные поручения ({workReportFilteredOrders.length})
              </h3>
              {workReportFilteredOrders.length === 0 ? (
                <div className="text-center py-8 bg-slate-700/30 border border-slate-600/40 rounded-xl">
                  <Icon name="ClipboardList" size={40} className="mx-auto text-slate-500 mb-2" />
                  <p className="text-slate-400">Нет выполненных поручений за выбранный период</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workReportFilteredOrders.map((o, i) => (
                    <div key={o.id} className="bg-slate-700/40 border border-green-500/20 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-white font-medium text-sm">{i + 1}. {o.title}</p>
                        <span className="text-xs px-2 py-0.5 rounded border shrink-0 bg-green-600/20 text-green-300 border-green-500/40">Выполнено</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-400 mb-2">
                        <span>Дата выдачи: <span className="text-white">{o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—'}</span></span>
                        <span>Ответственный: {o.responsible_person}</span>
                        <span>Выдал: {o.issued_by}</span>
                      </div>
                      {o.last_action && (
                        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-2">
                          <p className="text-xs text-green-400 font-medium mb-1">Что сделано:</p>
                          <p className="text-white text-xs">{o.last_action}</p>
                        </div>
                      )}
                      {(o.documents || []).length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-400 mb-1">Ссылки на документы:</p>
                          <div className="flex flex-wrap gap-2">
                            {(o.documents || []).map(d => (
                              <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded">
                                <Icon name="FileDown" size={12} />
                                {d.file_name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
              <Button onClick={() => {
                const html = buildWorkReportHtml();
                const w = window.open('', '_blank');
                if (w) {
                  w.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Проделанная работа за вахту</title>
                    <style>body{font-family:Arial,sans-serif;margin:0;padding:20px}@media print{.no-print{display:none!important}}</style>
                  </head><body>
                    <div class="no-print" style="text-align:center;margin-bottom:16px">
                      <button onclick="window.print()" style="padding:10px 28px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
                        🖨️ Распечатать / Сохранить в PDF
                      </button>
                    </div>
                    ${html}</body></html>`);
                  w.document.close();
                }
              }} variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                <Icon name="Printer" size={16} className="mr-2" />Распечатать
              </Button>
              <Button onClick={() => {
                const html = buildWorkReportHtml();
                const fileLabel = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');
                const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Проделанная работа за вахту</title>
                  <style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}@media print{.no-print{display:none!important}}</style>
                </head><body>
                  <div class="no-print" style="text-align:center;margin-bottom:16px">
                    <button onclick="window.print()" style="padding:10px 28px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
                      🖨️ Распечатать / Сохранить в PDF
                    </button>
                  </div>
                  ${html}</body></html>`;
                const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `проделанная_работа_${fileLabel}.html`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Файл скачан');
              }} variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                <Icon name="Download" size={16} className="mr-2" />Скачать
              </Button>
            </div>
          </Card>
        )}

        {/* Модальное окно: создание поручения */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-orange-600/30 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white">Добавить поручение</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                  <Icon name="X" size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <Label className="text-white mb-1 block">Наименование поручения <span className="text-red-400">*</span></Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white" placeholder="Описание поручения" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white mb-1 block">Дата выдачи</Label>
                    <Input type="date" value={form.issued_date} onChange={e => setForm({ ...form, issued_date: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white" />
                  </div>
                  <div>
                    <Label className="text-white mb-1 block">Срок выполнения <span className="text-red-400">*</span></Label>
                    <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white" />
                  </div>
                </div>
                {specialists.length > 0 && (
                  <div>
                    <Label className="text-white mb-1 block">Назначить специалисту</Label>
                    <select
                      value={form.assigned_to_user_id || ''}
                      onChange={e => {
                        const id = e.target.value;
                        const spec = specialists.find(s => String(s.id) === id);
                        setForm({
                          ...form,
                          assigned_to_user_id: id ? Number(id) : '',
                          responsible_person: spec ? spec.fio : form.responsible_person,
                        });
                      }}
                      className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600 text-white text-sm"
                    >
                      <option value="">— Не назначен —</option>
                      {specialists.map(s => (
                        <option key={s.id} value={s.id}>{s.fio}{s.position ? ` (${s.position})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <Label className="text-white mb-1 block">Ответственный <span className="text-red-400">*</span></Label>
                  <Input value={form.responsible_person} onChange={e => setForm({ ...form, responsible_person: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white" placeholder="ФИО ответственного" />
                </div>
                <div>
                  <Label className="text-white mb-1 block">Выдал поручение <span className="text-red-400">*</span></Label>
                  <Input value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white" placeholder="ФИО руководителя / устно" />
                </div>
                <div>
                  <Label className="text-white mb-1 block">Примечание</Label>
                  <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white" placeholder="Дополнительная информация" />
                </div>
                <div>
                  <Label className="text-white mb-1 block">Последнее действие / Статус выполнения</Label>
                  <textarea
                    value={form.last_action}
                    onChange={e => setForm({ ...form, last_action: e.target.value })}
                    placeholder="Опишите что уже сделано или на каком этапе находится выполнение..."
                    rows={3}
                    className="w-full bg-slate-700/50 border border-orange-500/30 text-white text-sm rounded-md px-3 py-2 resize-none focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 p-6 border-t border-slate-700">
                <Button onClick={handleCreate} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700">
                  {saving ? <><Icon name="Loader2" size={18} className="mr-2 animate-spin" />Сохранение...</> : <><Icon name="Save" size={18} className="mr-2" />Создать поручение</>}
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline" className="border-slate-600 text-gray-300">Отмена</Button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно: передача поручения */}
        {transferTarget && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-blue-600/30 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white">Передать поручение</h2>
                <button onClick={() => setTransferTarget(null)} className="text-gray-400 hover:text-white">
                  <Icon name="X" size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-300 text-sm">
                  <span className="text-white font-semibold">Поручение:</span> {transferTarget.title}
                </p>
                <div>
                  <Label className="text-white mb-1 block">Выберите ведущего специалиста отдела</Label>
                  <select value={transferUserId} onChange={e => setTransferUserId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600 text-white text-sm">
                    <option value="">— Выберите специалиста —</option>
                    {specialists.map(s => (
                      <option key={s.id} value={s.id}>{s.fio}{s.position ? ` (${s.position})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 p-6 border-t border-slate-700">
                <Button onClick={handleTransfer} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Icon name="Send" size={18} className="mr-2" />Передать
                </Button>
                <Button onClick={() => setTransferTarget(null)} variant="outline" className="border-slate-600 text-gray-300">Отмена</Button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно выбора формата скачивания */}
        {showDownloadModal && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-violet-600/40 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl">
                    <Icon name="Download" size={22} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Скачать чек-лист</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Выберите формат файла</p>
                  </div>
                </div>
                <button onClick={() => setShowDownloadModal(false)} className="text-gray-400 hover:text-white transition-colors">
                  <Icon name="X" size={24} />
                </button>
              </div>

              <div className="p-6 space-y-3">
                {/* HTML */}
                <button
                  onClick={downloadChecklistHtml}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/15 hover:border-orange-500/60 transition-all group text-left"
                >
                  <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform shrink-0">
                    <Icon name="Globe" size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">HTML-файл</p>
                    <p className="text-slate-400 text-xs mt-0.5">Открывается в браузере, сохраняет оформление и цвета. Можно распечатать через браузер</p>
                  </div>
                  <Icon name="ChevronRight" size={18} className="text-slate-500 group-hover:text-orange-400 transition-colors" />
                </button>

                {/* Excel */}
                <button
                  onClick={downloadChecklistXlsx}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/15 hover:border-green-500/60 transition-all group text-left"
                >
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform shrink-0">
                    <Icon name="FileSpreadsheet" size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">Excel (.xlsx)</p>
                    <p className="text-slate-400 text-xs mt-0.5">Таблица с данными, удобно для редактирования и хранения в архиве</p>
                  </div>
                  <Icon name="ChevronRight" size={18} className="text-slate-500 group-hover:text-green-400 transition-colors" />
                </button>

                {/* PDF */}
                <button
                  onClick={downloadChecklistPdf}
                  disabled={downloadingFormat === 'pdf'}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/60 transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="bg-gradient-to-br from-red-500 to-rose-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform shrink-0">
                    {downloadingFormat === 'pdf'
                      ? <Icon name="Loader2" size={24} className="text-white animate-spin" />
                      : <Icon name="FileText" size={24} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">PDF-документ</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {downloadingFormat === 'pdf' ? 'Формируется PDF...' : 'Готовый документ для печати и официальной передачи'}
                    </p>
                  </div>
                  {downloadingFormat !== 'pdf' && (
                    <Icon name="ChevronRight" size={18} className="text-slate-500 group-hover:text-red-400 transition-colors" />
                  )}
                </button>
              </div>

              <div className="px-6 pb-6">
                <Button onClick={() => setShowDownloadModal(false)} variant="outline"
                  className="w-full border-slate-600 text-slate-400 hover:text-white">
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OtipbWorkspaceDashboardPage;