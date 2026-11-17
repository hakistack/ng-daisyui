import { Injectable } from '@angular/core';
import { Translation, TranslocoInterceptor } from '@jsverse/transloco';

/**
 * Strips translator-comment siblings before translations enter Transloco's store.
 *
 * Translator-context comments (added via `t('en', { es: '…' }, { comment })`)
 * are written into the generated JSON as a `<key>.comment` sibling of their
 * key. The registry loader never emits them; this interceptor removes them
 * when the JSON is served over HTTP.
 *
 * Transloco hands this hook the **flattened** translation, so a real key whose
 * last segment is `comment` (`post.comment`) also ends in `.comment`. The two
 * are told apart structurally: a comment sibling `x.comment` only exists next
 * to a translation `x`, while a real `post.comment` means `post` is a group and
 * therefore never a flat key itself.
 */
@Injectable()
export class TranslocoCommentInterceptor implements TranslocoInterceptor {
  preSaveTranslation(translation: Translation): Translation {
    return stripCommentKeys(translation);
  }

  preSaveTranslationKey(_key: string, value: string): string {
    return value;
  }
}

const COMMENT_SUFFIX = '.comment';

/** Exported for tests. Expects a flattened translation (what Transloco passes). */
export function stripCommentKeys(flat: Translation): Translation {
  const out: Translation = {};
  for (const [key, value] of Object.entries(flat)) {
    const commentOf = key.endsWith(COMMENT_SUFFIX) ? key.slice(0, -COMMENT_SUFFIX.length) : null;
    if (commentOf !== null && typeof flat[commentOf] === 'string') continue;
    out[key] = value;
  }
  return out;
}
