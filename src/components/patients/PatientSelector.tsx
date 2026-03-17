import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, X, UserPlus } from "lucide-react";
import PatientFormDialog from "./PatientFormDialog";

export interface SelectedPatient {
  id: string;
  full_name: string;
  initials: string;
  approach: string | null;
  default_session_duration: string | null;
  default_session_type: string | null;
  total_sessions: number;
  last_session_at: string | null;
  openai_thread_id: string | null;
}

interface Props {
  value: SelectedPatient | null;
  onChange: (patient: SelectedPatient | null) => void;
}

export default function PatientSelector({ value, onChange }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<SelectedPatient[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPatients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, initials, approach, default_session_duration, default_session_type, total_sessions, last_session_at, openai_thread_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("full_name");
    if (data) setPatients(data);
  };

  useEffect(() => { fetchPatients(); }, [user]);

  if (value) {
    return (
      <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                {value.initials.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{value.full_name} ({value.initials})</p>
              <p className="text-xs text-muted-foreground">
                {value.last_session_at
                  ? `Última sessão: ${new Date(value.last_session_at).toLocaleDateString("pt-BR")}`
                  : "Primeira sessão"}
                {" • "}
                {value.total_sessions} sessão(ões) no contexto da IA
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-[40px] font-normal">
            <span className="text-muted-foreground">Selecione ou busque um paciente...</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar paciente..." />
            <CommandList>
              <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
              <CommandGroup>
                {patients.map(p => (
                  <CommandItem
                    key={p.id}
                    value={p.full_name}
                    onSelect={() => {
                      onChange(p);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 py-2"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs">{p.initials.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm">{p.full_name}</span>
                    {p.approach && <Badge variant="secondary" className="text-xs">{p.approach}</Badge>}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setDialogOpen(true);
                  }}
                  className="flex items-center gap-2 text-primary"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="text-sm">Cadastrar novo paciente</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <PatientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={fetchPatients} />
    </>
  );
}
