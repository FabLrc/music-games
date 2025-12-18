"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  velocity: { x: number; y: number }
  rotation: number
  shape: "circle" | "star" | "heart" | "note"
}

interface ParticleEffectProps {
  trigger: number // Change this value to trigger particles
  type?: "success" | "perfect" | "streak"
  intensity?: "low" | "medium" | "high"
}

const musicNoteIcon = "♪"
const heartIcon = "♥"
const starIcon = "★"

export function ParticleEffect({ trigger, type = "success", intensity = "medium" }: ParticleEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (trigger === 0) return

    const particleCount = intensity === "high" ? 30 : intensity === "medium" ? 20 : 10
    const newParticles: Particle[] = []

    const colors = type === "perfect" 
      ? ["#FFD700", "#FFA500", "#FF6347"]
      : type === "streak"
      ? ["#9333EA", "#EC4899", "#F59E0B"]
      : ["#10B981", "#3B82F6", "#8B5CF6"]

    const shapes: Array<"circle" | "star" | "heart" | "note"> = 
      type === "perfect" 
        ? ["star", "star", "circle"]
        : type === "streak"
        ? ["note", "heart", "star"]
        : ["circle", "note", "heart"]

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount
      const velocity = 2 + Math.random() * 3
      
      const rotationDirection = Math.random() > 0.5 ? 360 : -360
      newParticles.push({
        id: Date.now() + i,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 20 + Math.random() * 30,
        velocity: {
          x: Math.cos(angle) * velocity,
          y: Math.sin(angle) * velocity - 2, // Upward bias
        },
        rotation: Math.random() * 360 + rotationDirection,
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      })
    }

    const setParticlesTimeout = setTimeout(() => setParticles(newParticles), 0)

    const clearParticlesTimeout = setTimeout(() => {
      setParticles([])
    }, 2000)

    return () => {
      clearTimeout(setParticlesTimeout)
      clearTimeout(clearParticlesTimeout)
    }
  }, [trigger, type, intensity])

  const renderShape = (particle: Particle) => {
    const shapeProps = {
      style: { 
        color: particle.color,
        fontSize: particle.size
      }
    }

    switch (particle.shape) {
      case "star":
        return <span {...shapeProps}>{starIcon}</span>
      case "heart":
        return <span {...shapeProps}>{heartIcon}</span>
      case "note":
        return <span {...shapeProps}>{musicNoteIcon}</span>
      case "circle":
        return (
          <div 
            className="rounded-full"
            style={{ 
              width: particle.size, 
              height: particle.size,
              backgroundColor: particle.color
            }}
          />
        )
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: particle.x, 
              y: particle.y,
              scale: 0,
              opacity: 1,
              rotate: particle.rotation
            }}
            animate={{ 
              x: particle.x + particle.velocity.x * 100,
              y: particle.y + particle.velocity.y * 100 - 100, // gravity
              scale: [0, 1, 0.8],
              opacity: [1, 1, 0],
              rotate: particle.rotation
            }}
            exit={{ 
              opacity: 0,
              scale: 0
            }}
            transition={{ 
              duration: 1.5,
              ease: "easeOut"
            }}
            className="absolute"
          >
            {renderShape(particle)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
