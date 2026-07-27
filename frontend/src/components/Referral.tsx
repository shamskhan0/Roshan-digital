import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Users, Gift, Share2 } from 'lucide-react'
import { api } from '@/lib/api-config'

interface Props { user: any }

export default function Referral({ user }: Props) {
  const [data, setData] = useState<any>(null)
  useEffect(() => { fetch(api(`/api/app/referrals/${user.id}`).then(r => r.json()).then(setData).catch(() => {}) }, [user.id])
  if (!data) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-gold rounded-2xl p-5 text-white shadow-lg"><Users className="h-5 w-5 mb-1" /><h2 className="text-lg font-medium">Referral Program</h2><p className="text-amber-100 text-sm font-normal">Invite friends, earn rewards</p></div>
      <Card className="glass-card"><CardContent className="p-4 text-center">
        <p className="text-xs text-gray-500 mb-1">Your Referral Code</p>
        <p className="text-2xl font-semibold tracking-wider">{data.referralCode}</p>
        <div className="flex gap-2 mt-3">
          <Button className="flex-1 hero-blue text-white" onClick={() => { navigator.clipboard.writeText(data.referralCode); alert('Copied!') }}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
          <Button variant="outline" className="flex-1" onClick={() => navigator.share?.({ title: 'Roshan Digital', text: `My referral code: ${data.referralCode}` }).catch(() => {})}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
        </div>
      </CardContent></Card>
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-card"><CardContent className="p-3 text-center"><p className="text-2xl font-semibold">{data.count}</p><p className="text-xs text-gray-500">Total Referrals</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3 text-center"><p className="text-2xl font-semibold text-emerald-600">PKR {data.totalReward.toLocaleString()}</p><p className="text-xs text-gray-500">Total Earned</p></CardContent></Card>
      </div>
      <Card className="glass-card"><CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-amber-500" /><p className="font-medium text-sm">How it works</p></div>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-500 font-normal">
          <li>Share your referral code</li>
          <li>Friend signs up with your code</li>
          <li>Friend activates an investment plan</li>
          <li>Both get the referral bonus!</li>
        </ol>
      </CardContent></Card>
      {data.referrals?.length > 0 && <div><h3 className="font-medium text-sm text-gray-600 mb-2">Your Referrals</h3><div className="space-y-2">{data.referrals.map((r: any) => (<Card key={r.id} className="glass-card"><CardContent className="p-3 flex items-center justify-between"><div><p className="font-medium text-sm">{r.referred?.name || 'User'}</p><p className="text-xs text-gray-500">{r.referred?.email}</p></div><span className={`text-sm font-medium ${r.status === 'approved' ? 'text-emerald-600' : 'text-gray-400'}`}>{r.status === 'approved' ? `+PKR ${r.reward}` : 'Pending'}</span></CardContent></Card>))}</div></div>}
    </div>
  )
}
