import { DashboardShell } from './DashboardShell'
import { DashboardTitolare } from './DashboardTitolare'
import { DashboardTecnico } from './DashboardTecnico'
import type { DashboardTitolareProps } from './DashboardTitolare'
import type { DashboardTecnicoProps } from './DashboardTecnico'

interface DashboardHybridProps {
  titolareData: DashboardTitolareProps
  tecnicoData: DashboardTecnicoProps
}

export function DashboardHybrid({ titolareData, tecnicoData }: DashboardHybridProps) {
  return (
    <DashboardShell
      showTabs={true}
      defaultView="produzione"
      renderGestione={<DashboardTitolare {...titolareData} />}
      renderProduzione={<DashboardTecnico {...tecnicoData} />}
    />
  )
}
