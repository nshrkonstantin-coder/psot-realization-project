import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import PageLockBadge from '@/components/ui/PageLockBadge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const API = 'https://functions.poehali.dev/85a795aa-16f4-4214-8690-191bbd6e73d2';
const SHEET = 'Периодичность МО';
const COL_SHORT = 'Наименование (краткое)';
const COL_FULL  = 'Полное наименование';
const TITLE_KEY = 'mo_table_title';
const DEFAULT_TITLE = 'Наименование профессий, должность проходящих МО 1раз в 2 года рудник «Бадран»';

interface Row { id: number; short: string; full: string; }

const PeriodichnostMOPage = () => {
  const navigate = useNavigate();
  const [rows, setRows]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // Заголовок
  const [title, setTitle]               = useState(() => localStorage.getItem(TITLE_KEY) || DEFAULT_TITLE);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]     = useState('');

  // Редактирование строки
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editShort, setEditShort] = useState('');
  const [editFull,  setEditFull]  = useState('');
  const [saving, setSaving]       = useState(false);

  // Добавление строки
  const [addingRow, setAddingRow] = useState(false);
  const [newShort,  setNewShort]  = useState('');
  const [newFull,   setNewFull]   = useState('');

  // Drag state (pointer-based)
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const rowsRef                 = useRef<Row[]>([]);
  const reorderTimer            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tbodyRef                = useRef<HTMLTableSectionElement>(null);

  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}?action=list&sheet=${encodeURIComponent(SHEET)}`);
      const data = await res.json();
      if (data.success) {
        setRows((data.workers || []).map((w: { id: number; fio: string; extra_data?: Record<string, string> }) => ({
          id:    w.id,
          short: w.extra_data?.[COL_SHORT] || w.fio || '',
          full:  w.extra_data?.[COL_FULL]  || '',
        })));
      }
    } catch { toast.error('Ошибка загрузки'); }
    finally  { setLoading(false); }
  };

  const saveOrder = (newRows: Row[]) => {
    if (reorderTimer.current) clearTimeout(reorderTimer.current);
    reorderTimer.current = setTimeout(() => {
      const orders = newRows.map((r, i) => ({ id: r.id, sort_order: i + 1 }));
      fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', orders })
      }).catch(() => toast.error('Ошибка сохранения порядка'));
    }, 600);
  };

  const getRowIdxFromY = useCallback((clientY: number): number | null => {
    if (!tbodyRef.current) return null;
    const trs = Array.from(tbodyRef.current.querySelectorAll('tr'));
    for (let i = 0; i < trs.length; i++) {
      const rect = trs[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return i;
    }
    return null;
  }, []);

  const onPointerDown = (e: React.PointerEvent, idx: number) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragFrom(idx);
    setDragOver(idx);
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const toIdx = getRowIdxFromY(e.clientY);
    if (toIdx !== null) setDragOver(toIdx);
  }, [getRowIdxFromY]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    setDragFrom(prev => {
      if (prev === null) return null;
      const toIdx = getRowIdxFromY(e.clientY);
      if (toIdx !== null && toIdx !== prev) {
        const newRows = [...rowsRef.current];
        const [moved] = newRows.splice(prev, 1);
        newRows.splice(toIdx, 0, moved);
        setRows(newRows);
        saveOrder(newRows);
      }
      setDragOver(null);
      return null;
    });
  }, [getRowIdxFromY]);

  // ── Заголовок ─────────────────────────────────────────────────────────────
  const startEditTitle = () => { setTitleDraft(title); setEditingTitle(true); };
  const saveTitle = () => {
    const t = titleDraft.trim() || DEFAULT_TITLE;
    setTitle(t);
    localStorage.setItem(TITLE_KEY, t);
    setEditingTitle(false);
    toast.success('Заголовок сохранён');
  };

  // ── Редактирование строки ─────────────────────────────────────────────────
  const startEdit = (row: Row) => { setEditingId(row.id); setEditShort(row.short); setEditFull(row.full); };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      const res  = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    finally  { setSaving(false); }
  };

  // ── Удалить строку ────────────────────────────────────────────────────────
  const deleteRow = async (id: number) => {
    if (!confirm('Удалить строку безвозвратно?')) return;
    try {
      const res  = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_row', id })
      });
      const data = await res.json();
      if (data.success) { toast.success('Удалено'); setRows(prev => prev.filter(r => r.id !== id)); }
    } catch { toast.error('Ошибка'); }
  };

  // ── Добавить строку в конец ───────────────────────────────────────────────
  const addRow = async () => {
    if (!newShort.trim()) { toast.error('Введите наименование'); return; }
    setSaving(true);
    try {
      const res  = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_row', sheet_name: SHEET,
          fio: newShort.trim(),
          extra_data: { [COL_SHORT]: newShort.trim(), [COL_FULL]: newFull.trim() }
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Добавлено');
        setNewShort(''); setNewFull(''); setAddingRow(false);
        loadData();
      }
    } catch { toast.error('Ошибка'); }
    finally  { setSaving(false); }
  };

  // ── Excel ─────────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const wb  = XLSX.utils.book_new();
    const aoa: (string | number)[][] = [
      [title], [],
      ['№', 'Наименование должности', 'Расшифровка должностей'],
      ...rows.map((r, i) => [i + 1, r.short, r.full])
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 4 }, { wch: 40 }, { wch: 60 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSX.utils.book_append_sheet(wb, ws, 'Периодичность МО');
    XLSX.writeFile(wb, 'периодичность_МО.xlsx');
  };

  // ── Печать ────────────────────────────────────────────────────────────────
  const printTable = () => {
    const rowsHtml = rows.map((r, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${r.short}</td>
        <td>${r.full || ''}</td>
      </tr>`).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 9.5pt; color: #000; }
        .title { font-size: 11pt; font-weight: bold; margin-bottom: 10px; line-height: 1.3; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px 7px; vertical-align: top; }
        th { background: #e8e8e8; font-weight: bold; text-align: center; }
        td.num { text-align: center; width: 5%; white-space: nowrap; }
        th:nth-child(1){width:5%} th:nth-child(2){width:35%} th:nth-child(3){width:60%}
        tr:nth-child(even) td { background: #f9f9f9; }
      </style></head><body>
        <div class="title">${title}</div>
        <table>
          <thead><tr><th>№</th><th>Наименование должности</th><th>Расшифровка должностей</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),600)}</script>
      </html>`);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">

      {/* Шапка */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
              <Icon name="ArrowLeft" size={20} />
            </button>
            <div>
              <h1 className="text-base font-bold text-white">Периодичность МО</h1>
              <p className="text-slate-400 text-xs">{rows.length} позиций · МО 1 раз в 2 года</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <PageLockBadge pageKey="Периодичность МО" defaultLocked={true} />
            <Button variant="outline" size="sm" onClick={exportExcel} className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8">
              <Icon name="Download" size={14} className="mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={printTable} className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8">
              <Icon name="Printer" size={14} className="mr-1" /> Печать
            </Button>
            <Button size="sm" onClick={() => setAddingRow(true)} className="bg-cyan-600 hover:bg-cyan-700 h-8">
              <Icon name="Plus" size={14} className="mr-1" /> Добавить строку
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">

        {/* Редактируемый заголовок */}
        <div className="mb-4">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                className="bg-slate-800 border-cyan-500 text-white font-semibold text-sm flex-1 h-9" autoFocus />
              <button onClick={saveTitle} className="p-2 rounded bg-green-600 hover:bg-green-500 text-white transition">
                <Icon name="Check" size={16} />
              </button>
              <button onClick={() => setEditingTitle(false)} className="p-2 rounded bg-slate-600 hover:bg-slate-500 text-white transition">
                <Icon name="X" size={16} />
              </button>
            </div>
          ) : (
            <div className="group flex items-start gap-2 cursor-pointer" onClick={startEditTitle}>
              <div className="border-l-4 border-cyan-500 pl-3 py-1 flex-1">
                <p className="text-white font-bold text-base leading-snug group-hover:text-cyan-300 transition">{title}</p>
              </div>
              <Icon name="Pencil" size={14} className="text-slate-500 group-hover:text-cyan-400 transition mt-1 flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Форма добавления */}
        {addingRow && (
          <div className="bg-slate-800 border border-cyan-600/50 rounded-lg p-3 mb-4">
            <p className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">Новая строка — добавится в конец списка</p>
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-48">
                <label className="text-slate-400 text-xs mb-1 block">Наименование должности *</label>
                <Input value={newShort} onChange={e => setNewShort(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white h-8 text-sm" placeholder="Начальник цеха"
                  autoFocus onKeyDown={e => e.key === 'Enter' && addRow()} />
              </div>
              <div className="flex-1 min-w-64">
                <label className="text-slate-400 text-xs mb-1 block">Расшифровка должности</label>
                <Input value={newFull} onChange={e => setNewFull(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white h-8 text-sm" placeholder="Полное наименование..."
                  onKeyDown={e => e.key === 'Enter' && addRow()} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addRow} disabled={saving} className="bg-green-600 hover:bg-green-700 h-8">
                  {saving ? <Icon name="Loader" size={13} className="animate-spin mr-1" /> : <Icon name="Check" size={13} className="mr-1" />}
                  Сохранить
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingRow(false); setNewShort(''); setNewFull(''); }}
                  className="border-slate-600 text-slate-300 h-8">Отмена</Button>
              </div>
            </div>
          </div>
        )}

        {/* Таблица */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Icon name="Loader" size={32} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="rounded-lg border border-slate-700 overflow-hidden shadow-xl">
            <table className="w-full text-sm select-none" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-slate-700 border-b border-slate-600">
                  <th className="w-8 p-2 border-r border-slate-600"></th>
                  <th className="text-center p-3 text-slate-200 font-bold border-r border-slate-600 w-12">№</th>
                  <th className="text-center p-3 text-slate-200 font-bold border-r border-slate-600 w-[35%]">Наименование&nbsp;должности</th>
                  <th className="text-center p-3 text-slate-200 font-bold">Расшифровка должностей</th>
                  <th className="p-3 w-20 border-l border-slate-600"></th>
                </tr>
              </thead>
              <tbody
                ref={tbodyRef}
                onPointerMove={dragFrom !== null ? onPointerMove : undefined}
                onPointerUp={dragFrom !== null ? onPointerUp : undefined}
                onPointerCancel={() => { setDragFrom(null); setDragOver(null); }}
              >
                {rows.map((row, idx) => {
                  const isActive     = dragFrom === idx;
                  const isDropTarget = dragOver === idx && dragFrom !== null && dragFrom !== idx;

                  return (
                    <tr
                      key={row.id}
                      className={[
                        'group border-b border-slate-700/60 transition-colors',
                        isActive      ? 'opacity-40 bg-cyan-900/30' :
                        isDropTarget  ? 'bg-cyan-800/20' :
                        idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/50',
                        editingId === row.id ? 'bg-cyan-950/40' :
                          (!isActive && !isDropTarget ? 'hover:bg-slate-800' : ''),
                        isDropTarget ? 'border-t-2 border-t-cyan-400' : '',
                      ].join(' ')}
                    >
                      {/* Ручка перетаскивания */}
                      <td
                        className="w-8 text-center border-r border-slate-700/50 select-none"
                        style={{ cursor: dragFrom !== null ? 'grabbing' : 'grab' }}
                        onPointerDown={editingId !== row.id ? (e) => onPointerDown(e, idx) : undefined}
                      >
                        <Icon name="GripVertical" size={16}
                          className={`mx-auto transition ${isActive ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-300'}`} />
                      </td>

                      {/* № */}
                      <td className="p-3 text-center border-r border-slate-700/50 text-slate-400 text-xs font-mono">
                        {idx + 1}
                      </td>

                      {editingId === row.id ? (
                        <>
                          <td className="p-2 border-r border-slate-700/50">
                            <Input value={editShort} onChange={e => setEditShort(e.target.value)}
                              className="bg-slate-800 border-cyan-600 text-white h-8 text-sm w-full" autoFocus />
                          </td>
                          <td className="p-2">
                            <Input value={editFull} onChange={e => setEditFull(e.target.value)}
                              className="bg-slate-800 border-cyan-600 text-white h-8 text-sm w-full"
                              onKeyDown={e => e.key === 'Enter' && saveEdit(row.id)} />
                          </td>
                          <td className="p-2 border-l border-slate-700/50">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => saveEdit(row.id)} disabled={saving}
                                className="p-1.5 rounded bg-green-600 hover:bg-green-500 text-white transition">
                                {saving ? <Icon name="Loader" size={13} className="animate-spin" /> : <Icon name="Check" size={13} />}
                              </button>
                              <button onClick={cancelEdit}
                                className="p-1.5 rounded bg-slate-600 hover:bg-slate-500 text-white transition">
                                <Icon name="X" size={13} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 border-r border-slate-700/50 text-white font-medium leading-snug">
                            {row.short}
                          </td>
                          <td className="p-3 text-slate-300 leading-snug">
                            {row.full || <span className="text-slate-600 italic text-xs">—</span>}
                          </td>
                          <td className="p-2 border-l border-slate-700/50">
                            <div className="flex gap-1 justify-center items-center opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => startEdit(row)}
                                className="p-1 rounded hover:bg-blue-600/30 text-slate-500 hover:text-blue-300 transition" title="Редактировать">
                                <Icon name="Pencil" size={13} />
                              </button>
                              <button onClick={() => deleteRow(row.id)}
                                className="p-1 rounded hover:bg-red-600/30 text-slate-500 hover:text-red-400 transition" title="Удалить">
                                <Icon name="Trash2" size={13} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <Icon name="Table" size={30} className="mx-auto mb-2 opacity-30" />
                      Список пуст — добавьте первую строку
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-slate-600 text-xs mt-3 text-right">
          Перетащите строку за иконку ⠿ слева · При наведении — редактирование и удаление
        </p>
      </div>
    </div>
  );
};

export default PeriodichnostMOPage;