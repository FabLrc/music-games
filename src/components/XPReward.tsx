/**
 * Composant d'affichage des XP gagnés en fin de partie
 */

'use client'

import { useEffect, useState } from 'react'
import { XPGain } from '@/lib/player-progress'
import { Card } from './ui/card'
import { Button } from './ui/button'

interface XPRewardProps {
  xpGain: XPGain | null
  show: boolean
  onClose?: () => void
}

// Générer les positions des particules en dehors du composant pour éviter le re-render
const PARTICLE_POSITIONS = Array.from({ length: 8 }, (_, i) => ({
  left: (i * 12.5 + Math.random() * 10) % 100,
  top: (i * 12.5 + Math.random() * 10) % 100,
  delay: i * 100 + 200,
  duration: 1200 + (i % 3) * 300
}))

export function XPReward({ xpGain, show, onClose }: XPRewardProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    if (show && xpGain) {
      // Petit délai pour déclencher l'animation
      const timer = setTimeout(() => setShouldAnimate(true), 100)
      return () => {
        clearTimeout(timer)
        setShouldAnimate(false)
      }
    }
  }, [show, xpGain])

  if (!show || !xpGain) return null

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <Card 
        className={`relative bg-gradient-to-br from-purple-900/90 to-pink-900/90 border-2 border-pink-500 p-8 max-w-md w-full mx-4 transform transition-all duration-500 ${
          shouldAnimate ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton de fermeture */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center space-y-6">
          {/* Animation XP */}
          <div className="relative">
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse">
              +{xpGain.xpEarned} XP
            </div>
            {/* Particules scintillantes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {PARTICLE_POSITIONS.map((particle, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                  style={{
                    left: `${particle.left}%`,
                    top: `${particle.top}%`,
                    animationDelay: `${particle.delay}ms`,
                    animationDuration: `${particle.duration}ms`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Montée de niveau */}
          {xpGain.leveledUp && (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-white">
                🎉 Niveau Supérieur ! 🎉
              </div>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                Niveau {xpGain.oldLevel} → {xpGain.newLevel}
              </div>
            </div>
          )}

          {/* XP Total */}
          <div className="text-lg text-gray-300">
            XP Total: <span className="font-bold text-white">{xpGain.newTotalXP}</span>
          </div>

          {/* Bouton Continuer */}
          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-pink-700 border-2 border-pink-400 text-white font-bold text-lg py-6 mt-4"
          >
            Continuer
          </Button>
        </div>
      </Card>
    </div>
  )
}
