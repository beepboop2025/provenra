// Minimal ambient types for Node 24's experimental built-in SQLite module.
// `node:sqlite` ships no bundled TypeScript declarations yet, so typecheck
// fails to resolve it without this shim. Covers only the surface we use.
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean });
    exec(sql: string): void;
    prepare(sql: string): {
      run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
      get(...params: unknown[]): unknown;
      all(...params: unknown[]): unknown[];
    };
    close(): void;
  }
}
