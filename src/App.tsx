import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import OfflineNotification from "@/components/OfflineNotification";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";
import MessageNotifications from "@/components/MessageNotifications";
import ErrorBoundary from "@/components/ErrorBoundary";
import Icon from "@/components/ui/icon";
import { useOrganizationSync } from "@/hooks/useOrganizationSync";
import { ThemeProvider } from "@/contexts/ThemeContext";
import GlobalThemeToggle from "@/components/GlobalThemeToggle";

import Login from "./pages/Login";
import Register from "./pages/Register";
import OrganizationLogin from "./pages/OrganizationLogin";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import UsersManagement from "./pages/UsersManagement";
import CreateUser from "./pages/CreateUser";
import Profile from "./pages/Profile";
import AdditionalPage from "./pages/AdditionalPage";
import StoragePage from "./pages/StoragePage";
import FolderViewPage from "./pages/FolderViewPage";
import PabRegistrationPage from "./pages/PabRegistrationPage";
import PabDictionariesPage from "./pages/PabDictionariesPage";
import PabListPage from "./pages/PabListPage";
import PabViewPage from "./pages/PabViewPage";
import PabUserRegistryPage from "./pages/PabUserRegistryPage";
import AdminPabRegistryPage from "./pages/AdminPabRegistryPage";
import ProductionControlPage from "./pages/ProductionControlPage";
import KBTReportPage from "./pages/KBTReportPage";
import KBTMainPage from "./pages/KBTMainPage";
import KBTReportFormPage from "./pages/KBTReportFormPage";
import KBTReportViewPage from "./pages/KBTReportViewPage";
import KBTProtocolsPage from "./pages/KBTProtocolsPage";
import KBTReportsPage from "./pages/KBTReportsPage";
import KBTProgramsPage from "./pages/KBTProgramsPage";
import OtipbDepartmentPage from "./pages/OtipbDepartmentPage";
import OtipbInstructionsPage from "./pages/OtipbInstructionsPage";
import OtipbInspectionsPage from "./pages/OtipbInspectionsPage";
import OtipbIncidentsPage from "./pages/OtipbIncidentsPage";
import OtipbPPEPage from "./pages/OtipbPPEPage";
import OtipbDocumentsPage from "./pages/OtipbDocumentsPage";
import OtipbAnalyticsPage from "./pages/OtipbAnalyticsPage";
import OtipbAdditionalDirectionsPage from "./pages/OtipbAdditionalDirectionsPage";
import OtipbWorkspacePage from "./pages/OtipbWorkspacePage";
import OrganizationsManagementPage from "./pages/OrganizationsManagementPage";
import CreateOrganizationPage from "./pages/CreateOrganizationPage";
import OrganizationSettingsPage from "./pages/OrganizationSettingsPage";
import OrganizationUsersPage from "./pages/OrganizationUsersPage";
import LogoLibraryPage from "./pages/LogoLibraryPage";
import SubscriptionPlansPage from "./pages/SubscriptionPlansPage";
import SubscriptionPlanEditPage from "./pages/SubscriptionPlanEditPage";
import PointsRulesPage from "./pages/PointsRulesPage";
import TariffManagementPage from "./pages/TariffManagementPage";
import OrganizationModulesPage from "./pages/OrganizationModulesPage";
import MyMetricsPage from "./pages/MyMetricsPage";
import SystemSettings from "./pages/SystemSettings";
import UserCabinet from "./pages/UserCabinet";
import ChatHistory from "./pages/ChatHistory";
import OrgMiniAdmin from "./pages/OrgMiniAdmin";
import AssignMiniAdmin from "./pages/AssignMiniAdmin";
import HashCalculator from "./pages/HashCalculator";
import EmailTestPage from "./pages/EmailTestPage";
import EmailConfigPage from "./pages/EmailConfigPage";
import SystemNotificationsPage from "./pages/SystemNotificationsPage";
import DatabasePage from "./pages/DatabasePage";
import PabAnalyticsPage from "./pages/PabAnalyticsPage";
import PcListPage from "./pages/PcListPage";
import PcViewPage from "./pages/PcViewPage";
import PcAnalyticsPage from "./pages/PcAnalyticsPage";
import PcRegistryPage from "./pages/PcRegistryPage";
import PcArchivedPage from "./pages/PcArchivedPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import Integration1CPage from "./pages/Integration1CPage";
const AdminMessagesPage = lazy(() => import("./pages/AdminMessagesPage"));
const VideoConferencePage = lazy(() => import("./pages/VideoConferencePage"));
const ChartsPage = lazy(() => import("./pages/ChartsPage"));
const BackupPage = lazy(() => import("./pages/BackupPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UnderDevelopment = lazy(() => import("./pages/UnderDevelopment"));

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
    <Icon name="Loader2" className="animate-spin text-indigo-600" size={48} />
  </div>
);

/**
 * Условное отображение глобальных контролов (тема, приветствие)
 * Скрывает их на страницах входа и регистрации
 */
const ConditionalGlobalControls = () => {
  const location = useLocation();
  const hideOnPaths = ['/', '/register', '/org/'];
  
  // Проверяем, нужно ли скрывать контролы
  const shouldHide = hideOnPaths.some(path => {
    if (path === '/org/') {
      return location.pathname.startsWith('/org/');
    }
    return location.pathname === path;
  });
  
  if (shouldHide) return null;
  
  return (
    <>
      <GlobalThemeToggle />
      <div className="fixed top-4 right-20 z-50">
        <OnlineStatusIndicator />
      </div>
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  // Синхронизация organizationId для залогиненных пользователей
  useOrganizationSync();
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineNotification />
            <BrowserRouter>
              <ConditionalGlobalControls />
              <MessageNotifications />
        <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/org/:orgCode" element={<OrganizationLogin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/superadmin" element={<SuperAdmin />} />
          <Route path="/users-management" element={<UsersManagement />} />
          <Route path="/create-user" element={<CreateUser />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/additional" element={<AdditionalPage />} />
          <Route path="/storage" element={<StoragePage />} />
          <Route path="/storage/folder/:folderId" element={<FolderViewPage />} />
          <Route path="/pab-registration" element={<PabRegistrationPage />} />
          <Route path="/pab-dictionaries" element={<PabDictionariesPage />} />
          <Route path="/pab-list" element={<PabListPage />} />
          <Route path="/pab-view/:id" element={<PabViewPage />} />
          <Route path="/pab-user-registry" element={<PabUserRegistryPage />} />
          <Route path="/admin-pab-registry" element={<AdminPabRegistryPage />} />
          <Route path="/kbt-report" element={<KBTReportPage />} />
          <Route path="/kbt" element={<KBTMainPage />} />
          <Route path="/kbt-report-form" element={<KBTReportFormPage />} />
          <Route path="/kbt-report-view/:id" element={<KBTReportViewPage />} />
          <Route path="/kbt-protocols" element={<KBTProtocolsPage />} />
          <Route path="/kbt-reports" element={<KBTReportsPage />} />
          <Route path="/kbt-programs" element={<KBTProgramsPage />} />
          <Route path="/otipb-department" element={<OtipbDepartmentPage />} />
          <Route path="/otipb-workspace" element={<OtipbWorkspacePage />} />
          <Route path="/otipb-additional-directions" element={<OtipbAdditionalDirectionsPage />} />
          <Route path="/otipb-instructions" element={<OtipbInstructionsPage />} />
          <Route path="/otipb-inspections" element={<OtipbInspectionsPage />} />
          <Route path="/otipb-incidents" element={<OtipbIncidentsPage />} />
          <Route path="/otipb-ppe" element={<OtipbPPEPage />} />
          <Route path="/otipb-documents" element={<OtipbDocumentsPage />} />
          <Route path="/otipb-analytics" element={<OtipbAnalyticsPage />} />
          <Route path="/production-control" element={<ProductionControlPage />} />
          <Route path="/organizations-management" element={<OrganizationsManagementPage />} />
          <Route path="/create-organization" element={<CreateOrganizationPage />} />
          <Route path="/organization-settings/:id" element={<OrganizationSettingsPage />} />
          <Route path="/organization-users/:id" element={<OrganizationUsersPage />} />
          <Route path="/logo-library" element={<LogoLibraryPage />} />
          <Route path="/subscription-plans" element={<SubscriptionPlansPage />} />
          <Route path="/subscription-plan/:id" element={<SubscriptionPlanEditPage />} />
          <Route path="/points-rules/:id" element={<PointsRulesPage />} />
          <Route path="/tariff-management" element={<TariffManagementPage />} />
          <Route path="/organization-modules/:id" element={<OrganizationModulesPage />} />
          <Route path="/my-metrics" element={<MyMetricsPage />} />
          <Route path="/system-settings" element={<SystemSettings />} />
          <Route path="/user-cabinet" element={<UserCabinet />} />
          <Route path="/chat-history" element={<ChatHistory />} />
          <Route path="/miniadmin" element={<OrgMiniAdmin />} />
          <Route path="/assign-miniadmin" element={<AssignMiniAdmin />} />
          <Route path="/hash-calculator" element={<HashCalculator />} />
          <Route path="/email-test" element={<EmailTestPage />} />
          <Route path="/email-config" element={<EmailConfigPage />} />
          <Route path="/system-notifications" element={<SystemNotificationsPage />} />
          <Route path="/database" element={<DatabasePage />} />
          <Route path="/pab-analytics" element={<PabAnalyticsPage />} />
          <Route path="/pc-list" element={<PcListPage />} />
          <Route path="/pc-view/:id" element={<PcViewPage />} />
          <Route path="/pc-analytics" element={<PcAnalyticsPage />} />
          <Route path="/pc-registry" element={<PcRegistryPage />} />
          <Route path="/pc-archived" element={<PcArchivedPage />} />
          <Route path="/prescriptions" element={<PrescriptionsPage />} />
          <Route path="/integration-1c" element={<Integration1CPage />} />
          <Route path="/admin-messages" element={<AdminMessagesPage />} />
          <Route path="/video-conference" element={<VideoConferencePage />} />
          <Route path="/charts" element={<ChartsPage />} />
          <Route path="/backup" element={<BackupPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<UnderDevelopment />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
  );
};

export default App;