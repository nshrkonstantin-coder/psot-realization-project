import { MetricsDateFilter } from '@/components/metrics/MetricsDateFilter';
import { MetricsTabSwitcher } from '@/components/metrics/MetricsTabSwitcher';
import { MetricsCards } from '@/components/metrics/MetricsCards';
import { ObservationsDialog } from '@/components/metrics/ObservationsDialog';
import { MetricsHeader } from '@/components/metrics/MetricsHeader';
import { MetricsChartCard } from '@/components/metrics/MetricsChartCard';
import { useMetricsData } from '@/hooks/useMetricsData';

const MyMetricsPage = () => {
  const {
    activeTab, setActiveTab,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    userCompany,
    userRole,
    metrics,
    pkMetrics,
    selectedObservations,
    dialogOpen, setDialogOpen,
    dialogTitle,
    chartUrl,
    isUploading,
    handleFileUpload,
    handleDeleteChart,
    handleMetricClick,
    handleObservationClick,
    handleUpdateMetrics,
  } = useMetricsData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <MetricsHeader userCompany={userCompany} />

        <MetricsDateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onUpdate={handleUpdateMetrics}
        />

        <MetricsTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        <MetricsChartCard
          userRole={userRole}
          chartUrl={chartUrl}
          isUploading={isUploading}
          onFileUpload={handleFileUpload}
          onDeleteChart={handleDeleteChart}
        />

        {activeTab === 'pab' && (
          <MetricsCards type="pab" metrics={metrics} onMetricClick={handleMetricClick} />
        )}

        {activeTab === 'pk' && (
          <MetricsCards type="pk" metrics={pkMetrics} />
        )}
      </div>

      <ObservationsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        observations={selectedObservations}
        onObservationClick={handleObservationClick}
      />
    </div>
  );
};

export default MyMetricsPage;
