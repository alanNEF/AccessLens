
import axe from "axe-core";

export interface ImageIssue {
  id: string;
  selector: string;
  element: Element;
  description: string;
}

export async function scanImageAccessibility(
  exclude: Element
): Promise<ImageIssue[]> {
  const results = await axe.run(
    {
      include: [document.documentElement],
      exclude: [exclude],
    },
    {
      runOnly: {
        type: "rule",
        values: ["image-alt"],
      },
      elementRef: true,
    }
  );

  const issues: ImageIssue[] = [];

  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      if (!node.element) continue;

      issues.push({
        id: `image-${issues.length}`,
        selector: node.target.flat().join(" "),
        element: node.element,
        description:
            "This image is missing alternative text. Screen reader users may not be able to understand its content.",
      });
    }
  }

  return issues;
}
