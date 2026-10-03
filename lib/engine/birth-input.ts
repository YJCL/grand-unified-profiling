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
    invalid_time: '出生時刻を00:00～23:59で入力してください。不明な場合は未入力にすると現地正午を仮定します。',
    ambiguous_local_time: '夏時間の切替により出生時刻が2通りあります。正確な時刻・UTCオフセットを確認してください。確認できない場合は出生時刻を未入力にし、現地正午の仮定で鑑定できます。',
    nonexistent_local_time: '夏時間の切替により、その現地時刻は存在しません。出生記録の時刻を確認してください。不明な場合は出生時刻を未入力にすると現地正午を仮定します。',
    invalid_timezone: '出生地のタイムゾーンを確認してください。',
    invalid_offset: 'UTCオフセットを確認してください。',
    invalid_coordinates: '出生地の緯度・経度を確認してください。',
    coordinates_require_timezone: '緯度・経度を指定する場合はタイムゾーンかUTCオフセットも指定してください。',
    offset_timezone_mismatch: '出生地のタイムゾーンとUTCオフセットが一致しません。出生記録を確認してください。',
  };
  return Object.hasOwn(guidance, code) ? { error: guidance[code], code } : { error: '出生データを確認してください。', code: 'calculation_input_error' };
}
