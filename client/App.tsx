import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Candidates from "./pages/Candidates";
import Jobs from "./pages/Jobs";
import Pipeline from "./pages/Pipeline";
import Reports from "./pages/Reports";
import Applications from "./pages/Applications";
import OnboardingTracking from "./pages/OnboardingTracking";
import Settings from "./pages/Settings";
import Navigation from "./components/Navigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex h-screen bg-gray-50">
          <Navigation />
          <main className="flex-1 overflow-auto lg:ml-0">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/candidates" element={<Candidates />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/onboarding" element={<OnboardingTracking />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
