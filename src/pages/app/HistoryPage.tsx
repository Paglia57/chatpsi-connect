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
import { Search, Trash2, ClipboardList, ClipboardCopy, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

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
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{ev.patient_initials}</span>
                      {ev.approach && (
                        <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-md">
                          {ev.approach}
                        </span>
                      )}
                      {ev.session_number && (
                        <span className="text-xs text-muted-foreground">Sessão {ev.session_number}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(ev.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                    {ev.output_content && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {ev.output_content.slice(0, 150)}...
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
            <DialogTitle className="font-display">
              Evolução — {selectedEvolution?.patient_initials}
            </DialogTitle>
          </DialogHeader>
          {selectedEvolution && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <span>{new Date(selectedEvolution.created_at).toLocaleDateString("pt-BR")}</span>
                {selectedEvolution.approach && <span>• {selectedEvolution.approach}</span>}
                {selectedEvolution.session_number && <span>• Sessão {selectedEvolution.session_number}</span>}
                {selectedEvolution.session_duration && <span>• {selectedEvolution.session_duration}</span>}
                {selectedEvolution.session_type && <span>• {selectedEvolution.session_type}</span>}
              </div>
              <Separator />
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  className="min-h-[300px] text-sm leading-relaxed font-sans"
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans">
                  {selectedEvolution.output_content}
                </div>
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
