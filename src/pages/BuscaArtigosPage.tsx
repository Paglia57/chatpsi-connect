import React from 'react';
import BuscaArtigosInterface from '@/components/busca-artigos/BuscaArtigosInterface';
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";

const BuscaArtigosPage = () => {
  return (
    <div className="flex flex-col h-full">
      <AppBreadcrumb items={[
        { label: "Ferramentas IA", href: "/chat" },
        { label: "Artigos Científicos" },
      ]} />
      <BuscaArtigosInterface />
    </div>
  );
};

export default BuscaArtigosPage;
