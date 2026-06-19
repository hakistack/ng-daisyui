import { DocumentSerializerRegistration } from '../document-editor.types';
import { serializeText } from './text.serializer';

export { serializeText } from './text.serializer';

/** Library serializers, searched after any user-registered ones. */
export const BUILT_IN_SERIALIZERS: readonly DocumentSerializerRegistration[] = [{ formats: ['text'], serialize: serializeText }];
