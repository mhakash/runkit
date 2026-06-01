use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Emitter;

pub fn setup(app: &mut tauri::App) -> tauri::Result<()> {
    // ── Runkit ────────────────────────────────────────────────────────────────
    let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit_item = PredefinedMenuItem::quit(app, Some("Quit Runkit"))?;
    let app_menu = Submenu::with_items(app, "Runkit", true, &[
        &settings_item,
        &PredefinedMenuItem::separator(app)?,
        &quit_item,
    ])?;

    // ── File ─────────────────────────────────────────────────────────────────
    let new_tab = MenuItem::with_id(app, "new-tab", "New Tab", true, Some("CmdOrCtrl+T"))?;
    let close_tab = MenuItem::with_id(app, "close-tab", "Close Tab", true, Some("CmdOrCtrl+W"))?;
    let open_pdf = MenuItem::with_id(app, "open-pdf", "Open PDF…", true, Some("CmdOrCtrl+O"))?;
    let file_menu = Submenu::with_items(app, "File", true, &[
        &new_tab,
        &close_tab,
        &PredefinedMenuItem::separator(app)?,
        &open_pdf,
    ])?;

    // ── Edit ─────────────────────────────────────────────────────────────────
    let edit_menu = Submenu::with_items(app, "Edit", true, &[
        &PredefinedMenuItem::undo(app, None)?,
        &PredefinedMenuItem::redo(app, None)?,
        &PredefinedMenuItem::separator(app)?,
        &PredefinedMenuItem::cut(app, None)?,
        &PredefinedMenuItem::copy(app, None)?,
        &PredefinedMenuItem::paste(app, None)?,
        &PredefinedMenuItem::select_all(app, None)?,
    ])?;

    // ── Tools ─────────────────────────────────────────────────────────────────
    let todo_item = MenuItem::with_id(app, "open-todo", "Todo", true, None::<&str>)?;
    let pdf_item = MenuItem::with_id(app, "open-pdf-tool", "PDF Reader", true, None::<&str>)?;
    let tools_menu = Submenu::with_items(app, "Tools", true, &[
        &todo_item,
        &pdf_item,
    ])?;

    // ── View → Theme ─────────────────────────────────────────────────────────
    let theme_dark = MenuItem::with_id(app, "theme-dark", "Dark", true, None::<&str>)?;
    let theme_dim = MenuItem::with_id(app, "theme-dim", "Dim", true, None::<&str>)?;
    let theme_light = MenuItem::with_id(app, "theme-light", "Light", true, None::<&str>)?;
    let theme_submenu = Submenu::with_items(app, "Theme", true, &[
        &theme_dark,
        &theme_dim,
        &theme_light,
    ])?;
    let view_menu = Submenu::with_items(app, "View", true, &[&theme_submenu])?;

    // ── Assemble ──────────────────────────────────────────────────────────────
    let menu = Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu, &tools_menu, &view_menu])?;
    app.set_menu(menu)?;

    app.on_menu_event(move |app, event| {
        let id = event.id().as_ref();
        let evt = match id {
            "settings"      => Some("menu:open-settings"),
            "new-tab"       => Some("menu:new-tab"),
            "close-tab"     => Some("menu:close-tab"),
            "open-pdf" | "open-pdf-tool" => Some("menu:open-pdf"),
            "open-todo"     => Some("menu:open-todo"),
            "theme-dark"    => Some("menu:theme-dark"),
            "theme-dim"     => Some("menu:theme-dim"),
            "theme-light"   => Some("menu:theme-light"),
            _               => None,
        };
        if let Some(e) = evt {
            let _ = app.emit(e, ());
        }
    });

    Ok(())
}
