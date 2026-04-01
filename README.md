# Edit Now

Edit Now is a lightweight canvas editor built with React, TypeScript, Vite, and Konva. It is designed for quick visual edits without the overhead of a full design suite.

## What It Does

- Import images onto a canvas
- Add and edit text, rectangles, circles, lines, and drawing layers
- Draw with a brush on dedicated drawing layers
- Move, resize, crop, align, group, and reorder layers
- Zoom, fit to viewport, pan the canvas, and export the result

## Stack

- React
- TypeScript
- Vite
- Konva / react-konva
- Tailwind-style utility classes in component markup

## Local Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Shortcuts

- `V`: Select
- `B`: Brush
- `L`: Line
- `T`: Add text
- `I`: Import image
- `N`: New drawing layer
- `0`: Fit canvas to viewport
- `1`: Reset to 100%
- `Space + Drag`: Pan canvas
- `Delete`: Delete selection
- `Cmd/Ctrl + C`: Copy selection
- `Cmd/Ctrl + D`: Duplicate selection
- `Cmd/Ctrl + Z`: Undo
- `Cmd/Ctrl + Shift + Z`: Redo

## Project Notes

- The canvas editor lives in `src/App.tsx` and `src/components/EditorCanvas.tsx`.
- Toolbar and property UI live in `src/components/EditorToolbar.tsx` and `src/components/PropertyPanel.tsx`.
- Generated branding and SEO assets live in `public/`.

## SEO / Icons

The project includes:

- SVG favicon and logo mark
- PNG favicons (`16x16`, `32x32`)
- Apple touch icon
- Android Chrome icons (`192x192`, `512x512`)
- Open Graph image
- Web app manifest

## License

No license file is included currently.
