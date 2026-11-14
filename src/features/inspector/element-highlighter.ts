let highlightedElement: HTMLElement | null = null;
let originalOutline = "";
let originalOutlineOffset = "";

export function highlightElement(selector: string): boolean {
  clearHighlight();

  let element: HTMLElement | null;

  try {
    element = document.querySelector<HTMLElement>(selector);
  } catch {
    return false;
  }

  if (!element) return false;

  highlightedElement = element;
  originalOutline = element.style.outline;
  originalOutlineOffset = element.style.outlineOffset;

  element.style.outline = "3px solid #ff9800";
  element.style.outlineOffset = "3px";

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  return true;
}

export function clearHighlight(): void {
  if (!highlightedElement) return;

  highlightedElement.style.outline = originalOutline;
  highlightedElement.style.outlineOffset = originalOutlineOffset;
  highlightedElement = null;
}
