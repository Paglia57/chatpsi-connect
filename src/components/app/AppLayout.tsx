import { SidebarProvider } from "@/components/ui/sidebar";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ReferralNotificationPoller from "@/components/referral/ReferralNotificationPoller";
import { Outlet, Navigate } from "react-router-dom";
import { useResponsive } from "@/hooks/useResponsive";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AppLayout() {
  const { isMobile } = useResponsive();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen-mobile flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className={`app-shell min-h-screen-mobile flex w-full bg-background no-horizontal-scroll ${isMobile ? 'flex-col' : ''}`}>
        <ChatSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto">
            <Outlet />
          </main>
        </div>
        <ReferralNotificationPoller />
      </div>
    </SidebarProvider>
  );
}
