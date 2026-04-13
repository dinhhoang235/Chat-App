import { LogBox } from "react-native";
import { registerGlobals } from "@livekit/react-native-webrtc";

// 1. Hide from on-screen LogBox
LogBox.ignoreLogs([
  "An event listener wasn't added because it has been added already",
]);

// 2. Hide from Terminal (Total suppression)
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] &&
    typeof args[0] === "string" &&
    (args[0].includes("An event listener wasn't added because it has been added already") ||
     args[0].includes("PC manager is closed"))
  ) {
    return;
  }
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (
    args[0] &&
    typeof args[0] === "string" &&
    (args[0].includes("PC manager is closed") ||
     args[0].includes("Can't perform a React state update"))
  ) {
    return;
  }
  originalError(...args);
};

export function ensureReactNativeWebRTCGlobals() {
  if (typeof globalThis.navigator !== "object") {
    (globalThis as any).navigator = {
      product: "ReactNative",
      userAgent: "ReactNative",
    };
  } else {
    const nav = globalThis.navigator as any;
    if (!nav.product) {
      nav.product = "ReactNative";
    }
    if (!nav.userAgent) {
      nav.userAgent = "ReactNative";
    }
  }
  registerGlobals();

  // Polyfills for LiveKit requirement
  if (typeof (globalThis as any).Event === "undefined") {
    (globalThis as any).Event = class Event {
      type: string;
      bubbles: boolean = false;
      cancelable: boolean = false;
      constructor(type: string, options?: { bubbles?: boolean, cancelable?: boolean }) {
        this.type = type;
        if (options) {
          this.bubbles = !!options.bubbles;
          this.cancelable = !!options.cancelable;
        }
      }
      stopPropagation() {}
      stopImmediatePropagation() {}
      preventDefault() {}
    };
  }

  if (typeof (globalThis as any).CustomEvent === "undefined") {
    (globalThis as any).CustomEvent = class CustomEvent extends (globalThis as any).Event {
      detail: any;
      constructor(type: string, options?: { detail?: any, bubbles?: boolean, cancelable?: boolean }) {
        super(type, options);
        this.detail = options?.detail;
      }
    };
  }

  // AbortController polyfill if not present
  if (typeof (globalThis as any).AbortController === "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AbortController: AC, AbortSignal: AS } = require("abort-controller");
      (globalThis as any).AbortController = AC;
      if (typeof (globalThis as any).AbortSignal === "undefined") {
        (globalThis as any).AbortSignal = AS;
      }
    } catch {
      console.warn("Could not polyfill AbortController/AbortSignal from 'abort-controller' package");
    }
  }

  if (typeof (globalThis as any).DOMException === "undefined") {
    (globalThis as any).DOMException = class DOMException extends Error {
      name = "DOMException";
      constructor(message?: string, name?: string) {
        super(message);
        this.name = name || "DOMException";
      }
    };
  }
}

// Auto-run on import
ensureReactNativeWebRTCGlobals();
