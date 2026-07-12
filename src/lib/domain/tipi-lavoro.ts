import type { TipoDispositivo, ClasseRischio } from '@/types/domain'

export type TipoLavoro = {
  id: string
  tile: { riga1: string; riga2?: string }
  aliases: string[]
  macro: TipoDispositivo
  classeRischio: ClasseRischio
  giorniFallback: number
}

// B4 (gate spec): UNICA fonte delle label macro — TabDati, portale, rischi,
// DdcTemplate importano da qui (Task 4). 10 valori = CHECK a DB (Task 3).
export const LABEL_MACRO: Record<TipoDispositivo, string> = {
  protesi_fissa: 'Protesi fissa',
  protesi_mobile: 'Protesi mobile',
  implantologia: 'Implantologia',
  cad_cam: 'CAD/CAM',
  scheletrato: 'Scheletrato',
  ortodonzia: 'Ortodonzia',
  provvisorio: 'Provvisorio',
  riparazione: 'Riparazione',
  bite_splint: 'Bite / splint',
  altro: 'Altro',
}
export const MACRO_SLUGS = Object.keys(LABEL_MACRO) as TipoDispositivo[]

// Tabella RATIFICATA (spec §3.2, verbale §2.1-A1): 38 voci, ordine canonico.
export const TIPI_LAVORO: TipoLavoro[] = [
  { id: 'corona_zirconia', tile: { riga1: 'Corona', riga2: 'zirconia' }, aliases: ['cappetta', 'monolitica', 'zirconio'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 5 },
  { id: 'corona_disilicato', tile: { riga1: 'Corona', riga2: 'disilicato' }, aliases: ['emax', 'e.max', 'litio', 'pressata'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'corona_metallo_ceramica', tile: { riga1: 'Corona', riga2: 'metallo-ceramica' }, aliases: ['vmk', 'ceramica su metallo'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 7 },
  { id: 'ponte_zirconia', tile: { riga1: 'Ponte', riga2: 'zirconia' }, aliases: ['ponte monolitico'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'faccetta', tile: { riga1: 'Faccetta' }, aliases: ['veneer', 'faccette'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'intarsio', tile: { riga1: 'Intarsio', riga2: 'onlay' }, aliases: ['inlay', 'overlay'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 4 },
  { id: 'perno_moncone', tile: { riga1: 'Perno', riga2: 'moncone' }, aliases: ['perno fuso'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 3 },
  { id: 'protesi_totale', tile: { riga1: 'Protesi', riga2: 'totale' }, aliases: ['dentiera', 'completa'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 8 },
  { id: 'totale_digitale', tile: { riga1: 'Totale', riga2: 'digitale' }, aliases: ['totale fresata', 'stampata'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 5 },
  { id: 'parziale_resina', tile: { riga1: 'Parziale', riga2: 'resina' }, aliases: ['pa.pa.', 'parziale'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'protesi_flessibile', tile: { riga1: 'Protesi', riga2: 'flessibile' }, aliases: ['nylon', 'valplast', 'morbida'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 7 },
  { id: 'duplicato_protesi', tile: { riga1: 'Duplicato', riga2: 'protesi' }, aliases: ['riserva', 'duplicazione'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 4 },
  { id: 'scheletrato', tile: { riga1: 'Scheletrato' }, aliases: ['parziale metallo', 'cromo'], macro: 'scheletrato', classeRischio: 'classe_iia', giorniFallback: 8 },
  { id: 'scheletrato_attacchi', tile: { riga1: 'Scheletrato', riga2: 'con attacchi' }, aliases: ['attacchi di precisione', 'fresaggi'], macro: 'scheletrato', classeRischio: 'classe_iia', giorniFallback: 10 },
  { id: 'scheletrato_slm', tile: { riga1: 'Scheletrato', riga2: 'laser (SLM)' }, aliases: ['laser melting', 'sinterizzato'], macro: 'scheletrato', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'scheletrato_peek', tile: { riga1: 'Scheletrato', riga2: 'PEEK' }, aliases: ['biohpp', 'metal-free'], macro: 'scheletrato', classeRischio: 'classe_iia', giorniFallback: 8 },
  { id: 'corona_impianto', tile: { riga1: 'Corona', riga2: 'su impianto' }, aliases: ['avvitata', 'cementata', 'ti-base'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'ponte_impianti', tile: { riga1: 'Ponte', riga2: 'su impianti' }, aliases: ['ponte avvitato'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 8 },
  { id: 'toronto', tile: { riga1: 'Toronto', riga2: 'full-arch' }, aliases: ['toronto bridge', 'arcata completa'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 12 },
  { id: 'barra_overdenture', tile: { riga1: 'Barra', riga2: 'overdenture' }, aliases: ['barra fresata'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 10 },
  { id: 'overdenture', tile: { riga1: 'Overdenture' }, aliases: ['su locator', 'su sfere'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 10 },
  { id: 'abutment', tile: { riga1: 'Abutment', riga2: 'personalizzato' }, aliases: ['moncone custom'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 4 },
  { id: 'provvisorio_impianto', tile: { riga1: 'Provvisorio', riga2: 'su impianto' }, aliases: ['carico immediato'], macro: 'implantologia', classeRischio: 'classe_i', giorniFallback: 3 },
  { id: 'placca_espansione', tile: { riga1: 'Placca', riga2: 'con vite' }, aliases: ['espansore mobile'], macro: 'ortodonzia', classeRischio: 'classe_i', giorniFallback: 7 },
  { id: 'apparecchio_funzionale', tile: { riga1: 'Apparecchio', riga2: 'funzionale' }, aliases: ['bionator', 'twin block', 'monoblocco'], macro: 'ortodonzia', classeRischio: 'classe_i', giorniFallback: 10 },
  { id: 'contenzione', tile: { riga1: 'Contenzione' }, aliases: ['hawley', 'retainer', 'splintaggio'], macro: 'ortodonzia', classeRischio: 'classe_i', giorniFallback: 4 },
  { id: 'allineatori', tile: { riga1: 'Allineatori' }, aliases: ['mascherine', 'aligner'], macro: 'ortodonzia', classeRischio: 'classe_i', giorniFallback: 14 },
  { id: 'bite_michigan', tile: { riga1: 'Bite', riga2: 'rigido' }, aliases: ['michigan', 'placca dura'], macro: 'bite_splint', classeRischio: 'classe_i', giorniFallback: 4 },
  { id: 'bite_morbido', tile: { riga1: 'Bite', riga2: 'morbido' }, aliases: ['resiliente', 'notturno'], macro: 'bite_splint', classeRischio: 'classe_i', giorniFallback: 3 },
  { id: 'paradenti', tile: { riga1: 'Paradenti', riga2: 'sport' }, aliases: ['sportivo', 'mouthguard'], macro: 'bite_splint', classeRischio: 'classe_i', giorniFallback: 4 },
  { id: 'anti_russamento', tile: { riga1: 'Anti-', riga2: 'russamento' }, aliases: ['mad', 'avanzamento mandibolare'], macro: 'bite_splint', classeRischio: 'classe_i', giorniFallback: 7 },
  { id: 'provvisorio_resina', tile: { riga1: 'Provvisorio', riga2: 'resina' }, aliases: ['pmma', 'provvisori'], macro: 'provvisorio', classeRischio: 'classe_i', giorniFallback: 2 },
  { id: 'provvisorio_cad', tile: { riga1: 'Provvisorio', riga2: 'CAD' }, aliases: ['fresato', 'stampato', 'shell'], macro: 'provvisorio', classeRischio: 'classe_i', giorniFallback: 2 },
  { id: 'mockup', tile: { riga1: 'Mock-up', riga2: 'estetico' }, aliases: ['prova estetica', 'wax-up'], macro: 'provvisorio', classeRischio: 'classe_i', giorniFallback: 4 },
  { id: 'dima_chirurgica', tile: { riga1: 'Dima', riga2: 'chirurgica' }, aliases: ['guida chirurgica', 'mascherina'], macro: 'cad_cam', classeRischio: 'classe_i', giorniFallback: 5 },
  { id: 'modello_3d', tile: { riga1: 'Modello', riga2: '3D' }, aliases: ['modello stampato'], macro: 'cad_cam', classeRischio: 'classe_i', giorniFallback: 2 },
  { id: 'riparazione', tile: { riga1: 'Riparazione' }, aliases: ['rottura', 'frattura', 'aggiunta gancio', 'aggiunta elemento', 'saldatura'], macro: 'riparazione', classeRischio: 'classe_iia', giorniFallback: 1 },
  { id: 'ribasatura', tile: { riga1: 'Ribasatura' }, aliases: ['ribaso', 'rebase'], macro: 'riparazione', classeRischio: 'classe_iia', giorniFallback: 2 },
]

export const CANONICI_DAY1 = ['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina']

export function labelTipo(t: TipoLavoro): string {
  return t.tile.riga2 ? `${t.tile.riga1} ${t.tile.riga2}` : t.tile.riga1
}

export function normalizza(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function trovaTipo(id: string): TipoLavoro | undefined {
  return TIPI_LAVORO.find(t => t.id === id)
}

export function cercaTipiLavoro(query: string): TipoLavoro[] {
  const q = normalizza(query.trim())
  if (!q) return TIPI_LAVORO
  return TIPI_LAVORO.filter(t => {
    const pagliaio = [labelTipo(t), ...t.aliases, LABEL_MACRO[t.macro]].map(normalizza).join(' ')
    return pagliaio.includes(q)
  })
}
