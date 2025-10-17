import { useEffect, useRef } from 'react';
import { useInternationalPhone } from '@/hooks/useInternationalPhone';
import { COUNTRIES } from '@/lib/countries';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Label } from './label';
interface InternationalPhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  label?: string;
  required?: boolean;
}
export const InternationalPhoneInput = ({
  value,
  onChange,
  defaultCountry = '55',
  label = 'Telefone',
  required = false
}: InternationalPhoneInputProps) => {
  const {
    country,
    ddd,
    number,
    setCountry,
    setDdd,
    setNumber,
    fullNumber,
    isValid,
    errors,
    parsePhone
  } = useInternationalPhone(value, defaultCountry);

  // Refs para evitar loop infinito
  const isParsingRef = useRef(false);
  const lastValueRef = useRef(value);
  const isInitialMountRef = useRef(true);

  // Parse valor inicial apenas na montagem
  useEffect(() => {
    if (isInitialMountRef.current && value) {
      isParsingRef.current = true;
      parsePhone(value);
      lastValueRef.current = value;
      isInitialMountRef.current = false;
      setTimeout(() => {
        isParsingRef.current = false;
      }, 0);
    }
  }, []);

  // Notificar mudanças para o componente pai (apenas mudanças reais do usuário)
  useEffect(() => {
    // Não notificar durante parsing inicial
    if (isParsingRef.current) return;

    // Não notificar na montagem inicial
    if (isInitialMountRef.current) return;

    // Só notificar se o valor realmente mudou
    if (fullNumber !== lastValueRef.current) {
      lastValueRef.current = fullNumber;
      onChange(fullNumber);
    }
  }, [fullNumber, onChange]);
  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const showDdd = selectedCountry && selectedCountry.dddLength > 0;
  return <div className="space-y-2">
      {label && <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>}

      <div className="flex gap-2">
        {/* Select País */}
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.name} (+{c.code})
              </SelectItem>)}
          </SelectContent>
        </Select>

        {/* Input DDD (apenas se país usar) */}
        {showDdd && <Input placeholder="DDD" value={ddd} onChange={e => setDdd(e.target.value)} maxLength={selectedCountry.dddLength} className={`w-20 ${errors.ddd ? 'border-destructive' : ''}`} />}

        {/* Input Número */}
        <Input placeholder="Número" value={number} onChange={e => setNumber(e.target.value)} maxLength={country === '55' ? 9 : undefined} className={`flex-1 ${errors.number ? 'border-destructive' : ''}`} />
      </div>

      {/* Preview do número normalizado */}
      

      {/* Mensagens de erro */}
      {errors.ddd && <p className="text-xs text-destructive">{errors.ddd}</p>}
      {errors.number && <p className="text-xs text-destructive">{errors.number}</p>}
    </div>;
};