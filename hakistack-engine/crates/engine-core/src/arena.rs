//! Tree arena.
//!
//! Stores hierarchies as parallel `Vec`s: parent pointer, first-child pointer,
//! next-sibling pointer. Iterative DFS replaces JS recursion. Euler-tour entry
//! and exit indices give O(1) descendant tests.

use crate::Idx;

const NONE: i32 = -1;

#[derive(Debug, Clone)]
pub struct TreeArena {
    pub parent_of:    Vec<i32>,
    pub first_child:  Vec<i32>,
    pub next_sibling: Vec<i32>,
    pub depth_of:     Vec<u8>,
    pub entry_order:  Vec<u32>,
    pub exit_order:   Vec<u32>,
}

impl TreeArena {
    pub fn with_capacity(n: usize) -> Self {
        Self {
            parent_of:    Vec::with_capacity(n),
            first_child:  Vec::with_capacity(n),
            next_sibling: Vec::with_capacity(n),
            depth_of:     Vec::with_capacity(n),
            entry_order:  Vec::with_capacity(n),
            exit_order:   Vec::with_capacity(n),
        }
    }

    /// Reconstruct a tree from a flat **DFS preorder** depth sequence.
    ///
    /// `depths[i]` is the depth (0 = root) of the i-th node, in the order a
    /// depth-first preorder traversal would visit it. Three passes:
    ///
    /// 1. **Parent / depth.** A stack of "last node at each depth" gives
    ///    each node its parent in O(1) per node.
    /// 2. **First-child / next-sibling.** Iterate parents; the first time a
    ///    parent appears in `parent_of`, set its first_child; subsequent
    ///    children link via `next_sibling`.
    /// 3. **Euler tour.** Iterative DFS over the now-built structure
    ///    assigning entry/exit timestamps for O(1) descendant tests.
    ///
    /// Returns an error string when `depths[0] != 0` (must start with a root)
    /// or the sequence jumps more than one level in a single step (e.g.
    /// `[0, 2]`). Returning rather than panicking matters at the WASM
    /// boundary — a Rust panic surfaces in JS as an opaque
    /// "RuntimeError: unreachable executed" with no context.
    pub fn from_dfs_depths(depths: &[u8]) -> Result<Self, &'static str> {
        let n = depths.len();
        if n == 0 {
            return Ok(Self::with_capacity(0));
        }
        if depths[0] != 0 {
            return Err("first node must be a root (depth 0)");
        }

        let mut arena = Self::with_capacity(n);
        arena.parent_of.resize(n, NONE);
        arena.first_child.resize(n, NONE);
        arena.next_sibling.resize(n, NONE);
        arena.depth_of.resize(n, 0);
        arena.entry_order.resize(n, 0);
        arena.exit_order.resize(n, 0);

        // Pass 1: parent_of, depth_of.
        let mut stack: Vec<i32> = Vec::with_capacity(n);
        for (i, &d) in depths.iter().enumerate() {
            if d as usize > stack.len() {
                return Err("depth sequence jumps more than one level in a single step");
            }
            stack.truncate(d as usize);
            arena.parent_of[i] = if stack.is_empty() { NONE } else { *stack.last().unwrap() };
            arena.depth_of[i] = d;
            stack.push(i as i32);
        }

        // Pass 2: first_child, next_sibling. Walk parents in reverse so the
        // first child encountered (lowest index) ends up linked from
        // first_child, with later children chained via next_sibling.
        for i in (0..n).rev() {
            let parent = arena.parent_of[i];
            if parent == NONE { continue; }
            let p = parent as usize;
            arena.next_sibling[i] = arena.first_child[p];
            arena.first_child[p] = i as i32;
        }

        // Pass 3: Euler tour entry/exit timestamps via iterative DFS.
        //
        // Encoding to avoid a 2-variant `Step` enum + per-node `Vec<Step>`:
        // pack the Enter/Exit flag into the value itself. Non-negative i32
        // means "Enter that node"; XOR-with-MIN_INT (i.e. flip the sign
        // bit) means "Exit". The Exit decoding is `v ^ i32::MIN`, which is
        // also self-inverse — same op encodes and decodes.
        //
        // The other dealloc win: child pushes use the next_sibling chain
        // twice (push in order, then `work[start..].reverse()`), instead of
        // allocating a per-node `Vec<i32>` and calling `into_iter().rev()`.
        // For a 10k-node tree that's ~10k heap allocations eliminated.
        let mut work: Vec<i32> = Vec::with_capacity(n);
        for i in (0..n as i32).rev() {
            if arena.parent_of[i as usize] == NONE {
                work.push(i);
            }
        }
        let mut counter: u32 = 0;
        while let Some(packed) = work.pop() {
            if packed < 0 {
                // Exit: decode back to the node index.
                let node = (packed ^ i32::MIN) as usize;
                arena.exit_order[node] = counter;
                counter += 1;
                continue;
            }
            // Enter
            let node = packed as usize;
            arena.entry_order[node] = counter;
            counter += 1;
            work.push(packed ^ i32::MIN); // queue Exit
            let start = work.len();
            let mut c = arena.first_child[node];
            while c != NONE {
                work.push(c);
                c = arena.next_sibling[c as usize];
            }
            // Reverse the just-pushed children so the leftmost pops first.
            work[start..].reverse();
        }

        Ok(arena)
    }

    pub fn len(&self) -> usize {
        self.parent_of.len()
    }

    pub fn is_empty(&self) -> bool {
        self.parent_of.is_empty()
    }

    /// O(1) descendant test using Euler-tour intervals.
    /// Returns true iff `candidate` is in the subtree rooted at `root`.
    pub fn is_descendant(&self, root: Idx, candidate: Idx) -> bool {
        let r = root as usize;
        let c = candidate as usize;
        let r_in  = self.entry_order[r];
        let r_out = self.exit_order[r];
        let c_in  = self.entry_order[c];
        r_in < c_in && c_in < r_out
    }

    /// Iterative depth-first walk. Calls `visit(node)` on each node in
    /// preorder. Avoids JS-style recursion.
    ///
    /// Allocation-free per node: children are pushed in source order, then
    /// the just-pushed sub-slice is reversed in place so the leftmost child
    /// pops first. No `Vec<i32>` allocated per node.
    pub fn dfs<F: FnMut(Idx)>(&self, root: Idx, mut visit: F) {
        let mut stack: Vec<i32> = vec![root as i32];
        while let Some(top) = stack.pop() {
            if top == NONE { continue; }
            visit(top as Idx);
            let start = stack.len();
            let mut child = self.first_child[top as usize];
            while child != NONE {
                stack.push(child);
                child = self.next_sibling[child as usize];
            }
            stack[start..].reverse();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Hand-built 3-node tree: 0 (root) → [1, 2]
    fn tiny() -> TreeArena {
        TreeArena {
            parent_of:    vec![-1, 0, 0],
            first_child:  vec![1, -1, -1],
            next_sibling: vec![-1, 2, -1],
            depth_of:     vec![0, 1, 1],
            entry_order:  vec![0, 1, 3],
            exit_order:   vec![6, 2, 4],
        }
    }

    #[test]
    fn descendant_relations() {
        let t = tiny();
        assert!(t.is_descendant(0, 1));
        assert!(t.is_descendant(0, 2));
        assert!(!t.is_descendant(1, 2));
        assert!(!t.is_descendant(2, 1));
        assert!(!t.is_descendant(0, 0)); // a node is not its own descendant
    }

    #[test]
    fn dfs_preorder() {
        let t = tiny();
        let mut visited = Vec::new();
        t.dfs(0, |n| visited.push(n));
        assert_eq!(visited, vec![0, 1, 2]);
    }

    // ── from_dfs_depths ─────────────────────────────────────────────────

    #[test]
    fn from_dfs_depths_round_trips_simple_tree() {
        // Tree: 0 → [1, 2]
        let t = TreeArena::from_dfs_depths(&[0, 1, 1]).unwrap();
        assert_eq!(t.parent_of,    vec![-1, 0, 0]);
        assert_eq!(t.first_child,  vec![1, -1, -1]);
        assert_eq!(t.next_sibling, vec![-1, 2, -1]);
        assert_eq!(t.depth_of,     vec![0, 1, 1]);
        // Descendant tests should agree with the hand-built tiny() arena.
        assert!(t.is_descendant(0, 1));
        assert!(t.is_descendant(0, 2));
        assert!(!t.is_descendant(1, 2));
    }

    #[test]
    fn from_dfs_depths_three_levels() {
        // Tree:
        //   0
        //   ├── 1
        //   │   └── 2
        //   ├── 3
        //   │   ├── 4
        //   │   └── 5
        //   └── 6
        let t = TreeArena::from_dfs_depths(&[0, 1, 2, 1, 2, 2, 1]).unwrap();
        assert_eq!(t.parent_of, vec![-1, 0, 1, 0, 3, 3, 0]);
        // first_child for 0 = 1, for 1 = 2, for 3 = 4
        assert_eq!(t.first_child[0], 1);
        assert_eq!(t.first_child[1], 2);
        assert_eq!(t.first_child[3], 4);
        // next_sibling chain at depth 1: 1 → 3 → 6
        assert_eq!(t.next_sibling[1], 3);
        assert_eq!(t.next_sibling[3], 6);
        assert_eq!(t.next_sibling[6], -1);

        // DFS preorder picks them up correctly.
        let mut visited = Vec::new();
        t.dfs(0, |n| visited.push(n));
        assert_eq!(visited, vec![0, 1, 2, 3, 4, 5, 6]);

        // Descendant relations: every node descends from 0; 4/5 from 3 only.
        for i in 1..=6 {
            assert!(t.is_descendant(0, i));
        }
        assert!(t.is_descendant(3, 4));
        assert!(t.is_descendant(3, 5));
        assert!(!t.is_descendant(3, 6));
        assert!(!t.is_descendant(1, 3));
    }

    #[test]
    fn from_dfs_depths_multiple_roots() {
        // Forest: 0 → [1], 2 → [3, 4]
        let t = TreeArena::from_dfs_depths(&[0, 1, 0, 1, 1]).unwrap();
        assert_eq!(t.parent_of, vec![-1, 0, -1, 2, 2]);
        // No cross-root descendant relationships.
        assert!(t.is_descendant(2, 3));
        assert!(t.is_descendant(2, 4));
        assert!(!t.is_descendant(0, 2));
        assert!(!t.is_descendant(0, 3));
        assert!(!t.is_descendant(2, 1));
    }

    #[test]
    fn from_dfs_depths_empty() {
        let t = TreeArena::from_dfs_depths(&[]).unwrap();
        assert!(t.is_empty());
    }

    #[test]
    fn from_dfs_depths_must_start_at_root() {
        let err = TreeArena::from_dfs_depths(&[1, 1]).unwrap_err();
        assert!(err.contains("root"));
    }

    #[test]
    fn from_dfs_depths_rejects_depth_jumps() {
        let err = TreeArena::from_dfs_depths(&[0, 2]).unwrap_err();
        assert!(err.contains("jumps more than one level"));
    }
}
