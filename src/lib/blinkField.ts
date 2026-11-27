/** Scrolls to a wrong input, focuses it and restarts its red blink (the `field-error` class). */
export function blinkField(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.classList.remove("field-error");
  void el.offsetWidth; // restart the animation
  el.classList.add("field-error");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus({ preventScroll: true });
}
