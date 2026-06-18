import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root element");
}

root.innerHTML = `
  <main class="app-shell">
    <section class="game-panel">
      <canvas class="game-canvas" aria-label="Snake game canvas"></canvas>
    </section>
    <aside class="side-panel">
      <video class="camera-preview" autoplay muted playsinline></video>
      <section class="debug-card">
        <h1>Camera Snake Prototype</h1>
        <dl class="debug-grid">
          <dt>Status</dt><dd>Bootstrapped</dd>
          <dt>Score</dt><dd>0</dd>
        </dl>
      </section>
      <p class="error-text"></p>
    </aside>
  </main>
`;
