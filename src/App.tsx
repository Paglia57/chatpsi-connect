import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/busca-plano" element={<BuscaPlanoPage />} />
            <Route path="/busca-artigos" element={<BuscaArtigosPage />} />
            <Route path="/marketing" element={<MarketingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/referrals" element={<AdminReferralsPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* App module routes */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="/app/evolucao" replace />} />
              <Route path="evolucao" element={<EvolutionPage />} />
              <Route path="historico" element={<HistoryPage />} />
              <Route path="perfil" element={<ProfilePage />} />
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
