# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retris is a browser-based Tetris clone styled as a Game Boy Color, built with vanilla JavaScript, HTML5 Canvas, and CSS. There are zero npm dependencies or frameworks — the entire game is three source files (`index.html`, `game.js`, `style.css`).

## Running & Building

**Local development:** Open `index.html` directly in a browser, or use any static file server (e.g., `python -m http.server 8000`). No build step required.

**Docker:**
```
docker-compose up          # Serves on http://localhost:8042
make build TAG=<version>   # Build Docker image (ghcr.io/renajohn/retris)
make push TAG=<version>    # Build and push to GitHub Container Registry
```

**No tests or linting are configured.**

## Architecture

The entire game lives in three files:

- **`game.js`** (~1,550 lines) — All game logic in a single file: board management, piece spawning/rotation/movement, collision detection, line clearing with animations, scoring, rendering (Canvas 2D), audio synthesis (Web Audio API), save/load (localStorage), leaderboard, and input handling (keyboard + touch).
- **`style.css`** (~710 lines) — Game Boy Color aesthetic with responsive layout, CSS animations, and touch-friendly controls.
- **`index.html`** — DOM structure including two canvases (game grid + next piece preview), overlay screens (start, pause, game over, leaderboard), and Game Boy button controls.

### Key Constants & Data Structures

- Grid: 10×20 (`COLS`/`ROWS`), `BLOCK_SIZE = 20px`
- `board[row][col]` (0/1) + `boardColors[row][col]` (color objects) represent the grid
- Pieces are `{ shape, x, y, name, color }` objects; 7 standard tetrominoes (I, O, T, S, Z, J, L)
- Three difficulty levels: Easy (1.0×), Medium (0.7× speed / 1.5× score), Violaine (0.5× speed / 2.5× score)

### Game Loop

Uses `requestAnimationFrame`. Gravity-based drop timing varies by level (1000ms at level 1 down to 50ms at level 13+). Line clears trigger a multi-phase animation before rows collapse.

### Persistence

localStorage keys: `tetris_leaderboard` (top 10 scores), `tetris_save` (auto-saved game state every 2s, expires after 24h).

### Audio

Korobeiniki melody and sound effects synthesized entirely via Web Audio API oscillators — no audio files. Singleton music session pattern prevents duplicate playback.

## Deployment

Dockerfile copies the three source files into `nginx:alpine` and serves on port 80. Docker Compose exposes port 8042.
