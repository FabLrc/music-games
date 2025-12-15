"use client"

import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MusicQuiz } from "@/components/game/MusicQuiz"

export default function Home() {
  const { data: session } = useSession()

  if (session) {
    return <MusicQuiz />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Music Quiz</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Login with Spotify to play</p>
          <Button onClick={() => signIn("spotify")}>Sign in with Spotify</Button>
        </CardContent>
      </Card>
    </div>
  )
}
