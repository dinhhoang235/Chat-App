import { Contact } from '../constants/mockData';

export const VN_ALPHABET = ['A','Ă','Â','B','C','D','Đ','E','Ê','G','H','I','K','L','M','N','O','Ô','Ơ','P','Q','R','S','T','U','Ư','V','X','Y','Z'];

export function getLetter(name: string): string {
  if (!name) return '#';
  const trimmed = name.trim();
  if (!trimmed) return '#';
  const first = trimmed[0];
  // Handle precomposed đ
  if (first.toLowerCase() === 'đ') return 'Đ';

  const norm = first.normalize('NFD');
  const base = norm[0].toUpperCase();

  // breve (Ă)
  if (norm.includes('\u0306') && base === 'A') return 'Ă';
  // circumflex (Â,Ê,Ô)
  if (norm.includes('\u0302')) {
    if (base === 'A') return 'Â';
    if (base === 'E') return 'Ê';
    if (base === 'O') return 'Ô';
  }
  // horn (Ơ,Ư)
  if (norm.includes('\u031B')) {
    if (base === 'O') return 'Ơ';
    if (base === 'U') return 'Ư';
  }

  // Default to base Latin letter (A-Z)
  if (/[A-Z]/.test(base)) return base;
  return '#';
}

export function buildContactSections(contacts: Contact[]): { title: string; data: Contact[] }[] {
  const map = new Map<string, Contact[]>();

  // Sort by VN alphabet order and then by Vietnamese locale within group
  const sorted = [...contacts].sort((a, b) => {
    const la = getLetter(a.name);
    const lb = getLetter(b.name);
    const ia = VN_ALPHABET.indexOf(la);
    const ib = VN_ALPHABET.indexOf(lb);
    if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.name.localeCompare(b.name, 'vi');
  });

  sorted.forEach((c) => {
    const letter = getLetter(c.name);
    const key = VN_ALPHABET.includes(letter) ? letter : '#';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  });

  const result: { title: string; data: Contact[] }[] = [];
  VN_ALPHABET.forEach((title) => {
    if (map.has(title)) result.push({ title, data: map.get(title)! });
  });
  if (map.has('#')) result.push({ title: '#', data: map.get('#')! });

  return result;
}
