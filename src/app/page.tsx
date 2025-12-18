"use client"

import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dashboard } from "@/components/Dashboard"
import { DynamicBackground } from "@/components/DynamicBackground"
import { Music2, Youtube } from "lucide-react"

export default function Home() {
  const { data: session } = useSession()

  if (session) {
    return <Dashboard />
  }

  return (
    <DynamicBackground className="flex h-screen flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
      <Card className="w-full max-w-[450px] border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black shadow-2xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-5xl font-black tracking-wider uppercase mb-3 text-white" style={{ fontFamily: 'Impact, Arial Black, sans-serif', textShadow: '0 0 20px rgba(236, 72, 153, 0.8), 0 0 40px rgba(236, 72, 153, 0.5)' }}>
            🎵 MUSIC QUIZ 🎵
          </CardTitle>
          <p className="text-gray-300 font-semibold text-lg mt-4">Testez vos connaissances musicales !</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-8 pb-8">
          <p className="text-sm text-gray-200 text-center font-medium">🎧 Connectez-vous avec votre plateforme de streaming préférée! 🎧</p>
          
          {/* Spotify Button - Active */}
          <Button 
            onClick={() => signIn("spotify")}
            className="bg-black hover:bg-gray-900 text-white font-bold text-base py-6 border-2 border-[#1DB954] shadow-lg shadow-[#1DB954]/30 hover:shadow-[#1DB954]/50 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#1DB954">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Se connecter avec Spotify
          </Button>

          {/* Deezer Button - Coming Soon */}
          <div className="relative group">
            <Button 
              disabled
              className="w-full bg-black/50 text-gray-400 font-bold text-base py-6 border-2 border-gray-600 cursor-not-allowed flex items-center justify-center gap-3 opacity-60"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#FF0092">
                <path d="M18.81 4.16v3.03h3.96V4.16h-3.96zm0 3.93v3.03h3.96V8.09h-3.96zm0 3.93v3.03h3.96v-3.03h-3.96zm-4.5-7.86v3.03h3.96V4.16h-3.96zm0 3.93v3.03h3.96V8.09h-3.96zm0 3.93v3.03h3.96v-3.03h-3.96zm0 3.93v3.03h3.96v-3.03h-3.96zm-4.5-11.79v3.03h3.96V4.16h-3.96zm0 3.93v3.03h3.96V8.09h-3.96zm0 3.93v3.03h3.96v-3.03h-3.96zm0 3.93v3.03h3.96v-3.03h-3.96zm-4.5-7.86v3.03h3.96V8.09H5.31zm0 3.93v3.03h3.96v-3.03H5.31zm0 3.93v3.03h3.96v-3.03H5.31zM.81 12.02v3.03h3.96v-3.03H.81zm0 3.93v3.03h3.96v-3.03H.81z"/>
              </svg>
              Se connecter avec Deezer
            </Button>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-gray-800 text-white px-3 py-1 rounded text-sm font-medium shadow-lg">
                Bientôt disponible
              </span>
            </div>
          </div>

          {/* Apple Music Button - Coming Soon */}
          <div className="relative group">
            <Button 
              disabled
              className="w-full bg-black/50 text-gray-400 font-bold text-base py-6 border-2 border-gray-600 cursor-not-allowed flex items-center justify-center gap-3 opacity-60"
            >
              <Music2 className="w-6 h-6" color="#FC3C44" />
              Se connecter avec Apple Music
            </Button>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-gray-800 text-white px-3 py-1 rounded text-sm font-medium shadow-lg">
                Bientôt disponible
              </span>
            </div>
          </div>

          {/* YouTube Music Button - Coming Soon */}
          <div className="relative group">
            <Button 
              disabled
              className="w-full bg-black/50 text-gray-400 font-bold text-base py-6 border-2 border-gray-600 cursor-not-allowed flex items-center justify-center gap-3 opacity-60"
            >
              <Youtube className="w-6 h-6" color="#FF0000" />
              Se connecter avec YouTube Music
            </Button>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-gray-800 text-white px-3 py-1 rounded text-sm font-medium shadow-lg">
                Bientôt disponible
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </DynamicBackground>
  )
}
