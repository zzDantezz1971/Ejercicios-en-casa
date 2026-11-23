import { LANG, LOCALE, type Lang } from './index';

/**
 * Fechas en el idioma de la app. En catalán, castellano e inglés las escribe el navegador; en gallego y euskera las
 * escribimos nosotros, porque hay navegadores y WebViews que no traen esos idiomas (y saldrían en inglés) y porque el
 * formato vasco del navegador («azaroa 23(a), astelehena») no es el que se usa.
 */
const N = {
  gl: {
    wd: ['domingo', 'luns', 'martes', 'mércores', 'xoves', 'venres', 'sábado'],
    wds: ['dom.', 'luns', 'mar.', 'mér.', 'xov.', 'ven.', 'sáb.'],
    mo: ['xaneiro', 'febreiro', 'marzo', 'abril', 'maio', 'xuño', 'xullo', 'agosto', 'setembro', 'outubro', 'novembro', 'decembro'],
    mos: ['xan.', 'feb.', 'mar.', 'abr.', 'maio', 'xuño', 'xul.', 'ago.', 'set.', 'out.', 'nov.', 'dec.'],
  },
  eu: {
    wd: ['igandea', 'astelehena', 'asteartea', 'asteazkena', 'osteguna', 'ostirala', 'larunbata'],
    wds: ['ig.', 'al.', 'ar.', 'az.', 'og.', 'or.', 'lr.'],
    mo: ['urtarrila', 'otsaila', 'martxoa', 'apirila', 'maiatza', 'ekaina', 'uztaila', 'abuztua', 'iraila', 'urria', 'azaroa', 'abendua'],
    mos: ['urt.', 'ots.', 'mar.', 'api.', 'mai.', 'eka.', 'uzt.', 'abu.', 'ira.', 'urr.', 'aza.', 'abe.'],
  },
};

export function dateText(d: Date, o: Intl.DateTimeFormatOptions = {}, lang: Lang = LANG): string {
  if (lang !== 'gl' && lang !== 'eu') return d.toLocaleDateString(lang === LANG ? LOCALE : { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' }[lang], o);
  const n = N[lang];
  const day = d.getDate();
  const y = d.getFullYear();
  const wd = o.weekday ? (o.weekday === 'long' ? n.wd : n.wds)[d.getDay()] : '';
  const mo = o.month === 'long' ? n.mo[d.getMonth()] : o.month ? n.mos[d.getMonth()] : '';
  const hasDay = !!o.day;
  const hasYear = !!o.year;
  if (!o.weekday && !o.month && !hasDay && !hasYear) {
    const p = (x: number) => String(x).padStart(2, '0');
    return lang === 'gl' ? `${day}/${d.getMonth() + 1}/${y}` : `${y}/${p(d.getMonth() + 1)}/${p(day)}`;
  }
  let s: string;
  if (lang === 'gl') {
    // «luns, 23 de novembro de 2026», «23 nov.», «novembro de 2026»
    const long = o.month === 'long';
    if (mo && hasDay) s = long ? `${day} de ${mo}${hasYear ? ` de ${y}` : ''}` : `${day} ${mo}${hasYear ? ` ${y}` : ''}`;
    else if (mo) s = hasYear ? (long ? `${mo} de ${y}` : `${mo} ${y}`) : mo;
    else s = [hasDay ? String(day) : '', hasYear ? String(y) : ''].filter(Boolean).join(' ');
    return wd ? (s ? `${wd}, ${s}` : wd) : s;
  }
  // euskera: «astelehena, azaroak 23», «2026ko azaroaren 23a», «aza. 23», «2026ko azaroa»
  if (mo && hasDay) s = hasYear ? (o.month === 'long' ? `${y}ko ${mo}ren ${day}a` : `${y}ko ${mo} ${day}`) : (o.month === 'long' ? `${mo}k ${day}` : `${mo} ${day}`);
  else if (mo) s = hasYear ? `${y}ko ${mo}` : mo;
  else s = [hasYear ? `${y}` : '', hasDay ? String(day) : ''].filter(Boolean).join(' ');
  return wd ? (s ? `${wd}, ${s}` : wd) : s;
}

/** Hora y minutos: en gallego y euskera, siempre «16:05». */
export function timeText(d: Date, o: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }, lang: Lang = LANG): string {
  if (lang !== 'gl' && lang !== 'eu') return d.toLocaleTimeString(LOCALE, o);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Números con separador de miles: en gallego y euskera, como en castellano. */
export function numText(n: number): string {
  return n.toLocaleString(LANG === 'gl' || LANG === 'eu' ? 'es-ES' : LOCALE);
}
