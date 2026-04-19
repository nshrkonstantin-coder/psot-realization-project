import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import UserProfileCard from '@/components/UserProfileCard';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import OtipbAnalyticsBlock from '@/components/otipb/OtipbAnalyticsBlock';
import ExcelOrdersImport from '@/components/otipb/ExcelOrdersImport';
import { apiFetch } from '@/lib/api';

const GREETING_KEY = 'otipb_greeting_enabled';
const OT_ORDERS_URL = 'https://functions.poehali.dev/64c3f34b-05da-451e-bd8e-fae26e931120';
const SEND_EMAIL_URL = 'https://functions.poehali.dev/2dab48c9-57c0-4f55-90e7-d93b326a6891';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  completed: 'Выполнено',
  extended: 'Срок продлен',
};

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

const OtipbDepartmentPage = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [greetingEnabled, setGreetingEnabled] = useState<boolean>(true);
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null);
  const greetingAlertRef = useRef<HTMLDivElement | null>(null);

  // Блоки начальника
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Активный блок
  const [activeBlock, setActiveBlock] = useState<'orders' | 'checklist' | 'workreport' | null>(null);

  // Чек-лист
  const [checklistDateFrom, setChecklistDateFrom] = useState('');
  const [checklistDateTo, setChecklistDateTo] = useState('');
  const [checklistRecipientFio, setChecklistRecipientFio] = useState('');
  const [checklistRecipientEmail, setChecklistRecipientEmail] = useState('');
  const [checklistRecipientId, setChecklistRecipientId] = useState('');
  const [sendingChecklist, setSendingChecklist] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Проделанная работа
  const [workReportDateFrom, setWorkReportDateFrom] = useState('');
  const [workReportDateTo, setWorkReportDateTo] = useState('');

  const checklistRef = useRef<HTMLDivElement>(null);

  const orgId = localStorage.getItem('organizationId') || '';
  const userFio = localStorage.getItem('userFio') || '';
  const userPosition = localStorage.getItem('userPosition') || '';
  const userDepartment = localStorage.getItem('userDepartment') || '';
  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userFio') || localStorage.getItem('userName') || 'Коллега';
    setUserName(storedUserName);

    if (!uid) { navigate('/'); return; }

    const department = localStorage.getItem('userDepartment');
    const dept = (department || '').toLowerCase();
    const access = dept.includes('отипб') || dept.includes('охрана труда') || dept.includes('от и пб') || dept.includes('от и пб') || department === 'ОТиПБ' || department === 'Отдел ОТиПБ';

    setHasAccess(access);

    const saved = localStorage.getItem(GREETING_KEY);
    setGreetingEnabled(saved === null ? true : saved === 'true');

    if (access) loadAllOrders();
  }, [navigate]);

  const loadAllOrders = async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      if (orgId) params.set('organization_id', orgId);
      const res = await apiFetch(`${OT_ORDERS_URL}?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setAllOrders(data.orders);
        setSpecialists(data.specialists || []);
      }
    } catch {
      toast.error('Ошибка загрузки поручений отдела');
    } finally {
      setLoadingOrders(false);
    }
  };

  const toggleGreeting = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !greetingEnabled;
    setGreetingEnabled(newVal);
    localStorage.setItem(GREETING_KEY, String(newVal));
    // Если выключили — сразу останавливаем вещание
    if (!newVal) {
      if (greetingAudioRef.current) {
        greetingAudioRef.current.pause();
        greetingAudioRef.current.currentTime = 0;
        greetingAudioRef.current = null;
      }
      if (greetingAlertRef.current) {
        greetingAlertRef.current.remove();
        greetingAlertRef.current = null;
      }
    }
  };

  const startWorkDay = async () => {
    if (!greetingEnabled) { navigate('/otipb-workspace'); return; }

    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour >= 6 && hour < 12) timeGreeting = 'Доброе утро';
    else if (hour >= 12 && hour < 18) timeGreeting = 'Добрый день';
    else if (hour >= 18 && hour < 23) timeGreeting = 'Добрый вечер';
    else timeGreeting = 'Доброй ночи';

    const greetingText = `${timeGreeting}, ${userName}! Желаю вам отличного и продуктивного рабочего дня!`;

    const alertDiv = document.createElement('div');
    alertDiv.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black/70';
    alertDiv.innerHTML = `
      <div class="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500 rounded-2xl p-8 max-w-md shadow-2xl">
        <div class="flex flex-col items-center text-center gap-4">
          <div class="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-full">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-white">Приветствие</h3>
          <p class="text-lg text-slate-300">${greetingText}</p>
        </div>
      </div>
    `;
    document.body.appendChild(alertDiv);
    greetingAlertRef.current = alertDiv;

    try {
      const response = await apiFetch('https://functions.poehali.dev/6b198c7d-ed06-44c5-8e63-8647c67ebf53', {
        method: 'POST',
        body: JSON.stringify({ text: greetingText, voice: 'alena' })
      });
      const data = await response.json();
      if (data.success && data.audio) {
        const audioBlob = await fetch(`data:audio/mp3;base64,${data.audio}`).then(r => r.blob());
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        greetingAudioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          greetingAudioRef.current = null;
          if (greetingAlertRef.current) { greetingAlertRef.current.remove(); greetingAlertRef.current = null; }
          navigate('/otipb-workspace');
        };
        audio.play();
      } else {
        alertDiv.remove();
        greetingAlertRef.current = null;
        navigate('/otipb-workspace');
      }
    } catch {
      alertDiv.remove();
      greetingAlertRef.current = null;
      navigate('/otipb-workspace');
    }
  };

  // ─── Фильтрация ────────────────────────────────────────────────────────────
  const pendingAllOrders = allOrders.filter(o => o.status !== 'completed');
  const completedAllOrders = allOrders.filter(o => o.status === 'completed');

  const overdueCount = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return pendingAllOrders.filter(o => {
      const raw = o.extended_deadline || o.deadline;
      if (!raw) return false;
      const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d) < today;
    }).length;
  })();

  const checklistFilteredOrders = (() => {
    if (!checklistDateFrom && !checklistDateTo) return pendingAllOrders;
    return pendingAllOrders.filter(o => {
      const d = o.issued_date ? new Date(o.issued_date) : null;
      if (!d) return true;
      if (checklistDateFrom && d < new Date(checklistDateFrom)) return false;
      if (checklistDateTo && d > new Date(checklistDateTo + 'T23:59:59')) return false;
      return true;
    });
  })();

  const workReportFilteredOrders = (() => {
    if (!workReportDateFrom && !workReportDateTo) return completedAllOrders;
    return completedAllOrders.filter(o => {
      const d = o.updated_at ? new Date(o.updated_at) : (o.issued_date ? new Date(o.issued_date) : null);
      if (!d) return true;
      if (workReportDateFrom && d < new Date(workReportDateFrom)) return false;
      if (workReportDateTo && d > new Date(workReportDateTo + 'T23:59:59')) return false;
      return true;
    });
  })();

  // ─── HTML генераторы ────────────────────────────────────────────────────────
  const buildChecklistHtml = (recipientFio: string, recipientPosition?: string) => {
    const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const periodLabel = checklistDateFrom || checklistDateTo
      ? `${checklistDateFrom ? new Date(checklistDateFrom).toLocaleDateString('ru-RU') : '—'} — ${checklistDateTo ? new Date(checklistDateTo).toLocaleDateString('ru-RU') : '—'}`
      : '';
    const rows = checklistFilteredOrders.map((o, i) => {
      const docsHtml = (o.documents || []).length > 0
        ? (o.documents || []).map(d => `<a href="${d.file_url}" style="display:block;color:#2563eb;font-size:11px;text-decoration:underline;margin-bottom:2px;word-break:break-all">${d.file_name}</a>`).join('')
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
        <tr><td style="padding:6px 12px;color:#64748b;width:40%">Начальник отдела:</td><td style="padding:6px 12px;font-weight:600;color:#1e293b">${userFio || userName}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:6px 12px;color:#64748b">Должность:</td><td style="padding:6px 12px;font-weight:600;color:#1e293b">${userPosition || '—'}</td></tr>
        <tr><td style="padding:6px 12px;color:#64748b">Подразделение:</td><td style="padding:6px 12px;font-weight:600;color:#1e293b">${userDepartment}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:6px 12px;color:#64748b">Дата формирования:</td><td style="padding:6px 12px;font-weight:600;color:#1e293b">${date}</td></tr>
        <tr><td style="padding:6px 12px;color:#64748b">Кому передаётся:</td><td style="padding:6px 12px;font-weight:600;color:#f97316">${recipientFio || '—'}</td></tr>
        ${recipientPosition ? `<tr style="background:#f8fafc"><td style="padding:6px 12px;color:#64748b">Должность принимающего:</td><td style="padding:6px 12px;font-weight:600;color:#1e293b">${recipientPosition}</td></tr>` : ''}
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
                <tr><td style="padding:4px 0;color:#64748b;width:36%">ФИО:</td><td style="padding:4px 0;font-weight:600;color:#1e293b">${userFio || userName}</td></tr>
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
        <h1 style="font-size:22px;color:#1e293b;margin:0 0 4px">ПРОДЕЛАННАЯ РАБОТА ЗА ВАХТУ — ОТДЕЛ ОТиПБ</h1>
        <p style="color:#64748b;margin:0;font-size:14px">Сводные выполненные поручения всех специалистов</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
        <tr><td style="padding:5px 12px;color:#64748b;width:40%">Начальник отдела:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${userFio || userName}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:5px 12px;color:#64748b">Должность:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${userPosition || '—'}</td></tr>
        <tr><td style="padding:5px 12px;color:#64748b">Подразделение:</td><td style="padding:5px 12px;font-weight:600;color:#1e293b">${userDepartment}</td></tr>
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

  // ─── Скачать / распечатать / отправить ─────────────────────────────────────
  const fileDate = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');
  const recipientSpec = specialists.find(s => String(s.id) === checklistRecipientId);

  const printChecklist = () => {
    const html = buildChecklistHtml(checklistRecipientFio, recipientSpec?.position);
    const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Чек-лист передачи вахты</title>
    <style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}@media print{.no-print{display:none!important}body{padding:0}}</style>
    </head><body>
    <div class="no-print" style="text-align:center;margin-bottom:16px">
      <button onclick="window.print()" style="padding:10px 28px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">🖨️ Распечатать</button>
    </div>
    ${html}</body></html>`;
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(fullHtml);
    pw.document.close();
  };

  const downloadChecklistXlsx = (type: 'checklist' | 'workreport') => {
    const orders = type === 'checklist' ? checklistFilteredOrders : workReportFilteredOrders;
    const title = type === 'checklist' ? 'ЧЕК-ЛИСТ ПЕРЕДАЧИ ВАХТЫ — ОТДЕЛ ОТиПБ' : 'ПРОДЕЛАННАЯ РАБОТА ЗА ВАХТУ — ОТДЕЛ ОТиПБ';
    const info = [
      [title],
      ['Отдел ОТиПБ — сводные данные всех специалистов'],
      [],
      ['Начальник отдела:', userFio || userName],
      ['Должность:', userPosition || '—'],
      ['Подразделение:', userDepartment],
      ['Дата формирования:', new Date().toLocaleString('ru-RU')],
      [],
      [`Поручений: ${orders.length}`],
      [],
    ];
    const headers = ['№', 'Наименование поручения', 'Дата выдачи', 'Срок выполнения', 'Ответственный', 'Выдал поручение', 'Статус', 'Что сделано'];
    const rows = orders.map((o, i) => [
      i + 1, o.title,
      o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—',
      o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—',
      o.responsible_person, o.issued_by,
      STATUS_LABELS[o.status] || o.status,
      o.last_action || '—',
    ]);
    const wsData = [...info, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 4 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'checklist' ? 'Чек-лист вахты' : 'Проделанная работа');
    XLSX.writeFile(wb, `${type === 'checklist' ? 'чек-лист' : 'проделанная_работа'}_отдел_отипб_${fileDate}.xlsx`);
    toast.success('Excel-файл скачан');
  };

  const downloadChecklistPdf = async (type: 'checklist' | 'workreport') => {
    setDownloadingFormat(type + '-pdf');
    try {
      const html = type === 'checklist'
        ? buildChecklistHtml(checklistRecipientFio, recipientSpec?.position)
        : buildWorkReportHtml();
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
      const ratio = canvas.width / canvas.height;
      const imgH = pdfW / ratio;
      let yPos = 0; let remainH = imgH;
      while (remainH > 0) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yPos, pdfW, imgH);
        yPos += pdfH; remainH -= pdfH;
      }
      pdf.save(`${type === 'checklist' ? 'чек-лист' : 'проделанная_работа'}_отдел_отипб_${fileDate}.pdf`);
      toast.success('PDF-файл скачан');
    } catch {
      toast.error('Ошибка создания PDF');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const printWorkReport = () => {
    const html = buildWorkReportHtml();
    const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Проделанная работа</title>
    <style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}@media print{.no-print{display:none!important}body{padding:0}}</style>
    </head><body>
    <div class="no-print" style="text-align:center;margin-bottom:16px">
      <button onclick="window.print()" style="padding:10px 28px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">🖨️ Распечатать</button>
    </div>
    ${html}</body></html>`;
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(fullHtml);
    pw.document.close();
  };

  const sendChecklistEmail = async () => {
    if (!checklistRecipientEmail.trim()) { toast.error('Укажите email получателя'); return; }
    setSendingChecklist(true);
    try {
      const checklistBody = buildChecklistHtml(checklistRecipientFio, recipientSpec?.position);
      const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Чек-лист передачи вахты</title>
        <style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}</style>
        </head><body>${checklistBody}</body></html>`;
      const res = await apiFetch(SEND_EMAIL_URL, {
        method: 'POST',
        body: JSON.stringify({
          to: checklistRecipientEmail,
          subject: `Чек-лист передачи вахты — Отдел ОТиПБ — ${new Date().toLocaleDateString('ru-RU')}`,
          html,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Чек-лист отправлен на почту');
      } else {
        toast.error(`Ошибка отправки: ${data.error || ''}`);
      }
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
      const checklistHtml = buildChecklistHtml(checklistRecipientFio, spec?.position);
      const encoded = btoa(unescape(encodeURIComponent(checklistHtml)));
      const msgText = `📋 Чек-лист передачи вахты (Отдел ОТиПБ) от ${userFio || userName}\nНевыполненных поручений по отделу: ${pendingAllOrders.length}\nДата: ${new Date().toLocaleDateString('ru-RU')}\n[CHECKLIST_DATA:${encoded}]`;
      const res = await apiFetch(OT_ORDERS_URL, {
        method: 'POST',
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

  // ─── Рендер ────────────────────────────────────────────────────────────────
  if (hasAccess === null) return null;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button onClick={() => navigate('/additional')} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
              <Icon name="ArrowLeft" size={20} className="mr-2" />Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-red-600 to-orange-600 p-3 rounded-xl shadow-lg">
                <Icon name="ShieldAlert" size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Отдел ОТиПБ</h1>
            </div>
          </div>
          <Card className="bg-slate-800/50 border-red-500/30 p-12">
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-600 to-orange-600 p-6 rounded-2xl shadow-lg inline-block mb-6">
                <Icon name="ShieldX" size={64} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Доступ запрещён</h2>
              <p className="text-slate-400 text-lg">У вас нет допуска на страницу отдела ОТиПБ</p>
              <p className="text-slate-500 text-sm mt-4">Данная страница доступна только сотрудникам подразделения ОТиПБ</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <UserProfileCard className="mb-4" />

        {/* Шапка */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/additional')} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
              <Icon name="ArrowLeft" size={20} className="mr-2" />Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-red-600 to-orange-600 p-3 rounded-xl shadow-lg">
                <Icon name="ShieldAlert" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Отдел ОТиПБ</h1>
                <p className="text-slate-400 text-sm mt-1">Охрана труда и промышленная безопасность</p>
              </div>
            </div>
          </div>
          <button
            onClick={toggleGreeting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
              greetingEnabled
                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                : 'border-slate-600/50 bg-slate-700/30 text-slate-500 hover:bg-slate-700/50'
            }`}
          >
            <Icon name={greetingEnabled ? 'Volume2' : 'VolumeX'} size={18} />
            <span>{greetingEnabled ? 'Приветствие вкл.' : 'Приветствие выкл.'}</span>
          </button>
        </div>

        {/* Кнопки запуска рабочего стола */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card
            onClick={startWorkDay}
            className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-blue-500/30 hover:border-blue-500 transition-all hover:scale-105 hover:shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="p-8 relative z-10">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform">
                  <Icon name="Briefcase" size={40} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mb-2">Начать рабочий день</h3>
                  <p className="text-sm text-slate-400">Открыть рабочий стол специалиста</p>
                  {greetingEnabled && (
                    <p className="text-xs text-cyan-500/70 mt-1 flex items-center justify-center gap-1">
                      <Icon name="Volume2" size={12} />Голосовое приветствие
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
          </Card>

          <Card
            onClick={() => navigate('/otipb-additional-directions')}
            className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-red-500/30 hover:border-red-500 transition-all hover:scale-105 hover:shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-orange-600 opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="p-8 relative z-10">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="bg-gradient-to-br from-red-600 to-orange-600 p-6 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform">
                  <Icon name="Layers" size={40} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors mb-2">Дополнительные направления</h3>
                  <p className="text-sm text-slate-400">Инструктажи, проверки, происшествия, СИЗ, документы, аналитика</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
          </Card>

          <Card
            onClick={() => navigate('/workers-registry')}
            className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-emerald-500/30 hover:border-emerald-500 transition-all hover:scale-105 hover:shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-600 opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="p-8 relative z-10">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-6 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform">
                  <Icon name="Users" size={40} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors mb-2">Реестр работников</h3>
                  <p className="text-sm text-slate-400">QR-коды, карточки, поиск</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
          </Card>
        </div>

        {/* ═══ БЛОК: Управление отделом ═══════════════════════════════════════ */}
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-2 rounded-lg shadow">
            <Icon name="LayoutDashboard" size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Управление отделом ОТиПБ</h2>
          <Button onClick={loadAllOrders} variant="ghost" size="sm" className="text-slate-400 hover:text-white ml-2" title="Обновить данные">
            <Icon name="RefreshCw" size={16} className={loadingOrders ? 'animate-spin' : ''} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* Поручения от начальника */}
          <Card
            onClick={() => setActiveBlock(activeBlock === 'orders' ? null : 'orders')}
            className={`p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 group ${
              activeBlock === 'orders'
                ? 'bg-orange-900/30 border-orange-500'
                : 'bg-slate-800/50 border-orange-600/40 hover:border-orange-500'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Icon name="ClipboardList" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Поручения от начальника</p>
                <div className="text-4xl font-bold text-white">{loadingOrders ? '...' : allOrders.length}</div>
                <p className="text-orange-400 text-xs mt-1">Всего по отделу</p>
              </div>
            </div>
            {!loadingOrders && (
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-1 text-xs text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  Новые: {allOrders.filter(o => o.status === 'new').length}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Выполнено: {allOrders.filter(o => o.status === 'completed').length}
                </div>
                <div className="flex items-center gap-1 text-xs text-yellow-400">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                  Продлено: {allOrders.filter(o => o.status === 'extended').length}
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
            onClick={() => setActiveBlock(activeBlock === 'checklist' ? null : 'checklist')}
            className={`p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 group ${
              activeBlock === 'checklist'
                ? 'bg-violet-900/30 border-violet-500'
                : 'bg-slate-800/50 border-violet-600/40 hover:border-violet-500'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Icon name="ClipboardCheck" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Чек-лист передачи вахты</p>
                <div className="text-4xl font-bold text-white">{loadingOrders ? '...' : pendingAllOrders.length}</div>
                <p className="text-violet-400 text-xs mt-1">Невыполненных по отделу</p>
              </div>
            </div>
            {!loadingOrders && (
              <div className="mt-4 pt-4 border-t border-slate-700 space-y-1">
                {pendingAllOrders.length === 0 ? (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span>✅</span> Все поручения отдела выполнены
                  </p>
                ) : (
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <span>⚠️</span> {pendingAllOrders.length} пункт(ов) требуют передачи
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

          {/* Проделанная работа за вахту */}
          <Card
            onClick={() => setActiveBlock(activeBlock === 'workreport' ? null : 'workreport')}
            className={`p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 group ${
              activeBlock === 'workreport'
                ? 'bg-green-900/30 border-green-500'
                : 'bg-slate-800/50 border-green-600/40 hover:border-green-500'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Icon name="CheckSquare" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Проделанная работа за вахту</p>
                <div className="text-4xl font-bold text-white">{loadingOrders ? '...' : completedAllOrders.length}</div>
                <p className="text-green-400 text-xs mt-1">Выполненных по отделу</p>
              </div>
            </div>
            {!loadingOrders && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-400">
                  {completedAllOrders.length === 0
                    ? 'Выполненных поручений пока нет'
                    : `✅ ${completedAllOrders.length} поручений выполнено специалистами`}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* ─── Раскрывающийся блок: Поручения от начальника ─────────────────── */}
        {activeBlock === 'orders' && (
          <Card className="mb-6 bg-slate-800/50 border-orange-500/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="ClipboardList" size={20} className="text-orange-400" />
                Поручения отдела ОТиПБ — все специалисты
              </h3>
              <Button onClick={() => setActiveBlock(null)} variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <Icon name="X" size={18} />
              </Button>
            </div>

            {/* Аналитика по специалистам */}
            <div className="mb-6 p-4 bg-slate-700/20 rounded-xl border border-slate-600/30">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="BarChart2" size={16} className="text-orange-400" />
                <span className="text-sm font-semibold text-white">Аналитика по специалистам</span>
              </div>
              <OtipbAnalyticsBlock
                orders={allOrders}
                specialists={specialists}
                loading={loadingOrders}
                orgId={orgId}
                backUrl="/otipb-department"
                canManage={false}
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
                userFio={userFio || userName}
                onOrdersCreated={loadAllOrders}
              />
            </div>

            {loadingOrders ? (
              <div className="text-center py-8 text-slate-400">Загрузка...</div>
            ) : allOrders.length === 0 ? (
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
                    {allOrders.map((o, i) => {
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const raw = o.extended_deadline || o.deadline;
                      const isOverdue = o.status !== 'completed' && raw && (() => {
                        const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
                        return new Date(y, m - 1, d) < today;
                      })();
                      return (
                        <tr key={o.id} className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-800/30'}`}>
                          <td className="py-2 px-3 text-white font-medium max-w-xs">
                            <div className="truncate" title={o.title}>{o.title}</div>
                          </td>
                          <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                            {o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—'}
                          </td>
                          <td className={`py-2 px-3 whitespace-nowrap font-medium ${isOverdue ? 'text-red-400' : 'text-slate-300'}`}>
                            {o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}
                            {o.extended_deadline && (
                              <div className="text-xs text-yellow-400">→ {new Date(o.extended_deadline).toLocaleDateString('ru-RU')}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-300 max-w-[140px]">
                            <div className="truncate" title={o.responsible_person}>{o.responsible_person}</div>
                          </td>
                          <td className="py-2 px-3 text-slate-400 max-w-[120px]">
                            <div className="truncate" title={o.issued_by}>{o.issued_by}</div>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
                              o.status === 'completed' ? 'bg-green-600/20 text-green-300 border-green-500/40' :
                              o.status === 'extended' ? 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40' :
                              isOverdue ? 'bg-red-600/20 text-red-300 border-red-500/40' :
                              'bg-blue-600/20 text-blue-300 border-blue-500/40'
                            }`}>
                              {isOverdue && o.status !== 'completed' ? 'Просрочено' : STATUS_LABELS[o.status] || o.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-xs max-w-[160px]">
                            <div className="truncate" title={o.last_action || ''}>{o.last_action || '—'}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {allOrders.length > 0 && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
                <Button
                  onClick={() => {
                    const w = window.open('', '_blank');
                    if (!w) return;
                    const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const rows = allOrders.map((o, i) => {
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const raw = o.extended_deadline || o.deadline;
                      const isOverdue = o.status !== 'completed' && raw && (() => {
                        const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
                        return new Date(y, m - 1, d) < today;
                      })();
                      const statusLabel = isOverdue && o.status !== 'completed' ? 'Просрочено' : STATUS_LABELS[o.status] || o.status;
                      const statusColor = o.status === 'completed' ? '#16a34a' : isOverdue ? '#dc2626' : o.status === 'extended' ? '#d97706' : '#2563eb';
                      return `<tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc' : ''}">
                        <td style="padding:8px 10px;font-weight:600;vertical-align:top">${i + 1}. ${o.title}</td>
                        <td style="padding:8px 10px;vertical-align:top;white-space:nowrap">${o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—'}</td>
                        <td style="padding:8px 10px;vertical-align:top;white-space:nowrap">${o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}</td>
                        <td style="padding:8px 10px;vertical-align:top">${o.responsible_person}</td>
                        <td style="padding:8px 10px;vertical-align:top">${o.issued_by}</td>
                        <td style="padding:8px 10px;vertical-align:top;color:${statusColor};font-weight:600">${statusLabel}</td>
                        <td style="padding:8px 10px;vertical-align:top;font-size:12px;color:#64748b">${o.last_action || '—'}</td>
                      </tr>`;
                    }).join('');
                    w.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Поручения — ${now}</title>
                      <style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1e293b}h1{font-size:20px;margin:0 0 4px}.sub{color:#64748b;font-size:13px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f97316;color:#fff;padding:9px 10px;text-align:left;font-weight:700}@media print{body{padding:10px}}</style>
                    </head><body>
                    <div style="text-align:center;margin-bottom:16px"><button onclick="window.print()" style="padding:10px 28px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer" class="no-print">🖨️ Распечатать</button></div>
                      <h1>Поручения отдела ОТиПБ</h1>
                      <div class="sub">Сформировано: ${now} · Всего: ${allOrders.length}</div>
                      <table><thead><tr><th>Поручение</th><th>Дата выдачи</th><th>Срок</th><th>Ответственный</th><th>Выдал</th><th>Статус</th><th>Что сделано</th></tr></thead>
                      <tbody>${rows}</tbody></table>
                    </body></html>`);
                    w.document.close();
                    w.onload = () => setTimeout(() => w.print(), 300);
                  }}
                  variant="outline"
                  className="border-orange-600/50 text-orange-400 hover:bg-orange-600/10"
                  size="sm"
                >
                  <Icon name="Printer" size={16} className="mr-2" />Распечатать
                </Button>
                <Button
                  onClick={() => {
                    const info = [
                      ['ПОРУЧЕНИЯ ОТДЕЛА ОТиПБ'],
                      ['Охрана труда и промышленная безопасность'],
                      [],
                      ['Начальник отдела:', userFio || userName],
                      ['Дата формирования:', new Date().toLocaleString('ru-RU')],
                      ['Всего поручений:', allOrders.length],
                      [],
                    ];
                    const headers = ['№', 'Поручение', 'Дата выдачи', 'Срок', 'Ответственный', 'Выдал', 'Статус', 'Что сделано'];
                    const rows = allOrders.map((o, i) => [i + 1, o.title, o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—', o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—', o.responsible_person, o.issued_by, STATUS_LABELS[o.status] || o.status, o.last_action || '—']);
                    const ws = XLSX.utils.aoa_to_sheet([...info, headers, ...rows]);
                    ws['!cols'] = [{ wch: 4 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 50 }];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Поручения');
                    XLSX.writeFile(wb, `поручения_отдел_отипб_${fileDate}.xlsx`);
                    toast.success('Excel-файл скачан');
                  }}
                  variant="outline"
                  className="border-green-600/50 text-green-400 hover:bg-green-600/10"
                  size="sm"
                >
                  <Icon name="FileSpreadsheet" size={16} className="mr-2" />Excel
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* ─── Раскрывающийся блок: Чек-лист передачи вахты ──────────────────── */}
        {activeBlock === 'checklist' && (
          <Card className="mb-6 bg-slate-800/50 border-violet-500/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="ClipboardCheck" size={20} className="text-violet-400" />
                Чек-лист передачи вахты — невыполненные поручения отдела
              </h3>
              <Button onClick={() => setActiveBlock(null)} variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <Icon name="X" size={18} />
              </Button>
            </div>

            {/* Фильтр по датам */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Период с</Label>
                <Input
                  type="date"
                  value={checklistDateFrom}
                  onChange={e => setChecklistDateFrom(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Период по</Label>
                <Input
                  type="date"
                  value={checklistDateTo}
                  onChange={e => setChecklistDateTo(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Получатель */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Сменщик (из списка специалистов)</Label>
                <select
                  value={checklistRecipientId}
                  onChange={e => {
                    setChecklistRecipientId(e.target.value);
                    const spec = specialists.find(s => String(s.id) === e.target.value);
                    if (spec) setChecklistRecipientFio(spec.fio);
                    else setChecklistRecipientFio('');
                  }}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm"
                >
                  <option value="">— выбрать —</option>
                  {specialists.map(s => (
                    <option key={s.id} value={s.id}>{s.fio} {s.position ? `(${s.position})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">ФИО принимающего (или вручную)</Label>
                <Input
                  value={checklistRecipientFio}
                  onChange={e => setChecklistRecipientFio(e.target.value)}
                  placeholder="ФИО сменщика"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Email для отправки</Label>
                <Input
                  value={checklistRecipientEmail}
                  onChange={e => setChecklistRecipientEmail(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Список невыполненных */}
            {pendingAllOrders.length === 0 ? (
              <div className="text-center py-6 text-green-400 font-semibold">
                ✅ Все поручения отдела выполнены. Передача в штатном режиме.
              </div>
            ) : (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs">
                      <th className="text-left py-2 px-3">Поручение</th>
                      <th className="text-left py-2 px-3 whitespace-nowrap">Срок</th>
                      <th className="text-left py-2 px-3">Ответственный</th>
                      <th className="text-left py-2 px-3">Статус</th>
                      <th className="text-left py-2 px-3">На чём остановились</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklistFilteredOrders.map((o, i) => (
                      <tr key={o.id} className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-800/30'}`}>
                        <td className="py-2 px-3 text-white font-medium max-w-xs">
                          <div className="truncate" title={o.title}>{o.title}</div>
                        </td>
                        <td className="py-2 px-3 text-red-400 whitespace-nowrap text-xs">
                          {o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}
                          {o.extended_deadline && <div className="text-yellow-400">→ {new Date(o.extended_deadline).toLocaleDateString('ru-RU')}</div>}
                        </td>
                        <td className="py-2 px-3 text-slate-300 max-w-[140px]">
                          <div className="truncate" title={o.responsible_person}>{o.responsible_person}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
                            o.status === 'extended' ? 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40' : 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                          }`}>{STATUS_LABELS[o.status] || o.status}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-xs max-w-[160px]">
                          <div className="truncate italic" title={o.last_action || ''}>{o.last_action || 'Не указано'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
              <Button onClick={printChecklist} variant="outline" className="border-violet-600/50 text-violet-400 hover:bg-violet-600/10" size="sm">
                <Icon name="Printer" size={16} className="mr-2" />Распечатать
              </Button>
              <Button onClick={() => downloadChecklistXlsx('checklist')} variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-600/10" size="sm">
                <Icon name="FileSpreadsheet" size={16} className="mr-2" />Excel
              </Button>
              <Button
                onClick={() => downloadChecklistPdf('checklist')}
                disabled={downloadingFormat === 'checklist-pdf'}
                variant="outline" className="border-red-600/50 text-red-400 hover:bg-red-600/10" size="sm"
              >
                <Icon name="FileText" size={16} className="mr-2" />
                {downloadingFormat === 'checklist-pdf' ? 'Создание...' : 'PDF'}
              </Button>
              <Button
                onClick={sendChecklistEmail}
                disabled={sendingChecklist}
                variant="outline" className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10" size="sm"
              >
                <Icon name="Mail" size={16} className="mr-2" />
                {sendingChecklist ? 'Отправка...' : 'На почту'}
              </Button>
              <Button
                onClick={sendChecklistInternal}
                disabled={sendingChecklist || !checklistRecipientId}
                variant="outline" className="border-cyan-600/50 text-cyan-400 hover:bg-cyan-600/10" size="sm"
              >
                <Icon name="MessageSquare" size={16} className="mr-2" />
                {sendingChecklist ? 'Отправка...' : 'Сменщику в системе'}
              </Button>
            </div>
          </Card>
        )}

        {/* ─── Раскрывающийся блок: Проделанная работа ───────────────────────── */}
        {activeBlock === 'workreport' && (
          <Card className="mb-6 bg-slate-800/50 border-green-500/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="CheckSquare" size={20} className="text-green-400" />
                Проделанная работа за вахту — выполненные поручения отдела
              </h3>
              <Button onClick={() => setActiveBlock(null)} variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <Icon name="X" size={18} />
              </Button>
            </div>

            {/* Фильтр по датам */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Период с</Label>
                <Input
                  type="date"
                  value={workReportDateFrom}
                  onChange={e => setWorkReportDateFrom(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Период по</Label>
                <Input
                  type="date"
                  value={workReportDateTo}
                  onChange={e => setWorkReportDateTo(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Список выполненных */}
            {completedAllOrders.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                Выполненных поручений за выбранный период нет
              </div>
            ) : (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs">
                      <th className="text-left py-2 px-3">Поручение</th>
                      <th className="text-left py-2 px-3 whitespace-nowrap">Дата выдачи</th>
                      <th className="text-left py-2 px-3 whitespace-nowrap">Срок</th>
                      <th className="text-left py-2 px-3">Ответственный</th>
                      <th className="text-left py-2 px-3">Выдал</th>
                      <th className="text-left py-2 px-3">Что сделано</th>
                      <th className="text-left py-2 px-3">Документы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workReportFilteredOrders.map((o, i) => (
                      <tr key={o.id} className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-800/30'}`}>
                        <td className="py-2 px-3 text-white font-medium max-w-xs">
                          <div className="truncate" title={o.title}>{o.title}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                          {o.issued_date ? new Date(o.issued_date).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                          {o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-300 max-w-[140px]">
                          <div className="truncate" title={o.responsible_person}>{o.responsible_person}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-400 max-w-[120px]">
                          <div className="truncate" title={o.issued_by}>{o.issued_by}</div>
                        </td>
                        <td className="py-2 px-3 text-green-400 text-xs max-w-[160px]">
                          <div className="truncate italic" title={o.last_action || ''}>{o.last_action || '—'}</div>
                        </td>
                        <td className="py-2 px-3">
                          {(o.documents || []).length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {o.documents.map(d => (
                                <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer"
                                  className="text-blue-400 text-xs underline truncate max-w-[120px]" title={d.file_name}>
                                  {d.file_name}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
              <Button onClick={printWorkReport} variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-600/10" size="sm">
                <Icon name="Printer" size={16} className="mr-2" />Распечатать
              </Button>
              <Button onClick={() => downloadChecklistXlsx('workreport')} variant="outline" className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10" size="sm">
                <Icon name="FileSpreadsheet" size={16} className="mr-2" />Excel
              </Button>
              <Button
                onClick={() => downloadChecklistPdf('workreport')}
                disabled={downloadingFormat === 'workreport-pdf'}
                variant="outline" className="border-red-600/50 text-red-400 hover:bg-red-600/10" size="sm"
              >
                <Icon name="FileText" size={16} className="mr-2" />
                {downloadingFormat === 'workreport-pdf' ? 'Создание...' : 'PDF'}
              </Button>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
};

export default OtipbDepartmentPage;