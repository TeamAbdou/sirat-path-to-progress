import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import DisclaimerPopup from "@/components/DisclaimerPopup";
import LandingPage from "@/pages/LandingPage";
import HomePage from "@/pages/HomePage";
import ChatPage from "@/pages/ChatPage";
import ProgressPage from "@/pages/ProgressPage";
import DonatePage from "@/pages/DonatePage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminDonations from "@/pages/AdminDonations";
import AdminSecurityLogs from "@/pages/AdminSecurityLogs";
import ContactPage from "@/pages/ContactPage";
import PrivacyPage from "@/pages/PrivacyPage";
import DisclaimerPage from "@/pages/DisclaimerPage";
import NotFound from "./pages/NotFound";
import GuestChatPage from "@/pages/GuestChatPage";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<><TopBar /><main className="min-h-screen"><AuthPage /></main></>} />
        <Route path="/guest-chat" element={<GuestChatPage />} />
        <Route path="/privacy" element={<><TopBar /><main className="min-h-screen"><PrivacyPage /></main></>} />
        <Route path="/disclaimer" element={<><TopBar /><main className="min-h-screen"><DisclaimerPage /></main></>} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  return (
    <>
      <TopBar />
      <DisclaimerPopup />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:challengeId" element={<ChatPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/donations" element={<AdminDonations />} />
          <Route path="/admin/security-logs" element={<AdminSecurityLogs />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
