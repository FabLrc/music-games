import { GameModeType } from "@/types/game"
import { Button } from "@/components/ui/button"

interface GameModeSelectorProps {
  selectedMode: GameModeType
  onModeChange: (mode: GameModeType) => void
}

const GAME_MODES = [
  {
    id: "lyrics-quiz" as GameModeType,
    name: "LYRICS QUIZ",
    icon: "🎤",
    description: "Devinez les paroles manquantes",
  },
  {
    id: "blind-test-title" as GameModeType,
    name: "BLIND TEST",
    icon: "🎵",
    description: "Devinez le titre de la chanson",
  },
  {
    id: "blind-test-artist" as GameModeType,
    name: "ARTISTE",
    icon: "🎸",
    description: "Devinez l'artiste",
  },
  {
    id: "survival" as GameModeType,
    name: "SURVIVAL",
    icon: "⚡",
    description: "Une seule vie, jusqu'où irez-vous ?",
  },
]

export function GameModeSelector({ selectedMode, onModeChange }: GameModeSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">
        Type de jeu
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {GAME_MODES.map((mode) => (
          <Button
            key={mode.id}
            variant="outline"
            onClick={() => onModeChange(mode.id)}
            className={
              selectedMode === mode.id
                ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold border-2 border-pink-400 shadow-lg shadow-pink-500/50 hover:shadow-pink-500/70 py-8 h-auto flex-col items-start"
                : "border-2 border-gray-600 hover:border-pink-400/50 bg-transparent text-white font-semibold py-8 h-auto hover:bg-gray-800/50 flex-col items-start"
            }
          >
            <div className="flex items-center gap-2 w-full">
              <span className="text-2xl">{mode.icon}</span>
              <span className="text-lg">{mode.name}</span>
            </div>
            <span className="text-xs text-gray-300 mt-1 text-left">
              {mode.description}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
