"use client";

// Runs a Claude Design logic class (state + renderVals) inside a React component,
// with the same semantics as the design's dc-runtime:
//   - setState shallow-merges (object or updater fn) and accepts a post-commit callback
//   - componentDidMount / componentWillUnmount fire on mount / unmount
//   - renderVals() is recomputed on every render and is what the markup reads from
// Each screen keeps its logic in ./<screen>/logic.js, ported verbatim from the design.

import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
// The logic instance is deliberately a mutable object held in a ref and read during render:
// that is the design runtime's model (renderVals() reads this.state). It is never used
// with the React Compiler, so the compiler-oriented ref rule is off for this file only.
/* eslint-disable react-hooks/refs */
type Vals = Record<string, any>;
type Update<S> = Partial<S> | null | ((prev: S) => Partial<S> | null);

export class DCLogic<P extends Vals = Vals, S extends Vals = Vals> {
  props: P;
  state: S = {} as S;
  __host?: { set: (u: Update<S>, cb?: () => void) => void; force: () => void };
  constructor(props?: P) {
    this.props = (props ?? {}) as P;
  }
  setState(update: Update<S>, cb?: () => void) {
    this.__host?.set(update, cb);
  }
  forceUpdate() {
    this.__host?.force();
  }
  componentDidMount(): void | Promise<void> {}
  componentWillUnmount(): void {}
  renderVals(): Vals {
    return {};
  }
}

type LogicClass = new (props?: any) => DCLogic;
const noopSubscribe = () => () => {};

/**
 * @param clientOnly  render nothing until mounted (for logic that reads window/session
 *                    during render, which has no server equivalent).
 */
export function useLogic(Logic: LogicClass, props: Vals = {}, { clientOnly = false } = {}): Vals | null {
  const ref = useRef<DCLogic | null>(null);
  if (!ref.current) ref.current = new Logic(props);
  const logic = ref.current;
  logic.props = props;

  const [, bump] = useReducer((x: number) => x + 1, 0);
  const callbacks = useRef<Array<() => void>>([]);
  logic.__host = {
    set(update, cb) {
      const prev = logic.state;
      const patch = typeof update === "function" ? update(prev) : update;
      logic.state = { ...prev, ...(patch || {}) };
      if (cb) callbacks.current.push(cb);
      bump();
    },
    force: bump,
  };

  // setState callbacks run after the commit that applied them
  useEffect(() => {
    if (!callbacks.current.length) return;
    const queued = callbacks.current.splice(0);
    queued.forEach((fn) => fn());
  });

  // false on the server and during hydration, true afterwards
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useEffect(() => {
    logic.componentDidMount();
    return () => logic.componentWillUnmount();
  }, [logic]);

  if (clientOnly && !mounted) return null;
  return logic.renderVals();
}
