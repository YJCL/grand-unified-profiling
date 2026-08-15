---
name: Orba
description: 精密に確かめ、温かく言葉にする。
colors:
  luminous-gold: "#F4C060"
  wordmark-ivory: "#FFF0BD"
  paper-gold: "#A77C24"
  action-ink: "#211708"
  night-950: "#070713"
  night-900: "#090919"
  night-800: "#111126"
  paper: "#FBF8F0"
  paper-raised: "#FFFDF8"
  ink: "#262331"
  quiet: "#736E7A"
  structural-indigo: "#8B7FD4"
  structural-teal: "#4FC3CF"
  paper-divider: "#D8D0C2"
typography:
  display:
    fontFamily: "Shippori Mincho, Noto Serif JP, serif"
    fontSize: "clamp(3rem, 5.35vw, 4.875rem)"
    fontWeight: 500
    lineHeight: 1.42
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Shippori Mincho, Noto Serif JP, serif"
    fontSize: "clamp(2.5rem, 5vw, 4.25rem)"
    fontWeight: 500
    lineHeight: 1.48
  body:
    fontFamily: "Noto Sans JP, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 2
  title:
    fontFamily: "Shippori Mincho, Noto Serif JP, serif"
    fontSize: "clamp(1.5625rem, 2.7vw, 2.375rem)"
    fontWeight: 500
    lineHeight: 1.55
  small-body:
    fontFamily: "Noto Sans JP, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: "Noto Sans JP, system-ui, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.16em"
rounded:
  mark: "9px"
  control: "12px"
  surface: "16px"
  focus-surface: "22px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  section: "clamp(100px, 13vw, 190px)"
components:
  button-primary:
    backgroundColor: "{colors.luminous-gold}"
    textColor: "{colors.ink}"
    rounded: "0px"
    padding: "13px 18px"
  surface-night:
    backgroundColor: "{colors.night-800}"
    textColor: "{colors.paper}"
    rounded: "{rounded.surface}"
    padding: "24px"
  surface-paper:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
---

# Design System: Orba

## Overview

**Creative North Star: "Celestial Instrument"**

Orba feels like a precise observation instrument housed in a quiet night room. The primary contrast is not “space fantasy”; it is night versus paper: computation and mystery in the shell, human-readable reflection on warm paper. The luminous orb is dimensional, slow, and alive. It is never a flat badge spinning around its center.

The personality is **precise, warm, and still**. Pages use editorial scale, ample silence, and one focal expression per viewport. Product UI may be denser than the LP, but it keeps the same type pairing, rare gold accent, and calm hierarchy.

**Key Characteristics:**

- Deep near-black violet night paired with warm ivory paper.
- Large Japanese Mincho statements with restrained sans-serif support text.
- Luminous gold used as a signal, not as decoration everywhere.
- Real WebGL surface light and orbit geometry for signature moments.
- Observation-paper content surfaces inside a darker application shell.

## Colors

The palette alternates between nocturnal computation and readable paper, connected by one luminous gold signal.

### Primary

- **Luminous Gold:** reserved for the primary action, active navigation, labels, and the warm light inside the orb.
- **Paper Gold:** the accessible dark-on-paper counterpart for links, labels, and controls.

### Neutral

- **Night 950 / 900 / 800:** page ground, application shell, and raised night surfaces.
- **Warm Paper / Raised Paper:** reading ground and focused content cards.
- **Ink:** all primary text placed on paper.
- **Quiet:** secondary and explanatory text placed on paper.

**The Rare Light Rule.** Gold should remain under roughly ten percent of a screen. Its rarity is what makes it feel luminous.

**The Two Grounds Rule.** Use paper text tokens on night and ink tokens on paper. Do not soften contrast with arbitrary gray-on-gray combinations.

## Typography

**Display Font:** Shippori Mincho (with Noto Serif JP and serif fallbacks)  
**Wordmark Font:** Cormorant Garamond Medium Italic  
**Body Font:** Noto Sans JP (with system sans-serif fallback)

**Character:** Mincho supplies measured humanity and editorial authority. The sans-serif layer stays small, legible, and functional. The wordmark is a separate Latin signature and never substitutes for Japanese headlines.

### Hierarchy

- **Display:** hero statements only; two or three deliberate lines, weight 500, generous line height.
- **Headline:** section thesis and major product state.
- **Title:** card and result title, normally 19–33px depending on role.
- **Body:** 13–15px, line-height 1.8–2.1, normally capped near 55–65 characters per line.
- **Label:** 8–10px, tracked and uppercase only for short system labels.

**The One Editorial Voice Rule.** A viewport gets one dominant Mincho statement. Repeating oversized headings turns stillness into noise.

## Layout

Marketing uses a wide two-column first viewport: thesis on the left, instrument on the right. Sections switch between full-width night bands and paper fields. Content padding is fluid and becomes 20px on small screens.

Service routes share a 68px desktop navigation shell. At 650px and below, navigation becomes a 66px bottom bar while the wordmark remains in a 60px top bar. Reading content stays within a narrow centered measure; hero/result surfaces may be wider.

Desktop-to-mobile translation preserves reading order and focal scale. It may stack columns, but it may not delete the focal orb or turn navigation into an unlabelled icon row.

## Elevation & Depth

Depth is tonal first, ambient second. Night surfaces separate through subtle borders and nearby tonal steps. Paper cards use diffuse, low-opacity shadows. The focal orb earns the strongest depth through real shader lighting and a soft drop shadow; ordinary controls do not imitate physical metal, glass, or embossing.

**The One Deep Object Rule.** Only the signature orb or one focus card should feel substantially lifted in a viewport.

## Shapes

The application uses gently rounded controls (9–16px) and larger focus surfaces (22px). Marketing calls to action may be square-edged to feel editorial and decisive. Orbit ellipses are the recurring signature geometry; incomplete gold rings are not a logo.

## Components

### Buttons

- **Primary:** luminous gold with dark ink, decisive rectangular form on marketing and a 12px control radius in product UI.
- **Hover / Focus:** lift or brighten slightly; every keyboard focus uses a 2px gold outline with visible offset.
- **Ghost:** transparent, paper-colored text, and one restrained gold underline or low-contrast border.

### Cards / Containers

- **Night focus card:** Night 800 or a restrained night gradient, paper text, and up to a 22px radius.
- **Paper reading card:** Raised Paper with Ink text, 16px radius, and diffuse ambient shadow.
- **Borders:** one-pixel translucent separators; no stacks of nested outlined cards.

### Inputs / Fields

- **Style:** warm paper or a lightly tinted paper field with Ink text and a 12px radius.
- **Focus:** gold or Paper Gold outline, never a default blue ring.
- **Disabled:** preserve text legibility and reduce action contrast rather than overall opacity below readable levels.

### Navigation

The official lockup anchors the left edge. Desktop labels remain visible. The active item uses paper text, a gold icon, and a single gold baseline. Mobile uses labelled icons in a stable four-item bottom bar.

### Volumetric Orb

The signature component is a WebGL sphere with moving FBM surface detail, directional light, violet mineral shadow, warm hotspot, and two or three slow orbit ellipses. It must include a static fallback and stop animation for reduced motion or when off-screen.

## Do's and Don'ts

### Do:

- **Do** distinguish confirmed identity assets from provisional symbols and expressive CG.
- **Do** use warm paper when the user needs to read, compare, or write.
- **Do** let large type and one dimensional object carry the first viewport.
- **Do** retain explicit text labels in core navigation.

### Don't:

- **Don't** use the old incomplete ring mark as Orba's logo.
- **Don't** rotate a flat star, badge, or PNG and call it the hero expression.
- **Don't** scatter generic glass cards, rainbow gradients, or equal-weight feature tiles across the page.
- **Don't** use deterministic, fear-based, or inflated claims.
- **Don't** apply display-scale labels or tiny tracked text to long Japanese copy.
