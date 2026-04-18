import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const API = 'https://functions.poehali.dev/9dcd6f1a-ad53-4c5e-af05-0fd74e20e8b4';

interface SubdivisionStat {
  subdivision: string;
  vakhta: number;
  mezhvakhta: number;
  other: number;
  total: number;
}

interface Worker {
  id: number;
  fio: string;
  worker_number: string;
  subdivision: string;
  position: string;
  company: string;
  shift_type: string | null;
  created_at: string;
}

interface UploadedFile {
  id: number;
  file_name: string;
  rows_count: number;
  uploaded_at: string;
  file_size: number;
}

const ZdravpunktWorkersPage = () => {
  const navigate = useNavigate();
  const orgId = localStorage.getItem('organizationId') || '';
  const userRole = localStorage.getItem('userRole') || '';
  const isAdmin = userRole === 'superadmin' || userRole === 'admin';

  const [subStats, setSubStats] = useState<SubdivisionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [search, setSearch] = useState('');

  const effectiveOrgId = localStorage.getItem('zdravpunkt_contractor_org_id') || orgId;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wsRes, fRes] = await Promise.all([
        fetch(`${API}?action=workers_sub_stats&organization_id=${effectiveOrgId}`),
        fetch(`${API}?action=files&organization_id=${effectiveOrgId}`),
      ]);
      const wsData = await wsRes.json();
      const fData = await fRes.json();
      if (wsData.success) setSubStats(wsData.stats || []);
      if (fData.success) setFiles((fData.files || []).filter((f: { file_type: string }) => f.file_type === 'workers' || f.file_type === 'workers_list'));
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const openSubdivision = async (subdivision: string) => {
    setSelectedSub(subdivision);
    setSearch('');
    setWorkersLoading(true);
    try {
      const res = await fetch(`${API}?action=workers_list&organization_id=${effectiveOrgId}&subdivision=${encodeURIComponent(subdivision)}`);
      const data = await res.json();
      if (data.success) setWorkers(data.workers || []);
    } catch {
      toast.error('Ошибка загрузки работников');
    } finally {
      setWorkersLoading(false);
    }
  };

  const totalWorkers = subStats.reduce((s, r) => s + r.total, 0);
  const totalVakhta = subStats.reduce((s, r) => s + r.vakhta, 0);
  const totalMezhvakhta = subStats.reduce((s, r) => s + r.mezhvakhta, 0);

  const formatDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('ru'); } catch { return s; }
  };
  const formatSize = (b: number) => {
    if (!b) return '';
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} МБ`;
    return `${(b / 1024).toFixed(0)} КБ`;
  };

  const shiftColor = (s: string | null) => {
    if (s === 'Вахта') return 'text-blue-300 bg-blue-900/30 border-blue-700/40';
    if (s === 'Межвахта') return 'text-purple-300 bg-purple-900/30 border-purple-700/40';
    return 'text-slate-400 bg-slate-700/30 border-slate-600/40';
  };

  const filteredWorkers = workers.filter(w =>
    !search || w.fio.toLowerCase().includes(search.toLowerCase()) || w.position.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-teal-900/60 to-slate-900 border-b border-teal-700/40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/zdravpunkt')}
              className="text-slate-400 hover:text-white transition-colors">
              <Icon name="ArrowLeft" size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
              <Icon name="Users" size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Общий список работников</h1>
              <p className="text-teal-400 text-xs">Рабочий стол Здравпункта</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-white font-bold text-base">{totalWorkers}</span> чел. в {subStats.length} подразд.
              </div>
            )}
            <button onClick={loadData}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition">
              <Icon name="RefreshCw" size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Icon name="Loader" size={32} className="animate-spin text-teal-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Левая колонка — подразделения + файлы */}
            <div className="lg:col-span-1 space-y-4">

              {/* Итого */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-white font-bold text-xl">{totalWorkers}</div>
                  <div className="text-slate-400 text-xs mt-0.5">Всего</div>
                </div>
                <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl p-3 text-center">
                  <div className="text-blue-300 font-bold text-xl">{totalVakhta}</div>
                  <div className="text-slate-400 text-xs mt-0.5">Вахта</div>
                </div>
                <div className="bg-purple-900/30 border border-purple-700/40 rounded-xl p-3 text-center">
                  <div className="text-purple-300 font-bold text-xl">{totalMezhvakhta}</div>
                  <div className="text-slate-400 text-xs mt-0.5">Межвахта</div>
                </div>
              </div>

              {/* Подразделения */}
              <Card className="bg-slate-800/50 border-slate-700">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="Building2" size={15} className="text-teal-400" />
                    <span className="text-white font-semibold text-sm">Подразделения</span>
                  </div>
                  {subStats.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-8">
                      <Icon name="Building2" size={28} className="mx-auto mb-2 opacity-30" />
                      Нет загруженных списков
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subStats.map(s => (
                        <button
                          key={s.subdivision}
                          onClick={() => openSubdivision(s.subdivision)}
                          className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
                            selectedSub === s.subdivision
                              ? 'bg-teal-900/40 border-teal-600/60'
                              : 'bg-slate-700/30 border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm font-medium truncate ${selectedSub === s.subdivision ? 'text-teal-300' : 'text-white'}`}>
                              {s.subdivision}
                            </span>
                            <span className="text-white font-bold text-sm ml-2 shrink-0">{s.total}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-blue-400">Вахта: <b>{s.vakhta}</b></span>
                            <span className="text-slate-600">·</span>
                            <span className="text-xs text-purple-400">Межвахта: <b>{s.mezhvakhta}</b></span>
                            {s.other > 0 && (
                              <><span className="text-slate-600">·</span>
                              <span className="text-xs text-slate-500">Прочие: <b>{s.other}</b></span></>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Загруженные файлы */}
              <Card className="bg-slate-800/50 border-slate-700">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="FileSpreadsheet" size={15} className="text-green-400" />
                    <span className="text-white font-semibold text-sm">Загруженные файлы</span>
                  </div>
                  {files.length === 0 ? (
                    <div className="text-slate-500 text-xs text-center py-4">Файлы не загружались</div>
                  ) : (
                    <div className="space-y-1.5">
                      {files.map(f => (
                        <div key={f.id} className="flex items-start gap-2 bg-slate-700/40 rounded-lg px-3 py-2">
                          <Icon name="FileSpreadsheet" size={14} className="text-green-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-white text-xs font-medium truncate">{f.file_name}</div>
                            <div className="text-slate-400 text-xs">{f.rows_count} строк · {formatDate(f.uploaded_at)} · {formatSize(f.file_size)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Правая колонка — список работников */}
            <div className="lg:col-span-2">
              {!selectedSub ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
                    <Icon name="Users" size={28} className="text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm">Выберите подразделение слева<br/>чтобы увидеть список работников</p>
                </div>
              ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                  <div className="p-4 border-b border-slate-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-white font-bold">{selectedSub}</h2>
                        <p className="text-slate-400 text-xs">
                          {filteredWorkers.length} чел.
                          {subStats.find(s => s.subdivision === selectedSub) && (() => {
                            const s = subStats.find(s => s.subdivision === selectedSub)!;
                            return <> · <span className="text-blue-400">Вахта: {s.vakhta}</span> · <span className="text-purple-400">Межвахта: {s.mezhvakhta}</span></>;
                          })()}
                        </p>
                      </div>
                      <button onClick={() => setSelectedSub(null)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition">
                        <Icon name="X" size={16} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Поиск по ФИО или должности..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="overflow-auto max-h-[600px]">
                    {workersLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Icon name="Loader" size={24} className="animate-spin text-teal-400" />
                      </div>
                    ) : filteredWorkers.length === 0 ? (
                      <div className="text-slate-500 text-sm text-center py-10">Работники не найдены</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-800 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700 w-8">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700">ФИО</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700">Таб. №</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700">Должность</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700">Компания</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 border-b border-slate-700 min-w-[110px]">Вахта</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredWorkers.map((w, i) => (
                            <tr key={w.id} className="hover:bg-slate-800/40 transition">
                              <td className="px-4 py-2.5 text-slate-500 text-xs">{i + 1}</td>
                              <td className="px-4 py-2.5 text-white font-medium whitespace-nowrap">{w.fio}</td>
                              <td className="px-4 py-2.5 text-slate-400 text-xs">{w.worker_number || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-300 text-xs">{w.position || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-300 text-xs">{w.company || '—'}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${shiftColor(w.shift_type)}`}>
                                  {w.shift_type || '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZdravpunktWorkersPage;
