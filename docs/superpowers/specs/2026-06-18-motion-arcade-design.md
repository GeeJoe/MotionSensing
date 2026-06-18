# Motion Arcade Design

## Goal

Expand the current webcam-controlled snake prototype into a small motion-sensing game hub with:

- A home menu that can be controlled by hand gestures.
- The existing snake game preserved as one playable option.
- A new Fruit Slice arcade game controlled by fingertip movement.
- A shared fingertip pointer, gesture click, hover fallback, and click animation across the menu and games.

## Current Baseline

The app is a Vite + TypeScript single-page canvas application. It already has:

- MediaPipe Hand Landmarker camera tracking.
- Mirrored index fingertip `x/y` coordinates.
- A fixed-center joystick for snake movement.
- A visible fingertip point in the game canvas.
- Canvas rendering, debug UI, and tests for tracker, joystick, snake, renderer, and app lifecycle.

The new work should keep these behaviors intact while separating the app into reusable scenes.

## Confirmed Decisions

- Architecture: use a small scene framework rather than continuing to grow the current `AppController`.
- Home menu: game cards with title, short description, and best score.
- Menu input: fingertip pointer acts like a mouse.
- Click gesture: support both forward poke detection and hover-click fallback.
- Click feedback: fingertip pointer plays a short click animation when a click is recognized.
- Fruit Slice trigger: fast fingertip swipes cut fruit; no click is required to slice.
- Fruit Slice mode: infinite arcade.
- Fruit Slice hazards: bombs reduce lives by 1 and clear combo. Life at 0 ends the run.
- Navigation: each game has a top-left Home button, activated with the same gesture click.
- Visual style: juicy arcade style.
- Asset scope: 8 fruits, bomb, split fruit halves, and juice splatter textures.

## Architecture

Introduce a lightweight scene layer:

- `AppController`
  - Owns camera startup, RAF loop, scene switching, shared canvas/video/debug shell, and high-level app lifecycle.
  - Does not contain game-specific rules.
- `HandInputController`
  - Converts tracker frames into shared input state.
  - Produces pointer position, pointer visibility, click events, hover progress, click animation timing, and recent swipe trail.
- `Scene`
  - Interface for menu and games.
  - Expected responsibilities:
    - `update(input, deltaSeconds)`
    - `render(renderer)`
    - `handleClick(point)` or equivalent click dispatch
    - optional lifecycle hooks for enter/exit/reset
- `MenuScene`
  - Renders game cards.
  - Handles pointer hover and click to select a game.
  - Shows best score per game.
- `SnakeScene`
  - Wraps the existing `GestureJoystick`, `SnakeGame`, and snake rendering behavior.
  - Preserves fixed-center joystick movement.
- `FruitSliceScene`
  - Owns fruit spawning, physics, slicing, score, combo, lives, game over state, restart, and Home routing.

The goal is that adding another game later requires a new scene, not changes across camera and input plumbing.

## Shared Hand Input

The shared input state should include:

- `pointer`
  - Canvas-space fingertip position derived from MediaPipe coordinates.
  - Hidden or inactive when no hand is detected.
- `normalizedPointer`
  - The mirrored normalized point from tracker output for reusable game logic.
- `trail`
  - Recent pointer samples with timestamp.
  - Reset when hand tracking is lost to prevent accidental cross-screen cuts.
- `click`
  - One-shot event when a click is recognized.
  - Primary click signal: a short forward poke toward the camera.
  - Fallback: hover over an interactive target for about `0.8s`.
- `clickAnimation`
  - Short animation state, about `180-250ms`, triggered on recognized click.
  - Visual effect: fingertip dot briefly expands with an outward ring.

The current tracker only exposes fingertip `x/y`. This work should extend tracking to expose at least index-tip `z` for click detection. If z-based click detection is unstable in browser testing, hover-click remains the reliable fallback.

## Home Menu

The menu is the first screen after camera startup.

Layout:

- Two large game cards:
  - Snake
  - Fruit Slice
- Each card shows:
  - title
  - short description
  - best score
  - hover state under pointer
- A side panel can keep the camera preview and debug information.

Behavior:

- Pointer hover highlights the card.
- A poke click or hover-click selects the card.
- On selection, the pointer click animation plays and the selected scene starts.
- No hand detected means no hover progress and no accidental selection.

## Snake Scene

Snake remains close to the current implementation:

- The fixed frame center is the joystick origin.
- Finger displacement from center controls direction and speed.
- The visible fingertip dot and center marker remain.
- Food, score, growth, and wall game-over behavior remain.
- Top-left Home button returns to the menu via gesture click.

Snake refactoring should focus on moving existing behavior behind `SnakeScene`; gameplay should not be changed unless required by shared scene integration.

## Fruit Slice Scene

Mode:

- Infinite arcade.
- The run ends only when lives reach 0.
- Difficulty increases over time or score.

Objects:

- 8 fruit types:
  - apple
  - orange
  - watermelon
  - banana
  - strawberry
  - kiwi
  - pineapple
  - dragon fruit
- Bombs as hazards.

Object motion:

- Fruits and bombs launch from bottom or lower side positions.
- Objects follow gravity arcs.
- Spawn interval starts around `1.2s` and can shrink toward `0.45s`.
- Object speed and spawn frequency increase gradually.
- Bomb ratio starts around `10%` and caps around `25%`.

Slicing:

- Recent pointer trail is checked as line segments.
- A fruit is sliced when a fast enough trail segment intersects its collision circle.
- Clicking is not required to slice.
- Sliced fruit awards score, contributes to combo, and spawns split-half animation plus juice effects.

Bombs:

- A bomb intersected by the slice trail reduces lives by 1.
- Bomb hit clears combo.
- Lives at 0 enters Game Over.
- Bombs falling off screen naturally do not penalize the player.

Misses:

- A fruit that falls below the screen without being sliced reduces lives by 1.
- Lives at 0 enters Game Over.

Scoring:

- Base score per fruit.
- Combo multiplier or bonus for slicing multiple fruits in a short time window.
- Best score is saved locally and shown on the menu.

Game Over:

- Shows current score and best score.
- Provides Restart and Home controls, both usable by hand pointer click.

## Assets

Use juicy arcade-style generated assets with transparent backgrounds:

- Whole fruit sprite for each of 8 fruit types.
- Two split-half sprites for each fruit type.
- Bomb sprite.
- Juice splatter textures.

Preferred location:

- `src/assets/fruit/`

Fallback:

- If image assets fail to load, Fruit Slice must still run using Canvas-drawn fallback shapes.
- Tests should not depend on generated bitmap files.

## Rendering

Use Canvas 2D for all scenes.

Shared renderer responsibilities:

- Canvas sizing and device-pixel-ratio handling.
- Pointer dot and click animation.
- Shared Home button rendering.
- Shared menu card primitives or scene rendering helpers.

Fruit Slice renderer responsibilities:

- Draw whole fruits and bombs.
- Draw sliced halves with rotation and velocity.
- Draw juice splatter / particles.
- Draw slice trail.
- Draw score, lives, combo, and Game Over overlay.

## Persistence

Use local storage for best scores:

- `motionArcade.bestScore.snake`
- `motionArcade.bestScore.fruitSlice`

If local storage is unavailable, the app should still run with in-memory scores for the session.

## Testing

Unit tests should cover:

- Click detection from z-axis poke movement.
- Hover-click fallback timing.
- Click animation lifecycle.
- Pointer trail reset after tracking loss.
- Segment-circle collision for fruit slicing.
- Fruit hit scoring.
- Bomb hit life loss and combo reset.
- Missed fruit life loss.
- Difficulty progression caps.
- Best score persistence fallback.

Scene tests should cover:

- Menu card click switches to Snake.
- Menu card click switches to Fruit Slice.
- Home button returns to Menu.
- Snake scene preserves fixed-center joystick behavior.
- Fruit Slice restart after Game Over.

Browser smoke checks should cover:

- Fake camera reaches the menu without rendering a blank screen.
- No hand detected does not trigger menu clicks.
- Fruit Slice scene renders with fallback shapes if image assets are unavailable.

Final verification commands:

- `npm run test`
- `npm run build`

## Acceptance Criteria

- The app opens to a gesture-controllable home menu.
- The menu shows Snake and Fruit Slice game cards with best scores.
- The fingertip pointer can select a game through poke click or hover-click fallback.
- Recognized clicks show a visible pointer click animation.
- Snake remains playable with fixed-center joystick control.
- Fruit Slice launches fruit and bombs in infinite arcade mode.
- Fast fingertip swipes slice fruit without requiring clicks.
- Sliced fruit gives points and supports combos.
- Slicing a bomb removes 1 life and clears combo.
- Missing fruit removes 1 life.
- Life at 0 shows Game Over.
- Home button returns from either game to the menu.
- Generated fruit assets are used when available, with Canvas fallback when not.
- Automated tests and production build pass.
