import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/Layout";
import Conversations from "./pages/Conversations";
import Queues from "./pages/Queues";
import Chips from "./pages/Chips";
import Campaigns from "./pages/Campaigns";
import Users from "./pages/Users";
import Companies from "./pages/Companies";
import Reports from "./pages/Reports";
import AdvancedReports from "./pages/AdvancedReports";
import Settings from "./pages/Settings";
import BotFlows from "./pages/BotFlows";
import ChipLogs from "./pages/ChipLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CompanyProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={
                <AuthGuard>
                  <Layout />
                </AuthGuard>
              }>
                <Route index element={<Conversations />} />
                <Route path="conversations" element={<Conversations />} />
                <Route path="queues" element={<Queues />} />
                <Route path="chips" element={<Chips />} />
                <Route path="chip-logs" element={<ChipLogs />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="users" element={<Users />} />
                <Route path="companies" element={<Companies />} />
                <Route path="reports" element={<Reports />} />
                <Route path="advanced-reports" element={<AdvancedReports />} />
                <Route path="bot-flows" element={<BotFlows />} />
                <Route path="settings" element={<Settings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CompanyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
