function buildBadCharTable(pattern: string): Map<string, number> {
  const table = new Map<string, number>();
  for (let i = 0; i < pattern.length; i++) {
    table.set(pattern[i], i);
  }
  return table;
}

function buildGoodSuffixTable(pattern: string): number[] {
  const m = pattern.length;
  const goodSuffix = Array(m).fill(m);
  const borderPos = Array(m + 1).fill(0);

  let i = m;
  let j = m + 1;
  borderPos[i] = j;

  while (i > 0) {
    while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
      if (goodSuffix[j] === m) {
        goodSuffix[j] = j - i;
      }
      j = borderPos[j];
    }
    i--;
    j--;
    borderPos[i] = j;
  }

  j = borderPos[0];
  for (i = 0; i <= m; i++) {
    if (goodSuffix[i] === m) {
      goodSuffix[i] = j;
    }
    if (i === j) {
      j = borderPos[j];
    }
  }

  return goodSuffix.slice(1);
}

export function boyerMooreFullSearch(text: string, pattern: string): number[] {
  const result: number[] = [];
  const m = pattern.length;
  const n = text.length;

  if (m === 0 || n === 0 || m > n) return result;

  const badCharTable = buildBadCharTable(pattern);
  const goodSuffixTable = buildGoodSuffixTable(pattern);

  let s = 0;
  while (s <= n - m) {
    let j = m - 1;

    while (j >= 0 && pattern[j] === text[s + j]) {
      j--;
    }

    if (j < 0) {
      result.push(s);
      s += goodSuffixTable[0];
    } else {
      const badCharShift = j - (badCharTable.get(text[s + j]) ?? -1);
      const goodSuffixShift = goodSuffixTable[j];
      s += Math.max(1, Math.max(badCharShift, goodSuffixShift));
    }
  }

  return result;
}
