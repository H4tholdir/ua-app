import 'server-only'
import { getServiceClient } from '@/lib/supabase/server-service'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// getServiceClient() non porta il generic <Database> (fix strutturale del
// client condiviso, usato da 147 file, esplicitamente fuori scope — vedi
// spec B4). Questo cast locale rende tipizzate sullo schema reale le query
// nei generatori PDF, senza toccare il client condiviso: .select('*') e i
// join restituiscono i tipi veri delle colonne invece di un `any` implicito.
export function getTypedServiceClient(): SupabaseClient<Database> {
  return getServiceClient() as SupabaseClient<Database>
}
