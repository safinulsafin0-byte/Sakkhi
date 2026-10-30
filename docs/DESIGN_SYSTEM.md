# Sakkhi Design System

> "Every taka, witnessed."

A grounded, honest, warm editorial aesthetic designed for transparency, community trust, and human dignity. 

---

## 1. Core Principles & Anti-Patterns
- **No Cold SaaS Tropes**: Absolutely no Inter, no Roboto, no purple/blue gradients, no frosted glassmorphism, no neon glows.
- **Editorial & Grounded**: Warm paper tones, deep earthen ink, pora-mati (terracotta) accents, and organic hand-drawn details.
- **Human Readability**: Base font size is **18px** with a relaxed line height of **1.7** for effortless, fatigue-free reading.
- **Accessibility by Default**: Every interactive element has a minimum **44px tap target** (`min-h-[44px] min-w-[44px]`) and high-contrast, visible focus rings.
- **Kind Human Tone**: Copy is clear, compassionate, and transparent. No marketing hype, buzzwords, or sad/manipulative imagery.

---

## 2. Typography
Loaded via `next/font/google`:
1. **Headings & Wordmark**: `Literata` (Serif) — variable font with optical sizing, warm literary authority.
2. **Body & Interface**: `Source Sans 3` (Humanist Sans) — warm, highly legible at 18px with generous x-height.
3. **Bengali & Multilingual**: `Hind Siliguri` (Bengali Sans) — graceful, balanced Bengali script for local context.

### CSS Variables:
- `--font-literata`: `'Literata', Georgia, serif`
- `--font-source-sans`: `'Source Sans 3', system-ui, sans-serif`
- `--font-hind-siliguri`: `'Hind Siliguri', sans-serif`

---

## 3. Color Palette & Tokens

| Token | Hex / HSL | Usage |
|---|---|---|
| **paper** (bg-canvas) | `#fbf9f5` | Warm off-white, unbleached paper background |
| **paper-card** | `#ffffff` | Clean card background with soft border |
| **paper-dark** | `#f3ede2` | Subdued backgrounds, receipt containers, table headers |
| **ink** (text-primary) | `#1f2421` | Deep earthen charcoal, softer than pure `#000` |
| **ink-muted** | `#525c56` | Secondary labels, timestamps, metadata |
| **ink-faint** | `#8c9690` | Placeholder text, disabled hints, borders |
| **terracotta** (primary) | `#b84c26` | Primary action button, brand highlights, active states |
| **terracotta-hover** | `#9e3f1e` | Button hover and pressed states |
| **terracotta-soft** | `#f9ede8` | Badges, highlighted rows, focus ring offset tint |
| **forest** (verified/success) | `#2d6a4f` | Verified badges, successful integrity audits |
| **forest-soft** | `#edf6f1` | Verified badge backgrounds |
| **amber** (warning/pending) | `#b45309` | In-review notices, warnings |
| **border-soft** | `#e6dfd5` | Organic card borders, dividers, tear lines |

---

## 4. Components in `components/ui`
1. **Button**: Primary (terracotta fill), Secondary (outlined earthen border), Quiet (ghost text). Minimum 44px tap target.
2. **Card**: Soft organic paper card with delicate 1px border.
3. **Badge**: Subtle rounded pill for categorization.
4. **VerifiedBadge**: Forest green pill with a distinct, organic hand-drawn check mark SVG.
5. **AmountInput**: Formats BDT (৳) and USD ($) with large, readable digits.
6. **ProgressBar**: Soft, rounded progress track with human-readable text ("9,200 of 12,000 BDT").
7. **EmptyState**: Friendly human message without sad/broken illustrations.
8. **ReceiptCard**: Rotated ~1deg paper voucher with a dotted tear line and monospace receipt details.
9. **HandUnderline**: Hand-drawn organic SVG stroke positioned under key headings.
10. **Skeleton**: Warm beige pulsing placeholder.

