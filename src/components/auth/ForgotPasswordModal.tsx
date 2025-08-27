import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthProvider';
import { Loader2, Mail } from 'lucide-react';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ open, onOpenChange }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<number>(0);
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting básico (60 segundos)
    const now = Date.now();
    if (now - lastAttempt < 60000) {
      toast({
        title: "Aguarde um momento",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira um endereço de email válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setLastAttempt(now);

    try {
      const { error } = await resetPassword(email.trim());

      if (error) {
        toast({
          title: "Erro ao enviar instruções",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
      } else {
        // Sempre exibe mensagem neutra de sucesso
        toast({
          title: "Instruções enviadas",
          description: "Se este e-mail existir, enviaremos instruções para redefinir a senha.",
          duration: 5000,
        });
        
        setEmail('');
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-primary" />
            <DialogTitle>Esqueceu sua senha?</DialogTitle>
          </div>
          <DialogDescription>
            Digite seu email para receber instruções de redefinição de senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
              required
              disabled={loading}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar instruções
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;