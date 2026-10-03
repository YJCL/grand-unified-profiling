// Reject invalid wall-clock inputs instead of silently calculating a different date.
export class BirthInputError extends Error {
  constructor(public readonly code: string) {
    super('Birth input requires correction');
    this.name = 'BirthInputError';
  }
}

export function parseBirthDateTime(birthDate: string, birthTime?: string): {
  year: number; month: number; day: number; hour: number; minute: number; localAsUTC: Date;
} {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new BirthInputError('invalid_date');
  const [year, month, day] = birthDate.split('-').map(Number);
  const time = birthTime === undefined ? '12:00' : birthTime;
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) throw new BirthInputError('invalid_time');
  const [hour, minute] = time.split(':').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) throw new BirthInputError('invalid_date');
  if (hour > 23 || minute > 59) throw new BirthInputError('invalid_time');
  // Date.UTC treats years 0..99 as 1900..1999; setUTCFullYear preserves the requested year.
  const localAsUTC = new Date(0);
  localAsUTC.setUTCFullYear(year, month - 1, day);
  localAsUTC.setUTCHours(hour, minute, 0, 0);
  if (localAsUTC.getUTCFullYear() !== year || localAsUTC.getUTCMonth() !== month - 1 || localAsUTC.getUTCDate() !== day) throw new BirthInputError('invalid_date');
  return { year, month, day, hour, minute, localAsUTC };
}
