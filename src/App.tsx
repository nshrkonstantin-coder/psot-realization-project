import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OfflineNotification from "@/components/OfflineNotification";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";
import MessageNotifications from "@/components/MessageNotifications";
import ErrorBoundary from "@/components/ErrorBoundary";
import Icon from "@/components/ui/icon";
import { useOrganizationSync } from "@/hooks/useOrganizationSync";
import { ThemeProvider } from "@/contexts/ThemeContext";

const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const OrganizationLogin = lazy(() => import("./pages/OrganizationLogin.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin.tsx"));
const UsersManagement = lazy(() => import("./pages/UsersManagement.tsx"));
const CreateUser = lazy(() => import("./pages/CreateUser.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const AdditionalPage = lazy(() => import("./pages/AdditionalPage.tsx"));
const StoragePage = lazy(() => import("./pages/StoragePage.tsx"));
const FolderViewPage = lazy(() => import("./pages/FolderViewPage.tsx"));
const PabRegistrationPage = lazy(() => import("./pages/PabRegistrationPage.tsx"));
const PabDictionariesPage = lazy(() => import("./pages/PabDictionariesPage.tsx"));
const PabListPage = lazy(() => import("./pages/PabListPage.tsx"));
const PabViewPage = lazy(() => import("./pages/PabViewPage.tsx"));
const PabUserRegistryPage = lazy(() => import("./pages/PabUserRegistryPage.tsx"));
const AdminPabRegistryPage = lazy(() => import("./pages/AdminPabRegistryPage.tsx"));
const ProductionControlPage = lazy(() => import("./pages/ProductionControlPage.tsx"));
const KBTReportPage = lazy(() => import("./pages/KBTReportPage.tsx"));
const KBTMainPage = lazy(() => import("./pages/KBTMainPage.tsx"));
const KBTReportFormPage = lazy(() => import("./pages/KBTReportFormPage.tsx"));
const KBTReportViewPage = lazy(() => import("./pages/KBTReportViewPage.tsx"));
const KBTProtocolsPage = lazy(() => import("./pages/KBTProtocolsPage.tsx"));
const KBTReportsPage = lazy(() => import("./pages/KBTReportsPage.tsx"));
const KBTProgramsPage = lazy(() => import("./pages/KBTProgramsPage.tsx"));
const OtipbDepartmentPage = lazy(() => import("./pages/OtipbDepartmentPage.tsx"));
const OtipbInstructionsPage = lazy(() => import("./pages/OtipbInstructionsPage.tsx"));
const OtipbInspectionsPage = lazy(() => import("./pages/OtipbInspectionsPage.tsx"));
const OtipbIncidentsPage = lazy(() => import("./pages/OtipbIncidentsPage.tsx"));
const OtipbPPEPage = lazy(() => import("./pages/OtipbPPEPage.tsx"));
const OtipbDocumentsPage = lazy(() => import("./pages/OtipbDocumentsPage.tsx"));
const OtipbAnalyticsPage = lazy(() => import("./pages/OtipbAnalyticsPage.tsx"));
const OtipbAdditionalDirectionsPage = lazy(() => import("./pages/OtipbAdditionalDirectionsPage.tsx"));
const OtipbWorkspacePage = lazy(() => import("./pages/OtipbWorkspacePage.tsx"));
const OrganizationsManagementPage = lazy(() => import("./pages/OrganizationsManagementPage.tsx"));
const CreateOrganizationPage = lazy(() => import("./pages/CreateOrganizationPage.tsx"));
const OrganizationSettingsPage = lazy(() => import("./pages/OrganizationSettingsPage.tsx"));
const OrganizationUsersPage = lazy(() => import("./pages/OrganizationUsersPage.tsx"));
const LogoLibraryPage = lazy(() => import("./pages/LogoLibraryPage.tsx"));
const SubscriptionPlansPage = lazy(() => import("./pages/SubscriptionPlansPage.tsx"));
const SubscriptionPlanEditPage = lazy(() => import("./pages/SubscriptionPlanEditPage.tsx"));
const PointsRulesPage = lazy(() => import("./pages/PointsRulesPage.tsx"));
const TariffManagementPage = lazy(() => import("./pages/TariffManagementPage.tsx"));
const OrganizationModulesPage = lazy(() => import("./pages/OrganizationModulesPage.tsx"));
const MyMetricsPage = lazy(() => import("./pages/MyMetricsPage.tsx"));
const SystemSettings = lazy(() => import("./pages/SystemSettings.tsx"));
const UserCabinet = lazy(() => import("./pages/UserCabinet.tsx"));
const ChatHistory = lazy(() => import("./pages/ChatHistory.tsx"));
const OrgMiniAdmin = lazy(() => import("./pages/OrgMiniAdmin.tsx"));
const AssignMiniAdmin = lazy(() => import("./pages/AssignMiniAdmin.tsx"));
const HashCalculator = lazy(() => import("./pages/HashCalculator.tsx"));
const EmailTestPage = lazy(() => import("./pages/EmailTestPage.tsx"));
const EmailConfigPage = lazy(() => import("./pages/EmailConfigPage.tsx"));
const SystemNotificationsPage = lazy(() => import("./pages/SystemNotificationsPage.tsx"));
const DatabasePage = lazy(() => import("./pages/DatabasePage.tsx"));
const PabAnalyticsPage = lazy(() => import("./pages/PabAnalyticsPage.tsx"));
const PcListPage = lazy(() => import("./pages/PcListPage.tsx"));
const PcViewPage = lazy(() => import("./pages/PcViewPage.tsx"));
const PcAnalyticsPage = lazy(() => import("./pages/PcAnalyticsPage.tsx"));
const PcRegistryPage = lazy(() => import("./pages/PcRegistryPage.tsx"));
const PcArchivedPage = lazy(() => import("./pages/PcArchivedPage.tsx"));
const PrescriptionsPage = lazy(() => import("./pages/PrescriptionsPage.tsx"));
const Integration1CPage = lazy(() => import("./pages/Integration1CPage.tsx"));
const AdminMessagesPage = lazy(() => import("./pages/AdminMessagesPage.tsx"));
const VideoConferencePage = lazy(() => import("./pages/VideoConferencePage.tsx"));
const ChartsPage = lazy(() => import("./pages/ChartsPage.tsx"));
const BackupPage = lazy(() => import("./pages/BackupPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
    <Icon name="Loader2" className="animate-spin text-indigo-600" size={48} />
  </div>
);

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
            <div className="fixed top-4 right-4 z-50">
              <OnlineStatusIndicator />
            </div>
            <BrowserRouter>
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
          <Route path="*" element={<NotFound />} />
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