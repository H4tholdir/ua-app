export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appuntamenti: {
        Row: {
          cliente_id: string | null
          created_at: string
          data: string
          deleted_at: string | null
          descrizione: string | null
          durata_minuti: number | null
          id: string
          importante: boolean
          laboratorio_id: string
          lavoro_id: string | null
          note: string | null
          ora_fine: string | null
          ora_inizio: string | null
          reminder_at: string | null
          reminder_inviato: boolean
          tecnico_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data: string
          deleted_at?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          id?: string
          importante?: boolean
          laboratorio_id: string
          lavoro_id?: string | null
          note?: string | null
          ora_fine?: string | null
          ora_inizio?: string | null
          reminder_at?: string | null
          reminder_inviato?: boolean
          tecnico_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          id?: string
          importante?: boolean
          laboratorio_id?: string
          lavoro_id?: string | null
          note?: string | null
          ora_fine?: string | null
          ora_inizio?: string | null
          reminder_at?: string | null
          reminder_inviato?: boolean
          tecnico_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appuntamenti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "partitario_clienti"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "appuntamenti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnici"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          actor_id: string | null
          changed_at: string
          id: number
          lab_id: string | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string | null
          table_name: string
        }
        Insert: {
          actor_id?: string | null
          changed_at?: string
          id?: number
          lab_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id?: string | null
          table_name: string
        }
        Update: {
          actor_id?: string | null
          changed_at?: string
          id?: number
          lab_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      buoni_consegna: {
        Row: {
          anno_buono: number
          con_prezzi: boolean
          created_at: string
          data_consegna: string | null
          data_emissione: string
          deleted_at: string | null
          firma_consegna_url: string | null
          firmato_at: string | null
          id: string
          laboratorio_id: string
          lavoro_id: string
          note: string | null
          numero_buono: string
          pdf_senza_prezzi_url: string | null
          pdf_url: string | null
          progressivo_buono: number
          stato: string
          updated_at: string
        }
        Insert: {
          anno_buono: number
          con_prezzi?: boolean
          created_at?: string
          data_consegna?: string | null
          data_emissione?: string
          deleted_at?: string | null
          firma_consegna_url?: string | null
          firmato_at?: string | null
          id?: string
          laboratorio_id: string
          lavoro_id: string
          note?: string | null
          numero_buono: string
          pdf_senza_prezzi_url?: string | null
          pdf_url?: string | null
          progressivo_buono: number
          stato?: string
          updated_at?: string
        }
        Update: {
          anno_buono?: number
          con_prezzi?: boolean
          created_at?: string
          data_consegna?: string | null
          data_emissione?: string
          deleted_at?: string | null
          firma_consegna_url?: string | null
          firmato_at?: string | null
          id?: string
          laboratorio_id?: string
          lavoro_id?: string
          note?: string | null
          numero_buono?: string
          pdf_senza_prezzi_url?: string | null
          pdf_url?: string | null
          progressivo_buono?: number
          stato?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buoni_consegna_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buoni_consegna_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buoni_consegna_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      cicli_produzione: {
        Row: {
          attivo: boolean
          classe_rischio: string | null
          codice: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          laboratorio_id: string
          nome: string
          normative_json: Json | null
          tipo_dispositivo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          classe_rischio?: string | null
          codice: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          laboratorio_id: string
          nome: string
          normative_json?: Json | null
          tipo_dispositivo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          classe_rischio?: string | null
          codice?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          laboratorio_id?: string
          nome?: string
          normative_json?: Json | null
          tipo_dispositivo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cicli_produzione_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cicli_produzione_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cicli_produzione_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
        ]
      }
      clienti: {
        Row: {
          cap: string | null
          citta: string | null
          codice_fiscale: string | null
          codice_sdi: string | null
          cognome: string
          contatore_prescrizioni: number
          created_at: string
          deleted_at: string | null
          email: string | null
          fatturare_al_paziente: boolean
          iban: string | null
          id: string
          indirizzo: string | null
          laboratorio_id: string
          laboratorio_odontotecnico: boolean
          listino_numero: number
          modalita_pagamento: string | null
          nome: string
          non_soggetto_fe: boolean
          note: string | null
          paese: string
          partita_iva: string | null
          pec: string | null
          portale_token: string
          portale_token_scade_at: string | null
          provincia: string | null
          sconto_percentuale: number
          studio_nome: string | null
          tecnico_default_id: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          codice_sdi?: string | null
          cognome: string
          contatore_prescrizioni?: number
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          fatturare_al_paziente?: boolean
          iban?: string | null
          id?: string
          indirizzo?: string | null
          laboratorio_id: string
          laboratorio_odontotecnico?: boolean
          listino_numero?: number
          modalita_pagamento?: string | null
          nome: string
          non_soggetto_fe?: boolean
          note?: string | null
          paese?: string
          partita_iva?: string | null
          pec?: string | null
          portale_token?: string
          portale_token_scade_at?: string | null
          provincia?: string | null
          sconto_percentuale?: number
          studio_nome?: string | null
          tecnico_default_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          codice_sdi?: string | null
          cognome?: string
          contatore_prescrizioni?: number
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          fatturare_al_paziente?: boolean
          iban?: string | null
          id?: string
          indirizzo?: string | null
          laboratorio_id?: string
          laboratorio_odontotecnico?: boolean
          listino_numero?: number
          modalita_pagamento?: string | null
          nome?: string
          non_soggetto_fe?: boolean
          note?: string | null
          paese?: string
          partita_iva?: string | null
          pec?: string | null
          portale_token?: string
          portale_token_scade_at?: string | null
          provincia?: string | null
          sconto_percentuale?: number
          studio_nome?: string | null
          tecnico_default_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clienti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clienti_tecnico_default_id_fkey"
            columns: ["tecnico_default_id"]
            isOneToOne: false
            referencedRelation: "tecnici"
            referencedColumns: ["id"]
          },
        ]
      }
      credito_clienti_movimenti: {
        Row: {
          cliente_id: string
          created_at: string
          fattura_id: string | null
          id: string
          importo: number
          laboratorio_id: string
          lavoro_id: string | null
          metodo: string | null
          metodo_nota: string | null
          note: string | null
          pagamento_id: string | null
          registrato_da: string
          tipo: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          fattura_id?: string | null
          id?: string
          importo: number
          laboratorio_id: string
          lavoro_id?: string | null
          metodo?: string | null
          metodo_nota?: string | null
          note?: string | null
          pagamento_id?: string | null
          registrato_da: string
          tipo: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          fattura_id?: string | null
          id?: string
          importo?: number
          laboratorio_id?: string
          lavoro_id?: string | null
          metodo?: string | null
          metodo_nota?: string | null
          note?: string | null
          pagamento_id?: string | null
          registrato_da?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "credito_clienti_movimenti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_clienti_movimenti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "partitario_clienti"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "credito_clienti_movimenti_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_clienti_movimenti_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture_da_inviare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_clienti_movimenti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_clienti_movimenti_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_clienti_movimenti_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_clienti_movimenti_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_clienti_movimenti_registrato_da_fkey"
            columns: ["registrato_da"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_kpi_cache: {
        Row: {
          aggiornato_at: string
          consegne_oggi: number
          fatturato_mese: number
          fatturato_mese_precedente: number
          in_prova_count: number
          is_rifacimento_count: number
          laboratorio_id: string
          lavori_attivi: number
          lavori_in_ritardo: number
          materiali_esaurimento_count: number
          mdr_incompleti: number
          pagamenti_scaduti_clienti_count: number
          pagamenti_scaduti_totale: number
          pronti_non_fatturati: number
          spedizioni_in_ritardo: number
          stl_non_assegnati: number
          tecnico_saturo_count: number
          tecnico_saturo_id: string | null
        }
        Insert: {
          aggiornato_at?: string
          consegne_oggi?: number
          fatturato_mese?: number
          fatturato_mese_precedente?: number
          in_prova_count?: number
          is_rifacimento_count?: number
          laboratorio_id: string
          lavori_attivi?: number
          lavori_in_ritardo?: number
          materiali_esaurimento_count?: number
          mdr_incompleti?: number
          pagamenti_scaduti_clienti_count?: number
          pagamenti_scaduti_totale?: number
          pronti_non_fatturati?: number
          spedizioni_in_ritardo?: number
          stl_non_assegnati?: number
          tecnico_saturo_count?: number
          tecnico_saturo_id?: string | null
        }
        Update: {
          aggiornato_at?: string
          consegne_oggi?: number
          fatturato_mese?: number
          fatturato_mese_precedente?: number
          in_prova_count?: number
          is_rifacimento_count?: number
          laboratorio_id?: string
          lavori_attivi?: number
          lavori_in_ritardo?: number
          materiali_esaurimento_count?: number
          mdr_incompleti?: number
          pagamenti_scaduti_clienti_count?: number
          pagamenti_scaduti_totale?: number
          pronti_non_fatturati?: number
          spedizioni_in_ritardo?: number
          stl_non_assegnati?: number
          tecnico_saturo_count?: number
          tecnico_saturo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_kpi_cache_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: true
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_kpi_cache_tecnico_saturo_id_fkey"
            columns: ["tecnico_saturo_id"]
            isOneToOne: false
            referencedRelation: "tecnici"
            referencedColumns: ["id"]
          },
        ]
      }
      data_processing_agreements: {
        Row: {
          created_at: string
          data_scadenza: string | null
          deleted_at: string | null
          dentista_id: string | null
          documento_url: string | null
          firmato_at: string | null
          firmato_da: string | null
          id: string
          laboratorio_id: string
          note: string | null
          stato: string
          sub_responsabile: string | null
          template_versione: string
          tipo_controparte: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_scadenza?: string | null
          deleted_at?: string | null
          dentista_id?: string | null
          documento_url?: string | null
          firmato_at?: string | null
          firmato_da?: string | null
          id?: string
          laboratorio_id: string
          note?: string | null
          stato?: string
          sub_responsabile?: string | null
          template_versione?: string
          tipo_controparte: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_scadenza?: string | null
          deleted_at?: string | null
          dentista_id?: string | null
          documento_url?: string | null
          firmato_at?: string | null
          firmato_da?: string | null
          id?: string
          laboratorio_id?: string
          note?: string | null
          stato?: string
          sub_responsabile?: string | null
          template_versione?: string
          tipo_controparte?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_processing_agreements_dentista_id_fkey"
            columns: ["dentista_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_processing_agreements_dentista_id_fkey"
            columns: ["dentista_id"]
            isOneToOne: false
            referencedRelation: "partitario_clienti"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "data_processing_agreements_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      dichiarazioni_conformita: {
        Row: {
          anno_ddc: number
          classe_rischio: string
          colore_dente: string | null
          contiene_sostanze_o_tessuti: boolean
          created_at: string
          data_emissione: string
          deleted_at: string | null
          denti_coinvolti: string[] | null
          descrizione_dispositivo: string
          fabbricante_indirizzo: string
          fabbricante_itca: string | null
          fabbricante_nome: string
          fabbricante_piva: string
          firma_ddc_sha256: string | null
          firma_ddc_storage_path: string | null
          firma_digitale_url: string | null
          firmata_at: string | null
          generated_by: string | null
          id: string
          inviata_al_dentista: boolean
          inviata_al_dentista_at: string | null
          laboratorio_id: string
          lavoro_id: string
          luogo_emissione: string
          luogo_fabbricazione: string
          materiali_json: Json | null
          norme_json: Json | null
          nota_marcatura_ce: string
          numero_ddc: string
          payload_sha256: string | null
          paziente_cognome: string | null
          paziente_nascita: string | null
          paziente_nome: string
          pdf_generato_at: string | null
          pdf_sha256: string | null
          pdf_url: string | null
          prescrittore_nome: string
          prescrizione_caratteristiche: string | null
          prescrizione_id: string | null
          progressivo_ddc: number
          prrc_nome: string
          prrc_qualifica: string | null
          regola_classificazione: string | null
          rischi_json: Json | null
          rischi_residui_snapshot: string | null
          sostanze_tessuti_dettaglio: string | null
          stato: string
          storage_object_version: string | null
          storage_path_pdf: string | null
          tecnico_responsabile_id: string | null
          template_version: string | null
          testo_conformita: string
          testo_conformita_snapshot: string
          tipo_dispositivo: string
          updated_at: string
          uso_esclusivo_paziente: string
        }
        Insert: {
          anno_ddc?: number
          classe_rischio: string
          colore_dente?: string | null
          contiene_sostanze_o_tessuti?: boolean
          created_at?: string
          data_emissione?: string
          deleted_at?: string | null
          denti_coinvolti?: string[] | null
          descrizione_dispositivo: string
          fabbricante_indirizzo: string
          fabbricante_itca?: string | null
          fabbricante_nome: string
          fabbricante_piva: string
          firma_ddc_sha256?: string | null
          firma_ddc_storage_path?: string | null
          firma_digitale_url?: string | null
          firmata_at?: string | null
          generated_by?: string | null
          id?: string
          inviata_al_dentista?: boolean
          inviata_al_dentista_at?: string | null
          laboratorio_id: string
          lavoro_id: string
          luogo_emissione?: string
          luogo_fabbricazione?: string
          materiali_json?: Json | null
          norme_json?: Json | null
          nota_marcatura_ce?: string
          numero_ddc: string
          payload_sha256?: string | null
          paziente_cognome?: string | null
          paziente_nascita?: string | null
          paziente_nome: string
          pdf_generato_at?: string | null
          pdf_sha256?: string | null
          pdf_url?: string | null
          prescrittore_nome: string
          prescrizione_caratteristiche?: string | null
          prescrizione_id?: string | null
          progressivo_ddc: number
          prrc_nome: string
          prrc_qualifica?: string | null
          regola_classificazione?: string | null
          rischi_json?: Json | null
          rischi_residui_snapshot?: string | null
          sostanze_tessuti_dettaglio?: string | null
          stato?: string
          storage_object_version?: string | null
          storage_path_pdf?: string | null
          tecnico_responsabile_id?: string | null
          template_version?: string | null
          testo_conformita: string
          testo_conformita_snapshot?: string
          tipo_dispositivo: string
          updated_at?: string
          uso_esclusivo_paziente?: string
        }
        Update: {
          anno_ddc?: number
          classe_rischio?: string
          colore_dente?: string | null
          contiene_sostanze_o_tessuti?: boolean
          created_at?: string
          data_emissione?: string
          deleted_at?: string | null
          denti_coinvolti?: string[] | null
          descrizione_dispositivo?: string
          fabbricante_indirizzo?: string
          fabbricante_itca?: string | null
          fabbricante_nome?: string
          fabbricante_piva?: string
          firma_ddc_sha256?: string | null
          firma_ddc_storage_path?: string | null
          firma_digitale_url?: string | null
          firmata_at?: string | null
          generated_by?: string | null
          id?: string
          inviata_al_dentista?: boolean
          inviata_al_dentista_at?: string | null
          laboratorio_id?: string
          lavoro_id?: string
          luogo_emissione?: string
          luogo_fabbricazione?: string
          materiali_json?: Json | null
          norme_json?: Json | null
          nota_marcatura_ce?: string
          numero_ddc?: string
          payload_sha256?: string | null
          paziente_cognome?: string | null
          paziente_nascita?: string | null
          paziente_nome?: string
          pdf_generato_at?: string | null
          pdf_sha256?: string | null
          pdf_url?: string | null
          prescrittore_nome?: string
          prescrizione_caratteristiche?: string | null
          prescrizione_id?: string | null
          progressivo_ddc?: number
          prrc_nome?: string
          prrc_qualifica?: string | null
          regola_classificazione?: string | null
          rischi_json?: Json | null
          rischi_residui_snapshot?: string | null
          sostanze_tessuti_dettaglio?: string | null
          stato?: string
          storage_object_version?: string | null
          storage_path_pdf?: string | null
          tecnico_responsabile_id?: string | null
          template_version?: string | null
          testo_conformita?: string
          testo_conformita_snapshot?: string
          tipo_dispositivo?: string
          updated_at?: string
          uso_esclusivo_paziente?: string
        }
        Relationships: [
          {
            foreignKeyName: "dichiarazioni_conformita_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dichiarazioni_conformita_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dichiarazioni_conformita_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dichiarazioni_conformita_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dichiarazioni_conformita_tecnico_responsabile_id_fkey"
            columns: ["tecnico_responsabile_id"]
            isOneToOne: false
            referencedRelation: "tecnici"
            referencedColumns: ["id"]
          },
        ]
      }
      fascicoli_tecnici: {
        Row: {
          analisi_rischi_id: string | null
          approvato_at: string | null
          approvato_da: string | null
          created_at: string
          dati_pmcf_json: Json | null
          deleted_at: string | null
          descrizione_dispositivo: string | null
          etichetta_json: Json | null
          id: string
          istruzioni_uso_url: string | null
          laboratorio_id: string
          materiali_json: Json | null
          norme_armonizzate_json: Json | null
          note: string | null
          prrc_nomina_id: string | null
          psur_ids: string[] | null
          specifiche_tecniche: string | null
          stato: string
          tipo_dispositivo: string
          updated_at: string
          versione: string
        }
        Insert: {
          analisi_rischi_id?: string | null
          approvato_at?: string | null
          approvato_da?: string | null
          created_at?: string
          dati_pmcf_json?: Json | null
          deleted_at?: string | null
          descrizione_dispositivo?: string | null
          etichetta_json?: Json | null
          id?: string
          istruzioni_uso_url?: string | null
          laboratorio_id: string
          materiali_json?: Json | null
          norme_armonizzate_json?: Json | null
          note?: string | null
          prrc_nomina_id?: string | null
          psur_ids?: string[] | null
          specifiche_tecniche?: string | null
          stato?: string
          tipo_dispositivo: string
          updated_at?: string
          versione?: string
        }
        Update: {
          analisi_rischi_id?: string | null
          approvato_at?: string | null
          approvato_da?: string | null
          created_at?: string
          dati_pmcf_json?: Json | null
          deleted_at?: string | null
          descrizione_dispositivo?: string | null
          etichetta_json?: Json | null
          id?: string
          istruzioni_uso_url?: string | null
          laboratorio_id?: string
          materiali_json?: Json | null
          norme_armonizzate_json?: Json | null
          note?: string | null
          prrc_nomina_id?: string | null
          psur_ids?: string[] | null
          specifiche_tecniche?: string | null
          stato?: string
          tipo_dispositivo?: string
          updated_at?: string
          versione?: string
        }
        Relationships: [
          {
            foreignKeyName: "fascicoli_tecnici_approvato_da_fkey"
            columns: ["approvato_da"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fascicoli_tecnici_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fascicoli_tecnici_prrc_nomina_id_fkey"
            columns: ["prrc_nomina_id"]
            isOneToOne: false
            referencedRelation: "prrc_nomine"
            referencedColumns: ["id"]
          },
        ]
      }
      fasi_produzione: {
        Row: {
          attrezzatura: string | null
          ciclo_id: string
          codice_fase: string
          controllo_misura: string | null
          created_at: string
          deleted_at: string | null
          descrizione: string
          esito_atteso: string | null
          id: string
          laboratorio_id: string
          materiali_nota: string | null
          misurazioni_da_rilevare: boolean
          obbligatoria: boolean
          ordine: number
          responsabile_id: string | null
          tempo_medio_lavoro: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attrezzatura?: string | null
          ciclo_id: string
          codice_fase: string
          controllo_misura?: string | null
          created_at?: string
          deleted_at?: string | null
          descrizione: string
          esito_atteso?: string | null
          id?: string
          laboratorio_id: string
          materiali_nota?: string | null
          misurazioni_da_rilevare?: boolean
          obbligatoria?: boolean
          ordine: number
          responsabile_id?: string | null
          tempo_medio_lavoro?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attrezzatura?: string | null
          ciclo_id?: string
          codice_fase?: string
          controllo_misura?: string | null
          created_at?: string
          deleted_at?: string | null
          descrizione?: string
          esito_atteso?: string | null
          id?: string
          laboratorio_id?: string
          materiali_nota?: string | null
          misurazioni_da_rilevare?: boolean
          obbligatoria?: boolean
          ordine?: number
          responsabile_id?: string | null
          tempo_medio_lavoro?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fasi_produzione_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "cicli_produzione"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fasi_produzione_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fasi_produzione_responsabile_id_fkey"
            columns: ["responsabile_id"]
            isOneToOne: false
            referencedRelation: "tecnici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fasi_produzione_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
        ]
      }
      fatture: {
        Row: {
          aliquota_iva_cassa: string | null
          anno: number
          bollo: number
          cliente_cf: string | null
          cliente_codice_sdi: string | null
          cliente_denominazione: string
          cliente_id: string
          cliente_indirizzo: string
          cliente_pec: string | null
          cliente_piva: string | null
          codice_cig: string | null
          codice_cup: string | null
          codice_esito_sdi: string | null
          codice_iva: string
          created_at: string
          data: string
          data_pagamento: string | null
          deleted_at: string | null
          formato_trasmissione: string
          id: string
          imponibile: number
          imponibile_netto: number | null
          importo_pagato: number
          inviata_at: string | null
          inviata_via: string | null
          iva_importo: number
          iva_percentuale: number
          laboratorio_id: string
          messaggio_esito_sdi: string | null
          natura_iva: string
          nome_file_xml: string | null
          note: string | null
          numero: string
          pagata: boolean
          pdf_url: string | null
          pec_consegnata_at: string | null
          pec_message_id: string | null
          progressivo: number
          progressivo_invio: number | null
          progressivo_sdi: string | null
          ricevuta_sdi_at: string | null
          riferimento_normativo: string | null
          sconto_globale: number
          sdi_risposta_at: string | null
          smtp_inviata_at: string | null
          stato_sdi: string
          tipo_documento: string
          totale: number
          updated_at: string
          xml_errori_sdi: string | null
          xml_fattura_pa: string | null
          xml_hash_sha256: string | null
          xml_inviato_at: string | null
          xml_risposta_sdi: string | null
          xml_sdi_id: string | null
          xml_storage_path: string | null
          xml_url: string | null
        }
        Insert: {
          aliquota_iva_cassa?: string | null
          anno?: number
          bollo?: number
          cliente_cf?: string | null
          cliente_codice_sdi?: string | null
          cliente_denominazione: string
          cliente_id: string
          cliente_indirizzo: string
          cliente_pec?: string | null
          cliente_piva?: string | null
          codice_cig?: string | null
          codice_cup?: string | null
          codice_esito_sdi?: string | null
          codice_iva?: string
          created_at?: string
          data?: string
          data_pagamento?: string | null
          deleted_at?: string | null
          formato_trasmissione?: string
          id?: string
          imponibile?: number
          imponibile_netto?: number | null
          importo_pagato?: number
          inviata_at?: string | null
          inviata_via?: string | null
          iva_importo?: number
          iva_percentuale?: number
          laboratorio_id: string
          messaggio_esito_sdi?: string | null
          natura_iva?: string
          nome_file_xml?: string | null
          note?: string | null
          numero: string
          pagata?: boolean
          pdf_url?: string | null
          pec_consegnata_at?: string | null
          pec_message_id?: string | null
          progressivo: number
          progressivo_invio?: number | null
          progressivo_sdi?: string | null
          ricevuta_sdi_at?: string | null
          riferimento_normativo?: string | null
          sconto_globale?: number
          sdi_risposta_at?: string | null
          smtp_inviata_at?: string | null
          stato_sdi?: string
          tipo_documento?: string
          totale?: number
          updated_at?: string
          xml_errori_sdi?: string | null
          xml_fattura_pa?: string | null
          xml_hash_sha256?: string | null
          xml_inviato_at?: string | null
          xml_risposta_sdi?: string | null
          xml_sdi_id?: string | null
          xml_storage_path?: string | null
          xml_url?: string | null
        }
        Update: {
          aliquota_iva_cassa?: string | null
          anno?: number
          bollo?: number
          cliente_cf?: string | null
          cliente_codice_sdi?: string | null
          cliente_denominazione?: string
          cliente_id?: string
          cliente_indirizzo?: string
          cliente_pec?: string | null
          cliente_piva?: string | null
          codice_cig?: string | null
          codice_cup?: string | null
          codice_esito_sdi?: string | null
          codice_iva?: string
          created_at?: string
          data?: string
          data_pagamento?: string | null
          deleted_at?: string | null
          formato_trasmissione?: string
          id?: string
          imponibile?: number
          imponibile_netto?: number | null
          importo_pagato?: number
          inviata_at?: string | null
          inviata_via?: string | null
          iva_importo?: number
          iva_percentuale?: number
          laboratorio_id?: string
          messaggio_esito_sdi?: string | null
          natura_iva?: string
          nome_file_xml?: string | null
          note?: string | null
          numero?: string
          pagata?: boolean
          pdf_url?: string | null
          pec_consegnata_at?: string | null
          pec_message_id?: string | null
          progressivo?: number
          progressivo_invio?: number | null
          progressivo_sdi?: string | null
          ricevuta_sdi_at?: string | null
          riferimento_normativo?: string | null
          sconto_globale?: number
          sdi_risposta_at?: string | null
          smtp_inviata_at?: string | null
          stato_sdi?: string
          tipo_documento?: string
          totale?: number
          updated_at?: string
          xml_errori_sdi?: string | null
          xml_fattura_pa?: string | null
          xml_hash_sha256?: string | null
          xml_inviato_at?: string | null
          xml_risposta_sdi?: string | null
          xml_sdi_id?: string | null
          xml_storage_path?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fatture_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "partitario_clienti"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "fatture_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      fatture_pagamenti: {
        Row: {
          created_at: string
          data_scadenza: string
          deleted_at: string | null
          fattura_id: string
          iban_addebito: string | null
          id: string
          importo: number
          importo_pagato: number | null
          laboratorio_id: string
          modalita: string | null
          note: string | null
          pagato_at: string | null
          riferimento: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_scadenza: string
          deleted_at?: string | null
          fattura_id: string
          iban_addebito?: string | null
          id?: string
          importo: number
          importo_pagato?: number | null
          laboratorio_id: string
          modalita?: string | null
          note?: string | null
          pagato_at?: string | null
          riferimento?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_scadenza?: string
          deleted_at?: string | null
          fattura_id?: string
          iban_addebito?: string | null
          id?: string
          importo?: number
          importo_pagato?: number | null
          laboratorio_id?: string
          modalita?: string | null
          note?: string | null
          pagato_at?: string | null
          riferimento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fatture_pagamenti_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_pagamenti_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture_da_inviare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_pagamenti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      fatture_righe: {
        Row: {
          aliquota_iva: number
          codice_articolo: string | null
          codice_iva: string
          created_at: string
          deleted_at: string | null
          descrizione: string
          fattura_id: string
          id: string
          importo: number
          laboratorio_id: string
          lavoro_id: string | null
          listino_id: string | null
          natura_iva: string
          numero_linea: number
          prezzo_unitario: number
          quantita: number
          sconto_percentuale: number
          tipo_codice: string | null
          unita_misura: string
          updated_at: string
        }
        Insert: {
          aliquota_iva?: number
          codice_articolo?: string | null
          codice_iva?: string
          created_at?: string
          deleted_at?: string | null
          descrizione: string
          fattura_id: string
          id?: string
          importo: number
          laboratorio_id: string
          lavoro_id?: string | null
          listino_id?: string | null
          natura_iva?: string
          numero_linea: number
          prezzo_unitario: number
          quantita?: number
          sconto_percentuale?: number
          tipo_codice?: string | null
          unita_misura?: string
          updated_at?: string
        }
        Update: {
          aliquota_iva?: number
          codice_articolo?: string | null
          codice_iva?: string
          created_at?: string
          deleted_at?: string | null
          descrizione?: string
          fattura_id?: string
          id?: string
          importo?: number
          laboratorio_id?: string
          lavoro_id?: string | null
          listino_id?: string | null
          natura_iva?: string
          numero_linea?: number
          prezzo_unitario?: number
          quantita?: number
          sconto_percentuale?: number
          tipo_codice?: string | null
          unita_misura?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fatture_righe_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_righe_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture_da_inviare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_righe_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_righe_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_righe_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_righe_listino_id_fkey"
            columns: ["listino_id"]
            isOneToOne: false
            referencedRelation: "listino"
            referencedColumns: ["id"]
          },
        ]
      }
      fornitori: {
        Row: {
          attivo: boolean
          cap: string | null
          citta: string | null
          codice_fiscale: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          giorni_pagamento: number | null
          iban: string | null
          id: string
          indirizzo: string | null
          laboratorio_id: string
          modalita_pagamento: string | null
          note: string | null
          paese: string
          partita_iva: string | null
          provincia: string | null
          ragione_sociale: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          giorni_pagamento?: number | null
          iban?: string | null
          id?: string
          indirizzo?: string | null
          laboratorio_id: string
          modalita_pagamento?: string | null
          note?: string | null
          paese?: string
          partita_iva?: string | null
          provincia?: string | null
          ragione_sociale: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          giorni_pagamento?: number | null
          iban?: string | null
          id?: string
          indirizzo?: string | null
          laboratorio_id?: string
          modalita_pagamento?: string | null
          note?: string | null
          paese?: string
          partita_iva?: string | null
          provincia?: string | null
          ragione_sociale?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornitori_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      incidenti_mdr: {
        Row: {
          azione_correttiva: string | null
          azione_immediata: string | null
          azione_preventiva: string | null
          causa_probabile: string | null
          created_at: string
          data_evento: string
          data_risoluzione: string | null
          data_segnalazione: string | null
          deleted_at: string | null
          descrizione: string
          gravita: string
          id: string
          laboratorio_id: string
          lavoro_id: string | null
          numero_segnalazione: string | null
          risolto: boolean
          segnalato_ministero: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          azione_correttiva?: string | null
          azione_immediata?: string | null
          azione_preventiva?: string | null
          causa_probabile?: string | null
          created_at?: string
          data_evento: string
          data_risoluzione?: string | null
          data_segnalazione?: string | null
          deleted_at?: string | null
          descrizione: string
          gravita?: string
          id?: string
          laboratorio_id: string
          lavoro_id?: string | null
          numero_segnalazione?: string | null
          risolto?: boolean
          segnalato_ministero?: boolean
          tipo?: string
          updated_at?: string
        }
        Update: {
          azione_correttiva?: string | null
          azione_immediata?: string | null
          azione_preventiva?: string | null
          causa_probabile?: string | null
          created_at?: string
          data_evento?: string
          data_risoluzione?: string | null
          data_segnalazione?: string | null
          deleted_at?: string | null
          descrizione?: string
          gravita?: string
          id?: string
          laboratorio_id?: string
          lavoro_id?: string | null
          numero_segnalazione?: string | null
          risolto?: boolean
          segnalato_ministero?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidenti_mdr_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidenti_mdr_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidenti_mdr_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      inviti: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          laboratorio_id: string
          ruolo: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          laboratorio_id: string
          ruolo: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          laboratorio_id?: string
          ruolo?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "inviti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      inviti_rete: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitato_da: string
          rete_id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitato_da: string
          rete_id: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitato_da?: string
          rete_id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "inviti_rete_invitato_da_fkey"
            columns: ["invitato_da"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inviti_rete_rete_id_fkey"
            columns: ["rete_id"]
            isOneToOne: false
            referencedRelation: "reti"
            referencedColumns: ["id"]
          },
        ]
      }
      istruzioni_uso: {
        Row: {
          created_at: string
          deleted_at: string | null
          formato: string | null
          id: string
          laboratorio_id: string
          lavoro_id: string
          pdf_url: string | null
          tipo: string
          updated_at: string
          versione: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          formato?: string | null
          id?: string
          laboratorio_id: string
          lavoro_id: string
          pdf_url?: string | null
          tipo: string
          updated_at?: string
          versione?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          formato?: string | null
          id?: string
          laboratorio_id?: string
          lavoro_id?: string
          pdf_url?: string | null
          tipo?: string
          updated_at?: string
          versione?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "istruzioni_uso_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "istruzioni_uso_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "istruzioni_uso_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_memberships: {
        Row: {
          attivo: boolean
          created_at: string
          id: string
          laboratorio_id: string
          ruolo: string
          user_id: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          id?: string
          laboratorio_id: string
          ruolo: string
          user_id: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          id?: string
          laboratorio_id?: string
          ruolo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_memberships_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_stato_log: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          laboratorio_id: string
          source: string
          stato_from: string | null
          stato_to: string
          stripe_event_id: string | null
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          laboratorio_id: string
          source: string
          stato_from?: string | null
          stato_to: string
          stripe_event_id?: string | null
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          laboratorio_id?: string
          source?: string
          stato_from?: string | null
          stato_to?: string
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_stato_log_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      laboratori: {
        Row: {
          anno_prima_marcatura: string | null
          bollo_default_attivo: boolean
          cap: string | null
          citta: string | null
          codice_fiscale: string | null
          codice_itca: string | null
          codice_iva_default: string
          created_at: string
          deleted_at: string | null
          deletion_scheduled_at: string | null
          email: string | null
          expired_at: string | null
          export_until: string | null
          firma_ddc_url: string | null
          firma_url: string | null
          id: string
          importo_bollo: number
          indirizzo: string | null
          intestazione_buono: string | null
          intestazione_ddc: string | null
          intestazione_fattura: string | null
          last_stripe_event_at: string | null
          last_stripe_event_id: string | null
          logo_print_url: string | null
          logo_url: string | null
          nome: string
          nota_iva_fattura: string | null
          numero_albo: string | null
          numero_rea: string | null
          onboarding_completato: boolean
          partita_iva: string | null
          pec: string | null
          pec_host: string | null
          pec_port: number | null
          pec_smtp_configurata: boolean
          pec_user: string | null
          pec_vault_key_id: string | null
          pec_verificata: boolean
          pec_verified_at: string | null
          pec_verify_token: string | null
          piano: string
          piano_trial_scade_at: string | null
          progressivo_sdi: number
          provincia: string | null
          prrc_nome: string | null
          prrc_qualifica: string | null
          ragione_sociale: string | null
          regime_fiscale: string
          sfondo_ddc_url: string | null
          soglia_bollo: number
          srn_eudamed: string | null
          stato: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          suspended_at: string | null
          telefono: string | null
          testo_rischi_default: string | null
          timbro_url: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          anno_prima_marcatura?: string | null
          bollo_default_attivo?: boolean
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          codice_itca?: string | null
          codice_iva_default?: string
          created_at?: string
          deleted_at?: string | null
          deletion_scheduled_at?: string | null
          email?: string | null
          expired_at?: string | null
          export_until?: string | null
          firma_ddc_url?: string | null
          firma_url?: string | null
          id?: string
          importo_bollo?: number
          indirizzo?: string | null
          intestazione_buono?: string | null
          intestazione_ddc?: string | null
          intestazione_fattura?: string | null
          last_stripe_event_at?: string | null
          last_stripe_event_id?: string | null
          logo_print_url?: string | null
          logo_url?: string | null
          nome: string
          nota_iva_fattura?: string | null
          numero_albo?: string | null
          numero_rea?: string | null
          onboarding_completato?: boolean
          partita_iva?: string | null
          pec?: string | null
          pec_host?: string | null
          pec_port?: number | null
          pec_smtp_configurata?: boolean
          pec_user?: string | null
          pec_vault_key_id?: string | null
          pec_verificata?: boolean
          pec_verified_at?: string | null
          pec_verify_token?: string | null
          piano?: string
          piano_trial_scade_at?: string | null
          progressivo_sdi?: number
          provincia?: string | null
          prrc_nome?: string | null
          prrc_qualifica?: string | null
          ragione_sociale?: string | null
          regime_fiscale?: string
          sfondo_ddc_url?: string | null
          soglia_bollo?: number
          srn_eudamed?: string | null
          stato?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          suspended_at?: string | null
          telefono?: string | null
          testo_rischi_default?: string | null
          timbro_url?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          anno_prima_marcatura?: string | null
          bollo_default_attivo?: boolean
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          codice_itca?: string | null
          codice_iva_default?: string
          created_at?: string
          deleted_at?: string | null
          deletion_scheduled_at?: string | null
          email?: string | null
          expired_at?: string | null
          export_until?: string | null
          firma_ddc_url?: string | null
          firma_url?: string | null
          id?: string
          importo_bollo?: number
          indirizzo?: string | null
          intestazione_buono?: string | null
          intestazione_ddc?: string | null
          intestazione_fattura?: string | null
          last_stripe_event_at?: string | null
          last_stripe_event_id?: string | null
          logo_print_url?: string | null
          logo_url?: string | null
          nome?: string
          nota_iva_fattura?: string | null
          numero_albo?: string | null
          numero_rea?: string | null
          onboarding_completato?: boolean
          partita_iva?: string | null
          pec?: string | null
          pec_host?: string | null
          pec_port?: number | null
          pec_smtp_configurata?: boolean
          pec_user?: string | null
          pec_vault_key_id?: string | null
          pec_verificata?: boolean
          pec_verified_at?: string | null
          pec_verify_token?: string | null
          piano?: string
          piano_trial_scade_at?: string | null
          progressivo_sdi?: number
          provincia?: string | null
          prrc_nome?: string | null
          prrc_qualifica?: string | null
          ragione_sociale?: string | null
          regime_fiscale?: string
          sfondo_ddc_url?: string | null
          soglia_bollo?: number
          srn_eudamed?: string | null
          stato?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          suspended_at?: string | null
          telefono?: string | null
          testo_rischi_default?: string | null
          timbro_url?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lavori: {
        Row: {
          anamnesi_altri_dispositivi: string | null
          anamnesi_bruxismo: boolean
          anamnesi_difficolta_manuali: boolean
          anamnesi_note: string | null
          anamnesi_precauzioni: string | null
          anno_lavoro: number
          arcata: string | null
          buono_numero: string | null
          buono_pdf_url: string | null
          buono_storage_path: string | null
          ciclo_id: string | null
          classe_rischio: string
          cliente_id: string
          codice_interno: string | null
          codice_iva: string
          colorazione_esterna: string | null
          colore_collo: string | null
          colore_corpo: string | null
          colore_dente: string | null
          colore_incisale: string | null
          conformato: boolean
          consegna_completata_at: string | null
          consegna_in_corso: boolean
          consegna_precheck_passato_al_primo_tentativo: boolean | null
          consegna_tap_at: string | null
          created_at: string
          da_conformare: boolean
          data_conformazione: string | null
          data_consegna_effettiva: string | null
          data_consegna_prevista: string
          data_ingresso: string
          data_prima_prova: string | null
          data_seconda_prova: string | null
          data_terza_prova: string | null
          decisione_fatturazione: string
          deleted_at: string | null
          denti_coinvolti: string[] | null
          denti_impianti: number[]
          denti_mancanti: number[]
          descrizione: string
          disinfettante_usato: string | null
          dispositivo_semilavorato: boolean
          effetti_speciali: string | null
          file_stl_url: string | null
          id: string
          immagini_urls: string[] | null
          impronta_digitale: boolean
          incluso_in_fattura: boolean
          is_rifacimento: boolean
          laboratorio_id: string
          listino_id: string | null
          lotto_disinfettante: string | null
          materiali_allegati: string[]
          materiali_incompleti_dettaglio: Json | null
          natura_iva: string
          norma_riferimento: string | null
          note_interne: string | null
          numero_cassetta: string | null
          numero_lavoro: string
          numero_prescrizione: string | null
          ora_consegna: string | null
          paziente_id: string | null
          paziente_nascita_snapshot: string | null
          paziente_nome_snapshot: string | null
          post_consegna_correzioni: number
          prescrizione_digitale_id: string | null
          prezzo_unitario: number | null
          priorita: string
          richiedente_email: string | null
          richiedente_nome: string | null
          rifacimento_motivo: string | null
          segnalazione_at: string | null
          segnalazione_by: string | null
          segnalazione_nota: string | null
          segnalazione_risolta: boolean
          segnalazione_tipo: string | null
          spedizione_corriere: string | null
          spedizione_data_prevista: string | null
          spedizione_note: string | null
          spedizione_stato: string | null
          spedizione_tracking: string | null
          stato: string
          stato_fisico: string | null
          tecnica_colore: string | null
          tecnico_id: string | null
          tipo_arco: string | null
          tipo_dispositivo: string
          tipo_impronte: string | null
          tracciabilita_materiali_ok: boolean
          updated_at: string
        }
        Insert: {
          anamnesi_altri_dispositivi?: string | null
          anamnesi_bruxismo?: boolean
          anamnesi_difficolta_manuali?: boolean
          anamnesi_note?: string | null
          anamnesi_precauzioni?: string | null
          anno_lavoro?: number
          arcata?: string | null
          buono_numero?: string | null
          buono_pdf_url?: string | null
          buono_storage_path?: string | null
          ciclo_id?: string | null
          classe_rischio?: string
          cliente_id: string
          codice_interno?: string | null
          codice_iva?: string
          colorazione_esterna?: string | null
          colore_collo?: string | null
          colore_corpo?: string | null
          colore_dente?: string | null
          colore_incisale?: string | null
          conformato?: boolean
          consegna_completata_at?: string | null
          consegna_in_corso?: boolean
          consegna_precheck_passato_al_primo_tentativo?: boolean | null
          consegna_tap_at?: string | null
          created_at?: string
          da_conformare?: boolean
          data_conformazione?: string | null
          data_consegna_effettiva?: string | null
          data_consegna_prevista: string
          data_ingresso?: string
          data_prima_prova?: string | null
          data_seconda_prova?: string | null
          data_terza_prova?: string | null
          decisione_fatturazione?: string
          deleted_at?: string | null
          denti_coinvolti?: string[] | null
          denti_impianti?: number[]
          denti_mancanti?: number[]
          descrizione: string
          disinfettante_usato?: string | null
          dispositivo_semilavorato?: boolean
          effetti_speciali?: string | null
          file_stl_url?: string | null
          id?: string
          immagini_urls?: string[] | null
          impronta_digitale?: boolean
          incluso_in_fattura?: boolean
          is_rifacimento?: boolean
          laboratorio_id: string
          listino_id?: string | null
          lotto_disinfettante?: string | null
          materiali_allegati?: string[]
          materiali_incompleti_dettaglio?: Json | null
          natura_iva?: string
          norma_riferimento?: string | null
          note_interne?: string | null
          numero_cassetta?: string | null
          numero_lavoro: string
          numero_prescrizione?: string | null
          ora_consegna?: string | null
          paziente_id?: string | null
          paziente_nascita_snapshot?: string | null
          paziente_nome_snapshot?: string | null
          post_consegna_correzioni?: number
          prescrizione_digitale_id?: string | null
          prezzo_unitario?: number | null
          priorita?: string
          richiedente_email?: string | null
          richiedente_nome?: string | null
          rifacimento_motivo?: string | null
          segnalazione_at?: string | null
          segnalazione_by?: string | null
          segnalazione_nota?: string | null
          segnalazione_risolta?: boolean
          segnalazione_tipo?: string | null
          spedizione_corriere?: string | null
          spedizione_data_prevista?: string | null
          spedizione_note?: string | null
          spedizione_stato?: string | null
          spedizione_tracking?: string | null
          stato?: string
          stato_fisico?: string | null
          tecnica_colore?: string | null
          tecnico_id?: string | null
          tipo_arco?: string | null
          tipo_dispositivo: string
          tipo_impronte?: string | null
          tracciabilita_materiali_ok?: boolean
          updated_at?: string
        }
        Update: {
          anamnesi_altri_dispositivi?: string | null
          anamnesi_bruxismo?: boolean
          anamnesi_difficolta_manuali?: boolean
          anamnesi_note?: string | null
          anamnesi_precauzioni?: string | null
          anno_lavoro?: number
          arcata?: string | null
          buono_numero?: string | null
          buono_pdf_url?: string | null
          buono_storage_path?: string | null
          ciclo_id?: string | null
          classe_rischio?: string
          cliente_id?: string
          codice_interno?: string | null
          codice_iva?: string
          colorazione_esterna?: string | null
          colore_collo?: string | null
          colore_corpo?: string | null
          colore_dente?: string | null
          colore_incisale?: string | null
          conformato?: boolean
          consegna_completata_at?: string | null
          consegna_in_corso?: boolean
          consegna_precheck_passato_al_primo_tentativo?: boolean | null
          consegna_tap_at?: string | null
          created_at?: string
          da_conformare?: boolean
          data_conformazione?: string | null
          data_consegna_effettiva?: string | null
          data_consegna_prevista?: string
          data_ingresso?: string
          data_prima_prova?: string | null
          data_seconda_prova?: string | null
          data_terza_prova?: string | null
          decisione_fatturazione?: string
          deleted_at?: string | null
          denti_coinvolti?: string[] | null
          denti_impianti?: number[]
          denti_mancanti?: number[]
          descrizione?: string
          disinfettante_usato?: string | null
          dispositivo_semilavorato?: boolean
          effetti_speciali?: string | null
          file_stl_url?: string | null
          id?: string
          immagini_urls?: string[] | null
          impronta_digitale?: boolean
          incluso_in_fattura?: boolean
          is_rifacimento?: boolean
          laboratorio_id?: string
          listino_id?: string | null
          lotto_disinfettante?: string | null
          materiali_allegati?: string[]
          materiali_incompleti_dettaglio?: Json | null
          natura_iva?: string
          norma_riferimento?: string | null
          note_interne?: string | null
          numero_cassetta?: string | null
          numero_lavoro?: string
          numero_prescrizione?: string | null
          ora_consegna?: string | null
          paziente_id?: string | null
          paziente_nascita_snapshot?: string | null
          paziente_nome_snapshot?: string | null
          post_consegna_correzioni?: number
          prescrizione_digitale_id?: string | null
          prezzo_unitario?: number | null
          priorita?: string
          richiedente_email?: string | null
          richiedente_nome?: string | null
          rifacimento_motivo?: string | null
          segnalazione_at?: string | null
          segnalazione_by?: string | null
          segnalazione_nota?: string | null
          segnalazione_risolta?: boolean
          segnalazione_tipo?: string | null
          spedizione_corriere?: string | null
          spedizione_data_prevista?: string | null
          spedizione_note?: string | null
          spedizione_stato?: string | null
          spedizione_tracking?: string | null
          stato?: string
          stato_fisico?: string | null
          tecnica_colore?: string | null
          tecnico_id?: string | null
          tipo_arco?: string | null
          tipo_dispositivo?: string
          tipo_impronte?: string | null
          tracciabilita_materiali_ok?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lavori_prescrizione"
            columns: ["prescrizione_digitale_id"]
            isOneToOne: false
            referencedRelation: "prescrizioni_digitali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "cicli_produzione"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "partitario_clienti"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "lavori_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_listino_id_fkey"
            columns: ["listino_id"]
            isOneToOne: false
            referencedRelation: "listino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_paziente_id_fkey"
            columns: ["paziente_id"]
            isOneToOne: false
            referencedRelation: "pazienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_segnalazione_by_fkey"
            columns: ["segnalazione_by"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnici"
            referencedColumns: ["id"]
          },
        ]
      }
      lavori_appuntamenti: {
        Row: {
          completato: boolean
          created_at: string
          data_appuntamento: string
          deleted_at: string | null
          esito: string | null
          id: string
          laboratorio_id: string
          lavoro_id: string
          note: string | null
          numero_prova: number | null
          ora_appuntamento: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          completato?: boolean
          created_at?: string
          data_appuntamento: string
          deleted_at?: string | null
          esito?: string | null
          id?: string
          laboratorio_id: string
          lavoro_id: string
          note?: string | null
          numero_prova?: number | null
          ora_appuntamento?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          completato?: boolean
          created_at?: string
          data_appuntamento?: string
          deleted_at?: string | null
          esito?: string | null
          id?: string
          laboratorio_id?: string
          lavoro_id?: string
          note?: string | null
          numero_prova?: number | null
          ora_appuntamento?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavori_appuntamenti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_appuntamenti_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_appuntamenti_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      lavori_fasi: {
        Row: {
          attrezzatura_usata: string | null
          azione_correttiva: string | null
          created_at: string
          deleted_at: string | null
          eseguita_at: string | null
          esito: string | null
          fase_id: string
          id: string
          laboratorio_id: string
          lavoro_id: string
          materiali_usati: string | null
          non_conforme: boolean
          note: string | null
          tecnico_id: string | null
          updated_at: string
          valore_misurato: string | null
        }
        Insert: {
          attrezzatura_usata?: string | null
          azione_correttiva?: string | null
          created_at?: string
          deleted_at?: string | null
          eseguita_at?: string | null
          esito?: string | null
          fase_id: string
          id?: string
          laboratorio_id: string
          lavoro_id: string
          materiali_usati?: string | null
          non_conforme?: boolean
          note?: string | null
          tecnico_id?: string | null
          updated_at?: string
          valore_misurato?: string | null
        }
        Update: {
          attrezzatura_usata?: string | null
          azione_correttiva?: string | null
          created_at?: string
          deleted_at?: string | null
          eseguita_at?: string | null
          esito?: string | null
          fase_id?: string
          id?: string
          laboratorio_id?: string
          lavoro_id?: string
          materiali_usati?: string | null
          non_conforme?: boolean
          note?: string | null
          tecnico_id?: string | null
          updated_at?: string
          valore_misurato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lavori_fasi_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fasi_produzione"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_fasi_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_fasi_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_fasi_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_fasi_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnici"
            referencedColumns: ["id"]
          },
        ]
      }
      lavori_immagini: {
        Row: {
          created_at: string
          data_scatto: string | null
          deleted_at: string | null
          descrizione: string | null
          id: string
          laboratorio_id: string
          lavoro_id: string
          nome_file: string | null
          ordine: number
          storage_path: string
          tipo: string
          url: string
        }
        Insert: {
          created_at?: string
          data_scatto?: string | null
          deleted_at?: string | null
          descrizione?: string | null
          id?: string
          laboratorio_id: string
          lavoro_id: string
          nome_file?: string | null
          ordine?: number
          storage_path: string
          tipo?: string
          url: string
        }
        Update: {
          created_at?: string
          data_scatto?: string | null
          deleted_at?: string | null
          descrizione?: string | null
          id?: string
          laboratorio_id?: string
          lavoro_id?: string
          nome_file?: string | null
          ordine?: number
          storage_path?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavori_immagini_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_immagini_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_immagini_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      lavori_lavorazioni: {
        Row: {
          calo: number | null
          codice: string
          codice_iva: string
          created_at: string
          deleted_at: string | null
          descrizione: string
          esterna: boolean
          id: string
          importo: number
          lab_esterno: string | null
          laboratorio_id: string
          lavoro_id: string
          listino_id: string | null
          maggiorazione: number
          natura_iva: string
          ordine: number
          prezzo_unitario: number
          quantita: number
          sconto_percentuale: number
          unita_misura: string
          updated_at: string
        }
        Insert: {
          calo?: number | null
          codice: string
          codice_iva?: string
          created_at?: string
          deleted_at?: string | null
          descrizione: string
          esterna?: boolean
          id?: string
          importo: number
          lab_esterno?: string | null
          laboratorio_id: string
          lavoro_id: string
          listino_id?: string | null
          maggiorazione?: number
          natura_iva?: string
          ordine?: number
          prezzo_unitario: number
          quantita?: number
          sconto_percentuale?: number
          unita_misura?: string
          updated_at?: string
        }
        Update: {
          calo?: number | null
          codice?: string
          codice_iva?: string
          created_at?: string
          deleted_at?: string | null
          descrizione?: string
          esterna?: boolean
          id?: string
          importo?: number
          lab_esterno?: string | null
          laboratorio_id?: string
          lavoro_id?: string
          listino_id?: string | null
          maggiorazione?: number
          natura_iva?: string
          ordine?: number
          prezzo_unitario?: number
          quantita?: number
          sconto_percentuale?: number
          unita_misura?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavori_lavorazioni_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_lavorazioni_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_lavorazioni_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_lavorazioni_listino_id_fkey"
            columns: ["listino_id"]
            isOneToOne: false
            referencedRelation: "listino"
            referencedColumns: ["id"]
          },
        ]
      }
      lavori_materiali: {
        Row: {
          created_at: string
          data_uso: string
          deleted_at: string | null
          id: string
          laboratorio_id: string
          lavoro_id: string
          lotto_id: string
          magazzino_id: string
          nome_materiale_snapshot: string
          numero_lotto_snapshot: string
          produttore_snapshot: string | null
          quantita_usata: number
          unita_misura: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_uso?: string
          deleted_at?: string | null
          id?: string
          laboratorio_id: string
          lavoro_id: string
          lotto_id: string
          magazzino_id: string
          nome_materiale_snapshot: string
          numero_lotto_snapshot: string
          produttore_snapshot?: string | null
          quantita_usata: number
          unita_misura: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_uso?: string
          deleted_at?: string | null
          id?: string
          laboratorio_id?: string
          lavoro_id?: string
          lotto_id?: string
          magazzino_id?: string
          nome_materiale_snapshot?: string
          numero_lotto_snapshot?: string
          produttore_snapshot?: string | null
          quantita_usata?: number
          unita_misura?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavori_materiali_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_materiali_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_materiali_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_materiali_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "lotti_magazzino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_materiali_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_materiali_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino_sotto_scorta"
            referencedColumns: ["id"]
          },
        ]
      }
      lavori_rifacimenti: {
        Row: {
          costo_interno: number | null
          created_at: string
          created_by: string | null
          id: string
          laboratorio_id: string
          lavoro_nuovo_id: string
          lavoro_originale_id: string
          motivo: string
          note: string | null
          rilevato_in: string | null
        }
        Insert: {
          costo_interno?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          laboratorio_id: string
          lavoro_nuovo_id: string
          lavoro_originale_id: string
          motivo: string
          note?: string | null
          rilevato_in?: string | null
        }
        Update: {
          costo_interno?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          laboratorio_id?: string
          lavoro_nuovo_id?: string
          lavoro_originale_id?: string
          motivo?: string
          note?: string | null
          rilevato_in?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lavori_rifacimenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_rifacimenti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_rifacimenti_lavoro_nuovo_id_fkey"
            columns: ["lavoro_nuovo_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_rifacimenti_lavoro_nuovo_id_fkey"
            columns: ["lavoro_nuovo_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_rifacimenti_lavoro_originale_id_fkey"
            columns: ["lavoro_originale_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavori_rifacimenti_lavoro_originale_id_fkey"
            columns: ["lavoro_originale_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      lavoro_prove: {
        Row: {
          created_at: string
          created_by: string | null
          data_rientro_effettiva: string | null
          data_rientro_prevista: string | null
          data_uscita: string
          esito: string | null
          foto_url: string | null
          id: string
          laboratorio_id: string
          lavoro_id: string
          note_dentista: string | null
          numero_prova: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_rientro_effettiva?: string | null
          data_rientro_prevista?: string | null
          data_uscita?: string
          esito?: string | null
          foto_url?: string | null
          id?: string
          laboratorio_id: string
          lavoro_id: string
          note_dentista?: string | null
          numero_prova?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_rientro_effettiva?: string | null
          data_rientro_prevista?: string | null
          data_uscita?: string
          esito?: string | null
          foto_url?: string | null
          id?: string
          laboratorio_id?: string
          lavoro_id?: string
          note_dentista?: string | null
          numero_prova?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavoro_prove_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavoro_prove_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavoro_prove_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavoro_prove_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      listino: {
        Row: {
          attivo: boolean
          categoria: string
          ciclo_id: string | null
          classe_rischio: string | null
          codice: string
          codice_iva: string
          compenso_tecnico: number | null
          costo_materiali_estimated: number | null
          created_at: string
          da_conformare: boolean
          deleted_at: string | null
          descrizione: string | null
          id: string
          laboratorio_id: string
          nome: string
          norma_riferimento: string | null
          prezzo_1: number | null
          prezzo_2: number | null
          prezzo_3: number | null
          prezzo_4: number | null
          tipo_dispositivo_mdr: string | null
          unita_misura: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          categoria?: string
          ciclo_id?: string | null
          classe_rischio?: string | null
          codice: string
          codice_iva?: string
          compenso_tecnico?: number | null
          costo_materiali_estimated?: number | null
          created_at?: string
          da_conformare?: boolean
          deleted_at?: string | null
          descrizione?: string | null
          id?: string
          laboratorio_id: string
          nome: string
          norma_riferimento?: string | null
          prezzo_1?: number | null
          prezzo_2?: number | null
          prezzo_3?: number | null
          prezzo_4?: number | null
          tipo_dispositivo_mdr?: string | null
          unita_misura?: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          categoria?: string
          ciclo_id?: string | null
          classe_rischio?: string | null
          codice?: string
          codice_iva?: string
          compenso_tecnico?: number | null
          costo_materiali_estimated?: number | null
          created_at?: string
          da_conformare?: boolean
          deleted_at?: string | null
          descrizione?: string | null
          id?: string
          laboratorio_id?: string
          nome?: string
          norma_riferimento?: string | null
          prezzo_1?: number | null
          prezzo_2?: number | null
          prezzo_3?: number | null
          prezzo_4?: number | null
          tipo_dispositivo_mdr?: string | null
          unita_misura?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_listino_ciclo"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "cicli_produzione"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listino_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      listino_materiali_auto: {
        Row: {
          created_at: string
          id: string
          laboratorio_id: string
          listino_id: string
          magazzino_id: string
          quantita_per_unita: number
          unita_misura: string
        }
        Insert: {
          created_at?: string
          id?: string
          laboratorio_id: string
          listino_id: string
          magazzino_id: string
          quantita_per_unita?: number
          unita_misura?: string
        }
        Update: {
          created_at?: string
          id?: string
          laboratorio_id?: string
          listino_id?: string
          magazzino_id?: string
          quantita_per_unita?: number
          unita_misura?: string
        }
        Relationships: [
          {
            foreignKeyName: "listino_materiali_auto_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listino_materiali_auto_listino_id_fkey"
            columns: ["listino_id"]
            isOneToOne: false
            referencedRelation: "listino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listino_materiali_auto_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listino_materiali_auto_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino_sotto_scorta"
            referencedColumns: ["id"]
          },
        ]
      }
      listino_prezzi_tier: {
        Row: {
          id: string
          laboratorio_id: string
          lavorazione_id: string
          prezzo: number
          tier: number
        }
        Insert: {
          id?: string
          laboratorio_id: string
          lavorazione_id: string
          prezzo: number
          tier: number
        }
        Update: {
          id?: string
          laboratorio_id?: string
          lavorazione_id?: string
          prezzo?: number
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "listino_prezzi_tier_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listino_prezzi_tier_lavorazione_id_fkey"
            columns: ["lavorazione_id"]
            isOneToOne: false
            referencedRelation: "listino"
            referencedColumns: ["id"]
          },
        ]
      }
      lookup_valori: {
        Row: {
          attivo: boolean
          codice: string
          created_at: string
          id: string
          note: string | null
          ordine: number
          tipo: string
          valore_it: string
        }
        Insert: {
          attivo?: boolean
          codice: string
          created_at?: string
          id?: string
          note?: string | null
          ordine?: number
          tipo: string
          valore_it: string
        }
        Update: {
          attivo?: boolean
          codice?: string
          created_at?: string
          id?: string
          note?: string | null
          ordine?: number
          tipo?: string
          valore_it?: string
        }
        Relationships: []
      }
      lotti_magazzino: {
        Row: {
          altro_codice: string | null
          attivo: boolean
          costo_acquisto: number | null
          created_at: string
          data_acquisto: string | null
          data_ricezione: string | null
          data_scadenza: string | null
          deleted_at: string | null
          documento_acquisto_url: string | null
          id: string
          laboratorio_id: string
          magazzino_id: string
          note: string | null
          numero_lotto: string
          quantita_acquistata: number
          quantita_residua: number
          updated_at: string
        }
        Insert: {
          altro_codice?: string | null
          attivo?: boolean
          costo_acquisto?: number | null
          created_at?: string
          data_acquisto?: string | null
          data_ricezione?: string | null
          data_scadenza?: string | null
          deleted_at?: string | null
          documento_acquisto_url?: string | null
          id?: string
          laboratorio_id: string
          magazzino_id: string
          note?: string | null
          numero_lotto: string
          quantita_acquistata: number
          quantita_residua: number
          updated_at?: string
        }
        Update: {
          altro_codice?: string | null
          attivo?: boolean
          costo_acquisto?: number | null
          created_at?: string
          data_acquisto?: string | null
          data_ricezione?: string | null
          data_scadenza?: string | null
          deleted_at?: string | null
          documento_acquisto_url?: string | null
          id?: string
          laboratorio_id?: string
          magazzino_id?: string
          note?: string | null
          numero_lotto?: string
          quantita_acquistata?: number
          quantita_residua?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotti_magazzino_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotti_magazzino_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotti_magazzino_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino_sotto_scorta"
            referencedColumns: ["id"]
          },
        ]
      }
      magazzino: {
        Row: {
          aliquota_iva: number
          attivo: boolean
          categoria: string | null
          codice_articolo: string
          codice_articolo_fornitore: string | null
          codice_ce: string | null
          codice_smaltimento: string | null
          conf_da_ordinare: number | null
          costo_confezione: number | null
          costo_unitario: number | null
          created_at: string
          deleted_at: string | null
          dispositivo_medico: boolean
          fornitore_id: string | null
          id: string
          laboratorio_id: string
          nome: string
          note: string | null
          prezzo_unitario: number | null
          produttore: string | null
          quantita_per_confezione: number | null
          scheda_sicurezza_url: string | null
          scheda_tecnica_url: string | null
          scorta_attuale: number
          scorta_minima: number
          sotto_categoria: string | null
          traccia_lotto: boolean
          um_acquisto: string
          um_scarico: string
          updated_at: string
        }
        Insert: {
          aliquota_iva?: number
          attivo?: boolean
          categoria?: string | null
          codice_articolo: string
          codice_articolo_fornitore?: string | null
          codice_ce?: string | null
          codice_smaltimento?: string | null
          conf_da_ordinare?: number | null
          costo_confezione?: number | null
          costo_unitario?: number | null
          created_at?: string
          deleted_at?: string | null
          dispositivo_medico?: boolean
          fornitore_id?: string | null
          id?: string
          laboratorio_id: string
          nome: string
          note?: string | null
          prezzo_unitario?: number | null
          produttore?: string | null
          quantita_per_confezione?: number | null
          scheda_sicurezza_url?: string | null
          scheda_tecnica_url?: string | null
          scorta_attuale?: number
          scorta_minima?: number
          sotto_categoria?: string | null
          traccia_lotto?: boolean
          um_acquisto?: string
          um_scarico?: string
          updated_at?: string
        }
        Update: {
          aliquota_iva?: number
          attivo?: boolean
          categoria?: string | null
          codice_articolo?: string
          codice_articolo_fornitore?: string | null
          codice_ce?: string | null
          codice_smaltimento?: string | null
          conf_da_ordinare?: number | null
          costo_confezione?: number | null
          costo_unitario?: number | null
          created_at?: string
          deleted_at?: string | null
          dispositivo_medico?: boolean
          fornitore_id?: string | null
          id?: string
          laboratorio_id?: string
          nome?: string
          note?: string | null
          prezzo_unitario?: number | null
          produttore?: string | null
          quantita_per_confezione?: number | null
          scheda_sicurezza_url?: string | null
          scheda_tecnica_url?: string | null
          scorta_attuale?: number
          scorta_minima?: number
          sotto_categoria?: string | null
          traccia_lotto?: boolean
          um_acquisto?: string
          um_scarico?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "magazzino_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "fornitori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magazzino_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      messaggi: {
        Row: {
          allegati_urls: string[] | null
          cliente_id: string | null
          contenuto: string
          created_at: string
          deleted_at: string | null
          direzione: string
          errore: string | null
          id: string
          inviato_at: string | null
          laboratorio_id: string
          lavoro_id: string | null
          letto_at: string | null
          numero_destinatario: string | null
          oggetto: string | null
          stato: string
          tipo: string
          updated_at: string
          utente_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          allegati_urls?: string[] | null
          cliente_id?: string | null
          contenuto: string
          created_at?: string
          deleted_at?: string | null
          direzione: string
          errore?: string | null
          id?: string
          inviato_at?: string | null
          laboratorio_id: string
          lavoro_id?: string | null
          letto_at?: string | null
          numero_destinatario?: string | null
          oggetto?: string | null
          stato?: string
          tipo: string
          updated_at?: string
          utente_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          allegati_urls?: string[] | null
          cliente_id?: string | null
          contenuto?: string
          created_at?: string
          deleted_at?: string | null
          direzione?: string
          errore?: string | null
          id?: string
          inviato_at?: string | null
          laboratorio_id?: string
          lavoro_id?: string | null
          letto_at?: string | null
          numero_destinatario?: string | null
          oggetto?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          utente_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaggi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaggi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "partitario_clienti"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "messaggi_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaggi_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaggi_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaggi_utente_id_fkey"
            columns: ["utente_id"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
        ]
      }
      nomine_prrc: {
        Row: {
          created_at: string
          data_nomina: string
          firma_prrc_url: string | null
          firma_titolare_url: string | null
          id: string
          laboratorio_id: string
          pdf_sha256: string | null
          pdf_url: string | null
          prrc_accettato_at: string | null
          prrc_cognome: string
          prrc_ha_accettato: boolean
          prrc_nome: string
          prrc_numero_albo: string | null
          prrc_qualifica: string | null
          revoca_data: string | null
          revocata: boolean
          updated_at: string
          valida_al: string | null
          valida_dal: string
        }
        Insert: {
          created_at?: string
          data_nomina: string
          firma_prrc_url?: string | null
          firma_titolare_url?: string | null
          id?: string
          laboratorio_id: string
          pdf_sha256?: string | null
          pdf_url?: string | null
          prrc_accettato_at?: string | null
          prrc_cognome: string
          prrc_ha_accettato?: boolean
          prrc_nome: string
          prrc_numero_albo?: string | null
          prrc_qualifica?: string | null
          revoca_data?: string | null
          revocata?: boolean
          updated_at?: string
          valida_al?: string | null
          valida_dal: string
        }
        Update: {
          created_at?: string
          data_nomina?: string
          firma_prrc_url?: string | null
          firma_titolare_url?: string | null
          id?: string
          laboratorio_id?: string
          pdf_sha256?: string | null
          pdf_url?: string | null
          prrc_accettato_at?: string | null
          prrc_cognome?: string
          prrc_ha_accettato?: boolean
          prrc_nome?: string
          prrc_numero_albo?: string | null
          prrc_qualifica?: string | null
          revoca_data?: string | null
          revocata?: boolean
          updated_at?: string
          valida_al?: string | null
          valida_dal?: string
        }
        Relationships: [
          {
            foreignKeyName: "nomine_prrc_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      notifiche: {
        Row: {
          created_at: string
          dati_json: Json | null
          deleted_at: string | null
          id: string
          laboratorio_id: string
          letto_at: string | null
          link: string | null
          messaggio: string
          tipo: string
          titolo: string
          utente_id: string
        }
        Insert: {
          created_at?: string
          dati_json?: Json | null
          deleted_at?: string | null
          id?: string
          laboratorio_id: string
          letto_at?: string | null
          link?: string | null
          messaggio: string
          tipo: string
          titolo: string
          utente_id: string
        }
        Update: {
          created_at?: string
          dati_json?: Json | null
          deleted_at?: string | null
          id?: string
          laboratorio_id?: string
          letto_at?: string | null
          link?: string | null
          messaggio?: string
          tipo?: string
          titolo?: string
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifiche_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifiche_utente_id_fkey"
            columns: ["utente_id"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini_acquisto: {
        Row: {
          anno_ordine: number
          created_at: string
          data_consegna_prevista: string | null
          data_ddt: string | null
          data_ordine: string
          deleted_at: string | null
          fornitore_id: string
          id: string
          laboratorio_id: string
          note: string | null
          numero_ddt: string | null
          numero_ordine: string
          problemi: string | null
          progressivo_ordine: number
          stato: string
          totale_fattura: number
          totale_iva: number
          totale_ordinato: number
          totale_ricevuto: number
          totale_sconto: number
          updated_at: string
        }
        Insert: {
          anno_ordine: number
          created_at?: string
          data_consegna_prevista?: string | null
          data_ddt?: string | null
          data_ordine?: string
          deleted_at?: string | null
          fornitore_id: string
          id?: string
          laboratorio_id: string
          note?: string | null
          numero_ddt?: string | null
          numero_ordine: string
          problemi?: string | null
          progressivo_ordine: number
          stato?: string
          totale_fattura?: number
          totale_iva?: number
          totale_ordinato?: number
          totale_ricevuto?: number
          totale_sconto?: number
          updated_at?: string
        }
        Update: {
          anno_ordine?: number
          created_at?: string
          data_consegna_prevista?: string | null
          data_ddt?: string | null
          data_ordine?: string
          deleted_at?: string | null
          fornitore_id?: string
          id?: string
          laboratorio_id?: string
          note?: string | null
          numero_ddt?: string | null
          numero_ordine?: string
          problemi?: string | null
          progressivo_ordine?: number
          stato?: string
          totale_fattura?: number
          totale_iva?: number
          totale_ordinato?: number
          totale_ricevuto?: number
          totale_sconto?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordini_acquisto_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "fornitori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_acquisto_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini_fornitori: {
        Row: {
          created_at: string
          data_consegna_effettiva: string | null
          data_consegna_richiesta: string | null
          data_ordine: string | null
          deleted_at: string | null
          email_inviato: boolean
          fornitore_id: string | null
          id: string
          laboratorio_id: string
          magazzino_id: string | null
          note: string | null
          numero_ordine: string
          quantita_ordinata: number | null
          quantita_ricevuta: number | null
          stato: string
          unita_misura: string | null
          updated_at: string
          whatsapp_inviato: boolean
        }
        Insert: {
          created_at?: string
          data_consegna_effettiva?: string | null
          data_consegna_richiesta?: string | null
          data_ordine?: string | null
          deleted_at?: string | null
          email_inviato?: boolean
          fornitore_id?: string | null
          id?: string
          laboratorio_id: string
          magazzino_id?: string | null
          note?: string | null
          numero_ordine: string
          quantita_ordinata?: number | null
          quantita_ricevuta?: number | null
          stato?: string
          unita_misura?: string | null
          updated_at?: string
          whatsapp_inviato?: boolean
        }
        Update: {
          created_at?: string
          data_consegna_effettiva?: string | null
          data_consegna_richiesta?: string | null
          data_ordine?: string | null
          deleted_at?: string | null
          email_inviato?: boolean
          fornitore_id?: string | null
          id?: string
          laboratorio_id?: string
          magazzino_id?: string | null
          note?: string | null
          numero_ordine?: string
          quantita_ordinata?: number | null
          quantita_ricevuta?: number | null
          stato?: string
          unita_misura?: string | null
          updated_at?: string
          whatsapp_inviato?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ordini_fornitori_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "fornitori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_fornitori_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_fornitori_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_fornitori_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino_sotto_scorta"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini_righe: {
        Row: {
          codice_articolo: string | null
          codice_articolo_fornitore: string | null
          costo_unitario: number | null
          created_at: string
          data_ricezione: string | null
          deleted_at: string | null
          descrizione: string
          id: string
          importo: number | null
          laboratorio_id: string
          magazzino_id: string | null
          ordine_id: string
          quantita_da_ricevere: number | null
          quantita_ordinata: number
          quantita_ricevuta: number
          ricevuto: boolean
          sconto_percentuale: number
          updated_at: string
        }
        Insert: {
          codice_articolo?: string | null
          codice_articolo_fornitore?: string | null
          costo_unitario?: number | null
          created_at?: string
          data_ricezione?: string | null
          deleted_at?: string | null
          descrizione: string
          id?: string
          importo?: number | null
          laboratorio_id: string
          magazzino_id?: string | null
          ordine_id: string
          quantita_da_ricevere?: number | null
          quantita_ordinata: number
          quantita_ricevuta?: number
          ricevuto?: boolean
          sconto_percentuale?: number
          updated_at?: string
        }
        Update: {
          codice_articolo?: string | null
          codice_articolo_fornitore?: string | null
          costo_unitario?: number | null
          created_at?: string
          data_ricezione?: string | null
          deleted_at?: string | null
          descrizione?: string
          id?: string
          importo?: number | null
          laboratorio_id?: string
          magazzino_id?: string | null
          ordine_id?: string
          quantita_da_ricevere?: number | null
          quantita_ordinata?: number
          quantita_ricevuta?: number
          ricevuto?: boolean
          sconto_percentuale?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordini_righe_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino_sotto_scorta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini_acquisto"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamenti: {
        Row: {
          annullato_at: string | null
          annullato_da: string | null
          created_at: string
          data_pagamento: string
          fattura_id: string | null
          id: string
          importo: number
          laboratorio_id: string
          lavoro_id: string | null
          metodo: string
          metodo_nota: string | null
          motivo_annullamento: string | null
          registrato_da: string
          sostituisce_pagamento_id: string | null
          stato: string
        }
        Insert: {
          annullato_at?: string | null
          annullato_da?: string | null
          created_at?: string
          data_pagamento: string
          fattura_id?: string | null
          id?: string
          importo: number
          laboratorio_id: string
          lavoro_id?: string | null
          metodo: string
          metodo_nota?: string | null
          motivo_annullamento?: string | null
          registrato_da: string
          sostituisce_pagamento_id?: string | null
          stato?: string
        }
        Update: {
          annullato_at?: string | null
          annullato_da?: string | null
          created_at?: string
          data_pagamento?: string
          fattura_id?: string | null
          id?: string
          importo?: number
          laboratorio_id?: string
          lavoro_id?: string | null
          metodo?: string
          metodo_nota?: string | null
          motivo_annullamento?: string | null
          registrato_da?: string
          sostituisce_pagamento_id?: string | null
          stato?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamenti_annullato_da_fkey"
            columns: ["annullato_da"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture_da_inviare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_registrato_da_fkey"
            columns: ["registrato_da"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_sostituisce_pagamento_id_fkey"
            columns: ["sostituisce_pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamenti"
            referencedColumns: ["id"]
          },
        ]
      }
      pazienti: {
        Row: {
          anamnesi: string | null
          archiviato: boolean
          asl: string | null
          cliente_id: string
          codice_fiscale: string | null
          codice_paziente: string | null
          cognome: string | null
          comune_nascita: string | null
          created_at: string
          data_nascita: string | null
          deleted_at: string | null
          id: string
          laboratorio_id: string
          nome: string | null
          nome_cognome: string
          note: string | null
          partita_iva: string | null
          sesso: string | null
          updated_at: string
        }
        Insert: {
          anamnesi?: string | null
          archiviato?: boolean
          asl?: string | null
          cliente_id: string
          codice_fiscale?: string | null
          codice_paziente?: string | null
          cognome?: string | null
          comune_nascita?: string | null
          created_at?: string
          data_nascita?: string | null
          deleted_at?: string | null
          id?: string
          laboratorio_id: string
          nome?: string | null
          nome_cognome: string
          note?: string | null
          partita_iva?: string | null
          sesso?: string | null
          updated_at?: string
        }
        Update: {
          anamnesi?: string | null
          archiviato?: boolean
          asl?: string | null
          cliente_id?: string
          codice_fiscale?: string | null
          codice_paziente?: string | null
          cognome?: string | null
          comune_nascita?: string | null
          created_at?: string
          data_nascita?: string | null
          deleted_at?: string | null
          id?: string
          laboratorio_id?: string
          nome?: string | null
          nome_cognome?: string
          note?: string | null
          partita_iva?: string | null
          sesso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pazienti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pazienti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "partitario_clienti"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "pazienti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      portale_accessi: {
        Row: {
          azione: string
          cliente_id: string
          created_at: string
          id: string
          ip_address: string | null
          laboratorio_id: string
          user_agent: string | null
        }
        Insert: {
          azione: string
          cliente_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          laboratorio_id: string
          user_agent?: string | null
        }
        Update: {
          azione?: string
          cliente_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          laboratorio_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portale_accessi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portale_accessi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "partitario_clienti"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "portale_accessi_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      prescrizioni_digitali: {
        Row: {
          cliente_id: string
          created_at: string
          data_consegna_richiesta: string | null
          deleted_at: string | null
          descrizione: string | null
          file_allegati_urls: string[] | null
          id: string
          ip_submit: string | null
          laboratorio_id: string
          lavoro_id: string | null
          motivo_rifiuto: string | null
          note: string | null
          notifica_accettazione_at: string | null
          notifica_consegnato_at: string | null
          notifica_pronto_at: string | null
          paziente_nascita: string | null
          paziente_nome: string
          priorita: string | null
          stato: string
          tipo_lavoro: string
          token: string
          token_scadenza: string
          token_usato: boolean
          updated_at: string
          user_agent_submit: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_consegna_richiesta?: string | null
          deleted_at?: string | null
          descrizione?: string | null
          file_allegati_urls?: string[] | null
          id?: string
          ip_submit?: string | null
          laboratorio_id: string
          lavoro_id?: string | null
          motivo_rifiuto?: string | null
          note?: string | null
          notifica_accettazione_at?: string | null
          notifica_consegnato_at?: string | null
          notifica_pronto_at?: string | null
          paziente_nascita?: string | null
          paziente_nome: string
          priorita?: string | null
          stato?: string
          tipo_lavoro: string
          token?: string
          token_scadenza?: string
          token_usato?: boolean
          updated_at?: string
          user_agent_submit?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_consegna_richiesta?: string | null
          deleted_at?: string | null
          descrizione?: string | null
          file_allegati_urls?: string[] | null
          id?: string
          ip_submit?: string | null
          laboratorio_id?: string
          lavoro_id?: string | null
          motivo_rifiuto?: string | null
          note?: string | null
          notifica_accettazione_at?: string | null
          notifica_consegnato_at?: string | null
          notifica_pronto_at?: string | null
          paziente_nascita?: string | null
          paziente_nome?: string
          priorita?: string | null
          stato?: string
          tipo_lavoro?: string
          token?: string
          token_scadenza?: string
          token_usato?: boolean
          updated_at?: string
          user_agent_submit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescrizioni_digitali_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescrizioni_digitali_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "partitario_clienti"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "prescrizioni_digitali_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescrizioni_digitali_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescrizioni_digitali_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      prima_nota: {
        Row: {
          created_at: string
          data: string
          deleted_at: string | null
          descrizione: string
          entrata: number
          fattura_id: string | null
          gruppo: string
          id: string
          laboratorio_id: string
          modalita_pagamento: string | null
          note: string | null
          ordine_id: string | null
          riferimento: string | null
          sottogruppo: string | null
          updated_at: string
          uscita: number
        }
        Insert: {
          created_at?: string
          data?: string
          deleted_at?: string | null
          descrizione: string
          entrata?: number
          fattura_id?: string | null
          gruppo: string
          id?: string
          laboratorio_id: string
          modalita_pagamento?: string | null
          note?: string | null
          ordine_id?: string | null
          riferimento?: string | null
          sottogruppo?: string | null
          updated_at?: string
          uscita?: number
        }
        Update: {
          created_at?: string
          data?: string
          deleted_at?: string | null
          descrizione?: string
          entrata?: number
          fattura_id?: string | null
          gruppo?: string
          id?: string
          laboratorio_id?: string
          modalita_pagamento?: string | null
          note?: string | null
          ordine_id?: string | null
          riferimento?: string | null
          sottogruppo?: string | null
          updated_at?: string
          uscita?: number
        }
        Relationships: [
          {
            foreignKeyName: "prima_nota_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prima_nota_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture_da_inviare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prima_nota_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prima_nota_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini_acquisto"
            referencedColumns: ["id"]
          },
        ]
      }
      progressivi_anno: {
        Row: {
          anno: number
          laboratorio_id: string
          progressivo: number
          tipo: string
        }
        Insert: {
          anno: number
          laboratorio_id: string
          progressivo?: number
          tipo: string
        }
        Update: {
          anno?: number
          laboratorio_id?: string
          progressivo?: number
          tipo?: string
        }
        Relationships: []
      }
      prrc_nomine: {
        Row: {
          accettazione_at: string | null
          attestati_urls: string[] | null
          contratto_url: string | null
          created_at: string
          cv_url: string | null
          data_fine: string | null
          data_inizio: string
          deleted_at: string | null
          id: string
          laboratorio_id: string
          prrc_cognome: string
          prrc_email: string | null
          prrc_nome: string
          prrc_qualifica: string
          prrc_tipo: string
          stato: string
          updated_at: string
        }
        Insert: {
          accettazione_at?: string | null
          attestati_urls?: string[] | null
          contratto_url?: string | null
          created_at?: string
          cv_url?: string | null
          data_fine?: string | null
          data_inizio: string
          deleted_at?: string | null
          id?: string
          laboratorio_id: string
          prrc_cognome: string
          prrc_email?: string | null
          prrc_nome: string
          prrc_qualifica: string
          prrc_tipo: string
          stato?: string
          updated_at?: string
        }
        Update: {
          accettazione_at?: string | null
          attestati_urls?: string[] | null
          contratto_url?: string | null
          created_at?: string
          cv_url?: string | null
          data_fine?: string | null
          data_inizio?: string
          deleted_at?: string | null
          id?: string
          laboratorio_id?: string
          prrc_cognome?: string
          prrc_email?: string | null
          prrc_nome?: string
          prrc_qualifica?: string
          prrc_tipo?: string
          stato?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prrc_nomine_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      psur: {
        Row: {
          anno_riferimento: number
          conclusioni: string | null
          created_at: string
          firmato_at: string | null
          id: string
          laboratorio_id: string
          misure_correttive: string | null
          pdf_sha256: string | null
          pdf_url: string | null
          periodo_fine: string
          periodo_inizio: string
          prrc_nome_snapshot: string | null
          stato: string
          totale_dispositivi: number
          totale_incidenti: number
          totale_non_conformita: number
          totale_reclami: number
          totale_rifacimenti: number
          updated_at: string
          valutazione_benefici_rischi: string | null
        }
        Insert: {
          anno_riferimento: number
          conclusioni?: string | null
          created_at?: string
          firmato_at?: string | null
          id?: string
          laboratorio_id: string
          misure_correttive?: string | null
          pdf_sha256?: string | null
          pdf_url?: string | null
          periodo_fine: string
          periodo_inizio: string
          prrc_nome_snapshot?: string | null
          stato?: string
          totale_dispositivi?: number
          totale_incidenti?: number
          totale_non_conformita?: number
          totale_reclami?: number
          totale_rifacimenti?: number
          updated_at?: string
          valutazione_benefici_rischi?: string | null
        }
        Update: {
          anno_riferimento?: number
          conclusioni?: string | null
          created_at?: string
          firmato_at?: string | null
          id?: string
          laboratorio_id?: string
          misure_correttive?: string | null
          pdf_sha256?: string | null
          pdf_url?: string | null
          periodo_fine?: string
          periodo_inizio?: string
          prrc_nome_snapshot?: string | null
          stato?: string
          totale_dispositivi?: number
          totale_incidenti?: number
          totale_non_conformita?: number
          totale_reclami?: number
          totale_rifacimenti?: number
          updated_at?: string
          valutazione_benefici_rischi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "psur_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          laboratorio_id: string
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          laboratorio_id: string
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          laboratorio_id?: string
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      reti: {
        Row: {
          admin_laboratorio_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          admin_laboratorio_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          admin_laboratorio_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reti_admin_laboratorio_id_fkey"
            columns: ["admin_laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      reti_membri: {
        Row: {
          aggiunto_da_admin: string | null
          joined_at: string
          laboratorio_id: string
          rete_id: string
          ruolo: string
        }
        Insert: {
          aggiunto_da_admin?: string | null
          joined_at?: string
          laboratorio_id: string
          rete_id: string
          ruolo?: string
        }
        Update: {
          aggiunto_da_admin?: string | null
          joined_at?: string
          laboratorio_id?: string
          rete_id?: string
          ruolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "reti_membri_aggiunto_da_admin_fkey"
            columns: ["aggiunto_da_admin"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reti_membri_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reti_membri_rete_id_fkey"
            columns: ["rete_id"]
            isOneToOne: false
            referencedRelation: "reti"
            referencedColumns: ["id"]
          },
        ]
      }
      rischi_tipo_dispositivo: {
        Row: {
          created_at: string
          data_ultima_revisione: string | null
          id: string
          laboratorio_id: string
          misure_controllo: string | null
          norme_json: Json
          responsabile_revisione: string | null
          rischi_json: Json
          rischi_residui: string | null
          tipo_dispositivo: string
          updated_at: string
          versione: number
        }
        Insert: {
          created_at?: string
          data_ultima_revisione?: string | null
          id?: string
          laboratorio_id: string
          misure_controllo?: string | null
          norme_json?: Json
          responsabile_revisione?: string | null
          rischi_json?: Json
          rischi_residui?: string | null
          tipo_dispositivo: string
          updated_at?: string
          versione?: number
        }
        Update: {
          created_at?: string
          data_ultima_revisione?: string | null
          id?: string
          laboratorio_id?: string
          misure_controllo?: string | null
          norme_json?: Json
          responsabile_revisione?: string | null
          rischi_json?: Json
          rischi_residui?: string | null
          tipo_dispositivo?: string
          updated_at?: string
          versione?: number
        }
        Relationships: [
          {
            foreignKeyName: "rischi_tipo_dispositivo_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_analyses: {
        Row: {
          approvato_at: string | null
          approvato_da: string | null
          benefit_risk_json: Json | null
          conclusione: string | null
          created_at: string
          deleted_at: string | null
          hazards_json: Json | null
          id: string
          laboratorio_id: string
          normativa_json: Json | null
          revisione_annuale: string | null
          stato: string
          tipo_dispositivo: string
          updated_at: string
          versione: string
        }
        Insert: {
          approvato_at?: string | null
          approvato_da?: string | null
          benefit_risk_json?: Json | null
          conclusione?: string | null
          created_at?: string
          deleted_at?: string | null
          hazards_json?: Json | null
          id?: string
          laboratorio_id: string
          normativa_json?: Json | null
          revisione_annuale?: string | null
          stato?: string
          tipo_dispositivo: string
          updated_at?: string
          versione?: string
        }
        Update: {
          approvato_at?: string | null
          approvato_da?: string | null
          benefit_risk_json?: Json | null
          conclusione?: string | null
          created_at?: string
          deleted_at?: string | null
          hazards_json?: Json | null
          id?: string
          laboratorio_id?: string
          normativa_json?: Json | null
          revisione_annuale?: string | null
          stato?: string
          tipo_dispositivo?: string
          updated_at?: string
          versione?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_analyses_approvato_da_fkey"
            columns: ["approvato_da"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_analyses_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      scarichi_magazzino: {
        Row: {
          id: string
          laboratorio_id: string
          lavoro_id: string
          listino_id: string | null
          lotto_numero: string | null
          magazzino_id: string
          note: string | null
          operatore_id: string | null
          quantita: number
          timestamp_scarico: string
          unita_misura: string
        }
        Insert: {
          id?: string
          laboratorio_id: string
          lavoro_id: string
          listino_id?: string | null
          lotto_numero?: string | null
          magazzino_id: string
          note?: string | null
          operatore_id?: string | null
          quantita: number
          timestamp_scarico?: string
          unita_misura?: string
        }
        Update: {
          id?: string
          laboratorio_id?: string
          lavoro_id?: string
          listino_id?: string | null
          lotto_numero?: string | null
          magazzino_id?: string
          note?: string | null
          operatore_id?: string | null
          quantita?: number
          timestamp_scarico?: string
          unita_misura?: string
        }
        Relationships: [
          {
            foreignKeyName: "scarichi_magazzino_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scarichi_magazzino_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scarichi_magazzino_lavoro_id_fkey"
            columns: ["lavoro_id"]
            isOneToOne: false
            referencedRelation: "lavori_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scarichi_magazzino_listino_id_fkey"
            columns: ["listino_id"]
            isOneToOne: false
            referencedRelation: "listino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scarichi_magazzino_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scarichi_magazzino_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzino_sotto_scorta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scarichi_magazzino_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
        ]
      }
      sdi_receipts: {
        Row: {
          canale: string
          created_at: string
          errore_descrizione: string | null
          fattura_id: string
          id: string
          identificativo_sdi: string | null
          laboratorio_id: string
          pec_destinatario: string | null
          pec_mittente: string | null
          ricevuto_at: string
          tipo: string
          xml_originale: string | null
          xml_ricevuta: string | null
          xml_sha256: string | null
        }
        Insert: {
          canale: string
          created_at?: string
          errore_descrizione?: string | null
          fattura_id: string
          id?: string
          identificativo_sdi?: string | null
          laboratorio_id: string
          pec_destinatario?: string | null
          pec_mittente?: string | null
          ricevuto_at?: string
          tipo: string
          xml_originale?: string | null
          xml_ricevuta?: string | null
          xml_sha256?: string | null
        }
        Update: {
          canale?: string
          created_at?: string
          errore_descrizione?: string | null
          fattura_id?: string
          id?: string
          identificativo_sdi?: string | null
          laboratorio_id?: string
          pec_destinatario?: string | null
          pec_mittente?: string | null
          ricevuto_at?: string
          tipo?: string
          xml_originale?: string | null
          xml_ricevuta?: string | null
          xml_sha256?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdi_receipts_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdi_receipts_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture_da_inviare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdi_receipts_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
        }
        Insert: {
          id: string
          processed_at?: string
        }
        Update: {
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      sub_processors: {
        Row: {
          attivo: boolean
          base_trasferimento: string
          dpa_firmato_at: string | null
          dpa_url: string | null
          id: string
          nome: string
          note: string | null
          paese: string
          regione_dati: string
          ruolo: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          base_trasferimento: string
          dpa_firmato_at?: string | null
          dpa_url?: string | null
          id?: string
          nome: string
          note?: string | null
          paese: string
          regione_dati: string
          ruolo: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          base_trasferimento?: string
          dpa_firmato_at?: string | null
          dpa_url?: string | null
          id?: string
          nome?: string
          note?: string | null
          paese?: string
          regione_dati?: string
          ruolo?: string
          updated_at?: string
        }
        Relationships: []
      }
      tecnici: {
        Row: {
          cognome: string
          compenso_base: number | null
          created_at: string
          deleted_at: string | null
          id: string
          laboratorio_id: string
          nome: string
          numero_albo: string | null
          prrc: boolean
          qualifica: string | null
          sigla: string | null
          tipo_compenso: string | null
          updated_at: string
          utente_id: string | null
        }
        Insert: {
          cognome: string
          compenso_base?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          laboratorio_id: string
          nome: string
          numero_albo?: string | null
          prrc?: boolean
          qualifica?: string | null
          sigla?: string | null
          tipo_compenso?: string | null
          updated_at?: string
          utente_id?: string | null
        }
        Update: {
          cognome?: string
          compenso_base?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          laboratorio_id?: string
          nome?: string
          numero_albo?: string | null
          prrc?: boolean
          qualifica?: string | null
          sigla?: string | null
          tipo_compenso?: string | null
          updated_at?: string
          utente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tecnici_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecnici_utente_id_fkey"
            columns: ["utente_id"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
        ]
      }
      utenti: {
        Row: {
          attivo: boolean
          cognome: string
          colore_agenda: string | null
          created_at: string
          deleted_at: string | null
          dispositivo_condiviso: boolean
          email: string | null
          id: string
          inactivity_lock_minuti: number
          laboratorio_id: string | null
          last_login_at: string | null
          last_login_ip: string | null
          mfa_enrolled_at: string | null
          mfa_metodo: string | null
          mfa_required: boolean
          nav_preferences: Json | null
          nome: string
          preferenza_dashboard: string | null
          ruolo: string
          session_ttl_minuti: number
          sigla: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          cognome: string
          colore_agenda?: string | null
          created_at?: string
          deleted_at?: string | null
          dispositivo_condiviso?: boolean
          email?: string | null
          id: string
          inactivity_lock_minuti?: number
          laboratorio_id?: string | null
          last_login_at?: string | null
          last_login_ip?: string | null
          mfa_enrolled_at?: string | null
          mfa_metodo?: string | null
          mfa_required?: boolean
          nav_preferences?: Json | null
          nome: string
          preferenza_dashboard?: string | null
          ruolo?: string
          session_ttl_minuti?: number
          sigla?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          cognome?: string
          colore_agenda?: string | null
          created_at?: string
          deleted_at?: string | null
          dispositivo_condiviso?: boolean
          email?: string | null
          id?: string
          inactivity_lock_minuti?: number
          laboratorio_id?: string | null
          last_login_at?: string | null
          last_login_ip?: string | null
          mfa_enrolled_at?: string | null
          mfa_metodo?: string | null
          mfa_required?: boolean
          nav_preferences?: Json | null
          nome?: string
          preferenza_dashboard?: string | null
          ruolo?: string
          session_ttl_minuti?: number
          sigla?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "utenti_laboratorio_id_fkey"
            columns: ["laboratorio_id"]
            isOneToOne: false
            referencedRelation: "laboratori"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          expires_at: string | null
          id: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          challenge: string
          expires_at?: string | null
          id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          challenge?: string
          expires_at?: string | null
          id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string | null
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string | null
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string | null
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      dichiarazioni_in_scadenza: {
        Row: {
          anni_rimanenti: number | null
          data_emissione: string | null
          data_scadenza_archivio: string | null
          id: string | null
          numero_ddc: string | null
          paziente_nome: string | null
          stato: string | null
          tipo_dispositivo: string | null
        }
        Insert: {
          anni_rimanenti?: never
          data_emissione?: string | null
          data_scadenza_archivio?: never
          id?: string | null
          numero_ddc?: string | null
          paziente_nome?: string | null
          stato?: string | null
          tipo_dispositivo?: string | null
        }
        Update: {
          anni_rimanenti?: never
          data_emissione?: string | null
          data_scadenza_archivio?: never
          id?: string | null
          numero_ddc?: string | null
          paziente_nome?: string | null
          stato?: string | null
          tipo_dispositivo?: string | null
        }
        Relationships: []
      }
      fatture_da_inviare: {
        Row: {
          bollo: number | null
          cliente_nome: string | null
          cliente_studio: string | null
          codice_sdi: string | null
          data: string | null
          id: string | null
          numero: string | null
          pec: string | null
          stato_sdi: string | null
          totale: number | null
          xml_errori_sdi: string | null
        }
        Relationships: []
      }
      lavori_dashboard: {
        Row: {
          cliente_nome: string | null
          cliente_studio: string | null
          cliente_telefono: string | null
          colore_dente: string | null
          consegna_oggi: boolean | null
          created_at: string | null
          data_consegna_prevista: string | null
          data_ingresso: string | null
          descrizione: string | null
          giorni_ritardo: number | null
          id: string | null
          in_ritardo: boolean | null
          numero_lavoro: string | null
          paziente_nome: string | null
          paziente_nome_visibile: boolean | null
          priorita: string | null
          stato: string | null
          tecnico_nome: string | null
          tecnico_sigla: string | null
          tipo_dispositivo: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      magazzino_sotto_scorta: {
        Row: {
          codice_articolo: string | null
          conf_da_ordinare: number | null
          fornitore_nome: string | null
          fornitore_telefono: string | null
          id: string | null
          lotti_in_scadenza: number | null
          nome: string | null
          produttore: string | null
          scorta_attuale: number | null
          scorta_minima: number | null
          um_acquisto: string | null
        }
        Relationships: []
      }
      partitario_clienti: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          numero_fatture: number | null
          saldo_aperto: number | null
          studio_nome: string | null
          totale_fatturato: number | null
          totale_incassato: number | null
          ultima_fattura: string | null
        }
        Relationships: []
      }
      statistiche_mensili: {
        Row: {
          anno: number | null
          bollo_totale: number | null
          imponibile_totale: number | null
          iva_totale: number | null
          mese: number | null
          numero_fatture: number | null
          totale_fatturato: number | null
        }
        Relationships: []
      }
      tracciabilita_lotto: {
        Row: {
          data_consegna_effettiva: string | null
          data_uso: string | null
          dentista_nome: string | null
          dentista_studio: string | null
          descrizione: string | null
          materiale: string | null
          numero_lavoro: string | null
          numero_lotto: string | null
          paziente_nome: string | null
          produttore: string | null
          quantita_usata: number | null
          stato_lavoro: string | null
          tipo_dispositivo: string | null
          unita_misura: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invite_atomic: {
        Args: {
          p_cognome: string
          p_nome: string
          p_token_hash: string
          p_user_email: string
          p_user_id: string
        }
        Returns: Json
      }
      accept_invito_rete_atomic: {
        Args: { p_token_hash: string; p_user_id: string }
        Returns: Json
      }
      admin_delete_laboratorio: { Args: { p_lab_id: string }; Returns: Json }
      apply_updated_at_trigger: { Args: { tbl: string }; Returns: undefined }
      calcola_imponibile_lavoro: {
        Args: { p_lavoro_id: string }
        Returns: number
      }
      cleanup_expired_webauthn_challenges: { Args: never; Returns: undefined }
      consegna_lavoro_lock:
        | { Args: { p_lavoro_id: string }; Returns: Json }
        | {
            Args: { p_laboratorio_id: string; p_lavoro_id: string }
            Returns: Json
          }
      crea_rifacimento_atomico: {
        Args: {
          p_costo_interno?: number
          p_lavoro_originale_id: string
          p_motivo: string
          p_note?: string
          p_rilevato_in?: string
        }
        Returns: Json
      }
      current_lab_id: { Args: never; Returns: string }
      decrementa_scorta: {
        Args: {
          p_laboratorio_id: string
          p_magazzino_id: string
          p_quantita: number
        }
        Returns: undefined
      }
      genera_numero_ddc: { Args: { p_lab: string }; Returns: string }
      genera_numero_fattura: { Args: { p_lab: string }; Returns: string }
      genera_numero_lavoro: { Args: { p_lab: string }; Returns: string }
      genera_progressivo: {
        Args: { p_anno?: number; p_laboratorio_id: string; p_tipo: string }
        Returns: number
      }
      genera_xml_fattura_pa: { Args: { p_fattura_id: string }; Returns: string }
      get_lab_id: { Args: never; Returns: string }
      get_pec_password: { Args: { p_lab_id: string }; Returns: string }
      get_pec_vault_secret: { Args: { p_lab_id: string }; Returns: string }
      has_prrc_valido: { Args: { p_lab: string }; Returns: boolean }
      has_role: { Args: { required_role: string }; Returns: boolean }
      has_role_check: { Args: { required_role: string }; Returns: boolean }
      lab_is_accessible: { Args: never; Returns: boolean }
      refresh_dashboard_cache: {
        Args: { p_lab_id: string }
        Returns: undefined
      }
      ricalcola_pagamento_fattura: {
        Args: { p_fattura_id: string }
        Returns: undefined
      }
      richiede_bollo: {
        Args: {
          p_imponibile: number
          p_iva_percentuale: number
          p_lab_id: string
        }
        Returns: boolean
      }
      salva_fasi_ciclo_atomico: {
        Args: {
          p_ciclo_id: string
          p_fasi: Json
          p_laboratorio_id: string
          p_user_id: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
      upsert_pec_vault_secret: {
        Args: { p_lab_id: string; p_password: string }
        Returns: undefined
      }
      xmlescape: { Args: { t: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
