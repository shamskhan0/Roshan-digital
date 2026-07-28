import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { HelpCircle, Phone, Mail, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api-config'

interface Props { onNav: (s: string) => void }

const FAQ = [
  { q: 'How to deposit?', a: 'Go to Wallet > Deposit, enter amount, select method, upload screenshot and submit. It will be approved by admin.' },
  { q: 'How to withdraw?', a: 'Go to Wallet > Withdraw, enter amount and account details. Admin will process your request.' },
  { q: 'How do tasks work?', a: 'Go to Tasks, complete available tasks to earn rewards credited automatically to your wallet.' },
  { q: 'How does investment work?', a: 'Choose a plan, activate it. Your balance is deducted and daily profits are credited automatically.' },
  { q: 'How does referral earn?', a: 'Share your code. When your referred user activates an investment plan, you both get bonus.' },
  { q: 'When will withdrawal arrive?', a: 'Within 24 hours after admin approval.' },
  { q: 'Why was my deposit rejected?', a: 'Invalid screenshot, wrong amount, or mismatch. Please resubmit.' },
  { q: 'How to contact support?', a: 'Use the Contact Us tab below or email support@roshandigital.com' },
]

export default function HelpCentre({ onNav }: Props) {
  const [tab, setTab] = useState<'faq' | 'contact'>('faq')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [formMsg, setFormMsg] = useState('')

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-blue rounded-2xl p-5 text-white shadow-lg"><HelpCircle className="h-5 w-5 mb-1" /><h2 className="text-lg font-medium">Help Center</h2></div>
      <div className="tab-scroll flex gap-2 pb-1">
        <Button variant={tab === 'faq' ? 'default' : 'outline'} className="flex-1 font-normal min-h-[40px] flex-shrink-0" onClick={() => setTab('faq')}>FAQ</Button>
        <Button variant={tab === 'contact' ? 'default' : 'outline'} className="flex-1 font-normal min-h-[40px] flex-shrink-0" onClick={() => setTab('contact')}>Contact Us</Button>
      </div>
      {tab === 'faq' && (
        <div className="space-y-2">
          {FAQ.map((f, i) => (
            <Card key={i} className="glass-card cursor-pointer" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <CardContent className="p-3">
                <p className="font-medium text-sm">{f.q}</p>
                {openFaq === i && <p className="text-sm text-gray-500 mt-2 font-normal">{f.a}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {tab === 'contact' && (
        <div className="space-y-3">
          <Card className="glass-card"><CardContent className="p-3 flex items-center gap-3"><Phone className="h-5 w-5 text-emerald-500" /><div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">+92-300-1234567</p></div></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-3 flex items-center gap-3"><Mail className="h-5 w-5 text-blue-500" /><div><p className="text-xs text-gray-500">Email</p><p className="font-medium">support@roshandigital.com</p></div></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-purple-500" /><p className="font-medium">Send a Message</p></div>
            <Input placeholder="Your name" /><Input placeholder="Email" /><Input placeholder="Subject" /><Textarea placeholder="Your message..." rows={4} />
            <Button className="w-full hero-blue text-white" onClick={() => setFormMsg('Message sent! We will contact you within 24 hours.')}>Send Message</Button>
            {formMsg && <p className="text-sm text-center text-emerald-600">{formMsg}</p>}
          </CardContent></Card>
        </div>
      )}
    </div>
  )
}
