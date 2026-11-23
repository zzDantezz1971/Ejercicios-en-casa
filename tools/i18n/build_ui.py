"""Une los lotes tools/i18n/ui/*.tsv (índice, gallego, euskera) con las filas de src/i18n/ui.ts y escribe
src/i18n/gl/ui.ts y src/i18n/eu/ui.ts (castellano → traducción). Comprueba que coinciden los {huecos}."""
import glob, json, re, subprocess, sys
rows = [l.split('\t') for l in subprocess.run(['npx', 'tsx', 'tools/i18n/dump_ui.ts'], capture_output=True, text=True, check=True).stdout.splitlines()]
es_of = {int(r[0]): r[1] for r in rows}
gl, eu, bad = {}, {}, []
for f in sorted(glob.glob('tools/i18n/ui/*.tsv')):
    for line in open(f, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line: continue
        i, g, e = line.split('\t')
        es = es_of[int(i)]
        ph = lambda s: sorted(re.findall(r'\{\w+\}', s))
        if ph(es) != ph(g) or ph(es) != ph(e): bad.append((i, es, g, e))
        gl[es], eu[es] = g, e
missing = [r[1] for r in rows if r[1] not in gl]
def write(path, name, lang, d):
    body = ''.join(f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},\n' for k, v in d.items())
    open(path, 'w', encoding='utf-8').write(f'/* Textos de la interfaz en {lang}: texto en castellano → traducción. Traducidos a mano (lotes en tools/i18n/ui). */\nexport const {name}: Record<string, string> = {{\n{body}}};\n')
write('src/i18n/gl/ui.ts', 'UI_GL', 'gallego', gl)
write('src/i18n/eu/ui.ts', 'UI_EU', 'euskera', eu)
print('filas', len(rows), 'traducidas', len(gl), 'faltan', len(missing))
for m in missing[:20]: print('  falta:', m)
for b in bad: print('  huecos distintos:', b)
sys.exit(1 if bad else 0)
