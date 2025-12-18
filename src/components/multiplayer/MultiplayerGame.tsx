/**
 * Composant de jeu multijoueur synchronisé
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMultiplayerRoom } from '@/hooks/useMultiplayerRoom';
import { usePlayerProgress } from '@/hooks/usePlayerProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ComboAnimation } from '@/components/game/ComboAnimation';
import { ParticleEffect } from '@/components/game/ParticleEffect';
import { ShakeEffect, WrongAnswerEffect } from '@/components/game/ShakeEffect';
import type { GameEvent } from '@/types/multiplayer';

interface MultiplayerGameProps {
  roomId: string;
}

interface SimpleQuestion {
  question: string;
  answers: string[];
  correctIndex: number;
  hint?: string;
}

export function MultiplayerGame({ roomId }: MultiplayerGameProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { lobbyState, broadcastGameEvent } = useMultiplayerRoom(roomId);
  const { earnXP } = usePlayerProgress();
  const [currentQuestion, setCurrentQuestion] = useState<SimpleQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [playerScores, setPlayerScores] = useState<Map<string, number>>(new Map());
  const [particleTrigger, setParticleTrigger] = useState(0);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [comboTrigger, setComboTrigger] = useState(0);
  const [combo, setCombo] = useState(0);

  // Le host contrôle la progression du jeu
  const isHost = lobbyState?.currentUser?.is_host || false;

  // Charger une question simple (pour démo)
  useEffect(() => {
    if (!lobbyState) return;
    
    // Question simple pour démo
    const demoQuestion: SimpleQuestion = {
      question: `Question ${currentQuestionIndex + 1}: Quelle est votre humeur aujourd'hui ?`,
      answers: ['Heureux', 'Excité', 'Calme', 'Énergique'],
      correctIndex: 0,
      hint: 'Il n\'y a pas de mauvaise réponse !',
    };
    
    setCurrentQuestion(demoQuestion);
  }, [currentQuestionIndex, lobbyState]);

  // Gérer une réponse
  const handleAnswer = useCallback(
    async (answerIndex: number) => {
      if (hasAnswered || !currentQuestion || !session?.user?.id) return;

      const isCorrect = answerIndex === currentQuestion.correctIndex;
      setHasAnswered(true);

      // Mettre à jour le score local
      const newScore = isCorrect ? score + 1 : score;
      setScore(newScore);
      setPlayerScores((prev) => new Map(prev).set(session.user.id!, newScore));

      // Trigger visual effects
      if (isCorrect) {
        setParticleTrigger(prev => prev + 1);
        setCombo(prev => prev + 1);
        if (combo + 1 > 1) {
          setComboTrigger(prev => prev + 1);
        }
      } else {
        setShakeTrigger(prev => prev + 1);
        setCombo(0);
      }

      // Broadcast la réponse aux autres joueurs
      const event: GameEvent = {
        type: 'player_answer',
        user_id: session.user.id,
        is_correct: isCorrect,
        score: newScore,
      };

      await broadcastGameEvent(event);

      // Le host passe à la question suivante après un délai
      if (isHost) {
        setTimeout(async () => {
          if (currentQuestionIndex < 9) {
            const nextEvent: GameEvent = {
              type: 'next_track',
              track_index: currentQuestionIndex + 1,
            };
            broadcastGameEvent(nextEvent);
            setCurrentQuestionIndex((prev) => prev + 1);
            setHasAnswered(false);
          } else {
            // Fin de la partie
            const finalScoresArray = Array.from(playerScores.entries()).map(
              ([user_id, score]) => ({ user_id, score })
            );
            const endEvent: GameEvent = {
              type: 'game_end',
              final_scores: finalScoresArray,
            };
            broadcastGameEvent(endEvent);
            
            // Gagner de l'XP pour le score final
            await earnXP(score);
            
            router.push(`/multiplayer/results/${roomId}`);
          }
        }, 3000);
      }
    },
    [
      hasAnswered,
      currentQuestion,
      session,
      score,
      broadcastGameEvent,
      isHost,
      currentQuestionIndex,
      playerScores,
      roomId,
      router,
      earnXP,
      combo,
    ]
  );

  if (!lobbyState || !currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <p className="text-center">Chargement du jeu...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden p-4 md:p-8">
      {/* Visual Effects */}
      <ComboAnimation combo={combo} trigger={comboTrigger} />
      <ParticleEffect 
        trigger={particleTrigger} 
        type={combo >= 5 ? "streak" : "success"}
        intensity={combo >= 10 ? "high" : combo >= 5 ? "medium" : "low"}
      />
      <WrongAnswerEffect trigger={shakeTrigger} />

      <ShakeEffect trigger={shakeTrigger} intensity="medium">
        <div className="w-full max-w-4xl mx-auto flex flex-col h-full overflow-y-auto custom-scrollbar">
        {/* En-tête avec scores */}
        <div className="mb-6 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">
                Question {currentQuestionIndex + 1}/10
              </h1>
              <p className="text-muted-foreground">Mode: {lobbyState.room.game_mode}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{score}</p>
              <p className="text-sm text-muted-foreground">Votre score</p>
            </div>
          </div>

          <Progress value={((currentQuestionIndex + 1) / 10) * 100} className="mb-4" />

          {/* Scores des autres joueurs */}
          <div className="flex gap-2 flex-wrap">
            {lobbyState.players
              .filter((p) => p.is_connected)
              .map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-sm"
                >
                  <span>{player.username}</span>
                  <span className="font-bold">{playerScores.get(player.user_id) || 0}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Question */}
        <Card className="mb-6 shrink-0">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2">{currentQuestion.question}</h2>
            {currentQuestion.hint && (
              <p className="text-sm text-muted-foreground mb-4">💡 {currentQuestion.hint}</p>
            )}
          </CardContent>
        </Card>

        {/* Réponses */}
        <div className="grid gap-3 shrink-0">
          {currentQuestion.answers.map((answer, index) => (
            <Button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={hasAnswered}
              size="lg"
              variant={
                hasAnswered
                  ? index === currentQuestion.correctIndex
                    ? 'default'
                    : 'outline'
                  : 'outline'
              }
              className={`text-left justify-start h-auto py-4 ${
                hasAnswered && index === currentQuestion.correctIndex
                  ? 'bg-green-600 hover:bg-green-600'
                  : hasAnswered
                  ? 'opacity-50'
                  : ''
              }`}
            >
              <span className="mr-3 font-bold">{String.fromCharCode(65 + index)}.</span>
              <span>{answer}</span>
            </Button>
          ))}
        </div>

        {/* Feedback */}
        {hasAnswered && (
          <Card className="mt-6 shrink-0">
            <CardContent className="pt-6 text-center">
              <p className="text-lg">
                {currentQuestionIndex < 9
                  ? 'Question suivante dans quelques secondes...'
                  : 'Partie terminée ! Redirection vers les résultats...'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      </ShakeEffect>
    </div>
  );
}
