import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthProvider";
import Index from "./pages/Index.tsx";
import Demo from "./pages/Demo.tsx";
import NotFound from "./pages/NotFound.tsx";
import ScanHistory from "./pages/ScanHistory.tsx";
import SharedReport from "./pages/SharedReport.tsx";
import AutomationPage from "./pages/Automation.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/history" element={<ScanHistory />} />
              <Route path="/report/:uuid" element={<SharedReport />} />
              <Route path="/automation" element={<AutomationPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
