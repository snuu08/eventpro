import type { MapAdapter } from "./types";

export function createImageMapAdapter(imageUrl: string): MapAdapter {
  let node: HTMLElement | undefined;
  return {
    kind: "image",
    async mount(el) {
      node = el;
      el.style.backgroundImage = `url("${imageUrl}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    },
    destroy() {
      if (node) {
        node.style.backgroundImage = "";
      }
      node = undefined;
    },
  };
}
