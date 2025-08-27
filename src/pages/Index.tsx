import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-accent-light">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <img 
            src="/lovable-uploads/e8ce6c19-f769-4a4f-a8d0-9c93492a7f76.png" 
            alt="ChatPsi" 
            className="h-10 w-auto object-contain mx-auto"
          />
          <p className="text-muted-foreground">Carregando...</p>
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
