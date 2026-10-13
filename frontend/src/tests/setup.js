import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement native modal opening/focus management. Browser QA
// separately verifies the real <dialog>; tests still exercise its controls.
Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  configurable: true,
  value() {
    this.setAttribute("open", "");
  },
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
  configurable: true,
  value() {
    this.removeAttribute("open");
  },
});

afterEach(cleanup);
