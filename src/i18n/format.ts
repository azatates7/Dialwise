// Dile bağlı biçimlendirme ve metin yardımcıları.
// React / React Native bağımlılığı yok: Jest'te doğrudan test edilebilir.

export type Lang = 'tr' | 'en';

/** Sistem locale'inden uygulama dilini seçer: "tr" ile başlıyorsa Türkçe, değilse İngilizce. */
export function langFromLocale(locale: string | undefined | null): Lang {
  return (locale ?? '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

const TR_FOLD: Record<string, string> = {
  Ç: 'C', ç: 'c', Ğ: 'G', ğ: 'g', ı: 'i', İ: 'I',
  Ö: 'O', ö: 'o', Ş: 'S', ş: 's', Ü: 'U', ü: 'u',
};

/** Türkçe ve diğer aksanlı harfleri ASCII karşılıklarına çevirir (T9 ve EN indeksi için). */
export function foldTurkish(s: string): string {
  return s
    .replace(/[ÇçĞğıİÖöŞşÜü]/g, ch => TR_FOLD[ch])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Dile uygun büyük harf dönüşümü (TR'de i → İ, ı → I). */
export function toUpper(s: string, lang: Lang): string {
  return s.toLocaleUpperCase(lang === 'tr' ? 'tr-TR' : 'en-US');
}

// Türkçe alfabe + yabancı isimler için Q, W, X.
export const TR_ALPHABET = 'A B C Ç D E F G Ğ H I İ J K L M N O Ö P Q R S Ş T U Ü V W X Y Z'.split(' ');
export const EN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function alphabet(lang: Lang): string[] {
  return lang === 'tr' ? TR_ALPHABET : EN_ALPHABET;
}

/** Kişi listesindeki hızlı kaydırma indeksi için ismin harfi. Harf değilse "#". */
export function indexLetter(name: string, lang: Lang): string {
  const first = name.trim().charAt(0);
  if (!first) {
    return '#';
  }
  if (lang === 'tr') {
    const u = toUpper(first, 'tr');
    if (TR_ALPHABET.includes(u)) {
      return u;
    }
    const folded = foldTurkish(u);
    return TR_ALPHABET.includes(folded) ? folded : '#';
  }
  const f = foldTurkish(first).toUpperCase();
  return EN_ALPHABET.includes(f) ? f : '#';
}

const collators: Partial<Record<Lang, Intl.Collator>> = {};

export function collator(lang: Lang): Intl.Collator {
  if (!collators[lang]) {
    collators[lang] = new Intl.Collator(lang === 'tr' ? 'tr' : 'en', { sensitivity: 'base' });
  }
  return collators[lang]!;
}

export function sortNames(names: readonly string[], lang: Lang): string[] {
  return [...names].sort(collator(lang).compare);
}

/** Görüşme süresi: TR "3 dk 12 sn", EN "3m 12s". Bir saati geçerse saniye gösterilmez. */
export function formatDuration(totalSeconds: number, lang: Lang): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const u = lang === 'tr' ? { h: ' sa', m: ' dk', s: ' sn' } : { h: 'h', m: 'm', s: 's' };
  if (h > 0) {
    return `${h}${u.h} ${m}${u.m}`;
  }
  if (m > 0) {
    return `${m}${u.m} ${sec}${u.s}`;
  }
  return `${sec}${u.s}`;
}

/** Saat: TR her zaman 24 saat; EN cihazın kendi biçimini kullanır. */
export function formatTime(date: Date, lang: Lang): string {
  if (lang === 'tr') {
    return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Recents bölüm başlığı: Bugün / Dün / "18 Kasım" (TR), Today / Yesterday / "Nov 18" (EN). */
export function dayHeader(
  date: Date,
  now: Date,
  lang: Lang,
  labels: { today: string; yesterday: string },
): string {
  if (sameDay(date, now)) {
    return labels.today;
  }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(date, yesterday)) {
    return labels.yesterday;
  }
  const withYear = date.getFullYear() !== now.getFullYear();
  return new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: lang === 'tr' ? 'long' : 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(date);
}