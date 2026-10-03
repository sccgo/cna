/**
 * CNA Professional Sparkles System v2
 * Falling particles — always visible — fully configurable
 * Settings loaded from window.CNA_SPARKLES_CONFIG
 */
(function() {
  'use strict';

  var canvas, ctx, particles = [], animId = null, enabled = false;
  var CFG = {
    count: 35,
    speed: 1.2,
    colors: ['#C9A84C','#E8D48B','#F0E6B2','#FFFFFF','#D4AF37'],
    shapes: ['star','circle','diamond','sparkle'],
    minSize: 3,
    maxSize: 8,
    wind: 0.3,
    opacity: 0.85,
  };

  function applyConfig(cfg) {
    if (!cfg) return;
    if (cfg.count  !== undefined) CFG.count  = Math.min(150, Math.max(5, parseInt(cfg.count)));
    if (cfg.speed  !== undefined) CFG.speed  = Math.min(5,   Math.max(0.3, parseFloat(cfg.speed)));
    if (cfg.colors !== undefined) CFG.colors = Array.isArray(cfg.colors) ? cfg.colors : CFG.colors;
    if (cfg.shapes !== undefined) CFG.shapes = Array.isArray(cfg.shapes) ? cfg.shapes : CFG.shapes;
    if (cfg.minSize !== undefined) CFG.minSize = parseFloat(cfg.minSize);
    if (cfg.maxSize !== undefined) CFG.maxSize = parseFloat(cfg.maxSize);
    if (cfg.wind    !== undefined) CFG.wind    = parseFloat(cfg.wind);
    if (cfg.opacity !== undefined) CFG.opacity = parseFloat(cfg.opacity);
  }

  function Particle() {
    this.reset(true);
  }
  Particle.prototype.reset = function(fromTop) {
    this.x = Math.random() * (canvas ? canvas.width : window.innerWidth);
    this.y = fromTop ? -20 - Math.random() * 100 : Math.random() * (canvas ? canvas.height : window.innerHeight);
    this.size = CFG.minSize + Math.random() * (CFG.maxSize - CFG.minSize);
    this.speedY = CFG.speed * (0.5 + Math.random() * 1.2);
    this.speedX = (Math.random() - 0.5) * CFG.wind;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.02 + Math.random() * 0.04;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.08;
    this.color = CFG.colors[Math.floor(Math.random() * CFG.colors.length)];
    this.shape = CFG.shapes[Math.floor(Math.random() * CFG.shapes.length)];
    this.alpha = 0.4 + Math.random() * 0.6;
    this.pulse = 0;
    this.pulseDir = 1;
  };

  function drawStar(x, y, r, spikes) {
    spikes = spikes || 5;
    var rot = (Math.PI / spikes) * 2;
    var outerR = r, innerR = r * 0.4;
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var ri = i % 2 === 0 ? outerR : innerR;
      var a = (i * rot) - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + ri * Math.cos(a), y + ri * Math.sin(a));
      else         ctx.lineTo(x + ri * Math.cos(a), y + ri * Math.sin(a));
    }
    ctx.closePath();
  }

  function drawDiamond(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.6, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.6, y);
    ctx.closePath();
  }

  function drawSparkle(x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = (i * Math.PI / 2);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(a - 0.3) * r * 0.5, y + Math.sin(a - 0.3) * r * 0.5,
        x + Math.cos(a) * r, y + Math.sin(a) * r
      );
    }
  }

  function draw(p) {
    ctx.save();
    ctx.globalAlpha = p.alpha * CFG.opacity;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.shape === 'star') {
      drawStar(0, 0, p.size);
      ctx.fill();
    } else if (p.shape === 'diamond') {
      drawDiamond(0, 0, p.size);
      ctx.fill();
    } else if (p.shape === 'sparkle') {
      drawSparkle(0, 0, p.size);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Center dot
      ctx.beginPath(); ctx.arc(0, 0, p.size * 0.15, 0, Math.PI * 2); ctx.fill();
    } else {
      // circle with glow
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 1.5;
      ctx.beginPath(); ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function update() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.wobble += p.wobbleSpeed;
      p.x += p.speedX + Math.sin(p.wobble) * 0.4;
      p.y += p.speedY;
      p.rotation += p.rotSpeed;
      // Pulse alpha
      p.alpha += 0.008 * p.pulseDir;
      if (p.alpha > 0.95 || p.alpha < 0.2) p.pulseDir *= -1;
      // Reset if off screen
      if (p.y > canvas.height + 20 || p.x < -30 || p.x > canvas.width + 30) {
        p.reset(true);
      }
    }
  }

  function animate() {
    if (!enabled) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();
    for (var i = 0; i < particles.length; i++) draw(particles[i]);
    animId = requestAnimationFrame(animate);
  }

  function setupCanvas() {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'cna-sparkles-canvas';
      canvas.style.cssText = [
        'position:fixed','top:0','left:0','width:100%','height:100%',
        'pointer-events:none','z-index:1','opacity:1',
      ].join(';');
      document.body.insertBefore(canvas, document.body.firstChild);
      ctx = canvas.getContext('2d');
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function spawnParticles() {
    particles = [];
    for (var i = 0; i < CFG.count; i++) {
      var p = new Particle();
      p.y = Math.random() * window.innerHeight; // start scattered
      particles.push(p);
    }
  }

  var resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    }, 200);
  }

  function start(cfg) {
    applyConfig(cfg);
    setupCanvas();
    spawnParticles();
    if (!enabled) {
      enabled = true;
      animate();
    }
    canvas.style.display = 'block';
  }

  function stop() {
    enabled = false;
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    if (canvas) canvas.style.display = 'none';
    particles = [];
  }

  function updateConfig(cfg) {
    applyConfig(cfg);
    if (enabled) {
      // Respawn with new config
      spawnParticles();
    }
  }

  window.addEventListener('resize', onResize);

  // API
  window.CNA = window.CNA || {};
  window.CNA.sparkles = { start: start, stop: stop, update: updateConfig, isRunning: function() { return enabled; } };

  // Auto-start if config present
  if (window.CNA_SPARKLES_CONFIG && window.CNA_SPARKLES_CONFIG.enabled) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { start(window.CNA_SPARKLES_CONFIG); });
    } else {
      start(window.CNA_SPARKLES_CONFIG);
    }
  }
})();
