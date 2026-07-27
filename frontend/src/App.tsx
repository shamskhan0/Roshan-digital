import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Home, CheckSquare, TrendingUp, Wallet, Users, Bell, Settings, AlertTriangle, History } from 'lucide-react'
import SplashScreen from '@/components/SplashScreen'
import RoshanLogo from '@/components/RoshanLogo'
import Auth from '@/components/Auth'
import Dashboard from '@/components/Dashboard'
import TaskManager from '@/components/TaskManager'
import Investment from '@/components/Investment'
import WalletComp from '@/components/Wallet'
import Deposit from '@/components/Deposit'
import Withdraw from '@/components/Withdraw'
import Referral from '@/components/Referral'
import Team from '@/components/Team'
import Notifications from '@/components/Notifications'
import SettingsComp from '@/components/Settings'
import Profile from '@/components/Profile'
import HelpCentre from '@/components/HelpCentre'
import AdminPanel from '@/components/AdminPanel'
import HistorySection from '@/components/HistorySection'
import Community from '@/components/Community'

const NAV = [
  { id: 'dashboard', icon: Home, label: 'Home' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { id: 'community', icon: Users, label: 'Community' },
  { id: 'investment', icon: TrendingUp, label: 'Invest' },
  { id: 'wallet', icon: Wallet, label: 'Wallet' },
]

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('rd_user') || 'null') } catch { return null }
  })
  const [screen, setScreen] = useState('dashboard')
  const [maintenance, setMaintenance] = useState(false)

  const handleSplashComplete = useCallback(() => setShowSplash(false), [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('rd_user', JSON.stringify(user))
      fetch(api('/api/admin/settings')).then(r => r.json()).then(d => {
        if (d.settings?.maintenanceMode === 'true' && user.role !== 'admin') setMaintenance(true)
        else setMaintenance(false)
      }).catch(() => {})
    } else localStorage.removeItem('rd_user')
  }, [user])

  const handleLogin = (u: any) => setUser(u)
  const handleLogout = () => { setUser(null); setScreen('dashboard') }
  const handleUpdate = (u: any) => { setUser(u); localStorage.setItem('rd_user', JSON.stringify(u)) }

  const navigateTo = (s: string) => { setScreen(s); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  if (showSplash) return <SplashScreen onComplete={handleSplashComplete} />

  if (!user) return <Auth onLogin={handleLogin} />

  if (maintenance && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md text-center glass-card animate-fade-in-up">
          <CardContent className="p-8">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2">Under Maintenance</h1>
            <p className="text-gray-500 mb-4 font-normal">The app is currently under maintenance. Please try again later.</p>
            <Button onClick={handleLogout} className="hero-blue text-white">Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <Dashboard user={user} onNav={navigateTo} />
      case 'tasks': return <TaskManager user={user} />
      case 'investment': return <Investment user={user} />
      case 'wallet': return <WalletComp user={user} onNav={navigateTo} />
      case 'deposit': return <Deposit user={user} />
      case 'withdraw': return <Withdraw user={user} />
      case 'referral': return <Referral user={user} />
      case 'team': return <Team user={user} />
      case 'notifications': return <Notifications user={user} />
      case 'settings': return <SettingsComp user={user} onNav={navigateTo} onLogout={handleLogout} />
      case 'profile': return <Profile user={user} onUpdate={handleUpdate} />
      case 'help': return <HelpCentre onNav={navigateTo} />
      case 'admin': return <AdminPanel user={user} onNav={navigateTo} />
      case 'history': return <HistorySection user={user} />
      case 'community': return <Community user={user} />
      default: return <Dashboard user={user} onNav={navigateTo} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 safe-area-top bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <RoshanLogo size={28} />
          <span className="font-semibold text-sm bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Roshan Digital</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover cursor-pointer active:scale-95 transition-transform" onClick={() => navigateTo('profile')} />
          ) : (
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600 cursor-pointer active:scale-95 transition-transform" onClick={() => navigateTo('profile')}>{user.name?.[0]}</div>
          )}
          {user.role === 'admin' && (
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => navigateTo('admin')}><Shield className="h-5 w-5 text-blue-600" /></Button>
          )}
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => navigateTo('history')}><History className="h-5 w-5 text-gray-500" /></Button>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => navigateTo('notifications')}><Bell className="h-5 w-5 text-gray-500" /></Button>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => navigateTo('settings')}><Settings className="h-5 w-5 text-gray-500" /></Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-3 sm:p-4">{renderScreen()}</div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto flex">
          {NAV.map(n => (
            <button key={n.id} className={`nav-item flex-1 flex flex-col items-center justify-center py-2 text-xs font-normal min-h-[56px] active:scale-95 transition-transform ${screen === n.id ? 'active text-blue-600 font-medium' : 'text-gray-400'}`} onClick={() => navigateTo(n.id)}>
              <n.icon className="h-5 w-5 mb-0.5" />{n.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[68px]" />
    </div>
  )
}
