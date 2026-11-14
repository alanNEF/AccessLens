import { useEffect, useId, useState } from "react";
import type { ImageIssue } from "../inspector/image-runner";
import { Button } from "../../components/ui/button";

export function ImageAltFixer({
  selectedImage,
}: {
  selectedImage: ImageIssue;
}) {
  const inputId = useId();
  const [altText, setAltText] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const image = selectedImage.element;
    if (!(image instanceof HTMLImageElement)) return;

    // Remember the exact original attribute.
    const originalAlt = image.getAttribute("alt");
    let appliedAlt: string | null = null;

    setAltText("");
    setPreviewing(false);
    setMessage("");

    function restore() {
      if (appliedAlt === null) return;

      // Don't overwrite changes made by the webpage itself.
      if (image.getAttribute("alt") !== appliedAlt) return;

      if (originalAlt === null) {
        image.removeAttribute("alt");
      } else {
        image.setAttribute("alt", originalAlt);
      }

      appliedAlt = null;
    }

    // Expose cleanup to the component's buttons.
    restoreRef.current = restore;
    applyRef.current = (text: string) => {
      image.setAttribute("alt", text);
      appliedAlt = text;
    };

    return () => {
      restore();
      restoreRef.current = null;
      applyRef.current = null;
    };
  }, [selectedImage]);

  const [restoreRef] = useState<{
    current: (() => void) | null;
  }>({ current: null });

  const [applyRef] = useState<{
    current: ((text: string) => void) | null;
  }>({ current: null });

  function preview() {
    if (!selectedImage.element.isConnected) {
      setMessage("This image is no longer on the page.");
      return;
    }

    if (!altText.trim()) {
      setMessage("Please enter an image description.");
      return;
    }

    applyRef.current?.(altText.trim());
    setPreviewing(true);
    setMessage("Alt text temporarily applied.");
  }

  function revert() {
    restoreRef.current?.();
    setPreviewing(false);
    setMessage("Original alt attribute restored.");
  }

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <h3 className="font-semibold">Fix image accessibility</h3>

      <p className="text-xs text-muted-foreground">
        Selected: {selectedImage.selector}
      </p>

      <label htmlFor={inputId} className="block text-sm font-medium">
        Alternative text
      </label>

      <textarea
        id={inputId}
        value={altText}
        onChange={(event) => setAltText(event.target.value)}
        placeholder="Describe what this image communicates"
        className="w-full rounded-md border bg-background p-2 text-sm"
        rows={3}
      />

      <div className="flex gap-2">
        <Button type="button" onClick={preview}>
          Preview alt text
        </Button>

        {previewing && (
          <Button type="button" variant="outline" onClick={revert}>
            Revert
          </Button>
        )}
      </div>

      {message && <p role="status" className="text-xs">{message}</p>}
    </section>
  );
}
