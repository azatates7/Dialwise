import en from '../src/i18n/en.json';
import tr from '../src/i18n/tr.json';
import {
  dayHeader,
  foldTurkish,
  formatDuration,
  indexLetter,
  langFromLocale,
  sortNames,
} from '../src/i18n/format';

describe('çeviri dosyaları', () => {
  it('en.json ve tr.json aynı anahtarlara sahip', () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  });

  it('boş çeviri yok', () => {
    for (const value of [...Object.values(en), ...Object.values(tr)]) {
      expect(value.trim()).not.toBe('');
    }
  });
});

describe('dil seçimi', () => {
  it('tr ile başlayan locale Türkçe, diğerleri İngilizce', () => {
    expect(langFromLocale('tr-TR')).toBe('tr');
    expect(langFromLocale('tr')).toBe('tr');
    expect(langFromLocale('en-US')).toBe('en');
    expect(langFromLocale('de-DE')).toBe('en');
    expect(langFromLocale(undefined)).toBe('en');
  });
});

describe('formatDuration', () => {
  it('TR ve EN biçimleri', () => {
    expect(formatDuration(192, 'tr')).toBe('3 dk 12 sn');
    expect(formatDuration(192, 'en')).toBe('3m 12s');
    expect(formatDuration(45, 'tr')).toBe('45 sn');
    expect(formatDuration(3720, 'en')).toBe('1h 2m');
    expect(formatDuration(-5, 'en')).toBe('0s');
  });
});

describe('Türkçe harfler', () => {
  it('foldTurkish', () => {
    expect(foldTurkish('ÇağrıŞÜİö')).toBe('CagriSUIo');
  });

  it('TR sıralama Türkçe alfabeye göre', () => {
    expect(sortNames(['Zeynep', 'Çağla', 'Cem', 'Ömer', 'Osman'], 'tr')).toEqual([
      'Cem',
      'Çağla',
      'Osman',
      'Ömer',
      'Zeynep',
    ]);
  });

  it('indeks harfi', () => {
    expect(indexLetter('çağla', 'tr')).toBe('Ç');
    expect(indexLetter('ilker', 'tr')).toBe('İ');
    expect(indexLetter('ılgaz', 'tr')).toBe('I');
    expect(indexLetter('William', 'tr')).toBe('W');
    expect(indexLetter('123', 'tr')).toBe('#');
    expect(indexLetter('çağla', 'en')).toBe('C');
    expect(indexLetter('Ömer', 'en')).toBe('O');
    expect(indexLetter('', 'en')).toBe('#');
  });
});

describe('dayHeader', () => {
  const now = new Date(2026, 10, 20, 15, 0);
  const trLabels = { today: 'Bugün', yesterday: 'Dün' };
  const enLabels = { today: 'Today', yesterday: 'Yesterday' };

  it('bugün ve dün', () => {
    expect(dayHeader(new Date(2026, 10, 20, 9, 0), now, 'tr', trLabels)).toBe('Bugün');
    expect(dayHeader(new Date(2026, 10, 19, 23, 0), now, 'en', enLabels)).toBe('Yesterday');
  });

  it('daha eski tarihler', () => {
    expect(dayHeader(new Date(2026, 10, 18), now, 'tr', trLabels)).toBe('18 Kasım');
    expect(dayHeader(new Date(2026, 10, 18), now, 'en', enLabels)).toBe('Nov 18');
    expect(dayHeader(new Date(2025, 10, 18), now, 'tr', trLabels)).toBe('18 Kasım 2025');
  });
});