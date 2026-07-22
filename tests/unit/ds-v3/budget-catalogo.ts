// Budget di classe per i file che renderizzano l'INTERA pagina /ds-v3-catalogo
// (flake sotto carico — diagnosi .superpowers/sdd/diagnosi-flake-vitest.md §7.2 e
// intervento di classe 22/07 notte): il PRIMO render del catalogo in un file costa
// ~0.5s di CPU sincrona da solo; sotto contesa multi-worker del pool (suite
// parallele sui core) il tempo di parete sfora i 5s di default. È lavoro legittimo,
// non un'animazione da rendere deterministica (quelle sono già spente suite-wide in
// tests/setup.ts): si calibra il budget — stesso pattern e stesso valore di
// avviso-caricamento-vuoto.test.tsx, che il proprio 15s lo dichiara in loco.
// Va importato (import side-effect) da OGNI file che fa render(<CatalogoPage />).
import { vi } from 'vitest'

vi.setConfig({ testTimeout: 15_000 })
