/** Interruptible strip motion. Environment is injected for deterministic gesture tests. */
export function createReaderSlider({
  element,
  commit,
  scrollY,
  reducedMotion,
  translateX,
}) {
  let committing = false;
  let offset = 0,
    origin = 0,
    active = null;
  function reset() {
    if (committing) return;
    const previous = active;
    active = null;
    previous?.motion.cancel();
    offset = origin = 0;
    const track = element();
    track?.style.removeProperty("transform");
    track
      ?.querySelectorAll(".reader-panel")
      .forEach((panel) => panel.style.removeProperty("translate"));
  }
  function paint() {
    element()?.style.setProperty("transform", `translate3d(${offset}px,0,0)`);
  }
  function prepare() {
    let track = element();
    if (!track) return false;
    if (active) {
      // Rebase onto the accepted destination without moving the visible strip.
      // Old completion promises must never commit a second navigation.
      const previous = active;
      const visible = translateX(track);
      const width = track.clientWidth;
      active = null;
      committing = true;
      try {
        if (previous.direction) commit(previous.direction);
      } finally {
        committing = false;
      }
      previous.motion.cancel();
      offset = visible + previous.direction * width;
      paint();
      track = element();
      if (!track) return false;
    }
    track
      .querySelectorAll(".reader-panel")
      .forEach((panel) => panel.style.removeProperty("translate"));
    origin = offset;
    // Translation preserves the exact source padding and document scroll extent.
    track
      .querySelectorAll('[data-current="false"]')
      .forEach((panel) =>
        panel.style.setProperty("translate", `0 ${scrollY()}px`),
      );
    return true;
  }
  function drag(dx) {
    const track = element();
    if (!track || active) return;
    offset = Math.max(
      -track.clientWidth,
      Math.min(track.clientWidth, origin + dx),
    );
    paint();
  }
  function slide(direction, velocity = 0) {
    if (!prepare()) return;
    const track = element();
    const target = -direction * track.clientWidth;
    const distance = Math.abs(target - offset);
    if (reducedMotion() || distance < 1) {
      reset();
      if (direction) commit(direction);
      return;
    }
    const motion = track.animate(
      [
        { transform: `translate3d(${offset}px,0,0)` },
        { transform: `translate3d(${target}px,0,0)` },
      ],
      {
        duration: Math.max(
          70,
          Math.min(
            direction ? 180 : 120,
            distance / Math.max(2.5, Math.abs(velocity)),
          ),
        ),
        easing: "cubic-bezier(.2,.7,.2,1)",
        fill: "forwards",
      },
    );
    const pending = { motion, direction };
    active = pending;
    motion.finished
      .then(() => {
        if (active !== pending) return;
        active = null;
        // Keep the final frame held while React adopts the incoming page.
        committing = true;
        try {
          if (direction) commit(direction);
        } finally {
          committing = false;
        }
        motion.cancel();
        reset();
      })
      .catch(() => {});
  }
  return { prepare, drag, slide, reset };
}
