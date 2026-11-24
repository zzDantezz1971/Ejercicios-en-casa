/*
 * La habitación de los reels: siempre igual vista desde la cámara (sea cual sea el ejercicio). Pared en dos tonos con
 * friso, ventana grande con estor, póster, estanterías, luz del sol en el suelo, plantas y material
 * de fitness fijo (esterilla, kettlebells, rodillo, mancuernas en su soporte, fitball).
 */
import * as THREE from 'three';
import type { MannequinScene } from '../../src/figure/Mannequin';

/** Cámara fija: a qué altura mira, a qué distancia y con qué inclinación (radianes). */
/**
 * Cámara fija respecto a la habitación: a qué altura mira, a qué distancia (del sitio del muñeco de referencia) y con
 * qué inclinación (radianes). `near`: cuánto se adelanta el muñeco hacia la cámara (la habitación se ve igual; el
 * muñeco, más grande).
 */
export const EYE = { target: 82, dist: 760, elev: 0.1, near: 200,
  /** hasta dónde puede llegar el muñeco en la pantalla (de -1 a 1): a los lados y por abajo (encima de la barra) */
  side: 0.86, bottom: -0.74 };

const C = {
  wallUp: '#FBFBF9', wallLow: '#BCD0E6', rail: '#C9A27A', base: '#F7F4EE',
  frame: '#FAFAF8', wood: '#B88A5E', woodDark: '#8A6240', black: '#22262E', chrome: '#C9CED6',
  blue: '#2F5BEA', orange: '#F2A516', green: '#1F8A57', red: '#E5484D', purple: '#7B5CD6',
  leaf: '#2F7A4D', leaf2: '#3E8A5B', linen: '#EADFCD',
};

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Tablones de madera clara. */
const WOOD = (() => {
  const t = canvasTex(1024, 1024, (g) => {
    const tones = ['#D2AE86', '#CBA67C', '#D6B48D', '#C79F75', '#D0AA80'];
    const W = 128;
    // tablones de largos distintos y juntas desordenadas (cada columna empieza en otro sitio)
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const plank = (x: number, y: number, h: number) => {
      g.fillStyle = tones[Math.floor(rnd() * tones.length)];
      g.fillRect(x, y, W, h);
      g.strokeStyle = 'rgba(120,80,40,.09)'; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) { const o = rnd() * 6 - 3; g.beginPath(); g.moveTo(x + 10 + k * 19 + o, y); g.bezierCurveTo(x + 18 + k * 19, y + h / 3, x + 4 + k * 19, y + (2 * h) / 3, x + 12 + k * 19 + o, y + h); g.stroke(); }
      g.strokeStyle = 'rgba(90,60,30,.28)'; g.lineWidth = 3; g.strokeRect(x, y, W, h);
    };
    for (let x = 0; x < 1024; x += W) {
      const start = Math.floor(rnd() * 1024);
      let y = start;
      while (y < start + 1024) {
        const h = Math.min(170 + Math.floor(rnd() * 300), start + 1024 - y);
        // los que pasan del borde se pintan también arriba (la textura se repite)
        plank(x, y % 1024, h);
        if ((y % 1024) + h > 1024) plank(x, (y % 1024) - 1024, h);
        y += h;
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
})();

/** Pared con un poco de textura (como de pintura plástica). */
function plaster(base: string): THREE.CanvasTexture {
  const t = canvasTex(256, 256, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const a = Math.random() * 0.05;
      g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 1.4})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 2);
  return t;
}

/** Lo que se ve por la ventana: cielo, montañas a lo lejos (con la silueta de Montserrat) y unos árboles. */
const VIEW = canvasTex(256, 320, (g) => {
  const sky = g.createLinearGradient(0, 0, 0, 320);
  sky.addColorStop(0, '#8EC1EC'); sky.addColorStop(0.55, '#CFE5F5'); sky.addColorStop(1, '#F6EBD9');
  g.fillStyle = sky; g.fillRect(0, 0, 256, 320);
  // nubes
  g.fillStyle = 'rgba(255,255,255,.85)';
  for (const [x, y, r] of [[60, 70, 16], [80, 64, 20], [102, 72, 14], [190, 110, 12], [206, 104, 16], [222, 112, 11]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  // montañas lejanas (azuladas) y Montserrat (con sus agujas)
  g.fillStyle = '#A9BCCB';
  g.beginPath(); g.moveTo(0, 230);
  for (let x = 0; x <= 256; x += 8) g.lineTo(x, 214 - Math.sin(x / 30) * 10 - Math.sin(x / 11) * 3);
  g.lineTo(256, 320); g.lineTo(0, 320); g.fill();
  g.fillStyle = '#8FA4B6';
  g.beginPath(); g.moveTo(90, 240);
  const peaks = [16, 30, 22, 40, 28, 46, 34, 50, 38, 44, 30, 36, 20, 26, 12];
  peaks.forEach((h, i) => { const x = 100 + i * 8; g.quadraticCurveTo(x - 4, 236 - h - 6, x, 236 - h); g.quadraticCurveTo(x + 4, 236 - h - 6, x + 8, 236 - h + 4); });
  g.lineTo(240, 240); g.lineTo(240, 320); g.lineTo(90, 320); g.fill();
  // colinas verdes y árboles
  g.fillStyle = '#9DBF8A'; g.beginPath(); g.moveTo(0, 262); g.bezierCurveTo(80, 240, 170, 268, 256, 250); g.lineTo(256, 320); g.lineTo(0, 320); g.fill();
  g.fillStyle = '#6E9E64';
  for (let i = 0; i < 14; i++) { const x = 8 + i * 18 + (i % 3) * 3, y = 272 + (i % 2) * 6; g.beginPath(); g.ellipse(x, y, 9, 13, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#86B37A'; g.fillRect(0, 290, 256, 30);
});

/**
 * Póster con una frase motivadora (distinta en cada vídeo). Las líneas van separadas por «|»; la última, en azul.
 * Se repinta cuando han cargado las letras.
 */
function posterTex(text: string): THREE.CanvasTexture {
  const W = 300, H = 420;
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = '#F6EFE3'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(30,38,51,.18)'; g.lineWidth = 2; g.strokeRect(16, 16, W - 32, H - 32);
    const lines = text.toUpperCase().split('|').map((l) => l.trim());
    // el tamaño más grande con el que cabe la línea más larga (y todas a lo alto)
    let size = 78;
    const fit = () => { g.font = `700 ${size}px "Barlow Condensed", sans-serif`; return Math.max(...lines.map((l) => g.measureText(l).width)); };
    while (size > 20 && (fit() > W - 64 || lines.length * size * 1.02 > H - 150)) size -= 2;
    const lh = size * 1.02, top = (H - lines.length * lh) / 2 + size * 0.78 - 10;
    // comillas naranjas arriba
    g.fillStyle = C.orange; g.font = `700 110px "Barlow Condensed", sans-serif`; g.textAlign = 'center';
    g.fillText('“', W / 2, top - size + 40);
    g.font = `700 ${size}px "Barlow Condensed", sans-serif`;
    lines.forEach((l, i) => { g.fillStyle = i === lines.length - 1 ? C.blue : '#1E2633'; g.fillText(l, W / 2, top + i * lh); });
    const yEnd = top + (lines.length - 1) * lh + 22;
    g.fillStyle = C.red; g.fillRect(W / 2 - 28, yEnd, 56, 5);
    g.fillStyle = 'rgba(30,38,51,.45)'; g.font = '600 15px "Barlow", sans-serif';
    g.fillText('KASA FIT', W / 2, H - 34);
  };
  const t = canvasTex(W, H, draw);
  void document.fonts.ready.then(() => { draw((t.image as HTMLCanvasElement).getContext('2d')!); t.needsUpdate = true; });
  return t;
}

/** Mancha de sol de la ventana en el suelo (cálida, con los bordes suaves). */
const SUN = canvasTex(256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,214,150,.30)'); gr.addColorStop(1, 'rgba(255,226,170,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  // la cruz de la ventana
  g.fillStyle = 'rgba(0,0,0,0)';
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(122, 0, 12, 256); g.fillRect(0, 122, 256, 12);
});

/** Sombra suave donde la pared toca el suelo. */
const AO = canvasTex(4, 64, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(40,30,20,0)'); gr.addColorStop(1, 'rgba(40,30,20,.22)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
});

/** Sombra de contacto (mancha oscura difuminada) para lo que está en el suelo o pegado a la pared. */
const BLOB = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(30,22,14,.5)'); gr.addColorStop(1, 'rgba(30,22,14,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

const PLASTER_UP = plaster(C.wallUp), PLASTER_LOW = plaster(C.wallLow);

/** Lo que cambia de un vídeo a otro: la frase del póster (líneas separadas por «|»). */
export interface RoomOpts { poster?: string }

export function addRoom(ms: MannequinScene, opts: RoomOpts = {}): void {
  const S = ms.scene, cam = ms.camera;
  // el sitio que ocupa el muñeco con su material a lo largo de todo el movimiento (sin el suelo de sombras): así
  // queda siempre centrado en la pantalla, haga el ejercicio que haga
  const box = new THREE.Box3(), part = new THREE.Box3(), size = new THREE.Vector3();
  for (let t = 0; t <= 4000; t += 250) {
    ms.update(t, t);
    S.updateMatrixWorld(true);
    S.traverse((o) => {
      const m = o as THREE.Mesh & { isSkinnedMesh?: boolean; computeBoundingBox?: () => void };
      if (!m.isMesh || !m.visible) return;
      if (m.isSkinnedMesh) m.computeBoundingBox!();
      part.makeEmpty().expandByObject(m);
      if (part.isEmpty() || part.getSize(size).length() > 600) return;
      box.union(part);
    });
  }
  const c = box.getCenter(new THREE.Vector3()).setY(0);
  // hacia dónde mira la cámara del ejercicio (de frente, de lado…): la habitación se pone detrás
  const look = new THREE.Vector3();
  cam.getWorldDirection(look);
  const dir = look.negate().setY(0).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
  // la cámara, siempre a la misma distancia, altura e inclinación respecto a la habitación. El muñeco se adelanta
  // hacia la cámara (la habitación, y la cámara con ella, se echa atrás lo mismo) todo lo que se pueda hasta EYE.near,
  // pero sin que el muñeco ni su material se salgan por los lados ni bajen hasta la barra de los textos: de pie se ve
  // grande, y tumbado en la esterilla (que ocupa más a lo ancho) un poco menos
  const roomC = new THREE.Vector3(), target = new THREE.Vector3();
  const place = (near: number) => {
    roomC.copy(c).addScaledVector(dir, -near);
    target.copy(roomC).setY(EYE.target);
    cam.position.copy(target).addScaledVector(dir, EYE.dist * Math.cos(EYE.elev)).add(new THREE.Vector3(0, EYE.dist * Math.sin(EYE.elev), 0));
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
  };
  const fits = () => {
    const p = new THREE.Vector3();
    for (let k = 0; k < 8; k++) {
      p.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).project(cam);
      if (Math.abs(p.x) > EYE.side || p.y < EYE.bottom || p.y > 0.9) return false;
    }
    return true;
  };
  let near = EYE.near;
  for (; near > 0; near -= 5) { place(near); if (fits()) break; }
  place(Math.max(0, near));

  const room = new THREE.Group();
  room.userData.room = true;
  S.add(room);
  // todo se coloca en coordenadas de la habitación: x = a la derecha, y = arriba, z = hacia la cámara (0 = el muñeco)
  room.position.copy(roomC);
  room.rotation.y = Math.atan2(dir.x, dir.z);
  const BACK = -150;

  const std = (color: string, rough = 0.85, metal = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number, shadow = true, parent: THREE.Object3D = room): T => {
    m.position.set(x, y, z);
    void shadow;
    m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    parent.add(m);
    return m;
  };
  const boxM = (w: number, h: number, d: number, mat: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const plane = (w: number, h: number, mat: THREE.Material) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const flat = (m: THREE.Mesh) => { m.rotation.x = -Math.PI / 2; return m; };
  const blobM = new THREE.MeshBasicMaterial({ map: BLOB, transparent: true, depthWrite: false });
  /** sombra en el suelo (x, z, ancho, fondo) */
  const blob = (x: number, z: number, w: number, d: number, o = 1) => {
    const m = add(flat(plane(w, d, o === 1 ? blobM : Object.assign(blobM.clone(), { opacity: o }))), x, 0.05, z);
    m.renderOrder = 1;
  };
  /** sombra en la pared, debajo de algo colgado (x, y, ancho, alto) */
  const wallBlob = (x: number, y: number, w: number, h: number, o = 0.6) => {
    const m = add(plane(w, h, Object.assign(blobM.clone(), { opacity: o })), x, y, BACK + 0.8);
    m.renderOrder = 1;
  };

  // ── suelo y sol ─────────────────────────────────────────────────
  add(flat(plane(1400, 1400, std('#ffffff', 0.62, 0, { map: WOOD }))), 0, -0.3, 0, false);
  const sun = add(flat(plane(150, 150, new THREE.MeshBasicMaterial({ map: SUN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))), -40, -0.1, -70, false);
  sun.scale.set(1, 0.7, 1); sun.rotation.z = -0.45;

  // ── pared: arriba clara, abajo friso verde con molduras, listón de madera y zócalo ──
  add(plane(1400, 420, std('#ffffff', 0.95, 0, { map: PLASTER_UP })), 0, 210, BACK, false);
  add(plane(1400, 92, std('#ffffff', 0.9, 0, { map: PLASTER_LOW })), 0, 46, BACK + 0.4, false);
  add(boxM(1400, 4, 3, std(C.rail, 0.55)), 0, 92, BACK + 1.5, false);
  add(boxM(1400, 12, 2.5, std(C.base, 0.5)), 0, 6, BACK + 1.2, false);
  const mould = std('#A3BAD3', 0.8);
  for (let k = -6; k <= 6; k++) {
    const x0 = k * 52;
    for (const [w, h, x, y] of [[44, 1.6, 0, 76], [44, 1.6, 0, 22], [1.6, 54, -22, 49], [1.6, 54, 22, 49]] as const)
      add(boxM(w, h, 1.2, mould), x0 + x, y, BACK + 1, false);
  }
  add(plane(1400, 30, new THREE.MeshBasicMaterial({ map: AO, transparent: true, depthWrite: false })), 0, 15, BACK + 3, false).rotation.x = -0.35;

  // ── ventana grande con marco, alféizar y estor ────────────────────
  const WX = -86, WY = 190, WW = 92, WH = 132;
  add(plane(WW, WH, new THREE.MeshBasicMaterial({ map: VIEW })), WX, WY, BACK + 0.6, false);
  const frameM = std(C.frame, 0.45);
  for (const [w, h, x, y] of [[WW + 12, 7, 0, WH / 2 + 2], [WW + 12, 7, 0, -WH / 2 - 2], [7, WH + 10, -WW / 2 - 2, 0], [7, WH + 10, WW / 2 + 2, 0], [WW, 3.5, 0, 0], [3.5, WH, 0, 0]] as const)
    add(boxM(w, h, 5, frameM), WX + x, WY + y, BACK + 2, false);
  add(boxM(WW + 22, 4, 14, frameM), WX, WY - WH / 2 - 7, BACK + 6, true);
  // estor plegable de lino, medio recogido: cajón de madera atornillado a la pared con dos soportes, la tela lisa
  // arriba y abajo los pliegues (cada uno sobresale un poco más), con el cordón y su bola a la derecha
  const linen = std(C.linen, 0.95);
  const railY = WY + WH / 2 + 11, railW = WW + 18;
  add(boxM(railW, 6, 7, std(C.wood, 0.55)), WX, railY, BACK + 6.5, false);
  // dos escuadras metálicas atornilladas a la pared, por encima del cajón
  const metal = std('#CDD2D9', 0.45, 0.1), screw = std('#8E959E', 0.4, 0.2);
  for (const sx of [-1, 1]) {
    const bx = WX + sx * (railW / 2 - 16);
    add(boxM(6, 13, 0.8, metal), bx, railY + 6, BACK + 0.9, false);
    add(boxM(6, 0.8, 8, metal), bx, railY + 3.4, BACK + 4.5, false);
    for (const dy of [3, 9]) {
      const sc = add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 10), screw), bx, railY + dy, BACK + 1.5, false);
      sc.rotation.x = Math.PI / 2;
    }
  }
  const blindW = WW + 10, flatH = 14, blindTop = railY - 3;
  add(boxM(blindW, flatH, 1.6, linen), WX, blindTop - flatH / 2, BACK + 6, false);
  const pleats = 4, pr = 3.4;
  for (let k = 0; k < pleats; k++) {
    const y = blindTop - flatH - pr - k * pr * 1.75;
    const fold = add(new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, blindW, 20, 1, false, -Math.PI / 2, Math.PI), linen), WX, y, BACK + 6.2 + k * 0.7, false);
    fold.rotation.set(0, 0, Math.PI / 2);
    fold.scale.set(1, 1, 1.25 + k * 0.12);
    // la sombra entre pliegue y pliegue
    add(boxM(blindW - 0.5, 0.8, 0.6, std('#B9AC95', 1)), WX, y - pr * 0.9, BACK + 6.6 + k * 0.7, false);
  }
  const blindBottom = blindTop - flatH - pr * 1.75 * pleats - 1;
  // la tela de detrás de los pliegues (para que no se vea el cielo entre ellos)
  add(boxM(blindW, blindTop - flatH - blindBottom, 1, std('#DCD0BC', 1)), WX, (blindTop - flatH + blindBottom) / 2, BACK + 5.4, false);
  add(boxM(blindW, 2.2, 3, std(C.woodDark, 0.6)), WX, blindBottom, BACK + 8, false);
  const cordX = WX + blindW / 2 - 3;
  const cordLen = blindTop - 2 - 150;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, cordLen, 6), std('#F3F0EA', 0.8)), cordX, blindTop - 2 - cordLen / 2, BACK + 10.5, false);
  add(new THREE.Mesh(new THREE.SphereGeometry(1.8, 14, 10), std(C.woodDark, 0.5)), cordX, 150, BACK + 10.5, false);
  // planta pequeña en el alféizar
  const sillPot = add(new THREE.Mesh(new THREE.CylinderGeometry(5, 4, 8, 18), std('#C8643B', 0.7)), WX + 28, WY - WH / 2 - 1, BACK + 7);
  for (let k = 0; k < 6; k++) {
    const l = add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), std(C.leaf2, 0.8)), Math.sin(k) * 3, 6 + (k % 3) * 2, Math.cos(k) * 3, true, sillPot);
    l.scale.set(1, 1.8, 1);
  }

  // ── póster enmarcado ───────────────────────────────────────────────────────
  add(boxM(46, 64, 2.5, std(C.black, 0.5)), 18, 226, BACK + 1.5, false);
  add(plane(41, 58, std('#ffffff', 0.9, 0, { map: posterTex(opts.poster ?? 'Cada dia,|una mica|més') })), 18, 226, BACK + 2.9, false);

  // ── estanterías flotantes con libros, trofeo, altavoz, foto y plantas ──────
  const shelfM = std(C.wood, 0.55);
  add(boxM(74, 3.5, 18, shelfM), 92, 150, BACK + 9);
  add(boxM(74, 3.5, 18, shelfM), 92, 205, BACK + 9);
  const book = (x: number, y: number, h: number, col: string, tilt = 0) => {
    const b = add(boxM(5.5, h, 13, std(col, 0.75)), x, y + h / 2, BACK + 9, true);
    b.rotation.z = tilt;
  };
  [[C.blue, 22], [C.orange, 25], [C.green, 21], [C.red, 24]].forEach(([col, h], i) => book(64 + i * 6, 152, h as number, col as string));
  // apoyado en el rojo: la esquina de abajo en la balda y la de arriba contra el lomo del rojo
  book(91.5, 152, 22, '#1E2633', 0.38);
  // planta colgante en la balda de abajo
  const hang = add(new THREE.Mesh(new THREE.CylinderGeometry(6, 4.6, 10, 18), std('#F4F1EC', 0.5)), 118, 157, BACK + 9);
  for (let k = 0; k < 14; k++) {
    const l = add(new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), std(k % 2 ? C.leaf : C.leaf2, 0.8)), Math.sin(k * 1.7) * 5, 4 - k * 2.4, 5 + Math.cos(k) * 2, true, hang);
    l.scale.set(1.3, 0.7, 1);
  }
  // trofeo dorado
  const gold = std('#E2B53E', 0.3, 0.8);
  add(boxM(9, 4, 9, std('#1E2633', 0.5)), 70, 209, BACK + 9);
  add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 10), gold), 70, 214, BACK + 9);
  add(new THREE.Mesh(new THREE.CylinderGeometry(6, 2.5, 9, 18), gold), 70, 221, BACK + 9);
  // altavoz
  const spk = add(boxM(10, 15, 9, std('#3A4555', 0.7)), 88, 214.5, BACK + 9);
  add(new THREE.Mesh(new THREE.CircleGeometry(3, 18), std('#1E2633', 0.6)), 0, -1.5, 4.6, false, spk);
  // marco con foto (montaña) y una plantita
  const ph = add(boxM(15, 19, 1.5, std(C.frame, 0.5)), 106, 217, BACK + 4);
  ph.rotation.x = -0.12;
  add(plane(11, 15, new THREE.MeshBasicMaterial({ map: VIEW })), 0, 0, 0.8, false, ph);
  const pot2 = add(new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.6, 8, 16), std('#2F5BEA', 0.5)), 121, 211, BACK + 9);
  for (let k = 0; k < 5; k++) {
    const l = add(new THREE.Mesh(new THREE.ConeGeometry(1.4, 12, 6), std(C.leaf, 0.8)), Math.sin(k * 1.3) * 1.8, 8, Math.cos(k * 1.3) * 1.8, true, pot2);
    l.rotation.set(Math.cos(k * 1.3) * 0.35, 0, -Math.sin(k * 1.3) * 0.35);
  }

  // ── reloj de pared ─────────────────────────────────────────────────────────
  const clock = add(new THREE.Group(), 92, 262, BACK + 2, false);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 2.5, 32), std(C.frame, 0.4));
  face.rotation.x = Math.PI / 2; clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(13, 1.3, 8, 32), std('#1E2633', 0.5));
  rim.position.z = 1; clock.add(rim);
  for (let k = 0; k < 12; k++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(k % 3 ? 0.7 : 1.2, k % 3 ? 1.6 : 2.6, 0.4), std('#1E2633', 0.5));
    const a = (k / 12) * Math.PI * 2;
    tick.position.set(Math.sin(a) * 10.5, Math.cos(a) * 10.5, 1.5); tick.rotation.z = -a; clock.add(tick);
  }
  for (const [len, ang, col] of [[8.5, 0.6, '#1E2633'], [5.5, 3.9, '#1E2633'], [9.5, 2.2, C.red]] as const) {
    const hand = new THREE.Mesh(new THREE.BoxGeometry(col === C.red ? 0.5 : 1.2, len, 0.4), std(col, 0.5));
    hand.position.set((Math.sin(ang) * len) / 2, (Math.cos(ang) * len) / 2, 1.9); hand.rotation.z = -ang; clock.add(hand);
  }

  // ── material de fitness fijo ───────────────────────────────────────────────
  // esterilla enrollada de pie y otra en el suelo
  const roll = add(new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 62, 24), std(C.purple, 0.7)), -132, 31, BACK + 12);
  roll.rotation.z = 0.12;
  const roll2 = add(new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 58, 24), std('#14B8A6', 0.7)), -118, 6, BACK + 22);
  roll2.rotation.z = Math.PI / 2;
  // rodillo de espuma
  const roller = add(new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 34, 20), std(C.orange, 0.8)), -116, 19, BACK + 22);
  roller.rotation.z = Math.PI / 2;
  // dos kettlebells
  const kettle = (x: number, z: number, s: number, band: string) => {
    const g = add(new THREE.Group(), x, 0, z);
    g.scale.setScalar(s);
    const m = std(C.black, 0.45, 0.3);
    const body = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), m); body.scale.set(1, 0.92, 1); body.position.y = 9.5;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(6, 1.6, 10, 24, Math.PI), m); handle.position.y = 17;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(10.2, 10.2, 2.5, 24), std(band, 0.5)); ring.position.y = 9.5;
    g.add(body, handle, ring);
    g.traverse((o) => { o.castShadow = false; o.receiveShadow = true; });
  };
  kettle(-96, BACK + 40, 1, C.orange);
  kettle(-78, BACK + 30, 0.78, C.green);
  // botella de agua
  const bottle = add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 20, 16), std(C.blue, 0.3)), -62, 10, BACK + 24);
  add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 12), std('#F7F7F4', 0.4)), 0, 11.5, 0, true, bottle);
  // soporte con mancuernas hexagonales (tres pares)
  const rack = add(new THREE.Group(), 66, 0, BACK + 34);
  rack.scale.setScalar(1.3);
  const steel = std(C.black, 0.4, 0.5);
  for (const sx of [-26, 26]) {
    for (const [y, z] of [[13, 6], [29, -6]] as const) { const arm = boxM(2, 2, 18, steel); arm.position.set(sx, y, z); rack.add(arm); }
    const leg = boxM(2.4, 34, 2.4, steel); leg.position.set(sx, 17, -6); rack.add(leg);
    const legF = boxM(2.4, 14, 2.4, steel); legF.position.set(sx, 7, 8); rack.add(legF);
  }
  for (const [y, z] of [[15, 6], [31, -6]] as const) {
    const bar = boxM(54, 1.5, 9, steel); bar.position.set(0, y - 1, z); rack.add(bar);
  }
  const dumb = (x: number, y: number, z: number, r: number, col: string) => {
    const g = new THREE.Group(); g.position.set(x, y + r, z);
    const head = std(C.black, 0.6);
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 4, 6), head); h.rotation.z = Math.PI / 2; h.position.x = s * 5.5; g.add(h);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.15, r + 0.15, 0.9, 6), std(col, 0.5)); band.rotation.z = Math.PI / 2; band.position.x = s * 4.6; g.add(band);
    }
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 8, 10), std(C.chrome, 0.25, 0.9)); handle.rotation.z = Math.PI / 2; g.add(handle);
    rack.add(g);
  };
  [[-16, C.red, 3.2], [0, C.orange, 3.8], [16, C.blue, 4.2]].forEach(([x, col, r]) => {
    dumb(x as number, 15, 6, r as number, col as string); dumb(x as number, 31, -6, r as number, col as string);
  });
  rack.traverse((o) => { o.castShadow = false; o.receiveShadow = true; });
  // fitball
  add(new THREE.Mesh(new THREE.SphereGeometry(25, 40, 28), std('#3B6BF0', 0.35)), 98, 25, BACK + 80);

  // ── planta grande (tipo costilla de Adán) en la esquina ────────────────────
  const big = add(new THREE.Group(), 142, 0, BACK + 20);
  const bigPot = new THREE.Mesh(new THREE.CylinderGeometry(16, 12, 32, 28), std('#E9E2D6', 0.55)); bigPot.position.y = 16; big.add(bigPot);
  const potRim = new THREE.Mesh(new THREE.TorusGeometry(16, 1.4, 8, 28), std('#D9CFBF', 0.55)); potRim.rotation.x = Math.PI / 2; potRim.position.y = 32; big.add(potRim);
  for (let k = 0; k < 11; k++) {
    const a = k * 2.3 + 0.4, lean = 0.35 + (k % 3) * 0.18, len = 46 + (k % 4) * 12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, len, 6), std('#4E7F45', 0.8));
    const dirV = new THREE.Vector3(Math.sin(a) * Math.sin(lean), Math.cos(lean), Math.cos(a) * Math.sin(lean));
    stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirV);
    stem.position.copy(dirV.clone().multiplyScalar(len / 2)).add(new THREE.Vector3(0, 30, 0));
    big.add(stem);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 10), std(k % 2 ? C.leaf : '#256B41', 0.7));
    leaf.scale.set(1, 0.14, 1.35);
    leaf.position.copy(dirV.clone().multiplyScalar(len + 6)).add(new THREE.Vector3(0, 30, 0));
    leaf.rotation.set(-0.5 * Math.cos(a), a, 0.5 * Math.sin(a));
    big.add(leaf);
  }
  big.traverse((o) => { o.castShadow = false; o.receiveShadow = true; });

  // ── sombras de contacto ────────────────────────────────────────────────────
  blob(-96, BACK + 40, 36, 30); blob(-78, BACK + 30, 28, 24); blob(-62, BACK + 24, 12, 12);
  blob(-118, BACK + 22, 80, 26); blob(66, BACK + 34, 96, 50); blob(98, BACK + 80, 62, 46);
  blob(142, BACK + 20, 46, 46); blob(0, BACK + 4, 1400, 14, 0.7);
  wallBlob(92, 143, 80, 14); wallBlob(92, 198, 80, 14); wallBlob(WX, WY - WH / 2 - 14, WW + 30, 14, 0.4);
  wallBlob(WX, WY + WH / 2 + 4, WW + 34, 12, 0.35);
  wallBlob(18, 222, 54, 74, 0.25); wallBlob(92, 259, 34, 34, 0.25);

  // ── luces: cálida desde la ventana y un poco de luz de techo ───────────────
  const win = new THREE.PointLight(0xffe7c4, 0.35, 700, 0);
  win.position.set(WX, WY, BACK + 70);
  room.add(win);
  const lamp = new THREE.PointLight(0xfff4e6, 0.15, 900, 0);
  lamp.position.set(40, 330, -20);
  room.add(lamp);
}
