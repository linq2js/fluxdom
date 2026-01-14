import { Domain, ModuleDef } from "../types";

/**
 * Helper to define a module with type inference.
 */
export const module = <TModule>(
  name: string,
  create: (domain: Domain) => TModule
): ModuleDef<TModule> => ({ name, create });
