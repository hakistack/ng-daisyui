export type Predicate<T> = (item: T) => boolean;
export type Action<T> = (item: T) => void;
export type Converter<TInput, TOutput> = (item: TInput) => TOutput;
export type Comparison<T> = (x: T, y: T) => number;

export class List<T> extends Array<T> {
  constructor(...items: T[]) {
    super(...items);
    // Required so methods like map/filter return List<T>, not Array<T>,
    // and to fix prototype chain when extending Array.
    Object.setPrototypeOf(this, List.prototype);
  }

  // ---------- Properties ----------

  /** Gets the number of elements contained in the List<T>. */
  get count(): number {
    return this.length;
  }

  // ---------- Adding / Removing ----------

  /** Adds an object to the end of the List<T>. */
  add(item: T): void {
    this.push(item);
  }

  /** Adds the elements of the specified collection to the end of the List<T>. */
  addRange(collection: Iterable<T>): void {
    for (const item of collection) {
      this.push(item);
    }
  }

  /** Inserts an element into the List<T> at the specified index. */
  insert(index: number, item: T): void {
    if (index < 0 || index > this.length) {
      throw new RangeError('Index out of range.');
    }
    this.splice(index, 0, item);
  }

  /** Inserts the elements of a collection into the List<T> at the specified index. */
  insertRange(index: number, collection: Iterable<T>): void {
    if (index < 0 || index > this.length) {
      throw new RangeError('Index out of range.');
    }
    this.splice(index, 0, ...collection);
  }

  /** Removes the first occurrence of a specific object from the List<T>. */
  remove(item: T): boolean {
    const index = this.indexOf(item);
    if (index === -1) return false;
    this.splice(index, 1);
    return true;
  }

  /** Removes the element at the specified index of the List<T>. */
  removeAt(index: number): void {
    if (index < 0 || index >= this.length) {
      throw new RangeError('Index out of range.');
    }
    this.splice(index, 1);
  }

  /** Removes a range of elements from the List<T>. */
  removeRange(index: number, count: number): void {
    if (index < 0 || count < 0 || index + count > this.length) {
      throw new RangeError('Index or count out of range.');
    }
    this.splice(index, count);
  }

  /** Removes all the elements that match the conditions defined by the predicate. */
  removeAll(predicate: Predicate<T>): number {
    let removed = 0;
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate(this[i])) {
        this.splice(i, 1);
        removed++;
      }
    }
    return removed;
  }

  /** Removes all elements from the List<T>. */
  clear(): void {
    this.length = 0;
  }

  // ---------- Searching ----------

  /** Determines whether an element is in the List<T>. */
  contains(item: T): boolean {
    return this.indexOf(item) !== -1;
  }

  // `find` and `findIndex` are inherited directly from Array<T> — re-declaring
  // them with a narrower `Predicate<T>` signature breaks structural compatibility
  // with the base type's `(value, index, array) => boolean` overloads (TS2416)
  // without adding any behavior.

  /** Retrieves all the elements that match the conditions defined by the predicate. */
  findAll(predicate: Predicate<T>): List<T> {
    const result = new List<T>();
    for (const item of this) {
      if (predicate(item)) result.add(item);
    }
    return result;
  }

  /** Searches for an element that matches the conditions, starting from the last element. */
  findLast(predicate: Predicate<T>): T | undefined {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate(this[i])) return this[i];
    }
    return undefined;
  }

  /** Returns the zero-based index of the last occurrence matching the predicate. */
  findLastIndex(predicate: Predicate<T>): number {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate(this[i])) return i;
    }
    return -1;
  }

  /** Determines whether the List<T> contains elements that match the predicate. */
  exists(predicate: Predicate<T>): boolean {
    return this.some(predicate);
  }

  /** Determines whether every element matches the conditions defined by the predicate. */
  trueForAll(predicate: Predicate<T>): boolean {
    return this.every(predicate);
  }

  // ---------- Iteration / Transformation ----------

  // `forEach` is inherited directly from Array<T> — re-declaring it with a
  // narrower `Action<T>` signature conflicts with the base's `(value, index,
  // array) => void` shape (TS2416). Callers can still pass single-arg
  // callbacks; Array's signature simply allows the extra parameters too.

  /** Converts the elements in the current List<T> to another type. */
  convertAll<TOutput>(converter: Converter<T, TOutput>): List<TOutput> {
    const result = new List<TOutput>();
    for (const item of this) {
      result.add(converter(item));
    }
    return result;
  }

  // ---------- Range / Copy ----------

  /** Creates a shallow copy of a range of elements in the source List<T>. */
  getRange(index: number, count: number): List<T> {
    if (index < 0 || count < 0 || index + count > this.length) {
      throw new RangeError('Index or count out of range.');
    }
    const result = new List<T>();
    for (let i = index; i < index + count; i++) {
      result.add(this[i]);
    }
    return result;
  }

  /** Copies the entire List<T> to a compatible one-dimensional array. */
  toArray(): T[] {
    return [...this];
  }

  // ---------- Ordering ----------

  /** Sorts the elements in the entire List<T> using the specified comparison. */
  override sort(comparison?: Comparison<T>): this {
    return super.sort(comparison);
  }

  /** Reverses the order of the elements in the List<T>. */
  override reverse(): this {
    // Array's lib type declares `reverse(): T[]`, but at runtime it always
    // returns the receiver — so the cast is sound and lets callers chain
    // off `List<T>`-specific methods.
    return super.reverse() as this;
  }
}
