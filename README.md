# SmoothSignaturePad

A lightweight, dependency-free JavaScript signature pad built on the HTML5 Canvas and Pointer Events.

[Live demo](https://mousesalt.github.io/signature-pad-js/) · [Repository](https://github.com/mousesalt/signature-pad-js)

## Features

- Smooth signature strokes with pressure-aware variable line width.
- Mouse, touch, and stylus support.
- Uses `getCoalescedEvents()` when available for denser input sampling.
- High-DPI / Retina rendering.
- Responsive resizing while preserving stroke data.
- Clear and empty-state checks.
- Export to PNG, JPEG, and SVG.
- Import raster signatures from a data URL.
- Read and restore underlying stroke data.
- Custom pen color, background color, thickness, sensitivity, and smoothing.
- `onBegin`, `onEnd`, and `onClear` callbacks.
- No external libraries or runtime dependencies.
- Works as a browser global and supports CommonJS-style loading when available.

## Quick start

```html
<canvas id="signature" style="width:100%;height:260px"></canvas>
<script src="signature-pad.js"></script>
<script>
  const pad = new SmoothSignaturePad(document.getElementById('signature'), {
    penColor: '#111827',
    backgroundColor: '#ffffff',
    minWidth: 0.8,
    maxWidth: 4,
    sensitivity: 0.72,
    smoothing: 0.58,
    onBegin: () => console.log('signing started'),
    onEnd: () => console.log('signing finished')
  });

  document.querySelector('#save').addEventListener('click', () => {
    const png = pad.toDataURL('image/png');
    console.log(png);
  });
</script>
```

## Options

| Option | Default | Description |
|---|---:|---|
| `penColor` | `#111827` | Stroke color. |
| `backgroundColor` | `#ffffff` | Canvas background. |
| `minWidth` | `0.7` | Minimum stroke width. |
| `maxWidth` | `4` | Maximum stroke width. |
| `sensitivity` | `0.7` | Pressure/velocity response sensitivity. |
| `smoothing` | `0.6` | Curve smoothing amount. |
| `onBegin` | `null` | Called when a stroke starts. |
| `onEnd` | `null` | Called when a stroke ends. |
| `onClear` | `null` | Called after `clear()`. |

## API

### Drawing state

- `clear()` — clear the canvas and stroke history.
- `isEmpty()` — returns `true` when no strokes exist.
- `resize()` — rescale the backing canvas for its current CSS size and device pixel ratio.
- `destroy()` — remove event listeners and release the pad instance.

### Stroke data

- `toData()` — return the recorded stroke data as a plain JavaScript array.
- `fromData(data)` — replace the current drawing with recorded stroke data.

Stroke data is the preferred format for persistence when you need to edit, redraw, or resize a signature without losing its vector-like source points.

### Image export/import

- `toDataURL('image/png')` — PNG data URL.
- `toDataURL('image/jpeg', quality)` — JPEG data URL.
- `toBlob(type, quality)` — `Blob` export for PNG/JPEG workflows.
- `toSVG()` — SVG string generated from the recorded strokes.
- `fromDataURL(dataURL)` — load a raster image into the canvas.

## Recommended persistence

For editable signatures, store the output of `toData()` rather than only storing a PNG/JPEG. The stroke data can be restored later with `fromData()` and remains independent of the current canvas pixel density.

For a simple image upload, use `toBlob()` and send the resulting `Blob` through your own application code.

## GitHub Pages

This repository is static and needs no build step. The included GitHub Actions workflow validates the JavaScript and deploys the root folder to GitHub Pages.

Enable Pages in **Settings → Pages → Source: GitHub Actions** if it is not already enabled.

## Privacy

The library does not upload signatures anywhere by itself. Drawing and export happen in the browser. Your application decides whether and where exported data is stored or transmitted.

## Browser notes

Modern browsers expose pointer pressure through Pointer Events. Mouse input usually has no meaningful pressure value, so the library falls back to a stable width when pressure is unavailable. `getCoalescedEvents()` is an optional enhancement and is used only when the browser provides it.

## License

MIT © 2026 mousesalt
