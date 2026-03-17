import React from 'react';
import BuscaPlanoInterface from '@/components/busca-plano/BuscaPlanoInterface';
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";

const BuscaPlanoPage = () => {
  return (
    <div className="flex flex-col h-full">
      <AppBreadcrumb items={[
        { label: "Ferramentas IA", href: "/chat" },
        { label: "Planos de Ação" },
      ]} />
      <BuscaPlanoInterface />
    </div>
  );
};

export default BuscaPlanoPage;
