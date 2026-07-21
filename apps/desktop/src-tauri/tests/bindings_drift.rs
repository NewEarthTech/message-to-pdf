//! Fails when the committed TypeScript client has drifted from the Rust IPC
//! surface. Regenerate with:
//!   cargo run -p msg2pdf-desktop --features export --bin gen_bindings
//!
//! Only compiled with the `export` feature (which pulls specta-typescript):
//!   cargo test -p msg2pdf-desktop --features export
#![cfg(feature = "export")]

#[test]
fn typescript_bindings_are_up_to_date() {
    if let Err(e) = msg2pdf_desktop_lib::check_bindings() {
        panic!(
            "src/bindings.ts is out of date — regenerate it with \
             `cargo run -p msg2pdf-desktop --features export --bin gen_bindings`:\n{e}"
        );
    }
}
