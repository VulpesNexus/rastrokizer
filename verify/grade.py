"""Grade a verify_v2 batch: pixels (live vs fixed, premultiplied, >2/255) AND structure from
report.txt (converted cases must leave group G with effects=false and its opacity/fill as
built; refused cases must be refused and untouched)."""
import re, sys
from pathlib import Path
import numpy as np
from PIL import Image

def load(p):
    a = np.asarray(Image.open(p).convert('RGBA')).astype(np.int32)
    a[..., :3] = a[..., :3] * a[..., 3:4] // 255
    return a

def parse(report):
    cases, cur = {}, None
    for line in report.read_text(encoding='utf-8').splitlines():
        if line.startswith('== '): cur = line[3:].strip(); cases[cur] = []
        elif cur is not None: cases[cur].append(line)
    return cases

def main(folder):
    d = Path(folder); cases = parse(d / 'report.txt')
    print(f"== {d.name}: {len(cases)} cases ==")
    print(f"  {'case':<26}{'px>2':>7}{'max':>5}  {'group after':<34}verdict")
    tally = {}
    for name, lines in cases.items():
        text = '\n'.join(lines)
        refused = any(l.strip().startswith('refused:') for l in lines)
        converted = '  converted' in text
        g = next((l for l in lines if l.startswith('  group "G"')), '')
        m = re.search(r'opacity=([\d.]+) fill=(\d+) .* effects=(true|false)', g)
        gdesc = f"op={m.group(1)} fill={m.group(2)} fx={m.group(3)}" if m else '?'
        lv, fx = d / f'{name}-live.png', d / f'{name}-fixed.png'
        px = mx = None
        if lv.exists() and fx.exists():
            dd = np.abs(load(lv) - load(fx)).max(axis=2); px, mx = int((dd > 2).sum()), int(dd.max())
        expect_refuse = name.startswith('ref-')
        if expect_refuse:
            v = 'REFUSED ok' if (refused and px == 0) else ('UNEXPECTED (' + ('converted' if converted else 'touched') + ')')
        elif converted:
            fx_gone = m and m.group(3) == 'false'
            v = ('EXACT' if px == 0 else ('EDGE' if (px is not None and px <= 400) else f'DIVERGES')) + ('' if fx_gone else ' +STYLE-LEFT')
        else:
            v = 'NOT CONVERTED: ' + next((l.strip() for l in lines if 'refused' in l or 'ERR' in l), '?')[:70]
        key = v.split(' ')[0]; tally[key] = tally.get(key, 0) + 1
        print(f"  {name:<26}{str(px):>7}{str(mx):>5}  {gdesc:<34}{v}")
    print("  tally:", tally)

if __name__ == '__main__':
    main(sys.argv[1])
