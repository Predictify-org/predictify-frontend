Export Instructions — generate PDFs/PNGs for handoff

If you want to produce final PDF/PNG exports from the local mockups, use one of these methods.

Option A: Use ImageMagick (Windows)
- Install ImageMagick and add to PATH.
- Example: export `desktop_default.svg` to PNG and PDF:

```powershell
magick convert design/streams-search-filter/mockups/desktop_default.svg -resize 1366x768 design/streams-search-filter/exports/desktop_default.png
magick convert design/streams-search-filter/mockups/desktop_default.svg design/streams-search-filter/exports/desktop_default.pdf
```

Option B: Use Inkscape (recommended for accurate SVG rendering)
- Install Inkscape and use CLI:

```powershell
inkscape design/streams-search-filter/mockups/desktop_default.svg --export-type=png --export-filename=design/streams-search-filter/exports/desktop_default.png --export-width=1366
inkscape design/streams-search-filter/mockups/desktop_default.svg --export-filename=design/streams-search-filter/exports/desktop_default.pdf
```

Option C: Create final frames in Figma and export
- Import the mockup SVGs into a Figma file and arrange frames for Desktop/Mobile/Empty states.
- Use Figma export presets: PNG 1x and 2x, PDF (selected frames) for stakeholder review.

Export checklist
- Export 1x and 2x PNGs for key frames: Desktop default, Desktop filtered, Mobile list, Mobile filter sheet, Empty states.
- Export a single PDF with all key frames for stakeholder review.
- Name files per `COMPONENT_SPECS.md` export names.

After export
- Save all exports into `design/streams-search-filter/exports/` and commit the folder if desired.
