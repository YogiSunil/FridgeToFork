# FridgeToFork 🛒🍳

**FridgeToFork** is a React Native (Expo) mobile application that connects what you already have in your fridge with what you spend at the store.

The goal is simple:
- Reduce food waste
- Cook smarter with AI-generated recipes from available ingredients
- Track grocery spending accurately from receipts
- Make healthier and cheaper purchase decisions over time

---

## Table of Contents

1. [Project Vision](#project-vision)
2. [Core User Journey](#core-user-journey)
3. [Feature Scope](#feature-scope)
4. [Module Architecture](#module-architecture)
5. [Native Integrations](#native-integrations)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [State Management Strategy (Redux)](#state-management-strategy-redux)
9. [Data Persistence Strategy](#data-persistence-strategy)
10. [AI Service Design](#ai-service-design)
11. [Scoring and Dashboard Logic](#scoring-and-dashboard-logic)
12. [Setup & Installation](#setup--installation)
13. [Run Instructions](#run-instructions)
14. [Step-by-Step Build Plan (Commit-Friendly)](#step-by-step-build-plan-commit-friendly)
15. [Quality, Testing, and Reliability](#quality-testing-and-reliability)
16. [Security & Privacy Notes](#security--privacy-notes)
17. [Future Enhancements](#future-enhancements)
18. [Contribution Guidelines](#contribution-guidelines)

---

## Project Vision

Most food apps solve one problem in isolation: either recipes or shopping or budgeting.

**FridgeToFork combines all three.**
It bridges kitchen inventory, recipe generation, and grocery spending into one connected workflow.

### Why this matters
- People overbuy because they forget what they already have
- People overspend because spending is tracked too late
- People waste food because missing one ingredient blocks cooking

FridgeToFork helps users act earlier with better context.

---

## Core User Journey

1. User scans fridge with camera
2. App detects available ingredients
3. AI generates recipe using only available ingredients
4. If something is missing, app suggests adding it to shopping list
5. User scans grocery receipt
6. App extracts items and prices
7. App updates spending totals and compares against budget
8. AI suggests healthier and cheaper swaps for future purchases

This connected loop is the product’s main value.

---

## Feature Scope

## ✅ Core Features (Target MVP)

### 🍳 Chef Module
- Fridge scanner (camera-based ingredient detection)
- Recipe generator using current fridge inventory
- Step-by-step cooking instructions with timers
- Save recipe to personal cookbook
- Mark ingredients as used and update inventory
- Cuisine preference filter (Italian, Asian, Mexican, etc.)

### 🛒 Cart Module
- Receipt scanner (camera OCR + item extraction)
- Healthy swap suggestions
- Cheaper swap suggestions
- Weekly/monthly spending tracking
- Budget goal and near-limit warning
- Shopping list (manual + AI-assisted)

### 🏠 Home Dashboard
- Daily summary (calories, spending, fridge health)
- Quick actions (scan fridge, scan receipt)
- Logging streak tracker
- Weekly AI summary card

### ⚙️ Settings
- Username
- Monthly budget goal
- Dark/light mode toggle
- Notification reminder toggle
- Clear all app data

---

## Module Architecture

The app is designed around **4 modules** that communicate through Redux slices:

1. **Chef Module**
   - Owns fridge inventory and recipe generation flow
2. **Cart Module**
   - Owns receipts, spending history, and swap suggestions
3. **Home Dashboard**
   - Aggregates and summarizes cross-module data
4. **Settings Module**
   - Manages user preferences, app theme, reminders, and budget defaults

---

## Native Integrations

FridgeToFork uses native capabilities through Expo APIs:

- **Camera (`expo-camera`)**
  - Fridge scanning
  - Receipt scanning

- **Notifications (`expo-notifications`)**
  - Daily reminder: “Time to log your meals!”
  - Budget near-limit alerts

- **Share API (`expo-sharing`)**
  - Share recipe card externally

- **Haptics (`expo-haptics`)**
  - Feedback on successful scans, saves, and interactions

- **Linking (`expo-linking`)**
  - Open external recipe videos or supporting links

---

## Tech Stack

- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Navigation:** React Navigation (bottom tabs + native stack)
- **State:** Redux Toolkit + React Redux
- **Persistence:** AsyncStorage
- **Charts/Data UI:** Planned reusable chart components
- **AI Integration:** Claude API (through utility client wrapper)

### Current SDK Baseline
- Expo SDK: `54.x`
- React Native: `0.81.x`
- React: `19.1.x`

---

## Project Structure

Target architecture:

```text
FridgeToFork/
├── app.json
├── App.tsx
├── README.md
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── ChefStack.tsx
│   │   ├── CartStack.tsx
│   │   ├── HomeStack.tsx
│   │   └── SettingsStack.tsx
│   ├── screens/
│   │   ├── Home/
│   │   │   ├── HomeScreen.tsx
│   │   │   └── NotificationsScreen.tsx
│   │   ├── Chef/
│   │   │   ├── ChefHomeScreen.tsx
│   │   │   ├── FridgeScanScreen.tsx
│   │   │   ├── RecipeResultScreen.tsx
│   │   │   └── RecipeDetailScreen.tsx
│   │   ├── Cart/
│   │   │   ├── CartHomeScreen.tsx
│   │   │   ├── ReceiptScanScreen.tsx
│   │   │   └── SwapSuggestionScreen.tsx
│   │   └── Settings/
│   │       ├── SettingsHomeScreen.tsx
│   │       ├── BudgetGoalScreen.tsx
│   │       └── ThemeScreen.tsx
│   ├── store/
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── fridgeSlice.ts
│   │       ├── recipesSlice.ts
│   │       ├── cartSlice.ts
│   │       ├── swapsSlice.ts
│   │       └── settingsSlice.ts
│   ├── components/
│   │   ├── RecipeCard.tsx
│   │   ├── IngredientChip.tsx
│   │   ├── SpendingChart.tsx
│   │   ├── SwapCard.tsx
│   │   ├── DailyScoreRing.tsx
│   │   └── LoadingOverlay.tsx
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useCamera.ts
│   │   └── useHaptics.ts
│   └── utils/
│       ├── storage.ts
│       ├── claudeApi.ts
│       └── notifications.ts
```

---

## State Management Strategy (Redux)

Redux slices are split by domain responsibility:

- `fridgeSlice`
  - ingredient inventory
  - scan status
  - last scan timestamp

- `recipesSlice`
  - generated recipes
  - saved cookbook entries
  - active cooking session

- `cartSlice`
  - scanned receipt items
  - totals (daily/weekly/monthly)
  - budget threshold status

- `swapsSlice`
  - healthier suggestions
  - cheaper alternatives
  - accepted swaps history

- `settingsSlice`
  - username
  - theme mode
  - budget goal
  - notification preferences

### Cross-slice outcomes
- Missing ingredient from recipe can create shopping list candidate
- Receipt totals update dashboard and budget alerts
- Settings budget goal drives cart warning thresholds

---

## Data Persistence Strategy

AsyncStorage is used to persist user data locally:

- Fridge inventory
- Saved recipes
- Receipt/spending history
- User preferences
- Theme selection
- Budget goal

### Persistence principles
- Save on successful state mutation
- Hydrate once at app launch
- Keep storage keys centralized in `src/utils/storage.ts`
- Add versioned migration strategy as schema evolves

---

## AI Service Design

AI requests are routed through a single service layer (planned `src/utils/claudeApi.ts`) to keep UI code clean.

### Planned request types
- `scanFridge(imageBase64)` → ingredient list
- `generateRecipe(ingredients, cuisinePreference)` → recipe object
- `scanReceipt(imageBase64)` → structured receipt items
- `generateSwaps(items)` → healthier + cheaper alternatives
- `generateWeeklySummary(metrics)` → dashboard narrative

### Response handling rules
- Always validate and normalize AI responses
- Use strict fallback defaults if shape is invalid
- Never block UI completely on AI failure
- Surface actionable error states to user

---

## Scoring and Dashboard Logic

Daily score model (planned):

- Fridge health: **30%**
- Budget adherence: **40%**
- Cooking streak consistency: **30%**

Formula:

```text
DailyScore = (FridgeHealth * 0.30) + (BudgetAdherence * 0.40) + (StreakScore * 0.30)
```

This score is designed to be motivational, not punitive.

---

## Setup & Installation

## Prerequisites

- Node.js LTS (recommended: 20.x+)
- npm (comes with Node)
- Expo Go app on physical device
- Same network for device + development machine

## Install dependencies

```bash
npm install
```

If versions need realignment with Expo SDK:

```bash
npx expo install --fix
```

---

## Run Instructions

Start Metro bundler:

```bash
npx expo start
```

Clear cache when needed:

```bash
npx expo start -c
```

Open on Android emulator:

```bash
npm run android
```

Open on iOS simulator (macOS only):

```bash
npm run ios
```

Open web preview:

```bash
npm run web
```

---

## Step-by-Step Build Plan (Commit-Friendly)

This project is intentionally developed in small, reviewable commits.

### Milestone 1 — Foundation
- Initialize Expo TypeScript app
- Install dependencies
- Validate SDK compatibility

### Milestone 2 — Folder Scaffolding
- Create full `src/` architecture
- Add placeholder screens/components

### Milestone 3 — Navigation + Store Wiring
- Bottom tabs + stack navigators
- Configure Redux store and providers

### Milestone 4 — Chef Flow (MVP)
- Fridge scan UI
- Ingredient state updates
- Recipe generation and save flow

### Milestone 5 — Cart Flow (MVP)
- Receipt scan UI
- Spending aggregation
- Swap suggestion screen

### Milestone 6 — Dashboard Aggregation
- Daily/weekly metrics
- score card and streak display

### Milestone 7 — Settings + Theme
- Dark mode toggle with persistence
- budget goal and notifications toggle

### Milestone 8 — Polish
- haptics, transitions, loading/error handling
- documentation and demo readiness

---

## Quality, Testing, and Reliability

Planned quality practices:

- TypeScript strict mode for safer refactors
- Domain-level utility functions for testable logic
- Linting + formatting for consistency
- Defensive parsing for AI and OCR responses
- User-first error messaging for camera/API failures

---

## Security & Privacy Notes

- Receipt images and fridge photos may contain sensitive data.
- Prefer processing with minimal retention.
- Never hardcode API keys inside committed source code.
- Store secrets using secure environment strategy (e.g., EAS secrets / CI secret variables).

---

## Future Enhancements

Post-MVP ideas:

- Expiry tracking and food waste prevention
- Weekly AI meal planner
- Nutrition dashboard and macro tracking
- Store locator integration
- Voice ingredient input
- Barcode scanning
- Shared family inventory mode
- Carbon footprint estimate
- Price trend analysis

---

## Contribution Guidelines

When collaborating on this repository:

1. Create focused branches per module/feature
2. Keep commits small and descriptive
3. Include screenshots for UI changes
4. Update README sections when architecture evolves
5. Verify app boots (`npx expo start`) before pushing

Suggested commit style:

- `feat(chef): add fridge scan screen scaffold`
- `feat(cart): implement receipt parser slice`
- `chore(theme): persist dark mode in settings`
- `docs: expand README architecture and setup`

---

## Current Status

The project foundation is configured and running with Expo SDK 54 compatibility.

Next immediate development focus:
1. scaffold `src/` structure
2. wire navigation and Redux providers
3. implement Chef and Cart MVP flows

---

Built with focus on practical UX, modular architecture, and demo-ready native capabilities.