# FridgeToFork (MVP)

FridgeToFork is a mobile app that helps users cook from what they already have and track grocery spending.

The app solves three daily problems:
- People forget what is already in the fridge.
- People buy food without tracking spend clearly.
- People struggle to decide what to cook from available ingredients.

FridgeToFork connects these into one flow:
1) Scan fridge -> ingredient list
2) Generate recipe from ingredients
3) Scan receipts -> expense and item history
4) Save bought items back into fridge inventory

---

## What This Project Does

### Chef Module
- Scan fridge image (camera or gallery)
- Show scanned fridge items in a review list
- Generate AI recipe from current fridge inventory
- Save recipes and open recipe details

### Cart Module
- Scan receipt image (camera or gallery)
- Multi-receipt upload supported
- Extract item names and prices
- Generate healthier/cheaper swap suggestions
- Save receipt and auto-merge purchased items into fridge inventory

### Home Module
- Show quick stats: ingredients, recipes, receipts
- Show budget progress and streak
- Quick navigation actions for scans and recipes

### Settings Module
- Update username
- Set monthly budget goal
- Toggle notifications
- Toggle dark mode
- Clear local app data

---

## Project Screenshots

| Home Dashboard | Smart Cart Dashboard |
|---|---|
| ![Home Dashboard](docs/images/screenshot-1.jpg) | ![Smart Cart Dashboard](docs/images/screenshot-2.jpg) |

| Receipt Camera Scan | Receipt Parsed Items |
|---|---|
| ![Receipt Camera Scan](docs/images/screenshot-3.jpg) | ![Receipt Parsed Items](docs/images/screenshot-4.jpg) |

| Edit Receipt | My Kitchen |
|---|---|
| ![Edit Receipt](docs/images/screenshot-5.jpg) | ![My Kitchen](docs/images/screenshot-6.jpg) |

| Recipe Filters | Recipe Result |
|---|---|
| ![Recipe Filters](docs/images/screenshot-7.jpg) | ![Recipe Result](docs/images/screenshot-8.jpg) |

| Recipe Detail | Settings |
|---|---|
| ![Recipe Detail](docs/images/screenshot-9.jpg) | ![Settings](docs/images/screenshot-10.jpg) |



---

## Tech Stack
- React Native + Expo SDK 54
- Redux Toolkit + AsyncStorage
- React Navigation (tabs + stacks)
- Node.js + Express backend
- Google Gemini API (default AI provider)

---

## Project Structure
- Mobile app: `App.js`, `src/`
- API server: `server/index.js`

---

## API Requirements

You need one Google Gemini API key.

### Backend env file
Create `server/.env`:

```env
PORT=3000
AI_PROVIDER=google
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-flash-latest,gemini-2.0-flash
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### App env file
Create root `.env`:

```env
EXPO_PUBLIC_USE_MOCK_AI=false
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3000
```

Use your laptop LAN IP (not localhost) when testing on a physical phone.

---

## Install and Run

### 1) Install dependencies
```bash
npm install
```

### 2) Run backend
```bash
npm run api
```

### 3) Run mobile app
```bash
npx expo start -c
```

---

## MVP Notes
- If `npm run api` exits with port-in-use message, another backend process is already running on port 3000.
- If AI requests time out, verify backend is running and phone + laptop are on same Wi-Fi.
- Receipt and fridge scans work best with bright lighting and full image in frame.


