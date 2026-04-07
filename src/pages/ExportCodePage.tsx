import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";

const EXPORT_URL = "https://functions.poehali.dev/eeed067c-4b0d-4318-80ef-e6af2f6a5a33";

export default function ExportCodePage() {
  const [stats, setStats] = useState({ frontend_count: 0, backend_count: 0, total: 0 });
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [genStatus, setGenStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [genProgress, setGenProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const backendInputRef = useRef<HTMLInputElement>(null);

  const loadStats = () => {
    fetch(EXPORT_URL)
      .then((r) => r.json())
      .then((d) => setStats({ frontend_count: d.frontend_count ?? 0, backend_count: d.backend_count ?? 0, total: d.total ?? 0 }))
      .catch(() => {});
  };

  useEffect(() => { loadStats(); }, []);

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: "backend") => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploadStatus("uploading");
    setUploadProgress(5);
    setUploadMsg("");

    const extensions = section === "backend" ? [".py"] : [".ts", ".tsx", ".css"];
    const files: { path: string; content: string; section: string }[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = "." + file.name.split(".").pop();
      if (!extensions.includes(ext)) continue;
      const content = await file.text();
      files.push({ path: file.webkitRelativePath || file.name, content, section });
    }

    if (files.length === 0) {
      setUploadStatus("error");
      setUploadMsg("Не найдено подходящих файлов в выбранной папке");
      return;
    }

    setUploadProgress(40);

    // Отправляем батчами по 20 файлов
    const BATCH = 20;
    let saved = 0;
    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      const res = await fetch(EXPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_files", files: batch }),
      });
      const data = await res.json();
      saved += data.saved ?? 0;
      setUploadProgress(40 + Math.round(((i + BATCH) / files.length) * 55));
    }

    setUploadProgress(100);
    setUploadStatus("done");
    setUploadMsg(`Загружено ${saved} файлов (${section === "backend" ? "Python" : "TypeScript"})`);
    loadStats();
    if (backendInputRef.current) backendInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    setGenStatus("loading");
    setGenProgress(20);
    setGenMsg("");

    try {
      const res = await fetch(EXPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      setGenProgress(90);
      const data = await res.json();
      if (data.success) {
        setDownloadUrl(data.url);
        setGenMsg(`Готово! Фронтенд: ${data.frontend_count} · Бэкенд: ${data.backend_count} · Всего: ${data.total_files}`);
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
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xl font-bold text-blue-600">{stats.frontend_count}</div>
                <div className="text-xs text-gray-500">TypeScript файлов</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xl font-bold text-green-600">{stats.backend_count}</div>
                <div className="text-xs text-gray-500">Python файлов</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xl font-bold text-purple-600">{stats.total}</div>
                <div className="text-xs text-gray-500">Всего файлов</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Шаг 1 — загрузка папки backend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
              Загрузи папку backend с компьютера
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              Сначала скачай код проекта (<b>Скачать → Скачать код</b>), распакуй архив и выбери папку <b>backend</b>.
            </p>
            <input
              ref={backendInputRef}
              type="file"
              className="hidden"
              // @ts-expect-error webkitdirectory not in types
              webkitdirectory=""
              multiple
              onChange={(e) => handleFolderUpload(e, "backend")}
            />
            <Button
              className="w-full"
              variant="outline"
              onClick={() => backendInputRef.current?.click()}
              disabled={uploadStatus === "uploading"}
            >
              <Icon name="FolderOpen" size={18} className="mr-2" />
              Выбрать папку backend/
            </Button>

            {uploadStatus === "uploading" && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-center text-gray-500">Загрузка... {uploadProgress}%</p>
              </div>
            )}
            {uploadStatus === "done" && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Icon name="CheckCircle" size={16} />
                {uploadMsg}
              </div>
            )}
            {uploadStatus === "error" && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <Icon name="AlertCircle" size={16} />
                {uploadMsg}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Шаг 2 — генерация */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
              Создать Word-документ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              После загрузки файлов нажми кнопку — сервер сгенерирует Word со всем кодом.
            </p>

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
                  <p className="text-sm font-medium text-green-700">{genMsg}</p>
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
