/**
 * Phase 0 only: Machado, Oliveira & Fernandes (2009), severity 1 protanopia.
 * https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
 * RGB rows from the authors' table; alpha is preserved. The published model
 * operates in linear RGB. This spike deliberately applies the matrix in sRGB
 * to test SVG compositing, so it is a rendering approximation, not a validated
 * implementation of the paper. Revisit color-space fidelity in Phase 1.
 */
export const PROTANOPIA_MATRIX = `
  0.152286 1.052583 -0.204868 0 0
  0.114503 0.786281 0.099216 0 0
  -0.003882 -0.048116 1.051998 0 0
  0 0 0 1 0
`;
