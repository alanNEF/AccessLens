# Overview
---
The **Simulator** lets developers experience approximate visual barriers on a live webpage through the AccessLens Chrome extension. The hackathon MVP supports three color-vision-deficiency modes (protanopia, deuteranopia, tritanopia) and adjustable low-acuity blur. Simulations are educational approximations, not representations of any individual's vision.

# Problem
---
Developers often cannot tell how color and visual clarity choices affect usability by looking at their websites normally.

**Current Pain Points**
- It is hard to notice interfaces that rely on distinguishing particular colors.
- Small or visually dense elements may become unusable when clarity is reduced.
- Existing checks rarely let developers *interact* with their own page under these conditions.

**Impact**
- Developers can encounter potential barriers before release.
- Visual accessibility becomes easier to discuss and prioritize.
- Developers can move directly from a simulation to inspecting a problem.

# User Stories
---
## User Definitions
- **Frontend Developer** - Tests a website while building or debugging it.
- **UI/UX Designer** - Evaluates visual decisions in a working interface.
- **Student Developer** - Learns how design choices can affect accessibility.

## User Stories
### Frontend Developer
- As a developer, I want to select a vision mode so I can explore my website under an approximate visual constraint.
- As a developer, I want to disable the mode instantly so I can compare it with the original appearance.

### UI/UX Designer
- As a designer, I want to adjust blur intensity so I can explore how readability changes.

# Requirements
---
## Functional Requirements
- **SIM-01:** Provide a Simulator tab with modes: Off, Protanopia, Deuteranopia, Tritanopia, and Low Acuity.
- **SIM-02:** Apply the chosen visual effect to the active supported webpage without reloading it.
- **SIM-03:** Provide an intensity slider for Low Acuity; only one simulation mode is active at a time.
- **SIM-04:** Allow switching modes and restoring the unmodified page appearance immediately.
- **SIM-05:** Keep the AccessLens controls legible and outside the visual effect; preserve ordinary page interactions where technically possible.
- **SIM-06:** Display the active mode and an explicit *approximation, not lived experience* disclaimer.
- **SIM-07:** Expose the active mode to the Inspector/Fixer without making issue-detection claims based solely on the simulation.

## Non-Functional Requirements
- **Performance:** Mode changes should feel immediate on the controlled demo site (target under 300 ms); avoid continuous expensive DOM scanning.
- **Scalability:** Implement simulations as separate presets so new modes can be added later without rewriting the controls.
- **Compatibility:** Prioritize a controlled demonstration page and ordinary top-level HTML pages in Chrome Manifest V3; restricted Chrome pages and cross-origin frames are out of scope.
- **Safety:** Do not persist changes to website source code; disabling the extension restores appearance.

# Design
---
## UX Flow
1. Developer opens a supported webpage and launches AccessLens.
2. Developer opens **Simulator** and chooses a mode.
3. The page updates in place; the developer navigates it normally.
4. For Low Acuity, the developer adjusts blur intensity.
5. Developer clicks **Off** or changes the mode, then optionally opens Inspector.

## UI
- Small extension panel with mode selector, active-mode label, blur slider (only when relevant), and **Reset** action.
- Keep the panel unaffected by visual effects and keyboard accessible.
- Show a short disclaimer below the controls.
