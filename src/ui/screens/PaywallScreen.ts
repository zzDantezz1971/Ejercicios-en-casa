import { CAN_PAY, type PlanOffer } from '../../services/Access';
import type { App, Screen } from '../App';
import { confirmDialog, h } from '../dom';
import { icon } from '../icons';

/* Hacerse prémium (app de Google Play): planes con su prueba gratis, recuperar una compra y canjear un código.
   Se abre al tocar un ejercicio de pago. En la web es solo una vista previa: no se puede pagar. */
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
    // todo desbloqueado: se vuelve a empezar desde Inicio para que se vea
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
      h('button', { class: 'card pw-plan' + (o.plan === 'anual' ? ' best' : ''), disabled: this.busy || !CAN_PAY, onclick: () => void this.buy(o) },
        h('div', { class: 'pw-plan-txt' },
          h('strong', {}, o.plan === 'anual' ? 'Anual' : 'Mensual'),
          h('span', { class: 'muted small' }, o.trialDays ? `${o.trialDays} días gratis y después ${o.price}` : o.plan === 'anual' ? 'Un pago al año, se renueva cada año' : 'Un pago al mes, se renueva cada mes')),
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
      h('header', { class: 'bar' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => this.app.back() }, icon('back')),
        h('span', { class: 'bar-title' }, 'Prémium')),
      h('div', { class: 'welcome-top pw-top' },
        h('img', { class: 'welcome-logo', src: `${import.meta.env.BASE_URL}icon-192.png`, alt: '' }),
        h('h1', {}, 'Desbloquea todos los ejercicios')),
      h('ul', { class: 'pw-perks' },
        ...['Más de 200 ejercicios con muñeco animado', 'Arma tus tablas con los que quieras, con o sin material', 'Sin anuncios y sin límites'].map((t) =>
          h('li', {}, icon('check'), t))),
      h('p', { class: 'muted small pw-free' }, 'Ahora tienes la versión gratis: un ejercicio de cada apartado, con todo lo demás de la app.'),
      CAN_PAY ? null : h('p', { class: 'note pw-preview' }, icon('info'), 'Vista previa: en la versión web no se puede pagar. La suscripción solo funciona en la app de Google Play.'),
      h('section', { class: 'pw-plans' },
        ...(plans === null ? [h('p', { class: 'muted small' }, 'Cargando precios…')]
          : this.error ? [h('p', { class: 'muted small' }, 'No se han podido cargar los precios de Google Play. Comprueba la conexión y vuelve a intentarlo.')]
          : [...plans.filter((o) => o.plan === 'anual'), ...plans.filter((o) => o.plan !== 'anual')].map(planCard))),
      this.error ? h('button', { class: 'btn ghost block', onclick: () => { this.offers = null; this.error = false; this.render(); void this.load(); } }, 'Reintentar') : null,
      // condiciones claras (Google lo exige): cobro con la cuenta de Google, renovación automática y cómo cancelar
      h('p', { class: 'muted small pw-legal' }, trial
        ? `Los primeros ${trial} días son gratis. Si no cancelas antes, Google Play cobra el plan elegido con el método de pago de tu cuenta de Google y lo renueva cada mes o cada año hasta que lo canceles. Si cancelas durante la prueba, no pagas nada. Se cancela en Google Play › Pagos y suscripciones.`
        : 'Google Play cobra el plan elegido con el método de pago de tu cuenta de Google y lo renueva cada mes o cada año hasta que lo canceles. Se cancela en Google Play › Pagos y suscripciones.'),
      h('div', { class: 'pw-links' },
        h('button', { class: 'btn ghost small', disabled: this.busy || !CAN_PAY, onclick: () => void this.restore() }, 'Ya estoy suscrito'),
        h('button', { class: 'btn ghost small', onclick: () => { this.showCode = !this.showCode; this.render(); } }, 'Tengo un código')),
      this.showCode
        ? h('section', { class: 'card pw-code' },
          h('label', { class: 'small' }, 'Código de acceso'),
          h('div', { class: 'pw-code-row' }, codeInput, h('button', { class: 'btn primary', disabled: !CAN_PAY, onclick: () => void redeem() }, 'Validar')),
          codeMsg)
        : null,
    ].filter((x): x is HTMLElement => !!x));
    if (this.showCode) codeInput.focus();
  }
}
