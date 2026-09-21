/*
 * SmoothSignaturePad v1.0.0
 * Dependency-free HTML5 canvas signature library.
 *
 * License: MIT
 */
(() => {
  'use strict';

  const DEFAULTS = {
    penColor: '#111111',
    backgroundColor: '#ffffff',
    minWidth: 0.7,
    maxWidth: 3.2,
    sensitivity: 0.72,
    smoothing: 0.55,
    pressureMin: 0.15,
    pressureMax: 0.92,
    dotSize: 1.7,
    throttle: 0,
    onBegin: null,
    onEnd: null,
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  class SmoothSignaturePad {
    constructor(canvas, options = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new TypeError('SmoothSignaturePad requires an HTMLCanvasElement.');
      }

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      if (!this.ctx) throw new Error('Canvas 2D context is not available.');

      this.options = { ...DEFAULTS, ...options };
      this.strokes = [];
      this.currentStroke = null;
      this._drawing = false;
      this._pointerId = null;
      this._lastDrawTime = 0;
      this._resizeObserver = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => this._handleResize())
        : null;

      this._bindEvents();
      this._resizeObserver?.observe(this.canvas);
      this._handleResize(true);
    }

    _bindEvents() {
      this._onPointerDown = e => this._pointerDown(e);
      this._onPointerMove = e => this._pointerMove(e);
      this._onPointerUp = e => this._pointerUp(e);
      this._onPointerCancel = e => this._pointerCancel(e);
      this._onTouch = e => e.preventDefault();

      this.canvas.addEventListener('pointerdown', this._onPointerDown);
      this.canvas.addEventListener('pointermove', this._onPointerMove);
      this.canvas.addEventListener('pointerup', this._onPointerUp);
      this.canvas.addEventListener('pointercancel', this._onPointerCancel);
      this.canvas.addEventListener('pointerleave', e => { if (this._drawing) this._pointerMove(e); });
      this.canvas.addEventListener('touchstart', this._onTouch, { passive: false });
      this.canvas.addEventListener('touchmove', this._onTouch, { passive: false });
      this.canvas.addEventListener('touchend', this._onTouch, { passive: false });
      this.canvas.style.touchAction = 'none';
    }

    _getCssSize() {
      const rect = this.canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width || this.canvas.clientWidth || 600);
      const height = Math.max(1, rect.height || this.canvas.clientHeight || 280);
      return { width, height };
    }

    _handleResize(initial = false) {
      const { width, height } = this._getCssSize();
      const dpr = clamp(window.devicePixelRatio || 1, 1, 4);
      const old = this._cssSize;
      this._cssSize = { width, height };

      if (!initial && old && old.width > 0 && old.height > 0 && this.strokes.length) {
        const sx = width / old.width;
        const sy = height / old.height;
        const sw = (sx + sy) / 2;
        for (const stroke of this.strokes) {
          for (const p of stroke.points) {
            p.x *= sx;
            p.y *= sy;
            p.width *= sw;
          }
        }
        if (this.currentStroke) {
          for (const p of this.currentStroke.points) {
            p.x *= sx;
            p.y *= sy;
            p.width *= sw;
          }
        }
      }

      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this._drawAll();
    }

    _pointerPoint(e) {
      const rect = this.canvas.getBoundingClientRect();
      const pressure = Number.isFinite(e.pressure) && e.pressure > 0 ? e.pressure : (e.buttons ? 0.5 : 0);
      return {
        x: clamp(e.clientX - rect.left, 0, rect.width),
        y: clamp(e.clientY - rect.top, 0, rect.height),
        pressure,
        time: now(),
        pointerType: e.pointerType || 'mouse',
      };
    }

    _pressureFor(point, previous) {
      let p = point.pressure;
      if (!p || p <= 0) p = previous?.pressure || 0.5;
      const norm = clamp((p - this.options.pressureMin) / Math.max(.001, this.options.pressureMax - this.options.pressureMin), 0, 1);
      return clamp(norm, 0, 1);
    }

    _widthFor(point, previous) {
      const pressure = this._pressureFor(point, previous);
      let velocity = 0;
      if (previous) {
        const dt = Math.max(1, point.time - previous.time);
        velocity = dist(point, previous) / dt;
      }
      const pressureWidth = lerp(this.options.minWidth, this.options.maxWidth, pressure);
      const speedPenalty = clamp(velocity * (1.5 + this.options.sensitivity * 2.5), 0, 1);
      const width = pressureWidth * lerp(1, 0.58, speedPenalty * this.options.sensitivity);
      return clamp(width, this.options.minWidth, this.options.maxWidth);
    }

    _coalesced(e) {
      if (typeof e.getCoalescedEvents === 'function') {
        const points = e.getCoalescedEvents();
        if (points?.length) return points;
      }
      return [e];
    }

    _pointerDown(e) {
      if (!e.isPrimary && e.pointerType !== 'mouse') return;
      e.preventDefault();
      this._drawing = true;
      this._pointerId = e.pointerId;
      this._lastDrawTime = 0;
      try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}

      this.currentStroke = {
        pointerType: e.pointerType || 'mouse',
        points: [],
        startedAt: now(),
      };
      const point = this._pointerPoint(e);
      point.width = this._widthFor(point, null);
      this.currentStroke.points.push(point);
      this.strokes.push(this.currentStroke);
      this._drawDot(point.x, point.y, Math.max(point.width, this.options.dotSize));
      this.options.onBegin?.(this, this.currentStroke);
    }

    _pointerMove(e) {
      if (!this._drawing || e.pointerId !== this._pointerId) return;
      e.preventDefault();
      const t = now();
      if (this.options.throttle > 0 && t - this._lastDrawTime < this.options.throttle) return;
      this._lastDrawTime = t;

      for (const event of this._coalesced(e)) {
        const point = this._pointerPoint(event);
        const previous = this.currentStroke.points[this.currentStroke.points.length - 1];
        if (dist(point, previous) < 0.35) continue;
        point.width = this._widthFor(point, previous);
        this.currentStroke.points.push(point);
      }

      this._drawStroke(this.currentStroke);
    }

    _pointerUp(e) {
      if (!this._drawing || e.pointerId !== this._pointerId) return;
      e.preventDefault();
      this._pointerMove(e);
      this._drawing = false;
      this._pointerId = null;
      this._drawAll();
      this.options.onEnd?.(this, this.currentStroke);
      this.currentStroke = null;
    }

    _pointerCancel(e) {
      if (!this._drawing || e.pointerId !== this._pointerId) return;
      this._drawing = false;
      this._pointerId = null;
      if (this.currentStroke?.points.length <= 1) this.strokes.pop();
      this._drawAll();
      this.options.onEnd?.(this, this.currentStroke);
      this.currentStroke = null;
    }

    _clearCanvas() {
      const { width, height } = this._cssSize || this._getCssSize();
      this.ctx.clearRect(0, 0, width, height);
      if (this.options.backgroundColor && this.options.backgroundColor !== 'transparent') {
        this.ctx.save();
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.restore();
      }
    }

    _drawDot(x, y, radius) {
      this.ctx.save();
      this.ctx.fillStyle = this.options.penColor;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    _drawStroke(stroke) {
      const pts = stroke.points;
      if (!pts.length) return;
      if (pts.length === 1) {
        this._drawDot(pts[0].x, pts[0].y, Math.max(pts[0].width, this.options.dotSize));
        return;
      }

      this.ctx.save();
      this.ctx.strokeStyle = this.options.penColor;
      this.ctx.fillStyle = this.options.penColor;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      const smoothing = clamp(this.options.smoothing, 0, 1);
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const pm = pts[i - 2] || p0;
        const pn = pts[i + 1] || p1;
        const c1 = {
          x: p0.x + (p1.x - pm.x) * smoothing / 6,
          y: p0.y + (p1.y - pm.y) * smoothing / 6,
        };
        const c2 = {
          x: p1.x - (pn.x - p0.x) * smoothing / 6,
          y: p1.y - (pn.y - p0.y) * smoothing / 6,
        };
        const segLen = Math.max(1, dist(p0, p1));
        const steps = Math.max(2, Math.ceil(segLen * 0.65));
        let last = { x: p0.x, y: p0.y, width: p0.width };

        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const mt = 1 - t;
          const x = mt*mt*mt*p0.x + 3*mt*mt*t*c1.x + 3*mt*t*t*c2.x + t*t*t*p1.x;
          const y = mt*mt*mt*p0.y + 3*mt*mt*t*c1.y + 3*mt*t*t*c2.y + t*t*t*p1.y;
          const w = lerp(p0.width, p1.width, t);
          this.ctx.lineWidth = w;
          this.ctx.beginPath();
          this.ctx.moveTo(last.x, last.y);
          this.ctx.lineTo(x, y);
          this.ctx.stroke();
          last = { x, y, width: w };
        }
      }
      this.ctx.restore();
    }

    _drawAll() {
      if (!this._cssSize) return;
      this._clearCanvas();
      for (const stroke of this.strokes) this._drawStroke(stroke);
    }

    clear(options = {}) {
      const notify = options.notify !== false;
      this.strokes = [];
      this.currentStroke = null;
      this._drawing = false;
      this._drawAll();
      if (notify) this.options.onClear?.(this);
      return this;
    }

    isEmpty() {
      return this.strokes.every(stroke => !stroke.points.length);
    }

    toData() {
      return this.strokes.map(stroke => ({
        pointerType: stroke.pointerType,
        points: stroke.points.map(p => ({
          x: Number(p.x.toFixed(3)),
          y: Number(p.y.toFixed(3)),
          pressure: Number(p.pressure.toFixed(4)),
          time: Number(p.time || 0),
          width: Number(p.width.toFixed(3)),
        }))
      }));
    }

    fromData(data, options = {}) {
      if (!Array.isArray(data)) throw new TypeError('fromData() expects an array of strokes.');
      if (options.clear !== false) this.strokes = [];
      const size = this._cssSize || this._getCssSize();
      for (const stroke of data) {
        const points = Array.isArray(stroke?.points) ? stroke.points : Array.isArray(stroke) ? stroke : [];
        if (!points.length) continue;
        const normalized = points.map(raw => {
          const p = {
            x: Number(raw.x) || 0,
            y: Number(raw.y) || 0,
            pressure: Number(raw.pressure ?? raw.p ?? 0.5),
            time: Number(raw.time ?? raw.t ?? 0),
            width: Number(raw.width ?? 0),
          };
          p.x = clamp(p.x, 0, size.width);
          p.y = clamp(p.y, 0, size.height);
          if (!p.width) p.width = this._widthFor(p, null);
          return p;
        });
        this.strokes.push({ pointerType: stroke.pointerType || 'mouse', points: normalized });
      }
      this._drawAll();
      return this;
    }

    toDataURL(type = 'image/png', quality) {
      return this.canvas.toDataURL(type, quality);
    }

    async toBlob(type = 'image/png', quality) {
      return new Promise((resolve, reject) => {
        this.canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas export failed.')), type, quality);
      });
    }

    fromDataURL(dataURL, options = {}) {
      if (typeof dataURL !== 'string' || !dataURL) throw new TypeError('fromDataURL() expects a data URL or image URL string.');
      const image = new Image();
      image.onload = () => {
        if (options.clear !== false) this.clear({ notify: false });
        const { width, height } = this._cssSize || this._getCssSize();
        const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const drawW = options.width || image.naturalWidth * scale;
        const drawH = options.height || image.naturalHeight * scale;
        const x = options.x ?? (width - drawW) / 2;
        const y = options.y ?? (height - drawH) / 2;
        this.ctx.save();
        this.ctx.drawImage(image, x, y, drawW, drawH);
        this.ctx.restore();
      };
      image.onerror = () => { throw new Error('Could not load signature image.'); };
      image.src = dataURL;
      return this;
    }

    toSVG(options = {}) {
      const { width, height } = this._cssSize || this._getCssSize();
      const bg = this.options.backgroundColor && this.options.backgroundColor !== 'transparent'
        ? `<rect width="100%" height="100%" fill="${escapeXml(this.options.backgroundColor)}"/>`
        : '';
      const paths = this.strokes.map(stroke => this._strokeToSVG(stroke)).filter(Boolean).join('');
      const xmlns = 'http://www.w3.org/2000/svg';
      const svg = `<svg xmlns="${xmlns}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${bg}${paths}</svg>`;
      return options.dataUrl ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : svg;
    }

    _strokeToSVG(stroke) {
      const pts = stroke.points;
      if (!pts.length) return '';
      if (pts.length === 1) {
        const p = pts[0];
        return `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(Math.max(p.width, this.options.dotSize)/2)}" fill="${escapeXml(this.options.penColor)}"/>`;
      }
      const smoothing = clamp(this.options.smoothing, 0, 1);
      let d = `M ${n(pts[0].x)} ${n(pts[0].y)}`;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const pm = pts[i - 2] || p0;
        const pn = pts[i + 1] || p1;
        const c1 = { x: p0.x + (p1.x - pm.x) * smoothing / 6, y: p0.y + (p1.y - pm.y) * smoothing / 6 };
        const c2 = { x: p1.x - (pn.x - p0.x) * smoothing / 6, y: p1.y - (pn.y - p0.y) * smoothing / 6 };
        d += ` C ${n(c1.x)} ${n(c1.y)}, ${n(c2.x)} ${n(c2.y)}, ${n(p1.x)} ${n(p1.y)}`;
      }
      // SVG cannot vary stroke width within a single path, so use short path segments.
      const segments = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i-1], b = pts[i];
        segments.push(`<path d="M ${n(a.x)} ${n(a.y)} L ${n(b.x)} ${n(b.y)}" fill="none" stroke="${escapeXml(this.options.penColor)}" stroke-width="${n(lerp(a.width,b.width,.5))}" stroke-linecap="round" stroke-linejoin="round"/>`);
      }
      return segments.join('');
    }

    setOptions(partial = {}) {
      Object.assign(this.options, partial);
      this._drawAll();
      return this;
    }

    resize() {
      this._handleResize();
      return this;
    }

    off() {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      this.canvas.removeEventListener('pointermove', this._onPointerMove);
      this.canvas.removeEventListener('pointerup', this._onPointerUp);
      this.canvas.removeEventListener('pointercancel', this._onPointerCancel);
      this.canvas.removeEventListener('touchstart', this._onTouch);
      this.canvas.removeEventListener('touchmove', this._onTouch);
      this.canvas.removeEventListener('touchend', this._onTouch);
      this._resizeObserver?.disconnect();
      return this;
    }

    destroy() {
      this.off();
      this.strokes = [];
      this.currentStroke = null;
      this._clearCanvas();
    }
  }

  function n(value) { return Number(value.toFixed(2)); }
  function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[ch]));
  }

  if (typeof window !== 'undefined') window.SmoothSignaturePad = SmoothSignaturePad;
  if (typeof module !== 'undefined' && module.exports) module.exports = SmoothSignaturePad;
})();
