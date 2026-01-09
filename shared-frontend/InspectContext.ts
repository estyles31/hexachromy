import { createContext, useContext } from "react";

export default interface InspectContext<S> {
  id: string;
  title?: string;
  kind: string;
  data?: S;
}

export type InspectFn = (ctx: InspectContext<unknown> | null) => void;

export const InspectContextReact = createContext<InspectFn | null>(null);

export function useInspect(): InspectFn {
  const ctx = useContext(InspectContextReact);
  if (!ctx) {
    throw new Error("useInspect must be used inside InspectContextReact.Provider");
  }
  return ctx;
}
