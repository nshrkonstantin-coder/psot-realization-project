import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const OT_ORDERS_URL = 'https://functions.poehali.dev/64c3f34b-05da-451e-bd8e-fae26e931120';

interface Specialist {
  id: number;
  fio: string;
  position: string;
}

interface ImportedRow {
  num?: string;
  title: string;
  notes?: string;
  _selected?: boolean;
  _assignedUserId?: string;
  _issuedDate?: string;   // дата выдачи из файла
  _deadline?: string;     // срок из файла
  _responsible?: string;  // ответственный из файла
}

interface ExcelOrdersImportProps {
  specialists: Specialist[];
  orgId: string;
  userId: string;
  userFio: string;
  onOrdersCreated: () => void;
}

const ExcelOrdersImport = ({ specialists: specialistsProp, orgId, userId, userFio, onOrdersCreated }: ExcelOrdersImportProps) => {
  const [importedRows, setImportedRows] = useState<ImportedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localSpecialists, setLocalSpecialists] = useState<Specialist[]>([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  // Общие поля для всех строк (можно переопределить на уровне строки)
  const [globalAssignedId, setGlobalAssignedId] = useState('');
  const [globalIssuedDate, setGlobalIssuedDate] = useState(new Date().toISOString().slice(0, 10));
  const [globalDeadline, setGlobalDeadline] = useState('');

  // Объединяем specialists из props и из собственного запроса
  const specialists = localSpecialists.length > 0 ? localSpecialists : (specialistsProp || []);

  // Загружаем specialists самостоятельно — не зависим от родителя
  useEffect(() => {
    const fetchSpecs = async () => {
      setLoadingSpecs(true);
      try {
        const url = orgId
          ? `${OT_ORDERS_URL}?action=manual_specialists&organization_id=${orgId}`
          : `${OT_ORDERS_URL}?action=manual_specialists`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.specialists?.length > 0) {
          // Ручной список
          setLocalSpecialists(data.specialists.filter((s: Specialist & { active?: boolean }) => s.active !== false));
        } else {
          // Ручных нет — берём из АСУБТ (общий GET)
          const url2 = orgId
            ? `${OT_ORDERS_URL}?organization_id=${orgId}`
            : `${OT_ORDERS_URL}`;
          const res2 = await fetch(url2);
          const data2 = await res2.json();
          if (data2.success && data2.specialists?.length > 0) {
            setLocalSpecialists(data2.specialists);
          }
        }
      } catch {
        // тихо игнорируем — props-список останется
      } finally {
        setLoadingSpecs(false);
      }
    };
    fetchSpecs();
  }, [orgId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i)) {
      toast.error('Загрузите Excel файл (.xlsx или .xls)');
      return;
    }
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];

      if (raw.length < 2) {
        toast.error('Файл пустой или содержит только заголовок');
        setImporting(false);
        return;
      }

      // Ищем строку заголовков
      const headerRow = raw[0].map(c => String(c).toLowerCase().trim());

      // Индексы колонок по форме: №, Поручение, Дата выдачи, Срок, Ответственный
      const numIdx    = headerRow.findIndex(h => h === '№' || h === 'n' || h === 'num' || h === 'п/п' || h === '№ п/п');
      const titleIdx  = headerRow.findIndex(h => h.includes('поручен') || h.includes('задан') || h.includes('наименован') || h.includes('название') || h === 'title');
      const dateIdx   = headerRow.findIndex(h => h.includes('дата') && (h.includes('выдач') || h.includes('начал') || h.includes('постановк')));
      const deadIdx   = headerRow.findIndex(h => h.includes('срок') || h.includes('deadline') || h.includes('исполнен') || (h.includes('дата') && h.includes('испол')));
      const respIdx   = headerRow.findIndex(h => h.includes('ответствен') || h.includes('исполнител') || h === 'responsible');
      const notesIdx  = headerRow.findIndex(h => h.includes('примечан') || h.includes('заметк') || h === 'notes' || h.includes('описан'));

      // Fallback: если заголовок «Поручение» не найден — берём второй столбец (первый — №)
      const tIdx = titleIdx >= 0 ? titleIdx : (numIdx >= 0 ? 1 : 0);

      const rows: ImportedRow[] = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        const title = String(row[tIdx] || '').trim();
        if (!title || title.toLowerCase() === 'поручение' || title.toLowerCase() === 'наименование') continue;

        const num = numIdx >= 0 ? String(row[numIdx] || '').trim() : String(i);
        const notes = notesIdx >= 0 ? String(row[notesIdx] || '').trim() : '';

        // Дата выдачи — парсим из Excel (может быть числом-датой или строкой)
        let issuedDate = '';
        if (dateIdx >= 0 && row[dateIdx]) {
          const raw_date = row[dateIdx];
          if (typeof raw_date === 'number') {
            // Excel serial date → JS Date
            const d = XLSX.SSF.parse_date_code(raw_date);
            if (d) issuedDate = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
          } else {
            const s = String(raw_date).trim();
            // Попробуем DD.MM.YYYY
            const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
            if (m) issuedDate = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
            else if (s.match(/^\d{4}-\d{2}-\d{2}$/)) issuedDate = s;
          }
        }

        // Срок
        let deadline = '';
        if (deadIdx >= 0 && row[deadIdx]) {
          const raw_dead = row[deadIdx];
          if (typeof raw_dead === 'number') {
            const d = XLSX.SSF.parse_date_code(raw_dead);
            if (d) deadline = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
          } else {
            const s = String(raw_dead).trim();
            const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
            if (m) deadline = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
            else if (s.match(/^\d{4}-\d{2}-\d{2}$/)) deadline = s;
          }
        }

        // Ответственный из файла
        const responsible = respIdx >= 0 ? String(row[respIdx] || '').trim() : '';

        rows.push({ num, title, notes, _selected: true, _issuedDate: issuedDate || undefined, _deadline: deadline || undefined, _responsible: responsible || undefined });
      }

      if (rows.length === 0) {
        toast.error('В файле не найдено ни одного поручения');
        setImporting(false);
        return;
      }

      setImportedRows(rows);
      toast.success(`Загружено ${rows.length} поручений из файла`);
    } catch {
      toast.error('Ошибка чтения файла');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleRow = (idx: number) => {
    setImportedRows(prev => prev.map((r, i) => i === idx ? { ...r, _selected: !r._selected } : r));
  };

  const updateRow = (idx: number, field: keyof ImportedRow, value: string | boolean) => {
    setImportedRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRow = (idx: number) => {
    setImportedRows(prev => prev.filter((_, i) => i !== idx));
  };

  const applyGlobalToSelected = () => {
    setImportedRows(prev => prev.map(r => {
      if (!r._selected) return r;
      return {
        ...r,
        _assignedUserId: globalAssignedId || r._assignedUserId,
        _issuedDate: globalIssuedDate || r._issuedDate,
        _deadline: globalDeadline || r._deadline,
      };
    }));
    toast.success('Параметры применены к выбранным строкам');
  };

  const handleSave = async () => {
    const selected = importedRows.filter(r => r._selected);
    if (selected.length === 0) {
      toast.error('Выберите хотя бы одно поручение для сохранения');
      return;
    }

    const missing = selected.filter(r => !r._deadline);
    if (missing.length > 0) {
      toast.error(`Укажите срок выполнения для всех поручений (не заполнено: ${missing.length})`);
      return;
    }

    setSaving(true);
    let created = 0;
    let failed = 0;

    for (const row of selected) {
      const assignedId = row._assignedUserId || globalAssignedId;
      const spec = specialists.find(s => String(s.id) === assignedId);
      // Ответственный: из назначенного специалиста, или из файла, или «Не назначен»
      const responsiblePerson = spec?.fio || row._responsible || 'Не назначен';
      const issuedDate = row._issuedDate || globalIssuedDate || new Date().toISOString().slice(0, 10);
      const deadline = row._deadline || globalDeadline;
      try {
        const res = await fetch(OT_ORDERS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: row.title,
            notes: row.notes || '',
            issued_date: issuedDate,
            deadline,
            responsible_person: responsiblePerson,
            issued_by: userFio,
            organization_id: orgId ? Number(orgId) : null,
            assigned_to_user_id: assignedId ? Number(assignedId) : null,
            created_by_user_id: userId ? Number(userId) : null,
          }),
        });
        const data = await res.json();
        if (data.success) created++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setSaving(false);

    if (created > 0) {
      toast.success(`Создано ${created} поручений${failed > 0 ? `, ошибок: ${failed}` : ''}`);
      // Убираем сохранённые строки из списка
      setImportedRows(prev => prev.filter(r => !r._selected));
      onOrdersCreated();
    } else {
      toast.error('Не удалось создать поручения');
    }
  };

  const downloadTemplate = () => {
    const today = new Date().toLocaleDateString('ru-RU');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['№', 'Поручение', 'Дата выдачи', 'Срок', 'Ответственный'],
      ['1', 'Проверить состояние пожарных щитов на участке 1', today, '', ''],
      ['2', 'Провести инструктаж по охране труда с персоналом', today, '', ''],
      ['3', 'Проверить наличие и комплектность аптечек', today, '', ''],
      ['4', 'Составить акт проверки рабочих мест', today, '', ''],
      ['5', '', '', '', ''],
      ['6', '', '', '', ''],
      ['7', '', '', '', ''],
      ['8', '', '', '', ''],
      ['9', '', '', '', ''],
      ['10', '', '', '', ''],
    ]);

    // Ширина колонок
    ws['!cols'] = [
      { wch: 5 },   // №
      { wch: 55 },  // Поручение
      { wch: 14 },  // Дата выдачи
      { wch: 14 },  // Срок
      { wch: 30 },  // Ответственный
    ];

    // Высота строк
    ws['!rows'] = [{ hpt: 22 }]; // заголовок

    // Стили заголовков (фон + жирный)
    const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1'];
    headerCells.forEach(addr => {
      if (ws[addr]) {
        ws[addr].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: 'F97316' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
          },
        };
      }
    });

    // Границы для строк данных
    for (let row = 2; row <= 11; row++) {
      ['A', 'B', 'C', 'D', 'E'].forEach(col => {
        const addr = `${col}${row}`;
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        ws[addr].s = {
          alignment: { vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } },
          },
        };
      });
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Поручения ОТиПБ');

    // Записываем с поддержкой стилей (xlsx не поддерживает стили в базовой версии, но структура сохранится)
    XLSX.writeFile(wb, 'шаблон_поручений_отипб.xlsx');
    toast.success('Шаблон скачан — заполните колонки и загрузите обратно');
  };

  const selectedCount = importedRows.filter(r => r._selected).length;

  return (
    <div className="space-y-5">
      {/* Зона загрузки */}
      <div className="border-2 border-dashed border-yellow-600/40 rounded-xl p-6 bg-yellow-900/10 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-yellow-600/20 p-3 rounded-xl">
            <Icon name="FileSpreadsheet" size={32} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-white font-semibold mb-1">Загрузить поручения из Excel</p>
            <p className="text-slate-400 text-xs mb-1">
              Формат файла: <b className="text-slate-300">№ · Поручение · Дата выдачи · Срок · Ответственный</b>
            </p>
            <p className="text-slate-500 text-xs mb-3">
              Скачайте шаблон, заполните и загрузите обратно. Даты в формате <b className="text-slate-400">ДД.ММ.ГГГГ</b>
            </p>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-import-input"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Icon name="Upload" size={16} className="mr-2" />
              {importing ? 'Читаю файл...' : importedRows.length > 0 ? 'Загрузить ещё' : 'Выбрать файл'}
            </Button>
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10"
            >
              <Icon name="Download" size={16} className="mr-2" />
              Скачать шаблон
            </Button>
          </div>
        </div>
      </div>

      {/* Таблица загруженных поручений */}
      {importedRows.length > 0 && (
        <>
          {/* Общие параметры для назначения */}
          <Card className="bg-slate-700/30 border-slate-600/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="Settings2" size={16} className="text-orange-400" />
              <span className="text-sm font-semibold text-white">Общие параметры для выбранных поручений</span>
              <span className="text-xs text-slate-400 ml-1">({selectedCount} выбрано)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">
                  Назначить специалисту
                  {loadingSpecs && <span className="text-slate-500 ml-1">(загрузка...)</span>}
                  {!loadingSpecs && specialists.length === 0 && <span className="text-red-400 ml-1">(список пуст)</span>}
                </Label>
                <select
                  value={globalAssignedId}
                  onChange={e => setGlobalAssignedId(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm"
                >
                  <option value="">— выбрать ({specialists.length}) —</option>
                  {specialists.map(s => (
                    <option key={s.id} value={s.id}>{s.fio}{s.position ? ` (${s.position})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Дата начала</Label>
                <Input
                  type="date"
                  value={globalIssuedDate}
                  onChange={e => setGlobalIssuedDate(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Срок выполнения <span className="text-red-400">*</span></Label>
                <Input
                  type="date"
                  value={globalDeadline}
                  onChange={e => setGlobalDeadline(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={applyGlobalToSelected}
                  variant="outline"
                  className="border-orange-600/50 text-orange-400 hover:bg-orange-600/10 w-full"
                  size="sm"
                >
                  <Icon name="CheckCheck" size={15} className="mr-1" />
                  Применить к выбранным
                </Button>
              </div>
            </div>
          </Card>

          {/* Список строк */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300 font-medium flex items-center gap-2">
                <Icon name="List" size={15} className="text-yellow-400" />
                Загруженные поручения ({importedRows.length})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportedRows(prev => prev.map(r => ({ ...r, _selected: true })))}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Выбрать все
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={() => setImportedRows(prev => prev.map(r => ({ ...r, _selected: false })))}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Снять все
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {importedRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 transition-all ${
                    row._selected
                      ? 'bg-slate-700/50 border-yellow-600/40'
                      : 'bg-slate-800/30 border-slate-700/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Чекбокс */}
                    <button
                      onClick={() => toggleRow(idx)}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        row._selected
                          ? 'bg-yellow-500 border-yellow-500'
                          : 'border-slate-500 bg-transparent'
                      }`}
                    >
                      {row._selected && <Icon name="Check" size={12} className="text-white" />}
                    </button>

                    {/* Содержимое */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {/* Номер + заголовок */}
                          <div className="flex items-baseline gap-2">
                            {row.num && (
                              <span className="text-yellow-500 text-xs font-bold shrink-0">№{row.num}</span>
                            )}
                            <p className="text-white text-sm font-medium leading-snug">{row.title}</p>
                          </div>
                          {row.notes && <p className="text-slate-400 text-xs mt-0.5 italic">{row.notes}</p>}

                          {/* Данные из файла — показываем если заполнены */}
                          {(row._issuedDate || row._deadline || row._responsible) && (
                            <div className="flex flex-wrap gap-3 mt-1">
                              {row._issuedDate && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Icon name="Calendar" size={11} className="text-slate-500" />
                                  Выдано: <b className="text-slate-300">{new Date(row._issuedDate).toLocaleDateString('ru-RU')}</b>
                                </span>
                              )}
                              {row._deadline && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Icon name="Clock" size={11} className="text-amber-500" />
                                  Срок: <b className="text-amber-400">{new Date(row._deadline).toLocaleDateString('ru-RU')}</b>
                                </span>
                              )}
                              {row._responsible && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Icon name="User" size={11} className="text-slate-500" />
                                  <b className="text-slate-300">{row._responsible}</b>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeRow(idx)}
                          className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                          title="Удалить строку"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      </div>

                      {/* Индивидуальные параметры (раскрываются если строка выбрана) */}
                      {row._selected && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div>
                            <Label className="text-slate-400 text-[10px] mb-0.5 block">
                              Назначить специалисту
                              {row._responsible && <span className="text-slate-500 ml-1">(из файла: {row._responsible})</span>}
                            </Label>
                            <select
                              value={row._assignedUserId || globalAssignedId}
                              onChange={e => updateRow(idx, '_assignedUserId', e.target.value)}
                              className="w-full bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-xs"
                            >
                              <option value="">— из общих —</option>
                              {specialists.map(s => (
                                <option key={s.id} value={s.id}>{s.fio}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-slate-400 text-[10px] mb-0.5 block">Дата выдачи</Label>
                            <Input
                              type="date"
                              value={row._issuedDate || globalIssuedDate}
                              onChange={e => updateRow(idx, '_issuedDate', e.target.value)}
                              className="bg-slate-700 border-slate-600 text-white h-7 text-xs px-2"
                            />
                          </div>
                          <div>
                            <Label className="text-slate-400 text-[10px] mb-0.5 block">
                              Срок <span className="text-red-400">*</span>
                            </Label>
                            <Input
                              type="date"
                              value={row._deadline || globalDeadline}
                              onChange={e => updateRow(idx, '_deadline', e.target.value)}
                              className={`bg-slate-700 border-slate-600 text-white h-7 text-xs px-2 ${!(row._deadline || globalDeadline) ? 'border-red-500/50' : ''}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Кнопки сохранения */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-700">
            <span className="text-sm text-slate-400">
              Выбрано: <b className="text-white">{selectedCount}</b> из {importedRows.length}
            </span>
            <div className="flex gap-3">
              <Button
                onClick={() => setImportedRows([])}
                variant="outline"
                className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                size="sm"
              >
                <Icon name="Trash2" size={15} className="mr-1" />
                Очистить список
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || selectedCount === 0}
                className="bg-green-700 hover:bg-green-600 text-white"
              >
                {saving ? (
                  <><Icon name="Loader2" size={16} className="mr-2 animate-spin" />Сохранение...</>
                ) : (
                  <><Icon name="Save" size={16} className="mr-2" />Создать {selectedCount} поручений</>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExcelOrdersImport;