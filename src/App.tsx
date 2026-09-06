import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./hooks/useAuth";
import { LanguageProvider } from "./hooks/useLanguage";
import Index from "./pages/Index";
import EventLanding from "./pages/EventLanding";
import EventPreview from "./pages/EventPreview";
import EventAuth from "./pages/EventAuth";
import EventRegister from "./pages/EventRegister";
import EventVoice from "./pages/EventVoice";
import EventVoiceFree from "./pages/EventVoiceFree";
import EventDashboard from "./pages/EventDashboard";
import TicketPage from "./pages/TicketPage";
import MyTickets from "./pages/MyTickets";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import DataRetention from "./pages/DataRetention";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/event/:slug" element={<EventLanding />} />
                <Route path="/preview/:eventId" element={<EventPreview />} />
                <Route path="/event/:slug/auth" element={<EventAuth />} />
                <Route path="/event/:slug/register" element={<EventRegister />} />
                <Route path="/event/az-ususret-novoj-eri-testiranja-biomarkera-u-mnsclc/voice-free" element={<EventVoiceFree />} />
                <Route path="/event/:slug/voice" element={<EventVoice />} />
                <Route path="/event/:slug/dashboard" element={<EventDashboard />} />
                <Route path="/ticket/:attendeeId" element={<TicketPage />} />
                <Route path="/my-tickets" element={<MyTickets />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/data-retention" element={<DataRetention />} />
                <Route path="/auth" element={<EventAuth />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
