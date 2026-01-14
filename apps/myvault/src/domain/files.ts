import { domain } from "fluxdom";
import { produce } from "immer";
import type { FileEntry } from "../types";
import { Storage } from "../storage/db";

const filesDomain = domain("files");

export interface FilesState {
  items: FileEntry[];
  currentFolderId: string | null;
  viewMode: "list" | "grid";
  isLoading: boolean;
  error: string | null;
}

const initialState: FilesState = {
  items: [],
  currentFolderId: null,
  viewMode: "grid",
  isLoading: false,
  error: null,
};

export const filesModel = filesDomain.model({
  name: "files",
  initial: initialState,
  actions: (_ctx) => ({
    setLoading: produce((draft: FilesState, loading: boolean) => {
      draft.isLoading = loading;
    }),
    setItems: produce((draft: FilesState, items: FileEntry[]) => {
      draft.items = items;
      draft.isLoading = false;
    }),
    setFolder: produce((draft: FilesState, folderId: string | null) => {
      draft.currentFolderId = folderId;
    }),
    addItem: produce((draft: FilesState, item: FileEntry) => {
      draft.items.push(item);
    }),
    removeItem: produce((draft: FilesState, id: string) => {
      draft.items = draft.items.filter((i) => i.id !== id);
    }),
    toggleView: produce((draft: FilesState) => {
      draft.viewMode = draft.viewMode === "grid" ? "list" : "grid";
    }),
    setError: produce((draft: FilesState, error: string) => {
      draft.error = error;
      draft.isLoading = false;
    }),
  }),
  thunks: ({ actions, dispatch, getState }) => ({
    loadFiles: async (folderId: string | null) => {
      dispatch(actions.setLoading(true));
      dispatch(actions.setFolder(folderId));
      try {
        const all = await Storage.getAllMetadata();
        const filtered = all.filter((f) => f.parentId === folderId);
        dispatch(actions.setItems(filtered));
      } catch (e: any) {
        dispatch(actions.setError(e.message));
      }
    },

    createFolder: async (name: string) => {
      const state = getState();
      const parentId = state.currentFolderId;
      const entry: FileEntry = {
        id: crypto.randomUUID(),
        name,
        type: "folder",
        size: 0,
        parentId,
        created: Date.now(),
        modified: Date.now(),
        isFolder: true,
      };
      await Storage.saveFile(entry, new ArrayBuffer(0));
      dispatch(actions.addItem(entry));
    },

    addFile: async (file: File) => {
      const state = getState();
      const parentId = state.currentFolderId;
      const arrayBuffer = await file.arrayBuffer();

      const entry: FileEntry = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        parentId,
        created: Date.now(),
        modified: file.lastModified,
        isFolder: false,
      };

      await Storage.saveFile(entry, arrayBuffer);
      dispatch(actions.addItem(entry));
    },

    deleteFile: async (id: string) => {
      await Storage.deleteFile(id);
      dispatch(actions.removeItem(id));
    },

    toggleViewMode: () => {
      dispatch(actions.toggleView());
    },
  }),
});
