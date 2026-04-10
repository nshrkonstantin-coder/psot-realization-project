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
  const [checklistRecipientEmail, setChecklistRecipientEmail] = useState('');
  const [checklistRecipientFio, setChecklistRecipientFio] = useState('');
  const [checklistRecipientId, setChecklistRecipientId] = useState('');
  const [sendingChecklist, setSendingChecklist] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const checklistRef = useRef<HTMLDivElement>(null);

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

  const handleStatusSave = async (order: Order) => {
    const status = editingStatus[order.id];
    const extDeadline = editingExtDeadline[order.id];
    const lastAction = editingLastAction[order.id];
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
    const exportData = orders.map(o => ({
      'Наименование поручения': o.title,
      'Дата выдачи': o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—',
      'Срок выполнения': o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—',
      'Ответственный': o.responsible_person,
      'Выдал поручение': o.issued_by,
      'Статус выполнения': STATUS_LABELS[o.status] || o.status,
      'Последнее действие': o.last_action || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Поручения');
    XLSX.writeFile(wb, `поручения_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`);
  };

  const pendingOrders = orders.filter(o => o.status !== 'completed');
  const countByStatus = (s: string) => orders.filter(o => o.status === s).length;

  const buildChecklistHtml = (recipientFio: string) => {
    const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const rows = pendingOrders.map((o, i) => `
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
      </tr>
    `).join('');

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

        <h2 style="font-size:16px;color:#1e293b;margin:20px 0 12px">Невыполненные поручения (${pendingOrders.length})</h2>
        ${pendingOrders.length === 0
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
                <table style="width:100%;border-collapse:collapse;padding-left:24px">
                  <tr>
                    <td style="padding:4px 24px;color:#64748b;width:36%">ФИО:</td>
                    <td style="padding:4px 0;font-weight:600;color:${recipientFio ? '#1e293b' : '#94a3b8'}">${recipientFio || '____________________'}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px;color:#64748b">Должность:</td>
                    <td style="padding:4px 0;color:#94a3b8">____________________</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px;color:#64748b">Дата:</td>
                    <td style="padding:4px 0;color:#94a3b8">____________________</td>
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

  const downloadChecklistHtml = () => {
    const html = buildChecklistHtml(checklistRecipientFio);
    const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Чек-лист передачи вахты</title>
    <style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}@media print{body{padding:0}}</style>
    </head><body>${html}</body></html>`;
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
      const html = buildChecklistHtml(checklistRecipientFio);
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
      const html = buildChecklistHtml(checklistRecipientFio);
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
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/otipb-department')} className="text-red-400 hover:text-red-300">
            <Icon name="ArrowLeft" size={20} className="mr-2" />Назад
          </Button>
          <p className="text-slate-400 text-sm">Добро пожаловать, {userName}!</p>
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
            onClick={() => { setShowList(true); setShowChecklist(false); }}
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
              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
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
              </div>
            )}
          </Card>

          {/* Чек-лист передачи вахты */}
          <Card
            onClick={() => { setShowChecklist(true); setShowList(false); }}
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

          {/* Плейсхолдер */}
          <Card className="bg-slate-800/30 border-slate-700/40 p-6 border-dashed">
            <div className="flex items-center gap-4 opacity-40">
              <div className="bg-slate-700 p-4 rounded-xl"><Icon name="FileText" size={32} className="text-slate-400" /></div>
              <div>
                <p className="text-slate-400 text-sm">Раздел</p>
                <p className="text-slate-500 text-xs mt-1">Скоро будет настроен</p>
              </div>
            </div>
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
                  <Icon name="FileDown" size={16} className="mr-1" />Выгрузить
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
                            <span className={`text-xs px-2 py-0.5 rounded border w-fit ${STATUS_COLORS[order.status]}`}>
                              {STATUS_LABELS[order.status]}
                            </span>
                            <Button size="sm" onClick={() => handleStatusSave(order)}
                              className="h-6 text-xs bg-orange-600 hover:bg-orange-700 px-2">
                              Сохранить
                            </Button>
                          </div>
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
                Невыполненные поручения ({pendingOrders.length})
              </h3>
              {pendingOrders.length === 0 ? (
                <div className="text-center py-8 bg-green-900/20 border border-green-500/30 rounded-xl">
                  <Icon name="CheckCircle2" size={40} className="mx-auto text-green-400 mb-2" />
                  <p className="text-green-400 font-medium">Все поручения выполнены!</p>
                  <p className="text-slate-400 text-sm mt-1">Передача вахты проходит в штатном режиме</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map((o, i) => (
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
              <Button onClick={() => setShowDownloadModal(true)} variant="outline"
                className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10">
                <Icon name="Download" size={16} className="mr-2" />Скачать чек-лист
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