import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, CheckCircle, AlertCircle, Info, Check } from 'lucide-react'
import { api } from '@/lib/api-config'

interface Props { user: any }

export default function Notifications({ user }: Props) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    fetch(api('/api/app/notifications/' + user.id)
      .then(r => r.json())
      .then(d => { setNotifications(d.notifications || []); setUnread(d.unread || 0) })
      .catch(() => {})
  }, [user.id])

  const markRead = async (id: string) => {
    await fetch(api('/api/app/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    })
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(u => Math.max(0, u - 1))
  }

  const markAllRead = async () => {
    await fetch(api('/api/app/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
    setNotifications(p => p.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': case 'reward': return <CheckCircle className="h-5 w-5 text-emerald-500" />
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />
      default: return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-blue rounded-2xl p-5 text-white shadow-lg flex items-center justify-between">
        <div>
          <Bell className="h-5 w-5 mb-1" />
          <h2 className="text-lg font-medium">Notifications</h2>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" className="font-normal" onClick={markAllRead}>
            <Check className="mr-1 h-4 w-4" /> Mark all read ({unread})
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-center text-gray-400 py-8 font-normal">No notifications</p>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card
              key={n.id}
              className={`glass-card transition-all ${n.read ? 'opacity-60' : 'border-l-4 border-l-blue-500'}`}
              onClick={() => !n.read && markRead(n.id)}
            >
              <CardContent className="p-3 flex items-start gap-3">
                {getIcon(n.type)}
                <div className="flex-1">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-gray-500 font-normal">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1 font-normal">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && <div className="h-2 w-2 bg-blue-500 rounded-full mt-2" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
