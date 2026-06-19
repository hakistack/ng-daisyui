export interface Schema {
  /** Target project in angular.json. Defaults to the first application project. */
  project?: string;
  /** Comma-separated locale ids, e.g. "en,es". The first is the source locale. */
  locales?: string;
  /** Source/required locale (defaults to the first entry in `locales`, or "en"). */
  sourceLang?: string;
  /** Skip running the package install after adding @jsverse/transloco. */
  skipInstall?: boolean;
  /** Skip adding the i18n:* npm scripts and prestart/prebuild chain. */
  skipScripts?: boolean;
  /** Skip creating the sample *.i18n.ts module + locale .d.ts. */
  skipSample?: boolean;
}
