import { Preferences } from '@capacitor/preferences';
import { NativePurchases, PURCHASE_TYPE, type Product } from '@capgo/native-purchases';
import { IS_NATIVE } from '../platform/native';
import { checkCode } from './accessCodes';

/* Acceso a la app de Google Play: suscripción (0,99 €/mes o 9,99 €/año, con prueba gratis de Google)
   o un código de acceso gratis. Sin suscripción ni código se usa la versión gratis (opción B): todo funciona,
   pero solo con dos ejercicios de cada apartado. La versión web no se cobra; ahí se puede activar una vista previa
   de la versión gratis (solo en ese navegador) para ver cómo queda. */

/** Ejercicios gratis: uno de cada apartado. */
// dos de cada apartado (el curl sale aunque no se tengan mancuernas, para ver ejercicios de distintos tipos)
export const FREE_IDS: ReadonlySet<string> = new Set([
  'saltos-de-tijera-jumping-jacks', 'inclinaciones-laterales-de-tronco',
  'flexiones', 'curl-de-biceps',
  'crunch-abdominal', 'toques-de-talon',
  'gato-camello', 'rotacion-de-tronco-con-brazos-al-frente',
]);
const PREVIEW_KEY = 'vista-previa-gratis';

/** Producto de suscripción en Play Console y sus dos planes base. */
export const SUB_ID = 'premium';
export const PLANS = { mensual: 'mensual', anual: 'anual' } as const;
export type PlanId = keyof typeof PLANS;

/** Códigos anulados (por nombre). Para retirar uno, se añade aquí y se publica una versión nueva. */
const REVOKED: readonly string[] = [];

const SECRET: string = import.meta.env.VITE_ACCESS_SECRET ?? '';
const KEY = 'acceso';
/** Sin conexión con Google Play, se mantiene el acceso unos días desde la última comprobación buena. */
const OFFLINE_DAYS = 5;

interface Saved { code?: string; subOkUntil?: number }

export interface PlanOffer {
  plan: PlanId;
  price: string;
  /** Días de prueba gratis de la oferta (0 si no tiene). */
  trialDays: number;
  offerToken?: string;
}

export type AccessKind = 'web' | 'code' | 'sub' | 'none';

/** En la web no se puede pagar ni canjear códigos (solo se ve la pantalla). */
export const CAN_PAY = IS_NATIVE;

export class Access {
  kind: AccessKind = IS_NATIVE ? 'none' : 'web';
  /** Nombre del código con el que se entra (si es por código). */
  codeName: string | null = null;
  private saved: Saved = {};

  /** Con suscripción o código (o en la web): todos los ejercicios. */
  get premium(): boolean {
    return this.kind !== 'none';
  }

  /** ¿Se puede usar este ejercicio? */
  canUse(id: string): boolean {
    return this.premium || FREE_IDS.has(id);
  }

  /** En la web: vista previa de la versión gratis (solo en este navegador). */
  get previewing(): boolean {
    return !IS_NATIVE && this.kind === 'none';
  }

  setPreview(on: boolean): void {
    if (IS_NATIVE) return;
    try {
      if (on) localStorage.setItem(PREVIEW_KEY, '1');
      else localStorage.removeItem(PREVIEW_KEY);
    } catch {
      /* sin almacenamiento: solo dura hasta recargar */
    }
    this.kind = on ? 'none' : 'web';
  }

  /** Al arrancar: código guardado o suscripción activa. */
  async init(): Promise<void> {
    if (!IS_NATIVE) {
      try {
        if (localStorage.getItem(PREVIEW_KEY) === '1') this.kind = 'none';
      } catch {
        /* sin almacenamiento */
      }
      return;
    }
    try {
      const { value } = await Preferences.get({ key: KEY });
      this.saved = value ? (JSON.parse(value) as Saved) : {};
    } catch {
      this.saved = {};
    }
    if (this.saved.code) {
      const name = await checkCode(SECRET, this.saved.code, REVOKED);
      if (name) {
        this.kind = 'code';
        this.codeName = name;
        return;
      }
    }
    await this.checkSubscription();
  }

  /** Mira en Google Play si hay una suscripción activa (incluida la prueba gratis). */
  async checkSubscription(): Promise<boolean> {
    try {
      const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS });
      const ok = purchases.some((p) => p.productIdentifier === SUB_ID && String(p.purchaseState ?? '').toUpperCase() !== 'PENDING');
      if (ok) {
        this.kind = 'sub';
        await this.save({ ...this.saved, subOkUntil: Date.now() + OFFLINE_DAYS * 864e5 });
      } else {
        this.kind = this.codeName ? 'code' : 'none';
        if (this.saved.subOkUntil) await this.save({ ...this.saved, subOkUntil: undefined });
      }
      return ok;
    } catch {
      // sin conexión o Google Play no disponible: vale la última comprobación buena durante unos días
      const ok = (this.saved.subOkUntil ?? 0) > Date.now();
      if (ok) this.kind = 'sub';
      return ok;
    }
  }

  /** Precios y prueba gratis de los dos planes, tal como los da Google Play (en la web, de muestra). */
  async offers(): Promise<PlanOffer[]> {
    if (!IS_NATIVE) return [{ plan: 'anual', price: '9,99 €', trialDays: 0 }, { plan: 'mensual', price: '0,99 €', trialDays: 0 }];
    const { products } = await NativePurchases.getProducts({ productIdentifiers: [SUB_ID], productType: PURCHASE_TYPE.SUBS });
    const out: PlanOffer[] = [];
    for (const plan of Object.keys(PLANS) as PlanId[]) {
      const list = products.filter((p) => p.identifier === PLANS[plan]);
      if (!list.length) continue;
      // sin prueba gratis: la versión gratis (un ejercicio por apartado) ya sirve para probar la app.
      // Si en Play Console hubiera alguna oferta con prueba, se usa el plan base sin ella.
      const p = list.find((x) => trialDays(x) === 0) ?? list[0];
      out.push({ plan, price: p.priceString, trialDays: 0, offerToken: p.offerToken });
    }
    return out;
  }

  /** Abre la compra de Google Play. Devuelve true si queda suscrito. */
  async buy(offer: PlanOffer): Promise<boolean> {
    await NativePurchases.purchaseProduct({
      productIdentifier: SUB_ID,
      productType: PURCHASE_TYPE.SUBS,
      planIdentifier: PLANS[offer.plan],
      ...(offer.offerToken ? { offerToken: offer.offerToken } : {}),
    });
    return this.checkSubscription();
  }

  /** Recupera una suscripción hecha antes (otro móvil o reinstalación). */
  async restore(): Promise<boolean> {
    try {
      await NativePurchases.restorePurchases();
    } catch {
      /* se comprueba igualmente */
    }
    return this.checkSubscription();
  }

  /** Canjea un código de acceso. Devuelve el nombre si es válido. */
  async redeem(code: string): Promise<string | null> {
    const name = await checkCode(SECRET, code, REVOKED);
    if (!name) return null;
    this.kind = 'code';
    this.codeName = name;
    await this.save({ ...this.saved, code: code.trim().toUpperCase() });
    return name;
  }

  /** Pantalla de Google Play para cambiar de plan o cancelar. */
  async manage(): Promise<void> {
    try {
      await NativePurchases.manageSubscriptions();
    } catch {
      window.open(`https://play.google.com/store/account/subscriptions?sku=${SUB_ID}`, '_blank');
    }
  }

  private async save(s: Saved): Promise<void> {
    this.saved = s;
    try {
      await Preferences.set({ key: KEY, value: JSON.stringify(s) });
    } catch {
      /* sin almacenamiento: se vuelve a comprobar en el próximo arranque */
    }
  }
}

/** Días de prueba gratis de una oferta (fase introductoria a precio 0). */
function trialDays(p: Product): number {
  const d = p.introductoryPrice;
  if (!d || d.price > 0) return 0;
  const per = d.subscriptionPeriod;
  const unit = per?.unitString ?? (['day', 'week', 'month', 'year'][per?.unit ?? 0] as string);
  const mult = unit === 'week' ? 7 : unit === 'month' ? 30 : unit === 'year' ? 365 : 1;
  return (per?.numberOfUnits ?? 0) * mult * Math.max(1, d.numberOfPeriods || 1);
}
