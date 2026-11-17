import { defineTranslations, t } from '@hakistack/i18n/engine';

export const HOME = defineTranslations('home', {
  welcome: t('Welcome', { es: 'Bienvenido' }),
  farewell: t('Goodbye', { es: 'Adiós' }),
});
