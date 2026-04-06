# STYLE_GUIDE.md: Mobile UI/UX Standards

## Core Design Philosophy
- **Identity:** Modern, Minimalist, and High-Contrast.
- **Platform Feel:** Use "Platform-Agnostic" patterns that look natural on both iOS and Android.
- **Responsiveness:** All layouts must be fluid but capped at 480px width for large screens to maintain a "mobile-first" appearance.

## Layout & Geometry (The "Native" Look)
AI agents must follow these structural rules to ensure the app doesn't look like a "website":

- **Safe Areas:** Use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for all headers and footers to avoid overlaps with the iPhone notch or Android navigation bar.
- **Padding:** Standardize on a **16px (1rem)** or **20px (1.25rem)** gutter for all screen edges.
- **Border Radius:** 
    - Large Components (Cards, Modals): `16px`
    - Small Components (Buttons, Inputs): `8px`
- **Scrolling:** Use `-webkit-overflow-scrolling: touch` for all containers. Hide scrollbars by default.

## Design Tokens (Color & Typography)
*Do not use hardcoded hex values. Use the following CSS Variable names:*

### Colors
| Variable | Value | Usage |
| :--- | :--- | :--- |
| `--primary` | `#3880ff` | Action buttons, active states |
| `--background` | `#ffffff` | Main screen background |
| `--surface` | `#f4f5f8` | Cards, input fields, subtle sections |
| `--text-main` | `#121212` | Headings and primary body text |
| `--text-muted` | `#666666` | Secondary labels, timestamps |
| `--error` | `#eb445a` | Error messages, destructive actions |

### Typography
- **System Font Stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
- **Heading 1:** `24px`, Semi-bold, `tight` tracking.
- **Body:** `16px`, Regular, `1.5` line-height.
- **Caption:** `12px`, Medium, uppercase (for small labels).

## Component Standards

### Buttons
- **Height:** Minimum `48px` to ensure a "Fat Finger" friendly touch target.
- **Active State:** On `:active`, reduce opacity to `0.7` or scale down to `0.98` to provide tactile feedback.
- **No Hover:** Do not implement `:hover` styles (irrelevant on mobile).

### Form Inputs
- **Font Size:** Must be at least `16px` (prevents iOS from auto-zooming the input).
- **Background:** Use `--surface` color with no border; use a 2px bottom-border on focus.

### Cards
- **Shadow:** `0 4px 12px rgba(0, 0, 0, 0.05)`. Avoid heavy black shadows.
- **Interaction:** Cards that are clickable must show a ripple effect or background color change on press.

### Headers
- **Background:** Use `--primary` color with white text for consistent branding.
- **Height:** Fixed padding of `1rem` (16px) on all sides. Total height should be compact (~60-70px including safe area).
- **Layout:** Flexbox with `align-items: center` and `gap: 1rem`.
- **Structure:**
  - Left: Navigation button (Hamburger Menu on root screens, Back Button on sub-pages).
  - Center/Right: Title container (`.header-title`) with `flex: 1`.
- **Title Styling:**
  - Font size: `1.25rem` (20px), Semi-bold.
  - Line height: `1.2` for compact vertical spacing.
  - Optional subtitle (e.g., memo count): `0.85rem`, opacity `0.85`.
- **Navigation Buttons:**
  - Minimum touch target: `44x44px`.
  - Use `flex-shrink: 0` to prevent shrinking in flexbox.
  - No `:hover` states; use `:active` with opacity `0.7` for tactile feedback.
- **Safe Area:** Use `padding-top: max(1rem, env(safe-area-inset-top))` to handle device notches.
- **Consistency:** All screens (root, sub-pages, trash bin) must use identical header geometry.

## Navigation & Transitions

### Transition Logic
- **Push Navigation (Hierarchical):** When moving "deeper" into the app (e.g., List -> Detail), the new screen must **Slide in from the Right**.
- **Back Navigation:** When hitting "Back," the current screen must **Slide out to the Right**, revealing the previous screen underneath.
- **Modal Navigation:** When opening a temporary task (e.g., "Create New," "Filter," or "Login"), the screen should **Slide up from the Bottom**.

### Transition Performance (Crucial for Capacitor)
- Use hardware-accelerated transitions. 
- **Instruction to AI:** "Use `transform: translateX()` or `translate3d()` for screen transitions. Do not animate the `left` or `margin` properties, as this causes lag in a Capacitor WebView."

### Platform-Specific Navigation Details
- **iOS:** Ensure "Swipe-from-left-to-go-back" is enabled. The header title should be centered.
- **Android:** The header title should be left-aligned. The app must respond to the hardware system "Back" button by popping the navigation stack.

## Side Menu (Drawer) vs. Context Menu

### The Side Menu (Main Navigation)
- **Use Case:** Use the Side Menu for global navigation (e.g., Home, Profile, Settings, Logout).
- **Trigger:** A "Hamburger" icon (`menu`) located in the **top-left** of the Header on main screens.
- **Behavior:** 
    - It must slide in from the **Left**.
    - It must use an overlay/backdrop to dim the rest of the screen (`rgba(0,0,0,0.5)`).
    - Closing: Users should be able to close it by tapping the backdrop or swiping it back to the left.
- **Visuals:** The menu should be full height and cover about 70-80% of the screen width.

### The Context Menu (Local Actions)
- **Use Case:** **DO NOT** use this for primary navigation. Only use context menus for specific actions on items (e.g., "Edit Post," "Delete Photo," "Share").
- **Trigger:** A "Triple Dot" icon (`ellipsis-vertical`) or a long-press.
- **AI Rule:** If the user needs to go to a completely different section of the app, use the **Side Menu**. If the user needs to perform an action on the current screen, use a **Context Menu**.

### Sidebar Structure (AI Layout Instructions)
When building the Side Menu, use this vertical structure:
1. **Header Section:** User Profile picture, Name, and Email on a `--surface` background.
2. **Body Section:** A list of navigation links with icons (use `outline` icons).
3. **Footer Section:** App version number and "Logout" button at the very bottom.

### Navigation Conflict Rules
- **Rule 1:** On "Root" screens (Home, Dashboard), the top-left icon must be the **Hamburger Menu**.
- **Rule 2:** On "Sub-pages" (Product Detail, Edit Profile), the top-left icon must be a **Back Button**, and the Side Menu should be disabled/locked to prevent navigation errors.

## Capacitor & Native Integration Rules
When implementing UI, the AI must consider Capacitor hardware constraints:

1. **Haptics:** Every primary button click should ideally trigger `Haptics.impact({ style: ImpactStyle.Light })`.
2. **Status Bar:** The UI should be designed with the status bar color in mind (e.g., if the header is white, the status bar text must be dark).
3. **Keyboard:** Use `IonFooter` (or equivalent) to ensure input fields are not covered by the software keyboard.
4. **Icons:** Use **Ionicons** or **Lucide-React**. Never mix icon sets. Use `outline` style for inactive tabs and `filled` for active tabs.

## AI Implementation Instructions (The "Prompt")
> "When building a new component or screen, strictly adhere to the `STYLE_GUIDE.md`. 
> 1. Use the CSS variables defined in the tokens.
> 2. Ensure all touch targets are at least 44x44px.
> 3. Use standard 16px padding for screen gutters.
> 4. If creating a list, use a 'Chevron Right' icon for items that navigate to a new screen.
> 5. Never use hardcoded colors; always use the theme variables."
