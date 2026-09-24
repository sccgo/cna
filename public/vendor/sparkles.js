/**
 * CNA Sparkles — lightweight particle effect
 * Usage: window.CNA.sparkles.init() or window.CNA.sparkles.burst(x, y)
 */
(function() {
  'use strict';
  var canvas, ctx, particles = [], animId, running = false;
  var COLORS = ['#FFD700','#FFF','#C0C0C0','#FFE066','#FFFACD','#F0E68C'];

  function Particle(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random()-0.5)*4;
    this.vy = (Math.random()-2.5)*3;
    this.alpha = 1;
    this.color = COLORS[Math.floor(Math.random()*COLORS.length)];
    this.size = Math.random()*4+2;
    this.shape = Math.random()>0.5 ? 'star' : 'circle';
    this.rotation = Math.random()*Math.PI*2;
    this.rotSpeed = (Math.random()-0.5)*0.2;
    this.life = 0;
    this.maxLife = 40+Math.floor(Math.random()*30);
  }

  function drawStar(cx, cy, r, color, alpha, rot) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.beginPath();
    for (var i=0;i<5;i++) {
      var a1=((i*72)-90)*Math.PI/180, a2=((i*72+36)-90)*Math.PI/180;
      if(i===0) ctx.moveTo(Math.cos(a1)*r, Math.sin(a1)*r);
      else ctx.lineTo(Math.cos(a1)*r, Math.sin(a1)*r);
      ctx.lineTo(Math.cos(a2)*(r*0.4), Math.sin(a2)*(r*0.4));
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function animate() {
    if (!running) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles = particles.filter(function(p) { return p.life < p.maxLife; });
    for (var i=0;i<particles.length;i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.12;
      p.rotation += p.rotSpeed;
      p.alpha = 1 - (p.life/p.maxLife); p.life++;
      if (p.shape === 'star') {
        drawStar(p.x, p.y, p.size, p.color, p.alpha, p.rotation);
      } else {
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2);
        ctx.fill(); ctx.restore();
      }
    }
    if (particles.length > 0) animId = requestAnimationFrame(animate);
    else { running = false; canvas.style.display='none'; }
  }

  function ensureCanvas() {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;';
      document.body.appendChild(canvas);
    }
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');
    canvas.style.display = 'block';
  }

  function burst(x, y, count) {
    ensureCanvas();
    count = count || 20;
    for (var i=0; i<count; i++) particles.push(new Particle(x, y));
    if (!running) { running = true; animate(); }
  }

  // Click burst on admin buttons
  function initClickBursts() {
    document.addEventListener('click', function(e) {
      var t = e.target;
      if (t.classList && (t.classList.contains('btn-primary') || t.classList.contains('btn-success'))) {
        burst(e.clientX, e.clientY, 15);
      }
    });
  }

  // Auto sparkles around logo in header
  function logoSparkle() {
    var logo = document.querySelector('.site-logo') || document.querySelector('.admin-sidebar-logo');
    if (!logo) return;
    var r = logo.getBoundingClientRect();
    var x = r.left + Math.random()*r.width;
    var y = r.top + Math.random()*r.height;
    burst(x, y, 5);
  }

  window.CNA = window.CNA || {};
  window.CNA.sparkles = {
    burst: burst,
    init: function() { initClickBursts(); setInterval(logoSparkle, 3000); },
    disable: function() { running = false; particles = []; if(canvas) canvas.style.display='none'; }
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { window.CNA.sparkles.init(); });
  } else {
    window.CNA.sparkles.init();
  }
})();
