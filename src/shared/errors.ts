import type { MessageKey, TFunction } from '../i18n';
import type { ScienceErrorInfo } from './science.types';

export function describeError(t: TFunction, error: ScienceErrorInfo): string {
  const key = `errors.${error.code}` as MessageKey;
  return t(key, { file: error.file ?? '', status: error.httpStatus ?? '' });
}
