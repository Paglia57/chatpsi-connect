import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Loader2, Save, Sparkles, Plus } from 'lucide-react';

interface MarketingText {
  id: string;
  title: string | null;
  prompt: string;
  generated_text: string;
  created_at: string;
  updated_at: string;
}

const MarketingInterface = () => {
  const { toast } = useToast();
  const [texts, setTexts] = useState<MarketingText[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Esquerda - Histórico */}
      <div className="w-80 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
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
                  onClick={() => handleSelectText(text)}
                >
                  <p className="font-medium text-sm truncate">
                    {text.title || text.generated_text.split('\n')[0].substring(0, 50)}
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
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Painel Direita - Formulário */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">IA de Marketing</h1>
          <p className="text-muted-foreground">
            Gere textos de marketing com inteligência artificial
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
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

            <div className="flex gap-3">
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
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MarketingInterface;
