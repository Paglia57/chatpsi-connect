import React from 'react';
import MarketingInterface from '@/components/marketing/MarketingInterface';
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";

const MarketingPage = () => {
  return (
    <div className="flex flex-col h-full">
      <AppBreadcrumb items={[
        { label: "Marketing", href: "/marketing" },
        { label: "IA de Marketing" },
      ]} />
      <MarketingInterface />
    </div>
  );
};

export default MarketingPage;
