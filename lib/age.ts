const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function japanToday(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

export function ageFromBirthDate(birthDate: string, now: Date = new Date()): number | null {
  const match = DATE_ONLY.exec(birthDate.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) return null;

  const today = japanToday(now);
  let age = today.year - year;
  if (today.month < month || (today.month === month && today.day < day)) age -= 1;
  return age >= 0 ? age : null;
}

export function isAtLeastAge(birthDate: string, minimumAge: number, now: Date = new Date()): boolean {
  const age = ageFromBirthDate(birthDate, now);
  return age !== null && age >= minimumAge;
}
