import { useEffect, useState } from 'react';
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
import OtipbAnalyticsBlock from '@/components/otipb/OtipbAnalyticsBlock';
import ExcelOrdersImport from '@/components/otipb/ExcelOrdersImport';

const SEND_EMAIL_URL = 'https://functions.poehali.dev/2dab48c9-57c0-4f55-90e7-d93b326a6891';

const OT_ORDERS_URL = 'https://functions.poehali.dev/64c3f34b-05da-451e-bd8e-fae26e931120';

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
  email?: string;
  phone?: string;
}

interface ManualSpecialist {
  id: number;
  fio: string;
  position: string;
  email: string;
  phone: string;
  user_id: number | null;
  active: boolean;
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
  assigned_to_user_id: '' as string | number,
};

const emptySpecForm = { fio: '', position: '', email: '', phone: '' };

const OtManagementPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Record<number, string>>({});
  const [editingExtDeadline, setEditingExtDeadline] = useState<Record<number, string>>({});
  const [transferTarget, setTransferTarget] = useState<Order | null>(null);
  const [transferUserId, setTransferUserId] = useState('');

  // Настройки источника специалистов
  const [showSettings, setShowSettings] = useState(false);
  const [specialistSource, setSpecialistSource] = useState<'asubt' | 'manual'>('asubt');
  const [manualSpecialists, setManualSpecialists] = useState<ManualSpecialist[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showAddSpecForm, setShowAddSpecForm] = useState(false);
  const [specForm, setSpecForm] = useState({ ...emptySpecForm });
  const [savingSpec, setSavingSpec] = useState(false);

  // Чек-лист и проделанная работа
  const [activeBlock, setActiveBlock] = useState<'orders' | 'checklist' | 'workreport' | null>(null);
  const [checklistDateFrom, setChecklistDateFrom] = useState('');
  const [checklistDateTo, setChecklistDateTo] = useState('');
  const [checklistRecipientFio, setChecklistRecipientFio] = useState('');
  const [checklistRecipientEmail, setChecklistRecipientEmail] = useState('');
  const [checklistRecipientId, setChecklistRecipientId] = useState('');
  const [sendingChecklist, setSendingChecklist] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [workReportDateFrom, setWorkReportDateFrom] = useState('');
  const [workReportDateTo, setWorkReportDateTo] = useState('');

  const orgId = localStorage.getItem('organizationId') || '';
  const userFio = localStorage.getItem('userFio') || '';
  const userPosition = localStorage.getItem('userPosition') || '';
  const userDepartment = localStorage.getItem('userDepartment') || '';
  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    if (!userId) { navigate('/'); return; }
    if (role !== 'superadmin') {
      navigate(role === 'admin' ? '/admin' : role === 'user' ? '/dashboard' : '/');
      return;
    }
    loadData();
    loadSettings();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = orgId ? `?organization_id=${orgId}` : '';
      const res = await fetch(`${OT_ORDERS_URL}${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setSpecialists(data.specialists);
        const statusMap: Record<number, string> = {};
        const extMap: Record<number, string> = {};
        data.orders.forEach((o: Order) => {
          statusMap[o.id] = o.status;
          extMap[o.id] = o.extended_deadline || '';
        });
        setEditingStatus(statusMap);
        setEditingExtDeadline(extMap);
      }
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const clearAllOrders = async () => {
    try {
      const p = orgId ? `?action=clear_all&organization_id=${orgId}` : '?action=clear_all';
      const res = await fetch(`${OT_ORDERS_URL}${p}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Все поручения удалены');
        await loadData();
      } else toast.error(data.error || 'Ошибка');
    } catch {
      toast.error('Ошибка соединения');
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
          created_by_user_id: localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null,
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

  const handleStatusSave = async (order: Order) => {
    const status = editingStatus[order.id];
    const extDeadline = editingExtDeadline[order.id];
    if (status === 'extended' && !extDeadline) {
      toast.error('Укажите новый срок выполнения');
      return;
    }
    try {
      const res = await fetch(OT_ORDERS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status,
          extended_deadline: status === 'extended' ? extDeadline : null,
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

  const loadSettings = async () => {
    try {
      const p = orgId ? `?action=settings&organization_id=${orgId}` : '?action=settings';
      const res = await fetch(`${OT_ORDERS_URL}${p}`);
      const data = await res.json();
      if (data.success) setSpecialistSource(data.specialist_source || 'asubt');
    } catch { /* ignore */ }
  };

  const loadManualSpecialists = async () => {
    try {
      const p = orgId ? `?action=manual_specialists&organization_id=${orgId}` : '?action=manual_specialists';
      const res = await fetch(`${OT_ORDERS_URL}${p}`);
      const data = await res.json();
      if (data.success) setManualSpecialists(data.specialists);
    } catch { /* ignore */ }
  };

  const saveSettings = async (source: 'asubt' | 'manual') => {
    setSavingSettings(true);
    try {
      const res = await fetch(OT_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_settings',
          specialist_source: source,
          organization_id: orgId ? Number(orgId) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSpecialistSource(source);
        toast.success('Настройки сохранены');
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSavingSettings(false);
    }
  };

  const addManualSpecialist = async () => {
    if (!specForm.fio.trim()) { toast.error('Введите ФИО'); return; }
    setSavingSpec(true);
    try {
      const res = await fetch(OT_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_specialist',
          ...specForm,
          organization_id: orgId ? Number(orgId) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Специалист добавлен');
        setSpecForm({ ...emptySpecForm });
        setShowAddSpecForm(false);
        await loadManualSpecialists();
      } else {
        toast.error(data.error || 'Ошибка');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSavingSpec(false);
    }
  };

  const deleteManualSpecialist = async (id: number) => {
    if (!confirm('Удалить специалиста из списка?')) return;
    try {
      const res = await fetch(`${OT_ORDERS_URL}?specialist_id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Удалено');
        await loadManualSpecialists();
      }
    } catch { toast.error('Ошибка'); }
  };

  const countByStatus = (s: string) => orders.filter(o => o.status === s).length;

  const pendingOrders = orders.filter(o => o.status !== 'completed');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const overdueCount = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return pendingOrders.filter(o => {
      const raw = o.extended_deadline || o.deadline;
      if (!raw) return false;
      const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d) < today;
    }).length;
  })();

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

  const fileDate = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');
  const recipientSpec = specialists.find(s => String(s.id) === checklistRecipientId);

  const buildChecklistHtml = (recipientFio: string, recipientPosition?: string) => {
    const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const periodLabel = checklistDateFrom || checklistDateTo
      ? `${checklistDateFrom ? new Date(checklistDateFrom).toLocaleDateString('ru-RU') : '—'} — ${checklistDateTo ? new Date(checklistDateTo).toLocaleDateString('ru-RU') : '—'}`
      : '';
    const rows = checklistFilteredOrders.map((o, i) => {
      const docsHtml = (o.documents || []).length > 0
        ? o.documents.map(d => `<a href="${d.file_url}" style="display:block;color:#2563eb;font-size:11px;text-decoration:underline;margin-bottom:2px;word-break:break-all">${d.file_name}</a>`).join('')
        : '<span style="color:#94a3b8;font-size:11px;font-style:italic">—</span>';
      return `<tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc' : ''}">
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
    return `<div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;padding:20px">
      <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #f97316;padding-bottom:16px">
        <h1 style="font-size:22px;color:#1e293b;margin:0 0 4px">ЧЕК-ЛИСТ ПЕРЕДАЧИ ВАХТЫ — ОТДЕЛ ОТиПБ</h1>
        <p style="color:#64748b;margin:0;font-size:14px">Сводные невыполненные поручения всех специалистов</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
        <tr><td style="padding:6px 12px;color:#64748b;width:40%">Начальник отдела / Администратор:</td><td style="padding:6px 12px;font-weight:600;color:#1e293b">${userFio}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:6px 12px;color:#64748b">Должность:</td><td style="padding:6px 12px;font-weight:600;color:#1e293b">${userPosition || '—'}</td></tr>
        <tr><td style="padding:6px 12px;color:#64748b">Дата формирования:</td><td style="padding:6px 12px;font-weight:600;color:#1e293b">${date}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:6px 12px;color:#64748b">Кому передаётся:</td><td style="padding:6px 12px;font-weight:600;color:#f97316">${recipientFio || '—'}</td></tr>
        ${recipientPosition ? `<tr><td style="padding:6px 12px;color:#64748b">Должность принимающего:</td><td style="padding:6px 12px;font-weight:600;color:#1e293b">${recipientPosition}</td></tr>` : ''}
      </table>
      ${periodLabel ? `<div style="margin-bottom:12px;padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;font-size:13px;color:#9a3412"><b>Период:</b> ${periodLabel}</div>` : ''}
      <h2 style="font-size:16px;color:#1e293b;margin:20px 0 12px">Невыполненные поручения по отделу (${checklistFilteredOrders.length})</h2>
      ${checklistFilteredOrders.length === 0
        ? '<p style="color:#16a34a;font-style:italic;padding:16px;background:#f0fdf4;border-radius:8px">Все поручения выполнены. Передача проходит в штатном режиме.</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f97316;color:#fff">
            <th style="padding:10px 8px;text-align:left">Поручение</th>
            <th style="padding:10px 8px;text-align:left;white-space:nowrap">Дата выдачи</th>
            <th style="padding:10px 8px;text-align:left;white-space:nowrap">Срок</th>
            <th style="padding:10px 8px;text-align:left">Ответственный</th>
            <th style="padding:10px 8px;text-align:left">Выдал</th>
            <th style="padding:10px 8px;text-align:left">Статус</th>
            <th style="padding:10px 8px;text-align:left;background:#fff3e0;color:#9a3412">Последнее действие</th>
            <th style="padding:10px 8px;text-align:left">Документы</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`
      }
      <div style="margin-top:48px;padding-top:24px;border-top:2px solid #e2e8f0">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="width:50%;padding:0 24px 0 0;vertical-align:top">
              <p style="font-weight:700;color:#1e293b;margin:0 0 20px">Передал:</p>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:4px 0;color:#64748b;width:36%">ФИО:</td><td style="padding:4px 0;font-weight:600;color:#1e293b">${userFio}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b">Должность:</td><td style="padding:4px 0;color:#1e293b">${userPosition || '—'}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b">Дата:</td><td style="padding:4px 0;color:#1e293b">${date}</td></tr>
              </table>
              <div style="margin-top:32px;border-top:1px solid #94a3b8;width:80%;padding-top:4px;color:#64748b;font-size:11px">подпись</div>
            </td>
            <td style="width:50%;padding:0 0 0 24px;vertical-align:top;border-left:1px solid #e2e8f0">
              <p style="font-weight:700;color:#1e293b;margin:0 0 20px;padding-left:24px">Принял:</p>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:4px 24px;color:#64748b;width:36%">ФИО:</td><td style="padding:4px 0;font-weight:600;color:${recipientFio ? '#1e293b' : '#94a3b8'}">${recipientFio || '____________________'}</td></tr>
                <tr><td style="padding:4px 24px;color:#64748b">Должность:</td><td style="padding:4px 0;color:${recipientPosition ? '#1e293b' : '#94a3b8'}">${recipientPosition || '____________________'}</td></tr>
                <tr><td style="padding:4px 24px;color:#64748b">Дата:</td><td style="padding:4px 0;color:#1e293b">${date}</td></tr>
              </table>
              <div style="margin-top:32px;margin-left:24px;border-top:1px solid #94a3b8;width:80%;padding-top:4px;color:#64748b;font-size:11px">подпись</div>
            </td>
          </tr>
        </table>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
          Документ сформирован автоматически системой ОТиПБ • ${date}
        </div>
      </div>
    </div>`;
  };

  const buildWorkReportHtml = () => {
    const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const periodLabel = workReportDateFrom || workReportDateTo
      ? `${workReportDateFrom ? new Date(workReportDateFrom).toLocaleDateString('ru-RU') : '—'} — ${workReportDateTo ? new Date(workReportDateTo).toLocaleDateString('ru-RU') : '—'}`
      : 'Весь период';
    const rows = workReportFilteredOrders.map((o, i) => {
      const docsHtml = (o.documents || []).length > 0
        ? o.documents.map(d => `<a href="${d.file_url}" target="_blank" style="display:block;color:#2563eb;font-size:11px;text-decoration:underline;margin-bottom:2px;word-break:break-all">${d.file_name}</a>`).join('')
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
        <h1 style="font-size:22px;color:#1e293b;margin:0 0 4px">ПРОДЕЛАННАЯ РАБОТА ЗА ВАХТУ — ОТДЕЛ ОТиПБ</h1>
        <p style="color:#64748b;margin:0;font-size:14px">Сводные выполненные поручения всех специалистов</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
        <tr><td style="padding:5px 12px;color:#64748b;width:40%">Начальник отдела / Администратор:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${userFio}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:5px 12px;color:#64748b">Должность:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${userPosition || '—'}</td></tr>
        <tr><td style="padding:5px 12px;color:#64748b">Подразделение:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${userDepartment || 'Главный администратор'}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:5px 12px;color:#64748b">Период вахты:</td><td style="padding:5px 12px;font-weight:600;color:#16a34a">${periodLabel}</td></tr>
        <tr><td style="padding:5px 12px;color:#64748b">Дата формирования:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${now}</td></tr>
      </table>
      <h2 style="font-size:16px;color:#1e293b;margin:20px 0 12px">Выполненные поручения по отделу (${workReportFilteredOrders.length})</h2>
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
            <th style="padding:9px 8px;text-align:left">Документы</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`
      }
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
        Документ сформирован автоматически системой ОТиПБ • ${now}
      </div>
    </div>`;
  };

  const downloadXlsx = (type: 'checklist' | 'workreport') => {
    const list = type === 'checklist' ? checklistFilteredOrders : workReportFilteredOrders;
    const title = type === 'checklist' ? 'ЧЕК-ЛИСТ ПЕРЕДАЧИ ВАХТЫ — ОТДЕЛ ОТиПБ' : 'ПРОДЕЛАННАЯ РАБОТА ЗА ВАХТУ — ОТДЕЛ ОТиПБ';
    const info = [
      [title],
      ['Охрана труда и промышленная безопасность'],
      [],
      ['Главный администратор:', userFio],
      ['Дата формирования:', new Date().toLocaleString('ru-RU')],
      ['Поручений:', list.length],
      [],
    ];
    const headers = ['№', 'Поручение', 'Дата выдачи', 'Срок', 'Ответственный', 'Выдал', 'Статус', 'Что сделано'];
    const rows = list.map((o, i) => [i + 1, o.title, o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—', o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—', o.responsible_person, o.issued_by, STATUS_LABELS[o.status] || o.status, o.last_action || '—']);
    const ws = XLSX.utils.aoa_to_sheet([...info, headers, ...rows]);
    ws['!cols'] = [{ wch: 4 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'checklist' ? 'Чек-лист' : 'Проделанная работа');
    XLSX.writeFile(wb, `${type === 'checklist' ? 'чек-лист' : 'проделанная_работа'}_отипб_${fileDate}.xlsx`);
    toast.success('Excel-файл скачан');
  };

  const downloadPdf = async (type: 'checklist' | 'workreport') => {
    setDownloadingFormat(type + '-pdf');
    try {
      const html = type === 'checklist' ? buildChecklistHtml(checklistRecipientFio, recipientSpec?.position) : buildWorkReportHtml();
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:960px;background:#fff;font-family:Arial,sans-serif;';
      container.innerHTML = html;
      document.body.appendChild(container);
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(container, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(container);
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = pdfW / (canvas.width / canvas.height);
      let yPos = 0; let remainH = imgH;
      while (remainH > 0) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yPos, pdfW, imgH);
        yPos += pdfH; remainH -= pdfH;
      }
      pdf.save(`${type === 'checklist' ? 'чек-лист' : 'проделанная_работа'}_отипб_${fileDate}.pdf`);
      toast.success('PDF-файл скачан');
    } catch {
      toast.error('Ошибка создания PDF');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const printHtml = (type: 'checklist' | 'workreport') => {
    const html = type === 'checklist' ? buildChecklistHtml(checklistRecipientFio, recipientSpec?.position) : buildWorkReportHtml();
    const color = type === 'checklist' ? '#f97316' : '#16a34a';
    const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}@media print{.no-print{display:none!important}body{padding:0}}</style></head><body>
    <div class="no-print" style="text-align:center;margin-bottom:16px">
      <button onclick="window.print()" style="padding:10px 28px;background:${color};color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">🖨️ Распечатать</button>
    </div>${html}</body></html>`;
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(fullHtml);
    pw.document.close();
  };

  const sendEmailChecklist = async () => {
    if (!checklistRecipientEmail.trim()) { toast.error('Укажите email получателя'); return; }
    setSendingChecklist(true);
    try {
      const body = buildChecklistHtml(checklistRecipientFio, recipientSpec?.position);
      const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/></head><body>${body}</body></html>`;
      const res = await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: checklistRecipientEmail, subject: `Чек-лист передачи вахты — Отдел ОТиПБ — ${new Date().toLocaleDateString('ru-RU')}`, html }),
      });
      const data = await res.json();
      if (data.success) toast.success('Чек-лист отправлен на почту');
      else toast.error(`Ошибка: ${data.error || ''}`);
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSendingChecklist(false);
    }
  };

  const sendChecklistInternal = async () => {
    if (!checklistRecipientId) { toast.error('Выберите сменщика из списка'); return; }
    const spec = specialists.find(s => String(s.id) === checklistRecipientId);
    const senderId = userId ? Number(userId) : null;
    if (!senderId) { toast.error('Не определён отправитель'); return; }
    setSendingChecklist(true);
    try {
      const html = buildChecklistHtml(checklistRecipientFio, spec?.position);
      const encoded = btoa(unescape(encodeURIComponent(html)));
      const msgText = `📋 Чек-лист передачи вахты (Отдел ОТиПБ) от ${userFio}\nНевыполненных поручений по отделу: ${pendingOrders.length}\nДата: ${new Date().toLocaleDateString('ru-RU')}\n[CHECKLIST_DATA:${encoded}]`;
      const res = await fetch(OT_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_checklist_internal', sender_id: senderId, receiver_id: Number(checklistRecipientId), message: msgText }),
      });
      const data = await res.json();
      if (data.success) toast.success(`Чек-лист отправлен коллеге ${spec?.fio || ''}`);
      else toast.error(`Ошибка: ${data.error || ''}`);
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSendingChecklist(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/superadmin')} className="text-purple-400">
            <Icon name="ArrowLeft" size={20} className="mr-2" />Назад
          </Button>
          <Button onClick={() => { localStorage.clear(); navigate('/'); }} variant="outline"
            className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10">
            <Icon name="LogOut" size={20} className="mr-2" />Выход
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-orange-600 to-red-700 p-3 rounded-xl shadow-lg">
              <Icon name="HardHat" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Отдел ОТиПБ</h1>
              <p className="text-purple-400">Охрана труда и промышленная безопасность</p>
            </div>
          </div>
          <Button
            onClick={() => { setShowSettings(!showSettings); if (!showSettings) loadManualSpecialists(); }}
            variant="outline"
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
          >
            <Icon name="Settings2" size={18} className="mr-2" />
            Источник специалистов
          </Button>
        </div>

        {/* Блок настроек источника специалистов */}
        {showSettings && (
          <Card className="bg-slate-800/60 border-purple-600/40 p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Icon name="Users" size={20} className="text-purple-400" />
              Источник списка специалистов ОТиПБ
            </h2>
            <p className="text-slate-400 text-sm mb-5">
              Выберите, откуда система будет брать список сотрудников отдела для чек-листа передачи вахты и назначения поручений.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* АСУБТ */}
              <button
                onClick={() => saveSettings('asubt')}
                disabled={savingSettings}
                className={`relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all ${
                  specialistSource === 'asubt'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500'
                }`}
              >
                {specialistSource === 'asubt' && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Icon name="Check" size={12} className="text-white" />
                  </div>
                )}
                <div className={`p-3 rounded-xl shrink-0 ${specialistSource === 'asubt' ? 'bg-blue-500/20' : 'bg-slate-600/50'}`}>
                  <Icon name="Database" size={28} className={specialistSource === 'asubt' ? 'text-blue-400' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">База АСУБТ</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Список автоматически формируется из зарегистрированных пользователей системы.
                    Подходит если все сотрудники ОТиПБ уже заведены в АСУБТ.
                  </p>
                </div>
              </button>

              {/* Ручной список */}
              <button
                onClick={() => saveSettings('manual')}
                disabled={savingSettings}
                className={`relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all ${
                  specialistSource === 'manual'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500'
                }`}
              >
                {specialistSource === 'manual' && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <Icon name="Check" size={12} className="text-white" />
                  </div>
                )}
                <div className={`p-3 rounded-xl shrink-0 ${specialistSource === 'manual' ? 'bg-orange-500/20' : 'bg-slate-600/50'}`}>
                  <Icon name="ClipboardList" size={28} className={specialistSource === 'manual' ? 'text-orange-400' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Ручной список</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Вы вручную задаёте список сотрудников ОТиПБ ниже.
                    Подходит если нужен точный контроль над составом отдела.
                  </p>
                </div>
              </button>
            </div>

            {/* Ручной список специалистов */}
            {specialistSource === 'manual' && (
              <div className="border-t border-slate-700 pt-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Icon name="UserCheck" size={18} className="text-orange-400" />
                    Список специалистов отдела ОТиПБ ({manualSpecialists.length})
                  </h3>
                  <Button size="sm" onClick={() => setShowAddSpecForm(!showAddSpecForm)}
                    className="bg-orange-600 hover:bg-orange-700 h-8 text-sm">
                    <Icon name="Plus" size={15} className="mr-1" />Добавить
                  </Button>
                </div>

                {/* Форма добавления */}
                {showAddSpecForm && (
                  <div className="bg-slate-700/50 border border-orange-500/30 rounded-xl p-4 mb-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-white text-xs mb-1 block">ФИО <span className="text-red-400">*</span></Label>
                        <Input value={specForm.fio} onChange={e => setSpecForm({...specForm, fio: e.target.value})}
                          placeholder="Иванов Иван Иванович"
                          className="bg-slate-700 border-slate-600 text-white h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-white text-xs mb-1 block">Должность</Label>
                        <Input value={specForm.position} onChange={e => setSpecForm({...specForm, position: e.target.value})}
                          placeholder="Специалист ОТиПБ"
                          className="bg-slate-700 border-slate-600 text-white h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-white text-xs mb-1 block">Email</Label>
                        <Input value={specForm.email} onChange={e => setSpecForm({...specForm, email: e.target.value})}
                          placeholder="ivanov@company.ru" type="email"
                          className="bg-slate-700 border-slate-600 text-white h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-white text-xs mb-1 block">Телефон</Label>
                        <Input value={specForm.phone} onChange={e => setSpecForm({...specForm, phone: e.target.value})}
                          placeholder="+7 (999) 123-45-67"
                          className="bg-slate-700 border-slate-600 text-white h-8 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addManualSpecialist} disabled={savingSpec}
                        className="bg-orange-600 hover:bg-orange-700 h-8 text-sm">
                        {savingSpec ? <Icon name="Loader2" size={14} className="mr-1 animate-spin" /> : <Icon name="Save" size={14} className="mr-1" />}
                        Сохранить
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddSpecForm(false); setSpecForm({...emptySpecForm}); }}
                        className="border-slate-600 text-slate-400 h-8 text-sm">Отмена</Button>
                    </div>
                  </div>
                )}

                {/* Таблица специалистов */}
                {manualSpecialists.length === 0 ? (
                  <div className="text-center py-8 bg-slate-700/20 rounded-xl border border-slate-600/30">
                    <Icon name="Users" size={36} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-400 text-sm">Список пуст — добавьте первого специалиста</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="text-left py-2 px-3 font-medium">ФИО</th>
                          <th className="text-left py-2 px-3 font-medium">Должность</th>
                          <th className="text-left py-2 px-3 font-medium">Email</th>
                          <th className="text-left py-2 px-3 font-medium">Телефон</th>
                          <th className="py-2 px-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {manualSpecialists.map(s => (
                          <tr key={s.id} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                            <td className="py-2 px-3">
                              <button
                                onClick={() => {
                                  const p = new URLSearchParams({ fio: s.fio, back: '/ot-management' });
                                  if (s.user_id) p.set('user_id', String(s.user_id));
                                  if (orgId) p.set('org_id', orgId);
                                  navigate(`/otipb-specialist?${p.toString()}`);
                                }}
                                className="text-orange-300 font-medium hover:text-orange-200 hover:underline flex items-center gap-1 text-sm">
                                {s.fio}
                                <Icon name="ExternalLink" size={11} className="text-slate-500" />
                              </button>
                            </td>
                            <td className="py-2 px-3 text-slate-300">{s.position || '—'}</td>
                            <td className="py-2 px-3 text-slate-300">{s.email || '—'}</td>
                            <td className="py-2 px-3 text-slate-300">{s.phone || '—'}</td>
                            <td className="py-2 px-3">
                              <Button size="sm" variant="outline" onClick={() => deleteManualSpecialist(s.id)}
                                className="h-6 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 px-2">
                                <Icon name="Trash2" size={12} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* ─── Четыре блока управления ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

          {/* Поручения */}
          <div className="space-y-2">
            <Card
              onClick={() => setActiveBlock(activeBlock === 'orders' ? null : 'orders')}
              className={`p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 group ${activeBlock === 'orders' ? 'bg-orange-900/30 border-orange-500' : 'bg-slate-800/50 border-orange-600/40 hover:border-orange-500'}`}
            >
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Icon name="ClipboardList" size={32} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Поручения от начальника</p>
                  <div className="text-4xl font-bold text-white">{loading ? '...' : orders.length}</div>
                  <p className="text-orange-400 text-xs mt-1">Всего по отделу</p>
                </div>
              </div>
              {!loading && (
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-1 text-xs text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Новые: {countByStatus('new')}</div>
                  <div className="flex items-center gap-1 text-xs text-green-400"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Выполнено: {countByStatus('completed')}</div>
                  <div className="flex items-center gap-1 text-xs text-yellow-400"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Продлено: {countByStatus('extended')}</div>
                  {overdueCount > 0 && <div className="flex items-center gap-1 text-xs text-red-400 font-semibold"><span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />Просрочено: {overdueCount}</div>}
                </div>
              )}
            </Card>
            {orders.length > 0 && (
              <button onClick={e => { e.stopPropagation(); clearAllOrders(); }}
                className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-1.5 rounded-lg border border-red-500/20 transition-colors flex items-center justify-center gap-1">
                <Icon name="Trash2" size={12} />Обнулить «Поручения»
              </button>
            )}
          </div>

          {/* Чек-лист */}
          <div className="space-y-2">
            <Card
              onClick={() => setActiveBlock(activeBlock === 'checklist' ? null : 'checklist')}
              className={`p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 group ${activeBlock === 'checklist' ? 'bg-violet-900/30 border-violet-500' : 'bg-slate-800/50 border-violet-600/40 hover:border-violet-500'}`}
            >
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Icon name="ClipboardCheck" size={32} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Чек-лист передачи вахты</p>
                  <div className="text-4xl font-bold text-white">{loading ? '...' : pendingOrders.length}</div>
                  <p className="text-violet-400 text-xs mt-1">Невыполненных по отделу</p>
                </div>
              </div>
              {!loading && (
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-1">
                  {pendingOrders.length === 0 ? (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <span>✅</span> Все поручения отдела выполнены
                    </p>
                  ) : (
                    <p className="text-xs text-yellow-400 flex items-center gap-1">
                      <span>⚠️</span> {pendingOrders.length} пункт(ов) требуют передачи
                    </p>
                  )}
                  {overdueCount > 0 && (
                    <p className="text-xs text-red-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
                      Просрочено: {overdueCount} — требует внимания!
                    </p>
                  )}
                </div>
              )}
            </Card>
            {pendingOrders.length > 0 && (
              <button onClick={e => { e.stopPropagation(); clearAllOrders(); }}
                className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-1.5 rounded-lg border border-red-500/20 transition-colors flex items-center justify-center gap-1">
                <Icon name="Trash2" size={12} />Обнулить «Чек-лист»
              </button>
            )}
          </div>

          {/* Проделанная работа */}
          <div className="space-y-2">
            <Card
              onClick={() => setActiveBlock(activeBlock === 'workreport' ? null : 'workreport')}
              className={`p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 group ${activeBlock === 'workreport' ? 'bg-green-900/30 border-green-500' : 'bg-slate-800/50 border-green-600/40 hover:border-green-500'}`}
            >
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Icon name="CheckSquare" size={32} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Проделанная работа за вахту</p>
                  <div className="text-4xl font-bold text-white">{loading ? '...' : completedOrders.length}</div>
                  <p className="text-green-400 text-xs mt-1">Выполненных по отделу</p>
                </div>
              </div>
              {!loading && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400">{completedOrders.length === 0 ? 'Выполненных поручений пока нет' : `✅ ${completedOrders.length} поручений выполнено`}</p>
                </div>
              )}
            </Card>
            {completedOrders.length > 0 && (
              <button onClick={e => { e.stopPropagation(); clearAllOrders(); }}
                className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-1.5 rounded-lg border border-red-500/20 transition-colors flex items-center justify-center gap-1">
                <Icon name="Trash2" size={12} />Обнулить «Проделанную работу»
              </button>
            )}
          </div>

          {/* Реестр работников */}
          <div className="space-y-2">
            <Card
              onClick={() => navigate('/workers-registry')}
              className="p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 group bg-slate-800/50 border-teal-600/40 hover:border-teal-500"
            >
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Icon name="Users" size={32} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Реестр работников</p>
                  <p className="text-teal-400 text-xs mt-1">QR-коды, поиск, карточки</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-400">Открыть реестр →</p>
              </div>
            </Card>
          </div>
        </div>

        {/* ─── Раскрывающийся блок: Поручения ──────────────────────────────── */}
        {activeBlock === 'orders' && (
          <Card className="mb-6 bg-slate-800/50 border-orange-500/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="ClipboardList" size={20} className="text-orange-400" />
                Поручения отдела ОТиПБ — все специалисты
              </h3>
              <div className="flex gap-2">
                <Button onClick={() => { setShowForm(true); setForm({ ...emptyForm, issued_by: userFio }); setActiveBlock(null); }}
                  className="bg-orange-600 hover:bg-orange-700" size="sm">
                  <Icon name="Plus" size={16} className="mr-1" />Новое поручение
                </Button>
                <Button onClick={() => setActiveBlock(null)} variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Icon name="X" size={18} />
                </Button>
              </div>
            </div>

            {/* Аналитика по специалистам */}
            <div className="mb-6 p-4 bg-slate-700/20 rounded-xl border border-slate-600/30">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="BarChart2" size={16} className="text-orange-400" />
                <span className="text-sm font-semibold text-white">Аналитика по специалистам</span>
              </div>
              <OtipbAnalyticsBlock
                orders={orders}
                specialists={specialists}
                loading={loading}
                orgId={orgId}
                backUrl="/ot-management"
                canManage={true}
                onClearAll={clearAllOrders}
              />
            </div>

            {/* Загрузка поручений из Excel */}
            <div className="mb-6 p-4 bg-yellow-900/10 rounded-xl border border-yellow-600/20">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="FileSpreadsheet" size={16} className="text-yellow-400" />
                <span className="text-sm font-semibold text-white">Выдать поручения из Excel</span>
              </div>
              <ExcelOrdersImport
                specialists={specialists}
                orgId={orgId}
                userId={userId}
                userFio={userFio}
                onOrdersCreated={loadData}
              />
            </div>
            {!loading && overdueCount > 0 && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <p className="text-red-300 text-sm font-semibold">
                  ⚠️ Внимание: {overdueCount} просроченных поручений — выделены красным в таблице
                </p>
              </div>
            )}
            {loading ? (
              <div className="text-center py-8 text-slate-400">Загрузка...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Поручений нет</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs">
                      <th className="text-left py-2 px-3">Поручение</th>
                      <th className="text-left py-2 px-3 whitespace-nowrap">Дата выдачи</th>
                      <th className="text-left py-2 px-3 whitespace-nowrap">Срок</th>
                      <th className="text-left py-2 px-3">Ответственный</th>
                      <th className="text-left py-2 px-3">Выдал</th>
                      <th className="text-left py-2 px-3">Статус</th>
                      <th className="text-left py-2 px-3">Что сделано</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => {
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const raw = o.extended_deadline || o.deadline;
                      const isOverdue = o.status !== 'completed' && raw && (() => {
                        const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
                        return new Date(y, m - 1, d) < today;
                      })();
                      return (
                        <tr key={o.id} className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-800/30'}`}>
                          <td className="py-2 px-3 text-white font-medium max-w-xs"><div className="truncate" title={o.title}>{o.title}</div></td>
                          <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—'}</td>
                          <td className={`py-2 px-3 whitespace-nowrap font-medium ${isOverdue ? 'text-red-400' : 'text-slate-300'}`}>
                            {o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}
                            {o.extended_deadline && <div className="text-xs text-yellow-400">→ {new Date(o.extended_deadline).toLocaleDateString('ru-RU')}</div>}
                          </td>
                          <td className="py-2 px-3 text-slate-300 max-w-[140px]"><div className="truncate" title={o.responsible_person}>{o.responsible_person}</div></td>
                          <td className="py-2 px-3 text-slate-400 max-w-[120px]"><div className="truncate">{o.issued_by}</div></td>
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${o.status === 'completed' ? 'bg-green-600/20 text-green-300 border-green-500/40' : o.status === 'extended' ? 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40' : isOverdue ? 'bg-red-600/20 text-red-300 border-red-500/40' : 'bg-blue-600/20 text-blue-300 border-blue-500/40'}`}>
                              {isOverdue && o.status !== 'completed' ? 'Просрочено' : STATUS_LABELS[o.status] || o.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-xs max-w-[160px]"><div className="truncate italic">{o.last_action || '—'}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ─── Раскрывающийся блок: Чек-лист ───────────────────────────────── */}
        {activeBlock === 'checklist' && (
          <Card className="mb-6 bg-slate-800/50 border-violet-500/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="ClipboardCheck" size={20} className="text-violet-400" />
                Чек-лист передачи вахты — невыполненные поручения отдела
              </h3>
              <Button onClick={() => setActiveBlock(null)} variant="ghost" size="sm" className="text-slate-400 hover:text-white"><Icon name="X" size={18} /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
              <div><Label className="text-slate-300 text-xs mb-1 block">Период с</Label><Input type="date" value={checklistDateFrom} onChange={e => setChecklistDateFrom(e.target.value)} className="bg-slate-700 border-slate-600 text-white" /></div>
              <div><Label className="text-slate-300 text-xs mb-1 block">Период по</Label><Input type="date" value={checklistDateTo} onChange={e => setChecklistDateTo(e.target.value)} className="bg-slate-700 border-slate-600 text-white" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Сменщик (из списка специалистов)</Label>
                <select value={checklistRecipientId} onChange={e => { setChecklistRecipientId(e.target.value); const s = specialists.find(sp => String(sp.id) === e.target.value); setChecklistRecipientFio(s ? s.fio : ''); }}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm">
                  <option value="">— выбрать —</option>
                  {specialists.map(s => <option key={s.id} value={s.id}>{s.fio}{s.position ? ` (${s.position})` : ''}</option>)}
                </select>
              </div>
              <div><Label className="text-slate-300 text-xs mb-1 block">ФИО принимающего (или вручную)</Label><Input value={checklistRecipientFio} onChange={e => setChecklistRecipientFio(e.target.value)} placeholder="ФИО сменщика" className="bg-slate-700 border-slate-600 text-white" /></div>
              <div><Label className="text-slate-300 text-xs mb-1 block">Email для отправки</Label><Input value={checklistRecipientEmail} onChange={e => setChecklistRecipientEmail(e.target.value)} placeholder="email@example.com" type="email" className="bg-slate-700 border-slate-600 text-white" /></div>
            </div>
            {pendingOrders.length === 0 ? (
              <div className="text-center py-6 text-green-400 font-semibold">✅ Все поручения отдела выполнены. Передача в штатном режиме.</div>
            ) : (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-700 text-slate-400 text-xs">
                    <th className="text-left py-2 px-3">Поручение</th><th className="text-left py-2 px-3 whitespace-nowrap">Срок</th>
                    <th className="text-left py-2 px-3">Ответственный</th><th className="text-left py-2 px-3">Статус</th><th className="text-left py-2 px-3">На чём остановились</th>
                  </tr></thead>
                  <tbody>
                    {checklistFilteredOrders.map((o, i) => (
                      <tr key={o.id} className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-800/30'}`}>
                        <td className="py-2 px-3 text-white font-medium max-w-xs"><div className="truncate" title={o.title}>{o.title}</div></td>
                        <td className="py-2 px-3 text-red-400 whitespace-nowrap text-xs">
                          {o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}
                          {o.extended_deadline && <div className="text-yellow-400">→ {new Date(o.extended_deadline).toLocaleDateString('ru-RU')}</div>}
                        </td>
                        <td className="py-2 px-3 text-slate-300 max-w-[140px]"><div className="truncate">{o.responsible_person}</div></td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${o.status === 'extended' ? 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40' : 'bg-blue-600/20 text-blue-300 border-blue-500/40'}`}>{STATUS_LABELS[o.status] || o.status}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-xs max-w-[160px]"><div className="truncate italic">{o.last_action || 'Не указано'}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
              <Button onClick={() => printHtml('checklist')} variant="outline" className="border-violet-600/50 text-violet-400 hover:bg-violet-600/10" size="sm"><Icon name="Printer" size={16} className="mr-2" />Распечатать</Button>
              <Button onClick={() => downloadXlsx('checklist')} variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-600/10" size="sm"><Icon name="FileSpreadsheet" size={16} className="mr-2" />Excel</Button>
              <Button onClick={() => downloadPdf('checklist')} disabled={downloadingFormat === 'checklist-pdf'} variant="outline" className="border-red-600/50 text-red-400 hover:bg-red-600/10" size="sm"><Icon name="FileText" size={16} className="mr-2" />{downloadingFormat === 'checklist-pdf' ? 'Создание...' : 'PDF'}</Button>
              <Button onClick={sendEmailChecklist} disabled={sendingChecklist} variant="outline" className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10" size="sm"><Icon name="Mail" size={16} className="mr-2" />{sendingChecklist ? 'Отправка...' : 'На почту'}</Button>
              <Button onClick={sendChecklistInternal} disabled={sendingChecklist || !checklistRecipientId} variant="outline" className="border-cyan-600/50 text-cyan-400 hover:bg-cyan-600/10" size="sm"><Icon name="MessageSquare" size={16} className="mr-2" />{sendingChecklist ? 'Отправка...' : 'Сменщику в системе'}</Button>
            </div>
          </Card>
        )}

        {/* ─── Раскрывающийся блок: Проделанная работа ─────────────────────── */}
        {activeBlock === 'workreport' && (
          <Card className="mb-6 bg-slate-800/50 border-green-500/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="CheckSquare" size={20} className="text-green-400" />
                Проделанная работа за вахту — выполненные поручения отдела
              </h3>
              <Button onClick={() => setActiveBlock(null)} variant="ghost" size="sm" className="text-slate-400 hover:text-white"><Icon name="X" size={18} /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
              <div><Label className="text-slate-300 text-xs mb-1 block">Период с</Label><Input type="date" value={workReportDateFrom} onChange={e => setWorkReportDateFrom(e.target.value)} className="bg-slate-700 border-slate-600 text-white" /></div>
              <div><Label className="text-slate-300 text-xs mb-1 block">Период по</Label><Input type="date" value={workReportDateTo} onChange={e => setWorkReportDateTo(e.target.value)} className="bg-slate-700 border-slate-600 text-white" /></div>
            </div>
            {completedOrders.length === 0 ? (
              <div className="text-center py-6 text-slate-400">Выполненных поручений за выбранный период нет</div>
            ) : (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-700 text-slate-400 text-xs">
                    <th className="text-left py-2 px-3">Поручение</th><th className="text-left py-2 px-3 whitespace-nowrap">Дата выдачи</th>
                    <th className="text-left py-2 px-3 whitespace-nowrap">Срок</th><th className="text-left py-2 px-3">Ответственный</th>
                    <th className="text-left py-2 px-3">Выдал</th><th className="text-left py-2 px-3">Что сделано</th><th className="text-left py-2 px-3">Документы</th>
                  </tr></thead>
                  <tbody>
                    {workReportFilteredOrders.map((o, i) => (
                      <tr key={o.id} className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-800/30'}`}>
                        <td className="py-2 px-3 text-white font-medium max-w-xs"><div className="truncate" title={o.title}>{o.title}</div></td>
                        <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—'}</td>
                        <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}</td>
                        <td className="py-2 px-3 text-slate-300 max-w-[140px]"><div className="truncate">{o.responsible_person}</div></td>
                        <td className="py-2 px-3 text-slate-400 max-w-[120px]"><div className="truncate">{o.issued_by}</div></td>
                        <td className="py-2 px-3 text-green-400 text-xs max-w-[160px]"><div className="truncate italic">{o.last_action || '—'}</div></td>
                        <td className="py-2 px-3">
                          {(o.documents || []).length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {o.documents.map(d => <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs underline truncate max-w-[120px]" title={d.file_name}>{d.file_name}</a>)}
                            </div>
                          ) : <span className="text-slate-500 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
              <Button onClick={() => printHtml('workreport')} variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-600/10" size="sm"><Icon name="Printer" size={16} className="mr-2" />Распечатать</Button>
              <Button onClick={() => downloadXlsx('workreport')} variant="outline" className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10" size="sm"><Icon name="FileSpreadsheet" size={16} className="mr-2" />Excel</Button>
              <Button onClick={() => downloadPdf('workreport')} disabled={downloadingFormat === 'workreport-pdf'} variant="outline" className="border-red-600/50 text-red-400 hover:bg-red-600/10" size="sm"><Icon name="FileText" size={16} className="mr-2" />{downloadingFormat === 'workreport-pdf' ? 'Создание...' : 'PDF'}</Button>
            </div>
          </Card>
        )}

        {/* Список поручений */}
        {showList && (
          <Card className="bg-slate-800/50 border-purple-600/30 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icon name="ClipboardList" size={22} className="text-orange-400" />
                Список поручений начальника ОТиПБ
              </h2>
              <div className="flex gap-2">
                <Button onClick={() => { setShowForm(true); setForm({ ...emptyForm, issued_by: userFio }); }}
                  className="bg-orange-600 hover:bg-orange-700">
                  <Icon name="Plus" size={18} className="mr-2" />Новое поручение
                </Button>
                <Button variant="ghost" onClick={() => setShowList(false)} className="text-gray-400">
                  <Icon name="X" size={20} />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Icon name="Loader2" size={40} className="text-purple-400 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="ClipboardList" size={56} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Поручений пока нет</p>
                <Button onClick={() => { setShowForm(true); setForm({ ...emptyForm, issued_by: userFio }); }}
                  className="mt-4 bg-orange-600 hover:bg-orange-700">
                  Создать первое поручение
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-gray-400">
                      <th className="text-left py-3 px-3 font-medium">Наименование поручения</th>
                      <th className="text-left py-3 px-3 font-medium">Дата выдачи</th>
                      <th className="text-left py-3 px-3 font-medium">Срок выполнения</th>
                      <th className="text-left py-3 px-3 font-medium">Ответственный</th>
                      <th className="text-left py-3 px-3 font-medium">Выдал поручение</th>
                      <th className="text-left py-3 px-3 font-medium">Статус выполнения</th>
                      <th className="text-left py-3 px-3 font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-3 text-white font-medium max-w-[220px]">
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
                              Продлён до: {new Date(order.extended_deadline).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          {order.responsible_person}
                          {order.assigned_fio && order.assigned_fio !== order.responsible_person && (
                            <div className="text-xs text-purple-400 mt-1">{order.assigned_fio}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-300">{order.issued_by}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-2">
                            <select
                              value={editingStatus[order.id] || order.status}
                              onChange={e => setEditingStatus(prev => ({ ...prev, [order.id]: e.target.value }))}
                              className="bg-slate-700 border border-slate-600 text-white text-xs rounded px-2 py-1"
                            >
                              <option value="new">Новое</option>
                              <option value="completed">Выполнено</option>
                              <option value="extended">Срок продлен</option>
                            </select>
                            {editingStatus[order.id] === 'extended' && (
                              <Input
                                type="date"
                                value={editingExtDeadline[order.id] || ''}
                                onChange={e => setEditingExtDeadline(prev => ({ ...prev, [order.id]: e.target.value }))}
                                className="bg-slate-700 border-slate-600 text-white text-xs h-7 px-2"
                              />
                            )}
                            <Button size="sm" onClick={() => handleStatusSave(order)}
                              className="bg-green-700 hover:bg-green-600 h-6 text-xs px-2">
                              Сохранить
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => { setTransferTarget(order); setTransferUserId(''); }}
                              className="bg-blue-600 hover:bg-blue-700 h-7 text-xs whitespace-nowrap">
                              <Icon name="Send" size={12} className="mr-1" />Передать
                            </Button>
                            <Button size="sm" onClick={() => handleDelete(order.id)}
                              className="bg-red-700 hover:bg-red-600 h-7 text-xs">
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
      </div>

      {/* Модальное окно: создание поручения */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-orange-600/30 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Новое поручение</h2>
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
              <div>
                <Label className="text-white mb-1 block">Ответственный <span className="text-red-400">*</span></Label>
                <Input value={form.responsible_person} onChange={e => setForm({ ...form, responsible_person: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white" placeholder="ФИО ответственного" />
              </div>
              <div>
                <Label className="text-white mb-1 block">Выдал поручение <span className="text-red-400">*</span></Label>
                <Input value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white" placeholder="ФИО начальника ОТиПБ" />
              </div>
              <div>
                <Label className="text-white mb-1 block">Назначить специалисту</Label>
                <select value={form.assigned_to_user_id} onChange={e => setForm({ ...form, assigned_to_user_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600 text-white text-sm">
                  <option value="">— Не назначать —</option>
                  {specialists.map(s => (
                    <option key={s.id} value={s.id}>{s.fio}{s.position ? ` (${s.position})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-white mb-1 block">Примечание</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white" placeholder="Дополнительная информация" />
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
    </div>
  );
};

export default OtManagementPage;