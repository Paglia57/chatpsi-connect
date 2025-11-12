import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Loader2, Save, Sparkles, Plus, ArrowLeft, Trash2, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MarketingText {
  id: string;
  title: string | null;
  prompt: string;
  generated_text: string;
  created_at: string;
  updated_at: string;
}

const MarketingInterface = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [texts, setTexts] = useState<MarketingText[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [textToDelete, setTextToDelete] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('marketing_texts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTexts(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar o histórico',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite um pedido para o assistente',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketing_ai_dispatch', {
        body: { prompt },
      });

      if (error) throw error;

      if (data?.success) {
        setGeneratedText(data.generated_text);
        toast({
          title: 'Sucesso',
          description: 'Texto gerado com IA!',
        });
      } else {
        throw new Error(data?.error || 'Erro ao gerar texto');
      }
    } catch (error) {
      console.error('Erro ao gerar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível gerar o texto',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não há texto para salvar',
      });
      return;
    }

    setIsSaving(true);
    try {
      const title = generatedText.split('\n')[0].substring(0, 50);

      if (selectedId) {
        const { error } = await supabase
          .from('marketing_texts')
          .update({
            prompt,
            generated_text: generatedText,
            title,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedId);

        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { error } = await supabase
          .from('marketing_texts')
          .insert({
            user_id: user.id,
            prompt,
            generated_text: generatedText,
            title,
          });

        if (error) throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Texto salvo com sucesso!',
      });

      await fetchHistory();

      if (!selectedId) {
        setPrompt('');
        setGeneratedText('');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar o texto',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectText = (text: MarketingText) => {
    setSelectedId(text.id);
    setPrompt(text.prompt);
    setGeneratedText(text.generated_text);
  };

  const handleNewText = () => {
    setSelectedId(null);
    setPrompt('');
    setGeneratedText('');
  };

  const handleDeleteClick = (e: React.MouseEvent, textId: string) => {
    e.stopPropagation();
    setTextToDelete(textId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!textToDelete) return;

    try {
      const { error } = await supabase
        .from('marketing_texts')
        .delete()
        .eq('id', textToDelete);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Texto excluído com sucesso!',
      });

      if (selectedId === textToDelete) {
        handleNewText();
      }

      await fetchHistory();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível excluir o texto',
      });
    } finally {
      setDeleteDialogOpen(false);
      setTextToDelete(null);
    }
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/chat')}
          className="mb-4 w-full justify-start"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para o Chat
        </Button>
        
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Histórico</h2>
          <Button size="sm" variant="outline" onClick={handleNewText}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoadingHistory ? (
          <div className="p-4 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Carregando...
          </div>
        ) : texts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Nenhum texto salvo ainda
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {texts.map((text) => (
              <Card
                key={text.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedId === text.id ? 'bg-primary/10 border-primary' : ''
                }`}
                onClick={() => {
                  handleSelectText(text);
                  if (isMobile) setSidebarOpen(false);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {text.title || text.generated_text.split('\n')[0].substring(0, 30)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(text.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteClick(e, text.id)}
                    title="Excluir texto"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop: Sidebar fixa */}
      {!isMobile && (
        <div className="w-80 border-r bg-muted/10 flex flex-col">
          <SidebarContent />
        </div>
      )}

      {/* Painel Direita - Formulário */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 md:p-6 border-b">
          <div className="flex items-center gap-4">
            {/* Mobile: Botão hambúrguer */}
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="flex flex-col h-full">
                    <SidebarContent />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            <div>
              <h1 className="text-xl md:text-2xl font-bold">IA de Marketing</h1>
              <p className="text-muted-foreground text-xs md:text-sm">
                Gere textos de marketing com inteligência artificial
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prompt">Pedido ao assistente</Label>
              <Textarea
                id="prompt"
                placeholder="Descreva o que você quer que a IA crie..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="generated">Texto gerado / editável</Label>
              <Textarea
                id="generated"
                placeholder="O texto gerado pela IA aparecerá aqui e poderá ser editado..."
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                rows={12}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar com IA
                  </>
                )}
              </Button>

              <Button
                onClick={handleSave}
                disabled={isSaving || !generatedText.trim()}
                variant="secondary"
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>

              {selectedId && (
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteClick(e, selectedId);
                  }}
                  variant="destructive"
                  size="icon"
                  title="Excluir texto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este texto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarketingInterface;
