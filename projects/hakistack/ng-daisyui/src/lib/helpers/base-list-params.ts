import { HttpParams } from '@angular/common/http';

/**
 * Build `HttpParams` for offset-based pagination.
 *
 * @deprecated Use `getOffsetHttpParams()` from `pagination.helper` instead.
 */
export function getBaseListParams(limit: number, offset: number): HttpParams {
  let params = new HttpParams();

  if (limit) {
    params = params.append('limit', limit.toString());
  }
  if (offset) {
    params = params.append('offset', offset.toString());
  }

  return params;
}

/**
 * Build `HttpParams` for cursor-based pagination.
 *
 * @deprecated Use `getCursorHttpParams()` from `pagination.helper` instead.
 */
export function getBaseCursorParams(cursor: string | null, pageSize: number, sortField: string, sortDirection: 'Ascending' | 'Descending' | string): HttpParams {
  let params = new HttpParams();

  if (cursor) {
    params = params.append('cursor', cursor);
  }
  if (pageSize) {
    params = params.append('pageSize', pageSize.toString());
  }
  if (sortField) {
    params = params.append('sortField', sortField.toLocaleLowerCase());
  }
  if (sortDirection) {
    params = params.append('sortDirection', sortDirection.toLocaleLowerCase());
  }

  return params;
}
