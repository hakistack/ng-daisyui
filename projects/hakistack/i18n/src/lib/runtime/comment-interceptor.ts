import { Injectable } from '@angular/core';
import { Translation, TranslocoInterceptor } from '@jsverse/transloco';

/**
 * Strips `<key>.comment` siblings before translations enter Transloco's store.
 *
 * Translator-context comments (added via `t('en', { es: '…' }, { comment })`)
 * are emitted into the runtime tree alongside their target keys — useful for
 * translator review in the JSON, but they must never be looked up at runtime.
 * Without this interceptor, a typo'd translate call could render comment text.
 */
@Injectable()
export class TranslocoCommentInterceptor implements TranslocoInterceptor {
  preSaveTranslation(translation: Translation): Translation {
    return stripCommentKeys(translation) as Translation;
  }

  preSaveTranslationKey(_key: string, value: string): string {
    return value;
  }
}

function stripCommentKeys(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key.endsWith('.comment')) continue;
    out[key] = stripCommentKeys(value);
  }
  return out;
}
