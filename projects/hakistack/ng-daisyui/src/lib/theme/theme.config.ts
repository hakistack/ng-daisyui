import { InjectionToken, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';

export type HkThemeId = 'daisyui-v5' | 'daisyui-v4';

export interface HkThemeConfig {
  readonly id: HkThemeId;
  readonly classes: {
    readonly tabsLift: string;
    readonly tabsBox: string;
    readonly tabsBorder: string;
    readonly menuActive: string;
    readonly cardBorder: string;
  };
}

const DAISYUI_V5 = {
  id: 'daisyui-v5',
  classes: {
    tabsLift: 'tabs-lift',
    tabsBox: 'tabs-box',
    tabsBorder: 'tabs-border',
    menuActive: 'menu-active',
    cardBorder: 'card-border',
  },
} as const satisfies HkThemeConfig;

const DAISYUI_V4 = {
  id: 'daisyui-v4',
  classes: {
    tabsLift: 'tabs-lifted',
    tabsBox: 'tabs-boxed',
    tabsBorder: 'tabs-bordered',
    menuActive: 'active',
    cardBorder: 'border border-base-300',
  },
} as const satisfies HkThemeConfig;

const THEME_MAP: Record<HkThemeId, HkThemeConfig> = {
  'daisyui-v5': DAISYUI_V5,
  'daisyui-v4': DAISYUI_V4,
};

export const HK_THEME = new InjectionToken<HkThemeConfig>('HK_THEME', {
  providedIn: 'root',
  factory: () => DAISYUI_V5,
});

export function provideHkTheme(themeId: HkThemeId): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: HK_THEME, useValue: THEME_MAP[themeId] }]);
}
