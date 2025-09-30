import HomePage from '@/pages/home-page'
import { ThemeProvider } from '@/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'

export default function App() {
  return (
    <ThemeProvider>
      <HomePage />
      <Toaster />
    </ThemeProvider>
  )
}
