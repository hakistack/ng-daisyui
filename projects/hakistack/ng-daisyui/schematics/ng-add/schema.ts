export type Toolchain = 'v5' | 'v4-legacy';

export interface Schema {
  target?: Toolchain;
  project?: string;
  skipInstall?: boolean;
  skipStyleImport?: boolean;
}
