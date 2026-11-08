import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import { IS_NATIVE } from '../platform/native';

/* Pulsómetro por Bluetooth (Web Bluetooth, perfil estándar de frecuencia cardíaca).
   Sirve para relojes que difunden el pulso, como los Huawei con "Difundir frecuencia cardíaca". */

type Status = 'off' | 'connecting' | 'on' | 'lost';
type Listener = () => void;

interface BtCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BtCharacteristic>;
}
interface BtDevice extends EventTarget {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{ getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BtCharacteristic> }> }>;
    disconnect(): void;
  };
}
interface BtNavigator {
  bluetooth?: { requestDevice(o: unknown): Promise<BtDevice>; getAvailability?(): Promise<boolean> };
}

/** Lee el valor de una medida de frecuencia cardíaca (formato estándar de Bluetooth). */
export function parseHeartRate(v: DataView): number {
  const flags = v.getUint8(0);
  return flags & 1 ? v.getUint16(1, true) : v.getUint8(1);
}

const HR_SERVICE = numberToUUID(0x180d);
const HR_MEASUREMENT = numberToUUID(0x2a37);

export class HeartRate {
  status: Status = 'off';
  bpm: number | null = null;
  deviceName = '';
  /** Último momento en que llegó un dato (ms). */
  lastAt = 0;
  private device: BtDevice | null = null;
  /** App Android: id del reloj en el Bluetooth del sistema. */
  private nativeId: string | null = null;
  private listeners = new Set<Listener>();
  private retries = 0;
  private manualOff = false;

  get available(): boolean {
    return IS_NATIVE || (typeof navigator !== 'undefined' && !!(navigator as unknown as BtNavigator).bluetooth);
  }

  get connected(): boolean {
    return this.status === 'on';
  }

  /** Pulso reciente (si no llega nada en 5 s, se considera sin dato). */
  get current(): number | null {
    return this.status === 'on' && this.bpm && Date.now() - this.lastAt < 5000 ? this.bpm : null;
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach((f) => f());
  }

  /** Busca el reloj y se conecta. Debe llamarse desde un toque del usuario. */
  async connect(): Promise<void> {
    if (IS_NATIVE) return this.connectNative();
    const bt = (navigator as unknown as BtNavigator).bluetooth;
    if (!bt) throw new Error('Este navegador no puede usar Bluetooth. Usa Chrome en Android.');
    this.manualOff = false;
    const device = await bt.requestDevice({ filters: [{ services: ['heart_rate'] }] });
    this.device = device;
    this.deviceName = device.name ?? 'Reloj';
    device.addEventListener('gattserverdisconnected', () => void this.onLost());
    await this.open();
  }

  /** App Android: Bluetooth del sistema (el WebView no tiene Web Bluetooth). */
  private async connectNative(): Promise<void> {
    this.manualOff = false;
    await BleClient.initialize({ androidNeverForLocation: true });
    const dev = await BleClient.requestDevice({ services: [HR_SERVICE] });
    this.nativeId = dev.deviceId;
    this.deviceName = dev.name ?? 'Reloj';
    await this.openNative();
  }

  private async openNative(): Promise<void> {
    const id = this.nativeId;
    if (!id) return;
    this.status = 'connecting';
    this.emit();
    try {
      await BleClient.connect(id, () => void this.onLost());
      await BleClient.startNotifications(id, HR_SERVICE, HR_MEASUREMENT, (v) => {
        const bpm = parseHeartRate(v);
        if (bpm > 0) {
          this.bpm = bpm;
          this.lastAt = Date.now();
          this.emit();
        }
      });
      this.status = 'on';
      this.retries = 0;
      this.emit();
    } catch (e) {
      this.status = 'lost';
      this.emit();
      throw e;
    }
  }

  private async open(): Promise<void> {
    if (IS_NATIVE) return this.openNative();
    if (!this.device?.gatt) return;
    this.status = 'connecting';
    this.emit();
    try {
      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const ch = await service.getCharacteristic('heart_rate_measurement');
      ch.addEventListener('characteristicvaluechanged', () => {
        if (!ch.value) return;
        const v = parseHeartRate(ch.value);
        if (v > 0) {
          this.bpm = v;
          this.lastAt = Date.now();
          this.emit();
        }
      });
      await ch.startNotifications();
      this.status = 'on';
      this.retries = 0;
      this.emit();
    } catch (e) {
      this.status = 'lost';
      this.emit();
      throw e;
    }
  }

  /** Si se corta, reintenta unas cuantas veces. */
  private async onLost(): Promise<void> {
    if (this.manualOff) return;
    this.status = 'lost';
    this.emit();
    while (!this.manualOff && this.retries < 5) {
      this.retries++;
      await new Promise((r) => setTimeout(r, 1500 * this.retries));
      try {
        await this.open();
        return;
      } catch {
        /* sigue intentándolo */
      }
    }
  }

  disconnect(): void {
    this.manualOff = true;
    if (this.nativeId) void BleClient.disconnect(this.nativeId).catch(() => undefined);
    this.nativeId = null;
    this.device?.gatt?.disconnect();
    this.device = null;
    this.status = 'off';
    this.bpm = null;
    this.emit();
  }
}
