"use client"

import { useAudioVisualization } from "@/hooks/useAudioVisualization"
import { CSSProperties } from "react"

interface DynamicBackgroundProps {
  children: React.ReactNode
  className?: string
}

export function DynamicBackground({ children, className = "" }: DynamicBackgroundProps) {
  const { bassIntensity, midIntensity, highIntensity, averageIntensity } = useAudioVisualization()

  // Calculer les couleurs en fonction des fréquences audio
  const magentaIntensity = Math.min(1, bassIntensity * 1.5)
  const cyanIntensity = Math.min(1, midIntensity * 1.5)
  const yellowIntensity = Math.min(1, highIntensity * 1.5)

  const backgroundStyle: CSSProperties = {
    background: `
      radial-gradient(
        ellipse 1200px 800px at ${50 + averageIntensity * 20}% ${30 + bassIntensity * 20}%,
        rgba(255, 0, 255, ${0.15 + magentaIntensity * 0.25}) 0%,
        rgba(0, 255, 255, ${0.1 + cyanIntensity * 0.2}) 30%,
        rgba(204, 255, 0, ${0.05 + yellowIntensity * 0.15}) 50%,
        rgba(0, 0, 0, 0.95) 70%,
        #0A0A0A 100%
      )
    `,
    transition: 'background 0.3s ease-out',
  }

  return (
    <div className={`jukebox-background ${className}`} style={backgroundStyle}>
      {/* Particules lumineuses réactives */}
      <div
        className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `rgba(255, 0, 255, ${magentaIntensity * 0.4})`,
          transform: `scale(${1 + bassIntensity})`,
          transition: 'all 0.2s ease-out',
        }}
      />
      
      <div
        className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `rgba(0, 255, 255, ${cyanIntensity * 0.4})`,
          transform: `scale(${1 + midIntensity})`,
          transition: 'all 0.2s ease-out',
        }}
      />
      
      <div
        className="absolute top-1/2 left-1/2 w-40 h-40 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{
          background: `rgba(204, 255, 0, ${yellowIntensity * 0.3})`,
          transform: `translate(-50%, -50%) scale(${1 + highIntensity})`,
          transition: 'all 0.2s ease-out',
        }}
      />

      {children}
    </div>
  )
}
