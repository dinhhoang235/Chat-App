import { Contact } from '../constants/mockData';

export const VN_ALPHABET = ['A','Ă','Â','B','C','D','Đ','E','Ê','G','H','I','K','L','M','N','O','Ô','Ơ','P','Q','R','S','T','U','Ư','V','X','Y','Z'];

const VI_COLLATOR = new Intl.Collator('vi', { sensitivity: 'base', ignorePunctuation: true });
const VN_INDEX_MAP = new Map(VN_ALPHABET.map((c, i) => [c, i]));

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

export function getInitials(name?: string): string {
  if (!name) return 'U';
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export function buildContactSections(contacts: Contact[]): { title: string; data: Contact[] }[] {
  const groups = new Map<string, Contact[]>();

  // Precompute letter and alphabet index for each contact
  const items = contacts.map((c) => {
    const letter = getLetter(c.name);
    const idx = VN_INDEX_MAP.has(letter) ? VN_INDEX_MAP.get(letter)! : 999;
    return { contact: c, letter, idx };
  });

  // Sort by VN alphabet index, then by Vietnamese collation
  items.sort((a, b) => (a.idx - b.idx) || VI_COLLATOR.compare(a.contact.name, b.contact.name));

  // Group into sections
  items.forEach(({ contact, letter }) => {
    const key = VN_ALPHABET.includes(letter) ? letter : '#';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(contact);
  });

  const result: { title: string; data: Contact[] }[] = [];
  VN_ALPHABET.forEach((title) => {
    if (groups.has(title)) result.push({ title, data: groups.get(title)! });
  });
  if (groups.has('#')) result.push({ title: '#', data: groups.get('#')! });

  return result;
}
