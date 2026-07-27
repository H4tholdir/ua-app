"""Genera il mockup del passo denti+colore usando le illustrazioni vere."""
import json, base64

sup = json.load(open('scripts/design/dati/sagome-sup.json'))
inf = json.load(open('scripts/design/dati/sagome-inf.json'))

def b64(p):
    return 'data:image/png;base64,' + base64.b64encode(open(p,'rb').read()).decode()

IMG = {'sup': b64('docs/design/assets/arcata-superiore.png'),
       'inf': b64('docs/design/assets/arcata-inferiore.png')}
DATI = {'sup': sup, 'inf': inf}

# caso d'esempio: denti su TUTTE E DUE le arcate, col colore diverso
SCELTI = {13:'A3', 12:'A3', 11:'A3', 21:'B2', 46:'A3'}

VITA_C = {'A1':'#F2E9D8','A2':'#EDE0C8','A3':'#E6D5B6','A3.5':'#DFCBA5','A4':'#D4BC91',
          'B1':'#F4EDDD','B2':'#EDE3C6','B3':'#E4D5AC','B4':'#DBC79A',
          'C1':'#E9E2D5','C2':'#DFD5C2','C3':'#D2C6AF','C4':'#C2B39B',
          'D2':'#EAE1D0','D3':'#E1D6C0','D4':'#D6C9B0'}
# VITA SYSTEM 3D-MASTER — 26 naturali + 3 sbiancanti = 29.
# Il codice si legge: luminosità (0-5) → tinta (L giallastro · M mediano · R rossastro) → croma.
VITA_3D = {
 '0M1':'#F8F4EA','0M2':'#F4EFE2','0M3':'#EFE9D9',
 '1M1':'#F2EBDC','1M2':'#EDE5D2',
 '2L1.5':'#EFE7D4','2L2.5':'#E9DFC7','2M1':'#EDE4D2','2M2':'#E7DCC6','2M3':'#E1D5BB','2R1.5':'#EDE3D1','2R2.5':'#E6DAC4',
 '3L1.5':'#E9DFCB','3L2.5':'#E2D6BC','3M1':'#E7DCC7','3M2':'#E0D3B8','3M3':'#D9CBAC','3R1.5':'#E7DBC6','3R2.5':'#DFD1B6',
 '4L1.5':'#E1D5BC','4L2.5':'#D9CBAC','4M1':'#DFD2B8','4M2':'#D7C8A7','4M3':'#CFBE99','4R1.5':'#DED0B6','4R2.5':'#D6C5A4',
 '5M1':'#D5C4A2','5M2':'#CCB994','5M3':'#C3AE87',
}
TUTTE = {**VITA_C, **VITA_3D}

FAM_C = [('A','rossastri-marroni',['A1','A2','A3','A3.5','A4']),
         ('B','rossastri-gialli',['B1','B2','B3','B4']),
         ('C','grigiastri',['C1','C2','C3','C4']),
         ('D','rossastri-grigi',['D2','D3','D4'])]
# la 3D-Master si organizza per LUMINOSITÀ, non per lettera
FAM_3D = [('0','i più chiari · sbiancanti',['0M1','0M2','0M3']),
          ('1','chiari',['1M1','1M2']),
          ('2','medio-chiari',['2L1.5','2L2.5','2M1','2M2','2M3','2R1.5','2R2.5']),
          ('3','medi',['3L1.5','3L2.5','3M1','3M2','3M3','3R1.5','3R2.5']),
          ('4','medio-scuri',['4L1.5','4L2.5','4M1','4M2','4M3','4R1.5','4R2.5']),
          ('5','i più scuri',['5M1','5M2','5M3'])]

def arcata_svg(verso, scelti, colori=False):
    d0 = DATI[verso]; W, H = d0['w'], d0['h']
    p = []
    for n, d in d0['denti'].items():
        n = int(n)
        on = n in scelti
        tinta = TUTTE.get(scelti.get(n), '') if (colori and on) else ''
        fill = tinta if tinta else ('var(--sel-velo)' if on else 'transparent')
        p.append(f'<polygon class="{"tinta" if tinta else ""}" points="{d["d"]}" fill="{fill}" stroke="{"var(--sel-bordo)" if on else "transparent"}" '
                 f'stroke-width="{1.4 if on else 0}" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>')
        if on:
            # pastiglia chiara sotto il numero: il dente è sempre bianco, quindi il
            # numero non può seguire il tema o in scuro sparisce (segnalato da Francesco)
            p.append(f'<g class="num"><rect x="{d["cx"]-3.6}" y="{d["cy"]-2.5}" width="7.2" height="5" rx="2.5"/>'
                     f'<text x="{d["cx"]}" y="{d["cy"]}">{n}</text></g>')
    return (f'<div class="arc" style="aspect-ratio:{W}/{H}"><img src="{IMG[verso]}" alt="">'
            f'<svg viewBox="0 0 100 100" preserveAspectRatio="none">{"".join(p)}</svg></div>')

def dente_ritagliato(n, dim=54):
    """Mostra UN SOLO dente, ritagliato dall'illustrazione grande.

    Tutto in PIXEL, non in percentuale: `background-position` in % si riferisce
    alla larghezza anche sull'asse verticale, e il conto non torna (verificato a
    schermo: uscivano ritagli di gengiva invece dei denti).
    """
    verso = 'sup' if n < 30 else 'inf'
    d0 = DATI[verso]; d = d0['denti'][str(n)]
    Wi, Hi = d0['w'], d0['h']
    xs = [float(v.split(',')[0]) for v in d['d'].split()]
    ys = [float(v.split(',')[1]) for v in d['d'].split()]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    # ingombro del dente in pixel dell'immagine originale
    dw, dh = (x1-x0)/100*Wi, (y1-y0)/100*Hi
    scala = (dim*0.86) / max(dw, dh)          # il dente riempie l'86% del riquadro
    L, A = Wi*scala, Hi*scala                  # immagine scalata
    cx_px, cy_px = (x0+x1)/2/100*L, (y0+y1)/2/100*A
    ox, oy = dim/2 - cx_px, dim/2 - cy_px
    return (f'<span class="rit" style="width:{dim}px;height:{dim}px;'
            f'background-image:url({IMG[verso]});'
            f'background-size:{L:.1f}px {A:.1f}px;'
            f'background-position:{ox:.1f}px {oy:.1f}px;'
            f'background-repeat:no-repeat"></span>')

def scala(famiglie, sel):
    return ''.join(
      f'<div class="fam"><div class="fam-top"><b>{k}</b><span>{nome}</span></div>'
      f'<div class="fam-riga" style="grid-template-columns:repeat({min(len(v),5)},1fr)">' +
      ''.join(f'<div class="vt{" on" if c==sel else ""}"><div class="cod">{c}</div>'
              f'<div class="past" style="background:{TUTTE[c]}"></div></div>' for c in v) +
      '</div></div>' for k, nome, v in famiglie)

# ── i denti scelti, in fila, con la loro provenienza ──
def fila_scelti(evidenzia=None):
    righe = []
    for verso, eti in (('sup','Sopra'), ('inf','Sotto')):
        gruppo = [n for n in SCELTI if (n < 30) == (verso=='sup')]
        if not gruppo: continue
        celle = ''.join(
          f'<button class="ds{" ev" if n==evidenzia else ""}">{dente_ritagliato(n)}'
          f'<span class="dn">{n}</span>'
          f'<span class="dc" style="--t:{TUTTE[SCELTI[n]]}">{SCELTI[n]}</span></button>'
          for n in sorted(gruppo))
        righe.append(f'<div class="gr"><div class="gl">{eti}</div><div class="gc">{celle}</div></div>')
    return ''.join(righe)

CSS = '''
*{box-sizing:border-box;margin:0;padding:0}button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
:root{--bg:#F4F0E7;--bg-deep:#ECE6D9;--card:#FFFEFA;--elv:#FFFEFA;--ink:#1D1913;--muted:#6E6457;
--faint:#7B6A59;--line:#EBE4D6;--red:#D90012;--red-dark:#A5000E;--green:#1B7F3B;--blue:#1D5FBF;
--sh-card:0 1px 0 rgba(255,255,255,.9) inset,0 2px 3px rgba(50,40,25,.05),0 16px 30px -18px rgba(50,40,25,.35);
--sh-press:0 4px 0 rgba(50,40,25,.12),0 14px 24px -14px rgba(50,40,25,.3),inset 0 1px 0 rgba(255,255,255,.9);
--grad:linear-gradient(180deg,#F2263A,var(--red) 55%,#B00010);
/* selezione: velo appena accennato + contorno netto. Il dente resta pulito. */
--sel-velo:rgba(29,25,19,.07);--sel-bordo:#1D1913;
/* il numero sta SEMPRE su smalto chiaro: non segue il tema, o in scuro sparisce */
--etic:#14110C;--etic-alone:rgba(255,255,255,.95)}
:root[data-tema="scuro"]{--bg:#171411;--bg-deep:#0F0D0A;--card:#211D18;--elv:#2B2620;--ink:#F2EEE7;
--muted:#A69B8C;--faint:#928778;--line:#342E26;--red:#FF3B44;--red-dark:#8F0910;--green:#34C468;--blue:#5B9BFF;
--sh-card:none;--sh-press:0 4px 0 rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);
--sel-velo:rgba(91,155,255,.20);--sel-bordo:#5B9BFF}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg-deep);color:var(--ink);
padding:28px 20px 60px;-webkit-font-smoothing:antialiased}
.wrap{max-width:1300px;margin:0 auto}
h1{font-size:31px;font-weight:800;letter-spacing:-.02em;margin-bottom:8px}
.sub{font-size:15.5px;font-weight:600;color:var(--muted);line-height:1.55;margin-bottom:24px;max-width:920px}
.riga{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
.col{width:390px}
.vnome{font-size:13px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin-bottom:8px}
.tel{width:390px;background:var(--bg);border-radius:28px;border:1px solid var(--line);
overflow:hidden;box-shadow:var(--sh-card);height:660px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;gap:14px;padding:10px 24px 0}
.tondo{width:44px;height:44px;border-radius:999px;background:var(--elv);box-shadow:var(--sh-press);
display:grid;place-items:center;font-size:21px;font-weight:800;flex:0 0 auto}
.who b{font-size:13px;font-weight:800;display:block}.who span{font-size:12.5px;font-weight:700;color:var(--faint)}
.dots{margin-left:auto;display:flex;gap:6px}.dot{width:7px;height:7px;border-radius:999px;background:var(--line)}
.dot.on{background:var(--ink);width:20px}
.dom{font-size:31px;font-weight:800;letter-spacing:-.02em;padding:10px 24px 2px}
.aiu{font-size:15.5px;font-weight:600;color:var(--muted);padding:0 24px 8px}
.selarc{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 24px 8px}
.selarc button{height:50px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);
font-size:15.5px;font-weight:700;box-shadow:var(--sh-card)}
.selarc button.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
/* ⬇ le arcate CENTRATE nello spazio che hanno */
.corpo{flex:1;min-height:0;padding:0 20px;display:flex;flex-direction:column;justify-content:center}
.corpo.scroll{display:block;overflow:auto;padding:0 24px}
.arc{position:relative;width:100%;max-height:100%}
.arc img{width:100%;display:block}
.arc svg{position:absolute;inset:0;width:100%;height:100%}
.arc polygon{cursor:pointer;transition:fill .12s}
.arc polygon.tinta{mix-blend-mode:multiply}
:root[data-tema="scuro"] .arc polygon.tinta{mix-blend-mode:screen;opacity:.55}
.arc .num rect{fill:#FFFDF7;stroke:#1D1913;stroke-width:.35px;vector-effect:non-scaling-stroke}
.arc .num text{font:800 3.4px 'Plus Jakarta Sans';fill:#14110C;text-anchor:middle;dominant-baseline:central}
.piede{padding:8px 24px 16px;background:var(--bg)}
.primario{width:100%;height:58px;border-radius:20px;background:var(--grad);color:#fff;
font-size:17px;font-weight:800;box-shadow:0 5px 0 var(--red-dark),0 14px 24px -14px rgba(50,40,25,.5)}
/* i denti scelti, ritagliati dall'illustrazione */
.gr{margin-bottom:8px}
.gl{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:4px}
.gc{display:flex;gap:6px;flex-wrap:wrap}
.ds{display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 7px 6px;border-radius:16px;
border:1.5px solid var(--line);background:var(--card);box-shadow:var(--sh-card)}
.ds.ev{border-color:var(--sel-bordo);border-width:2.5px}
.rit{display:block;overflow:hidden;border-radius:8px}
.dn{font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}
.dc{font-size:12.5px;font-weight:800;color:var(--muted);display:flex;align-items:center;gap:3px}
.dc::before{content:'';width:9px;height:9px;border-radius:999px;background:var(--t);border:1px solid rgba(0,0,0,.25)}
.cerca{display:flex;align-items:center;gap:9px;height:50px;border-radius:16px;border:1.5px solid var(--line);
background:var(--card);padding:0 14px;box-shadow:var(--sh-card);margin:8px 0 10px}
.cerca .lente{font-size:18px;color:var(--faint)}.cerca .ph{font-size:16px;font-weight:700;color:var(--faint)}
.tab{display:flex;gap:6px;margin-bottom:10px}
.tab button{flex:1;height:42px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);
font-size:13.5px;font-weight:800;box-shadow:var(--sh-card)}
.tab button.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.fam{margin-bottom:8px}
.fam-top{display:flex;align-items:baseline;gap:7px;margin-bottom:4px}
.fam-top b{font-size:18px}.fam-top span{font-size:12.5px;font-weight:700;color:var(--muted)}
.fam-riga{display:grid;gap:5px}
.vt{height:48px;border-radius:13px;border:1.5px solid var(--line);background:var(--card);
display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:var(--sh-card)}
.vt .cod{font-size:13px;font-weight:800}
.vt .past{width:20px;height:8px;border-radius:999px;border:1px solid rgba(0,0,0,.22)}
.vt.on{border-color:var(--sel-bordo);border-width:2.5px}
.nota{font-size:12.5px;font-weight:700;color:var(--green);margin-top:10px;line-height:1.45}
/* ===== tablet e desktop ===== */
.tel.tablet{width:768px;height:1024px}
.tel.desktop{width:1280px;height:800px}
.tablet .top,.desktop .top{padding:14px 28px 0}
.tablet .dom,.desktop .dom{padding:12px 28px 2px}
.tablet .aiu,.desktop .aiu{padding:0 28px 10px}
.tablet .piede,.desktop .piede{padding:10px 28px 18px}
/* flex-direction va RIDICHIARATA: .corpo è column, e senza questa riga le due
   arcate si impilano prendendo tutta la larghezza (verificato a schermo) */
.corpo.due{display:flex;flex-direction:row;gap:22px;align-items:center;padding:0 28px;justify-content:center;overflow:hidden}
.mezza{flex:1 1 0;min-width:0;max-width:100%;display:flex;flex-direction:column;justify-content:center}
.ml{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);
text-align:center;margin-bottom:6px}
.corpo.desk{display:flex;flex-direction:row;gap:26px;padding:0 28px;align-items:stretch;overflow:hidden}
.dsx{flex:0 0 600px;min-width:0;display:flex;gap:18px;align-items:center}
.ddx{flex:1;min-width:0;overflow:auto;padding-right:4px}
'''

def testata(passo, tot=5):
    d = ''.join(f'<div class="dot{" on" if i<passo else ""}"></div>' for i in range(tot))
    return (f'<div class="top"><div class="tondo">‹</div><div class="who">'
            f'<b>Dott. Esposito · PZ-0231</b><span>Corona zirconia</span></div>'
            f'<div class="dots">{d}</div></div>')

HTML = f'''<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Denti e colore — con le illustrazioni vere, rev.2 (27/07/2026)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<script>(function(){{var p=new URLSearchParams(location.search);
if(p.get('tema')==='scuro')document.documentElement.setAttribute('data-tema','scuro');}})();</script>
<style>{CSS}</style></head><body><div class="wrap">
<h1>Denti e colore — seconda passata</h1>
<p class="sub">Arcate centrate · i denti scelti ritagliati dall'illustrazione, così il colore si sceglie
anche quando il lavoro prende denti sopra <em>e</em> sotto · ricerca e seconda scala VITA rimesse ·
in tema scuro la selezione non è più grigia e il numero si legge.</p>
<div class="riga">

<div class="col"><div class="vnome">1 · quali denti — sopra</div>
<div class="tel">{testata(3)}
 <div class="dom">Quali denti?</div>
 <div class="selarc"><button class="on">Sopra</button><button>Sotto</button></div>
 <div class="corpo">{arcata_svg('sup', SCELTI)}</div>
 <div class="piede"><button class="primario">Avanti · 5 denti</button></div>
</div><div class="nota">✓ Arcata centrata nello spazio</div></div>

<div class="col"><div class="vnome">2 · quali denti — sotto</div>
<div class="tel">{testata(3)}
 <div class="dom">Quali denti?</div>
 <div class="selarc"><button>Sopra</button><button class="on">Sotto</button></div>
 <div class="corpo">{arcata_svg('inf', SCELTI)}</div>
 <div class="piede"><button class="primario">Avanti · 5 denti</button></div>
</div><div class="nota">✓ Il 46 scelto qui resta scelto</div></div>

<div class="col"><div class="vnome">3 · di che colore — denti di due arcate</div>
<div class="tel">{testata(4)}
 <div class="dom">Di che colore?</div>
 <div class="aiu">Tocca un dente per dargli un colore diverso.</div>
 <div class="corpo scroll">
   {fila_scelti(evidenzia=21)}
   <div class="cerca"><span class="lente">⌕</span><span class="ph">Cerca il colore…</span></div>
   <div class="tab"><button class="on">VITA classica</button><button>3D-Master</button></div>
   {scala(FAM_C, 'A3')}
 </div>
 <div class="piede"><button class="primario">Avanti</button></div>
</div><div class="nota">✓ Niente arcate: i denti scelti in fila, raggruppati per sopra e sotto</div></div>

<div class="col"><div class="vnome">4 · la seconda scala (3D-Master)</div>
<div class="tel">{testata(4)}
 <div class="dom">Di che colore?</div>
 <div class="aiu">Il codice dice: quanto è chiaro, che tinta, quanto è carico.</div>
 <div class="corpo scroll">
   {fila_scelti()}
   <div class="cerca"><span class="lente">⌕</span><span class="ph">Cerca il colore…</span></div>
   <div class="tab"><button>VITA classica</button><button class="on">3D-Master</button></div>
   {scala(FAM_3D, '2M2')}
 </div>
 <div class="piede"><button class="primario">Avanti</button></div>
</div><div class="nota">✓ 29 tinte, ordinate dalla più chiara alla più scura</div></div>

</div>

<h1 style="margin-top:46px">Tablet · 768 px — le due arcate insieme</h1>
<p class="sub">Qui lo spazio c'è: niente scelta sopra/sotto, si vedono tutte e due e si tocca dove serve.
I denti scelti restano in fondo, con il loro colore.</p>
<div class="tel tablet">{testata(3)}
  <div class="dom">Quali denti?</div>
  <div class="aiu">Tocca i denti su una delle due arcate.</div>
  <div class="corpo due">
    <div class="mezza"><div class="ml">Sopra</div>{arcata_svg('sup', SCELTI)}</div>
    <div class="mezza"><div class="ml">Sotto</div>{arcata_svg('inf', SCELTI)}</div>
  </div>
  <div style="padding:0 28px">{fila_scelti()}</div>
  <div class="piede"><button class="primario">Avanti · 5 denti</button></div>
</div>

<h1 style="margin-top:46px">Desktop · 1280 px — mappa e colore nella stessa schermata</h1>
<p class="sub">Con questa larghezza le due domande possono stare fianco a fianco senza pigiarsi:
a sinistra le arcate, a destra il colore. Nessuna delle due rinuncia a spazio.</p>
<div class="tel desktop">{testata(4)}
  <div class="dom">Quali denti e di che colore?</div>
  <div class="corpo desk">
    <div class="dsx">
      <div class="mezza"><div class="ml">Sopra</div>{arcata_svg('sup', SCELTI, colori=True)}</div>
      <div class="mezza"><div class="ml">Sotto</div>{arcata_svg('inf', SCELTI, colori=True)}</div>
    </div>
    <div class="ddx">
      {fila_scelti(evidenzia=21)}
      <div class="cerca"><span class="lente">⌕</span><span class="ph">Cerca il colore…</span></div>
      <div class="tab"><button class="on">VITA classica</button><button>3D-Master</button></div>
      {scala(FAM_C, 'A3')}
    </div>
  </div>
  <div class="piede"><button class="primario" style="max-width:420px;margin-left:auto">Avanti</button></div>
</div>

</div></body></html>'''

open('docs/design/mockups/2026-07-27-denti-illustrazioni-vere.html','w').write(HTML)
print(f'generato · {len(HTML)//1024} KB')
