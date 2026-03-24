import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCopy, Pencil, Save, RefreshCw, Download, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseEvolutionContent, exportEvolutionPdf } from "@/lib/evolutionParser";

interface EvolutionOutputProps {
  content: string;
  isLoading: boolean;
  onRegenerate: () => void;
  onSave: (content: string) => void;
  isSaving: boolean;
}

export default function EvolutionOutput({ content, isLoading, onRegenerate, onSave, isSaving }: EvolutionOutputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [copied, setCopied] = useState(false);

  const displayContent = isEditing ? editedContent : content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success("Evolução copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setEditedContent(content);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(isEditing ? editedContent : content);
    setIsEditing(false);
  };

  if (isLoading && !content) {
    return (
      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
        <CardTitle className="font-display text-xl text-foreground">Evolução Clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Analisando relato da sessão e estruturando a evolução clínica...</p>
          <Progress value={33} className="w-full" />
          <div className="space-y-3 mt-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-1/2 mt-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const parsed = parseEvolutionContent(displayContent);

  return (
    <Card className="border-border bg-card text-card-foreground shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-xl text-foreground">Evolução</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={e => setEditedContent(e.target.value)}
            className="min-h-[400px] resize-y font-sans text-sm"
          />
        ) : (
          <div className="animate-fade-in prose prose-sm max-w-none">
            {parsed.map((line, i) => {
              switch (line.type) {
                case 'empty': return <div key={i} className="h-2" />;
                case 'separator': return <Separator key={i} className="my-3" />;
                case 'title': return <h2 key={i} className="font-display font-semibold text-lg text-foreground text-center border-b border-border pb-2 mb-3">{line.content}</h2>;
                case 'heading': return <h3 key={i} className="font-display font-semibold text-sm text-foreground uppercase tracking-wide mt-4 mb-1">{line.content}</h3>;
                case 'metadata': return <p key={i} className="text-sm text-muted-foreground">{line.content}</p>;
                case 'text': return <p key={i} className="text-sm text-foreground leading-relaxed">{line.content}</p>;
              }
            })}
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar evolução"}
          </Button>
          {isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Descartar alterações
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
              Editar texto
            </Button>
          )}
          <Button variant="cta" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Salvando..." : "Salvar no prontuário"}
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Regenerar evolução
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportEvolutionPdf(displayContent)}>
            <Download className="h-4 w-4" />
            Exportar como PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
