mod menu;
mod csv_commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, csv_commands::read_csv, csv_commands::write_csv])
        .setup(|app| menu::setup(app).map_err(|e| e.into()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
