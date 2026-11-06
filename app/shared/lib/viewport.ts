/** How much room a list has: tables drop columns on narrow screens. */
export type Width = "wide" | "narrow" | "phone";

export interface Viewport {
  width: Width;
}

/**
 * Keeps viewport.width in step with the screen: narrow under 48rem, phone
 * under 30rem. Start it in oninsert; it returns the release for onremove.
 */
export function watchWidth(viewport: Viewport): () => void {
  let narrow = matchMedia("(max-width: 48rem)");
  let phone = matchMedia("(max-width: 30rem)");
  let update = () => viewport.width = phone.matches ? "phone" : narrow.matches ? "narrow" : "wide";

  update();
  narrow.addEventListener("change", update);
  phone.addEventListener("change", update);

  return () => {
    narrow.removeEventListener("change", update);
    phone.removeEventListener("change", update);
  };
}
