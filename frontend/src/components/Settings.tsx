import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { User, Shield, HelpCircle, LogOut, Bell, History, Settings as SettingsIcon } from 'lucide-react'
import { api } from '@/lib/api-config'

interface Props { user: any; onNav: (s: string) => void; onLogout: () => void }

export default function Settings({ user, onNav, onLogout }: Props) {
  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-dark rounded-2xl p-5 text-white shadow-lg"><SettingsIcon className="h-5 w-5 mb-1" /><h2 className="text-lg font-medium">Settings</h2></div>
      <Card className="glass-card cursor-pointer active:scale-[0.98] transition-transform" onClick={() => onNav('profile')}>
        <CardContent className="p-3 flex items-center gap-3 min-h-[52px]">
          {user.avatar ? <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="bg-blue-100 p-2 rounded-full"><User className="h-5 w-5 text-blue-600" /></div>}
          <div className="flex-1 min-w-0"><p className="font-medium truncate">{user.name}</p><p className="text-xs text-gray-500 truncate">{user.email}</p></div>
        </CardContent>
      </Card>
      <Card className="glass-card cursor-pointer active:scale-[0.98] transition-transform" onClick={() => onNav('notifications')}>
        <CardContent className="p-3 flex items-center gap-3 min-h-[52px]"><div className="bg-blue-50 p-2 rounded-full"><Bell className="h-5 w-5 text-blue-500" /></div><p className="font-medium flex-1">Notifications</p></CardContent>
      </Card>
      <Card className="glass-card cursor-pointer active:scale-[0.98] transition-transform" onClick={() => onNav('history')}>
        <CardContent className="p-3 flex items-center gap-3 min-h-[52px]"><div className="bg-indigo-50 p-2 rounded-full"><History className="h-5 w-5 text-indigo-500" /></div><p className="font-medium flex-1">Transaction History</p></CardContent>
      </Card>
      <Card className="glass-card cursor-pointer active:scale-[0.98] transition-transform" onClick={() => onNav('help')}>
        <CardContent className="p-3 flex items-center gap-3 min-h-[52px]"><div className="bg-amber-50 p-2 rounded-full"><HelpCircle className="h-5 w-5 text-amber-500" /></div><p className="font-medium flex-1">Help Center</p></CardContent>
      </Card>
      {user.role === 'admin' && (
        <Card className="glass-card cursor-pointer active:scale-[0.98] transition-transform border-blue-200" onClick={() => onNav('admin')}>
          <CardContent className="p-3 flex items-center gap-3 min-h-[52px]"><div className="bg-blue-50 p-2 rounded-full"><Shield className="h-5 w-5 text-blue-600" /></div><p className="font-medium flex-1 text-blue-700">{'🛡️'} Admin Center</p></CardContent>
        </Card>
      )}
      <Button variant="destructive" className="w-full" onClick={onLogout}><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
    </div>
  )
}
