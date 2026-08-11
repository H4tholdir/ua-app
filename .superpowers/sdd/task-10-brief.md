### Task 10 — T10 · P37 UI: il mini-foglio «Chi ha prescritto?» (d1, D211)
- Dopo il tile del Passo 1 SOLO se il cliente è un'entità (ha `studio_nome`): ultimo prescrittore
  proposto (un tap), altri da `studio-members` (ARRAY NUDO — fatto 14), «È un altro» → pattern
  NuovoDentistaSheet. Dottore singolo: nessun foglio (D196).
- Payload: `richiedente_nome` (persona) + `istituzione_sanitaria` (ragione sociale dello studio,
  «se del caso» — D206). Il POST li accetta già (fatto 2); StatoWizard/persistenza come T1.
- Verifica: unit su quando il foglio compare/non compare.

