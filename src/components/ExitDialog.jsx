import { useEffect, useRef } from "react";

/** Native modal semantics contain keyboard focus and keep the reader inert. */
export default function ExitDialog({ onCancel, onExit }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    // Focus the prompt, not Cancel: automatic button focus looked like a
    // dark selected rectangle on some Android WebViews.
    element.focus();
    return () => {
      element.close();
      previous?.focus?.({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      tabIndex={-1}
      className="exit-dialog"
      role="alertdialog"
      aria-labelledby="exit-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onCancel();
        }
      }}
    >
      <h2 id="exit-title">Exit app?</h2>
      <div className="exit-actions">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onExit}>Exit</button>
      </div>
    </dialog>
  );
}
