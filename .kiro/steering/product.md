# Product Overview

Name Nosferatu is a tournament platform for ranking cat names through pairwise comparison using an Elo rating system.

## Core Features

- Tournament-style voting with pairwise name comparison
- Elo rating system (K-factor 32, 64 for new players)
- Analytics dashboard with leaderboards and personal results
- Admin controls for name management
- Offline support with error recovery
- User profiles and preferences

## Name Lifecycle

```
candidate → tournament → (eliminated | archived)
```

Names compete in tournaments via pairwise comparison and are either eliminated or archived as winners.

## Key Entities

- **NameItem**: Cat name with metadata (id, name, description, avgRating, wins, losses, isHidden, isSelected)
- **TournamentState**: Active tournament session (names, ratings, voteHistory, isComplete)
- **UserState**: Current user (name, isLoggedIn, isAdmin, preferences)

## User Experience

- Progressive disclosure: complexity shown only when user is ready
- First-match tutorial with overlay guidance
- Progress counters during setup
- Milestone celebrations at 50% and 80% completion
- Warm, friendly copy (avoid cold/technical language)
