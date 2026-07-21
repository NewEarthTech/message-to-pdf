//! Generate the TypeScript IPC client from the Rust surface.
//!
//! `cargo run -p msg2pdf-desktop --features export --bin gen_bindings`

fn main() {
    #[cfg(feature = "export")]
    {
        msg2pdf_desktop_lib::export_bindings().expect("failed to export TypeScript bindings");
        println!("wrote src/bindings.ts");
    }
    #[cfg(not(feature = "export"))]
    {
        eprintln!("re-run with `--features export` to generate bindings");
        std::process::exit(1);
    }
}
