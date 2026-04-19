import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { LocalProfileProvider, useLocalProfile } from "@/contexts/LocalProfileContext";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import DisclaimerPopup from "@/components/DisclaimerPopup";
import HomePage from "@/pages/HomePage";
import ChatPage from "@/pages/ChatPage";
import ProgressPage from "@/pages/ProgressPage";
import SettingsPage from "@/pages/SettingsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import DisclaimerPage from "@/pages/DisclaimerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppShell = () => {
  const { ready } = useLocalProfile();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
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
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
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
      <LocalProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </TooltipProvider>
      </LocalProfileProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
