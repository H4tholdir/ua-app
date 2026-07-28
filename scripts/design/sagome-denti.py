"""
Estrae la SAGOMA di ogni dente (non il riquadro) come poligono, da usare come
maschera di selezione sovrapposta all'illustrazione.

Uso:  python3 scripts/design/dati/sagome-denti.py sup|inf

Metodo: per ogni riga di pixel della macchia prendo il primo e l'ultimo pixel di
smalto; il contorno è l'andata sul bordo sinistro e il ritorno sul destro. I denti
sono forme convesse, quindi questo basta ed evita algoritmi di tracciamento più
fragili. Coordinate in percentuale → indipendenti dalla scala.
"""
import sys, json, math
from collections import deque
from PIL import Image
import numpy as np

verso = sys.argv[1] if len(sys.argv) > 1 else 'sup'
FILE = {'sup':'arcata-superiore','inf':'arcata-inferiore'}[verso]
FDI = ([18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28] if verso=='sup'
       else [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38])
PASSO = 5          # ogni quante righe campionare il contorno

img = Image.open(f'docs/design/assets/{FILE}.png').convert('RGBA')
a = np.array(img); H, W = a.shape[:2]
r,g,b,al = (a[:,:,i].astype(int) for i in range(4))
maxc = np.maximum(np.maximum(r,g),b); minc = np.minimum(np.minimum(r,g),b)
smalto = (al>120) & (maxc>205) & ((maxc-minc)<40)

visto = np.zeros_like(smalto, dtype=bool)
macchie = []
soglia = max(600, int(smalto.sum()/60))
for y0 in range(0,H,2):
    for x0 in range(0,W,2):
        if not smalto[y0,x0] or visto[y0,x0]: continue
        q=deque([(y0,x0)]); visto[y0,x0]=True; px=[]
        while q:
            y,x=q.popleft(); px.append((y,x))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=y+dy,x+dx
                if 0<=ny<H and 0<=nx<W and smalto[ny,nx] and not visto[ny,nx]:
                    visto[ny,nx]=True; q.append((ny,nx))
        if len(px) < soglia: continue
        macchie.append(px)

print(f'{FILE}: {len(macchie)} denti')
assert len(macchie)==16, f'attesi 16, trovati {len(macchie)} — fermo qui'

def contorno(px):
    righe = {}
    for y,x in px:
        if y in righe:
            lo,hi = righe[y]; righe[y] = (min(lo,x), max(hi,x))
        else:
            righe[y] = (x,x)
    ys = sorted(righe)
    # campiono, ma tengo sempre la prima e l'ultima riga
    campione = [ys[0]] + [y for y in ys[1:-1] if y % PASSO == 0] + [ys[-1]]
    sinistra = [(righe[y][0], y) for y in campione]
    destra   = [(righe[y][1], y) for y in reversed(campione)]
    return sinistra + destra

def centro(px):
    ys=[p[0] for p in px]; xs=[p[1] for p in px]
    return float(np.mean(xs)), float(np.mean(ys))

cxs = [centro(p) for p in macchie]
CX = sum(c[0] for c in cxs)/len(cxs); CY = sum(c[1] for c in cxs)/len(cxs)
def theta(i):
    dx,dy = cxs[i][0]-CX, cxs[i][1]-CY
    return math.atan2(dx, -dy if verso=='sup' else dy)

ordine = sorted(range(len(macchie)), key=theta)
out = {}
for pos, i in enumerate(ordine):
    px = macchie[i]
    pts = contorno(px)
    cx, cy = cxs[i]
    out[FDI[pos]] = {
        'd': ' '.join(f'{x/W*100:.2f},{y/H*100:.2f}' for x,y in pts),
        'cx': round(cx/W*100,2), 'cy': round(cy/H*100,2),
    }

json.dump({'w':W,'h':H,'denti':out}, open(f'scripts/design/dati/sagome-{verso}.json','w'))
punti = sum(len(v['d'].split()) for v in out.values())
print(f'  sagome estratte · {punti} punti in tutto ({punti//16} per dente)')
print(f'  salvato scripts/design/dati/sagome-{verso}.json')
