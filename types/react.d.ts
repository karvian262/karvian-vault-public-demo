import "react";

declare module "react" {
  /** Compatibility overload for browser API refs initialized lazily. */
  function useRef<T>(): RefObject<T | undefined>;
}
