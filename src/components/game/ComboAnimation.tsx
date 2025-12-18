"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ComboAnimationProps {
  combo: number
  trigger: number // Change this value to trigger animation
}

export function ComboAnimation({ combo, trigger }: ComboAnimationProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (combo > 1) {
      const showTimeout = setTimeout(() => setShow(true), 0)
      const hideTimeout = setTimeout(() => setShow(false), 2000)
      return () => {
        clearTimeout(showTimeout)
        clearTimeout(hideTimeout)
      }
    }
  }, [trigger, combo])

  if (combo < 2) return null

  const getComboColor = (combo: number) => {
    if (combo >= 10) return "from-purple-500 to-pink-500"
    if (combo >= 7) return "from-orange-500 to-red-500"
    if (combo >= 5) return "from-yellow-500 to-orange-500"
    if (combo >= 3) return "from-blue-500 to-purple-500"
    return "from-green-500 to-blue-500"
  }

  const getComboSize = (combo: number) => {
    if (combo >= 10) return "text-8xl"
    if (combo >= 7) return "text-7xl"
    if (combo >= 5) return "text-6xl"
    if (combo >= 3) return "text-5xl"
    return "text-4xl"
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            rotate: 0,
            opacity: [0, 1, 1, 0.8]
          }}
          exit={{ 
            scale: 0.8,
            opacity: 0,
            y: -50
          }}
          transition={{ 
            duration: 0.6,
            ease: "backOut"
          }}
          className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
          <div className="relative">
            {/* Glow effect */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`absolute inset-0 blur-3xl bg-gradient-to-r ${getComboColor(combo)} rounded-full`}
            />
            
            {/* Main combo text */}
            <div className="relative">
              <motion.div
                animate={{
                  y: [0, -10, 0]
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
                className={`${getComboSize(combo)} font-black tracking-tighter`}
              >
                <span className={`bg-gradient-to-r ${getComboColor(combo)} bg-clip-text text-transparent drop-shadow-2xl`}>
                  x{combo}
                </span>
              </motion.div>
              
              {/* Combo text */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center text-xl font-bold text-white mt-2 drop-shadow-lg"
              >
                COMBO!
              </motion.p>
            </div>

            {/* Rotating rings */}
            {combo >= 5 && (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className={`absolute inset-0 border-4 border-dashed ${getComboColor(combo)} rounded-full opacity-30`}
                  style={{ width: "120%", height: "120%", top: "-10%", left: "-10%" }}
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className={`absolute inset-0 border-4 border-dotted ${getComboColor(combo)} rounded-full opacity-20`}
                  style={{ width: "140%", height: "140%", top: "-20%", left: "-20%" }}
                />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
