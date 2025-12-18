/**
 * Composant d'avatar avec indicateur de niveau et barre de progression XP
 */

'use client'

import Image from 'next/image'
import { LevelInfo } from '@/lib/player-progress'

interface PlayerAvatarProps {
  imageUrl?: string
  username?: string
  level: number
  levelInfo?: LevelInfo
  size?: number
}

export function PlayerAvatar({ 
  imageUrl, 
  username = 'User', 
  level, 
  levelInfo,
  size = 48
}: PlayerAvatarProps) {
  const strokeWidth = 4
  // Calcul pour placer le cercle à l'extérieur de l'avatar
  // Rayon de l'avatar (size/2) + Espace (3px) + Demi-épaisseur du trait
  const normalizedRadius = (size / 2) + 3 + (strokeWidth / 2)
  const circumference = normalizedRadius * 2 * Math.PI
  
  // Taille du conteneur = Diamètre du cercle + Épaisseur du trait + Marge
  const containerSize = Math.ceil((normalizedRadius + strokeWidth / 2) * 2)
  
  const progress = levelInfo?.progressPercent || 0
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: containerSize, height: containerSize }}>
      {/* Cercle de progression XP */}
      <svg
        height={containerSize}
        width={containerSize}
        className="absolute -rotate-90"
        style={{ filter: 'drop-shadow(0 0 4px rgba(236, 72, 153, 0.5))' }}
      >
        {/* Cercle de fond */}
        <circle
          stroke="rgba(255, 255, 255, 0.2)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={containerSize / 2}
          cy={containerSize / 2}
        />
        {/* Cercle de progression */}
        <circle
          stroke="url(#gradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={containerSize / 2}
          cy={containerSize / 2}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Avatar */}
      <div className="relative z-10" style={{ width: size, height: size }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={username}
            width={size}
            height={size}
            className="rounded-full border-2 border-black"
          />
        ) : (
          <div 
            className="rounded-full border-2 border-black bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold"
            style={{ width: size, height: size, fontSize: size / 2.5 }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Badge de niveau */}
        <div 
          className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full border-2 border-black flex items-center justify-center font-bold text-white z-20"
          style={{ 
            width: size / 2.2, 
            height: size / 2.2,
            fontSize: size / 4.5,
            boxShadow: '0 0 8px rgba(236, 72, 153, 0.8)'
          }}
        >
          {level}
        </div>
      </div>
    </div>
  )
}
