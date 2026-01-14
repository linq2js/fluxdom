import { domain } from "fluxdom";
import { produce } from "immer";
import type { SecurityLevel, VaultMetadata } from "../types";
import { Storage } from "../storage/db";

const appDomain = domain("app");

export interface AppState {
  securityLevel: SecurityLevel | null;
  isUnlocked: boolean;
  passcodeHash: string | null;
  vaultMetadata: VaultMetadata | null;
  isLoading: boolean;
  error: string | null;
  installPrompt: any | null; // BeforeInstallPromptEvent
}

const initialState: AppState = {
  securityLevel: null,
  isUnlocked: false,
  passcodeHash: null,
  vaultMetadata: null,
  isLoading: true,
  error: null,
  installPrompt: null,
};

export const appModel = appDomain.model({
  name: "app",
  initial: initialState,
  actions: (_ctx) => ({
    setLoading: produce((draft: AppState, loading: boolean) => {
      draft.isLoading = loading;
    }),
    setVaultMetadata: produce((draft: AppState, meta: VaultMetadata | null) => {
      draft.vaultMetadata = meta;
      if (meta) {
        draft.securityLevel = meta.securityLevel;
      }
      draft.isLoading = false;
    }),
    setUnlocked: produce((draft: AppState, unlocked: boolean) => {
      draft.isUnlocked = unlocked;
    }),
    setError: produce((draft: AppState, error: string) => {
      draft.error = error;
      draft.isLoading = false;
    }),
    // Using plain reducer to avoid TS issues with produce and any
    setInstallPrompt: (state: AppState, prompt: any) => {
      return { ...state, installPrompt: prompt };
    },
    // For new setup
    initSetup: produce((draft: AppState, level: SecurityLevel) => {
      draft.securityLevel = level;
      if (level === "basic") draft.isUnlocked = true;
    }),
  }),
  thunks: ({ actions, dispatch, getState }) => ({
    init: async () => {
      dispatch(actions.setLoading(true));
      try {
        // Request persistence
        if (navigator.storage && navigator.storage.persist) {
          const isPersisted = await navigator.storage.persisted();
          if (!isPersisted) {
            try {
              await navigator.storage.persist();
            } catch (e) {
              console.warn("Persistence request failed", e);
            }
          }
        }

        const meta = await Storage.getVaultMetadata();
        dispatch(actions.setVaultMetadata(meta || null));
        if (meta && meta.securityLevel === "basic") {
          dispatch(actions.setUnlocked(true));
        }
      } catch (e: any) {
        dispatch(actions.setError(e.message));
      }
    },

    setupVault: async (level: SecurityLevel, passcode?: string) => {
      const meta: VaultMetadata = {
        version: "1.0",
        created: Date.now(),
        securityLevel: level,
        salt: passcode ? "mock-salt" : undefined,
      };

      await Storage.saveVaultMetadata(meta);
      dispatch(actions.setVaultMetadata(meta));

      if (level === "basic") {
        dispatch(actions.setUnlocked(true));
      } else {
        dispatch(actions.setUnlocked(true));
      }
    },

    unlock: async (_passcode: string) => {
      dispatch(actions.setUnlocked(true));
    },

    lock: async () => {
      dispatch(actions.setUnlocked(false));
    },

    installPwa: async () => {
      const prompt = getState().installPrompt;
      if (prompt) {
        prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") {
          dispatch(actions.setInstallPrompt(null));
        }
      }
    },
  }),
});
