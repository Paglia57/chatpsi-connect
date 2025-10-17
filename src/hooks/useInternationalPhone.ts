import { useState, useEffect } from 'react';
import { COUNTRIES } from '@/lib/countries';

interface UseInternationalPhoneReturn {
  country: string;
  ddd: string;
  number: string;
  setCountry: (country: string) => void;
  setDdd: (ddd: string) => void;
  setNumber: (number: string) => void;
  fullNumber: string;
  isValid: boolean;
  errors: {
    ddd: string;
    number: string;
  };
  parsePhone: (phone: string) => void;
}

export const useInternationalPhone = (
  initialValue?: string,
  defaultCountry: string = '55'
): UseInternationalPhoneReturn => {
  const [country, setCountry] = useState(defaultCountry);
  const [ddd, setDdd] = useState('');
  const [number, setNumber] = useState('');

  // Limpar apenas dígitos
  const cleanDigits = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // Parse telefone completo em partes
  const parsePhone = (phone: string) => {
    if (!phone) {
      setCountry(defaultCountry);
      setDdd('');
      setNumber('');
      return;
    }

    const digits = cleanDigits(phone);
    
    // Tentar identificar país pelo código
    const matchedCountry = COUNTRIES.find(c => digits.startsWith(c.code));
    
    if (matchedCountry) {
      const countryCode = matchedCountry.code;
      const remaining = digits.slice(countryCode.length);
      
      setCountry(countryCode);
      
      if (matchedCountry.dddLength > 0) {
        setDdd(remaining.slice(0, matchedCountry.dddLength));
        setNumber(remaining.slice(matchedCountry.dddLength));
      } else {
        setDdd('');
        setNumber(remaining);
      }
    } else {
      // Se não identificar, assume país default
      setCountry(defaultCountry);
      setDdd('');
      setNumber(digits);
    }
  };

  // Parse inicial
  useEffect(() => {
    if (initialValue) {
      parsePhone(initialValue);
    }
  }, [initialValue]);

  // Validar Brasil
  const validateBrazil = (): { ddd: string; number: string } => {
    const errors = { ddd: '', number: '' };

    if (country === '55') {
      // DDD deve ter exatamente 2 dígitos
      if (ddd.length > 0 && ddd.length !== 2) {
        errors.ddd = 'DDD deve ter 2 dígitos (11-99)';
      }

      // Número deve ter 8 ou 9 dígitos
      if (number.length > 0 && number.length !== 8 && number.length !== 9) {
        errors.number = 'Número deve ter 8 ou 9 dígitos';
      }
    }

    return errors;
  };

  // Obter número completo
  const fullNumber = country + ddd + number;

  // Validar
  const errors = validateBrazil();
  const isValid = 
    country.length > 0 &&
    (country === '55' ? ddd.length === 2 : true) &&
    number.length > 0 &&
    !errors.ddd &&
    !errors.number;

  return {
    country,
    ddd,
    number,
    setCountry,
    setDdd: (value: string) => setDdd(cleanDigits(value)),
    setNumber: (value: string) => setNumber(cleanDigits(value)),
    fullNumber,
    isValid,
    errors,
    parsePhone,
  };
};
