import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const API = 'https://functions.poehali.dev/85a795aa-16f4-4214-8690-191bbd6e73d2';
const SHEET = 'Периодичность МО';
const COL_SHORT = 'Наименование (краткое)';
const COL_FULL  = 'Полное наименование';
const TITLE = 'Наименование профессий, должность проходящих МО 1раз в 2 года рудник «Бадран»';

interface Row {
  id: number;
  short: string;
  full: string;
}

const PeriodichnostMOPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editShort, setEditShort] = useState('');
  const [editFull, setEditFull] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingRow, setAddingRow] = useState(false);
  const [newShort, setNewShort] = useState('');
  const [newFull, setNewFull] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?action=list&sheet=${encodeURIComponent(SHEET)}`);
      const data = await res.json();
      if (data.success) {
        setRows((data.workers || []).map((w: { id: number; fio: string; extra_data?: Record<string, string> }) => ({
          id: w.id,
          short: w.extra_data?.[COL_SHORT] || w.fio || '',
          full:  w.extra_data?.[COL_FULL]  || '',
        })));
      }
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  };

  // ── Начать редактирование строки ──────────────────────────────────────────
  const startEdit = (row: Row) => {
    setEditingId(row.id);
    setEditShort(row.short);
    setEditFull(row.full);
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_row', id,
          fio: editShort,
          extra_data: { [COL_SHORT]: editShort, [COL_FULL]: editFull }
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Сохранено');
        setEditingId(null);
        setRows(prev => prev.map(r => r.id === id ? { ...r, short: editShort, full: editFull } : r));
      }
    } catch { toast.error('Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  // ── Удалить строку ────────────────────────────────────────────────────────
  const deleteRow = async (id: number) => {
    if (!confirm('Удалить строку безвозвратно?')) return;
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_row', id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Строка удалена');
        setRows(prev => prev.filter(r => r.id !== id));
      }
    } catch { toast.error('Ошибка удаления'); }
  };

  // ── Добавить строку ───────────────────────────────────────────────────────
  const addRow = async () => {
    if (!newShort.trim()) { toast.error('Введите наименование'); return; }
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_row',
          sheet_name: SHEET,
          fio: newShort.trim(),
          extra_data: { [COL_SHORT]: newShort.trim(), [COL_FULL]: newFull.trim() }
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Строка добавлена');
        setNewShort(''); setNewFull('');
        setAddingRow(false);
        loadData();
      }
    } catch { toast.error('Ошибка добавления'); }
    finally { setSaving(false); }
  };

  // ── Выгрузка в Excel ──────────────────────────────────────────────────────
  const exportExcel = () => {
    const data = rows.map((r, i) => ({
      '№': i + 1,
      'Наименование профессии, должность': r.short,
      'Полное наименование': r.full,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 4 }, { wch: 45 }, { wch: 65 }];

    // Добавляем заголовок над таблицей
    XLSX.utils.sheet_add_aoa(ws, [[TITLE]], { origin: 'A1' });
    XLSX.utils.sheet_add_json(ws, data, { origin: 'A2' });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Периодичность МО');
    XLSX.writeFile(wb, 'периодичность_МО.xlsx');
  };

  // ── Печать ────────────────────────────────────────────────────────────────
  const printTable = () => {
    const rowsHtml = rows.map((r, i) => `
      <tr>
        <td>${i + 1}.</td>
        <td>${r.short}</td>
        <td>${r.full}</td>
      </tr>`).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>${TITLE}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
        h2 { font-size: 11pt; font-weight: bold; text-align: center; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 5px 8px; vertical-align: top; }
        th { background: #f0f0f0; font-weight: bold; text-align: center; }
        td:first-child { width: 8%; text-align: center; white-space: nowrap; }
        td:nth-child(2) { width: 38%; }
        td:nth-child(3) { width: 54%; }
        tr:nth-child(even) { background: #fafafa; }
      </style></head>
      <body>
        <h2>${TITLE}</h2>
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Наименование профессии, должность</th>
              <th>Полное наименование</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
      </html>`);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Шапка */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
              <Icon name="ArrowLeft" size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Периодичность МО</h1>
              <p className="text-slate-400 text-xs">Медицинские осмотры 1 раз в 2 года · {rows.length} позиций</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportExcel} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Icon name="Download" size={15} className="mr-1" /> Выгрузить Excel
            </Button>
            <Button variant="outline" size="sm" onClick={printTable} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Icon name="Printer" size={15} className="mr-1" /> Печать
            </Button>
            <Button size="sm" onClick={() => setAddingRow(true)} className="bg-cyan-600 hover:bg-cyan-700">
              <Icon name="Plus" size={15} className="mr-1" /> Добавить строку
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Заголовок таблицы */}
        <div className="bg-gradient-to-r from-cyan-900/40 to-slate-800 border border-cyan-700/40 rounded-xl px-5 py-3 mb-4 text-center">
          <p className="text-cyan-200 font-semibold text-sm leading-snug">{TITLE}</p>
        </div>

        {/* Форма добавления */}
        {addingRow && (
          <div className="bg-slate-800 border border-cyan-600/40 rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-slate-400 text-xs mb-1 block">Наименование (краткое) *</label>
              <Input value={newShort} onChange={e => setNewShort(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white h-8 text-sm"
                placeholder="Начальник цеха" autoFocus />
            </div>
            <div className="flex-1">
              <label className="text-slate-400 text-xs mb-1 block">Полное наименование</label>
              <Input value={newFull} onChange={e => setNewFull(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white h-8 text-sm"
                placeholder="Начальник цеха 5 разряда" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addRow} disabled={saving} className="bg-green-600 hover:bg-green-700 h-8">
                {saving ? <Icon name="Loader" size={14} className="animate-spin mr-1" /> : null}
                Сохранить
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAddingRow(false); setNewShort(''); setNewFull(''); }}
                className="border-slate-600 text-slate-300 h-8">
                Отмена
              </Button>
            </div>
          </div>
        )}

        {/* Таблица */}
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Icon name="Loader" size={32} className="animate-spin" />
          </div>
        ) : (
          <div ref={tableRef} className="rounded-xl border border-slate-700 overflow-hidden shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="text-center p-3 text-slate-400 font-medium w-12">№</th>
                  <th className="text-left p-3 text-slate-400 font-medium w-2/5">Наименование профессии, должность</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Полное наименование</th>
                  <th className="p-3 w-20 text-slate-400 font-medium text-center">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-700/50 transition ${
                      idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/40'
                    } ${editingId === row.id ? 'bg-cyan-950/30' : ''}`}
                  >
                    <td className="p-3 text-center text-slate-500 text-xs font-mono">{idx + 1}</td>

                    {editingId === row.id ? (
                      <>
                        <td className="p-2">
                          <Input value={editShort} onChange={e => setEditShort(e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white h-8 text-sm" autoFocus />
                        </td>
                        <td className="p-2">
                          <Input value={editFull} onChange={e => setEditFull(e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => saveEdit(row.id)} disabled={saving}
                              className="p-1.5 rounded bg-green-600 hover:bg-green-500 text-white transition" title="Сохранить">
                              {saving ? <Icon name="Loader" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                            </button>
                            <button onClick={cancelEdit}
                              className="p-1.5 rounded bg-slate-600 hover:bg-slate-500 text-white transition" title="Отмена">
                              <Icon name="X" size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-white font-medium">{row.short}</td>
                        <td className="p-3 text-slate-300">{row.full || <span className="text-slate-600 italic">—</span>}</td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => startEdit(row)}
                              className="p-1.5 rounded hover:bg-blue-600/30 text-slate-400 hover:text-blue-300 transition" title="Редактировать">
                              <Icon name="Edit" size={14} />
                            </button>
                            <button onClick={() => deleteRow(row.id)}
                              className="p-1.5 rounded hover:bg-red-600/30 text-slate-400 hover:text-red-400 transition" title="Удалить">
                              <Icon name="Trash2" size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <Icon name="TableProperties" size={32} className="mx-auto mb-2 opacity-40" />
                      Список пуст
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-slate-600 text-xs mt-3 text-center">
          Нажмите на иконку карандаша для редактирования строки · Изменения сохраняются в базе данных безвозвратно
        </p>
      </div>
    </div>
  );
};

export default PeriodichnostMOPage;
