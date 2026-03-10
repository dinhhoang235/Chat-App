export function getInitials(fullName?: string, fallbackId?: string): string {
  if (fullName) {
    return fullName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  if (fallbackId) return fallbackId.slice(-2).toUpperCase();
  return 'U';
}

export default getInitials;
