export interface FileEntry {
  id: string; // UUID
  name: string;
  type: string; // MIME type
  size: number;
  encryptedSize?: number;
  parentId: string | null; // null for root
  created: number; // timestamp
  modified: number; // timestamp
  encryptionKey?: string; // Encrypted file-specific key (for Level 3)
  iv?: string; // Initialization vector
  checksum?: string;
  isFolder: boolean;
  content?: Blob | ArrayBuffer; // For runtime handling, not always stored in 'metadata' store if separated
}

export type SecurityLevel = "basic" | "passcode" | "encrypted";

export interface VaultMetadata {
  version: string;
  created: number;
  securityLevel: SecurityLevel;
  salt?: string; // For PBKDF2
  masterKeyWrapped?: string; // Encrypted master key
  iterations?: number;
}
