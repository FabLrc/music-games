/**
 * Page du classement global
 */

import { Leaderboard } from "@/components/Leaderboard";

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6 text-center">🏆 Classement Global</h1>
      <Leaderboard />
    </div>
  );
}
