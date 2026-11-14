import axe from "axe-core";

export interface ScanResult {
  id: string;
  selector: string;
  description: string;
  impact: string;
  html: string;
}

export async function scanTextContrast(): Promise<ScanResult[]> {
  const results = await axe.run(document, {
    runOnly: {
      type: "rule",
      values: ["color-contrast"],
    },
  });

  console.log("AccessLens axe results:", {
  violations: results.violations,
  incomplete: results.incomplete,
  passes: results.passes,
  inapplicable: results.inapplicable,
  });

  return results.violations.flatMap((violation) =>
    violation.nodes.map((node, index) => ({
      id: `${violation.id}-${index}`,
      selector: node.target.join(", "),
      description: node.failureSummary ?? violation.description,
      impact: node.impact ?? "unknown",
      html: node.html,
    }))
  );
}

