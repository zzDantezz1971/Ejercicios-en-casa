import { LANG, LOCALE } from '../../i18n';
import { MEDALS, type Medal } from '../../domain/medals';
import type { App } from '../App';
import { h } from '../dom';
import { icon } from '../icons';

const TIER_NAME = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro' } as const;

/** Insignia redonda de una medalla. */
export function medalBadge(m: Medal, earned = true, big = false): HTMLElement {
  return h('span', { class: `medal-badge ${m.tier}${earned ? '' : ' locked'}${big ? ' big' : ''}` }, icon(m.icon));
}

/** Comprueba medallas nuevas y, si las hay, las celebra. */
export function checkAndCelebrate(app: App): void {
  const fresh = app.store.checkMedals();
  if (fresh.length) celebrate(app, fresh.map((id) => MEDALS.find((m) => m.id === id)!).filter(Boolean));
}

/** Pantalla de celebración con las medallas conseguidas (una tras otra). */
export function celebrate(app: App, medals: Medal[]): void {
  if (!medals.length) return;
  const name = app.store.settings.profile.name;
  let i = 0;
  const confetti = h('div', { class: 'confetti', 'aria-hidden': 'true' }, ...Array.from({ length: 40 }, (_, k) => {
    const p = h('i', {});
    p.style.setProperty('--x', `${Math.round(Math.random() * 100)}%`);
    p.style.setProperty('--d', `${(Math.random() * 0.6).toFixed(2)}s`);
    p.style.setProperty('--r', `${Math.round(Math.random() * 360)}deg`);
    p.style.setProperty('--c', ['#F5A524', '#FFD66B', 'var(--accent)', 'var(--sec-stretch)', '#FFFFFF'][k % 5]);
    return p;
  }));
  const box = h('div', { class: 'celebrate-box', role: 'dialog', 'aria-modal': 'true' });
  const wrap = h('div', { class: 'celebrate' }, confetti, box);
  const show = () => {
    const m = medals[i];
    box.replaceChildren(
      h('p', { class: 'eyebrow' }, medals.length > 1 ? `Nueva medalla · ${i + 1} de ${medals.length}` : 'Nueva medalla'),
      medalBadge(m, true, true),
      h('h2', {}, m.title),
      h('p', { class: 'muted' }, m.desc),
      h('span', { class: `tier-tag ${m.tier}` }, TIER_NAME[m.tier]),
      h('button', { class: 'btn primary block', onclick: next }, i < medals.length - 1 ? 'Siguiente' : name ? `¡Genial, ${name}!` : '¡Genial!'));
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
  };
  const next = () => {
    i++;
    if (i < medals.length) show();
    else wrap.remove();
  };
  document.body.append(wrap);
  app.haptics.start();
  app.sounds.finish();
  show();
}

/** Ficha de una medalla: grande, con brillo y la fecha en que se consiguió (o cómo conseguirla). */
export function medalDialog(app: App, m: Medal): void {
  const when = app.store.medals[m.id];
  const got = MEDALS.filter((x) => app.store.medals[x.id]).length;
  const days = when ? Math.floor((Date.now() - Date.parse(when)) / 864e5) : 0;
  const ago = !when ? '' : days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} días`;
  const close = () => wrap.remove();
  const sparkles = when ? h('div', { class: 'md-sparkles', 'aria-hidden': 'true' }, ...Array.from({ length: 10 }, (_, k) => {
    const p = h('i', {});
    p.style.setProperty('--a', `${k * 36}deg`);
    p.style.setProperty('--d', `${(k % 5) * 0.25}s`);
    return p;
  })) : null;
  const box = h('div', { class: `medal-detail ${m.tier}${when ? '' : ' locked'}`, role: 'dialog', 'aria-modal': 'true' },
    h('button', { class: 'icon-btn md-close', 'aria-label': 'Cerrar', onclick: close }, icon('close')),
    h('div', { class: 'md-stage' }, sparkles, medalBadge(m, !!when, true)),
    h('p', { class: 'eyebrow' }, when ? `Medalla de ${TIER_NAME[m.tier].toLowerCase()}` : 'Por conseguir'),
    h('h2', {}, m.title),
    h('p', { class: 'md-desc' }, m.desc),
    when
      ? h('div', { class: 'md-facts' },
          h('div', { class: 'md-fact' }, icon('calendar'), h('div', {},
            h('strong', {}, new Date(when).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })),
            h('span', { class: 'muted small' }, ago))),
          h('div', { class: 'md-fact' }, icon('trophy'), h('div', {},
            h('strong', {}, LANG === 'en' ? `${got} of ${MEDALS.length}` : `${got} de ${MEDALS.length}`),
            h('span', { class: 'muted small' }, 'medallas conseguidas'))))
      : h('p', { class: 'muted small' }, 'Sigue entrenando: cuando lo consigas, la medalla se desbloqueará sola.'),
    h('button', { class: 'btn primary block', onclick: close }, when ? (app.store.settings.profile.name ? `¡Genial, ${app.store.settings.profile.name}!` : '¡Genial!') : 'Vale'));
  const wrap = h('div', { class: 'celebrate md-wrap', onclick: (e: Event) => e.target === wrap && close() }, box);
  document.body.append(wrap);
  if (when) app.haptics.start();
}

/** Tarjeta del Historial con todas las medallas (conseguidas y por conseguir). */
export function medalsCard(app: App): HTMLElement {
  const have = app.store.medals;
  const got = MEDALS.filter((m) => have[m.id]).length;
  const info = h('p', { class: 'medal-info muted small', 'aria-live': 'polite' }, 'Toca una medalla para ver su ficha.');
  return h('section', { class: 'card medals-card' },
    h('div', { class: 'card-head' }, h('h3', {}, 'Medallas'), h('span', { class: 'muted small' }, LANG === 'en' ? `${got} of ${MEDALS.length}` : `${got} de ${MEDALS.length}`)),
    h('div', { class: 'medal-grid' }, ...MEDALS.map((m) => {
      const when = have[m.id];
      return h('button', {
        class: 'medal-cell' + (when ? '' : ' locked'),
        'aria-label': `${m.title}${when ? ', conseguida' : ', por conseguir'}`,
        onclick: () => medalDialog(app, m),
      }, medalBadge(m, !!when), h('span', { class: 'medal-name' }, m.title));
    })),
    info);
}
