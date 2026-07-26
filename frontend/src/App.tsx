import { useState, useEffect, useCallback } from 'react'
import SplashScreen from './components/SplashScreen'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Wallet from './components/Wallet'
import Investment from './components/Investment'
import Deposit from './components/Deposit'
import Withdraw from './components/Withdraw'
import DailyTasks from './components/DailyTasks'
import Referral from './components/Referral'
import Profile from './components/Profile'
import Settings from './components/Settings'
import Notifications from './components/Notifications'
import HistorySection from './components/HistorySection'
import HelpCentre from './components/HelpCentre'
import Community from './components/Community'
import Team from './components/Team'
import AdminPanel from './components/AdminPanel'
import { Home, Wallet as WalletIcon, TrendingUp, CheckSquare, Users, Settings as SettingsIcon } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  { id: 'invest', label: 'Invest', icon: TrendingUp },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'more', label: 'More', icon: SettingsIcon },
]

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [screen, setScreen] = useState('splash')
  const [nav, setNav] = useState('home')

  useEffect(() => {
    const saved = localStorage.getItem('roshan_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
  }, [])

  const handleLogin = useCallback((u: any) => {
    setUser(u)
    localStorage.setItem('roshan_user', JSON.stringify(u))
    setNav('home')
    // Auto-seed data
    fetch('/api/auto-seed').catch(() => {})
  }, [])

  const handleLogout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('roshan_user')
    setScreen('auth')
  }, [])

  const handleUpdateUser = useCallback((u: any) => {
    setUser(u)
    localStorage.setItem('roshan_user', JSON.stringify(u))
  }, [])

  if (screen === 'splash') {
    return <SplashScreen onComplete={() => setScreen(user ? 'app' : 'auth')} />
  }

  if (screen === 'auth' || !user) {
    return <Auth onLogin={handleLogin} />
  }

  const renderScreen = () => {
    switch (nav) {
      case 'home': return <Dashboard user={user} onNav={setNav} />
      case 'tasks': return <DailyTasks user={user} />
      case 'wallet': return <Wallet user={user} onNav={setNav} />
      case 'invest': return <Investment user={user} />
      case 'team': return <Referral user={user} />
      case 'deposit': return <Deposit user={user} />
      case 'withdraw': return <Withdraw user={user} />
      case 'profile': return <Profile user={user} onUpdate={handleUpdateUser} />
      case 'settings': return <Settings user={user} onNav={setNav} onLogout={handleLogout} />
      case 'notifications': return <Notifications user={user} />
      case 'history': return <HistorySection user={user} />
      case 'help': return <HelpCentre onNav={setNav} />
      case 'community': return <Community user={user} />
      case 'team-list': return <Team user={user} />
      case 'admin': return <AdminPanel user={user} onNav={setNav} />
      default: return <Dashboard user={user} onNav={setNav} />
    }
  }

  const isFullScreen = ['admin'].includes(nav)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto relative">
      {isFullScreen ? (
        <div className="flex-1">{renderScreen()}</div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
            {renderScreen()}
          </div>
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 flex z-50">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                  nav === item.id ? 'text-blue-600' : 'text-gray-400'
                }`}
                onClick={() => setNav(item.id)}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  )
}
