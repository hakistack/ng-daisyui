export type VirtualScrollerOrientation = 'vertical' | 'horizontal' | 'both';

export type VirtualScrollBehavior = 'auto' | 'smooth';

export interface VirtualScrollerLazyLoadEvent {
  readonly first: number;
  readonly rows: number;
}

export interface VirtualScrollerItemContext<T = unknown> {
  readonly $implicit: T;
  readonly index: number;
  readonly count: number;
  readonly first: boolean;
  readonly last: boolean;
  readonly even: boolean;
  readonly odd: boolean;
}

export interface VirtualScrollerLoaderContext {
  readonly index: number;
}

export interface VirtualScrollerScrollEvent {
  readonly first: number;
  readonly last: number;
}
