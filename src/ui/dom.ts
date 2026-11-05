/** Crea elementos con atributos e hijos en una línea: h('button', { class: 'btn', onclick }, 'Texto'). */
type Attrs = Record<string, unknown>;
type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v as Record<string, string>)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else (el.style as unknown as Record<string, string>)[sk] = sv;
      }
    }
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
          cancel ? h('button', { class: 'btn ghost', onclick: () => close(false) }, cancel) : null,
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

/** Peso con coma decimal: 7,5 kg. */
export function kg(w: number): string {
  return `${String(w).replace('.', ',')} kg`;
}

/**
 * Pide el peso por mancuerna. Devuelve el peso, 0 si se elige "Sin peso" o null si se cancela.
 */
export function weightDialog(name: string, initial: number): Promise<number | null> {
  return new Promise((resolve) => {
    let value = initial;
    const shown = h('span', { class: 'wd-value' });
    const paint = () => {
      shown.textContent = kg(value);
      minus.disabled = value <= 0.5;
      plus.disabled = value >= 50;
      quick.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.kg) === value));
    };
    const set = (v: number) => {
      value = Math.min(50, Math.max(0.5, Math.round(v * 2) / 2));
      paint();
    };
    const minus = h('button', { class: 'wd-step', 'aria-label': 'Menos peso', onclick: () => set(value - 0.5) }, '−');
    const plus = h('button', { class: 'wd-step', 'aria-label': 'Más peso', onclick: () => set(value + 0.5) }, '+');
    const quick = h('div', { class: 'wd-quick' }, ...[2, 4, 5, 6, 8, 10, 12, 15].map((n) =>
      h('button', { class: 'wd-chip', 'data-kg': String(n), onclick: () => set(n) }, String(n))));
    const close = (v: number | null) => {
      wrap.remove();
      resolve(v);
    };
    const wrap = h('div', { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && close(null) },
      h('div', { class: 'dialog weight-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Peso para ${name}` },
        h('div', {}, h('p', { class: 'dialog-title' }, '¿Con cuánto peso?'), h('p', { class: 'muted small' }, `${name} · por mancuerna`)),
        h('div', { class: 'wd-row' }, minus, shown, plus),
        quick,
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn ghost', onclick: () => close(0) }, 'Sin peso'),
          h('button', { class: 'btn ghost', onclick: () => close(null) }, 'Cancelar'),
          h('button', { class: 'btn primary', onclick: () => close(value) }, 'Aceptar'))));
    document.body.append(wrap);
    paint();
  });
}

/** Pide el peso corporal (pasos de 0,1 kg). Devuelve el peso o null si se cancela. */
export function bodyWeightDialog(title: string, initial: number): Promise<number | null> {
  return new Promise((resolve) => {
    let value = Math.round(initial * 10) / 10;
    const shown = h('span', { class: 'wd-value' });
    const paint = () => (shown.textContent = `${value.toFixed(1).replace('.', ',')} kg`);
    const set = (v: number) => {
      value = Math.min(250, Math.max(30, Math.round(v * 10) / 10));
      paint();
    };
    const step = (d: number, label: string, aria: string) => h('button', { class: 'wd-step small', 'aria-label': aria, onclick: () => set(value + d) }, label);
    const close = (v: number | null) => {
      wrap.remove();
      resolve(v);
    };
    const wrap = h('div', { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && close(null) },
      h('div', { class: 'dialog weight-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('p', { class: 'dialog-title' }, title),
        h('div', { class: 'wd-row' }, step(-1, '−1', 'Un kilo menos'), step(-0.1, '−', 'Cien gramos menos'), shown, step(0.1, '+', 'Cien gramos más'), step(1, '+1', 'Un kilo más')),
        h('div', { class: 'dialog-actions two' },
          h('button', { class: 'btn ghost', onclick: () => close(null) }, 'Cancelar'),
          h('button', { class: 'btn primary', onclick: () => close(value) }, 'Guardar'))));
    document.body.append(wrap);
    paint();
  });
}
