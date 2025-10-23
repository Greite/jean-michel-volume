# 🎵 Jean-Michel Volume

Une application web moderne qui vous permet de contrôler le volume de Spotify en temps réel avec votre voix !

## ✨ Fonctionnalités

- 🎤 **Contrôle vocal en temps réel** : Le volume de Spotify s'adapte automatiquement à l'intensité de votre voix
- 🎨 **Interface moderne** : Design élégant avec Tailwind CSS et animations fluides
- 🔒 **Authentification sécurisée** : Connexion via OAuth Spotify
- 📊 **Visualisation en direct** : Barres de progression pour visualiser le volume vocal et Spotify
- 📱 **Responsive** : Fonctionne sur tous les appareils

## 🚀 Installation

### Prérequis

- Node.js 18+ et pnpm installés
- Un compte Spotify Premium (nécessaire pour l'API de contrôle de lecture)
- Un navigateur moderne avec support du micro

### 1. Cloner le projet

```bash
git clone <votre-repo>
cd spotify-volume-control
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Configurer Spotify Developer

1. Allez sur [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Créez une nouvelle application
3. Configurez les paramètres :
   - **Redirect URIs** : Ajoutez `http://localhost:3000/api/auth/callback/spotify`
   - Notez votre **Client ID** et **Client Secret**

### 4. Configurer les variables d'environnement

Copiez le fichier `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

Éditez `.env.local` avec vos identifiants :

```env
AUTH_SECRET=<générez avec: openssl rand -base64 32>
SPOTIFY_CLIENT_ID=<votre-client-id-spotify>
SPOTIFY_CLIENT_SECRET=<votre-client-secret-spotify>
AUTH_URL=http://localhost:3000
```

### 5. Lancer l'application

```bash
pnpm dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📖 Comment l'utiliser

1. **Connectez-vous** avec votre compte Spotify
2. **Lancez de la musique** sur n'importe quel appareil Spotify (ordinateur, téléphone, enceinte connectée)
3. **Autorisez l'accès au microphone** quand votre navigateur le demande
4. **Cliquez sur "Démarrer le contrôle vocal"**
5. **Parlez ou faites du bruit** : plus vous êtes fort, plus le volume Spotify augmente !

## 🛠️ Technologies utilisées

- **Next.js 16** : Framework React avec App Router
- **TypeScript** : Typage statique
- **Tailwind CSS 4** : Styles modernes et responsive
- **NextAuth.js** : Authentification OAuth
- **Web Audio API** : Analyse du volume vocal en temps réel
- **Spotify Web API** : Contrôle de la lecture

## 📁 Structure du projet

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # Route NextAuth
│   │   └── spotify/volume/route.ts      # API de contrôle du volume
│   ├── layout.tsx                       # Layout principal
│   └── page.tsx                         # Page d'accueil
├── components/
│   └── VoiceVolumeController.tsx        # Composant de contrôle vocal
├── hooks/
│   └── useVoiceVolume.ts                # Hook pour l'analyse audio
├── lib/
│   └── auth.ts                          # Configuration NextAuth
└── types/
    └── next-auth.d.ts                   # Types TypeScript pour NextAuth
```

## 🔧 Fonctionnement technique

### Capture et analyse audio

L'application utilise l'API Web Audio pour :
1. Capturer le flux audio du microphone
2. Analyser les fréquences en temps réel avec `AnalyserNode`
3. Calculer le volume moyen
4. Normaliser entre 0 et 100

### Synchronisation avec Spotify

- Le volume est envoyé à l'API Spotify toutes les 200ms maximum
- L'application vérifie l'état de lecture toutes les 5 secondes
- Le volume est limité entre 0 et 100%

## ⚠️ Notes importantes

- **Spotify Premium requis** : L'API de contrôle de lecture nécessite un compte Premium
- **Application desktop recommandée** : Utilisez l'application desktop Spotify (Windows/Mac/Linux) pour le contrôle du volume
- **Web Player non supporté** : Le Spotify Web Player ne permet pas le contrôle du volume via l'API
- **Appareil actif requis** : Un appareil Spotify doit être en lecture pour que le contrôle fonctionne
- **HTTPS en production** : Pour utiliser le microphone en production, l'application doit être servie en HTTPS

## 🐛 Résolution de problèmes

### "Cannot control device volume" ou "VOLUME_CONTROL_DISALLOW"

Cette erreur signifie que l'appareil actuel ne permet pas le contrôle du volume à distance.

**Solution** : Utilisez l'**application desktop Spotify** (Windows/Mac/Linux) au lieu de :
- Spotify Web Player
- Certaines enceintes connectées
- Certains appareils mobiles selon la configuration

### "No active device"

Assurez-vous qu'un appareil Spotify est actif avec de la musique en lecture.

### Le microphone ne fonctionne pas

Vérifiez que :
- Votre navigateur a la permission d'accéder au microphone
- Vous utilisez HTTPS (en production)
- Aucune autre application n'utilise le microphone
- Vous parlez suffisamment fort (le volume doit dépasser 0%)

### Le volume reste à 0%

Vérifiez que :
- Vous autorisez bien l'accès au microphone
- Vous parlez suffisamment fort pendant les 5 secondes
- Votre micro fonctionne correctement

### Le volume ne change pas sur Spotify

Vérifiez que :
- Vous êtes connecté avec un compte Spotify Premium
- Vous utilisez l'application desktop Spotify
- Un appareil est actif avec de la musique en lecture
- Les redirections URI sont correctement configurées dans Spotify Developer Dashboard

## 📝 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.
