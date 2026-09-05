---
name: Serene Cadence
source: Stitch asset 6bf7495de09245c08e8f3f961b1cc232
colors:
  background: '#f8fafc'
  surface: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f5f9'
  surface-container: '#e2e8f0'
  surface-container-high: '#cbd5e1'
  surface-container-highest: '#cbd5e1'
  on-surface: '#0f172a'
  on-surface-variant: '#475569'
  outline: '#cbd5e1'
  outline-variant: '#e2e8f0'
  primary: '#1e3a5f'
  on-primary: '#ffffff'
  primary-container: '#304b6a'
  secondary: '#2563eb'
  on-secondary: '#ffffff'
  tertiary: '#059669'
  error: '#e11d48'
  warning: '#d97706'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  numeric-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.5rem
  DEFAULT: 0.75rem
  md: 1rem
  lg: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter-mobile: 16px
  gutter-tablet: 24px
  gutter-desktop: 32px
  content-max-width: 1280px
---

## Brand and Style

Serene Cadence is calm, breathable and focused on intentional immediacy: what matters right now. It combines Scandinavian functional minimalism with editorial tactility inspired by Things 3, Cron and Craft.

The canvas uses cool, low-saturation surfaces. White cards, thin borders and restrained shadows create separation without visual noise. Interactive color is reserved for focus, selection, progress, success and urgency.

## Layout

- Mobile below 640px: single-column stack, 16px gutters, minimum 44px touch targets and bottom clearance for the floating capture control.
- Tablet from 640px to 1024px: centered content column with 24px gutters; secondary content can move into sheets.
- Desktop above 1024px: optional 240px navigation rail and a central 640px focus track with a wider secondary pane.
- Use an 8px rhythm with 4px subdivisions. Keep primary content in the thumb-accessible lower two-thirds on mobile.

## Elevation and Shapes

- Canvas uses `#f8fafc`; cards use `#ffffff` with a `1px` `#e2e8f0` border.
- Inline cards use a barely visible shadow; active overlays and sheets may use a soft, diffused shadow.
- Base controls use 8px to 12px radii. Primary cards and sheets use 16px radii. Pills and status tags use full radius.
- Avoid gradients and strong contrast borders. Hover and pressed states change surface tone or border color before adding motion.

## Component Rules

- Primary buttons use midnight slate, white text and a 12px radius; pressed state may scale to `0.98`.
- Secondary buttons use white, a thin slate border and slate text.
- Checkboxes are 20px circular controls. Completed tasks fill with quiet sage `#059669`, reveal a white check and mute the title with a line-through.
- Task cards use 12px vertical and 16px horizontal padding. Metadata and times use Inter numeric styling with tabular figures.
- Chips are 26px high, borderless and pill-shaped. Use slate for neutral tags, cobalt for active tags and amber for imminence.
- Standard inputs use white background, a 1px border and an 8px to 10px radius. Focus changes the border to cobalt without a glow halo.
- The quick-capture entry is a full-width, friendly composer trigger on mobile and a contained control on desktop. The composer itself uses a white surface, a clear three-mode switcher and one obvious primary action.
- Dialogs and drawers must expose an accessible title. Mobile capture uses the shadcn `Drawer` primitive; desktop overlays use `Dialog`.

## shadcn Mapping

The application keeps feature-specific components, but delegates interaction primitives to shadcn when the behavior is generic:

- `BottomSheet` -> shadcn `Drawer` backed by Vaul.
- `ConfirmModal`, `QuickCaptureModal`, `TaskModal` and editor overlays -> shadcn `Dialog`.
- `Card`-like shells -> shadcn `Card` with Serene Cadence classes.
- Action buttons and icon actions -> shadcn `Button` variants.
- Status and project labels -> shadcn `Badge`.
- Profile images and member stacks -> shadcn `Avatar`.
- Color menus and contextual actions -> shadcn `Popover` or `DropdownMenu`.
- Search and command shortcuts -> shadcn `Command`.
- Responsive navigation -> shared route configuration, `Sidebar` at desktop, a temporary side drawer on tablet and a five-item bottom navigation with a `Más` drawer below 640px.
- Dense task filters -> shadcn `Tabs`, `Select`, `Checkbox` and `ScrollArea` as appropriate.

Feature logic, API calls, query keys and user-scoped data remain outside these primitives.

## Canonical Semantic Palette

The descriptive semantic palette is authoritative when it differs from generated theme metadata:

- Background / canvas: `#f8fafc`
- Surface / card / popover: `#ffffff`
- Subdued surface: `#f1f5f9`
- Border: `#e2e8f0`
- Border hover / focus: `#cbd5e1`
- Primary action: `#1e3a5f`
- Secondary action: `#2563eb`
- Success: `#059669`
- Warning: `#d97706`
- Destructive: `#e11d48`
- Secondary text: `#475569`
- Placeholder: `#94a3b8`
- Disabled: `#cbd5e1`

Do not introduce black primary surfaces, saturated blue primary actions or gradients. Interactive states should use border and surface changes before motion. Avoid uppercase text for regular labels; reserve the compact caps style for metadata and section eyebrows.

## Interaction Contract

- Standard fields are 40px high on desktop and 44px high on mobile, with 8px to 10px radii and a cobalt focus border without a glow halo.
- Buttons are at least 44px high, use sentence case, and expose a clear primary, secondary, ghost or destructive hierarchy.
- Cards use 12px to 16px radii, subtle borders and restrained elevation. Do not make every section a floating card.
- Mobile bottom navigation has `Hoy`, `Plan`, `Enfoque`, `Notas` and `Más`. The floating capture action sits above it and is not a sixth navigation item.
- Quick capture supports task, note and reminder modes without losing drafts when switching modes. The task path may hand off to the full task editor for recurrence, assignee, subtasks and task-specific reminders.
- All dates shown to users use the local browser timezone. Numeric and time metadata use tabular figures.
