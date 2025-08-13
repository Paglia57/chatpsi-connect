import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Send, 
  Paperclip, 
  Crown, 
  AlertCircle, 
  Bot, 
  User as UserIcon,
  Lock,
  Upload,
  Mic,
  Image as ImageIcon,
  Video,
  File
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload, UploadedFile } from '@/hooks/useFileUpload';

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
  const [attachedFile, setAttachedFile] = useState<UploadedFile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading } = useFileUpload();

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
            id: msg.id,
            content: msg.text,
            message_type: msg.type,
            created_at: msg.created_at,
            sender: (msg.sender === 'assistant' ? 'ai' : msg.sender) as 'user' | 'ai',
            user_id: msg.user_id
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadedFile = await uploadFile(file);
    if (uploadedFile) {
      setAttachedFile(uploadedFile);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

    if ((!newMessage.trim() && !attachedFile) || loading || !user) return;

    const messageType = attachedFile ? attachedFile.type : 'text';
    const messageContent = attachedFile ? attachedFile.name : newMessage.trim();
    
    setNewMessage('');
    const currentAttachment = attachedFile;
    setAttachedFile(null);
    setLoading(true);

    try {
      // Add user message to local state immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        content: messageContent,
        message_type: messageType,
        created_at: new Date().toISOString(),
        sender: 'user',
        user_id: user.id
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Save to database and send to AI
      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          text: messageContent,
          type: messageType,
          media_url: currentAttachment?.url,
          thread_id: profile?.default_thread_id,
          sender: 'user'
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

      // Send to AI webhook
      const response = await supabase.functions.invoke('dispatch-message', {
        body: {
          message: messageContent,
          userId: user.id,
          messageType: messageType,
          fileUrl: currentAttachment?.url,
          threadId: profile?.default_thread_id
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Fetch latest messages to get the AI response
      const { data: latestMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (latestMessages) {
        const formattedMessages = latestMessages.map(msg => ({
          id: msg.id,
          content: msg.text,
          message_type: msg.type,
          created_at: msg.created_at,
          sender: (msg.sender === 'assistant' ? 'ai' : msg.sender) as 'user' | 'ai',
          user_id: msg.user_id
        }));
        setMessages(formattedMessages);
      }

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

  const getFileIcon = (messageType: string) => {
    switch (messageType) {
      case 'audio': return <Mic className="h-3 w-3" />;
      case 'image': return <ImageIcon className="h-3 w-3" />;
      case 'video': return <Video className="h-3 w-3" />;
      case 'document': return <File className="h-3 w-3" />;
      default: return null;
    }
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
                  ? "Envie mensagens, áudios, imagens ou documentos para começar a conversar com a IA."
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
                    {message.message_type !== 'text' && (
                      <div className={`flex items-center gap-2 text-xs mb-2 ${
                        message.sender === 'user' 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {getFileIcon(message.message_type)}
                        {message.message_type}
                      </div>
                    )}
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
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
              <Card className="bg-card">
                <CardContent className="p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-4">
        {canSendMessage ? (
          <div className="max-w-4xl mx-auto">
            {attachedFile && (
              <div className="mb-3 p-2 bg-muted rounded-md flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  {getFileIcon(attachedFile.type)}
                  <span className="text-sm">{attachedFile.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRemoveAttachment}>
                  ×
                </Button>
              </div>
            )}
            <form onSubmit={handleSendMessage}>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={loading || uploading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Enviar arquivo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex-1">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={attachedFile ? "Comentário (opcional)" : "Digite sua mensagem..."}
                    disabled={loading || uploading}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || uploading || (!newMessage.trim() && !attachedFile)}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
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