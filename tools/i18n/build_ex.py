"""Une los lotes tools/i18n/ex/*.tsv (id, idioma, 7 textos) y escribe EX_GL / EX_EU en src/i18n/{gl,eu}/ex.ts."""
import glob, json, re, subprocess, sys
ids = [l.split('\t')[0] for l in subprocess.run(['npx', 'tsx', 'tools/i18n/dump_ex.ts'], capture_output=True, text=True, check=True).stdout.splitlines()]
d = {'gl': {}, 'eu': {}}
for f in sorted(glob.glob('tools/i18n/ex/*.tsv')):
    for n, line in enumerate(open(f, encoding='utf-8'), 1):
        line = line.rstrip('\n')
        if not line: continue
        p = line.split('\t')
        if len(p) != 9: print('mal', f, n, len(p)); sys.exit(1)
        d[p[1]][p[0]] = p[2:]
for lang, name in (('gl', 'EX_GL'), ('eu', 'EX_EU')):
    path = f'src/i18n/{lang}/ex.ts'
    s = open(path, encoding='utf-8').read()
    body = ''.join(f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},\n' for k, v in d[lang].items())
    s = re.sub(r'export const ' + name + r': Record<string, ExT> = \{.*?\n\};', f'export const {name}: Record<string, ExT> = {{\n{body}}};', s, flags=re.S)
    open(path, 'w', encoding='utf-8').write(s)
    miss = [i for i in ids if i not in d[lang]]
    print(lang, 'traducidos', len(d[lang]), 'de', len(ids), 'faltan', miss[:10])
