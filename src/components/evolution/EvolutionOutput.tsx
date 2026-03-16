import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FileCheck, ClipboardCopy, Pencil, Save, RefreshCw, Download, Check } from "lucide-react";
import { toast } from "sonner";

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

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Evolução Clínica</title>
      <style>
        body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #1a1a1a; }
        h1 { font-size: 18px; text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; }
        h2 { font-size: 14px; margin-top: 20px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        p { font-size: 13px; text-align: justify; }
        hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
        @media print { body { margin: 0; } }
      </style></head><body>
      ${displayContent.split("\n").map(line => {
        if (line.startsWith("EVOLUÇÃO CLÍNICA") || line.startsWith("# ")) return `<h1>${line.replace(/^#\s*/, "")}</h1>`;
        if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\/]+$/.test(line.trim()) && line.trim().length > 3) return `<h2>${line}</h2>`;
        if (line.trim() === "---") return "<hr/>";
        if (line.trim() === "") return "";
        return `<p>${line}</p>`;
      }).join("")}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Empty state
  if (!content && !isLoading) {
    return (
      <Card className="border-border bg-card text-card-foreground shadow-sm h-full flex flex-col">
        <CardHeader>
          <CardTitle className="font-display text-xl text-foreground">Evolução Clínica</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <FileCheck className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">Sua evolução clínica aparecerá aqui</p>
          <p className="text-sm text-muted-foreground mt-1">Preencha os dados da sessão e clique em gerar</p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading && !content) {
    return (
      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="font-display text-xl text-foreground">Evolução Clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Analisando sessão e gerando evolução...</p>
          <Progress value={33} className="w-full" />
          <div className="space-y-3 mt-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-1/2 mt-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3 mt-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Content state
  return (
    <Card className="border-border bg-card text-card-foreground shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-xl text-foreground">Evolução Clínica</CardTitle>
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
            {displayContent.split("\n").map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={i} className="h-2" />;
              if (trimmed === "---") return <Separator key={i} className="my-3" />;
              if (trimmed.startsWith("EVOLUÇÃO CLÍNICA") || trimmed.startsWith("# ")) {
                return <h2 key={i} className="font-display font-semibold text-lg text-foreground text-center border-b border-border pb-2 mb-3">{trimmed.replace(/^#\s*/, "")}</h2>;
              }
              if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\/]+$/.test(trimmed) && trimmed.length > 3) {
                return <h3 key={i} className="font-display font-semibold text-sm text-foreground uppercase tracking-wide mt-4 mb-1">{trimmed}</h3>;
              }
              if (trimmed.startsWith("Data:") || trimmed.startsWith("Paciente:")) {
                return <p key={i} className="text-sm text-muted-foreground">{trimmed}</p>;
              }
              return <p key={i} className="text-sm text-foreground leading-relaxed">{trimmed}</p>;
            })}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar tudo"}
          </Button>
          {isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancelar edição
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Gerar novamente
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
