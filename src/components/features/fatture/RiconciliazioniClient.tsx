'use client'

// Pagina «Da sistemare» (/fatture/riconciliazioni, Task 16) — variante A
// APPROVATA con copy da banco (docs/design/decisions/2026-07-16-riconciliazioni.md,
// mockup docs/design/mockups/2026-07-16-riconciliazioni.html). 5 gruppi,
// sezioni collassabili, contatore-first. Superficie DS v2.3 (token globali
// --sfc/--t1/--primary… — NON design-system/v3, NON components/ds): stessa
// lingua visiva di NotaCreditoButton.tsx/InviaPecButton.tsx, gli altri
// componenti già approvati su questa stessa pagina (/fatture/[id]).
//
// Ruoli (mockup «Chi può fare cosa»): titolare+front_desk possono Carica
// ricevuta PEC / Conferma ricevuta; SOLO titolare può Sblocca e reinvia /
// Controlla e conferma (firma non verificabile) / Riprova lo storno /
// Ho verificato sul portale — la UI nasconde le CTA riservate per
// front_desk. Lato server la difesa in profondità NON è uniforme:
//   - override («Ho verificato sul portale») e sblocca-claim hanno allowlist
//     solo-titolare (RUOLI_OVERRIDE_SDI, RUOLI_SBLOCCA_CLAIM);
//   - la route applica (/api/pec/ricevute/[id]/applica) ammette anche
//     front_desk (RUOLI_INVIO_PEC) — per «Controlla e conferma» la vera
//     protezione server-side non è il ruolo ma la RIVERIFICA FIRMA
//     fail-closed della route: un evento in quarantena resta 409 finché la
//     firma non risulta 'valida', chiunque prema il bottone.
//
// NOTA IMPORTANTE (escalation aperta — vedi anche OverrideStatoSheet.tsx):
// il CTA «Riprova lo storno» del gruppo «Note di credito rifiutate» NON
// chiama l'endpoint di override. fetchPendenzeRiconciliazione (Task 14)
// espone SOLO l'id della fattura ORIGINALE + il numero del TD04 (stringa),
// non l'id del TD04 né il suo stato_sdi corrente — e il TD04 in questo
// gruppo è per costruzione GIÀ 'rifiutata' (query .eq('stato_sdi','rifiutata')),
// quindi un override ripetuto sarebbe bloccato dalla monotonia rank lato
// route (RANK_STATO_SDI['rifiutata'] <= stato corrente). Il trigger DB
// annulla_effetti_storno_td04 (migration 20260716091000) ha GIÀ applicato il
// contro-movimento di credito e resettato stornata_at nel momento stesso in
// cui il TD04 è diventato 'rifiutata' (trigger Postgres, stessa transazione)
// — quindi la fattura originale è GIÀ ri-stornabile. «Riprova lo storno»
// mostra quindi un riepilogo dei fatti (RiprovaStornoSheet, sotto) e sulla
// conferma naviga alla scheda fattura, dove NotaCreditoButton (già
// approvato) gestisce la nuova nota di credito. Da confermare con
// Francesco/orchestrator se in futuro serve un endpoint dedicato.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { UploadRicevutaSheet } from './UploadRicevutaSheet'
import { SbloccaClaimSheet } from './SbloccaClaimSheet'
import { OverrideStatoSheet } from './OverrideStatoSheet'

const FONT = 'var(--font-dm-sans, "DM Sans", system-ui, sans-serif)'
const BORDER = '1px solid var(--elv)'

// ─── Tipi (stessa shape di PendenzeRiconciliazione, Task 14 — duplicati qui
// invece di importati: quel modulo è 'server-only' e questo è un client
// component; import type verrebbe eraso a compile-time ma la duplicazione
// evita ogni ambiguità col bundler). ─────────────────────────────────────
export interface PendenzeRiconciliazioneClient {
  claimOrfani: Array<{ id: string; numero: string; smtp_inviata_at: string }>
  smtpStagnanti: Array<{ id: string; numero: string; smtp_inviata_at: string }>
  stornateConTd04Rifiutato: Array<{ id: string; numero: string; td04_numero: string }>
  saldiNegativi: Array<{ cliente_id: string; cliente_nome: string; saldo: number }>
  eventiParcheggiati: Array<{
    id: string
    nome_file_ricevuta: string | null
    esito_verifica_firma: string | null
    esito_committente: string | null
    created_at: string
  }>
}

interface Props {
  pendenze: PendenzeRiconciliazioneClient
  ruolo: string
}

const RUOLI_TITOLARE_ONLY = ['titolare']

function fmtEur(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function fmtDataParlata(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

function giorniFa(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

function fmtGiorniFa(iso: string): string {
  const n = giorniFa(iso)
  if (n === 0) return 'oggi'
  if (n === 1) return '1 giorno fa'
  return `${n} giorni fa`
}

export function RiconciliazioniClient({ pendenze, ruolo }: Props) {
  const router = useRouter()
  const isTitolare = RUOLI_TITOLARE_ONLY.includes(ruolo)

  const totale =
    pendenze.claimOrfani.length +
    pendenze.smtpStagnanti.length +
    pendenze.stornateConTd04Rifiutato.length +
    pendenze.saldiNegativi.length +
    pendenze.eventiParcheggiati.length

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Sheet state (una sola alla volta) ──────────────────────────────────
  const [uploadTarget, setUploadTarget] = useState<{ id: string; numero: string } | null>(null)
  const [sbloccaTarget, setSbloccaTarget] = useState<{ id: string; numero: string } | null>(null)
  const [stornoTarget, setStornoTarget] = useState<{ id: string; numero: string; td04Numero: string } | null>(null)
  const [ricevutaTarget, setRicevutaTarget] = useState<PendenzeRiconciliazioneClient['eventiParcheggiati'][number] | null>(null)
  const [portaleTarget, setPortaleTarget] = useState<{ id: string; numero: string; smtp_inviata_at: string } | null>(null)

  function refresh() {
    router.refresh()
  }

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <TotalBadge totale={totale} />

      {totale === 0 ? (
        <EmptyStateTuttoAPosto />
      ) : (
        <>
          {pendenze.stornateConTd04Rifiutato.length > 0 && (
            <GroupCard
              groupKey="td04"
              icon="⊘"
              iconTint="var(--c-red)"
              iconInk="var(--red-ink, var(--primary))"
              label="Note di credito rifiutate dallo Stato"
              sub="La fattura torna valida, il conto va sistemato"
              count={pendenze.stornateConTd04Rifiutato.length}
              open={!!openGroups.td04}
              onToggle={() => toggleGroup('td04')}
              help="Hai stornato una fattura, ma SdI (il sistema dell'Agenzia delle Entrate) ha rifiutato la nota di credito: lo storno non vale e il conto del cliente va sistemato."
            >
              {pendenze.stornateConTd04Rifiutato.map((item) => (
                <GroupRow
                  key={item.id}
                  title={`Fattura ${item.numero}`}
                  sub="La nota di credito è stata rifiutata: lo storno non è valido"
                  detail={`Nota di credito ${item.td04_numero} (TD04)`}
                >
                  {isTitolare && (
                    <RowCta
                      danger
                      soloTu
                      onClick={() => setStornoTarget({ id: item.id, numero: item.numero, td04Numero: item.td04_numero })}
                    >
                      Riprova lo storno
                    </RowCta>
                  )}
                </GroupRow>
              ))}
            </GroupCard>
          )}

          {pendenze.saldiNegativi.length > 0 && (
            <GroupCard
              groupKey="saldi"
              icon="€"
              iconTint="var(--purple)"
              iconInk="var(--purple)"
              label="Conti clienti da sistemare"
              sub="Clienti con il conto in negativo"
              count={pendenze.saldiNegativi.length}
              open={!!openGroups.saldi}
              onToggle={() => toggleGroup('saldi')}
              help="Questi clienti hanno il conto in negativo: di solito succede quando una nota di credito viene rifiutata dopo che il credito era già stato usato."
            >
              {pendenze.saldiNegativi.map((item) => (
                <GroupRow key={item.cliente_id} title={item.cliente_nome} sub={`Conto a ${fmtEur(item.saldo)}`}>
                  <RowCta href={`/scadenzario/${item.cliente_id}`}>Vedi il conto</RowCta>
                </GroupRow>
              ))}
            </GroupCard>
          )}

          {pendenze.eventiParcheggiati.length > 0 && (
            <GroupCard
              groupKey="park"
              icon="📥"
              iconTint="var(--c-orange)"
              iconInk="var(--c-orange)"
              label="Ricevute da controllare a mano"
              sub="UÀ non è riuscita ad abbinarle o verificarle"
              count={pendenze.eventiParcheggiati.length}
              open={!!openGroups.park}
              onToggle={() => toggleGroup('park')}
              help="UÀ non è riuscita ad abbinare queste ricevute a una fattura, o a verificarne la firma: guardale e conferma tu."
            >
              {pendenze.eventiParcheggiati.map((item) => {
                const firmaFallita = item.esito_verifica_firma === 'fallita'
                const ec02 = item.esito_committente === 'EC02'
                const titolo = `Ricevuta di ${fmtDataParlata(item.created_at)}`
                return (
                  <GroupRow
                    key={item.id}
                    title={titolo}
                    sub={
                      firmaFallita ? (
                        <span role="alert" style={{ color: 'var(--c-orange)', fontWeight: 700 }}>
                          ⚠ Verifica firma non disponibile — controllo manuale obbligatorio
                        </span>
                      ) : ec02 ? (
                        'Lo Stato non è riuscito a consegnarla al cliente'
                      ) : (
                        'Nessuna fattura abbinata automaticamente'
                      )
                    }
                    detail={item.nome_file_ricevuta ? `File: ${item.nome_file_ricevuta}` : undefined}
                  >
                    {firmaFallita && isTitolare && (
                      <RowCta danger soloTu onClick={() => setRicevutaTarget(item)}>
                        Controlla e conferma
                      </RowCta>
                    )}
                    {!firmaFallita && ec02 && <RowCta onClick={() => setRicevutaTarget(item)}>Conferma ricevuta</RowCta>}
                  </GroupRow>
                )
              })}
            </GroupCard>
          )}

          {pendenze.claimOrfani.length > 0 && (
            <GroupCard
              groupKey="orfani"
              icon="✉"
              iconTint="var(--c-blue)"
              iconInk="var(--c-blue)"
              label="Segnate come inviate, ma l'invio non risulta"
              sub="Manca la conferma d'invio"
              count={pendenze.claimOrfani.length}
              open={!!openGroups.orfani}
              onToggle={() => toggleGroup('orfani')}
              help="UÀ ha provato a inviare queste fatture ma non ha la conferma che siano partite. Controlla la casella PEC del laboratorio: se non sono partite, sblocca e reinvia."
            >
              {pendenze.claimOrfani.map((item) => (
                <GroupRow
                  key={item.id}
                  title={`Fattura ${item.numero}`}
                  sub={`Tentativo d'invio del ${fmtDataParlata(item.smtp_inviata_at)} · ferma da ${fmtGiorniFa(item.smtp_inviata_at)}`}
                >
                  {isTitolare && (
                    <RowCta danger soloTu onClick={() => setSbloccaTarget({ id: item.id, numero: item.numero })}>
                      Sblocca e reinvia
                    </RowCta>
                  )}
                </GroupRow>
              ))}
            </GroupCard>
          )}

          {pendenze.smtpStagnanti.length > 0 && (
            <GroupCard
              groupKey="stag"
              icon="⏱"
              iconTint="var(--c-amber)"
              iconInk="var(--c-amber-ink)"
              label="In attesa di risposta da troppo tempo"
              sub="Inviate da più di 7 giorni, nessuna risposta"
              count={pendenze.smtpStagnanti.length}
              open={!!openGroups.stag}
              onToggle={() => toggleGroup('stag')}
              help="Inviate da più di 7 giorni e SdI (il sistema dell'Agenzia delle Entrate) non ha ancora risposto. Se la ricevuta ti è arrivata via PEC, caricala qui. Se invece hai controllato l'esito sul portale dell'Agenzia delle Entrate, puoi segnarlo tu (solo titolare)."
            >
              {pendenze.smtpStagnanti.map((item) => (
                <GroupRow
                  key={item.id}
                  title={`Fattura ${item.numero}`}
                  sub={`Inviata il ${fmtDataParlata(item.smtp_inviata_at)} · ${fmtGiorniFa(item.smtp_inviata_at)}, nessuna risposta`}
                >
                  <RowCta onClick={() => setUploadTarget({ id: item.id, numero: item.numero })}>Carica ricevuta PEC</RowCta>
                  {isTitolare && (
                    <RowCta
                      soloTu
                      onClick={() => setPortaleTarget({ id: item.id, numero: item.numero, smtp_inviata_at: item.smtp_inviata_at })}
                    >
                      Ho verificato sul portale
                    </RowCta>
                  )}
                </GroupRow>
              ))}
            </GroupCard>
          )}
        </>
      )}

      {uploadTarget && (
        <UploadRicevutaSheet
          open
          numero={uploadTarget.numero}
          onClose={() => setUploadTarget(null)}
          onSuccess={() => {
            setUploadTarget(null)
            refresh()
          }}
        />
      )}

      {sbloccaTarget && (
        <SbloccaClaimSheet
          open
          fatturaId={sbloccaTarget.id}
          numero={sbloccaTarget.numero}
          onClose={() => setSbloccaTarget(null)}
          onSuccess={() => {
            setSbloccaTarget(null)
            refresh()
          }}
        />
      )}

      {stornoTarget && (
        <RiprovaStornoSheet
          fatturaId={stornoTarget.id}
          numero={stornoTarget.numero}
          td04Numero={stornoTarget.td04Numero}
          onClose={() => setStornoTarget(null)}
          onConfirm={() => {
            setStornoTarget(null)
            router.push(`/fatture/${stornoTarget.id}`)
          }}
        />
      )}

      {ricevutaTarget && (
        <ConfermaRicevutaSheet
          ricevuta={ricevutaTarget}
          onClose={() => setRicevutaTarget(null)}
          onSuccess={() => {
            setRicevutaTarget(null)
            refresh()
          }}
        />
      )}

      {portaleTarget && (
        // Modalità «Ho verificato sul portale» (decisione Francesco 16/07,
        // opzione 1): nessun nuovoStato fissato → il titolare sceglie l'esito
        // tra le 3 opzioni allowlist nel foglio. stato_sdi_atteso è SEMPRE
        // 'smtp_inviata' — lo stato che questa riga sta mostrando (il gruppo
        // stagnanti è per costruzione .eq('stato_sdi','smtp_inviata')): se nel
        // frattempo è arrivata una ricevuta, la route risponde 409 (anti-stale).
        <OverrideStatoSheet
          open
          fatturaId={portaleTarget.id}
          numero={portaleTarget.numero}
          statoAtteso="smtp_inviata"
          sottotitolo={`Fattura ${portaleTarget.numero} · inviata ${fmtGiorniFa(portaleTarget.smtp_inviata_at)}, nessuna risposta`}
          onClose={() => setPortaleTarget(null)}
          onSuccess={() => {
            setPortaleTarget(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

// ─── Totale ────────────────────────────────────────────────────────────
function TotalBadge({ totale }: { totale: number }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--sfc)',
        borderRadius: 16, padding: '14px 16px', margin: '16px 0 14px', boxShadow: 'var(--sh-b)',
      }}
    >
      <span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t2)' }}>Cose da sistemare</span>
      <span style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>
        {totale}
      </span>
    </div>
  )
}

function EmptyStateTuttoAPosto() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '46px 24px 40px', gap: 10 }}>
      <div
        aria-hidden="true"
        style={{
          width: 60, height: 60, borderRadius: '50%', background: 'color-mix(in srgb, var(--c-green) 16%, transparent)',
          color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}
      >
        ✓
      </div>
      <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Tutto a posto ✓</div>
      <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t2)', maxWidth: 260, lineHeight: 1.5, margin: 0 }}>
        Non c&apos;è niente da sistemare. Se qualcosa avrà bisogno di te, apparirà qui.
      </p>
    </div>
  )
}

// ─── Gruppo collassabile ───────────────────────────────────────────────
function GroupCard({
  groupKey, icon, iconTint, iconInk, label, sub, count, open, onToggle, help, children,
}: {
  groupKey: string
  icon: string
  iconTint: string
  iconInk: string
  label: string
  sub: string
  count: number
  open: boolean
  onToggle: () => void
  help: string
  children: React.ReactNode
}) {
  const reducedMotion = useReducedMotion()
  return (
    <div data-group={groupKey} style={{ background: 'var(--sfc)', borderRadius: 16, marginBottom: 10, boxShadow: 'var(--sh-b)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', minHeight: 44, width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, flexShrink: 0, background: `color-mix(in srgb, ${iconTint} 18%, transparent)`, color: iconInk,
          }}
        >
          {icon}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.3 }}>{label}</span>
          <span style={{ display: 'block', fontFamily: FONT, fontSize: 10.5, color: 'var(--t3)', marginTop: 1 }}>{sub}</span>
        </span>
        <span
          style={{
            marginLeft: 'auto', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--t2)', background: 'var(--elv)',
            border: BORDER, padding: '2px 10px', borderRadius: 100, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}
        >
          {count}
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: 11, color: 'var(--t3)', marginLeft: 2, flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: reducedMotion ? 'none' : `transform ${motionTokens.duration.fast}s`,
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div style={{ borderTop: BORDER }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', background: 'var(--elv)', fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.5, borderBottom: BORDER, fontFamily: FONT }}>
            <span
              aria-hidden="true"
              style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--t3)', color: 'var(--t3)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}
            >
              ?
            </span>
            <span>{help}</span>
          </div>
          {children}
        </div>
      )}
    </div>
  )
}

function GroupRow({ title, sub, detail, children }: { title: string; sub: React.ReactNode; detail?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: BORDER, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0, flex: 1, flexBasis: '60%' }}>
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.35 }}>{title}</div>
        <div style={{ fontFamily: FONT, fontSize: 11, color: 'var(--t2)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
        {detail && <div style={{ fontFamily: FONT, fontSize: 10, color: 'var(--t3)', marginTop: 3, lineHeight: 1.35 }}>{detail}</div>}
      </div>
      {children}
    </div>
  )
}

function RowCta({
  children, onClick, href, danger, soloTu,
}: { children: React.ReactNode; onClick?: () => void; href?: string; danger?: boolean; soloTu?: boolean }) {
  const style: React.CSSProperties = {
    flexShrink: 0, minHeight: 44, padding: '0 14px', borderRadius: 100, fontSize: 12, fontWeight: 700,
    border: danger ? '1.5px solid var(--primary)' : '1.5px solid var(--elv)',
    background: danger ? 'var(--primary)' : 'var(--elv)', color: danger ? '#fff' : 'var(--t1)',
    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 6,
    textDecoration: 'none',
  }
  const content = (
    <>
      {soloTu && <span aria-hidden="true">🔒</span>}
      {children}
    </>
  )
  if (href) {
    return (
      <a href={href} style={style}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} style={style}>
      {content}
    </button>
  )
}

// ─── «Riprova lo storno» — riepilogo + spunta obbligatoria + naviga alla
// scheda fattura (vedi commento in testa al file: nessun endpoint di
// override applicabile con i dati disponibili). ─────────────────────────
function RiprovaStornoSheet({
  fatturaId, numero, td04Numero, onClose, onConfirm,
}: { fatturaId: string; numero: string; td04Numero: string; onClose: () => void; onConfirm: () => void }) {
  const [confermato, setConfermato] = useState(false)
  const label: React.CSSProperties = {
    fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)', margin: '0 0 8px',
  }
  return (
    <SheetShell titleId="storno-sheet-title" onClose={onClose}>
      <h2 id="storno-sheet-title" style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: 'var(--t1)', margin: '0 0 3px' }}>
        Riprova lo storno
      </h2>
      <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t2)', margin: '0 0 14px' }}>Fattura {numero}</p>

      <div
        style={{
          display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 12, margin: '0 0 14px',
          background: 'color-mix(in srgb, var(--primary) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
        }}
      >
        <span aria-hidden="true" style={{ color: 'var(--primary)', fontSize: 15, lineHeight: 1.2 }}>⚠</span>
        <span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t1)', lineHeight: 1.45 }}>
          <b style={{ fontWeight: 700 }}>Solo tu (titolare) puoi farlo.</b> Lo Stato ha rifiutato la nota di credito{' '}
          {td04Numero}: lo storno non è mai stato valido.
        </span>
      </div>

      <p style={label}>Cosa è successo</p>
      <div style={{ border: BORDER, borderRadius: 14, padding: '2px 12px', margin: '0 0 14px' }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 0', borderBottom: BORDER }}>
          <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: 'color-mix(in srgb, var(--c-red) 16%, transparent)', color: 'var(--red-ink, var(--primary))' }}>
            ↩
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.35 }}>
              Il credito dello storno è già tornato indietro
            </span>
            <span style={{ display: 'block', fontFamily: FONT, fontSize: 11, color: 'var(--t2)', marginTop: 2, lineHeight: 1.35 }}>
              UÀ ha tolto dal conto del cliente il credito dato per lo storno non valido.
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 0' }}>
          <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: 'color-mix(in srgb, var(--c-green) 16%, transparent)', color: 'var(--success)' }}>
            ↻
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.35 }}>
              Potrai rifare lo storno
            </span>
            <span style={{ display: 'block', fontFamily: FONT, fontSize: 11, color: 'var(--t2)', marginTop: 2, lineHeight: 1.35 }}>
              La fattura {numero} è tornata stornabile: nella sua scheda potrai preparare una nuova nota di credito.
            </span>
          </span>
        </div>
      </div>

      <label
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, background: 'var(--sfc)',
          border: confermato ? '1.5px solid color-mix(in srgb, var(--primary) 45%, transparent)' : '1.5px solid var(--elv)',
          margin: '0 0 14px', fontFamily: FONT, fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.4, cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={confermato}
          onChange={(e) => setConfermato(e.target.checked)}
          style={{ width: 22, height: 22, flexShrink: 0, marginTop: 1, accentColor: 'var(--primary)' }}
        />
        Ho letto cosa succede e voglio procedere.
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ flex: 1, minHeight: 48, borderRadius: 12, background: 'var(--elv)', border: BORDER, color: 'var(--t2)', fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Annulla
        </button>
        <button
          type="button"
          disabled={!confermato}
          onClick={onConfirm}
          data-fattura-id={fatturaId}
          style={{
            flex: 2, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12,
            background: 'var(--primary)', border: 'none', color: '#fff', fontFamily: FONT, fontSize: 14, fontWeight: 700,
            cursor: confermato ? 'pointer' : 'not-allowed', opacity: confermato ? 1 : 0.42, boxShadow: confermato ? 'var(--sh-red)' : 'none',
          }}
        >
          Sì, procedi
        </button>
      </div>
    </SheetShell>
  )
}

// ─── «Conferma ricevuta» / «Controlla e conferma» — applica un evento
// parcheggiato già letto (POST /api/pec/ricevute/[id]/applica, Task 11). ──
function ConfermaRicevutaSheet({
  ricevuta, onClose, onSuccess,
}: { ricevuta: PendenzeRiconciliazioneClient['eventiParcheggiati'][number]; onClose: () => void; onSuccess: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const firmaFallita = ricevuta.esito_verifica_firma === 'fallita'

  async function handleConferma() {
    if (isPending) return
    setIsPending(true)
    setError(null)
    let res: Response
    try {
      res = await fetch(`/api/pec/ricevute/${ricevuta.id}/applica`, { method: 'POST' })
    } catch {
      setIsPending(false)
      setError('Connessione assente. Riprova.')
      return
    }
    setIsPending(false)
    if (res.ok) {
      onSuccess()
      return
    }
    const data = (await res.json().catch(() => null)) as { error?: string; esito?: string } | null
    if (data?.esito === 'quarantena') {
      setError('Verifica firma non disponibile — controllo manuale obbligatorio.')
    } else {
      setError(data?.error ?? 'Impossibile confermare la ricevuta. Riprova.')
    }
  }

  return (
    <SheetShell titleId="ricevuta-sheet-title" onClose={onClose}>
      <h2 id="ricevuta-sheet-title" style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: 'var(--t1)', margin: '0 0 3px' }}>
        {firmaFallita ? 'Controlla e conferma' : 'Conferma ricevuta'}
      </h2>
      <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t2)', margin: '0 0 14px' }}>
        {ricevuta.nome_file_ricevuta ?? 'Ricevuta SdI'}
      </p>

      {firmaFallita && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--c-orange)', margin: '0 0 14px', lineHeight: 1.45 }}>
          ⚠ Verifica firma non disponibile — controllo manuale obbligatorio
        </p>
      )}

      {error && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--primary)', margin: '0 0 10px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          style={{ flex: 1, minHeight: 48, borderRadius: 12, background: 'var(--elv)', border: BORDER, color: 'var(--t2)', fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={handleConferma}
          disabled={isPending}
          style={{
            flex: 2, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12,
            background: 'var(--primary)', border: 'none', color: '#fff', fontFamily: FONT, fontSize: 14, fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1, boxShadow: 'var(--sh-red)',
          }}
        >
          {isPending ? 'Conferma…' : firmaFallita ? 'Controlla e conferma' : 'Conferma ricevuta'}
        </button>
      </div>
    </SheetShell>
  )
}

function useIsDesktopShell(): boolean {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return desktop
}

/** Guscio condiviso — bottom sheet mobile / dialog ancorato desktop (mai modal
 * centrato), stesso pattern di NotaCreditoButton.tsx e degli altri fogli di
 * questa pagina (Override/Upload/SbloccaClaim). */
function SheetShell({ titleId, onClose, children }: { titleId: string; onClose: () => void; children: React.ReactNode }) {
  const isDesktop = useIsDesktopShell()
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={
          isDesktop
            ? {
                position: 'fixed', top: 76, right: 24, width: 440, maxHeight: 'calc(100vh - 100px)',
                overflowY: 'auto', zIndex: 301, background: 'var(--bg)', border: BORDER, borderRadius: 20,
                boxShadow: 'var(--sh-b)', padding: 20,
              }
            : {
                position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '92vh', overflowY: 'auto', zIndex: 301,
                background: 'var(--bg)', borderRadius: '22px 22px 0 0', paddingBottom: 'env(safe-area-inset-bottom)',
                boxShadow: 'var(--sh-b)', padding: 18,
              }
        }
      >
        {!isDesktop && (
          <div aria-hidden="true" style={{ width: 34, height: 4, borderRadius: 2, background: 'var(--elv)', margin: '0 auto 14px' }} />
        )}
        {children}
      </div>
    </>
  )
}
