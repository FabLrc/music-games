# Music Quiz - N'oubliez pas les paroles

A music quiz application inspired by "N'oubliez pas les paroles", using Spotify for music playback and LRCLIB for lyrics synchronization.

## Features

- **Spotify Integration**: Login with Spotify to access the full catalog and Web Playback SDK
- **Lyrics Synchronization**: Real-time lyrics display using LRCLIB API with LRC format parsing
- **Game Mode**: 
  - Search and select a song from Spotify
  - The game picks a random lyric line to hide
  - Music plays with synced lyrics display
  - When reaching the hidden lyric, music pauses
  - You have 10 seconds to guess the next lyrics
  - Score tracking across rounds
- **Modern UI**: Built with Shadcn UI and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- Spotify Premium Account (required for Web Playback SDK)
- Spotify Developer Account

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Create a Spotify App:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add this Redirect URI: `https://127.0.0.1:3000/api/auth/callback/spotify`
   - Copy your Client ID and Client Secret

3. Configure environment variables in `.env.local`:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   NEXTAUTH_SECRET=your_random_secret_key
   NEXTAUTH_URL=https://127.0.0.1:3000
   ```
   
   Generate a random secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser at: `https://127.0.0.1:3000`
   - Accept the self-signed certificate warning (dev only)
   - Login with your Spotify account

## How to Play

1. **Login** with your Spotify account
2. **Search** for a song in the search bar
3. **Select** a track from the results
4. **Wait** for lyrics to load from LRCLIB
5. **Click** "Commencer le jeu" to start
6. **Watch** the synced lyrics appear as the song plays
7. **Answer** the missing lyrics when the music pauses
8. **Score** points for correct answers!

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI
- **Auth**: NextAuth.js v4 (Spotify OAuth)
- **Music Player**: Spotify Web Playback SDK
- **Lyrics API**: LRCLIB.net
- **HTTP Client**: Axios

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth Spotify OAuth
│   │   └── spotify/search/        # Spotify search API route
│   ├── layout.tsx                 # Root layout with providers
│   └── page.tsx                   # Home page
├── components/
│   ├── game/
│   │   └── MusicQuiz.tsx          # Main game component
│   ├── ui/                        # Shadcn UI components
│   └── providers.tsx              # Session provider
├── hooks/
│   └── useSpotifyPlayer.ts        # Spotify Web Playback SDK hook
├── lib/
│   ├── lrclib.ts                  # LRCLIB API client
│   ├── lrc-parser.ts              # LRC format parser
│   └── utils.ts                   # Utility functions
└── types/
    ├── next-auth.d.ts             # NextAuth type extensions
    └── spotify.d.ts               # Spotify SDK types
```

## Development Notes

- The app uses HTTPS in development due to Spotify OAuth requirements
- Spotify requires `127.0.0.1` instead of `localhost` for HTTPS redirect URIs
- The Web Playback SDK requires a Spotify Premium account
- Not all songs have synced lyrics on LRCLIB - try popular tracks

## License

MIT
