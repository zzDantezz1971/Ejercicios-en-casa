// Vuelca las filas de la interfaz (índice, castellano, catalán) para traducirlas por lotes.
import { UI_ROWS } from '../../src/i18n/ui';
for (const [i, r] of UI_ROWS.entries()) console.log(`${i}\t${r[0]}\t${r[1]}`);
