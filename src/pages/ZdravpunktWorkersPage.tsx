import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const API = 'https://functions.poehali.dev/9dcd6f1a-ad53-4c5e-af05-0fd74e20e8b4';

interface SubStat {
  subdivision: string;
  vakhta: number;
  mezhvakhta: number;
  other: number;
  total: number;
  esmo_passed: number;
  esmo_not_passed: number;
  not_admitted: number;
  evaded: number;
}

interface Worker {
  id: number;
  fio: string;
  worker_number: string;
  subdivision: string;
  position: string;
  company: string;
  shift_type: string;
  esmo_passed?: boolean;
  last_exam_date?: string;
  last_result?: string;
  violations_count?: number;
}

type DrillType = 'total' | 'vakhta' | 'mezhvakhta' | 'esmo_passed' | 'esmo_not_passed' | 'not_admitted' | 'evaded';

interface DrillState {
  subdivision: string;
  type: DrillType;
  title: string;
}

const ZdravpunktWorkersPage = () => {
  const navigate = useNavigate();
  const orgId = localStorage.getItem('organizationId') || '';
  const effectiveOrgId = localStorage.getItem('zdravpunkt_contractor_org_id') || orgId;

  const [stats, setStats] = useState<SubStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [drillWorkers, setDrillWorkers] = useState<Worker[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fioFilter, setFioFilter] = useState('');
  const [fioInput, setFioInput] = useState('');

  const totalAll = stats.reduce((s, r) => s + r.total, 0);
  const totalVakhta = stats.reduce((s, r) => s + r.vakhta, 0);
  const totalMezhvakhta = stats.reduce((s, r) => s + r.mezhvakhta, 0);
  const hasFilters = !!(dateFrom || dateTo || fioFilter);

  const buildUrl = useCallback((df: string, dt: string, fio: string) => {
    let url = `${API}?action=esmo_sub_stats&organization_id=${effectiveOrgId}`;
    if (df) url += `&date_from=${df}`;
    if (dt) url += `&date_to=${dt}`;
    if (fio) url += `&fio=${encodeURIComponent(fio)}`;
    return url;
  }, [effectiveOrgId]);

  const loadStats = useCallback(async (df = '', dt = '', fio = '') => {
    setLoading(true);
    setDrill(null);
    try {
      const res = await fetch(buildUrl(df, dt, fio));
      const data = await res.json();
      if (data.success) {
        setStats(data.stats || []);
      } else {
        toast.error('Ошибка получения данных');
      }
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadStats(); }, [effectiveOrgId]);

  const applyFilters = () => {
    setFioFilter(fioInput);
    loadStats(dateFrom, dateTo, fioInput);
  };

  const resetFilters = () => {
    setDateFrom(''); setDateTo(''); setFioFilter(''); setFioInput('');
    loadStats();
  };

  const openDrill = async (subdivision: string, type: DrillType) => {
    const labels: Record<DrillType, string> = {
      total: 'Все работники', vakhta: 'Вахта', mezhvakhta: 'Межвахта',
      esmo_passed: 'Прошли ЭСМО', esmo_not_passed: 'Не проходили ЭСМО',
      not_admitted: 'Не допущены', evaded: 'Уклонились',
    };
    setDrill({ subdivision, type, title: labels[type] });
    setSearch('');
    setDrillLoading(true);
    setDrillWorkers([]);
    try {
      let url = `${API}?action=esmo_workers_detail&organization_id=${effectiveOrgId}&subdivision=${encodeURIComponent(subdivision)}`;
      if (type === 'vakhta') url += `&shift_filter=${encodeURIComponent('Вахта')}`;
      else if (type === 'mezhvakhta') url += `&shift_filter=${encodeURIComponent('Межвахта')}`;
      else if (type === 'esmo_passed') url += `&esmo_filter=passed&shift_filter=${encodeURIComponent('Вахта')}`;
      else if (type === 'esmo_not_passed') url += `&esmo_filter=not_passed&shift_filter=${encodeURIComponent('Вахта')}`;
      else if (type === 'not_admitted') url += `&esmo_filter=not_admitted`;
      else if (type === 'evaded') url += `&esmo_filter=evaded`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (fioFilter) url += `&fio=${encodeURIComponent(fioFilter)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setDrillWorkers(data.workers || []);
    } catch {
      toast.error('Ошибка загрузки списка');
    } finally {
      setDrillLoading(false);
    }
  };

  const filtered = (drillWorkers || []).filter(w =>
    !search || w.fio.toLowerCase().includes(search.toLowerCase()) ||
    (w.position || '').toLowerCase().includes(search.toLowerCase())
  );

  // Форматирование даты для отображения
  const fmtDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y}`;
  };

  // Строка периода из фильтра
  const periodLabel = dateFrom || dateTo
    ? `${dateFrom ? fmtDate(dateFrom) : '...'} — ${dateTo ? fmtDate(dateTo) : '...'}`
    : '';

  // Что показывать в колонке "Дата ЭСМО"
  const esmoDateCell = (w: Worker) => {
    if (w.esmo_passed && w.last_exam_date) return fmtDate(w.last_exam_date);
    if (!w.esmo_passed && periodLabel) return `Не проходил за период: ${periodLabel}`;
    return '—';
  };

  const exportXLSX = () => {
    if (!drill || filtered.length === 0) return;
    const rows = filtered.map((w, i) => ({
      '№': i + 1, 'ФИО': w.fio, 'Таб. №': w.worker_number || '',
      'Подразделение': w.subdivision || '', 'Должность': w.position || '',
      'Компания': w.company || '', 'Тип вахты': w.shift_type || '',
      'ЭСМО': w.esmo_passed ? 'Прошёл' : 'Не проходил',
      'Дата ЭСМО': esmoDateCell(w),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Список');
    XLSX.writeFile(wb, `${drill.subdivision}_${drill.title}.xlsx`);
  };

  const printList = () => {
    if (!drill) return;
    const periodInfo = periodLabel ? `Период ЭСМО: ${periodLabel}` : 'Период ЭСМО: не указан';
    const html = `<html><head><title>${drill.subdivision} — ${drill.title}</title>
    <style>body{font-family:Arial,sans-serif;font-size:11px;padding:16px}h2{font-size:13px;margin-bottom:2px}
    p{margin:0 0 6px;color:#555}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:3px 7px;text-align:left}th{background:#f0f0f0;font-weight:bold}
    tr:nth-child(even){background:#fafafa}.no-esmo{color:#c00}</style></head>
    <body>
    <h2>${drill.subdivision} — ${drill.title}</h2>
    <p>${periodInfo}</p>
    <p>Всего: ${filtered.length} чел.</p>
    <table><thead><tr><th>#</th><th>ФИО</th><th>Таб. №</th><th>Должность</th><th>Вахта</th><th>ЭСМО</th><th>Дата ЭСМО / Период</th></tr></thead>
    <tbody>${filtered.map((w, i) =>
      `<tr><td>${i+1}</td><td>${w.fio}</td><td>${w.worker_number||'—'}</td><td>${w.position||'—'}</td><td>${w.shift_type||'—'}</td><td>${w.esmo_passed?'Прошёл':'<span class="no-esmo">Не проходил</span>'}</td><td>${esmoDateCell(w)}</td></tr>`
    ).join('')}</tbody></table></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const shiftBadge = (s: string) => {
    if (s === 'Вахта') return 'bg-blue-900/40 border-blue-700/40 text-blue-300';
    if (s === 'Межвахта') return 'bg-purple-900/40 border-purple-700/40 text-purple-300';
    return 'bg-slate-700/40 border-slate-600/40 text-slate-400';
  };

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-teal-900/50 to-slate-900/80 border-b border-teal-700/30 pl-20 pr-6 py-3 flex-shrink-0">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/zdravpunkt')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition">
                <Icon name="ArrowLeft" size={18} />
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <Icon name="Users" size={19} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">Общий список работников</h1>
                <p className="text-teal-400 text-xs">Рабочий стол Здравпункта</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!loading && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="text-white font-bold text-base">{totalAll}</span> чел. в
                  <span className="text-white font-semibold">{stats.length}</span> подразд.
                  {hasFilters && <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-600/30 border border-amber-600/50 text-amber-400 text-xs">фильтр</span>}
                </div>
              )}
              <button onClick={() => loadStats(dateFrom, dateTo, fioFilter)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition">
                <Icon name="RefreshCw" size={15} />
              </button>
            </div>
          </div>

          {/* Фильтры */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Период ЭСМО с</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">по</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-[300px]">
              <label className="text-xs text-slate-400">Поиск по ФИО</label>
              <input type="text" placeholder="Введите ФИО..." value={fioInput}
                onChange={e => setFioInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
            </div>
            <button onClick={applyFilters}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition">
              <Icon name="Search" size={14} /> Применить
            </button>
            {hasFilters && (
              <button onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white text-sm transition">
                <Icon name="X" size={14} /> Сбросить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Итого — полоса под шапкой */}
      {!loading && stats.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-2 border-b border-slate-800/60 bg-slate-900/40 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5">
            <Icon name="Users" size={13} className="text-teal-400" />
            <span className="text-slate-400 text-xs">Всего:</span>
            <span className="text-white font-bold text-sm">{totalAll}</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700/40 rounded-lg px-3 py-1.5">
            <span className="text-slate-400 text-xs">Вахта:</span>
            <span className="text-blue-300 font-bold text-sm">{totalVakhta}</span>
          </div>
          <div className="flex items-center gap-2 bg-purple-900/30 border border-purple-700/40 rounded-lg px-3 py-1.5">
            <span className="text-slate-400 text-xs">Межвахта:</span>
            <span className="text-purple-300 font-bold text-sm">{totalMezhvakhta}</span>
          </div>
          <span className="text-slate-600 text-xs ml-auto">{stats.length} подразд.</span>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Основная область — карточки */}
        <div className={`overflow-y-auto p-4 transition-all duration-300 ${drill ? 'flex-1' : 'w-full'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Icon name="Loader" size={32} className="animate-spin text-teal-400" />
            </div>
          ) : stats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Icon name="Users" size={40} className="text-slate-600 mb-3" />
              <p className="text-slate-400">Нет данных о работниках.<br />Загрузите список в разделе «Загрузки».</p>
            </div>
          ) : (
            /* Карточки — фиксированная ширина 260px, до 5 в ряд, авто-перенос */
            <div className="flex flex-wrap gap-3 content-start">
              {stats.map(s => (
                <SubCard
                  key={s.subdivision}
                  stat={s}
                  activeDrillType={drill?.subdivision === s.subdivision ? drill.type : null}
                  onDrill={(type) => openDrill(s.subdivision, type)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Правая панель — детали */}
        {drill && (
          <div className="w-[480px] flex-shrink-0 border-l border-slate-700/50 bg-slate-900/70 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
              <div className="flex items-start justify-between mb-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-bold text-sm truncate leading-tight">{drill.subdivision}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${
                    drill.type === 'esmo_passed' ? 'text-green-400' :
                    drill.type === 'esmo_not_passed' ? 'text-red-400' :
                    drill.type === 'not_admitted' ? 'text-orange-400' :
                    drill.type === 'evaded' ? 'text-amber-400' :
                    drill.type === 'vakhta' ? 'text-blue-400' :
                    drill.type === 'mezhvakhta' ? 'text-purple-400' : 'text-teal-400'
                  }`}>{drill.title}</p>
                  {periodLabel && (
                    <p className="text-amber-400 text-xs mt-0.5 flex items-center gap-1">
                      <Icon name="Calendar" size={11} /> Период: {periodLabel}
                    </p>
                  )}
                  {!periodLabel && (
                    <p className="text-slate-600 text-xs mt-0.5">Период ЭСМО не задан</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button onClick={exportXLSX} title="Сохранить в Excel"
                    className="p-1.5 rounded-lg bg-green-800/40 border border-green-700/40 text-green-400 hover:bg-green-700/50 transition">
                    <Icon name="FileSpreadsheet" size={14} />
                  </button>
                  <button onClick={printList} title="Печать"
                    className="p-1.5 rounded-lg bg-slate-700/50 border border-slate-600/40 text-slate-400 hover:text-white transition">
                    <Icon name="Printer" size={14} />
                  </button>
                  <button onClick={() => setDrill(null)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition">
                    <Icon name="X" size={14} />
                  </button>
                </div>
              </div>
              <input type="text" placeholder="Поиск по ФИО, должности..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
              {!drillLoading && <p className="text-slate-500 text-xs mt-1">{filtered.length} чел.</p>}
            </div>

            <div className="flex-1 overflow-y-auto">
              {drillLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Icon name="Loader" size={22} className="animate-spin text-teal-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">Список пуст</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-amber-300 font-semibold border-b border-slate-700/50 w-7">#</th>
                      <th className="px-3 py-2 text-left text-amber-300 font-semibold border-b border-slate-700/50">ФИО</th>
                      <th className="px-3 py-2 text-left text-amber-300 font-semibold border-b border-slate-700/50">Должность</th>
                      <th className="px-3 py-2 text-left text-amber-300 font-semibold border-b border-slate-700/50">ЭСМО</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filtered.map((w, i) => (
                      <tr key={w.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-2 text-slate-600">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="text-white font-medium">{w.fio}</div>
                          {w.shift_type && (
                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs border ${shiftBadge(w.shift_type)}`}>
                              {w.shift_type}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-400 max-w-[120px]">
                          <span className="truncate block">{w.position || '—'}</span>
                        </td>
                        <td className="px-3 py-2">
                          {w.last_result === 'not_admitted' ? (
                            <div>
                              <span className="inline-flex items-center gap-0.5 text-orange-400 font-medium">
                                <Icon name="XOctagon" size={12} /> Не допущен
                              </span>
                              {w.last_exam_date && <div className="text-slate-500 text-xs mt-0.5">{fmtDate(w.last_exam_date)}</div>}
                              {(w.violations_count ?? 0) > 1 && <div className="text-orange-500/70 text-xs">{w.violations_count} раз(а)</div>}
                            </div>
                          ) : w.last_result === 'evaded' ? (
                            <div>
                              <span className="inline-flex items-center gap-0.5 text-amber-400 font-medium">
                                <Icon name="UserX" size={12} /> Уклонился
                              </span>
                              {w.last_exam_date && <div className="text-slate-500 text-xs mt-0.5">{fmtDate(w.last_exam_date)}</div>}
                              {(w.violations_count ?? 0) > 1 && <div className="text-amber-500/70 text-xs">{w.violations_count} раз(а)</div>}
                            </div>
                          ) : w.esmo_passed ? (
                            <div>
                              <span className="inline-flex items-center gap-0.5 text-green-400 font-medium">
                                <Icon name="CheckCircle" size={12} /> Прошёл
                              </span>
                              {w.last_exam_date && (
                                <div className="text-slate-500 text-xs mt-0.5">{fmtDate(w.last_exam_date)}</div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-0.5 text-red-400 font-medium">
                                <Icon name="XCircle" size={12} /> Не проходил
                              </span>
                              {periodLabel && (
                                <div className="text-slate-500 text-xs mt-0.5">{periodLabel}</div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Карточка подразделения ─── */
interface SubCardProps {
  stat: SubStat;
  activeDrillType: DrillType | null;
  onDrill: (type: DrillType) => void;
}

const SubCard = ({ stat, activeDrillType, onDrill }: SubCardProps) => {
  const isActive = activeDrillType !== null;
  const esmoPercent = stat.vakhta > 0 ? Math.round((stat.esmo_passed / stat.vakhta) * 100) : 0;

  return (
    <div style={{ width: '260px', flexShrink: 0 }} className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
      isActive ? 'border-teal-500/60 shadow-lg shadow-teal-900/20' : 'border-slate-700/60 hover:border-slate-600'
    } bg-slate-800/50`}>

      {/* Название подразделения */}
      <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700/50 flex items-center gap-1.5">
        <Icon name="Building2" size={12} className="text-teal-400 flex-shrink-0" />
        <span className="text-white text-xs font-semibold leading-tight line-clamp-2">{stat.subdivision}</span>
      </div>

      {/* Верхний ряд: Всего / Вахта / Межвахта */}
      <div className="grid grid-cols-3 gap-px bg-slate-700/30 border-b border-slate-700/50">
        <MiniTile label="Всего" value={stat.total} color="white"
          active={activeDrillType === 'total'} onClick={() => onDrill('total')} />
        <MiniTile label="Вахта" value={stat.vakhta} color="blue"
          active={activeDrillType === 'vakhta'} onClick={() => onDrill('vakhta')} />
        <MiniTile label="Межвахта" value={stat.mezhvakhta} color="purple"
          active={activeDrillType === 'mezhvakhta'} onClick={() => onDrill('mezhvakhta')} />
      </div>

      {/* Нижний блок: ЭСМО */}
      <div className="p-2 space-y-1.5">
        {/* Прошло / Не проходили */}
        <div className="grid grid-cols-2 gap-1.5">
          <BigTile
            label="Прошло ЭСМО"
            value={stat.esmo_passed}
            color="green"
            active={activeDrillType === 'esmo_passed'}
            onClick={() => onDrill('esmo_passed')}
          />
          <BigTile
            label="Не проходили"
            value={stat.esmo_not_passed}
            color="red"
            active={activeDrillType === 'esmo_not_passed'}
            onClick={() => onDrill('esmo_not_passed')}
          />
        </div>

        {/* Не допущен / Уклонился */}
        <div className="grid grid-cols-2 gap-1.5">
          <BigTile
            label="Не допущен"
            value={stat.not_admitted ?? 0}
            color="orange"
            active={activeDrillType === 'not_admitted'}
            onClick={() => onDrill('not_admitted')}
          />
          <BigTile
            label="Уклонился"
            value={stat.evaded ?? 0}
            color="amber"
            active={activeDrillType === 'evaded'}
            onClick={() => onDrill('evaded')}
          />
        </div>

        {/* Прогресс охвата */}
        {stat.vakhta > 0 && (
          <div className="pt-0.5">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Охват вахты</span>
              <span className={esmoPercent === 100 ? 'text-green-400' : esmoPercent >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                {esmoPercent}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                esmoPercent === 100 ? 'bg-green-500' : esmoPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`} style={{ width: `${esmoPercent}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Маленький тайл (Всего/Вахта/Межвахта) ─── */
const MINI_COLORS: Record<string, { bg: string; act: string; val: string }> = {
  white:  { bg: 'bg-slate-700/40 hover:bg-slate-700/70',    act: 'bg-slate-600/70',    val: 'text-white' },
  blue:   { bg: 'bg-blue-900/20 hover:bg-blue-900/40',      act: 'bg-blue-800/60',     val: 'text-blue-300' },
  purple: { bg: 'bg-purple-900/20 hover:bg-purple-900/40',  act: 'bg-purple-800/60',   val: 'text-purple-300' },
};

interface MiniTileProps {
  label: string; value: number; color: string; active: boolean; onClick: () => void;
}

const MiniTile = ({ label, value, color, active, onClick }: MiniTileProps) => {
  const c = MINI_COLORS[color];
  return (
    <button onClick={onClick}
      className={`py-2 px-1 text-center cursor-pointer transition-all select-none ${active ? c.act : c.bg}`}>
      <div className={`text-lg font-bold leading-none ${c.val}`}>{value}</div>
      <div className="text-slate-400 text-xs mt-0.5">{label}</div>
    </button>
  );
};

/* ─── Большой тайл ЭСМО ─── */
const BIG_COLORS: Record<string, { bg: string; act: string; border: string; val: string }> = {
  green:  { bg: 'bg-green-900/30 hover:bg-green-900/50',   act: 'bg-green-800/60',  border: 'border-green-700/50',  val: 'text-green-400' },
  red:    { bg: 'bg-red-900/30 hover:bg-red-900/50',       act: 'bg-red-800/60',    border: 'border-red-700/50',    val: 'text-red-400' },
  orange: { bg: 'bg-orange-900/30 hover:bg-orange-900/50', act: 'bg-orange-800/60', border: 'border-orange-700/50', val: 'text-orange-400' },
  amber:  { bg: 'bg-amber-900/30 hover:bg-amber-900/50',   act: 'bg-amber-800/60',  border: 'border-amber-700/50',  val: 'text-amber-400' },
};

interface BigTileProps {
  label: string; value: number; color: string; active: boolean; onClick: () => void;
}

const BigTile = ({ label, value, color, active, onClick }: BigTileProps) => {
  const c = BIG_COLORS[color];
  return (
    <button onClick={onClick}
      className={`rounded-xl border py-3 px-2 text-center cursor-pointer transition-all select-none w-full ${c.border} ${active ? c.act : c.bg}`}>
      <div className={`text-3xl font-bold leading-none mb-1 ${c.val}`}>{value}</div>
      <div className="text-slate-400 text-xs leading-tight">{label}</div>
    </button>
  );
};

export default ZdravpunktWorkersPage;