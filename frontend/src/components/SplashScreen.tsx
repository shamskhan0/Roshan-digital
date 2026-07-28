import { useState, useEffect } from 'react'
import RoshanLogo from './RoshanLogo'
import { api } from '@/lib/api-config'

interface Props {
  onComplete: () => void
}

const STAGES = [
  { text: 'Initializing...', duration: 400 },
  { text: 'Checking connection...', duration: 500 },
  { text: 'Loading secure session...', duration: 400 },
  { text: 'Connecting to cloud...', duration: 400 },
  { text: 'Preparing dashboard...', duration: 300 },
]

export default function SplashScreen({ onComplete }: Props) {
  const [stage, setStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let elapsed = 0
    const totalDuration = STAGES.reduce((sum, s) => sum + s.duration, 0)

    const progressInterval = setInterval(() => {
      elapsed += 20
      const pct = Math.min((elapsed / totalDuration) * 100, 100)
      setProgress(pct)
    }, 20)

    let currentStage = 0
    let timeout: ReturnType<typeof setTimeout>

    const advanceStage = () => {
      if (currentStage < STAGES.length) {
        setStage(currentStage)
        timeout = setTimeout(() => {
          currentStage++
          advanceStage()
        }, STAGES[currentStage].duration)
      } else {
        setExiting(true)
        setTimeout(onComplete, 500)
      }
    }

    advanceStage()

    return () => {
      clearInterval(progressInterval)
      clearTimeout(timeout)
    }
  }, [onComplete])

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${exiting ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col items-center gap-6 animate-splash-logo">
        <div className="animate-splash-pulse">
          <RoshanLogo size={100} />
        </div>

        <div className="text-center animate-splash-fade-in" style={{ animationDelay: '0.3s' }}>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-500 bg-clip-text text-transparent">
            Roshan Digital
          </h1>
          <p className="text-sm text-gray-400 mt-1 font-normal">Secure Digital Platform</p>
        </div>
      </div>

      <div className="absolute bottom-20 left-0 right-0 px-12 animate-splash-fade-in" style={{ animationDelay: '0.6s' }}>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-center mt-3 font-normal">
          {STAGES[stage]?.text || 'Ready'}
        </p>
      </div>

      <div className="absolute bottom-8 text-center animate-splash-fade-in" style={{ animationDelay: '0.8s' }}>
        <p className="text-[10px] text-gray-300">Version 2.0</p>
      </div>
    </div>
  )
}
