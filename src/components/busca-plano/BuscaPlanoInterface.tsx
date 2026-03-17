import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User as UserIcon, RefreshCw, Sparkles, Lightbulb, Target } from 'lucide-react';
import FirstTimeGuide from '@/components/ui/FirstTimeGuide';
import { useAuth } from '@/components/auth/AuthProvider';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatMessageContent } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';
import { useOutletContext } from 'react-router-dom';
interface PlanoMessage {
  id: string;
  input_text: string;
  response_json: any;
  created_at: string;
  error_message?: string | null;
}
const BuscaPlanoInterface = () => {
  const {
    user,
    profile,
    refreshProfile
  } = useAuth();
  const { tourActive } = (useOutletContext<{ tourActive?: boolean }>() || {});
  const {
    toast
  } = useToast();
  const {
    isMobile
  } = useResponsive();
  const [messages, setMessages] = useState<PlanoMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setFetchingHistory(true);
    try {
      const {
        data,
        error
      } = await supabase.from('plano_chat_history').select('*').eq('user_id', user.id).order('created_at', {
        ascending: true
      });
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
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
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
    setShowSuggestions(false);
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('busca_plano_dispatch', {
        body: {
          input_text: messageText
        }
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
    return <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-full max-w-4xl space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="space-y-2 max-w-[60%]">
                <div className="h-16 rounded-lg bg-muted animate-pulse" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>;
  }
  return <div className="flex-1 flex flex-col h-full min-h-0 no-horizontal-scroll" data-tour="page-plano">
      <header className="app-header">
        <div className="header-center">
          <img src="/logo.png" alt="ChatPsi" className="brand-logo" />
        </div>
      </header>

      <div className="flex-1 relative min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-4xl mx-auto pb-4">
            
            {messages.length === 0 ? (
                (!(profile?.seen_guides as any)?.plano || tourActive) ? (
                  <FirstTimeGuide
                    guideKey="plano"
                    icon={<Target className="h-8 w-8 text-amber-600" />}
                    title="Busca Plano de Ação"
                    description="Descreva o caso clínico e receba um plano de ação terapêutico personalizado com base em evidências."
                    tips={[
                      "Descreva o quadro clínico, idade e contexto do paciente",
                      "Peça intervenções específicas por abordagem terapêutica",
                      "Use os planos como base e adapte à sua prática clínica",
                    ]}
                    examples={[
                      "Plano de ação para depressão em adolescentes",
                      "Intervenções para ansiedade generalizada",
                      "Estratégias para TDAH em adultos",
                    ]}
                    ctaText="Entendi, buscar um plano!"
                    onDismiss={async () => {
                      if (user && !tourActive) {
                        const current = (profile?.seen_guides as any) || {};
                        await supabase.from('profiles').update({ seen_guides: { ...current, plano: true } }).eq('user_id', user.id);
                        await refreshProfile();
                      }
                    }}
                    onExampleClick={(text) => {
                      setNewMessage(text);
                      setShowSuggestions(false);
                      if (user && !tourActive) {
                        const current = (profile?.seen_guides as any) || {};
                        supabase.from('profiles').update({ seen_guides: { ...current, plano: true } }).eq('user_id', user.id).then(() => refreshProfile());
                        setTimeout(() => {
                          const form = document.querySelector('.composer-container form') as HTMLFormElement | null;
                          form?.requestSubmit();
                        }, 50);
                      }
                    }}
                  />
                ) : (
                <div className="text-center py-8 sm:py-12 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5">
                    <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600" />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium mb-2">Busca Plano de Ação</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto text-overflow-anywhere">
                    Descreva o caso clínico ou situação e receba um plano de ação terapêutico personalizado.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-lg mx-auto">
                    {[
                      "Plano de ação para depressão em adolescentes",
                      "Intervenções para ansiedade generalizada",
                      "Estratégias para TDAH em adultos",
                      "Plano terapêutico para luto complicado",
                    ].map((suggestion) => (
                      <Button key={suggestion} variant="outline" className="h-auto py-2.5 px-3 text-left text-sm justify-start gap-2 bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30 text-foreground" onClick={() => { setNewMessage(suggestion); setTimeout(() => { const form = document.querySelector('form'); form?.requestSubmit(); }, 50); }}>
                        <Lightbulb className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                        <span>{suggestion}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                )
            ) : messages.map(msg => <React.Fragment key={msg.id}>
                  <div className="flex gap-2 sm:gap-3 justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-3 sm:px-4 py-2 sm:py-3 max-w-[80%] chat-message-content">
                      <p className="text-sm whitespace-pre-wrap break-words text-overflow-anywhere">{msg.input_text}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
                    <div className="bg-muted rounded-lg px-3 sm:px-4 py-2 sm:py-3 max-w-[80%] chat-message-content">
                      {msg.error_message ? <p className="text-sm text-destructive">{msg.error_message}</p> : msg.response_json ? <div className="text-sm whitespace-pre-wrap break-words text-overflow-anywhere">
                          {formatMessageContent(typeof msg.response_json === 'string' ? msg.response_json : msg.response_json?.response || JSON.stringify(msg.response_json, null, 2))}
                        </div> : <p className="text-sm text-muted-foreground">Sem resposta</p>}
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                      </span>
                    </div>
                  </div>
                </React.Fragment>)}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Suggestions above composer */}
      {showSuggestions && profile?.subscription_active && (
        <div className="px-4 sm:px-6 md:px-8 pb-2 flex-shrink-0 animate-fade-in">
          <div className="flex gap-2 overflow-x-auto max-w-4xl mx-auto scrollbar-none">
            {[
              "Manejo de crise em ideação suicida",
              "Plano para TDAH em adultos",
              "Intervenções para ansiedade generalizada",
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="whitespace-nowrap text-xs gap-1.5 flex-shrink-0 bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30"
                onClick={() => {
                  setNewMessage(suggestion);
                  setShowSuggestions(false);
                  setTimeout(() => {
                    const form = document.querySelector('.composer-container form') as HTMLFormElement | null;
                    form?.requestSubmit();
                  }, 50);
                }}
              >
                <Sparkles className="h-3 w-3 text-amber-600" />
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="composer-container p-2 sm:p-3 md:p-4 flex-shrink-0">
        <div className="w-full px-3 sm:px-4 md:px-6">
          <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3 items-end mx-[30px]">
            <div className="flex-1 min-w-0 w-full">
              <AutoTextarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Digite sua pergunta sobre plano de ação..." disabled={isLoading || !profile?.subscription_active} minRows={isMobile ? 1 : 2} maxRows={isMobile ? 4 : 6} className="w-full max-w-full text-base resize-none" onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }} />
            </div>
            <Button type="submit" disabled={!newMessage.trim() || isLoading || !profile?.subscription_active} size="icon" variant="cta" className="touch-target flex-shrink-0 h-11 w-11" aria-label="Enviar mensagem">
              {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>;
};
export default BuscaPlanoInterface;