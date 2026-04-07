import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";

const EXPORT_URL = "https://functions.poehali.dev/eeed067c-4b0d-4318-80ef-e6af2f6a5a33";

// Загружаем все исходные файлы через Vite glob import
const frontendModules = import.meta.glob(
  ["/src/**/*.ts", "/src/**/*.tsx", "/src/**/*.css"],
  { as: "raw", eager: true }
);

const backendModules = import.meta.glob(
  ["/backend/**/*.py"],
  { as: "raw", eager: true }
);

export default function ExportCodePage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [totalFiles, setTotalFiles] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const frontendCount = Object.keys(frontendModules).length;
  const backendCount = Object.keys(backendModules).length;

  const handleExport = async () => {
    setStatus("loading");
    setProgress(10);
    setErrorMsg("");

    try {
      const files: { path: string; content: string; section: string }[] = [];

      // Фронтенд файлы
      for (const [path, content] of Object.entries(frontendModules)) {
        files.push({
          path: path.replace(/^\//, ""),
          content: content as string,
          section: "frontend",
        });
      }

      setProgress(40);

      // Бэкенд файлы
      for (const [path, content] of Object.entries(backendModules)) {
        files.push({
          path: path.replace(/^\//, ""),
          content: content as string,
          section: "backend",
        });
      }

      setProgress(60);
      setTotalFiles(files.length);

      const response = await fetch(EXPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });

      setProgress(90);

      const data = await response.json();

      if (data.success) {
        setDownloadUrl(data.url);
        setTotalFiles(data.total_files);
        setStatus("done");
        setProgress(100);
      } else {
        throw new Error(data.message || "Ошибка генерации");
      }
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Неизвестная ошибка");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="FileText" size={24} />
            Экспорт исходного кода в Word
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{frontendCount}</div>
              <div className="text-sm text-gray-600">TypeScript / TSX файлов</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{backendCount}</div>
              <div className="text-sm text-gray-600">Python файлов</div>
            </div>
          </div>

          <div className="text-sm text-gray-500 text-center">
            Всего файлов: <strong>{frontendCount + backendCount}</strong>
          </div>

          {status === "idle" && (
            <Button className="w-full" size="lg" onClick={handleExport}>
              <Icon name="Download" size={18} className="mr-2" />
              Создать Word-документ
            </Button>
          )}

          {status === "loading" && (
            <div className="space-y-3">
              <Progress value={progress} />
              <p className="text-center text-sm text-gray-500">
                Генерирую документ... {progress}%
              </p>
            </div>
          )}

          {status === "done" && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <Icon name="CheckCircle" size={32} className="text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-700">Документ готов!</p>
                <p className="text-sm text-gray-500">Файлов в документе: {totalFiles}</p>
              </div>
              <a href={downloadUrl} download="source_code.docx" target="_blank" rel="noreferrer">
                <Button className="w-full" size="lg" variant="default">
                  <Icon name="Download" size={18} className="mr-2" />
                  Скачать source_code.docx
                </Button>
              </a>
              <Button variant="outline" className="w-full" onClick={() => setStatus("idle")}>
                Создать заново
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <Icon name="AlertCircle" size={32} className="text-red-500 mx-auto mb-2" />
                <p className="font-medium text-red-700">Ошибка</p>
                <p className="text-sm text-gray-500">{errorMsg}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setStatus("idle")}>
                Попробовать снова
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}