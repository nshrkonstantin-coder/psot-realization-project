import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface AnalyticsData {
  stats: {
    total: number;
    draft: number;
    completed: number;
    in_work: number;
  };
  timeline: Array<{ date: string; count: number }>;
  trend: {
    direction: 'up' | 'down' | 'stable';
    change_percent: number;
    forecast_next_week: number;
  };
  insights: {
    main: string;
    recommendation: string;
    top_issues: string[];
  };
  top_observations: Array<{ text: string; count: number }>;
  responsible_performance: Array<{
    name: string;
    total: number;
    completed: number;
    completion_rate: number;
  }>;
}

export default function PabAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const organizationId = localStorage.getItem('organizationId') || '';

  const loadAnalytics = useCallback(async () => {
    if (!organizationId) {
      toast.error('Организация не выбрана');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(
        `https://functions.poehali.dev/362265e1-75e5-4e05-a1a6-bc5a50866f07?organization_id=${organizationId}&period=${period}`
      );
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  }, [organizationId, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Icon name="Loader2" className="animate-spin" size={32} />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Icon name="AlertCircle" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg">Нет данных для отображения</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trendIcon = useMemo(() => {
    if (!data) return null;
    switch (data.trend.direction) {
      case 'up':
        return <Icon name="TrendingUp" className="text-red-500" size={24} />;
      case 'down':
        return <Icon name="TrendingDown" className="text-green-500" size={24} />;
      default:
        return <Icon name="Minus" className="text-gray-500" size={24} />;
    }
  }, [data?.trend.direction]);

  const trendColor = useMemo(() => {
    if (!data) return 'text-gray-500';
    switch (data.trend.direction) {
      case 'up':
        return 'text-red-500';
      case 'down':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  }, [data?.trend.direction]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Аналитика ПАБ</h1>
          <p className="text-muted-foreground">AI-прогнозирование и анализ данных</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="7">7 дней</option>
          <option value="30">30 дней</option>
          <option value="90">90 дней</option>
          <option value="365">Год</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего ПАБ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Черновики</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-500">{data.stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">В работе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{data.stats.in_work}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Завершено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{data.stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {trendIcon}
              Тренд и прогноз
            </CardTitle>
            <CardDescription>Анализ динамики создания ПАБ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Изменение</p>
                <p className={`text-2xl font-bold ${trendColor}`}>
                  {data.trend.change_percent > 0 ? '+' : ''}
                  {data.trend.change_percent}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Прогноз на неделю</p>
                <p className="text-2xl font-bold">{data.trend.forecast_next_week} ПАБ</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} name="Количество ПАБ" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Lightbulb" size={24} />
              AI Инсайты
            </CardTitle>
            <CardDescription>Рекомендации на основе данных</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-900">{data.insights.main}</p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">💡 Рекомендация</p>
              <p className="text-green-800">{data.insights.recommendation}</p>
            </div>

            {data.insights.top_issues.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-900 mb-2">⚠️ Частые замечания</p>
                <ul className="space-y-1">
                  {data.insights.top_issues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-amber-800">• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Топ-10 замечаний</CardTitle>
          <CardDescription>Самые частые нарушения</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.top_observations} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="text" type="category" width={200} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#ef4444" name="Количество" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Производительность ответственных лиц</CardTitle>
          <CardDescription>Статистика по исполнителям</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Ответственный</th>
                  <th className="text-right p-3">Всего</th>
                  <th className="text-right p-3">Завершено</th>
                  <th className="text-right p-3">% выполнения</th>
                </tr>
              </thead>
              <tbody>
                {data.responsible_performance.map((person, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-3">{person.name}</td>
                    <td className="text-right p-3">{person.total}</td>
                    <td className="text-right p-3">{person.completed}</td>
                    <td className="text-right p-3">
                      <span
                        className={`font-medium ${
                          person.completion_rate >= 75
                            ? 'text-green-600'
                            : person.completion_rate >= 50
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {person.completion_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}