import { SidebarProvider } from "@/components/ui/sidebar";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ReferralNotificationPoller from "@/components/referral/ReferralNotificationPoller";
import RouteProgressBar from "@/components/ui/RouteProgressBar";
import GuidedTour from "@/components/ui/GuidedTour";
import { Outlet, Navigate } from "react-router-dom";
import { useResponsive } from "@/hooks/useResponsive";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export default function AppLayout() {
  const { isMobile } = useResponsive();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (!loading && profile && !(profile.seen_guides as any)?.tour) {
      // Small delay to ensure sidebar is rendered
      const timer = setTimeout(() => setRunTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading, profile]);

  const handleTourFinish = async () => {
    setRunTour(false);
    if (user) {
      const current = (profile?.seen_guides as any) || {};
      await supabase.from('profiles').update({
        seen_guides: { ...current, tour: true },
      }).eq('user_id', user.id);
      await refreshProfile();
    }
  };

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
      <RouteProgressBar />
      <GuidedTour run={runTour} onFinish={handleTourFinish} />
        <div className={`app-shell min-h-screen-mobile flex w-full bg-background no-horizontal-scroll ${isMobile ? 'flex-col' : ''}`}>
        <ChatSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className={`flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto ${isMobile ? 'pb-20' : ''}`}>
            <Outlet context={{ tourActive: runTour }} />
          </main>
        </div>
        <ReferralNotificationPoller />
      </div>
    </SidebarProvider>
  );
}
