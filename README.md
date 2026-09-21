# SmoothSignaturePad

Small dependency-free JavaScript library for drawing smooth signatures on an HTML5 canvas.

## Includes

- Pressure-aware variable line width through Pointer Events.
- Desktop mouse, stylus and touch support.
- Smoother input using `getCoalescedEvents()` when a browser provides it.
- `clear()` and `isEmpty()`.
- Export as PNG, JPEG and SVG.
- Load raster images with `fromDataURL()`.
- Save/load editable stroke data with `toData()` and `fromData()`.
- Custom pen/background colors, min/max line width, sensitivity and smoothing.
- `onBegin`, `onEnd`, and optional `onClear` callbacks.
- High-DPI canvas sizing and responsive resizing with stroke preservation.
- Browser global (`window.SmoothSignaturePad`) and CommonJS export.

## Minimal usage

```html
<canvas id="signature" style="width:100%;height:260px"></canvas>
<script src="signature-pad.js"></script>
<script>
  const pad = new SmoothSignaturePad(document.querySelector('#signature'), {
    penColor: '#111',
    backgroundColor: '#fff',
    minWidth: 0.8,
    maxWidth: 4,
    sensitivity: 0.72,
    smoothing: 0.58,
    onBegin: () => console.log('started'),
    onEnd: () => console.log('finished')
  });

  // PNG/JPEG data URL
  const png = pad.toDataURL('image/png');
  const jpg = pad.toDataURL('image/jpeg', 0.92);

  // SVG string
  const svg = pad.toSVG();

  // Editable stroke data
  const strokes = pad.toData();
  pad.clear();
  pad.fromData(strokes);
</script>
```

## Notes

The library keeps vector-like stroke data internally. PNG/JPEG exports are raster canvas exports; SVG is generated from the recorded strokes. Because SVG supports one `stroke-width` per path, the SVG exporter writes short rounded segments to approximate variable-width pressure.
