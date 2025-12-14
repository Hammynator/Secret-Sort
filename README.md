# Sorting Visualization (Web)

This is a minimal web version of your sorting visualization so you can show it to people.

How to run:
- Open `web/index.html` in a modern browser (Chrome/Edge/Firefox). No server required.
- Use the controls to pick an algorithm, set delay, shuffle, and start.

Files:
- `index.html` — UI and canvas.
- `styles.css` — simple layout and overlay styles.
- `app.js` — visualization + generator-based incremental sorting logic.

Notes:
- This is a simplified port focused on the visual behavior: generators yield after swaps/placements, and the finished result stays visible under a translucent overlay with a "Run again" button.
- If you want the exact LED-matrix look and pixel-perfect parity with your pygame app, I can adapt the renderer to match grid axes and colors more closely.
