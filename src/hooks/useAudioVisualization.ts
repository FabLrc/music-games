"use client"

import { useEffect, useState, useRef } from "react"

interface AudioVisualizationData {
  bassIntensity: number
  midIntensity: number
  highIntensity: number
  averageIntensity: number
}

export function useAudioVisualization() {
  const [visualizationData, setVisualizationData] = useState<AudioVisualizationData>({
    bassIntensity: 0,
    midIntensity: 0,
    highIntensity: 0,
    averageIntensity: 0,
  })

  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    // Simulation de données audio avec des valeurs aléatoires fluides
    // car l'API Web Audio ne peut pas accéder au flux audio de l'iframe Spotify (CORS/DRM)
    let bassPhase = Math.random() * 100
    let midPhase = Math.random() * 100
    let highPhase = Math.random() * 100
    
    // Vitesses de phase différentes pour créer de la variété
    const bassSpeed = 0.03 + Math.random() * 0.02
    const midSpeed = 0.05 + Math.random() * 0.03
    const highSpeed = 0.07 + Math.random() * 0.04

    const animate = () => {
      bassPhase += bassSpeed
      midPhase += midSpeed
      highPhase += highSpeed

      // Utilisation de plusieurs ondes sinusoïdales pour un mouvement plus organique
      const bassIntensity = (Math.sin(bassPhase) * 0.5 + 0.5) * 0.6 + (Math.sin(bassPhase * 0.5) * 0.5 + 0.5) * 0.2
      const midIntensity = (Math.sin(midPhase) * 0.5 + 0.5) * 0.5 + (Math.sin(midPhase * 1.3) * 0.5 + 0.5) * 0.2
      const highIntensity = (Math.sin(highPhase) * 0.5 + 0.5) * 0.4 + (Math.sin(highPhase * 2.1) * 0.5 + 0.5) * 0.2
      
      const averageIntensity = (bassIntensity + midIntensity + highIntensity) / 3

      setVisualizationData({
        bassIntensity,
        midIntensity,
        highIntensity,
        averageIntensity,
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return visualizationData
}
