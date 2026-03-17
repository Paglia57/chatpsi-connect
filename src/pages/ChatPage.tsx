import React from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";

const ChatPage = () => {
  return (
    <div className="flex flex-col h-full">
      <AppBreadcrumb items={[
        { label: "Ferramentas IA", href: "/chat" },
        { label: "Chat Clínico" },
      ]} />
      <ChatInterface />
    </div>
  );
};

export default ChatPage;
