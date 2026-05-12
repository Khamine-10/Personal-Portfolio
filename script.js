// ===== FOND ANIMÉ MATRIX CYBERSÉCURITÉ =====
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initColumns();
});

// Caractères cyber : binaire + hex + symboles réseau
const chars = '01アイウエオカキクケコ#@!$%^&*ABCDEF0123456789/>_\\|[]{}';
const fontSize = 14;
let columns = [];

function initColumns() {
  const colCount = Math.floor(canvas.width / fontSize);
  columns = Array(colCount).fill(1);
}

initColumns();

function drawMatrix() {
  // Fond semi-transparent pour l'effet de traîne
  ctx.fillStyle = 'rgba(10, 10, 18, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = fontSize + 'px monospace';

  for (let i = 0; i < columns.length; i++) {
    const char = chars[Math.floor(Math.random() * chars.length)];
    const x = i * fontSize;
    const y = columns[i] * fontSize;

    // Alternance violet/bleu pour l'ambiance cyber
    if (Math.random() > 0.95) {
      ctx.fillStyle = '#ffffff';
    } else if (Math.random() > 0.5) {
      ctx.fillStyle = 'rgb(133, 40, 255)';
    } else {
      ctx.fillStyle = 'rgb(80, 20, 160)';
    }

    ctx.fillText(char, x, y);

    // Réinitialiser la colonne aléatoirement
    if (y > canvas.height && Math.random() > 0.975) {
      columns[i] = 0;
    }
    columns[i]++;
  }
}

setInterval(drawMatrix, 45);
