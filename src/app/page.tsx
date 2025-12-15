"use client"

import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MusicQuiz } from "@/components/game/MusicQuiz"
import { DynamicBackground } from "@/components/DynamicBackground"

export default function Home() {
  const { data: session } = useSession()

  if (session) {
    return <MusicQuiz />
  }

  return (
    <DynamicBackground className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px] border-2 neon-border-cyan bg-gradient-to-br from-gray-900 to-black shadow-2xl shadow-cyan-500/30">
        <CardHeader className="text-center">
          <CardTitle className="text-5xl font-black tracking-wider neon-text-magenta uppercase mb-2" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
            🎵 MUSIC QUIZ 🎵
          </CardTitle>
          <p className="text-cyan-400 font-semibold text-lg mt-4">N'oubliez pas les paroles!</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-sm text-yellow-300 text-center font-medium">🎧 Connectez-vous avec Spotify pour commencer la fête! 🎧</p>
          <Button 
            onClick={() => signIn("spotify")}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-black text-lg py-6 border-2 border-green-400 shadow-lg shadow-green-500/50 hover:shadow-green-500/80 hover:scale-105 transition-all duration-200"
          >
            🎸 SIGN IN WITH SPOTIFY
          </Button>
        </CardContent>
      </Card>
    </DynamicBackground>
  )
}
