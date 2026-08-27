import DashboardPage from './pages/DashboardPage'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function App() {
  return (
    <TooltipProvider delayDuration={100}>
      <DashboardPage />
    </TooltipProvider>
  )
}
