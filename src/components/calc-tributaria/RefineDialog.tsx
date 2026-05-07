import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import { OrigemAtendimentos, RefinamentoInput } from '@/lib/calc-tributaria/types';
import { parseBRLInput } from '@/lib/calc-tributaria/format';
import {
  DEFAULTS_INPUT,
  INSS_PF_11,
  INSS_PF_20,
} from '@/lib/calc-tributaria/constantes';

type ModalidadeINSS = '11' | '20' | 'PERSONALIZADO';

interface RefineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: RefinamentoInput;
  onSave: (refinamento: RefinamentoInput | undefined) => void;
}

function formatarMoedaInput(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, '');
  if (!apenasNumeros) return '';
  const numero = parseInt(apenasNumeros, 10) / 100;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export default function RefineDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: RefineDialogProps) {
  const [modalidadeInss, setModalidadeInss] = useState<ModalidadeINSS>('11');
  const [inssCustomBRL, setInssCustomBRL] = useState('');
  const [contadorBRL, setContadorBRL] = useState('');
  const [despesasAnuaisBRL, setDespesasAnuaisBRL] = useState('');
  const [proLaboreBRL, setProLaboreBRL] = useState('');
  const [origem, setOrigem] = useState<OrigemAtendimentos>('PROPRIOS');

  useEffect(() => {
    if (!open) return;
    if (initial?.contribuicaoInssBRL === INSS_PF_11) {
      setModalidadeInss('11');
      setInssCustomBRL('');
    } else if (initial?.contribuicaoInssBRL === INSS_PF_20) {
      setModalidadeInss('20');
      setInssCustomBRL('');
    } else if (initial?.contribuicaoInssBRL) {
      setModalidadeInss('PERSONALIZADO');
      setInssCustomBRL(formatarMoedaInput(String(initial.contribuicaoInssBRL * 100)));
    } else {
      setModalidadeInss('11');
      setInssCustomBRL('');
    }
    setContadorBRL(
      initial?.custoContadorMensal
        ? formatarMoedaInput(String(initial.custoContadorMensal * 100))
        : '',
    );
    setDespesasAnuaisBRL(
      initial?.despesasDedutiveisAnuais
        ? formatarMoedaInput(String(initial.despesasDedutiveisAnuais * 100))
        : '',
    );
    setProLaboreBRL(
      initial?.proLaboreMensal
        ? formatarMoedaInput(String(initial.proLaboreMensal * 100))
        : '',
    );
    setOrigem(initial?.origemAtendimentos ?? 'PROPRIOS');
  }, [open, initial]);

  const handleSave = () => {
    const refinamento: RefinamentoInput = {};

    if (modalidadeInss === '11') refinamento.contribuicaoInssBRL = INSS_PF_11;
    else if (modalidadeInss === '20') refinamento.contribuicaoInssBRL = INSS_PF_20;
    else if (inssCustomBRL) {
      const v = parseBRLInput(inssCustomBRL);
      if (v > 0) refinamento.contribuicaoInssBRL = v;
    }

    if (contadorBRL) {
      const v = parseBRLInput(contadorBRL);
      if (v >= 0) refinamento.custoContadorMensal = v;
    }
    if (despesasAnuaisBRL) {
      const v = parseBRLInput(despesasAnuaisBRL);
      if (v >= 0) refinamento.despesasDedutiveisAnuais = v;
    }
    if (proLaboreBRL) {
      const v = parseBRLInput(proLaboreBRL);
      if (v > 0) refinamento.proLaboreMensal = v;
    }
    refinamento.origemAtendimentos = origem;

    const temAlgo = Object.values(refinamento).some(
      (v) => v !== undefined && v !== null,
    );
    onSave(temAlgo ? refinamento : undefined);
  };

  const handleClearAll = () => {
    setModalidadeInss('11');
    setInssCustomBRL('');
    setContadorBRL('');
    setDespesasAnuaisBRL('');
    setProLaboreBRL('');
    setOrigem('PROPRIOS');
    onSave(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refinar análise</DialogTitle>
          <DialogDescription>
            Tudo é opcional. Quanto mais você informar, mais precisa fica a
            análise. Defaults usados quando vazios:{' '}
            <span className="font-medium">INSS 11%</span>, contador R$ 200/mês,
            sem despesas dedutíveis, pró-labore = salário mínimo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sua contribuição ao INSS</Label>
            <RadioGroup
              value={modalidadeInss}
              onValueChange={(v) => setModalidadeInss(v as ModalidadeINSS)}
              className="space-y-2"
            >
              <Label
                htmlFor="inss-11"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-accent"
              >
                <RadioGroupItem id="inss-11" value="11" />
                <div>
                  <div className="text-sm font-medium">11% sobre o mínimo</div>
                  <div className="text-xs text-muted-foreground">
                    R$ 178,31/mês (Plano Simplificado)
                  </div>
                </div>
              </Label>
              <Label
                htmlFor="inss-20"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-accent"
              >
                <RadioGroupItem id="inss-20" value="20" />
                <div>
                  <div className="text-sm font-medium">20% sobre o teto</div>
                  <div className="text-xs text-muted-foreground">
                    R$ 1.695,11/mês (Plano Normal — aposentadoria proporcional)
                  </div>
                </div>
              </Label>
              <Label
                htmlFor="inss-custom"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-accent"
              >
                <RadioGroupItem id="inss-custom" value="PERSONALIZADO" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Outro valor mensal</div>
                  <Input
                    placeholder="Ex: R$ 250,00"
                    inputMode="numeric"
                    value={inssCustomBRL}
                    onChange={(e) =>
                      setInssCustomBRL(formatarMoedaInput(e.target.value))
                    }
                    onFocus={() => setModalidadeInss('PERSONALIZADO')}
                    className="mt-2"
                  />
                </div>
              </Label>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="contador" className="text-sm font-medium">
              Custo do contador (R$/mês)
            </Label>
            <Input
              id="contador"
              inputMode="numeric"
              placeholder={`Default: R$ ${DEFAULTS_INPUT.custoContadorMensal},00`}
              value={contadorBRL}
              onChange={(e) => setContadorBRL(formatarMoedaInput(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="despesas" className="text-sm font-medium">
              Despesas dedutíveis (R$/ano)
            </Label>
            <Input
              id="despesas"
              inputMode="numeric"
              placeholder="Aluguel de sala, supervisão, formação etc."
              value={despesasAnuaisBRL}
              onChange={(e) =>
                setDespesasAnuaisBRL(formatarMoedaInput(e.target.value))
              }
            />
            <p className="text-xs text-muted-foreground">
              Apenas despesas dedutíveis pelo Carnê-Leão (atendimentos
              próprios). Default: R$ 0.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prolabore" className="text-sm font-medium">
              Pró-labore PJ (R$/mês)
            </Label>
            <Input
              id="prolabore"
              inputMode="numeric"
              placeholder="Default: salário mínimo (R$ 1.621,00)"
              value={proLaboreBRL}
              onChange={(e) => setProLaboreBRL(formatarMoedaInput(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Quanto maior o pró-labore, maior o Fator R — pode mudar para o
              Anexo III (alíquotas menores).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem" className="text-sm font-medium">
              Origem dos atendimentos
            </Label>
            <Select
              value={origem}
              onValueChange={(v) => setOrigem(v as OrigemAtendimentos)}
            >
              <SelectTrigger id="origem">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROPRIOS">Pacientes próprios</SelectItem>
                <SelectItem value="CONVENIOS">Convênios</SelectItem>
                <SelectItem value="CLINICAS">Clínicas / repasse</SelectItem>
                <SelectItem value="MISTO">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleClearAll}>
            Limpar refinamento
          </Button>
          <Button onClick={handleSave}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
