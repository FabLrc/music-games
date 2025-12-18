/**
 * Navbar principale avec tous les modes de jeu
 */

'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { usePlayerProgress } from '@/hooks/usePlayerProgress';

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { progress, levelInfo } = usePlayerProgress();

  const navItems = [
    { label: 'ACCUEIL', path: '/', icon: '🏠', disabled: false },
    { label: 'CLASSEMENT', path: '/leaderboard', icon: '🏆', disabled: false },
    { label: 'PROFIL', path: '/profile', icon: '👤', disabled: true },
    { label: 'SOCIAL', path: '/social', icon: '👥', disabled: true },
    { label: 'BOUTIQUE', path: '/shop', icon: '🛍️', disabled: true },
  ];

  if (!session) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md shrink-0">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Titre */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl">🎵</span>
            <span className="text-xl font-black text-white tracking-wider uppercase" style={{ fontFamily: 'Impact, Arial Black, sans-serif', textShadow: '0 0 10px rgba(236, 72, 153, 0.5)' }}>
              MUSIC GAMES
            </span>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <div key={item.path} className="relative group">
                <Button
                  variant={pathname === item.path ? 'default' : 'ghost'}
                  disabled={item.disabled}
                  className={`${
                    pathname === item.path
                      ? 'bg-pink-600 hover:bg-pink-700 text-white'
                      : item.disabled 
                        ? 'text-gray-500 cursor-not-allowed hover:bg-transparent' 
                        : 'text-white hover:bg-white/10'
                  } font-bold tracking-wide`}
                  onClick={() => !item.disabled && router.push(item.path)}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Button>
                {item.disabled && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-gray-700">
                      Bientôt disponible
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Profil Utilisateur */}
          <div className="flex items-center gap-3">
            <PlayerAvatar
              imageUrl={session.user?.image || undefined}
              username={session.user?.name || 'User'}
              level={progress?.level || 1}
              levelInfo={levelInfo || undefined}
              size={48}
            />
            <div className="hidden lg:block text-right">
              <p className="text-sm font-semibold text-white">
                {session.user?.name}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-300">Niveau {progress?.level || 1}</span>
                {levelInfo && (
                  <span className="text-pink-400 font-semibold">
                    {levelInfo.currentXP}/{levelInfo.xpForNextLevel} XP
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => signOut()}
              className="text-white hover:bg-white/10"
              size="sm"
            >
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Navigation Mobile */}
        <div className="md:hidden pb-3">
          <div className="flex gap-1 overflow-x-auto custom-scrollbar">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={pathname === item.path ? 'default' : 'ghost'}
                size="sm"
                disabled={item.disabled}
                className={`whitespace-nowrap ${
                  pathname === item.path
                    ? 'bg-pink-600 hover:bg-pink-700 text-white'
                    : item.disabled
                      ? 'text-gray-500 cursor-not-allowed'
                      : 'text-white hover:bg-white/10'
                }`}
                onClick={() => !item.disabled && router.push(item.path)}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
