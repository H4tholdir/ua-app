"""
Riconosce i denti dentro una singola arcata (superiore o inferiore) e assegna i
numeri FDI.

Uso:  python3 scripts/design/dati/mappa-arcata.py sup
      python3 scripts/design/dati/mappa-arcata.py inf

Metodo: i denti sono le zone di smalto (chiare e poco sature), la gengiva è rosa.
Le macchie connesse si ordinano lungo l'arcata con un angolo che cresce in modo
monotono da un capo all'altro, così l'ordine è quello anatomico.

Convenzione: si guarda il paziente di fronte → il suo lato DESTRO (quadranti 1 e
4) appare a SINISTRA dello schermo.
"""
import sys, json, math
from collections import deque
from PIL import Image
import numpy as np

verso = sys.argv[1] if len(sys.argv) > 1 else 'sup'
FILE = {'sup': 'arcata-superiore', 'inf': 'arcata-inferiore'}[verso]
FDI = ([18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28] if verso == 'sup'
       else [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38])

img = Image.open(f'docs/design/assets/{FILE}.png').convert('RGBA')
a = np.array(img)
H, W = a.shape[:2]
r, g, b, al = (a[:,:,i].astype(int) for i in range(4))
maxc = np.maximum(np.maximum(r,g),b); minc = np.minimum(np.minimum(r,g),b)
smalto = (al > 120) & (maxc > 205) & ((maxc - minc) < 40)
print(f'{FILE}: {W}x{H} · pixel di smalto {smalto.sum()}')

visto = np.zeros_like(smalto, dtype=bool)
macchie = []
soglia = max(600, int(smalto.sum() / 60))     # scarta riflessi e schegge
for y0 in range(0, H, 2):
    for x0 in range(0, W, 2):
        if not smalto[y0,x0] or visto[y0,x0]:
            continue
        q = deque([(y0,x0)]); visto[y0,x0] = True; px = []
        while q:
            y,x = q.popleft(); px.append((y,x))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx = y+dy, x+dx
                if 0<=ny<H and 0<=nx<W and smalto[ny,nx] and not visto[ny,nx]:
                    visto[ny,nx]=True; q.append((ny,nx))
        if len(px) < soglia:
            continue
        ys=[p[0] for p in px]; xs=[p[1] for p in px]
        macchie.append({'n':len(px), 'cx':float(np.mean(xs)), 'cy':float(np.mean(ys)),
                        'x0':min(xs),'x1':max(xs),'y0':min(ys),'y1':max(ys)})

print(f'denti trovati: {len(macchie)}  (attesi 16)')
if len(macchie) != 16:
    print('  ⚠ NUMERO DIVERSO DA 16 — la mappatura NON è affidabile, va guardata')
    for m in sorted(macchie, key=lambda m:-m['n']):
        print(f"    area {m['n']:6d} centro ({m['cx']:6.1f},{m['cy']:6.1f})")

cx = sum(m['cx'] for m in macchie)/len(macchie)
cy = sum(m['cy'] for m in macchie)/len(macchie)
def theta(m):
    dx, dy = m['cx']-cx, m['cy']-cy
    return math.atan2(dx, -dy if verso=='sup' else dy)

out = {}
for m, n in zip(sorted(macchie, key=theta), FDI):
    out[n] = {
        'x': round(m['x0']/W*100, 3), 'y': round(m['y0']/H*100, 3),
        'w': round((m['x1']-m['x0'])/W*100, 3), 'h': round((m['y1']-m['y0'])/H*100, 3),
        'cx': round(m['cx']/W*100, 3), 'cy': round(m['cy']/H*100, 3),
    }

json.dump(out, open(f'scripts/design/dati/{FILE}.json','w'), indent=1)
print(f'salvato scripts/design/dati/{FILE}.json')
