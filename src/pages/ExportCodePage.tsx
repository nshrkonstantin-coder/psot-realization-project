import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";
import { apiFetch } from "@/lib/api";

const EXPORT_URL = "https://functions.poehali.dev/eeed067c-4b0d-4318-80ef-e6af2f6a5a33";

type Section = "backend" | "frontend";
type UploadState = { status: "idle" | "uploading" | "done" | "error"; progress: number; msg: string };

export default function ExportCodePage() {
  const [stats, setStats] = useState({ frontend_count: 0, backend_count: 0, total: 0 });
  const [uploads, setUploads] = useState<Record<Section, UploadState>>({
    backend:  { status: "idle", progress: 0, msg: "" },
    frontend: { status: "idle", progress: 0, msg: "" },
  });
  const [genStatus, setGenStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [genProgress, setGenProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const backendRef = useRef<HTMLInputElement>(null);
  const frontendRef = useRef<HTMLInputElement>(null);

  const [clearStatus, setClearStatus] = useState<"idle" | "loading" | "done">("idle");

  const loadStats = () => {
    apiFetch(EXPORT_URL)
      .then((r) => r.json())
      .then((d) => setStats({ frontend_count: d.frontend_count ?? 0, backend_count: d.backend_count ?? 0, total: d.total ?? 0 }))
      .catch(() => {});
  };

  const handleClear = async () => {
    if (!confirm("Очистить все загруженные файлы из базы? Потом нужно будет загрузить папки заново.")) return;
    setClearStatus("loading");
    await apiFetch(EXPORT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "clear" }),
    });
    setClearStatus("done");
    setUploads({ backend: { status: "idle", progress: 0, msg: "" }, frontend: { status: "idle", progress: 0, msg: "" } });
    setGenStatus("idle");
    setGenProgress(0);
    setDownloadUrl("");
    loadStats();
    setTimeout(() => setClearStatus("idle"), 2000);
  };

  useEffect(() => { loadStats(); }, []);

  const setUpload = (section: Section, patch: Partial<UploadState>) =>
    setUploads((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: Section) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUpload(section, { status: "uploading", progress: 5, msg: "" });

    const extensions = section === "backend" ? [".py"] : [".tsx"];
    const files: { path: string; content: string; section: string }[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = "." + file.name.split(".").pop();
      if (!extensions.includes(ext)) continue;
      const content = await file.text();
      files.push({ path: file.webkitRelativePath || file.name, content, section });
    }

    if (files.length === 0) {
      setUpload(section, { status: "error", msg: "Не найдено подходящих файлов в выбранной папке" });
      return;
    }

    setUpload(section, { progress: 30 });

    const BATCH = 20;
    let saved = 0;
    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      const res = await apiFetch(EXPORT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "save_files", files: batch }),
      });
      const data = await res.json();
      saved += data.saved ?? 0;
      setUpload(section, { progress: 30 + Math.round(((i + BATCH) / files.length) * 65) });
    }

    setUpload(section, {
      status: "done",
      progress: 100,
      msg: `Загружено ${saved} файлов (${section === "backend" ? ".py" : ".tsx"})`,
    });
    loadStats();
    if (section === "backend" && backendRef.current) backendRef.current.value = "";
    if (section === "frontend" && frontendRef.current) frontendRef.current.value = "";
  };

  const handleGenerate = async () => {
    setGenStatus("loading");
    setGenProgress(20);
    setGenMsg("");
    try {
      const res = await apiFetch(EXPORT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "generate" }),
      });
      setGenProgress(90);
      const data = await res.json();
      if (data.success) {
        setDownloadUrl(data.url);
        setGenMsg(`Фронтенд: ${data.frontend_count} · Бэкенд: ${data.backend_count} · Всего: ${data.total_files}`);
        setGenStatus("done");
        setGenProgress(100);
      } else {
        throw new Error(data.message || "Ошибка");
      }
    } catch (e: unknown) {
      setGenStatus("error");
      setGenMsg(e instanceof Error ? e.message : "Неизвестная ошибка");
    }
  };

  const UploadBlock = ({ section, label, hint, inputRef }: {
    section: Section; label: string; hint: string; inputRef: React.RefObject<HTMLInputElement>;
  }) => {
    const u = uploads[section];
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          // @ts-expect-error webkitdirectory not in types
          webkitdirectory=""
          multiple
          onChange={(e) => handleFolderUpload(e, section)}
        />
        <Button
          className="w-full"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={u.status === "uploading"}
        >
          <Icon name="FolderOpen" size={18} className="mr-2" />
          {label}
        </Button>
        {u.status === "uploading" && (
          <div className="space-y-1">
            <Progress value={u.progress} />
            <p className="text-xs text-center text-gray-500">Загрузка... {u.progress}%</p>
          </div>
        )}
        {u.status === "done" && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <Icon name="CheckCircle" size={16} />{u.msg}
          </div>
        )}
        {u.status === "error" && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <Icon name="AlertCircle" size={16} />{u.msg}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4">

        {/* Статистика */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon name="FileText" size={22} />
              Экспорт исходного кода в Word
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xl font-bold text-blue-600">{stats.frontend_count}</div>
                <div className="text-xs text-gray-500">.tsx файлов</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xl font-bold text-green-600">{stats.backend_count}</div>
                <div className="text-xs text-gray-500">.py файлов</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xl font-bold text-purple-600">{stats.total}</div>
                <div className="text-xs text-gray-500">Всего файлов</div>
              </div>
            </div>
            {stats.total > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleClear}
                disabled={clearStatus === "loading"}
              >
                <Icon name="Trash2" size={14} className="mr-2" />
                {clearStatus === "loading" ? "Очищаю..." : clearStatus === "done" ? "Очищено!" : "Очистить базу и загрузить заново"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Шаг 1 — загрузка папок */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
              Загрузи папки с компьютера
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-gray-500">
              Скачай код: <b>Скачать → Скачать код</b>, распакуй архив, затем загрузи обе папки.
            </p>

            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Icon name="FolderOpen" size={16} className="text-green-600" />
                Папка <code className="bg-gray-100 px-1 rounded">backend/</code> — Python файлы
              </p>
              <UploadBlock
                section="backend"
                label="Выбрать папку backend/"
                hint="Выбери папку backend из распакованного архива"
                inputRef={backendRef}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Icon name="FolderOpen" size={16} className="text-blue-600" />
                Папка <code className="bg-gray-100 px-1 rounded">src/</code> — TypeScript файлы
              </p>
              <UploadBlock
                section="frontend"
                label="Выбрать папку src/"
                hint="Выбери папку src из распакованного архива"
                inputRef={frontendRef}
              />
            </div>
          </CardContent>
        </Card>

        {/* Шаг 2 — генерация */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
              Создать Word-документ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {genStatus !== "done" && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={genStatus === "loading" || stats.total === 0}
              >
                <Icon name="Download" size={18} className="mr-2" />
                Создать Word-документ
              </Button>
            )}
            {stats.total === 0 && genStatus === "idle" && (
              <p className="text-xs text-center text-gray-400">Сначала загрузи хотя бы одну папку</p>
            )}
            {genStatus === "loading" && (
              <div className="space-y-2">
                <Progress value={genProgress} />
                <p className="text-xs text-center text-gray-500">Генерирую... {genProgress}%</p>
              </div>
            )}
            {genStatus === "done" && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <Icon name="CheckCircle" size={28} className="text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-green-700">Документ готов!</p>
                  <p className="text-xs text-gray-500 mt-1">{genMsg}</p>
                </div>
                <a href={downloadUrl} download="source_code.docx" target="_blank" rel="noreferrer">
                  <Button className="w-full" size="lg">
                    <Icon name="Download" size={18} className="mr-2" />
                    Скачать source_code.docx
                  </Button>
                </a>
                <Button variant="outline" className="w-full" onClick={() => { setGenStatus("idle"); setGenProgress(0); }}>
                  Создать заново
                </Button>
              </div>
            )}
            {genStatus === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-sm text-red-600">{genMsg}</p>
                <Button variant="outline" className="mt-2" onClick={() => setGenStatus("idle")}>Попробовать снова</Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}