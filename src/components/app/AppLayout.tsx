import { SidebarProvider } from "@/components/ui/sidebar";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ReferralNotificationPoller from "@/components/referral/ReferralNotificationPoller";
import { Outlet } from "react-router-dom";
import { useResponsive } from "@/hooks/useResponsive";

export default function AppLayout() {
  const { isMobile } = useResponsive();

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
