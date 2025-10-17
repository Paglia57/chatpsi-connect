export const useWhatsAppFormatter = () => {
  // Formatar número para exibição: "5518981132787" → "+55 (18) 98113-2787"
  const formatForDisplay = (value: string): string => {
    if (!value) return '';
    
    // Remove tudo exceto dígitos
    const digitsOnly = value.replace(/\D/g, '');
    
    // Se começar com 55 (Brasil) e tiver pelo menos 12 dígitos, formata
    if (digitsOnly.startsWith('55') && digitsOnly.length >= 12) {
      const country = digitsOnly.slice(0, 2);
      const ddd = digitsOnly.slice(2, 4);
      const firstPart = digitsOnly.slice(4, 9);
      const secondPart = digitsOnly.slice(9, 13);
      
      return `+${country} (${ddd}) ${firstPart}-${secondPart}`;
    }
    
    // Retorna apenas dígitos se não for formato brasileiro completo
    return digitsOnly;
  };

  // Limpar para salvar no banco (apenas dígitos)
  const cleanForDatabase = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // Validar se está no formato correto
  const isValid = (value: string): boolean => {
    const digitsOnly = cleanForDatabase(value);
    // Formato brasileiro: 55 + 2 dígitos DDD + 9 dígitos (celular)
    return /^55[1-9]{2}9\d{8}$/.test(digitsOnly);
  };

  return {
    formatForDisplay,
    cleanForDatabase,
    isValid
  };
};
