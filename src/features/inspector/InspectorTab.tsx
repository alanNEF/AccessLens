import { useEffect, useState } from "react";
import { scanTextContrast, type ScanResult } from "./axe-runner";
import { highlightElement, clearHighlight } from "./element-highlighter";

export function InspectorTab() {
  const [issues, setIssues] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  async function handleScan() {
    setLoading(true);
    setError(null);

    try {
      const results = await scanTextContrast();
      setIssues(results);
      setHasScanned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => clearHighlight();
  }, []);

  return (
    <div>
      <h2>Text Contrast Inspector</h2>

      <button type="button" onClick={handleScan} disabled={loading}>
        {loading ? "Scanning..." : "Scan text contrast"}
      </button>

      {error && <p role="alert">Error: {error}</p>}

      {hasScanned && !error && (
        <p>{issues.length} confirmed contrast issues found.</p>
      )}

      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            <button
              type="button"
              onClick={() => highlightElement(issue.selector)}
            >
              {issue.selector}
            </button>
            <p>{issue.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
