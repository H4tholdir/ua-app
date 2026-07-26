'use client'

import { useEffect, useLayoutEffect } from 'react'

// H2d round 2 (review post-fix, .superpowers/sdd/h2d-discendenti-report.md) — guard canonico
// (lo stesso usato da react-redux/zustand/framer-motion per lo stesso identico problema):
// `useLayoutEffect` gira PRIMA del paint del browser (sincrono, subito dopo il commit del DOM)
// mentre `useEffect` gira DOPO — per uno stato calcolato in JS che deve essere già corretto al
// PRIMO frame (qui: la classe `is-troncato`/`is-due-righe` della cassetta, che decide quanto
// clip-path respira), la differenza è la differenza tra "corretto subito" e "corretto un frame
// dopo, con una scheggia della riga nascosta visibile per quel singolo frame".
// React emette un warning se `useLayoutEffect` gira durante il rendering SERVER (non ha senso:
// il server non dipinge nulla) — questo guard usa `useEffect` lato server (`typeof window ===
// 'undefined'`, mai vero nel browser) e `useLayoutEffect` lato client, dove serve davvero.
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
