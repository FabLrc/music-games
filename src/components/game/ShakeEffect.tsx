"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ShakeEffectProps {
  trigger: number // Change this value to trigger shake
  children: React.ReactNode
  intensity?: "low" | "medium" | "high"
}

export function ShakeEffect({ trigger, children, intensity = "medium" }: ShakeEffectProps) {
  const [isShaking, setIsShaking] = useState(false)

  useEffect(() => {
    if (trigger === 0) return

    const shakeTimeout = setTimeout(() => setIsShaking(true), 0)
    const resetTimeout = setTimeout(() => setIsShaking(false), 600)
    return () => {
      clearTimeout(shakeTimeout)
      clearTimeout(resetTimeout)
    }
  }, [trigger])

  const shakeIntensity = {
    low: 5,
    medium: 10,
    high: 15
  }[intensity]

  return (
    <motion.div
      animate={isShaking ? {
        x: [0, -shakeIntensity, shakeIntensity, -shakeIntensity, shakeIntensity, 0],
        y: [0, shakeIntensity, -shakeIntensity, shakeIntensity, -shakeIntensity, 0],
        rotate: [0, -2, 2, -2, 2, 0]
      } : {}}
      transition={{
        duration: 0.5,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  )
}

interface WrongAnswerEffectProps {
  trigger: number
}

export function WrongAnswerEffect({ trigger }: WrongAnswerEffectProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (trigger === 0) return

    const showTimeout = setTimeout(() => setShow(true), 0)
    const hideTimeout = setTimeout(() => setShow(false), 1000)
    return () => {
      clearTimeout(showTimeout)
      clearTimeout(hideTimeout)
    }
  }, [trigger])

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Red flash overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 bg-red-600 pointer-events-none z-40"
          />

          {/* X mark */}
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotate: 0,
              opacity: [0, 1, 0.8, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div className="relative">
              {/* Glow */}
              <div className="absolute inset-0 blur-3xl bg-red-500 rounded-full opacity-60" />
              
              {/* X */}
              <div className="relative text-9xl font-black text-red-500 drop-shadow-2xl">
                ✕
              </div>
            </div>
          </motion.div>

          {/* Error particles */}
          {[...Array(8)].map((_, i) => {
            const angle = (Math.PI * 2 * i) / 8
            return (
              <motion.div
                key={i}
                initial={{
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                  scale: 1,
                  opacity: 1
                }}
                animate={{
                  x: window.innerWidth / 2 + Math.cos(angle) * 150,
                  y: window.innerHeight / 2 + Math.sin(angle) * 150,
                  scale: 0,
                  opacity: 0
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeOut"
                }}
                className="fixed w-4 h-4 bg-red-500 rounded-full pointer-events-none z-40"
              />
            )
          })}
        </>
      )}
    </AnimatePresence>
  )
}
