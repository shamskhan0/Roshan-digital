import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, TrendingUp, PiggyBank, Gift, Zap } from 'lucide-react'

interface Props { user: any; onNav: (s: string) => void }

export default function Wallet({ user, onNav }: Props) {
  const [wallet, setWallet] = useState<any>(null)
  useEffect(() => { fetch(`/api/app/wallet/${user.id}`).then(r => r.json()).then(d => setWallet(d.wallet)).catch(() => {}) }, [user.id])
  if (!wallet) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  const mainBalance = wallet.mainBalance ?? wallet.balance ?? 0
  const totalDeposited = wallet.totalDeposited ?? wallet.deposited ?? 0
  const totalWithdrawn = wallet.totalWithdrawn ?? wallet.withdrawn ?? 0
  const totalEarned = wallet.totalEarned ?? wallet.earned ?? 0

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-blue rounded-2xl p-6 text-white shadow-lg">
        <WalletIcon className="h-5 w-5 mb-1" /><p className="text-3xl font-semibold mt-1">PKR {mainBalance.toLocaleString()}</p>
        <p className="text-blue-100 text-sm font-normal">Main Balance</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/15 rounded-xl p-3 text-center"><ArrowDownLeft className="h-4 w-4 mx-auto mb-1 text-blue-200" /><p className="font-medium text-sm">PKR {totalDeposited.toLocaleString()}</p><p className="text-xs text-blue-100">Total Deposited</p></div>
          <div className="bg-white/15 rounded-xl p-3 text-center"><ArrowUpRight className="h-4 w-4 mx-auto mb-1 text-blue-200" /><p className="font-medium text-sm">PKR {totalWithdrawn.toLocaleString()}</p><p className="text-xs text-blue-100">Total Withdrawn</p></div>
        </div>
      </div>

      {/* Multi-Wallet Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-card"><CardContent className="p-3 text-center"><Zap className="h-5 w-5 text-purple-500 mx-auto mb-1" /><p className="text-sm font-semibold">PKR {(wallet.investmentBalance ?? 0).toLocaleString()}</p><p className="text-xs text-gray-500">Investment</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3 text-center"><Gift className="h-5 w-5 text-amber-500 mx-auto mb-1" /><p className="text-sm font-semibold">PKR {(wallet.referralBalance ?? 0).toLocaleString()}</p><p className="text-xs text-gray-500">Referral</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3 text-center"><PiggyBank className="h-5 w-5 text-emerald-500 mx-auto mb-1" /><p className="text-sm font-semibold">PKR {(wallet.bonusBalance ?? 0).toLocaleString()}</p><p className="text-xs text-gray-500">Bonus</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3 text-center"><TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-1" /><p className="text-sm font-semibold">PKR {totalEarned.toLocaleString()}</p><p className="text-xs text-gray-500">Total Earned</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button className="h-14 hero-blue text-white" onClick={() => onNav('deposit')}><ArrowDownLeft className="mr-2 h-5 w-5" /> Deposit</Button>
        <Button variant="outline" className="h-14" onClick={() => onNav('withdraw')}><ArrowUpRight className="mr-2 h-5 w-5" /> Withdraw</Button>
      </div>
    </div>
  )
}
