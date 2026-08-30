import { useEffect } from 'react'
import DashboardPage from './pages/DashboardPage'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useStore } from './store/useStore'

/** اعمال تم روی <html>؛ در حالت system به تغییر تنظیم سیستم هم گوش می‌دهد */
function useApplyTheme() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches))
    }
    apply()
    if (theme !== 'system') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

export default function App() {
  useApplyTheme()
  return (
    <TooltipProvider delayDuration={100}>
      <DashboardPage />
    </TooltipProvider>
  )
}
