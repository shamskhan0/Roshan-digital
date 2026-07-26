import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Shield } from 'lucide-react'
import RoshanLogo from '@/components/RoshanLogo'

interface AuthProps { onLogin: (user: any) => void }

type Screen = 'login' | 'register' | 'otp' | 'verify-signup' | 'forgot' | 'forgot-otp' | 'reset-password'

export default function Auth({ onLogin }: AuthProps) {
  const [screen, setScreen] = useState<Screen>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState('')
  const [pendingUser, setPendingUser] = useState<any>(null)

  const sendOTP = async (target: string, purpose: string) => {
    const res = await fetch('/api/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, purpose }) })
    const data = await res.json()
    if (data.ok) setOtpSent(data.otp || '')
    return data
  }

  const handleRegister = async () => {
    setError('')
    if (!email || !password || !name) { setError('Name, email and password are required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name, phone, referralCode: referralCode || undefined }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      setPendingUser(data.user)
      await sendOTP(email, 'signup')
      setScreen('verify-signup')
    } catch { setError('Server connection failed') } finally { setLoading(false) }
  }

  const handleVerifySignup = async () => {
    setError('')
    if (!otp) { setError('Enter OTP'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: email, code: otp, purpose: 'signup' }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid OTP'); return }
      await fetch('/api/auth/verify-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: pendingUser.id }) })
      await fetch('/api/auto-seed')
      onLogin(pendingUser)
    } catch { setError('Error') } finally { setLoading(false) }
  }

  const handleLogin = async () => {
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      setPendingUser(data.user)
      await sendOTP(email, 'login')
      setScreen('otp')
    } catch { setError('Server connection failed') } finally { setLoading(false) }
  }

  const handleVerifyLogin = async () => {
    setError('')
    if (!otp) { setError('Enter OTP'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: email, code: otp, purpose: 'login' }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid OTP'); return }
      await fetch('/api/auto-seed')
      onLogin(pendingUser)
    } catch { setError('Error') } finally { setLoading(false) }
  }

  const handleForgotPassword = async () => {
    setError('')
    if (!email) { setError('Enter email'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      setOtpSent(data.otp || '')
      setScreen('forgot-otp')
    } catch { setError('Error') } finally { setLoading(false) }
  }

  const handleResetPassword = async () => {
    setError('')
    if (!otp || !newPassword) { setError('OTP and new password are required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: otp, newPassword }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      alert('Password changed successfully! Please login.')
      setScreen('login'); setPassword(''); setOtp(''); setNewPassword('')
    } catch { setError('Error') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md animate-fade-in-up">
        <Card className="glass-card overflow-hidden">
          <div className="hero-blue p-6 text-center text-white">
            <div className="flex justify-center mb-3">
              <RoshanLogo size={64} />
            </div>
            <h1 className="text-xl font-semibold">Roshan Digital</h1>
            <p className="text-blue-100 text-sm mt-1">
              {screen === 'login' && 'Sign in to your account'}
              {screen === 'register' && 'Create your account'}
              {screen === 'otp' && 'Verify your identity'}
              {screen === 'verify-signup' && 'Activate your account'}
              {screen === 'forgot' && 'Reset your password'}
              {screen === 'forgot-otp' && 'Set new password'}
            </p>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-4">
            {screen === 'login' && (
              <>
                <div className="space-y-1">
                  <Label className="text-sm font-normal">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-normal">Password</Label>
                  <div className="relative">
                    <Input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
                    <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button variant="link" className="text-sm px-0 h-auto" onClick={() => { setScreen('forgot'); setError('') }}>Forgot Password?</Button>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button className="w-full hero-blue text-white" onClick={handleLogin} disabled={loading}>
                  {loading ? 'Please wait...' : <><LogIn className="mr-2 h-4 w-4" /> Sign In</>}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => { setScreen('register'); setError('') }}>Create Account</Button>
              </>
            )}

            {screen === 'register' && (
              <>
                <div className="space-y-1"><Label className="text-sm font-normal">Full Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></div>
                <div className="space-y-1"><Label className="text-sm font-normal">Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></div>
                <div className="space-y-1"><Label className="text-sm font-normal">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 1234567" /></div>
                <div className="space-y-1">
                  <Label className="text-sm font-normal">Password * (min 6 chars)</Label>
                  <div className="relative">
                    <Input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create password" />
                    <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1"><Label className="text-sm font-normal">Referral Code (Optional)</Label><Input value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="Enter code" /></div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button className="w-full hero-blue text-white" onClick={handleRegister} disabled={loading}>
                  {loading ? 'Please wait...' : <><UserPlus className="mr-2 h-4 w-4" /> Sign Up</>}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => { setScreen('login'); setError('') }}>Already have an account? Sign In</Button>
              </>
            )}

            {screen === 'otp' && (
              <>
                <div className="text-center"><Shield className="h-12 w-12 text-blue-500 mx-auto mb-2" /><p className="text-sm text-gray-500">OTP sent to {email}</p>
                  {otpSent && <p className="text-xs text-amber-600 mt-1">Demo: {otpSent}</p>}
                </div>
                <div className="space-y-1"><Label className="text-sm font-normal">Enter OTP</Label><Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px' }} /></div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button className="w-full hero-blue text-white" onClick={handleVerifyLogin} disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</Button>
                <Button variant="ghost" className="w-full" onClick={() => sendOTP(email, 'login').then(() => alert('OTP resent!'))}>Resend OTP</Button>
                <Button variant="ghost" className="w-full" onClick={() => { setScreen('login'); setError(''); setOtp('') }}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              </>
            )}

            {screen === 'verify-signup' && (
              <>
                <div className="text-center"><Shield className="h-12 w-12 text-emerald-500 mx-auto mb-2" /><p className="text-sm text-gray-500">OTP sent to {email}</p><p className="text-xs text-gray-400">Verify to activate account</p>
                  {otpSent && <p className="text-xs text-amber-600 mt-1">Demo: {otpSent}</p>}
                </div>
                <div className="space-y-1"><Label className="text-sm font-normal">Enter OTP</Label><Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px' }} /></div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button className="w-full hero-blue text-white" onClick={handleVerifySignup} disabled={loading}>{loading ? 'Activating...' : 'Activate Account'}</Button>
                <Button variant="ghost" className="w-full" onClick={() => sendOTP(email, 'signup').then(() => alert('OTP resent!'))}>Resend OTP</Button>
              </>
            )}

            {screen === 'forgot' && (
              <>
                <div className="text-center"><p className="text-sm text-gray-500">Enter your registered email</p></div>
                <div className="space-y-1"><Label className="text-sm font-normal">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button className="w-full hero-blue text-white" onClick={handleForgotPassword} disabled={loading}>{loading ? 'Sending...' : 'Send OTP'}</Button>
                <Button variant="ghost" className="w-full" onClick={() => { setScreen('login'); setError('') }}><ArrowLeft className="mr-1 h-4 w-4" /> Back to Sign In</Button>
              </>
            )}

            {screen === 'forgot-otp' && (
              <>
                <div className="text-center"><Shield className="h-12 w-12 text-blue-500 mx-auto mb-2" /><p className="text-sm text-gray-500">OTP sent to {email}</p>
                  {otpSent && <p className="text-xs text-amber-600 mt-1">Demo: {otpSent}</p>}
                </div>
                <div className="space-y-1"><Label className="text-sm font-normal">Enter OTP</Label><Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px' }} /></div>
                <div className="space-y-1"><Label className="text-sm font-normal">New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" /></div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button className="w-full hero-blue text-white" onClick={handleResetPassword} disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</Button>
                <Button variant="ghost" className="w-full" onClick={() => sendOTP(email, 'password-reset').then(() => alert('OTP resent!'))}>Resend OTP</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
