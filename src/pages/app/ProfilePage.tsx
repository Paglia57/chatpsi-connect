import { useEffect, useState } from "react";
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";

const APPROACHES = [
  "TCC (Terapia Cognitivo-Comportamental)",
  "Psicanálise",
  "Humanista",
  "Comportamental",
  "Sistêmica",
  "Gestalt",
  "Psicodrama",
  "Outra",
];

const SPECIALTIES = [
  "Ansiedade",
  "Depressão",
  "TDAH",
  "Trauma",
  "Casal",
  "Infantil",
  "Dependência Química",
  "Luto",
  "TEA",
  "Transtornos Alimentares",
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [crp, setCrp] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [mainApproach, setMainApproach] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, nickname, crp, whatsapp, main_approach, specialties, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setNickname(data.nickname || "");
          setCrp(data.crp || "");
          setWhatsapp(data.whatsapp || "");
          setMainApproach(data.main_approach || "");
          setSpecialties(data.specialties || []);
          setAvatarUrl(data.avatar_url);
        }
        setLoading(false);
      });
  }, [user]);

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          nickname: nickname || null,
          crp: crp || null,
          whatsapp: whatsapp || null,
          main_approach: mainApproach || null,
          specialties: specialties.length > 0 ? specialties : null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Perfil atualizado!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const filePath = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast.error("Erro ao enviar foto");
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const url = urlData.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    setAvatarUrl(url);
    toast.success("Foto atualizada!");
  };

  const initials = fullName
    ? fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-5 w-32" />
        <div className="border rounded-lg p-6 space-y-6">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <AppBreadcrumb items={[{ label: "Meu Perfil" }]} />
      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="font-display text-xl text-foreground">Perfil Profissional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-accent text-accent-foreground text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>Alterar foto</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome" />
              <p className="text-xs text-muted-foreground">Usado no cabeçalho das evoluções clínicas</p>
            </div>
            <div className="space-y-2">
              <Label>Apelido</Label>
              <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Como quer ser chamado" />
              <p className="text-xs text-muted-foreground">Como você quer ser chamado dentro do app</p>
            </div>
            <div className="space-y-2">
              <Label>CRP</Label>
              <Input value={crp} onChange={e => setCrp(e.target.value)} placeholder="Ex: 06/123456" />
              <p className="text-xs text-muted-foreground">Formato: UF/número (ex: 06/123456). Aparece nas evoluções geradas</p>
            </div>
          </div>

          <div className="space-y-2">
            <InternationalPhoneInput value={whatsapp} onChange={setWhatsapp} label="WhatsApp" />
            <p className="text-xs text-muted-foreground">Usado para contato, suporte e futura integração com WhatsApp</p>
          </div>

          <div className="space-y-2">
            <Label>Abordagem principal</Label>
            <Select value={mainApproach} onValueChange={setMainApproach}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {APPROACHES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Será pré-selecionada ao criar novas evoluções</p>
          </div>

          <div className="space-y-2">
            <Label>Especialidades</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPECIALTIES.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={specialties.includes(s)}
                    onCheckedChange={() => toggleSpecialty(s)}
                  />
                  <span className="text-sm text-foreground">{s}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Ajudam a IA a personalizar sugestões e planos de ação</p>
          </div>

          <Button variant="cta" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
