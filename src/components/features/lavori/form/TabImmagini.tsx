'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import imageCompression from 'browser-image-compression'
import type { LavoroImmagine } from '@/types/domain'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticLight, hapticSuccess, hapticError } from '@/lib/feedback/haptic'
import { soundError } from '@/lib/feedback/sounds'
import { raisedShadow } from './styles'

// ─── Tipi foto ─────────────────────────────────────────────────────
type TipoFoto = 'impronta' | 'pre_lavoro' | 'colore' | 'post_prova' | 'rx' | 'altro'

const TIPI_FOTO: { value: TipoFoto; label: string }[] = [
  { value: 'impronta',   label: 'Impronta' },
  { value: 'pre_lavoro', label: 'Pre-lavoro' },
  { value: 'colore',     label: 'Guida colore' },
  { value: 'post_prova', label: 'Post-prova' },
  { value: 'rx',         label: 'Radiografia' },
  { value: 'altro',      label: 'Altro' },
]

// ─── Stato locale per upload ottimistico ────────────────────────────
interface FotoLocale {
  id: string              // uuid locale temporaneo
  previewUrl: string      // URL.createObjectURL
  nomeFile: string
  progress: number        // 0-100, 100 = completato
  error: string | null
  tipo: TipoFoto
  uploadedId?: string     // id DB dopo upload success
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

// ─── Componente ─────────────────────────────────────────────────────
export function TabImmagini({ immagini, lavoro_id, onAdd }: TabImmaginiProps) {
  const reduced = useReducedMotion()
  const spring = motionTokens.spring.snappy

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

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

  const totalFotos = immagini.length + fotoLocali.filter((f) => !!f.uploadedId).length

  // Upload singolo file con XHR (per progress)
  const uploadFile = useCallback(
    async (file: File, localId: string, tipo: TipoFoto) => {
      try {
        // Compressione solo per immagini
        let fileToUpload = file
        if (file.type.startsWith('image/')) {
          fileToUpload = await imageCompression(file, COMPRESSION_OPTIONS)
        }

        const formData = new FormData()
        formData.append('file', fileToUpload)
        formData.append('descrizione', tipo)

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
                  setFotoLocali((prev) =>
                    prev.map((f) =>
                      f.id === localId
                        ? { ...f, progress: 100, uploadedId: json.immagine.id }
                        : f
                    )
                  )
                  hapticSuccess()
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
        hapticError()
        soundError()
      }
    },
    [lavoro_id, onAdd]
  )

  // Gestione files selezionati (camera o galleria)
  const handleFiles = useCallback(
    (files: FileList | null, fromCamera: boolean) => {
      if (!files || files.length === 0) return

      const filesArr = Array.from(files)

      // Tipo di default
      const tipoDefault: TipoFoto = fromCamera ? 'impronta' : 'altro'

      filesArr.forEach((file) => {
        const localId = genId()
        const previewUrl = URL.createObjectURL(file)

        const nuovaFoto: FotoLocale = {
          id: localId,
          previewUrl,
          nomeFile: file.name,
          progress: 0,
          error: null,
          tipo: tipoDefault,
        }

        setFotoLocali((prev) => [...prev, nuovaFoto])

        hapticLight()

        uploadFile(file, localId, tipoDefault)
      })
    },
    [uploadFile]
  )

  // Aggiorna tipo di una foto locale (e persiste se già uploadata)
  const handleTipoChange = useCallback(
    async (localId: string, tipo: TipoFoto) => {
      setFotoLocali((prev) =>
        prev.map((f) => (f.id === localId ? { ...f, tipo } : f))
      )
      // Persisti su DB se upload completato
      const foto = fotoLocali.find((f) => f.id === localId)
      if (foto?.uploadedId) {
        try {
          await fetch(`/api/lavori/${lavoro_id}/immagini/${foto.uploadedId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descrizione: tipo }),
          })
        } catch {
          // Non-blocking: il tipo è aggiornato localmente anche se PATCH fallisce
        }
      }
    },
    [fotoLocali, lavoro_id]
  )

  // Aggiorna tipo di un'immagine già in DB
  const handleTipoChangeDb = useCallback(
    async (imgId: string, tipo: TipoFoto) => {
      try {
        await fetch(`/api/lavori/${lavoro_id}/immagini/${imgId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descrizione: tipo }),
        })
      } catch {
        // Non-blocking
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <button
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
            fontFamily: 'DM Sans, sans-serif',
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
            fontFamily: 'DM Sans, sans-serif',
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
            color: 'var(--t2, #96918D)',
            fontFamily: 'DM Sans, sans-serif',
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
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: listaVista ? '12px' : '11px',
                        fontWeight: 700,
                        color: listaVista ? 'var(--t2, #96918D)' : 'white',
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
                        fontFamily: 'DM Sans, sans-serif',
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

                {/* Tipo select — disponibile dopo upload completato */}
                {(foto.uploadedId || foto.progress === 100) && (
                  <div
                    style={
                      listaVista
                        ? { flex: 1, minWidth: 0 }
                        : {
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0,0,0,.62)',
                          }
                    }
                  >
                    <select
                      value={foto.tipo}
                      onChange={(e) =>
                        void handleTipoChange(foto.id, e.target.value as TipoFoto)
                      }
                      aria-label={`Categoria foto: ${foto.nomeFile}`}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        background: 'transparent',
                        border: 'none',
                        color: listaVista ? 'var(--t1, #1C1916)' : 'white',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        padding: '12px 8px',
                        appearance: 'none',
                      }}
                    >
                      {TIPI_FOTO.map((tf) => (
                        <option key={tf.value} value={tf.value}>
                          {tf.label}
                        </option>
                      ))}
                    </select>
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
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--t2, #96918D)',
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
                )}
                {listaVista && (
                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
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
                        TIPI_FOTO.find((tf) => tf.value === img.descrizione)?.value ?? 'altro'
                      }
                      onChange={(e) =>
                        void handleTipoChangeDb(img.id, e.target.value as TipoFoto)
                      }
                      aria-label={`Categoria foto: ${img.nome_file ?? 'immagine'}`}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        padding: '12px 8px',
                        appearance: 'none',
                      }}
                    >
                      {TIPI_FOTO.map((tf) => (
                        <option key={tf.value} value={tf.value}>
                          {tf.label}
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
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              color: 'var(--t2, #96918D)',
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
