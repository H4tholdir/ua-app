// FONTE DI VERITÀ DS v3 «Una cosa alla volta» — spec 2026-07-07 §3-4.
// REGOLA ZERO: mai colori/shadow/raggi inline. Le pagine v3 stanno sotto [data-ds="v3"].

export const luce = {
  bg: '#F4F0E7', bgDeep: '#ECE6D9', card: '#FFFEFA',
  ink: '#1D1913', muted: '#6E6457', faint: '#7B6A59', line: '#EBE4D6', // faint: rev. 3.1 — era #A69B8C (WCAG fail 2.40 su --bg)
  red: '#D90012', redDark: '#A5000E',
  amber: '#9A5C00', green: '#1B7F3B', blue: '#1D5FBF',
  redTint: '#FBEDEC', amberTint: '#F8F0E1', blueTint: '#EBF1FA', greenTint: '#EAF4EC',
  purple: '#7C3F9C', purpleTint: '#F3EAF7', // rev. 3.1 — famiglia «Da rifare / In prova»
} as const

export const notte = {
  bg: '#171411', sfc: '#211D18', elv: '#2B2620',
  ink: '#F2EEE7', muted: '#A69B8C', faint: '#928778', line: '#342E26', // faint: rev. 3.1 — era #6E6457 (WCAG fail)
  red: '#FF3B44', redDark: '#8F0910',
  amber: '#E8A13D', green: '#34C468', blue: '#5B9BFF',
  purple: '#B98BE8', purpleTint: 'rgba(185,139,232,.14)', // rev. 3.1
} as const

export const tipografia = {
  famiglia: "'Plus Jakarta Sans', system-ui, sans-serif",
  // px — scala chiusa (§4.1). Lettura mai sotto body (17).
  size: { display: 52, question: 35, largeTitle: 31, title: 27, heading: 21, body: 17, callout: 15.5, label: 13, caption: 12.5 },
  weight: { regular: 400, semibold: 600, bold: 700, extrabold: 800 },
  tracking: { display: '-0.03em', titoli: '-0.02em', label: '0.16em', caption: '0.14em' },
} as const

// Griglia 8px (§4.2) — valori ammessi
export const spazio = { xs: 4, s: 8, sm: 12, m: 16, ml: 20, l: 24, xl: 32, xxl: 44 } as const

export const raggio = { card: 24, sheet: 28, tile: 22, riga: 18, tasto: 20, pill: 999 } as const

export const materia = {
  shCard: '0 1px 0 rgba(255,255,255,.9) inset, 0 2px 3px rgba(50,40,25,.05), 0 16px 30px -18px rgba(50,40,25,.35)',
  shPress: '0 4px 0 rgba(50,40,25,.12), 0 14px 24px -14px rgba(50,40,25,.3), inset 0 1px 0 rgba(255,255,255,.9)',
  granaOpacityLight: 0.05,
  granaOpacityDark: 0.06,
  corsaTastoPx: 5, // §5.1 — corsa fisica del tasto primario
  scrim: 'rgba(29,25,19,.35)', // §5.16/§5.17 — scrim dietro Sheet e DialogConferma
} as const

// Valori-legge non tokenizzati come variabile CSS (§5.1/§5.4/§5.11-12/§5.14) —
// vivono solo qui: unica eccezione ammessa al check pre-commit "niente hex fuori da tokens.ts".
export const gradiente = {
  tastoPrimario: 'linear-gradient(180deg, #F2263A, var(--red) 55%, #B00010)',   // §5.1
  pillFase: 'linear-gradient(180deg, #1F8544, #166B39)', // §5.4 rev. 3.1 — stop pinnati, mai var(--green) come faccia
  corsaPillFase: '#14602C',                                                      // §5.4
  whatsapp: 'linear-gradient(180deg, #208650, #17663A)', // §3.3.4 rev. 3.1 — consumato dall'Ondata 4b
  corsaWhatsApp: '#0E4A28',
  dashedGuida: '#CBC1B0',                                                        // §5.11/5.12
} as const

// §5.2 rev 2 (09/07 — variante B «il punto rosso» scelta da Francesco). FONTE DI
// VERITÀ visiva: mockup docs/design/mockups/2026-07-09-tastopiu-v3-due-varianti.html,
// classe `.tpB` (+ `.notte .tpB`) — i valori qui sotto sono copiati VERBATIM da lì.
// Materia del pulsante fisico a membrana: ghiera Ø92 tono-su-tono che affiora dalla
// carta → solco (anello d'ombra, inset 11) → cappello bombato (inset 14) che affonda.
// Il glifo + usa var(--red) / pressed var(--red-dark) direttamente nel componente;
// l'unica eccezione è il pressed dark (vedi `piuPressedNotte`).
export const tastoPiu = {
  // — light (la carta) —
  ghiera: 'linear-gradient(170deg, #F9F5EC 0%, #EFE9DC 60%, #E2DACA 100%)',
  ghieraOmbra: '0 16px 28px rgba(52, 42, 26, .20), 0 5px 10px rgba(52, 42, 26, .12), inset 0 1.5px 1px rgba(255, 255, 255, .9), inset 0 -2px 3px rgba(52, 42, 26, .08)',
  // pressed: la ghiera si assesta appena — ombra ambiente ridotta, smusso invariato
  ghieraOmbraPressed: '0 10px 20px rgba(52, 42, 26, .18), 0 4px 8px rgba(52, 42, 26, .11), inset 0 1.5px 1px rgba(255, 255, 255, .9), inset 0 -2px 3px rgba(52, 42, 26, .08)',
  solco: 'linear-gradient(180deg, #DAD2C2, #ECE6DA)',
  solcoOmbra: 'inset 0 1.5px 2.5px rgba(52, 42, 26, .24), inset 0 -1px 1px rgba(255, 255, 255, .5)',
  cappello: 'radial-gradient(circle at 50% 28%, #FFFFFF 0%, #FEFCF8 40%, #F5F0E6 75%, #EBE4D4 100%)',
  cappelloOmbra: '0 3px 6px rgba(52, 42, 26, .18), inset 0 2px 2px rgba(255, 255, 255, 1), inset 0 -4px 8px rgba(52, 42, 26, .06)',
  cappelloPressed: 'radial-gradient(circle at 50% 34%, #FBF8F1 0%, #F5F0E5 50%, #ECE5D5 100%)',
  cappelloOmbraPressed: 'inset 0 3px 7px rgba(52, 42, 26, .15), inset 0 -1px 1px rgba(255, 255, 255, .5)',
  piuOmbra: '0 1px 0 rgba(255,255,255,.7)', // il + pare inciso nella carta (solo light)
  // — dark (flat, superfici che affiorano; unica ombra esterna: l'alone della ghiera) —
  ghieraNotte: 'linear-gradient(170deg, #2B261E 0%, #241F17 60%, #1D1912 100%)',
  ghieraOmbraNotte: 'inset 0 1px 0 rgba(255, 255, 255, .06), 0 10px 22px rgba(0, 0, 0, .4)',
  solcoNotte: 'linear-gradient(180deg, #131009, #1B1710)',
  solcoOmbraNotte: 'inset 0 1.5px 3px rgba(0, 0, 0, .55), inset 0 -1px 1px rgba(255, 255, 255, .04)',
  cappelloNotte: 'radial-gradient(circle at 50% 28%, #37312A 0%, #2E2921 55%, #252017 100%)',
  cappelloOmbraNotte: '0 2px 5px rgba(0, 0, 0, .4), inset 0 1.5px 1px rgba(255, 255, 255, .08), inset 0 -3px 6px rgba(0, 0, 0, .3)',
  cappelloOmbraPressedNotte: 'inset 0 3px 7px rgba(0, 0, 0, .5)',
  // Pressed dark del glifo: il mockup (`.notte .tpB:active .piu`) dice #E8323B, che
  // NON è var(--red-dark) dark (#8F0910) — valore-legge suo proprio, vive solo qui.
  piuPressedNotte: '#E8323B',
  // Le transizioni CSS del mockup (box-shadow al pressed) vivono in
  // v3/motion.ts (`cssEase.tastoPiuGhiera`/`cssEase.tastoPiuCappello`):
  // tokens.ts ospita SOLO colori/gradienti/ombre (constraint 6 — la deroga
  // `gradiente`/`tastoPiu` al check 4a copre i colori, non i tempi).
} as const

// §5.15 rev 2 (09/07 — variante A «la pill di carta» scelta da Francesco). FONTE DI
// VERITÀ visiva: mockup docs/design/mockups/2026-07-09-pillvoce-v2-due-varianti.html,
// classe `.pvA` (+ `.notte .pvA`, `:active`) — i valori qui sotto sono copiati VERBATIM
// da lì. Materia: la stessa "carta che affiora" dei tasti; il cerchioMic Ø46 usa il
// gradiente del TastoPrimario (`gradiente.tastoPrimario`, riuso diretto — combacia
// esattamente coi valori light del mockup) col suo proprio dark verbatim, perché in
// notte il mockup diverge dal TastoPrimario (che non ha una variante notte propria).
export const pillVoce = {
  // — light (la pill di carta) —
  faccia: 'linear-gradient(180deg, #FFFEFA, #F5F0E6)',
  facciaOmbra: '0 6px 14px rgba(52,42,26,.16), 0 2px 4px rgba(52,42,26,.10), inset 0 1.5px 1px rgba(255,255,255,.95), inset 0 -2px 3px rgba(52,42,26,.07)',
  facciaOmbraPressed: '0 2px 6px rgba(52,42,26,.14), inset 0 2px 5px rgba(52,42,26,.10)',
  cerchioMicOmbra: '0 2px 5px rgba(176,0,16,.35), inset 0 1.5px 1px rgba(255,255,255,.35)',
  cerchioMicOmbraPressed: '0 1px 2px rgba(176,0,16,.3), inset 0 2px 4px rgba(120,0,10,.4)',
  // — dark —
  facciaNotte: 'linear-gradient(180deg, #2B2620, #211D18)',
  facciaOmbraNotte: 'inset 0 1px 0 rgba(255,255,255,.07), 0 8px 18px rgba(0,0,0,.4)',
  facciaOmbraPressedNotte: 'inset 0 2px 6px rgba(0,0,0,.5)',
  // Verbatim dal mockup dark — NON `gradiente.tastoPrimario` (che in notte darebbe
  // #F2263A/var(--red)/#B00010: valori diversi da qui, perché il TastoPrimario non
  // ha mai avuto una faccia notte propria — §5.1 non la specifica).
  cerchioMicNotte: 'linear-gradient(180deg, #FF4C55, #FF3B44 55%, #C41822)',
  cerchioMicOmbraNotte: 'inset 0 1.5px 1px rgba(255,255,255,.25)',
} as const

export const avatarPalette = ['#1D5FBF', '#7A4DB8', '#0E8A6B', '#9A5C00', '#C24E7A', '#8A8580'] as const // §5.14 blue,purple,teal,amber,rose,slate

// Valore-legge: testo bianco sopra le facce gradiente (§5.1 TastoPrimario, §5.4 PillFase).
// Vive qui (non var(--…)) perché è bianco assoluto indipendente dal tema, non un token
// luce/notte — stessa eccezione ammessa di `gradiente` al check pre-commit 4a.
export const testoSuFaccia = '#FFFFFF' as const

export type TokenColoreLuce = keyof typeof luce
export function varV3(nome: string): string {
  // kebab-case della chiave: bgDeep → --bg-deep
  return `var(--${nome.replace(/[A-Z]/g, m => '-' + m.toLowerCase())})`
}
