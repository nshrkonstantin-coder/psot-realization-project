import { lazy, Suspense } from "react";
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

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const OrganizationLogin = lazy(() => import("./pages/OrganizationLogin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const UsersManagement = lazy(() => import("./pages/UsersManagement"));
const CreateUser = lazy(() => import("./pages/CreateUser"));
const Profile = lazy(() => import("./pages/Profile"));
const AdditionalPage = lazy(() => import("./pages/AdditionalPage"));
const StoragePage = lazy(() => import("./pages/StoragePage"));
const FolderViewPage = lazy(() => import("./pages/FolderViewPage"));
const PabRegistrationPage = lazy(() => import("./pages/PabRegistrationPage"));
const PabDictionariesPage = lazy(() => import("./pages/PabDictionariesPage"));
const PabListPage = lazy(() => import("./pages/PabListPage"));
const PabViewPage = lazy(() => import("./pages/PabViewPage"));
const PabUserRegistryPage = lazy(() => import("./pages/PabUserRegistryPage"));
const AdminPabRegistryPage = lazy(() => import("./pages/AdminPabRegistryPage"));
const ProductionControlPage = lazy(() => import("./pages/ProductionControlPage"));
const KBTReportPage = lazy(() => import("./pages/KBTReportPage"));
const KBTMainPage = lazy(() => import("./pages/KBTMainPage"));
const KBTReportFormPage = lazy(() => import("./pages/KBTReportFormPage"));
const KBTReportViewPage = lazy(() => import("./pages/KBTReportViewPage"));
const KBTProtocolsPage = lazy(() => import("./pages/KBTProtocolsPage"));
const KBTReportsPage = lazy(() => import("./pages/KBTReportsPage"));
const KBTProgramsPage = lazy(() => import("./pages/KBTProgramsPage"));
const OtipbDepartmentPage = lazy(() => import("./pages/OtipbDepartmentPage"));
const OtipbInstructionsPage = lazy(() => import("./pages/OtipbInstructionsPage"));
const OtipbInspectionsPage = lazy(() => import("./pages/OtipbInspectionsPage"));
const OtipbIncidentsPage = lazy(() => import("./pages/OtipbIncidentsPage"));
const OtipbPPEPage = lazy(() => import("./pages/OtipbPPEPage"));
const OtipbDocumentsPage = lazy(() => import("./pages/OtipbDocumentsPage"));
const OtipbAnalyticsPage = lazy(() => import("./pages/OtipbAnalyticsPage"));
const OtipbAdditionalDirectionsPage = lazy(() => import("./pages/OtipbAdditionalDirectionsPage"));
const OtipbWorkspacePage = lazy(() => import("./pages/OtipbWorkspacePage"));
const OrganizationsManagementPage = lazy(() => import("./pages/OrganizationsManagementPage"));
const CreateOrganizationPage = lazy(() => import("./pages/CreateOrganizationPage"));
const OrganizationSettingsPage = lazy(() => import("./pages/OrganizationSettingsPage"));
const OrganizationUsersPage = lazy(() => import("./pages/OrganizationUsersPage"));
const LogoLibraryPage = lazy(() => import("./pages/LogoLibraryPage"));
const SubscriptionPlansPage = lazy(() => import("./pages/SubscriptionPlansPage"));
const SubscriptionPlanEditPage = lazy(() => import("./pages/SubscriptionPlanEditPage"));
const PointsRulesPage = lazy(() => import("./pages/PointsRulesPage"));
const TariffManagementPage = lazy(() => import("./pages/TariffManagementPage"));
const OrganizationModulesPage = lazy(() => import("./pages/OrganizationModulesPage"));
const MyMetricsPage = lazy(() => import("./pages/MyMetricsPage"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));
const UserCabinet = lazy(() => import("./pages/UserCabinet"));
const ChatHistory = lazy(() => import("./pages/ChatHistory"));
const OrgMiniAdmin = lazy(() => import("./pages/OrgMiniAdmin"));
const AssignMiniAdmin = lazy(() => import("./pages/AssignMiniAdmin"));
const HashCalculator = lazy(() => import("./pages/HashCalculator"));
const EmailTestPage = lazy(() => import("./pages/EmailTestPage"));
const EmailConfigPage = lazy(() => import("./pages/EmailConfigPage"));
const SystemNotificationsPage = lazy(() => import("./pages/SystemNotificationsPage"));
const DatabasePage = lazy(() => import("./pages/DatabasePage"));
const PabAnalyticsPage = lazy(() => import("./pages/PabAnalyticsPage"));
const PcListPage = lazy(() => import("./pages/PcListPage"));
const PcViewPage = lazy(() => import("./pages/PcViewPage"));
const PcAnalyticsPage = lazy(() => import("./pages/PcAnalyticsPage"));
const PcRegistryPage = lazy(() => import("./pages/PcRegistryPage"));
const PcArchivedPage = lazy(() => import("./pages/PcArchivedPage"));
const PrescriptionsPage = lazy(() => import("./pages/PrescriptionsPage"));
const Integration1CPage = lazy(() => import("./pages/Integration1CPage"));
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