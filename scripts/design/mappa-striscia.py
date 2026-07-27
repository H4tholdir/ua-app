"""
Trova i 32 denti dentro strisciadenti.png e ne ricava riquadro e centro.

Qui lo sfondo è bianco puro e i denti sono avorio: isolo i pixel che NON sono
bianco pieno. Due righe (superiore e inferiore), 16 denti ciascuna, ordinati da
sinistra a destra → numeri FDI in fila.
"""
from PIL import Image
import numpy as np
from collections import deque
import json

img = Image.open('docs/design/assets/strisciadenti.png').convert('RGB')
a = np.array(img).astype(int)
H, W = a.shape[:2]
r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]

# il dente è avorio: più scuro del bianco puro almeno su un canale
dente = (r < 246) | (g < 244) | (b < 240)
print(f'{W}x{H} · pixel di dente: {dente.sum()}')

visto = np.zeros_like(dente, dtype=bool)
macchie = []
for y0 in range(0, H, 2):
    for x0 in range(0, W, 2):
        if not dente[y0,x0] or visto[y0,x0]:
            continue
        q = deque([(y0,x0)]); visto[y0,x0] = True; px = []
        while q:
            y,x = q.popleft(); px.append((y,x))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx = y+dy, x+dx
                if 0<=ny<H and 0<=nx<W and dente[ny,nx] and not visto[ny,nx]:
                    visto[ny,nx]=True; q.append((ny,nx))
        if len(px) < 2500:
            continue
        ys=[p[0] for p in px]; xs=[p[1] for p in px]
        macchie.append({'n':len(px), 'cx':float(np.mean(xs)), 'cy':float(np.mean(ys)),
                        'x0':min(xs),'x1':max(xs),'y0':min(ys),'y1':max(ys)})

print(f'denti trovati: {len(macchie)}')
meta = H/2
sopra = sorted([m for m in macchie if m['cy'] < meta], key=lambda m: m['cx'])
sotto = sorted([m for m in macchie if m['cy'] >= meta], key=lambda m: m['cx'])
print(f'  riga di sopra: {len(sopra)} · riga di sotto: {len(sotto)}')

FDI_SUP = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]
FDI_INF = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]

out = {}
for gruppo, numeri in ((sopra, FDI_SUP), (sotto, FDI_INF)):
    if len(gruppo) != 16:
        print(f'  ⚠ attesi 16, trovati {len(gruppo)} — mappatura NON affidabile')
    for m, n in zip(gruppo, numeri):
        out[n] = {
            'x': round(m['x0']/W*100, 3), 'y': round(m['y0']/H*100, 3),
            'w': round((m['x1']-m['x0'])/W*100, 3), 'h': round((m['y1']-m['y0'])/H*100, 3),
        }

json.dump(out, open('scripts/design/dati/striscia-img.json','w'), indent=1)
print('\n// ritagli dei denti in % sulla striscia')
for n in FDI_SUP + FDI_INF:
    if n in out:
        d = out[n]
        print(f"  {n}: {{x:{d['x']}, y:{d['y']}, w:{d['w']}, h:{d['h']}}},")
