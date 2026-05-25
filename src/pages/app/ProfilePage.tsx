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
  "Fenomenologia Existencial e Humanista",
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
  const [outraSelected, setOutraSelected] = useState(false);
  const [outraText, setOutraText] = useState("");
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
          const allSpecs = data.specialties || [];
          const outraEntry = allSpecs.find((s: string) => s.startsWith('Outra:'));
          setSpecialties(allSpecs.filter((s: string) => !s.startsWith('Outra:')));
          setOutraSelected(!!outraEntry);
          setOutraText(outraEntry?.replace('Outra: ', '') || '');
          setAvatarUrl(data.avatar_url);
        }
        setLoading(false);
      });
  }, [user]);

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const getAllSpecialties = () => {
    const all = [...specialties];
    if (outraSelected && outraText.trim()) {
      all.push(`Outra: ${outraText.trim()}`);
    }
    return all;
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
          specialties: getAllSpecialties().length > 0 ? getAllSpecialties() : null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Perfil clínico atualizado");
    } catch (err: any) {
      toast.error("Não foi possível atualizar o perfil. Tente novamente.");
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
      toast.error("Não foi possível enviar a foto. Tente com um arquivo menor.");
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const url = urlData.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    setAvatarUrl(url);
    toast.success("Foto de perfil atualizada");
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
          <CardTitle className="font-display text-xl text-foreground">Seu perfil clínico</CardTitle>
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
              <Label>Nome completo do profissional</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome" />
              <p className="text-xs text-muted-foreground">Usado no cabeçalho das evoluções clínicas</p>
            </div>
            <div className="space-y-2">
              <Label>Como prefere ser chamado</Label>
              <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Como quer ser chamado" />
              <p className="text-xs text-muted-foreground">Como você quer ser chamado dentro do app</p>
            </div>
            <div className="space-y-2">
              <Label>Registro profissional (CRP/CRM)</Label>
              <Input value={crp} onChange={e => setCrp(e.target.value)} placeholder="Ex: 06/123456" />
              <p className="text-xs text-muted-foreground">Formato: UF/número (ex: 06/123456). Aparece nas evoluções geradas</p>
            </div>
          </div>

          <div className="space-y-2">
            <InternationalPhoneInput value={whatsapp} onChange={setWhatsapp} label="WhatsApp" />
            <p className="text-xs text-muted-foreground">Usado para contato, suporte e futura integração com WhatsApp</p>
          </div>

          <div className="space-y-2">
            <Label>Abordagem terapêutica principal</Label>
            <Select value={mainApproach} onValueChange={setMainApproach}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {APPROACHES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Pré-selecionada automaticamente ao gerar evoluções clínicas</p>
          </div>

          <div className="space-y-2">
            <Label>Áreas de atuação</Label>
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
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={outraSelected}
                  onCheckedChange={(checked) => {
                    setOutraSelected(!!checked);
                    if (!checked) setOutraText('');
                  }}
                />
                <span className="text-sm text-foreground">Outra</span>
              </label>
            </div>
            {outraSelected && (
              <Input
                value={outraText}
                onChange={e => setOutraText(e.target.value)}
                placeholder="Digite sua área de atuação"
                className="mt-2"
              />
            )}
            <p className="text-xs text-muted-foreground">A IA priorizará conteúdos e sugestões dessas áreas</p>
          </div>

          <Button variant="cta" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar perfil
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-display text-lg">Privacidade e direitos do titular</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O ChatPsi trata dados sensíveis de saúde mental e está em conformidade com a LGPD (Lei 13.709/2018).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer">
                Política de Privacidade
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer">
                Termos de Uso
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/cookies" target="_blank" rel="noopener noreferrer">
                Preferências de cookies
              </a>
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-3">
            <div>
              <p className="font-medium text-foreground">Controlador</p>
              <p className="text-muted-foreground mt-1">SECONSULT TECNOLOGIA E SAÚDE LTDA</p>
              <p className="text-xs text-muted-foreground">CNPJ: 40.044.401/0001-68</p>
              <p className="text-xs text-muted-foreground">Endereço: Rua Sete de Setembro, 543 — Apt 121, Centro, Sorocaba/SP, CEP 18035-001</p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="font-medium text-foreground">Encarregado (DPO)</p>
              <p className="text-muted-foreground mt-1">&lt;NOME COMPLETO DO ENCARREGADO&gt;</p>
              <p className="text-muted-foreground">
                <a className="underline underline-offset-2 hover:text-foreground" href="mailto:seconsult.clinica@gmail.com">
                  seconsult.clinica@gmail.com
                </a>{" "}
                ·{" "}
                <a className="underline underline-offset-2 hover:text-foreground" href="https://wa.me/5511942457454" target="_blank" rel="noopener noreferrer">
                  WhatsApp (secundário) 11 94245-7454
                </a>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Canal preferencial: e-mail. Para exercer seus direitos (Art. 18 LGPD), entre em
                contato pelo Encarregado. SLA de resposta: até 15 dias corridos (Art. 19, II LGPD).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
