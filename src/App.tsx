import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Index from "./pages/Index";
import AuthPage from "@/components/auth/AuthPage";
import ChatPage from "./pages/ChatPage";
import BuscaPlanoPage from "./pages/BuscaPlanoPage";
import BuscaArtigosPage from "./pages/BuscaArtigosPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AdminPage from "./pages/AdminPage";
import AdminReferralsPage from "./pages/AdminReferralsPage";
import MarketingPage from "./pages/MarketingPage";
import NotFound from "./pages/NotFound";
import AppLayout from "@/components/app/AppLayout";
import EvolutionPage from "./pages/app/EvolutionPage";
import HistoryPage from "./pages/app/HistoryPage";
import ProfilePage from "./pages/app/ProfilePage";
import PatientsPage from "./pages/app/PatientsPage";
import PatientDetailPage from "./pages/app/PatientDetailPage";
import ReferralsPage from "./pages/app/ReferralsPage";
import HomePage from "./pages/app/HomePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* All authenticated routes under AppLayout with persistent sidebar */}
            <Route element={<AppLayout />}>
              <Route path="/app">
                <Route index element={<HomePage />} />
                <Route path="evolucao" element={<EvolutionPage />} />
                <Route path="pacientes" element={<PatientsPage />} />
                <Route path="pacientes/:id" element={<PatientDetailPage />} />
                <Route path="historico" element={<HistoryPage />} />
                <Route path="perfil" element={<ProfilePage />} />
                <Route path="indicacoes" element={<ReferralsPage />} />
              </Route>
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/busca-plano" element={<BuscaPlanoPage />} />
              <Route path="/busca-artigos" element={<BuscaArtigosPage />} />
              <Route path="/marketing" element={<MarketingPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/referrals" element={<AdminReferralsPage />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
