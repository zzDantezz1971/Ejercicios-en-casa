import type { PlanOffer } from '../../services/Access';
import type { App, Screen } from '../App';
import { confirmDialog, h } from '../dom';
import { icon } from '../icons';

/* Suscripción (app de Google Play): sin suscripción ni código no se puede usar la app.
   Planes de Google Play con su prueba gratis, recuperar una compra y canjear un código. */
export class PaywallScreen implements Screen {
  readonly el = h('main', { class: 'screen welcome paywall' });
  private offers: PlanOffer[] | null = null;
  private error = false;
  private busy = false;
  private showCode = false;

  constructor(private readonly app: App) {}

  enter(): void {
    this.render();
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.offers = await this.app.access.offers();
      this.error = !this.offers.length;
    } catch {
      this.offers = [];
      this.error = true;
    }
    this.render();
  }

  private done(): void {
    this.app.openTab('inicio');
  }

  private async buy(o: PlanOffer): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.render();
    try {
      if (await this.app.access.buy(o)) return this.done();
    } catch {
      /* cancelada o sin conexión */
    }
    this.busy = false;
    this.render();
  }

  private async restore(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.render();
    const ok = await this.app.access.restore();
    this.busy = false;
    if (ok) return this.done();
    this.render();
    await confirmDialog('No hemos encontrado ninguna suscripción activa en esta cuenta de Google.', 'Vale', '');
  }

  private render(): void {
    const plans = this.offers;
    const trial = plans?.find((o) => o.trialDays > 0)?.trialDays ?? 0;
    const planCard = (o: PlanOffer) =>
      h('button', { class: 'card pw-plan' + (o.plan === 'anual' ? ' best' : ''), disabled: this.busy, onclick: () => void this.buy(o) },
        h('div', { class: 'pw-plan-txt' },
          h('strong', {}, o.plan === 'anual' ? 'Anual' : 'Mensual'),
          h('span', { class: 'muted small' }, o.trialDays ? `${o.trialDays} días gratis y después ${o.price}` : o.price)),
        h('span', { class: 'pw-price' }, o.price, h('small', {}, o.plan === 'anual' ? '/año' : '/mes')),
        o.plan === 'anual' ? h('span', { class: 'pw-badge' }, 'Ahorras 2 meses') : null);

    const codeInput = h('input', { class: 'text-input', type: 'text', autocomplete: 'off', autocapitalize: 'characters', placeholder: 'NOMBRE-XXXX-XXXX', 'aria-label': 'Código de acceso' });
    const codeMsg = h('p', { class: 'muted small', 'aria-live': 'polite' });
    const redeem = async () => {
      const name = await this.app.access.redeem(codeInput.value);
      if (name) return this.done();
      codeMsg.textContent = 'Este código no es válido.';
      codeMsg.classList.add('pw-err');
    };

    this.el.replaceChildren(...[
      h('div', { class: 'welcome-top' },
        h('img', { class: 'welcome-logo', src: `${import.meta.env.BASE_URL}icon-192.png`, alt: '' }),
        h('h1', {}, 'Ejercicios en casa'),
        h('p', { class: 'muted' }, trial ? `Pruébala gratis ${trial} días. Después, elige cómo seguir.` : 'Elige un plan para empezar a entrenar.')),
      h('ul', { class: 'pw-perks' },
        ...['Más de 200 ejercicios con muñeco animado', 'Tablas a tu medida, con voz y pitidos', 'Historial, medallas y seguimiento del peso'].map((t) =>
          h('li', {}, icon('check'), t))),
      h('section', { class: 'pw-plans' },
        ...(plans === null ? [h('p', { class: 'muted small' }, 'Cargando precios…')]
          : this.error ? [h('p', { class: 'muted small' }, 'No se han podido cargar los precios de Google Play. Comprueba la conexión y vuelve a intentarlo.')]
          : [...plans.filter((o) => o.plan === 'anual'), ...plans.filter((o) => o.plan !== 'anual')].map(planCard))),
      this.error ? h('button', { class: 'btn ghost block', onclick: () => { this.offers = null; this.error = false; this.render(); void this.load(); } }, 'Reintentar') : null,
      h('p', { class: 'muted small pw-legal' },
        'La suscripción se renueva sola y se paga con tu cuenta de Google Play. ' +
        (trial ? 'Durante la prueba no se cobra nada y puedes cancelar cuando quieras. ' : 'Puedes cancelar cuando quieras. ') +
        'Se cancela en Google Play › Pagos y suscripciones.'),
      h('div', { class: 'pw-links' },
        h('button', { class: 'btn ghost small', disabled: this.busy, onclick: () => void this.restore() }, 'Ya estoy suscrito'),
        h('button', { class: 'btn ghost small', onclick: () => { this.showCode = !this.showCode; this.render(); } }, 'Tengo un código')),
      this.showCode
        ? h('section', { class: 'card pw-code' },
          h('label', { class: 'small' }, 'Código de acceso'),
          h('div', { class: 'pw-code-row' }, codeInput, h('button', { class: 'btn primary', onclick: () => void redeem() }, 'Validar')),
          codeMsg)
        : null,
    ].filter((x): x is HTMLElement => !!x));
    if (this.showCode) codeInput.focus();
  }
}
