---
name: Steel Monolith
colors:
  surface: '#fbf9fa'
  surface-dim: '#dbd9db'
  surface-bright: '#fbf9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f5'
  surface-container: '#efedef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e3'
  on-surface: '#1b1b1d'
  on-surface-variant: '#44474c'
  inverse-surface: '#303032'
  inverse-on-surface: '#f2f0f2'
  outline: '#75777d'
  outline-variant: '#c4c6cd'
  surface-tint: '#515f74'
  primary: '#303e51'
  on-primary: '#ffffff'
  primary-container: '#475569'
  on-primary-container: '#bbcae1'
  inverse-primary: '#b9c7df'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#4d3a1c'
  on-tertiary: '#ffffff'
  tertiary-container: '#665131'
  on-tertiary-container: '#e2c59d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3fc'
  primary-fixed-dim: '#b9c7df'
  on-primary-fixed: '#0d1c2e'
  on-primary-fixed-variant: '#3a485b'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#fcdeb4'
  tertiary-fixed-dim: '#dfc29a'
  on-tertiary-fixed: '#281901'
  on-tertiary-fixed-variant: '#574325'
  background: '#fbf9fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e3'
typography:
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-xs:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 16px
  element-gap-xs: 4px
  element-gap-sm: 8px
  element-gap-md: 12px
  section-gap: 24px
---

## Brand & Style
The design system is a rigorous, utilitarian framework designed for centralized management and high-density data orchestration. It prioritizes clarity over decoration, adopting a **"Light Mode Estricto"** aesthetic that blends Minimalist principles with the precision of developer tools.

The visual language is strictly flat. It rejects depth metaphors like shadows or gradients in favor of structural integrity provided by a consistent 1px border system. The emotional response is one of efficiency, reliability, and absolute control. It is built for professional environments where information density and scanability are the primary metrics of success.

## Colors
The palette is rooted in a "Slate" scale to maintain a cool, professional temperament. 
- **Primary Accent:** Steel Blue (#475569) is used sparingly for primary actions and active states to maintain the minimalist rigor.
- **Surface Strategy:** The UI uses a "Substrate and Plate" approach. The app background is Slate 50, while interactive components and containers use pure White to create immediate visual separation without the need for shadows.
- **Semantic Logic:** Status colors are desaturated to prevent them from vibrating against the neutral UI, ensuring they provide information without disrupting the overall hierarchy.

## Typography
This design system utilizes a dual-font strategy to distinguish between UI orchestration and technical data.
- **Inter:** The primary typeface for all navigation, labels, and interface text. It is chosen for its exceptional legibility at small scales.
- **JetBrains Mono:** Reserved exclusively for technical data, including IDs, timestamps, numerical values, and status codes. This creates a clear mental shift for the user when reading system-generated data versus interface controls.
- **Scale:** Font sizes are kept intentionally small (13px-14px) to support high information density. Headers are differentiated by weight rather than significant size increases.

## Layout & Spacing
The layout follows a strict 4px grid system, optimized for compact interfaces.
- **Density:** Padding and margins are minimized to maximize the "above-the-fold" data visibility. 
- **Grid:** A 12-column fluid grid is used for macro-layouts, while micro-layouts (inside cards or panels) rely on Flexbox/Stack patterns with tight 8px or 12px gaps.
- **Alignment:** All elements must align to the 4px baseline. Horizontal rules (1px) are the primary method for vertical rhythm and section breaks.

## Elevation & Depth
In this design system, depth is represented through **containment**, not distance.
- **No Shadows:** Shadows are strictly prohibited. 
- **Border-Based Elevation:** Elevation is achieved by wrapping elements in 1px solid borders (#E2E8F0).
- **Z-Index Layering:** When an element must appear "above" another (e.g., a dropdown or modal), it uses a pure white background and a slightly darker border (#CBD5E1) to define its perimeter against the background.
- **Interaction States:** Hover states are signaled by subtle background color shifts (Slate 50 to Slate 100) or border color changes, never by "lifting" the element.

## Shapes
Shapes follow a "Soft-Square" philosophy.
- **Radius:** A consistent 4px (0.25rem) radius is applied to buttons, input fields, and containers. This provides just enough softness to distinguish UI elements from raw text without compromising the technical, engineering-focused aesthetic.
- **Consistency:** If an element is nested (e.g., a progress bar inside a card), the inner element should have a radius that is 2px smaller to maintain visual nested harmony.

## Components
- **Buttons:** Solid primary buttons use Steel Blue (#475569) with white text. Secondary buttons use a white fill with a Slate 200 border. Transitions (hover/active) must be instant (max 100ms).
- **Inputs:** 1px border (#E2E8F0). On focus, the border changes to Slate 400. No glow or outer shadows.
- **Data Tables:** The core of the system. Rows have a 1px bottom border. Header cells use `label-caps` typography with a Slate 50 background. Monospaced font for all numerical columns.
- **Status Chips:** Rectangular with 2px radius. Low-saturation backgrounds with high-saturation text of the same hue (e.g., Light Red background with Dark Red text).
- **Sidebar/Navigation:** Flat Slate 50 background. Active links are indicated by a 2px vertical "Steel Blue" line on the left edge and a text weight increase to Semibold.
- **Cards:** White background, 1px Slate 200 border, no shadow. Padding should be tight (12px or 16px).