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

/** Tarjeta del Historial con todas las medallas (conseguidas y por conseguir). */
export function medalsCard(app: App): HTMLElement {
  const have = app.store.medals;
  const got = MEDALS.filter((m) => have[m.id]).length;
  const info = h('p', { class: 'medal-info muted small', 'aria-live': 'polite' }, 'Toca una medalla para ver cómo se consigue.');
  return h('section', { class: 'card medals-card' },
    h('div', { class: 'card-head' }, h('h3', {}, 'Medallas'), h('span', { class: 'muted small' }, `${got} de ${MEDALS.length}`)),
    h('div', { class: 'medal-grid' }, ...MEDALS.map((m) => {
      const when = have[m.id];
      return h('button', {
        class: 'medal-cell' + (when ? '' : ' locked'),
        'aria-label': `${m.title}${when ? ', conseguida' : ', por conseguir'}`,
        onclick: () => {
          info.replaceChildren(h('strong', {}, m.title), ` · ${m.desc} `,
            when ? h('span', {}, `Conseguida el ${new Date(when).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`) : h('span', {}, 'Aún por conseguir.'));
        },
      }, medalBadge(m, !!when), h('span', { class: 'medal-name' }, m.title));
    })),
    info);
}
