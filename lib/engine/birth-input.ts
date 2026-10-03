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

export function birthInputIssue(code: string): { error: string; code: string } {
  const guidance: Record<string, string> = {
    invalid_date: '存在する日付をYYYY-MM-DD形式で入力してください。',
    invalid_time: '出生時刻を00:00～23:59で入力してください。不明なら空欄にできます。',
    ambiguous_local_time: '出生地の時計が切り替わる日です。出生記録を確認するか、時刻を不明として保存してください。',
    nonexistent_local_time: '出生地の時計が切り替わった時刻です。出生記録を確認するか、時刻を不明として保存してください。',
    invalid_timezone: '出生地を市区町村まで入力してください。海外の場合は都市名と国名を添えてください。',
    unknown_place: '出生地を市区町村まで入力してください。海外の場合は都市名と国名を添えてください。',
    invalid_offset: 'UTCオフセットを確認してください。',
    invalid_coordinates: '出生地の緯度・経度を確認してください。',
    coordinates_require_timezone: '緯度・経度を指定する場合はタイムゾーンかUTCオフセットも指定してください。',
    offset_timezone_mismatch: '出生地のタイムゾーンとUTCオフセットが一致しません。出生記録を確認してください。',
  };
  return Object.hasOwn(guidance, code) ? { error: guidance[code], code } : { error: '出生データを確認してください。', code: 'calculation_input_error' };
}
