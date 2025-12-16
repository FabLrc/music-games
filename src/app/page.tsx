"use client"

import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MusicQuiz } from "@/components/game/MusicQuiz2"
import { DynamicBackground } from "@/components/DynamicBackground"

export default function Home() {
  const { data: session } = useSession()

  if (session) {
    return <MusicQuiz />
  }

  return (
    <DynamicBackground className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px] border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black shadow-2xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-5xl font-black tracking-wider uppercase mb-3 text-white" style={{ fontFamily: 'Impact, Arial Black, sans-serif', textShadow: '0 0 20px rgba(236, 72, 153, 0.8), 0 0 40px rgba(236, 72, 153, 0.5)' }}>
            🎵 MUSIC QUIZ 🎵
          </CardTitle>
          <p className="text-gray-300 font-semibold text-lg mt-4">N&apos;oubliez pas les paroles!</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-8 pb-8">
          <p className="text-sm text-gray-200 text-center font-medium">🎧 Connectez-vous avec Spotify pour commencer la fête! 🎧</p>
          <Button 
            onClick={() => signIn("spotify")}
            className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-pink-700 text-white font-black text-lg py-6 border-2 border-pink-400 shadow-lg shadow-pink-500/50 hover:shadow-pink-500/80 hover:scale-105 transition-all duration-200"
          >
            🎸 SIGN IN WITH SPOTIFY
          </Button>
        </CardContent>
      </Card>
    </DynamicBackground>
  )
}
