/** Crea elementos con atributos e hijos en una línea: h('button', { class: 'btn', onclick }, 'Texto'). */
type Attrs = Record<string, unknown>;
type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** 75 -> "1:15"; 40 -> "0:40". */
export function mmss(total: number): string {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Duración legible: "35 min", "1 h 05 min", "45 s". */
export function humanDuration(total: number): string {
  const s = Math.round(total);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

/** Diálogo de confirmación dentro de la página. */
export function confirmDialog(text: string, ok: string, cancel = 'Cancelar'): Promise<boolean> {
  return new Promise((resolve) => {
    const close = (v: boolean) => {
      wrap.remove();
      resolve(v);
    };
    const wrap = h(
      'div',
      { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && close(false) },
      h(
        'div',
        { class: 'dialog', role: 'dialog', 'aria-modal': 'true' },
        h('p', {}, text),
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn ghost', onclick: () => close(false) }, cancel),
          h('button', { class: 'btn primary', onclick: () => close(true) }, ok)),
      ),
    );
    document.body.append(wrap);
    (wrap.querySelector('.btn.primary') as HTMLButtonElement).focus();
  });
}

/** Añade hijos ignorando los vacíos (null, false...). */
export function append(el: Element, ...children: Child[]): void {
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
}

/** "1 ejercicio", "3 ejercicios". */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const ICONS: Record<string, string> = {
  prev: 'M6 5h2.5v14H6zM20 5v14L9.5 12z',
  next: 'M15.5 5H18v14h-2.5zM4 5l10.5 7L4 19z',
  pause: 'M6.5 5h4v14h-4zm7 0h4v14h-4z',
  play: 'M7 4.5v15l12.5-7.5z',
};

/** Icono SVG sencillo (los símbolos de texto se ven distintos en cada móvil). */
export function icon(name: keyof typeof ICONS): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

/** Diálogo para escribir un texto (por ejemplo, el nombre de una tabla). Devuelve null si se cancela. */
export function promptDialog(title: string, initial: string, ok: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', id: 'prompt-input', class: 'text-input', value: initial, maxlength: '40', autocomplete: 'off', enterkeyhint: 'done' });
    const close = (v: string | null) => {
      wrap.remove();
      resolve(v);
    };
    const submit = () => {
      const v = input.value.trim();
      if (v) close(v);
      else input.focus();
    };
    const wrap = h(
      'div',
      { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && close(null) },
      h(
        'form',
        { class: 'dialog', role: 'dialog', 'aria-modal': 'true', onsubmit: (e: Event) => { e.preventDefault(); submit(); } },
        h('label', { for: 'prompt-input', class: 'dialog-title' }, title),
        input,
        h('div', { class: 'dialog-actions' },
          h('button', { type: 'button', class: 'btn ghost', onclick: () => close(null) }, 'Cancelar'),
          h('button', { type: 'submit', class: 'btn primary' }, ok)),
      ),
    );
    document.body.append(wrap);
    input.focus();
    input.select();
  });
}

/** Menú de opciones que sube desde abajo. Devuelve la opción elegida o null. */
export function actionSheet<T extends string>(title: string, options: Array<{ id: T; label: string; danger?: boolean }>): Promise<T | null> {
  return new Promise((resolve) => {
    const close = (v: T | null) => {
      wrap.remove();
      resolve(v);
    };
    const wrap = h(
      'div',
      { class: 'dialog-wrap sheet-wrap', onclick: (e: Event) => e.target === wrap && close(null) },
      h(
        'div',
        { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('p', { class: 'sheet-title' }, title),
        ...options.map((o) => h('button', { class: 'sheet-btn' + (o.danger ? ' danger' : ''), onclick: () => close(o.id) }, o.label)),
        h('button', { class: 'sheet-btn cancel', onclick: () => close(null) }, 'Cancelar'),
      ),
    );
    document.body.append(wrap);
  });
}
