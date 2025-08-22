import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { Send, Paperclip, Crown, AlertCircle, Bot, User as UserIcon, Lock, Upload, Mic, Image as ImageIcon, Video, File, Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload, UploadedFile } from '@/hooks/useFileUpload';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { formatMessageContent } from '@/lib/utils';
interface Message {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender: 'user' | 'ai';
  user_id?: string;
  status?: 'pending' | 'sent' | 'failed';
  media_url?: string;
}
type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
const ChatInterface = () => {
  const {
    profile,
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(true);
  const [attachedFile, setAttachedFile] = useState<UploadedFile | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    uploadFile,
    uploading
  } = useFileUpload();
  const {
    state: recordingState,
    duration: recordingDuration,
    formatDuration,
    startRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecording();
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth"
      });
    }, 100);
  }, []);
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Clear typing indicator after timeout
  useEffect(() => {
    if (isAssistantTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsAssistantTyping(false);
        console.log('Typing indicator cleared due to timeout');
      }, 30000); // 30 seconds timeout
    }
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isAssistantTyping]);

  // Fetch messages from database with fallback
  const fetchMessages = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setFetchingMessages(true);
    try {
      const {
        data,
        error
      } = await supabase.from('messages').select('*').eq('thread_id', user.id).eq('is_deleted', false).order('created_at', {
        ascending: true
      });
      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      const formattedMessages = data.map(msg => ({
        id: msg.id,
        content: msg.content,
        message_type: msg.type,
        created_at: msg.created_at,
        sender: (msg.sender === 'assistant' ? 'ai' : msg.sender) as 'user' | 'ai',
        user_id: msg.user_id,
        status: 'sent' as const,
        media_url: msg.media_url
      }));
      setMessages(formattedMessages);
      return true;
    } catch (error) {
      console.error('Error in fetchMessages:', error);
      toast({
        title: "Erro ao carregar mensagens",
        description: "Tentando novamente...",
        variant: "destructive"
      });
      return false;
    } finally {
      if (showLoading) setFetchingMessages(false);
    }
  }, [user, toast]);

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Setup real-time subscription with reconnection logic
  const setupRealtimeConnection = useCallback(() => {
    if (!user || realtimeChannel) return;
    console.log('Setting up real-time connection...');
    setConnectionStatus('reconnecting');
    const channel = supabase.channel(`messages-${user.id}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `user_id=eq.${user.id}`
    }, payload => {
      console.log('New message received via real-time:', payload);
      const newMessage = payload.new as any;
      const formattedMessage: Message = {
        id: newMessage.id,
        content: newMessage.content,
        message_type: newMessage.type,
        created_at: newMessage.created_at,
        sender: (newMessage.sender === 'assistant' ? 'ai' : newMessage.sender) as 'user' | 'ai',
        user_id: newMessage.user_id,
        status: 'sent' as const,
        media_url: newMessage.media_url
      };

      // Update messages and handle typing indicator
      setMessages(prevMessages => {
        const exists = prevMessages.some(msg => msg.id === formattedMessage.id);
        if (exists) return prevMessages;

        // Remove pending message with same content if exists
        const withoutPending = prevMessages.filter(msg => !(msg.status === 'pending' && msg.content === formattedMessage.content));
        return [...withoutPending, formattedMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      // Handle AI response
      if (formattedMessage.sender === 'ai') {
        setIsAssistantTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (responseTimeoutRef.current) {
          clearTimeout(responseTimeoutRef.current);
        }
      }
    }).subscribe(status => {
      console.log('Real-time subscription status:', status);
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
        setRealtimeChannel(channel);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnectionStatus('disconnected');
        // Retry connection after delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setupRealtimeConnection();
        }, 5000);
      }
    });
  }, [user, realtimeChannel]);

  // Real-time connection management
  useEffect(() => {
    setupRealtimeConnection();
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        setRealtimeChannel(null);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setConnectionStatus('disconnected');
    };
  }, [setupRealtimeConnection]);
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
  const handleStartRecording = async () => {
    const started = await startRecording();
    if (started) {
      toast({
        title: "Gravação iniciada",
        description: "Fale agora. Clique no microfone novamente para parar."
      });
    }
  };
  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result) {
      toast({
        title: "Gravação concluída",
        description: `Áudio de ${formatDuration(result.duration)} gravado com sucesso.`
      });

      // Upload the recorded audio file
      const uploadedFile = await uploadFile(result.file);
      if (uploadedFile) {
        setAttachedFile(uploadedFile);
      }
    }
  };
  const handleCancelRecording = () => {
    cancelRecording();
    toast({
      title: "Gravação cancelada",
      description: "O áudio foi descartado.",
      variant: "destructive"
    });
  };
  const getMicrophoneIcon = () => {
    switch (recordingState) {
      case 'requesting-permission':
        return <Mic className="h-4 w-4 animate-pulse" />;
      case 'recording':
        return <Mic className="h-4 w-4 text-destructive animate-pulse" />;
      case 'processing':
        return <Mic className="h-4 w-4 animate-spin" />;
      default:
        return <Mic className="h-4 w-4" />;
    }
  };
  const getMicrophoneVariant = () => {
    switch (recordingState) {
      case 'recording':
        return 'destructive' as const;
      case 'requesting-permission':
      case 'processing':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  // Handle refresh - interrupt response and reload messages
  const handleRefresh = async () => {
    // Clear typing state and timeouts
    setIsAssistantTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }

    // Reload messages
    await fetchMessages(true);
    toast({
      title: "Chat atualizado",
      description: "Resposta interrompida e mensagens recarregadas.",
      variant: "default"
    });
  };
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendMessage) {
      toast({
        title: "Assinatura necessária",
        description: "Você precisa de uma assinatura ativa para enviar mensagens.",
        variant: "destructive"
      });
      return;
    }
    if (!newMessage.trim() && !attachedFile || isAssistantTyping || !user) return;
    const messageType = attachedFile ? attachedFile.type : 'text';
    const messageContent = attachedFile ? attachedFile.name : newMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Clear form
    setNewMessage('');
    const currentAttachment = attachedFile;
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Start typing indicator and timeout
    setIsAssistantTyping(true);
    try {
      // Add user message with pending status
      const userMessage: Message = {
        id: tempId,
        content: messageContent,
        message_type: messageType,
        created_at: new Date().toISOString(),
        sender: 'user',
        user_id: user.id,
        status: 'pending'
      };
      setMessages(prev => [...prev, userMessage]);

      // Set response timeout (30 seconds)
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      responseTimeoutRef.current = setTimeout(async () => {
        console.log('Response timeout - fetching messages from database');
        setIsAssistantTyping(false);

        // Fetch latest messages as fallback
        const success = await fetchMessages(false);
        if (success) {
          toast({
            title: "Resposta demorou mais que o esperado",
            description: "Mensagens atualizadas automaticamente.",
            variant: "default"
          });
        }
      }, 30000);

      // Send to AI via dispatch-message Edge Function
      const response = await supabase.functions.invoke('dispatch-message', {
        body: {
          userId: user.id,
          message: messageContent,
          messageType: messageType,
          fileUrl: currentAttachment?.url
        }
      });
      if (response.error) {
        throw new Error(response.error.message);
      }

      // Mark user message as sent
      setMessages(prev => prev.map(msg => msg.id === tempId ? {
        ...msg,
        status: 'sent' as const
      } : msg));
      console.log('Message sent successfully, waiting for AI response...');
    } catch (error) {
      console.error('Error sending message:', error);

      // Mark message as failed
      setMessages(prev => prev.map(msg => msg.id === tempId ? {
        ...msg,
        status: 'failed' as const
      } : msg));
      setIsAssistantTyping(false);
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      toast({
        title: "Erro ao enviar mensagem",
        description: "Tente novamente ou verifique sua conexão.",
        variant: "destructive"
      });
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
      case 'audio':
        return <Mic className="h-3 w-3" />;
      case 'image':
        return <ImageIcon className="h-3 w-3" />;
      case 'video':
        return <Video className="h-3 w-3" />;
      case 'document':
        return <File className="h-3 w-3" />;
      default:
        return null;
    }
  };
  if (fetchingMessages) {
    return <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Bot className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
          <p className="text-muted-foreground">Carregando suas conversas...</p>
        </div>
      </div>;
  }
  return <div className="flex-1 flex flex-col h-full">
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
            {/* Connection Status */}
            
            
            {/* Subscription Status */}
            {profile?.subscription_active ? <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                <Crown className="h-3 w-3 mr-1" />
                Ativa
              </Badge> : <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                Inativa
              </Badge>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Bem-vindo ao ChatPsi!</h3>
              <p className="text-muted-foreground mb-4">
                {canSendMessage ? "Envie mensagens, áudios, imagens ou documentos para começar a conversar com a IA." : "Você precisa de uma assinatura ativa para começar a conversar."}
              </p>
              {!canSendMessage && <Button variant="cta">
                  Ativar Assinatura
                </Button>}
            </div> : messages.map(message => <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.sender === 'ai' && <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>}
                
                <Card className={`max-w-[70%] ${message.sender === 'user' ? message.status === 'failed' ? 'bg-destructive/10 border-destructive text-destructive' : message.status === 'pending' ? 'bg-primary/70 text-primary-foreground opacity-70' : 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                  <CardContent className="p-3">
                    {message.message_type !== 'text' && <div className={`flex items-center gap-2 text-xs mb-2 ${message.sender === 'user' ? message.status === 'failed' ? 'text-destructive/70' : 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {getFileIcon(message.message_type)}
                        {message.message_type}
                      </div>}
                     {message.message_type === 'audio' && message.media_url ? <div className="mb-2">
                          <AudioPlayer url={message.media_url} />
                        </div> : message.sender === 'ai' ? <div className="text-sm whitespace-pre-wrap break-words">{formatMessageContent(message.content)}</div> : <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs ${message.sender === 'user' ? message.status === 'failed' ? 'text-destructive/70' : 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatTime(message.created_at)}
                      </p>
                      {message.sender === 'user' && message.status && <div className={`text-xs ${message.status === 'failed' ? 'text-destructive/70' : message.status === 'pending' ? 'text-primary-foreground/70' : 'text-primary-foreground/70'}`}>
                          {message.status === 'pending' ? 'Enviando...' : message.status === 'failed' ? 'Falhou' : message.status === 'sent' ? '✓' : ''}
                        </div>}
                    </div>
                  </CardContent>
                </Card>

                {message.sender === 'user' && <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-accent-primary" />
                    </div>
                  </div>}
              </div>)}
          {isAssistantTyping && <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary animate-pulse" />
                </div>
              </div>
              <Card className="bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{
                    animationDelay: '0.1s'
                  }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{
                    animationDelay: '0.2s'
                  }}></div>
                    </div>
                    <span className="text-xs text-muted-foreground">digitando...</span>
                  </div>
                </CardContent>
              </Card>
            </div>}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-4">
        {canSendMessage ? <div className="max-w-4xl mx-auto">
            {attachedFile && <div className="mb-3 p-2 bg-muted rounded-md flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  {getFileIcon(attachedFile.type)}
                  <span className="text-sm">{attachedFile.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRemoveAttachment}>
                  ×
                </Button>
              </div>}
            {recordingState === 'recording' && <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-destructive">
                    <Mic className="h-4 w-4 animate-pulse" />
                    <span className="text-sm font-medium">Gravando áudio</span>
                    <span className="text-sm">{formatDuration(recordingDuration)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={handleCancelRecording}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" variant="default" onClick={handleStopRecording}>
                      Parar
                    </Button>
                  </div>
                </div>
              </div>}
            <form onSubmit={handleSendMessage}>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="icon" variant="outline" disabled={isAssistantTyping || uploading || recordingState !== 'idle'}>
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
                
                {/* Microphone Button */}
                <Button type="button" size="icon" variant={getMicrophoneVariant()} disabled={isAssistantTyping || uploading || attachedFile !== null} onClick={recordingState === 'recording' ? handleStopRecording : handleStartRecording} title={recordingState === 'idle' ? 'Gravar áudio' : recordingState === 'recording' ? `Parar gravação (${formatDuration(recordingDuration)})` : recordingState === 'requesting-permission' ? 'Solicitando permissão...' : 'Processando áudio...'}>
                  {getMicrophoneIcon()}
                </Button>
                <div className="flex-1">
                  <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={recordingState === 'recording' ? `Gravando... ${formatDuration(recordingDuration)}` : attachedFile ? "Comentário (opcional)" : "Digite sua mensagem..."} disabled={isAssistantTyping || uploading || recordingState !== 'idle'} />
                </div>
                
                {/* Refresh Button - only show when AI is typing */}
                {isAssistantTyping && <Button type="button" size="icon" variant="outline" onClick={handleRefresh} title="Interromper e recarregar" className="text-muted-foreground hover:text-foreground">
                    <RefreshCw className="h-4 w-4" />
                  </Button>}
                
                <Button type="submit" disabled={isAssistantTyping || uploading || recordingState !== 'idle' || !newMessage.trim() && !attachedFile} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.heic,.webp,audio/*,.mp3,.ogg,.wav,.m4a,video/*,.pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
          </div> : <div className="max-w-4xl mx-auto text-center py-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Assinatura necessária para enviar mensagens</span>
            </div>
            <Button variant="cta" size="sm">
              Ativar Assinatura
            </Button>
          </div>}
      </div>
    </div>;
};
export default ChatInterface;