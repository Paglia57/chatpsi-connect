import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User as UserIcon, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatMessageContent } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';

interface PlanoMessage {
  id: string;
  input_text: string;
  response_json: any;
  created_at: string;
  error_message?: string | null;
}

const BuscaPlanoInterface = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useResponsive();
  
  const [messages, setMessages] = useState<PlanoMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setFetchingHistory(true);
    
    try {
      const { data, error } = await supabase
        .from('plano_chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar suas conversas anteriores.",
        variant: "destructive"
      });
    } finally {
      setFetchingHistory(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isLoading || !user) return;

    if (!profile?.subscription_active) {
      toast({
        title: "Assinatura necessária",
        description: "Você precisa de uma assinatura ativa para usar esta funcionalidade.",
        variant: "destructive"
      });
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('busca_plano_dispatch', {
        body: { input_text: messageText }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar mensagem');
      }

      await fetchHistory();
      
      toast({
        title: "Resposta recebida",
        description: "Plano de ação processado com sucesso!",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Ocorreu um erro ao processar sua solicitação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchingHistory) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Sparkles className="h-8 w-8 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 no-horizontal-scroll">
      <header className="app-header">
        <div className="header-center">
          <img src="/logo.png" alt="ChatPsi" className="brand-logo" />
        </div>
      </header>

      <div className="flex-1 relative min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-4xl mx-auto pb-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 text-primary mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">Busca Plano de Ação</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 text-overflow-anywhere">
                  Envie uma pergunta para iniciar seu plano de ação personalizado.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <React.Fragment key={msg.id}>
                  <div className="flex gap-2 sm:gap-3 justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-3 sm:px-4 py-2 sm:py-3 max-w-[80%]">
                      <p className="text-sm whitespace-pre-wrap break-words text-overflow-anywhere">{msg.input_text}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3 justify-start">
                    <div className="flex-shrink-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                    </div>
                    <div className="bg-muted rounded-lg px-3 sm:px-4 py-2 sm:py-3 max-w-[80%]">
                      {msg.error_message ? (
                        <p className="text-sm text-destructive">{msg.error_message}</p>
                      ) : msg.response_json ? (
                        <div className="text-sm whitespace-pre-wrap break-words text-overflow-anywhere">
                          {formatMessageContent(
                            typeof msg.response_json === 'string' 
                              ? msg.response_json 
                              : msg.response_json?.response || JSON.stringify(msg.response_json, null, 2)
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem resposta</p>
                      )}
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      <div className="composer-container p-2 sm:p-3 md:p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto w-full px-2 sm:px-0">
          <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3 items-end">
            <div className="flex-1 min-w-0 w-full">
              <AutoTextarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua pergunta sobre plano de ação..."
                disabled={isLoading || !profile?.subscription_active}
                minRows={isMobile ? 1 : 2}
                maxRows={isMobile ? 4 : 6}
                className="w-full text-base resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
            </div>
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || isLoading || !profile?.subscription_active}
              size="icon"
              className="touch-target flex-shrink-0 h-11 w-11"
              aria-label="Enviar mensagem"
            >
              {isLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BuscaPlanoInterface;
