'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import imageCompression from 'browser-image-compression'
import type { LavoroImmagine } from '@/types/domain'
import { molla, useReducedMotion } from '@/design-system/v3/motion'
import { vibra } from '@/design-system/v3/haptic'
import { suona } from '@/design-system/v3/sound'
import { raisedShadow } from './styles'
import { CATEGORIE_FOTO, type CategoriaFoto } from '@/lib/domain/categorie-foto'
import { FoglioCategoria } from '@/components/ds/FoglioCategoria'

// ─── Stato locale per upload ottimistico ────────────────────────────
interface FotoLocale {
  id: string              // uuid locale temporaneo
  previewUrl: string      // URL.createObjectURL
  nomeFile: string
  isPdf: boolean          // T11: un PDF si rende come tessera documento, mai <img>
  progress: number        // 0-100, 100 = completato
  error: string | null
}

// ─── Opzioni compressione ───────────────────────────────────────────
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.85,
}

// ─── Progress ring SVG ──────────────────────────────────────────────
function ProgressRing({ progress }: { progress: number }) {
  const r = 18
  const circumference = 2 * Math.PI * r
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg
      width="44"
      height="44"
      aria-hidden="true"
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.25)"
        strokeWidth="3"
      />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.15s linear' }}
      />
    </svg>
  )
}

// ─── Tessera documento (PDF) — mai un <img>, T11 ─────────────────────
// Riusa SOLO le variabili CSS già in uso in questo file (--sfc, --t2,
// --font-v3): nessun colore nuovo inventato.
function TesseraDocumento({ nomeFile, listaVista }: { nomeFile: string; listaVista: boolean }) {
  return (
    <div
      role="img"
      aria-label={`Documento: ${nomeFile}`}
      style={{
        width: listaVista ? '44px' : '100%',
        height: listaVista ? '44px' : '100%',
        display: 'flex',
        flexDirection: listaVista ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        borderRadius: listaVista ? '8px' : '0',
        background: 'var(--sfc, #E4DFD9)',
        flexShrink: listaVista ? 0 : undefined,
        padding: listaVista ? '0' : '8px',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: listaVista ? '18px' : '28px' }}>📄</span>
      {!listaVista && (
        <span
          style={{
            fontFamily: 'var(--font-v3, sans-serif)',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--t2, #4A3D33)',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {nomeFile}
        </span>
      )}
    </div>
  )
}

/** `true` se il percorso di Storage è quello di un PDF. Il percorso porta
 *  sempre l'estensione (assegnata dalla rotta, `route.ts:111`), a differenza
 *  di `nome_file` che può mancare. */
function isPdfPath(storagePath: string): boolean {
  return storagePath.toLowerCase().endsWith('.pdf')
}

// ─── Props ──────────────────────────────────────────────────────────
interface TabImmaginiProps {
  immagini: LavoroImmagine[]
  lavoro_id: string
  onAdd: (img: LavoroImmagine) => void
}

// ─── Generatore UUID semplice ───────────────────────────────────────
function genId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Foglio categoria — stato del gruppo in attesa di una scelta ────
interface SheetCategoriaState {
  aperto: boolean
  quante: number
  anteprime: string[]
}

// ─── Componente ─────────────────────────────────────────────────────
export function TabImmagini({ immagini, lavoro_id, onAdd }: TabImmaginiProps) {
  const reduced = useReducedMotion()
  const spring = molla.snappy

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraBtnRef = useRef<HTMLButtonElement>(null)
  const galleryBtnRef = useRef<HTMLButtonElement>(null)

  const [fotoLocali, setFotoLocali] = useState<FotoLocale[]>([])
  const [listaVista, setListaVista] = useState(false)
  // Inizializzato con lazy initializer per evitare window access su server
  const [isSmallViewport, setIsSmallViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 390px)').matches
  })

  // Controlla viewport per "Vista lista" su iOS vecchi
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 390px)')
    const handler = (e: MediaQueryListEvent) => setIsSmallViewport(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // T11 (fix D81-bis): la foto locale SPARISCE non appena arriva quella vera
  // (`uploadFile`, ramo di successo) — quindi qui non c'è più doppio conteggio:
  // `fotoLocali` non contiene mai una foto già salita.
  const totalFotos = immagini.length + fotoLocali.length

  // ─── Il foglio che chiede la categoria — una volta per gruppo (D65/D74) ──
  // `pendingUploadRef` porta i File grezzi delle foto appena selezionate, in
  // attesa che l'utente scelga (o esca, e allora è il foglio stesso a
  // scegliere 'altro' per lui). `ancoraCategoriaRef` è l'àncora del focus:
  // un `useRef` STABILE, mai un letterale — un letterale ricreato a ogni
  // render strapperebbe il focus all'utente (vedi FoglioCategoria.tsx).
  const pendingUploadRef = useRef<Array<{ localId: string; file: File }>>([])
  const ancoraCategoriaRef = useRef<HTMLElement | null>(null)
  const [sheetCategoria, setSheetCategoria] = useState<SheetCategoriaState>({
    aperto: false,
    quante: 0,
    anteprime: [],
  })

  // Upload singolo file con XHR (per progress)
  const uploadFile = useCallback(
    async (file: File, localId: string, categoria: CategoriaFoto) => {
      try {
        // Compressione solo per immagini
        let fileToUpload = file
        if (file.type.startsWith('image/')) {
          fileToUpload = await imageCompression(file, COMPRESSION_OPTIONS)
        }

        const formData = new FormData()
        formData.append('file', fileToUpload)
        formData.append('categoria', categoria)

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.min(Math.round((e.loaded / e.total) * 100), 99)
              setFotoLocali((prev) =>
                prev.map((f) => (f.id === localId ? { ...f, progress: pct } : f))
              )
            }
          }

          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText)
                if (json.immagine) {
                  onAdd(json.immagine as LavoroImmagine)
                  // La foto locale sparisce: quella vera arriva già dentro
                  // `immagini` (via `onAdd`), e tenerle entrambe raddoppierebbe
                  // sia il conteggio sia il render.
                  setFotoLocali((prev) => {
                    const locale = prev.find((f) => f.id === localId)
                    if (locale) URL.revokeObjectURL(locale.previewUrl)
                    return prev.filter((f) => f.id !== localId)
                  })
                  vibra('success')
                }
                resolve()
              } catch {
                reject(new Error('Risposta non valida'))
              }
            } else {
              try {
                const json = JSON.parse(xhr.responseText)
                reject(new Error(json.error ?? `Upload fallito: ${xhr.status}`))
              } catch {
                reject(new Error(`Upload fallito: ${xhr.status}`))
              }
            }
          }

          xhr.onerror = () => reject(new Error('Errore di rete'))
          xhr.open('POST', `/api/lavori/${lavoro_id}/immagini`)
          xhr.send(formData)
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload fallito'
        setFotoLocali((prev) =>
          prev.map((f) => (f.id === localId ? { ...f, error: msg, progress: 0 } : f))
        )
        vibra('error')
        suona('errore')
      }
    },
    [lavoro_id, onAdd]
  )

  // Gestione files selezionati (camera o galleria): crea le carte ottimistiche
  // e apre il foglio categoria. L'upload vero parte SOLO dopo la scelta
  // (`handleScegliCategoria`) — niente più «indovina dalla sorgente».
  const handleFiles = useCallback(
    (files: FileList | null, fromCamera: boolean) => {
      if (!files || files.length === 0) return

      const filesArr = Array.from(files)
      const pendenti: Array<{ localId: string; file: File }> = []
      const nuovi: FotoLocale[] = []

      filesArr.forEach((file) => {
        const localId = genId()
        const previewUrl = URL.createObjectURL(file)
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

        const nuovaFoto: FotoLocale = {
          id: localId,
          previewUrl,
          nomeFile: file.name,
          isPdf,
          progress: 0,
          error: null,
        }

        nuovi.push(nuovaFoto)
        pendenti.push({ localId, file })

        setFotoLocali((prev) => [...prev, nuovaFoto])

        vibra('light')
      })

      pendingUploadRef.current = pendenti
      ancoraCategoriaRef.current = fromCamera ? cameraBtnRef.current : galleryBtnRef.current
      setSheetCategoria({
        aperto: true,
        quante: filesArr.length,
        // Le anteprime sono SOLO immagini: un PDF passato come `src` di un
        // <img> del foglio renderebbe un'icona rotta (FoglioCategoria.tsx:123).
        anteprime: nuovi.filter((f) => !f.isPdf).slice(0, 3).map((f) => f.previewUrl),
      })
    },
    []
  )

  // La categoria scelta (o 'altro' se l'utente è uscito senza scegliere,
  // D74 — è il foglio stesso a garantirlo) avvia l'upload di OGNI file del
  // gruppo in attesa.
  const handleScegliCategoria = useCallback(
    (categoria: CategoriaFoto) => {
      const pendenti = pendingUploadRef.current
      pendingUploadRef.current = []
      pendenti.forEach(({ localId, file }) => {
        void uploadFile(file, localId, categoria)
      })
    },
    [uploadFile]
  )

  const handleChiudiCategoria = useCallback(() => {
    setSheetCategoria((s) => ({ ...s, aperto: false }))
  }, [])

  // ─── UNA sola funzione di scrittura per la categoria (D70) ──────────
  // Sostituisce i due gestori quasi identici che c'erano (uno per le foto
  // ancora locali, uno per quelle già in banca dati): dal momento in cui la
  // foto locale sparisce non appena sale (sopra), la correzione della
  // categoria ha un solo punto di applicazione possibile, quello delle foto
  // già in `immagini`.
  const handleCategoriaChange = useCallback(
    async (imgId: string, categoria: CategoriaFoto) => {
      try {
        await fetch(`/api/lavori/${lavoro_id}/immagini/${imgId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoria }),
        })
      } catch {
        // Non-blocking: come in origine, un fallimento qui non blocca l'utente.
      }
    },
    [lavoro_id]
  )

  // Breakpoint responsivi espliciti (3 col mobile, 4 tablet, 5 desktop)
  const [windowW, setWindowW] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 390
  )
  useEffect(() => {
    const onResize = () => setWindowW(window.innerWidth)
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const gridCols = listaVista ? 1 : windowW >= 1280 ? 5 : windowW >= 768 ? 4 : 3

  const getGridStyle = (): React.CSSProperties => ({
    display: listaVista ? 'flex' : 'grid',
    flexDirection: listaVista ? 'column' : undefined,
    gridTemplateColumns: listaVista ? undefined : `repeat(${gridCols}, 1fr)`,
    gap: '8px',
    marginBottom: '20px',
  })

  const getThumbnailHeight = (): string => {
    if (listaVista) return '56px'
    return '100px'
  }

  // Unisce immagini già caricate + locali in progress
  const foteDaRenderizzare = fotoLocali

  return (
    <div>
      {/* ─── Bottoni upload ─────────────────────────────────────── */}
      {/* Input nascosti */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          handleFiles(e.target.files, true)
          if (cameraRef.current) cameraRef.current.value = ''
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          handleFiles(e.target.files, false)
          if (galleryRef.current) galleryRef.current.value = ''
        }}
      />

      {/* Il foglio che chiede «che foto è» — una volta per gruppo appena
          selezionato (§5.41). L'àncora del focus è il bottone che ha aperto
          il selettore file, dichiarata da un ref stabile qui sopra. */}
      <FoglioCategoria
        aperto={sheetCategoria.aperto}
        quante={sheetCategoria.quante}
        anteprime={sheetCategoria.anteprime}
        ancoraFocus={ancoraCategoriaRef}
        onScegli={handleScegliCategoria}
        onChiudi={handleChiudiCategoria}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <button
          ref={cameraBtnRef}
          type="button"
          onClick={() => cameraRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            height: '52px',
            borderRadius: '14px',
            border: '1.5px dashed rgba(0,0,0,.08)',
            background: 'transparent',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'var(--font-v3, sans-serif)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          aria-label="Scatta foto con la fotocamera"
        >
          <span aria-hidden="true" style={{ fontSize: '18px' }}>📸</span>
          Camera
        </button>

        <button
          ref={galleryBtnRef}
          type="button"
          onClick={() => galleryRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            height: '52px',
            borderRadius: '14px',
            border: '1.5px dashed rgba(0,0,0,.08)',
            background: 'transparent',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'var(--font-v3, sans-serif)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          aria-label="Seleziona da galleria o file"
        >
          <span aria-hidden="true" style={{ fontSize: '18px' }}>🖼️</span>
          Galleria
        </button>
      </div>

      {/* ─── Toggle Vista lista (solo mobile con 6+ foto) ─────── */}
      {isSmallViewport && totalFotos >= 6 && (
        <button
          type="button"
          onClick={() => setListaVista((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '36px',
            padding: '0 14px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--elv, #EDEDEA)',
            color: 'var(--t2, #4A3D33)',
            fontFamily: 'var(--font-v3, sans-serif)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '12px',
            boxShadow: raisedShadow,
          }}
          aria-pressed={listaVista}
          aria-label={listaVista ? 'Passa alla vista griglia' : 'Passa alla vista lista'}
        >
          {listaVista ? '⊞ Griglia' : '☰ Lista'}
        </button>
      )}

      {/* ─── Foto in upload (ottimistiche) ───────────────────── */}
      {foteDaRenderizzare.length > 0 && (
        <div style={getGridStyle()}>
          <AnimatePresence>
            {foteDaRenderizzare.map((foto) => (
              <motion.div
                key={foto.id}
                layout
                initial={reduced ? {} : { scale: 0.85, opacity: 0 }}
                animate={reduced ? {} : { scale: 1, opacity: 1 }}
                exit={reduced ? {} : { scale: 0.8, opacity: 0, x: -10 }}
                transition={spring}
                style={{
                  position: 'relative',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  height: getThumbnailHeight(),
                  background: 'var(--elv, #EDEDEA)',
                  boxShadow: raisedShadow,
                  display: listaVista ? 'flex' : 'block',
                  alignItems: listaVista ? 'center' : undefined,
                  gap: listaVista ? '12px' : undefined,
                  padding: listaVista ? '0 10px' : '0',
                }}
              >
                {/* Thumbnail — un PDF è una tessera documento, mai un <img> */}
                {foto.isPdf ? (
                  <TesseraDocumento nomeFile={foto.nomeFile} listaVista={listaVista} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={foto.previewUrl}
                    alt={foto.nomeFile}
                    style={{
                      width: listaVista ? '44px' : '100%',
                      height: listaVista ? '44px' : '100%',
                      objectFit: 'cover',
                      borderRadius: listaVista ? '8px' : '0',
                      flexShrink: listaVista ? 0 : undefined,
                    }}
                    loading="lazy"
                  />
                )}

                {/* Progress overlay (solo durante upload) */}
                {foto.progress < 100 && !foto.error && (
                  <div
                    style={{
                      position: listaVista ? 'static' : 'absolute',
                      inset: listaVista ? undefined : 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      background: listaVista ? 'transparent' : 'rgba(0,0,0,.52)',
                      borderRadius: listaVista ? undefined : '10px',
                      gap: '2px',
                    }}
                    aria-hidden="true"
                  >
                    {!listaVista && <ProgressRing progress={foto.progress} />}
                    <span
                      style={{
                        fontFamily: 'var(--font-v3, sans-serif)',
                        fontSize: listaVista ? '12px' : '11px',
                        fontWeight: 700,
                        color: listaVista ? 'var(--t2, #4A3D33)' : 'white',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {foto.progress}%
                    </span>
                  </div>
                )}

                {/* Errore overlay */}
                {foto.error && (
                  <div
                    style={{
                      position: listaVista ? 'static' : 'absolute',
                      inset: listaVista ? undefined : 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: listaVista ? 'transparent' : 'rgba(217,0,18,.72)',
                      borderRadius: listaVista ? undefined : '10px',
                      padding: listaVista ? undefined : '4px',
                    }}
                    role="alert"
                    aria-label={`Errore upload: ${foto.error}`}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-v3, sans-serif)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: listaVista ? 'var(--primary, #D90012)' : 'white',
                        textAlign: 'center',
                      }}
                    >
                      {listaVista ? '⚠ Errore' : '⚠'}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Immagini già caricate (da DB) ──────────────────────── */}
      {immagini.length > 0 ? (
        <div>
          <p
            style={{
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--t2, #4A3D33)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '10px',
            }}
          >
            {immagini.length} {immagini.length === 1 ? 'foto' : 'foto'} allegate
          </p>
          <div style={getGridStyle()}>
            {immagini.map((img) => (
              <div
                key={img.id}
                style={{
                  position: 'relative',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  height: getThumbnailHeight(),
                  background: 'var(--elv, #EDEDEA)',
                  boxShadow: raisedShadow,
                  display: listaVista ? 'flex' : 'block',
                  alignItems: listaVista ? 'center' : undefined,
                  gap: listaVista ? '12px' : undefined,
                  padding: listaVista ? '0 10px' : '0',
                }}
              >
                {img.url && (
                  isPdfPath(img.storage_path) ? (
                    <TesseraDocumento
                      nomeFile={img.nome_file ?? 'Documento.pdf'}
                      listaVista={listaVista}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt={img.nome_file ?? 'Immagine allegata'}
                      style={{
                        width: listaVista ? '44px' : '100%',
                        height: listaVista ? '44px' : '100%',
                        objectFit: 'cover',
                        borderRadius: listaVista ? '8px' : '0',
                        flexShrink: listaVista ? 0 : undefined,
                      }}
                      loading="lazy"
                    />
                  )
                )}
                {listaVista && (
                  <span
                    style={{
                      fontFamily: 'var(--font-v3, sans-serif)',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--t1, #1C1916)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {img.nome_file ?? 'Immagine'}
                  </span>
                )}
                {!listaVista && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,.62)',
                    }}
                  >
                    <select
                      defaultValue={
                        CATEGORIE_FOTO.find((c) => c.valore === img.categoria)?.valore ?? 'altro'
                      }
                      onChange={(e) =>
                        void handleCategoriaChange(img.id, e.target.value as CategoriaFoto)
                      }
                      aria-label={`Categoria foto: ${img.nome_file ?? 'immagine'}`}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontFamily: 'var(--font-v3, sans-serif)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        padding: '12px 8px',
                        appearance: 'none',
                      }}
                    >
                      {CATEGORIE_FOTO.map((c) => (
                        <option key={c.valore} value={c.valore}>
                          {c.etichetta}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : fotoLocali.length === 0 ? (
        <div
          style={{
            background: 'var(--sfc, #E4DFD9)',
            borderRadius: '14px',
            padding: '28px 20px',
            textAlign: 'center',
            boxShadow: raisedShadow,
          }}
          role="status"
        >
          <p
            style={{
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '14px',
              color: 'var(--t2, #4A3D33)',
              margin: 0,
            }}
          >
            Nessuna immagine allegata
          </p>
        </div>
      ) : null}
    </div>
  )
}
