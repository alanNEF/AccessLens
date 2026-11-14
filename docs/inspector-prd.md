# Overview
---
The **Inspector** identifies and explains measurable accessibility problems on a developer's current webpage. For the hackathon MVP, it focuses on **WCAG text contrast**, highlights affected elements, and lets developers select an element to see its colors, calculated contrast ratio, and applicable threshold. It feeds a structured issue to Fixer.

# Problem
---
A visual simulation can reveal that something is hard to read, but it does not tell a developer exactly which element or style causes the problem.

**Current Pain Points**
- Accessibility reports often feel disconnected from the actual webpage.
- Developers need to find the specific element and CSS property responsible.
- Some accessibility problems cannot be confirmed by simple automated rules.

**Impact**
- Developers can locate concrete readability problems quickly.
- Issues become understandable and actionable rather than just numerical scores.
- Verified issues can flow directly into a reversible fix preview.

# User Stories
---
## User Definitions
- **Frontend Developer** - Investigates accessibility issues in rendered elements.
- **UI/UX Designer** - Reviews whether chosen text/background colors are readable.
- **Student Developer** - Learns the relationship between contrast and accessibility.

## User Stories
### Frontend Developer
- As a developer, I want to highlight failing text elements so I can find the problem on the page.
- As a developer, I want to click an element and see its computed colors and contrast ratio so I can understand the underlying issue.

### Student Developer
- As a student, I want a short explanation and standard reference so I know why the issue matters.

# Requirements
---
## Functional Requirements
- **INS-01:** Provide an **Inspect** action to select a rendered text element on a supported webpage.
- **INS-02:** For supported solid-color text/background combinations, calculate the WCAG contrast ratio using the page's original computed colors (not simulation-filtered pixels).
- **INS-03:** Check standard text against **4.5:1** and qualifying large text against **3:1** (WCAG AA); report the threshold used.
- **INS-04:** Show a concise issue panel: element label/selector, foreground color, effective background color, contrast ratio, threshold, pass/fail, and plain-language explanation.
- **INS-05:** Add a non-destructive highlight around confidently failing elements; clicking an issue focuses the matching element.
- **INS-06:** Mark ambiguous cases (e.g., image/gradient backgrounds, complex transparency, pseudo-elements) as **Needs manual review** rather than claiming failure or success.
- **INS-07:** Pass a stable element reference plus verified contrast issue data to Fixer; work whether or not Simulator is enabled.

## Non-Functional Requirements
- **Performance:** Initial scan of the controlled demo page should complete within about 2 seconds; scan on demand rather than on every visual change.
- **Scalability:** Keep detection rules modular for future checks (focus, resizing, keyboard navigation), but do not implement those in the MVP.
- **Accuracy:** Do not equate a clean scan with an accessible website. Clearly distinguish measured results from uncertain cases.
- **Compatibility:** Support the controlled demo site first; unsupported layouts should fail gracefully rather than producing misleading results.

# Design
---
## UX Flow
1. Developer optionally enables a Simulator mode.
2. Developer opens **Inspector** and clicks **Scan text contrast** or selects an individual element.
3. AccessLens highlights confirmed failures and shows an issue list.
4. Developer selects an issue to locate the element and inspect its contrast details.
5. Developer clicks **Preview fix** to send that issue to Fixer.

## UI
- Inspector tab with **Scan text contrast**, issue count, and selectable issue cards.
- Compact detail view displaying color swatches, ratio, required threshold, and a **Preview fix** handoff.
- Clearly distinguish **Fail**, **Pass**, and **Needs manual review** without relying on color alone.