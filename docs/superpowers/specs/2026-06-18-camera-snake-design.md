# Camera-Controlled Snake Prototype Design

## Goal

Build a fast browser prototype of a snake-like game controlled by a computer webcam. The page detects the user's index finger, records the first stable fingertip position as the control origin, and moves the snake continuously toward the fingertip's displacement direction.

## Scope

In scope:

- Desktop Chrome local run.
- Real webcam input only.
- MediaPipe Web Hand Landmarker for index fingertip tracking.
- Continuous snake movement, not grid-based four-direction movement.
- Focused test layout: large Canvas game area with a right-side camera and tracking debug panel.
- Core game rules: eat food to grow and gain score; hitting the wall ends the run.
- No self-collision detection.

Out of scope:

- Mouse or keyboard mock controls.
- Mobile browser support.
- Cross-browser compatibility work beyond desktop Chrome.
- Leaderboards, saved high scores, audio, menus, difficulty selection, or polished onboarding.
- Complex restart flow; refreshing the page is enough for the first prototype.

## User Experience

The page opens to a single playable screen. The game canvas takes most of the viewport. A compact right panel shows the webcam preview and tracking state, including whether a finger is detected, whether the origin is locked, and the current movement vector.

When the webcam permission prompt appears, the user grants access. If the model loads and a finger is detected, the first stable index fingertip coordinate becomes the control origin. Moving the fingertip away from that origin drives the snake in the same continuous direction. Larger displacement increases speed up to a cap. Small displacement falls into a dead zone to reduce jitter.

The snake eats food, grows longer, and increases the score. If the snake head crosses the canvas boundary, the game stops and displays a game-over state.

## Architecture

Use a small Vite + TypeScript application with Canvas 2D rendering.

Main units:

- `CameraTracker`: requests webcam permission, owns the video element, loads MediaPipe Hand Landmarker, and emits index fingertip positions with tracking status.
- `GestureJoystick`: receives fingertip coordinates, locks the first stable coordinate as the origin, and converts later displacement into a normalized direction and speed scalar.
- `SnakeGame`: owns game state, including snake segments, food position, score, movement speed, and wall-hit game-over state.
- `Renderer`: draws the canvas scene, including the snake, food, boundary, score, waiting state, and game-over overlay.
- `AppController`: coordinates model loading, camera frames, gesture input, game updates, and render frames.

These units should communicate through small data objects rather than sharing mutable internals. The tracking module should not know game rules, and the game module should not know MediaPipe APIs.

## Data Flow

1. The webcam video produces frames.
2. MediaPipe Hand Landmarker detects hand landmarks for each frame.
3. `CameraTracker` extracts the index fingertip coordinate and tracking confidence.
4. `GestureJoystick` locks or updates the origin and computes a movement vector.
5. `SnakeGame` applies that movement vector to update the snake head and body.
6. `Renderer` draws the latest game and tracking state.

## Control Rules

- The first stable index fingertip detection sets the joystick origin.
- If the finger leaves the camera frame, movement pauses and the next stable detection resets the origin.
- If displacement length is below a dead-zone threshold, the snake pauses movement while keeping its current heading.
- If displacement exceeds the dead zone, normalize the vector to get direction.
- Speed scales with displacement magnitude and is clamped to a maximum.
- Snake movement is continuous in canvas coordinates instead of grid cells.

## Game Rules

- The snake starts near the canvas center with a short body.
- Food appears at random safe positions inside the canvas.
- When the snake head reaches the food radius, the score increments and the snake target length increases.
- The snake body follows the head as a polyline or segment trail.
- If the head crosses the canvas boundary, the run ends.
- Self-collision is intentionally omitted in the first prototype.

## Error Handling

- If webcam permission is denied, show a clear camera-permission error and do not start tracking.
- If MediaPipe model loading fails, show a model-load error summary and do not start the game loop.
- If no finger is detected, pause movement and show `Searching for finger`.
- If tracking resumes after loss, reset the origin to the new stable fingertip coordinate.
- If the wall is hit, freeze game movement and show `Game Over`.

## Acceptance Criteria

- Opening the local page in desktop Chrome asks for webcam permission.
- After permission is granted, the right panel shows a live camera preview.
- When an index finger enters the camera frame, tracking state changes to detected and the origin is set.
- Moving the finger away from the origin moves the snake continuously in the same direction.
- Eating food increases score and snake length.
- Hitting a wall stops the run and shows a game-over state.
- The prototype uses real webcam tracking only.

## Testing Plan

- Run the local dev server and open the page in desktop Chrome.
- Verify camera permission, model loading, and live preview.
- Manually test finger detection, origin reset after losing tracking, dead-zone behavior, directional movement, food collection, and wall-hit game-over.
- Use code-level checks for pure logic where practical, especially movement-vector normalization, speed clamping, food collision, and wall detection.
