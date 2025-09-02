import React from 'react';
import { Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatInterface from '@/components/chat/ChatInterface';
import { useAuth } from '@/components/auth/AuthProvider';
import { useResponsive } from '@/hooks/useResponsive';

const ChatPage = () => {
  const { user, loading } = useAuth();
  const { isMobile } = useResponsive();

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
      <div className={`min-h-screen-mobile flex w-full bg-background no-horizontal-scroll ${isMobile ? 'flex-col' : ''}`}>
        <ChatSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <ChatInterface />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ChatPage;