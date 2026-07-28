import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { api } from '@/lib/api-config'

interface Props { user: any }

export default function Team({ user }: Props) {
  const [team, setTeam] = useState<any[]>([])
  const [count, setCount] = useState(0)

  useEffect(() => {
    fetch(api('/api/app/team/' + user.id)
      .then(r => r.json())
      .then(d => { setTeam(d.team || []); setCount(d.count || 0) })
      .catch(() => {})
  }, [user.id])

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-purple rounded-2xl p-5 text-white shadow-lg">
        <Users className="h-5 w-5 mb-1" />
        <h2 className="text-lg font-medium">My Team</h2>
        <p className="text-purple-100 text-sm font-normal">{count} members</p>
      </div>
      {team.length === 0 ? (
        <p className="text-center text-gray-400 py-8 font-normal">No team members yet. Share your referral code!</p>
      ) : (
        <div className="space-y-2">
          {team.map(m => (
            <Card key={m.id} className="glass-card">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.email}</p>
                  <p className="text-xs text-gray-400">Joined: {new Date(m.joinedAt).toLocaleDateString()}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">+PKR {m.reward}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
