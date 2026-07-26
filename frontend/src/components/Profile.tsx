import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { User, Camera, Save, Shield, Smartphone, Globe, Clock } from 'lucide-react'

interface Props { user: any; onUpdate: (user: any) => void }

export default function Profile({ user, onUpdate }: Props) {
  const [name, setName] = useState(user.name || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [avatar, setAvatar] = useState(user.avatar || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loginHistory, setLoginHistory] = useState<any[]>([])
  const [showActivity, setShowActivity] = useState(false)

  useEffect(() => {
    fetch(`/api/app/history/${user.id}`).then(r => r.json()).then(d => {
      setLoginHistory(d.loginHistory || [])
    }).catch(() => {})
  }, [user.id])

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setAvatar(reader.result as string); reader.readAsDataURL(file) }

  const save = async () => {
    setSaving(true); setMsg('')
    const res = await fetch('/api/auth/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, name, phone, avatar }) })
    const data = await res.json()
    if (data.ok) { onUpdate(data.user); setMsg('Profile updated!') } else setMsg(data.error)
    setSaving(false)
  }

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-purple rounded-2xl p-5 text-white shadow-lg"><User className="h-5 w-5 mb-1" /><h2 className="text-lg font-medium">My Profile</h2></div>
      <Card className="glass-card"><CardContent className="p-4">
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            {avatar ? <img src={avatar} alt="" className="w-20 h-20 rounded-full object-cover" /> : <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-semibold text-blue-600">{user.name?.[0] || '?'}</div>}
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full cursor-pointer"><Camera className="h-3 w-3" /><input type="file" accept="image/*" className="hidden" onChange={handleAvatar} /></label>
          </div>
        </div>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-sm font-normal">Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-sm font-normal">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" /></div>
          <div className="space-y-1"><Label className="text-sm font-normal">Email</Label><Input value={user.email} disabled /></div>
          <div className="space-y-1"><Label className="text-sm font-normal">Referral Code</Label><Input value={user.referralCode} disabled /></div>
        </div>
        {msg && <p className="text-sm text-center mt-2 text-emerald-600">{msg}</p>}
        <Button className="w-full mt-4 hero-blue text-white" onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>
      </CardContent></Card>

      {/* Login Activity Tracking */}
      <Card className="glass-card cursor-pointer" onClick={() => setShowActivity(!showActivity)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-full"><Shield className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="font-medium">Login Activity</p>
                <p className="text-xs text-gray-500">{loginHistory.length} recent sessions</p>
              </div>
            </div>
            <Badge variant="outline">{loginHistory.length}</Badge>
          </div>

          {showActivity && (
            <div className="mt-4 space-y-2 border-t pt-4">
              {loginHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center">No login history</p>
              ) : (
                loginHistory.slice(0, 10).map((login: any) => (
                  <div key={login.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${login.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {login.device?.includes('Mobile') ? <Smartphone className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{login.browser || 'Unknown Browser'}</p>
                        <p className="text-xs text-gray-500">{login.ip || 'Unknown IP'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={login.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {login.status}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(login.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
