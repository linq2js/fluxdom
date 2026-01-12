import { Action, Domain, ModuleDef } from "../types";

/**
 * Helper to define a module with type inference.
 */
export const module = <TModule, TAction extends Action = any>(
  name: string,
  create: (domain: Domain<TAction>) => TModule
): ModuleDef<TModule, TAction> => ({ name, create });
