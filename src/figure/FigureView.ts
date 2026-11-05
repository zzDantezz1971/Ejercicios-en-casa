import * as THREE from 'three';
import type { ExerciseDef } from '../domain/types';
import { MannequinScene, type Mood, type Palette } from './Mannequin';
import type { Side } from './poses';
import type { SkinData } from './SkinnedFigure';
import { anatomyOn, getLoadedSkin, getSkin } from './skinAsset';
import { muscleWeights } from './anatomy';

/** Músculos a marcar si está elegido el maniquí anatomía. */
function anatomyFor(ex: ExerciseDef, side: Side, on = anatomyOn()): { L: number[]; R: number[] } | undefined {
  return on ? muscleWeights(ex.muscles, side) : undefined;
}

function makeRenderer(canvas: HTMLCanvasElement | OffscreenCanvas, preserve = false): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({ canvas: canvas as HTMLCanvasElement, antialias: true, alpha: true, preserveDrawingBuffer: preserve });
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

/** Figura animada en un lienzo. Se puede girar arrastrando el dedo en horizontal. */
export class FigureView {
  private renderer: THREE.WebGLRenderer;
  private scene: MannequinScene;
  private raf = 0;
  private t0 = performance.now();
  private resizeObs: ResizeObserver;
  private drag: { x: number; az: number } | null = null;
  private frozenAt: number | null = null;
  private mood: Mood = 'relaxed';

  constructor(private readonly canvas: HTMLCanvasElement, exercise: ExerciseDef, palette?: Palette, private readonly skin: SkinData | undefined = getSkin()) {
    this.renderer = makeRenderer(canvas);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.scene = new MannequinScene(exercise.motion, palette, undefined, skin, skin ? anatomyFor(exercise, undefined) : undefined);
    this.scene.mood = this.mood;
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    this.resize();
    this.renderAt(this.scene.motion.total * 0.4);
  }

  start(): void {
    if (this.raf) return;
    const loop = (now: number) => {
      this.renderAt(this.frozenAt ?? now - this.t0);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Congela o reanuda el movimiento (por ejemplo, con el entrenamiento en pausa). */
  freeze(frozen: boolean): void {
    const now = performance.now();
    if (frozen && this.frozenAt === null) this.frozenAt = now - this.t0;
    else if (!frozen && this.frozenAt !== null) {
      this.t0 = now - this.frozenAt;
      this.frozenAt = null;
    }
  }

  /** Expresión de la cara del maniquí. */
  setMood(mood: Mood): void {
    this.mood = mood;
    this.scene.mood = mood;
  }

  /** Cambia de ejercicio reutilizando el mismo lienzo 3D. */
  setExercise(exercise: ExerciseDef, side: Side = undefined, palette?: Palette): void {
    const az = this.scene.azimuth;
    const keepAngle = this.scene.motion.spec === exercise.motion;
    this.scene.dispose();
    this.scene = new MannequinScene(exercise.motion, palette, side, this.skin, this.skin ? anatomyFor(exercise, side) : undefined);
    this.scene.mood = this.mood;
    if (keepAngle) this.scene.azimuth = az;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (w && h) this.scene.setAspect(w / h);
    this.restart();
    this.renderAt(this.frozenAt ?? 0);
  }

  restart(): void {
    this.t0 = performance.now();
    if (this.frozenAt !== null) this.frozenAt = 0;
  }

  dispose(): void {
    this.stop();
    this.resizeObs.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.scene.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private renderAt(ms: number): void {
    this.scene.update(ms);
    this.renderer.render(this.scene.scene, this.scene.camera);
  }

  private resize(): void {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.scene.setAspect(w / h);
    if (!this.raf) this.renderAt(this.scene.motion.total * 0.4);
  }

  private onDown = (e: PointerEvent) => {
    this.drag = { x: e.clientX, az: this.scene.azimuth };
    this.canvas.setPointerCapture(e.pointerId);
  };
  private onMove = (e: PointerEvent) => {
    if (!this.drag) return;
    this.scene.azimuth = this.drag.az - (e.clientX - this.drag.x) * 0.5;
    this.scene.placeCamera();
    if (!this.raf) this.renderAt(this.scene.motion.total * 0.4);
  };
  private onUp = () => {
    this.drag = null;
  };
}

/**
 * Miniaturas estáticas para las listas: un único renderizador compartido dibuja cada ejercicio
 * una vez y guarda la imagen. Así una lista de 70 fichas no abre 70 contextos 3D.
 */
export class Thumbnails {
  private renderer: THREE.WebGLRenderer | null = null;
  private cache = new Map<string, string>();
  private queue: Array<{ key: string; ex: ExerciseDef; skin: SkinData | undefined; anatomy: boolean; done: (url: string) => void }> = [];
  private busy = false;

  constructor(private readonly palette?: Palette, private readonly w = 330, private readonly h = 220) {}

  /** Olvida las miniaturas (por ejemplo, al cambiar de maniquí). */
  clear(): void {
    for (const k of [...this.cache.keys()]) if (!k.startsWith('preview:')) this.cache.delete(k);
  }

  /** Miniatura con el maniquí elegido en Ajustes. */
  get(ex: ExerciseDef): Promise<string> {
    return this.request(ex.id, ex, getSkin(), anatomyOn());
  }

  /** Miniatura con un maniquí concreto (para la vista previa de Ajustes): 1 = anatomía, 2 = realista. */
  preview(ex: ExerciseDef, mannequin: 1 | 2): Promise<string> {
    const skin = getLoadedSkin();
    return this.request(`preview:${skin ? mannequin : 0}:${ex.id}`, ex, skin, mannequin === 1);
  }

  private request(key: string, ex: ExerciseDef, skin: SkinData | undefined, anatomy: boolean): Promise<string> {
    const hit = this.cache.get(key);
    if (hit) return Promise.resolve(hit);
    return new Promise((done) => {
      this.queue.push({ key, ex, skin, anatomy, done });
      this.pump();
    });
  }

  private pump(): void {
    if (this.busy || this.queue.length === 0) return;
    this.busy = true;
    requestAnimationFrame(() => {
      const job = this.queue.shift()!;
      let url = this.cache.get(job.key);
      if (!url) {
        url = this.draw(job.ex, job.skin, job.anatomy);
        this.cache.set(job.key, url);
      }
      job.done(url);
      this.busy = false;
      this.pump();
    });
  }

  private draw(ex: ExerciseDef, skin: SkinData | undefined, anatomy: boolean): string {
    if (!this.renderer) {
      const c = document.createElement('canvas');
      this.renderer = makeRenderer(c, true);
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(this.w * 2, this.h * 2, false);
    }
    const sc = new MannequinScene(ex.motion, this.palette, undefined, skin, skin ? anatomyFor(ex, undefined, anatomy) : undefined);
    sc.mood = 'relaxed';
    sc.setAspect(this.w / this.h);
    sc.update(sc.motion.total * 0.45);
    this.renderer.render(sc.scene, sc.camera);
    const url = this.renderer.domElement.toDataURL('image/webp', 0.85);
    sc.dispose();
    return url;
  }
}
