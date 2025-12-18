"use client"

import { useEffect, useRef } from "react"

interface DynamicBackgroundProps {
  children: React.ReactNode
  className?: string
}

export function DynamicBackground({ children, className = "" }: DynamicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particle class
    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
      canvasWidth: number
      canvasHeight: number

      constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight
        this.x = Math.random() * canvasWidth
        this.y = Math.random() * canvasHeight
        this.vx = (Math.random() - 0.5) * 0.3 // Ralenti de 0.5 à 0.3
        this.vy = (Math.random() - 0.5) * 0.3
        this.radius = Math.random() * 2 + 1
        
        // Couleurs adaptées au thème rose/fuchsia/magenta
        const colors = [
          'rgba(236, 72, 153, 0.6)',  // pink-500
          'rgba(217, 70, 239, 0.6)',  // fuchsia-500
          'rgba(192, 38, 211, 0.6)',  // fuchsia-600
          'rgba(232, 121, 249, 0.6)', // fuchsia-400
        ]
        this.color = colors[Math.floor(Math.random() * colors.length)]
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        if (this.x < 0 || this.x > this.canvasWidth) this.vx *= -1
        if (this.y < 0 || this.y > this.canvasHeight) this.vy *= -1
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.fill()
      }
    }

    // Create particles
    const particles: Particle[] = []
    const particleCount = 100

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas.width, canvas.height))
    }

    // Animation loop
    const animate = () => {
      if (!ctx) return
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)' // Trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particles.forEach(particle => {
        particle.update()
        particle.draw()
      })

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(236, 72, 153, ${0.2 * (1 - distance / 150)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        })
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full -z-10"
        style={{ filter: 'blur(1px)' }}
      />
      {children}
    </div>
  )
}
