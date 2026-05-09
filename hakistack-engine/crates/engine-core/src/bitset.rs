//! Compact bitset over `Vec<u64>`.
//!
//! Used for visibility / selection / filter masks. Operations are bulk-AND /
//! bulk-OR over `u64` words, which the compiler vectorizes on x86_64 and aarch64.

use crate::Idx;

#[derive(Debug, Clone)]
pub struct Bitset {
    words: Vec<u64>,
    len:   u32,
}

impl Bitset {
    pub fn with_capacity(n: u32) -> Self {
        let n_words = (n as usize).div_ceil(64);
        Self {
            words: vec![0u64; n_words],
            len:   n,
        }
    }

    pub fn len(&self) -> u32 {
        self.len
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    pub fn set(&mut self, i: Idx) {
        debug_assert!(i < self.len);
        let (w, b) = ((i / 64) as usize, i % 64);
        self.words[w] |= 1u64 << b;
    }

    pub fn unset(&mut self, i: Idx) {
        debug_assert!(i < self.len);
        let (w, b) = ((i / 64) as usize, i % 64);
        self.words[w] &= !(1u64 << b);
    }

    pub fn get(&self, i: Idx) -> bool {
        debug_assert!(i < self.len);
        let (w, b) = ((i / 64) as usize, i % 64);
        (self.words[w] >> b) & 1 == 1
    }

    pub fn fill(&mut self) {
        for w in &mut self.words {
            *w = !0;
        }
        // mask off the trailing bits past `len` so `count_ones` stays accurate
        let extra = self.words.len() * 64 - self.len as usize;
        if extra > 0 {
            let last = self.words.len() - 1;
            self.words[last] &= !0 >> extra;
        }
    }

    pub fn clear(&mut self) {
        for w in &mut self.words {
            *w = 0;
        }
    }

    pub fn and_with(&mut self, other: &Bitset) {
        debug_assert_eq!(self.len, other.len);
        for (a, b) in self.words.iter_mut().zip(other.words.iter()) {
            *a &= *b;
        }
    }

    pub fn or_with(&mut self, other: &Bitset) {
        debug_assert_eq!(self.len, other.len);
        for (a, b) in self.words.iter_mut().zip(other.words.iter()) {
            *a |= *b;
        }
    }

    pub fn count_ones(&self) -> u32 {
        self.words.iter().map(|w| w.count_ones()).sum()
    }

    /// Iterate set bit indices in ascending order. Allocation-free.
    pub fn iter(&self) -> impl Iterator<Item = Idx> + '_ {
        self.words.iter().enumerate().flat_map(|(wi, &word)| {
            let mut w = word;
            std::iter::from_fn(move || {
                if w == 0 {
                    None
                } else {
                    let b = w.trailing_zeros();
                    w &= w - 1;
                    Some((wi as u32) * 64 + b)
                }
            })
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_get_count() {
        let mut b = Bitset::with_capacity(200);
        b.set(0);
        b.set(63);
        b.set(64);
        b.set(199);
        assert!(b.get(0));
        assert!(b.get(63));
        assert!(b.get(64));
        assert!(b.get(199));
        assert!(!b.get(1));
        assert_eq!(b.count_ones(), 4);
    }

    #[test]
    fn iter_yields_ascending() {
        let mut b = Bitset::with_capacity(128);
        for i in [3, 0, 64, 127, 31] {
            b.set(i);
        }
        let collected: Vec<_> = b.iter().collect();
        assert_eq!(collected, vec![0, 3, 31, 64, 127]);
    }

    #[test]
    fn and_or_combine() {
        let mut a = Bitset::with_capacity(64);
        let mut b = Bitset::with_capacity(64);
        a.set(1); a.set(2); a.set(3);
        b.set(2); b.set(3); b.set(4);

        let mut and = a.clone();
        and.and_with(&b);
        assert_eq!(and.iter().collect::<Vec<_>>(), vec![2, 3]);

        let mut or = a;
        or.or_with(&b);
        assert_eq!(or.iter().collect::<Vec<_>>(), vec![1, 2, 3, 4]);
    }

    #[test]
    fn fill_then_count() {
        let mut b = Bitset::with_capacity(100);
        b.fill();
        assert_eq!(b.count_ones(), 100);
    }
}
