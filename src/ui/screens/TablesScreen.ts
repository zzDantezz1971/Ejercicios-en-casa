import { tr } from '../../i18n';
import { WorkoutPlan } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES, type SavedRoutine } from '../../domain/types';
import type { App, Screen } from '../App';
import { actionSheet, clear, confirmDialog, h, humanDuration, plural, promptDialog } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { formatDate } from './HomeScreen';
import { editTable } from './TableEditScreen';
import { openNewTable } from './MakerScreens';
import { newPlan, openPlan, planTitle } from './PlanScreens';

/** Mis tablas: lista de tablas guardadas con nombre. */
export class TablesScreen implements Screen {
  readonly el = h('main', { class: 'screen tables' });
  readonly tab = 'tablas' as const;
  private body = h('div', { class: 'tables-body' });

  constructor(private readonly app: App) {
    this.el.append(
      // título en una línea y, debajo, los dos botones para crear (grupo y tabla)
      h('header', { class: 'page-head tables-head' },
        h('h1', {}, 'Mis tablas'),
        h('div', { class: 'tables-head-btns' },
          h('button', { class: 'btn primary small', 'aria-label': 'Crear un grupo', onclick: () => void this.newGroup() }, icon('plus'), 'Grupo'),
          h('button', { class: 'btn primary small', 'aria-label': 'Nueva tabla', onclick: () => this.create() }, icon('plus'), 'Tabla'))),
      this.body,
    );
  }

  enter(): void {
    this.render();
  }

  private render(): void {
    const { store } = this.app;
    clear(this.body);
    // planes de la semana: una sola tarjeta arriba con el plan en uso (sus tablas de cada día no salen sueltas);
    // si hay más de un plan, al tocarla se ve la lista para elegir
    const plan = store.plan && this.app.access.premium ? store.plan : undefined;
    const planIds = new Set(plan ? store.plans.flatMap((p) => p.days.map((d) => d.routineId)) : []);
    if (plan) {
      // una sola entrada «Plan(es) de la semana»; dentro, la lista de planes para elegir o crear otro
      const n = store.plans.length;
      const inUse = planIds.has(store.active.id);
      const open = () => openPlan(this.app);
      this.body.append(h('article', { class: 'card table-card plan-card plan-group' + (inUse ? ' active' : ''), role: 'button', tabindex: 0, onclick: open },
        h('div', { class: 'table-head' },
          h('div', { class: 'plan-card-title' }, h('span', { class: 'plan-icon' }, icon('calendar')), h('h2', {}, n > 1 ? 'Planes de la semana' : 'Plan de la semana')),
          inUse ? h('span', { class: 'active-pill' }, 'En uso') : null),
        h('div', { class: 'table-meta' },
          h('span', { class: 'meta-line' }, icon('tables'), plural(n, 'plan', 'planes')),
          h('span', { class: 'meta-line' }, icon('check'), `${tr(inUse ? 'En uso' : 'Último usado')}: ${planTitle(plan)}`)),
        h('div', { class: 'table-actions' },
          h('button', { class: 'btn small primary', onclick: (e: Event) => { e.stopPropagation(); open(); } }, icon('tables'), n > 1 ? 'Ver los planes' : 'Ver el plan'),
          h('button', { class: 'btn small ghost', onclick: (e: Event) => { e.stopPropagation(); newPlan(this.app); } }, icon('plus'), 'Nuevo plan'))));
    }
    // grupos (plegados; al tocarlos se ven sus tablas) y después las tablas que no están en ningún grupo
    const loose = store.routines.filter((t) => !planIds.has(t.id));
    for (const g of store.groups) this.body.append(this.groupCard(g.id, g.name, loose.filter((t) => t.group === g.id)));
    for (const t of loose) if (!t.group || !store.groups.some((g) => g.id === t.group)) this.body.append(this.card(t, t.id === store.active.id));
  }

  /** Grupos abiertos (mientras la app está abierta). */
  private static open = new Set<string>();

  private groupCard(id: string, name: string, tables: SavedRoutine[]): HTMLElement {
    const open = TablesScreen.open.has(id);
    const inUse = tables.some((t) => t.id === this.app.store.active.id);
    const toggle = () => {
      if (open) TablesScreen.open.delete(id); else TablesScreen.open.add(id);
      this.render();
    };
    return h('section', { class: 'card group-card' + (open ? ' open' : '') + (inUse ? ' active' : '') },
      h('div', { class: 'group-head' },
        h('button', { class: 'group-main', 'aria-expanded': String(open), onclick: toggle },
          h('span', { class: 'group-icon' }, icon('folder')),
          h('span', { class: 'group-text' }, h('strong', {}, name),
            h('span', { class: 'muted small' }, tables.length ? plural(tables.length, 'tabla', 'tablas') : 'Sin tablas', inUse ? ' · ' : '', inUse ? h('span', { class: 'group-inuse' }, 'En uso') : '')),
          icon('chevron', 'ico chev group-chev')),
        h('button', { class: 'more-btn', 'aria-label': `Más opciones de ${name}`, onclick: () => void this.groupMore(id, name) }, icon('more'))),
      open ? h('div', { class: 'group-body' },
        ...(tables.length ? tables.map((t) => this.card(t, t.id === this.app.store.active.id))
          : [h('p', { class: 'muted small' }, 'Para meter una tabla aquí, toca sus tres puntos y «Mover a un grupo».')])) : '');
  }

  private async newGroup(): Promise<string | null> {
    const name = await promptDialog('Nombre del grupo', '', 'Crear');
    if (!name) return null;
    const id = this.app.store.createGroup(name);
    TablesScreen.open.add(id);
    this.render();
    return id;
  }

  private async groupMore(id: string, name: string): Promise<void> {
    const choice = await actionSheet(name, [
      { id: 'rename', label: 'Cambiar nombre' },
      { id: 'delete', label: 'Borrar el grupo', danger: true },
    ]);
    if (choice === 'rename') {
      const n = await promptDialog('Nuevo nombre', name, 'Guardar');
      if (n) this.app.store.renameGroup(id, n);
    } else if (choice === 'delete') {
      if (await confirmDialog(`¿Borrar el grupo "${name}"? Sus tablas no se borran: vuelven a la lista.`, 'Borrar')) this.app.store.deleteGroup(id);
    }
    this.render();
  }

  /** Mover una tabla a un grupo (o sacarla del suyo). */
  private async moveTo(t: SavedRoutine): Promise<void> {
    const { store } = this.app;
    const opts: Array<{ id: string; label: string }> = store.groups.filter((g) => g.id !== t.group).map((g) => ({ id: g.id, label: g.name }));
    opts.push({ id: '__new', label: '+ Nuevo grupo' });
    if (t.group) opts.push({ id: '__out', label: 'Sacar del grupo' });
    const choice = await actionSheet('Mover a un grupo', opts);
    if (!choice) return;
    if (choice === '__out') store.moveToGroup(t.id, null);
    else if (choice === '__new') {
      const id = await this.newGroup();
      if (id) store.moveToGroup(t.id, id);
    } else {
      store.moveToGroup(t.id, choice);
      TablesScreen.open.add(choice);
    }
    this.render();
  }

  private card(t: SavedRoutine, active: boolean): HTMLElement {
    const plan = WorkoutPlan.build(t.routine, this.app.catalog, this.app.store.settings, t.rounds);
    const total = Math.max(1, SECTION_IDS.reduce((n, s) => n + t.routine[s].length, 0));
    const mix = h('div', { class: 'mix' }, ...SECTION_IDS.filter((s) => t.routine[s].length).map((s) => {
      const seg = h('span', { title: `${SECTION_TITLES[s]}: ${t.routine[s].length}` });
      seg.style.flex = String(t.routine[s].length / total);
      seg.style.background = SECTION_STYLE[s].color;
      return seg;
    }));
    const pills = SECTION_IDS.filter((s) => t.routine[s].length).map((s) => {
      const p = h('span', { class: 'sec-pill' }, icon(SECTION_STYLE[s].icon), String(t.routine[s].length));
      p.style.setProperty('--sec', SECTION_STYLE[s].color);
      p.title = SECTION_TITLES[s];
      return p;
    });
    return h('article', { class: 'card table-card' + (active ? ' active' : '') },
      h('div', { class: 'table-head' }, h('h2', {}, t.name), active ? h('span', { class: 'active-pill' }, 'En uso') : null),
      h('div', { class: 'table-meta' },
        h('span', { class: 'meta-line' }, icon('clock'), plan.isEmpty ? 'Sin ejercicios' : `${humanDuration(plan.estimatedSeconds)} · ${plural(plan.exerciseCount, 'ejercicio', 'ejercicios')}`),
        pills.length ? h('span', { class: 'pills' }, ...pills) : null,
        h('span', { class: 'meta-line' }, icon('calendar'), t.lastUsed ? `Última vez: ${formatDate(t.lastUsed)}` : 'Aún no la has usado')),
      pills.length ? mix : null,
      h('div', { class: 'table-actions' },
        h('button', { class: 'btn small ' + (active ? 'ghost' : 'primary'), disabled: active, onclick: () => this.use(t) }, active ? icon('check') : icon('play'), active ? 'En uso' : 'Usar'),
        h('button', { class: 'btn small ghost', onclick: () => this.edit(t) }, icon('edit'), 'Editar'),
        h('button', { class: 'more-btn', 'aria-label': `Más opciones de ${t.name}`, onclick: () => void this.more(t) }, icon('more'))),
    );
  }

  private use(t: SavedRoutine): void {
    this.app.store.setActive(t.id);
    this.app.haptics.tap();
    this.app.openTab('inicio');
  }

  private edit(t: SavedRoutine): void {
    this.app.store.setActive(t.id);
    editTable(this.app, t.id);
  }

  /** Nueva tabla: con el asistente, una tabla hecha o vacía. */
  private create(): void {
    openNewTable(this.app);
  }

  private async more(t: SavedRoutine): Promise<void> {
    const choice = await actionSheet(t.name, [
      { id: 'rename', label: 'Cambiar nombre' },
      { id: 'move', label: t.group ? 'Mover a otro grupo' : 'Mover a un grupo' },
      { id: 'duplicate', label: 'Duplicar' },
      { id: 'delete', label: 'Borrar', danger: true },
    ]);
    const { store } = this.app;
    if (choice === 'rename') {
      const name = await promptDialog('Nuevo nombre', t.name, 'Guardar');
      if (name) store.renameRoutine(t.id, name);
    } else if (choice === 'move') {
      await this.moveTo(t);
      return;
    } else if (choice === 'duplicate') {
      // versión gratis: una sola tabla
      if (!this.app.access.premium) { this.app.showPremium(); return; }
      store.duplicateRoutine(t.id);
    } else if (choice === 'delete') {
      const last = store.routines.length === 1;
      const ok = await confirmDialog(
        last ? `¿Borrar "${t.name}"? Es tu única tabla: quedará una tabla vacía.` : `¿Borrar la tabla "${t.name}"? No se puede deshacer.`,
        'Borrar',
      );
      if (ok) store.deleteRoutine(t.id);
    }
    this.render();
  }
}
