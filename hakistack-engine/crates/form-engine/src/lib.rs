//! Schema-driven condition + dependency-graph kernel for
//! `hk-dynamic-form`. See `README.md` for the full design.
//!
//! Phase 2 (current) ships condition evaluation. Validator pipeline and
//! deep-equality diff arrive in Phase 3 and Phase 4 — those modules
//! will land next to `engine` without changing the public API.
//!
//! No `wasm-bindgen` here — the WASM boundary lives in
//! `crates/engine-wasm`. This crate is plain Rust and tested with
//! `cargo test -p form-engine`.

pub mod condition;
pub mod engine;
pub mod event;
pub mod schema;
pub mod state;
pub mod value;

pub use condition::{
    Condition, ConditionOp, FieldIdx, NoopResolver, PredicateId, PredicateResolver,
};
pub use engine::FormEngine;
pub use event::{Event, EventKind};
pub use schema::{FieldDef, FormSchema, RuleKind, RuleRef};
pub use state::{FormState, ValueMap};
pub use value::Value;
