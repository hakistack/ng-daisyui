function computeLPS(pattern: string): number[] {
  const lps: number[] = Array(pattern.length).fill(0);
  let length = 0;

  for (let i = 1; i < pattern.length; ) {
    if (pattern[i] === pattern[length]) {
      length++;
      lps[i++] = length;
    } else {
      if (length !== 0) {
        length = lps[length - 1];
      } else {
        lps[i++] = 0;
      }
    }
  }

  return lps;
}

export function kmpSearch(text: string, pattern: string): number[] {
  const result: number[] = [];
  if (!pattern.length || !text.length || pattern.length > text.length) return result;

  const lps = computeLPS(pattern);
  let i = 0;
  let j = 0;

  while (i < text.length) {
    if (text[i] === pattern[j]) {
      i++;
      j++;
      if (j === pattern.length) {
        result.push(i - j);
        j = lps[j - 1];
      }
    } else {
      if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
  }

  return result;
}

export function kmpSearchBool(text: string, pattern: string): boolean {
  if (!pattern.length) return true;
  const lps = computeLPS(pattern);
  let i = 0;
  let j = 0;
  while (i < text.length) {
    if (text[i] === pattern[j]) {
      i++;
      j++;
      if (j === pattern.length) return true;
    } else if (j !== 0) {
      j = lps[j - 1];
    } else {
      i++;
    }
  }
  return false;
}
