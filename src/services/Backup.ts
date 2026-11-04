/* Copia de seguridad: guardar en un archivo (con el menú de compartir del móvil, que incluye Drive)
   y elegir un archivo para restaurarla. */

function fileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  // .txt: es el tipo de archivo de texto que Android acepta compartir desde el navegador
  return `ejercicios-en-casa-copia-${d}.txt`;
}

/**
 * Ofrece el archivo para guardarlo. En Android abre el menú de compartir (Drive, correo…);
 * si no se puede, lo descarga. Devuelve 'shared', 'downloaded' o 'cancelled'.
 */
export async function saveBackupFile(text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = fileName();
  const file = new File([text], name, { type: 'text/plain' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Copia de Ejercicios en casa' });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}

/** Abre el selector de archivos y devuelve el texto del archivo elegido (o null si se cancela). */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json,text/plain,application/json';
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      resolve(f ? await f.text() : null);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
