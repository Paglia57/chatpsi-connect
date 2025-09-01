import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto"></div>
          <img 
            src="/lovable-uploads/46df6a94-c160-4eca-a9f7-5c58ff488ff2.png" 
            alt="ChatPsi" 
            className="h-12 w-auto object-contain mx-auto filter brightness-0 invert"
          />
          <p className="text-white/90 text-lg font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect based on auth status
  if (user) {
    return <Navigate to="/chat" replace />;
  } else {
    return <Navigate to="/auth" replace />;
  }
};

export default Index;
