export const particles = [];

export class Particle {
  constructor(x, y, color, vx, vy) {
    this.x = x;
    this.y = y;
    this.color = color;
    // Particles inherit a bit of finger speed, moving opposite to finger + random spread
    this.vx = vx * 0.15 + (Math.random() - 0.5) * 2.0;
    this.vy = vy * 0.15 + (Math.random() - 0.5) * 2.0;
    this.size = Math.random() * 6 + 2; // size from 2px to 8px
    this.maxLife = Math.random() * 400 + 200; // life between 200ms and 600ms
    this.life = this.maxLife;
  }

  update(dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98; // simulated air drag
    this.vy *= 0.98;
    this.life -= dt;
  }

  draw(cContext) {
    const progress = this.life / this.maxLife;
    if (progress <= 0) return;

    cContext.beginPath();
    cContext.arc(this.x, this.y, this.size * progress, 0, Math.PI * 2);
    cContext.fillStyle = this.color;
    cContext.globalAlpha = progress * 0.7;
    cContext.fill();
  }
}

export function clearParticles() {
  particles.length = 0;
}
