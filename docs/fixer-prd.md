# Overview
---
The **Fixer** previews a reversible, automatic CSS color adjustment for a **verified text-contrast issue** found by Inspector. It is not a universal accessibility autofixer. The MVP suggests a replacement text or solid background color that meets the applicable WCAG AA contrast threshold and lets developers compare the result without editing their source files.

# Problem
---
Even when developers know an element fails contrast requirements, finding an acceptable adjustment and verifying it in context takes time.

**Current Pain Points**
- Audit results do not always show what a successful change would look like.
- Developers must manually experiment with CSS colors.
- A permanent change is risky before checking the design visually.

**Impact**
- Developers can see one concrete improvement immediately.
- Fixes become easier to evaluate in the context of the real UI.
- Developers learn the CSS change to make in their own codebase.

# User Stories
---
## User Definitions
- **Frontend Developer** - Tests a suggested CSS correction before implementing it.
- **UI/UX Designer** - Compares original and improved contrast in context.
- **Student Developer** - Understands which styling change resolves a measured failure.

## User Stories
### Frontend Developer
- As a developer, I want a one-click suggested contrast fix so I can preview an improvement without editing source files.
- As a developer, I want to undo the preview so the webpage returns to its original styling.

### UI/UX Designer
- As a designer, I want to switch between before and after while the selected simulation remains active so I can judge the change visually.

# Requirements
---
## Functional Requirements
- **FIX-01:** Accept an Inspector issue only when a supported element has a verified text-contrast failure and known colors/threshold.
- **FIX-02:** Calculate one replacement **foreground color by default** (or solid background color if foreground adjustment is not supported) that reaches at least the required WCAG AA ratio; prefer a small change to the original color.
- **FIX-03:** Show current vs. proposed hex value, contrast ratio before/after, and the CSS property being changed.
- **FIX-04:** Apply the suggestion only to the selected webpage element using a temporary style override; never modify original source files or persist the override across reloads.
- **FIX-05:** Provide **Preview fix**, **Compare original/fixed**, and **Revert** actions. Preserve the active Simulator mode during comparisons.
- **FIX-06:** Recalculate the contrast ratio after applying the override and show whether the result meets the target.
- **FIX-07:** Offer a copyable CSS declaration for manual implementation; explain that the preview is not a permanent fix.
- **FIX-08:** If the element is detached, colors are uncertain, or a compliant color cannot be reliably proposed, show an informative unsupported state instead of applying a misleading fix.

## Non-Functional Requirements
- **Performance:** Apply/revert a preview within <300 ms on the controlled demo page.
- **Scalability:** Keep the fix calculation separate from DOM style application so later fix types can be added.
- **Safety:** Capture and restore the element's prior inline-style state exactly; clear temporary fixes when the extension is disabled or the page reloads.
- **Accessibility:** All fix controls must be keyboard operable and show clear text labels.

# Design
---
## UX Flow
1. Developer selects a verified contrast failure in Inspector.
2. Developer opens **Fixer** and sees the proposed CSS color change and expected ratio.
3. Developer clicks **Preview fix** to apply the temporary change.
4. Developer toggles **Original / Fixed** while observing the page, including any active simulation.
5. Developer copies the CSS suggestion or clicks **Revert**.

## UI
- Fixer tab with selected-element summary, before/after color swatches, ratios, and proposed declaration.
- Primary action: **Preview fix**; secondary actions: **Compare**, **Copy CSS**, **Revert**.
- Clear notice: **Preview only — source code has not been changed.**