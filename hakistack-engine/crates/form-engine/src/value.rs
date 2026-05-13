//! Engine-side value representation.
//!
//! The form engine never sees JS values directly. The wasm-bindgen layer
//! coerces every form value into one of these variants once, at the
//! boundary, so the per-keystroke condition kernel stays on the fast
//! path of `match`/numeric compare/byte-equality.
//!
//! `JsCallback` carries an id, not a closure, because closures can't live
//! on the Rust side of the boundary in a way that survives `set_value`
//! arguments. The WASM adapter registers a `js_sys::Function` against the
//! id at schema-ingest time; the engine resolves the callback by id via
//! a `PredicateResolver` it borrows during evaluation.

/// Engine value. Heap-light by design — strings are boxed but never
/// re-allocated past ingest; arrays are flat `Vec<Value>` so the
/// `contains` / `in` operators read them directly.
#[derive(Debug, Clone)]
pub enum Value {
    Null,
    Bool(bool),
    Number(f64),
    String(Box<str>),
    Array(Vec<Value>),
    /// Sentinel for a user-supplied JS predicate. Carries the id the
    /// adapter assigned at schema ingest; the engine asks a
    /// `PredicateResolver` to resolve it at evaluation time.
    JsCallback(u32),
}

impl Value {
    /// Truthiness in the JS sense — used by the `string` /
    /// `[fieldKey, true]` shorthand the TS adapter normalizes to
    /// `{ op: Equals, value: Bool(true) }`. Direct callers rarely need
    /// this.
    pub fn is_truthy(&self) -> bool {
        match self {
            Value::Null => false,
            Value::Bool(b) => *b,
            Value::Number(n) => *n != 0.0 && !n.is_nan(),
            Value::String(s) => !s.is_empty(),
            Value::Array(v) => !v.is_empty(),
            Value::JsCallback(_) => true,
        }
    }

    pub fn as_number(&self) -> Option<f64> {
        if let Value::Number(n) = self {
            Some(*n)
        } else {
            None
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        if let Value::String(s) = self {
            Some(s)
        } else {
            None
        }
    }

    pub fn as_array(&self) -> Option<&[Value]> {
        if let Value::Array(v) = self {
            Some(v)
        } else {
            None
        }
    }
}

impl PartialEq for Value {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Value::Null, Value::Null) => true,
            (Value::Bool(a), Value::Bool(b)) => a == b,
            (Value::Number(a), Value::Number(b)) => {
                // NaN ≠ NaN is the JS convention; engine matches it.
                if a.is_nan() || b.is_nan() {
                    false
                } else {
                    a == b
                }
            }
            (Value::String(a), Value::String(b)) => a == b,
            (Value::Array(a), Value::Array(b)) => a == b,
            (Value::JsCallback(a), Value::JsCallback(b)) => a == b,
            _ => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn equality_matches_js_semantics() {
        assert_eq!(Value::Null, Value::Null);
        assert_eq!(Value::Bool(true), Value::Bool(true));
        assert_ne!(Value::Bool(true), Value::Bool(false));
        assert_eq!(Value::Number(1.0), Value::Number(1.0));
        assert_ne!(Value::Number(f64::NAN), Value::Number(f64::NAN));
        assert_eq!(Value::String(Box::from("hi")), Value::String(Box::from("hi")));
        assert_ne!(Value::Number(1.0), Value::String(Box::from("1")));
    }

    #[test]
    fn truthy_matches_js_intuition() {
        assert!(!Value::Null.is_truthy());
        assert!(!Value::Bool(false).is_truthy());
        assert!(Value::Bool(true).is_truthy());
        assert!(!Value::Number(0.0).is_truthy());
        assert!(Value::Number(1.0).is_truthy());
        assert!(!Value::Number(f64::NAN).is_truthy());
        assert!(!Value::String(Box::from("")).is_truthy());
        assert!(Value::String(Box::from("x")).is_truthy());
        assert!(!Value::Array(vec![]).is_truthy());
        assert!(Value::Array(vec![Value::Null]).is_truthy());
    }

    #[test]
    fn array_value_equality_is_recursive() {
        let a = Value::Array(vec![Value::Number(1.0), Value::String(Box::from("x"))]);
        let b = Value::Array(vec![Value::Number(1.0), Value::String(Box::from("x"))]);
        let c = Value::Array(vec![Value::Number(1.0), Value::String(Box::from("y"))]);
        assert_eq!(a, b);
        assert_ne!(a, c);
    }
}
