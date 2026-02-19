use tauri::{Emitter, Runtime, Manager};
use idevice::remote_pairing::{RpPairingSocket, RpPairingFile, RemotePairingClient};
use idevice::IdeviceError;
use tracing::{info, error};
use std::io::Write;

macro_rules! log_to_app {
    ($app:expr, $($arg:tt)*) => {{
        let msg = format!($($arg)*);
        println!("RUST_LOG: {}", msg);
        info!("{}", msg);
        let _ = $app.emit("log", msg);
    }};
}

macro_rules! log_err_to_app {
    ($app:expr, $($arg:tt)*) => {{
        let msg = format!($($arg)*);
        eprintln!("RUST_ERR: {}", msg);
        error!("{}", msg);
        let _ = $app.emit("log", format!("Error: {}", msg));
    }};
}

#[tauri::command]
async fn start_pairing<R: Runtime>(app: tauri::AppHandle<R>, plist_bytes: Option<Vec<u8>>) -> Result<(), String> {
    log_to_app!(app, "Starting connection process...");

    let addr = "10.7.0.1:49152";
    log_to_app!(app, "Connecting to {}...", addr);
    
    let conn = tokio::net::TcpStream::connect(addr)
        .await
        .map_err(|e| {
            let err = format!("Failed to connect to {}: {}", addr, e);
            log_err_to_app!(app, "{}", err);
            err
        })?;
    
    log_to_app!(app, "Socket connected.");
    let conn = RpPairingSocket::new(conn);

    let host = "idevice-rs-jkcoxson";
    
    let temp_path = app.path().temp_dir()
        .map_err(|e| e.to_string())?
        .join("ios_pairing_file.plist");
    
    if let Some(bytes) = plist_bytes {
        log_to_app!(app, "Using custom pairing file ({} bytes)", bytes.len());
        let mut file = std::fs::File::create(&temp_path).map_err(|e| format!("Failed to create custom temp file: {}", e))?;
        file.write_all(&bytes).map_err(|e| format!("Failed to write custom temp file: {}", e))?;
    } else {
        let plist_data = include_bytes!("../../ios_pairing_file.plist");
        log_to_app!(app, "Using default baked-in plist ({} bytes)", plist_data.len());
        
        let mut file = std::fs::File::create(&temp_path).map_err(|e| format!("Failed to create default temp file: {}", e))?;
        file.write_all(plist_data).map_err(|e| format!("Failed to write default temp file: {}", e))?;
    }

    log_to_app!(app, "Preparing pairing file in sandbox...");
    let mut rpf = RpPairingFile::read_from_file(&temp_path)
        .await
        .map_err(|e: IdeviceError| {
            let err = format!("Failed to read pairing file from sandbox: {}", e);
            log_err_to_app!(app, "{}", err);
            err
        })?;
    
    log_to_app!(app, "Pairing file loaded. Initializing client...");
    let mut rpc = RemotePairingClient::new(conn, host, &mut rpf);
    
    log_to_app!(app, "Pairing with code 000000...");
    rpc.connect(|_| async { "000000".to_string() }, 0u8)
        .await
        .map_err(|e: IdeviceError| {
            let err = format!("no connect :(: {:?}", e);
            log_err_to_app!(app, "{}", err);
            err
        })?;

    log_to_app!(app, "oh yeah we're connected");
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![start_pairing])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
