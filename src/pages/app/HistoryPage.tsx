import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Trash2, ClipboardList, ClipboardCopy, Pencil, X, Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { parseEvolutionContent, getContentPreview, exportEvolutionPdf } from "@/lib/evolutionParser";

interface Evolution {
  id: string;
  patient_initials: string;
  approach: string | null;
  output_content: string | null;
  created_at: string;
  session_number: number | null;
  session_duration: string | null;
  session_type: string | null;
}

function PatientAvatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm uppercase">
      {initials.slice(0, 2)}
    </div>
  );
}

function FormattedDate({ date }: { date: string }) {
  const d = new Date(date);
  const day = d.toLocaleDateString("pt-BR", { day: "2-digit" });
  const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return (
    <div className="text-center shrink-0">
      <div className="text-lg font-bold text-foreground leading-none">{day}</div>
      <div className="text-xs text-muted-foreground uppercase">{month}</div>
    </div>
  );
}

function EvolutionDetailContent({ content }: { content: string }) {
  const parsed = parseEvolutionContent(content);
  
  // Group into sections: each heading starts a new collapsible section
  const sections: { heading: string; lines: typeof parsed }[] = [];
  let currentSection: { heading: string; lines: typeof parsed } | null = null;
  
  for (const line of parsed) {
    if (line.type === 'title') {
      // Title rendered standalone, not in a collapsible
      sections.push({ heading: '', lines: [line] });
      currentSection = null;
    } else if (line.type === 'heading') {
      currentSection = { heading: line.content, lines: [] };
      sections.push(currentSection);
    } else {
      if (currentSection) {
        currentSection.lines.push(line);
      } else {
        // Lines before any heading
        if (sections.length === 0 || sections[sections.length - 1].heading !== '') {
          sections.push({ heading: '', lines: [] });
        }
        sections[sections.length - 1].lines.push(line);
      }
    }
  }

  return (
    <div className="space-y-2">
      {sections.map((section, si) => {
        if (!section.heading) {
          // Ungrouped lines (title or preamble)
          return (
            <div key={si}>
              {section.lines.map((line, li) => (
                <LineRenderer key={li} line={line} />
              ))}
            </div>
          );
        }
        return (
          <Collapsible key={si} defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
              <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wide">{section.heading}</h3>
            </CollapsibleTrigger>
            <Separator className="mb-2" />
            <CollapsibleContent className="pl-6 space-y-1 pb-2">
              {section.lines.map((line, li) => (
                <LineRenderer key={li} line={line} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function LineRenderer({ line }: { line: { type: string; content: string } }) {
  switch (line.type) {
    case 'empty': return <div className="h-2" />;
    case 'separator': return <Separator className="my-3" />;
    case 'title': return <h2 className="font-display font-semibold text-lg text-foreground text-center border-b border-border pb-2 mb-3">{line.content}</h2>;
    case 'heading': return <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wide mt-4 mb-1">{line.content}</h3>;
    case 'metadata': return <p className="text-sm text-muted-foreground">{line.content}</p>;
    case 'text': return <p className="text-sm text-foreground leading-relaxed">{line.content}</p>;
    default: return null;
  }
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterApproach, setFilterApproach] = useState("all");
  const [selectedEvolution, setSelectedEvolution] = useState<Evolution | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEvolutions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("evolutions")
      .select("id, patient_initials, approach, output_content, created_at, session_number, session_duration, session_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setEvolutions(data);
    setLoading(false);
  };

  useEffect(() => { fetchEvolutions(); }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("evolutions").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Evolução excluída");
      setEvolutions(prev => prev.filter(e => e.id !== id));
      if (selectedEvolution?.id === id) setSelectedEvolution(null);
    }
  };

  const filtered = evolutions.filter(e => {
    const matchSearch = !search || e.patient_initials.toLowerCase().includes(search.toLowerCase()) ||
      e.output_content?.toLowerCase().includes(search.toLowerCase());
    const matchApproach = filterApproach === "all" || e.approach === filterApproach;
    return matchSearch && matchApproach;
  });

  const approaches = [...new Set(evolutions.map(e => e.approach).filter(Boolean))];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="font-display text-2xl font-semibold text-foreground">Histórico de Evoluções</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-border bg-card animate-pulse">
              <CardContent className="p-4 h-20" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Histórico de Evoluções</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por paciente ou conteúdo..."
            className="pl-9"
          />
        </div>
        <Select value={filterApproach} onValueChange={setFilterApproach}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Abordagem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as abordagens</SelectItem>
            {approaches.map(a => <SelectItem key={a!} value={a!}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma evolução encontrada</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-240px)]">
          <div className="space-y-3">
            {filtered.map(ev => (
              <Card
                key={ev.id}
                className="border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedEvolution(ev)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <FormattedDate date={ev.created_at} />
                  <PatientAvatar initials={ev.patient_initials} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base text-foreground">{ev.patient_initials}</span>
                      {ev.approach && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                          {ev.approach}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {ev.session_number && (
                        <Badge variant="outline" className="text-xs font-normal">
                          Sessão {ev.session_number}
                        </Badge>
                      )}
                      {ev.session_duration && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {ev.session_duration}
                        </Badge>
                      )}
                      {ev.session_type && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {ev.session_type}
                        </Badge>
                      )}
                    </div>
                    {ev.output_content && (
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                        {getContentPreview(ev.output_content)}
                      </p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={e => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={e => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir evolução?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A evolução de {ev.patient_initials} será permanentemente excluída.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(ev.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedEvolution} onOpenChange={(open) => { if (!open) { setSelectedEvolution(null); setIsEditing(false); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedEvolution && <PatientAvatar initials={selectedEvolution.patient_initials} />}
              <div>
                <DialogTitle className="font-display">
                  Evolução — {selectedEvolution?.patient_initials}
                </DialogTitle>
                {selectedEvolution && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-1">
                    <span>{new Date(selectedEvolution.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                    {selectedEvolution.approach && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                        {selectedEvolution.approach}
                      </Badge>
                    )}
                    {selectedEvolution.session_number && <span>• Sessão {selectedEvolution.session_number}</span>}
                    {selectedEvolution.session_duration && <span>• {selectedEvolution.session_duration}</span>}
                    {selectedEvolution.session_type && <span>• {selectedEvolution.session_type}</span>}
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedEvolution && (
            <div className="space-y-3">
              <Separator />
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  className="min-h-[300px] text-sm leading-relaxed font-sans"
                />
              ) : (
                selectedEvolution.output_content && (
                  <EvolutionDetailContent content={selectedEvolution.output_content} />
                )
              )}
              <Separator />
              <div className="flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        const { error } = await supabase
                          .from("evolutions")
                          .update({ output_content: editedContent })
                          .eq("id", selectedEvolution.id);
                        setSaving(false);
                        if (error) {
                          toast.error("Erro ao salvar alterações");
                        } else {
                          toast.success("Evolução atualizada!");
                          setEvolutions(prev => prev.map(e => e.id === selectedEvolution.id ? { ...e, output_content: editedContent } : e));
                          setSelectedEvolution({ ...selectedEvolution, output_content: editedContent });
                          setIsEditing(false);
                        }
                      }}
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditedContent(selectedEvolution.output_content || "");
                        setIsEditing(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedEvolution.output_content || "");
                        toast.success("Evolução copiada!");
                      }}
                    >
                      <ClipboardCopy className="h-4 w-4" />
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportEvolutionPdf(selectedEvolution.output_content || "")}
                    >
                      <Download className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
