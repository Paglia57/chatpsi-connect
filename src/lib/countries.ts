export interface Country {
  code: string;
  name: string;
  flag: string;
  dddLength: number;
  phoneLength: number[];
}

export const COUNTRIES: Country[] = [
  { code: '55', name: 'Brasil', flag: '🇧🇷', dddLength: 2, phoneLength: [8, 9] },
  { code: '1', name: 'EUA/Canadá', flag: '🇺🇸', dddLength: 3, phoneLength: [10] },
  { code: '351', name: 'Portugal', flag: '🇵🇹', dddLength: 0, phoneLength: [9] },
  { code: '34', name: 'Espanha', flag: '🇪🇸', dddLength: 0, phoneLength: [9] },
  { code: '44', name: 'Reino Unido', flag: '🇬🇧', dddLength: 0, phoneLength: [10, 11] },
  { code: '49', name: 'Alemanha', flag: '🇩🇪', dddLength: 0, phoneLength: [10, 11] },
  { code: '33', name: 'França', flag: '🇫🇷', dddLength: 0, phoneLength: [9] },
  { code: '39', name: 'Itália', flag: '🇮🇹', dddLength: 0, phoneLength: [9, 10] },
  { code: '52', name: 'México', flag: '🇲🇽', dddLength: 0, phoneLength: [10] },
  { code: '54', name: 'Argentina', flag: '🇦🇷', dddLength: 0, phoneLength: [10] },
];
