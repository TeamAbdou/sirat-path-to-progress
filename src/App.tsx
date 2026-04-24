import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppProvider } from "@/contexts/AppContext";
import { LocalProfileProvider, useLocalProfile } from "@/contexts/LocalProfileContext";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import DisclaimerPopup from "@/components/DisclaimerPopup";
import PrivacyBadge from "@/components/PrivacyBadge";
import Onboarding from "@/components/Onboarding";
import HomePage from "@/pages/HomePage";
import ChatPage from "@/pages/ChatPage";
import ProgressPage from "@/pages/ProgressPage";
import SettingsPage from "@/pages/SettingsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import DisclaimerPage from "@/pages/DisclaimerPage";
import SOSPage from "@/pages/SOSPage";
import NotFound from "./pages/NotFound";
import { startReminderScheduler } from "@/lib/notifications";
import { getPreferenceRaw } from "@/lib/localdb/repository";

const queryClient = new QueryClient();

const RoutedPages = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:challengeId" element={<ChatPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/sos" element={<SOSPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const AppShell = () => {
  const { ready } = useLocalProfile();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    const id = startReminderScheduler();
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    getPreferenceRaw<boolean>('onboardingDone')
      .then(v => setOnboardingDone(!!v))
      .catch(() => setOnboardingDone(true));
  }, [ready]);

  if (!ready || onboardingDone === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!onboardingDone) {
    return <Onboarding onDone={() => setOnboardingDone(true)} />;
  }

  return (
    <>
      <TopBar />
      <PrivacyBadge />
      <DisclaimerPopup />
      <main className="min-h-screen">
        <RoutedPages />
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
