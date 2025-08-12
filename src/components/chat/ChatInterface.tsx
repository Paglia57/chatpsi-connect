import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Paperclip, 
  Crown, 
  AlertCircle, 
  Bot, 
  User as UserIcon,
  Lock
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender: 'user' | 'ai';
  user_id?: string;
}

const ChatInterface = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Fetch messages on component mount
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
        } else {
          const formattedMessages = data.map(msg => ({
            ...msg,
            sender: 'user' as const
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error in fetchMessages:', error);
      } finally {
        setFetchingMessages(false);
      }
    };

    fetchMessages();
  }, [user]);

  const canSendMessage = profile?.subscription_active === true;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSendMessage) {
      toast({
        title: "Assinatura necessária",
        description: "Você precisa de uma assinatura ativa para enviar mensagens.",
        variant: "destructive",
      });
      return;
    }

    if (!newMessage.trim() || loading || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setLoading(true);

    try {
      // Add user message to local state immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        content: messageContent,
        message_type: 'text',
        created_at: new Date().toISOString(),
        sender: 'user',
        user_id: user.id
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Save to database
      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          content: messageContent,
          message_type: 'text'
        });

      if (error) {
        console.error('Error saving message:', error);
        toast({
          title: "Erro ao salvar mensagem",
          description: "Sua mensagem não foi salva. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Simulate AI response (placeholder for future integration)
      setTimeout(() => {
        const aiResponse: Message = {
          id: `ai-${Date.now()}`,
          content: "Olá! Sou a IA especializada em saúde mental do ChatPsi. Em breve terei funcionalidades mais avançadas para ajudar em sua prática clínica. Como posso ajudá-lo hoje?",
          message_type: 'text',
          created_at: new Date().toISOString(),
          sender: 'ai'
        };
        
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao enviar sua mensagem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (fetchingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Bot className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
          <p className="text-muted-foreground">Carregando suas conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold text-lg">ChatPsi AI</h1>
              <p className="text-sm text-muted-foreground">
                Assistente especializado em saúde mental
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile?.subscription_active ? (
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                <Crown className="h-3 w-3 mr-1" />
                Ativa
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                Inativa
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Bem-vindo ao ChatPsi!</h3>
              <p className="text-muted-foreground mb-4">
                {canSendMessage 
                  ? "Inicie uma conversa para começar a usar a IA especializada em saúde mental."
                  : "Você precisa de uma assinatura ativa para começar a conversar."
                }
              </p>
              {!canSendMessage && (
                <Button variant="cta">
                  Ativar Assinatura
                </Button>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'ai' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
                
                <Card className={`max-w-[70%] ${
                  message.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card'
                }`}>
                  <CardContent className="p-3">
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.created_at)}
                    </p>
                  </CardContent>
                </Card>

                {message.sender === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-accent-primary" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-4">
        {canSendMessage ? (
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  disabled={loading}
                  className="pr-12"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  disabled={loading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                type="submit" 
                disabled={loading || !newMessage.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="max-w-4xl mx-auto text-center py-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Assinatura necessária para enviar mensagens</span>
            </div>
            <Button variant="cta" size="sm">
              Ativar Assinatura
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;