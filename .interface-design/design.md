# High-End Editorial Design System: Elo Networking

## 1. Overview & Creative North Star: "The Visionary Nexus"
This design system moves away from the rigid, boxed-in layouts of traditional networking platforms. Our Creative North Star is **The Visionary Nexus** - a digital environment that feels like a high-end private member's club for the tech elite.

We achieve a premium, fintech-inspired aesthetic (a la Nubank) by prioritizing **tonal depth over structural lines**. The interface should feel fluid and interconnected, using intentional asymmetry and generous "breathing room" to elevate content. We are not just building a directory; we are curating an ecosystem where innovation feels inevitable.

---

## 2. Colors: Tonal Architecture
The palette is anchored in deep obsidian tones with electric bursts of violet and magenta.

### The "No-Line" Rule
**Standard 1px borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts. For instance, a `surface-container-low` section should sit against a `background` (surface) to create a natural, sophisticated break without the "cheap" look of a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the hierarchy below to define importance:
- **Base Layer:** `surface` (#131313) - The canvas.
- **Structural Layer:** `surface-container-low` (#1c1b1b) - For secondary content areas.
- **Interaction Layer:** `surface-container-highest` (#353534) - For cards and interactive modules that need to "pop."

### The "Glass & Gradient" Rule
To capture the "Innovation" aspect of Elo, use **Glassmorphism** for floating navigation and overlays.
- **Effect:** Combine `surface-variant` with a 20px-40px backdrop blur at 60% opacity.
- **Signature Gradients:** Apply a linear gradient from `primary-container` (#5932d1) to `secondary-container` (#9b027c) on high-impact CTAs and Hero section accents to provide a "living" digital pulse.

---

## 3. Typography: Editorial Authority
We utilize **Plus Jakarta Sans** for high-impact headlines to provide a tech-forward, geometric feel, paired with **Inter** for clinical, high-readability body copy.

- **Display (Plus Jakarta Sans):** Use `display-lg` (3.5rem) for hero statements. Tighten letter-spacing by -2% to create a "custom-type" editorial look.
- **Headline (Plus Jakarta Sans):** `headline-lg` (2rem) should be used for section titles. Ensure they have significant top-margin (Spacing 16) to let the typography breathe.
- **Body (Inter):** `body-lg` (1rem) for general content. We prioritize a line-height of 1.6 for maximum accessibility and a "premium publication" feel.
- **Labels (Inter):** `label-md` (0.75rem) in `on-surface-variant` for metadata. Keep these uppercase with +5% letter spacing for a refined, utilitarian touch.

---

## 4. Elevation & Depth: The Layering Principle
We convey hierarchy through **Tonal Layering** rather than drop shadows.

- **Ambient Shadows:** If an element must float (like a Modal), use an ultra-diffused shadow.
- *Spec:* `0 24px 48px -12px rgba(0, 0, 0, 0.5)`. The shadow must never be "grey"; it should be a deep tint of the `background` to look natural.
- **The "Ghost Border" Fallback:** If accessibility requires a container edge, use the `outline-variant` token (#484555) at **15% opacity**. This creates a "suggestion" of a line rather than a hard boundary.
- **Glassmorphism Depth:** When using glass layers, ensure the layer beneath uses a `primary` or `secondary` accent gradient to allow color to bleed through the blur, creating a sense of three-dimensional space.

---

## 5. Components: Functional Elegance

### Buttons
- **Primary:** Gradient-filled (`primary-container` to `secondary-container`) with `on-primary` text. No borders. Radius: `md` (0.75rem).
- **Secondary:** `surface-container-highest` background with a "Ghost Border."
- **Tertiary:** Pure text in `primary` with an arrow icon that shifts 4px on hover.

### Cards & Lists
**Strict Rule:** No divider lines.
- **Cards:** Use `surface-container-low` with a `xl` (1.5rem) corner radius. Use Spacing 6 (1.5rem) for internal padding.
- **Lists:** Separate items using a vertical spacing of `Spacing 4` (1rem) and a subtle background change (`surface-container-lowest`) on hover to indicate interactivity.

### Input Fields
- **Style:** Understated. Use `surface-container-high` as the background.
- **States:** On focus, transition the background to `surface-bright` and add a subtle 1px `ghost-border` in the `primary` color.

### Custom Component: "The Connection Orbit"
For the Elo community context, create an "Orbit" component - a profile card with a semi-transparent `secondary-container` glow behind the user's avatar, representing their "influence" or "activity" within the networking ecosystem.

---

## 6. Do's and Don'ts

### Do:
- **Do** use asymmetrical layouts. A 2-column grid where one column is 60% and the other is 40% feels more intentional than a 50/50 split.
- **Do** use `primary-fixed` (#e7deff) for subtle background accents behind white text to improve "pop."
- **Do** embrace negative space. If you think there is enough space, add 25% more.

### Don't:
- **Don't** use pure #000000 for backgrounds. Stick to the `surface` token (#131313) to allow for depth layering.
- **Don't** use standard Material shadows. They are too "default" for a premium brand.
- **Don't** use dividers. If two pieces of content feel cluttered, increase the spacing rather than adding a line.
- **Don't** use `Roboto` for anything other than dense data tables or small-scale technical labels. Inter is our primary narrative voice.
