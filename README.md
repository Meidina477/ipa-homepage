# International Property Alerts — Homepage

The IPA homepage, built from the Figma design (Home Page frame) and the
"Home page – Explanation" notes.

**Live site:** https://ipa-property.github.io/ipa-homepage/

## What's in it

- **Navigation** — frosted bar with mega menus for Properties, Invest, Services and
  Guides & news; shrinks to a compact bar once you scroll.
- **Destinations map** — dotted world map with a pin for every country. Choosing a
  region zooms the map into that area.
- **Luxury property abroad** — the section header stays pinned while the three
  property cards scroll up and stack over each other.
- **Currency savings** — cards reveal their photo on hover.
- **How to buy in 4 steps** — the section stays in place while scrolling moves
  through the steps.
- **Inner Circle with Chris White, Services and footer.**
- Subtle fade-in animations as sections come into view, and a phone layout.

## Run it locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173.

## Files

- `index.html` — page structure and content
- `styles.css` — design tokens, layout and responsive rules
- `script.js` — menus, map, scroll effects and animations
- `assets/` — images and logos exported from Figma

The map outlines load from the `world-atlas` package on jsDelivr and the Satoshi
font from Fontshare, so an internet connection is needed to see them.
