/**
 * Test script pour le système de cache Supabase des paroles
 * Exécuter : npx tsx src/lib/__tests__/test-lyrics-cache.ts
 */

import { getLyrics } from '../lrclib'

async function testLyricsCache() {
  console.log('🧪 Test du système de cache des paroles\n')

  const testTrack = {
    name: 'Bohemian Rhapsody',
    artist: 'Queen',
    duration: 354
  }

  console.log(`📝 Test avec: ${testTrack.name} - ${testTrack.artist}`)
  console.log('⏱️  Durée: ' + testTrack.duration + 's\n')

  // Premier appel - devrait aller chercher l'API et mettre en cache
  console.log('1️⃣ Premier appel (API + mise en cache)...')
  const start1 = Date.now()
  const lyrics1 = await getLyrics(testTrack.name, testTrack.artist, testTrack.duration)
  const time1 = Date.now() - start1
  console.log(`   ✅ Temps: ${time1}ms`)
  console.log(`   📊 Résultat: ${lyrics1 ? 'Paroles trouvées' : 'Aucune parole'}`)
  if (lyrics1) {
    console.log(`   🎵 Paroles synchronisées: ${lyrics1.syncedLyrics ? 'Oui' : 'Non'}`)
  }

  // Attendre un peu
  console.log('\n⏳ Attente de 2 secondes...\n')
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Deuxième appel - devrait utiliser le cache
  console.log('2️⃣ Deuxième appel (depuis le cache)...')
  const start2 = Date.now()
  const lyrics2 = await getLyrics(testTrack.name, testTrack.artist, testTrack.duration)
  const time2 = Date.now() - start2
  console.log(`   ✅ Temps: ${time2}ms`)
  console.log(`   📊 Résultat: ${lyrics2 ? 'Paroles trouvées' : 'Aucune parole'}`)

  // Comparaison
  console.log('\n📈 Résultats:')
  console.log(`   Premier appel: ${time1}ms`)
  console.log(`   Second appel: ${time2}ms`)
  console.log(`   Gain de performance: ${Math.round((1 - time2/time1) * 100)}%`)
  
  const speedup = time1 / time2
  if (speedup > 1.5) {
    console.log(`   🚀 Cache efficace! ${speedup.toFixed(1)}x plus rapide`)
  } else {
    console.log(`   ⚠️  Le cache ne semble pas fonctionner correctement`)
  }
}

testLyricsCache().catch(console.error)
