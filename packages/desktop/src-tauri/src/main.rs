#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::{
    net::TcpListener,
    process::Command,
    sync::Mutex,
    time::Duration,
};
use std::{fs, path::PathBuf};
use std::env;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

fn eval_in_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>, script: &str) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let _ = window.eval(script);
}

fn dispatch_menu_action<R: tauri::Runtime>(app: &tauri::AppHandle<R>, action: &str) {
    let _ = app.emit("openchamber:menu-action", action);

    let event = serde_json::to_string("openchamber:menu-action")
        .unwrap_or_else(|_| "\"openchamber:menu-action\"".into());
    let detail = serde_json::to_string(action).unwrap_or_else(|_| "\"\"".into());
    let script = format!("window.dispatchEvent(new CustomEvent({event}, {{ detail: {detail} }}));");
    eval_in_main_window(app, &script);
}

fn dispatch_check_for_updates<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let _ = app.emit("openchamber:check-for-updates", ());

    let event = serde_json::to_string("openchamber:check-for-updates")
        .unwrap_or_else(|_| "\"openchamber:check-for-updates\"".into());
    let script = format!("window.dispatchEvent(new Event({event}));");
    eval_in_main_window(app, &script);
}
use tauri_plugin_shell::{process::CommandChild, ShellExt};
use tauri_plugin_updater::UpdaterExt;

#[cfg(target_os = "macos")]
const MENU_ITEM_ABOUT_ID: &str = "menu_about";
#[cfg(target_os = "macos")]
const MENU_ITEM_CHECK_FOR_UPDATES_ID: &str = "menu_check_for_updates";
#[cfg(target_os = "macos")]
const MENU_ITEM_SETTINGS_ID: &str = "menu_settings";
#[cfg(target_os = "macos")]
const MENU_ITEM_COMMAND_PALETTE_ID: &str = "menu_command_palette";
#[cfg(target_os = "macos")]
const MENU_ITEM_NEW_SESSION_ID: &str = "menu_new_session";
#[cfg(target_os = "macos")]
const MENU_ITEM_WORKTREE_CREATOR_ID: &str = "menu_worktree_creator";
#[cfg(target_os = "macos")]
const MENU_ITEM_CHANGE_WORKSPACE_ID: &str = "menu_change_workspace";
#[cfg(target_os = "macos")]
const MENU_ITEM_OPEN_GIT_TAB_ID: &str = "menu_open_git_tab";
#[cfg(target_os = "macos")]
const MENU_ITEM_OPEN_DIFF_TAB_ID: &str = "menu_open_diff_tab";
#[cfg(target_os = "macos")]
const MENU_ITEM_OPEN_FILES_TAB_ID: &str = "menu_open_files_tab";
#[cfg(target_os = "macos")]
const MENU_ITEM_OPEN_TERMINAL_TAB_ID: &str = "menu_open_terminal_tab";
#[cfg(target_os = "macos")]
const MENU_ITEM_THEME_LIGHT_ID: &str = "menu_theme_light";
#[cfg(target_os = "macos")]
const MENU_ITEM_THEME_DARK_ID: &str = "menu_theme_dark";
#[cfg(target_os = "macos")]
const MENU_ITEM_THEME_SYSTEM_ID: &str = "menu_theme_system";
#[cfg(target_os = "macos")]
const MENU_ITEM_TOGGLE_SIDEBAR_ID: &str = "menu_toggle_sidebar";
#[cfg(target_os = "macos")]
const MENU_ITEM_TOGGLE_MEMORY_DEBUG_ID: &str = "menu_toggle_memory_debug";
#[cfg(target_os = "macos")]
const MENU_ITEM_HELP_DIALOG_ID: &str = "menu_help_dialog";
#[cfg(target_os = "macos")]
const MENU_ITEM_DOWNLOAD_LOGS_ID: &str = "menu_download_logs";
#[cfg(target_os = "macos")]
const MENU_ITEM_REPORT_BUG_ID: &str = "menu_report_bug";
#[cfg(target_os = "macos")]
const MENU_ITEM_REQUEST_FEATURE_ID: &str = "menu_request_feature";
#[cfg(target_os = "macos")]
const MENU_ITEM_JOIN_DISCORD_ID: &str = "menu_join_discord";

#[cfg(target_os = "macos")]
const GITHUB_BUG_REPORT_URL: &str =
    "https://github.com/btriapitsyn/openchamber/issues/new?template=bug_report.yml";
#[cfg(target_os = "macos")]
const GITHUB_FEATURE_REQUEST_URL: &str =
    "https://github.com/btriapitsyn/openchamber/issues/new?template=feature_request.yml";
#[cfg(target_os = "macos")]
const DISCORD_INVITE_URL: &str = "https://discord.gg/ZYRSdnwwKA";

#[cfg(target_os = "macos")]
fn build_macos_menu<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> tauri::Result<tauri::menu::Menu<R>> {
    use tauri::menu::{
        Menu, MenuItem, PredefinedMenuItem, Submenu, HELP_SUBMENU_ID, WINDOW_SUBMENU_ID,
    };

    let pkg_info = app.package_info();

    let auto_worktree = app
        .try_state::<MenuRuntimeState>()
        .map(|state| *state.auto_worktree.lock().expect("menu state mutex"))
        .unwrap_or(false);

    let new_session_shortcut = if auto_worktree { "Cmd+Shift+N" } else { "Cmd+N" };
    let new_worktree_shortcut = if auto_worktree { "Cmd+N" } else { "Cmd+Shift+N" };

    let about = MenuItem::with_id(
        app,
        MENU_ITEM_ABOUT_ID,
        format!("About {}", pkg_info.name),
        true,
        None::<&str>,
    )?;

    let check_for_updates = MenuItem::with_id(
        app,
        MENU_ITEM_CHECK_FOR_UPDATES_ID,
        "Check for Updates",
        true,
        None::<&str>,
    )?;

    let settings = MenuItem::with_id(app, MENU_ITEM_SETTINGS_ID, "Settings", true, Some("Cmd+,"))?;

    let command_palette = MenuItem::with_id(
        app,
        MENU_ITEM_COMMAND_PALETTE_ID,
        "Command Palette",
        true,
        Some("Cmd+K"),
    )?;

    let new_session = MenuItem::with_id(
        app,
        MENU_ITEM_NEW_SESSION_ID,
        "New Session",
        true,
        Some(new_session_shortcut),
    )?;

    let worktree_creator = MenuItem::with_id(
        app,
        MENU_ITEM_WORKTREE_CREATOR_ID,
        "New Worktree",
        true,
        Some(new_worktree_shortcut),
    )?;

    let change_workspace = MenuItem::with_id(
        app,
        MENU_ITEM_CHANGE_WORKSPACE_ID,
        "Add Workspace",
        true,
        None::<&str>,
    )?;

    let open_git_tab =
        MenuItem::with_id(app, MENU_ITEM_OPEN_GIT_TAB_ID, "Git", true, Some("Cmd+G"))?;
    let open_diff_tab =
        MenuItem::with_id(app, MENU_ITEM_OPEN_DIFF_TAB_ID, "Diff", true, Some("Cmd+E"))?;
    let open_files_tab =
        MenuItem::with_id(app, MENU_ITEM_OPEN_FILES_TAB_ID, "Files", true, None::<&str>)?;
    let open_terminal_tab = MenuItem::with_id(
        app,
        MENU_ITEM_OPEN_TERMINAL_TAB_ID,
        "Terminal",
        true,
        Some("Cmd+T"),
    )?;

    let theme_light =
        MenuItem::with_id(app, MENU_ITEM_THEME_LIGHT_ID, "Light Theme", true, None::<&str>)?;
    let theme_dark =
        MenuItem::with_id(app, MENU_ITEM_THEME_DARK_ID, "Dark Theme", true, None::<&str>)?;
    let theme_system =
        MenuItem::with_id(app, MENU_ITEM_THEME_SYSTEM_ID, "System Theme", true, None::<&str>)?;

    let toggle_sidebar = MenuItem::with_id(
        app,
        MENU_ITEM_TOGGLE_SIDEBAR_ID,
        "Toggle Session Sidebar",
        true,
        Some("Cmd+L"),
    )?;

    let toggle_memory_debug = MenuItem::with_id(
        app,
        MENU_ITEM_TOGGLE_MEMORY_DEBUG_ID,
        "Toggle Memory Debug",
        true,
        Some("Cmd+Shift+D"),
    )?;

    let help_dialog = MenuItem::with_id(
        app,
        MENU_ITEM_HELP_DIALOG_ID,
        "Keyboard Shortcuts",
        true,
        Some("Cmd+."),
    )?;

    let download_logs = MenuItem::with_id(
        app,
        MENU_ITEM_DOWNLOAD_LOGS_ID,
        "Show Diagnostics",
        true,
        Some("Cmd+Shift+L"),
    )?;

    let report_bug =
        MenuItem::with_id(app, MENU_ITEM_REPORT_BUG_ID, "Report a Bug", true, None::<&str>)?;
    let request_feature = MenuItem::with_id(
        app,
        MENU_ITEM_REQUEST_FEATURE_ID,
        "Request a Feature",
        true,
        None::<&str>,
    )?;
    let join_discord =
        MenuItem::with_id(app, MENU_ITEM_JOIN_DISCORD_ID, "Join Discord", true, None::<&str>)?;

    let theme_submenu =
        Submenu::with_items(app, "Theme", true, &[&theme_light, &theme_dark, &theme_system])?;

    let window_menu = Submenu::with_id_and_items(
        app,
        WINDOW_SUBMENU_ID,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    let help_menu = Submenu::with_id_and_items(
        app,
        HELP_SUBMENU_ID,
        "Help",
        true,
        &[
            &help_dialog,
            &download_logs,
            &PredefinedMenuItem::separator(app)?,
            &report_bug,
            &request_feature,
            &PredefinedMenuItem::separator(app)?,
            &join_discord,
        ],
    )?;

    Menu::with_items(
        app,
        &[
            &Submenu::with_items(
                app,
                pkg_info.name.clone(),
                true,
                &[
                    &about,
                    &check_for_updates,
                    &PredefinedMenuItem::separator(app)?,
                    &settings,
                    &command_palette,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &new_session,
                    &worktree_creator,
                    &PredefinedMenuItem::separator(app)?,
                    &change_workspace,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &open_git_tab,
                    &open_diff_tab,
                    &open_files_tab,
                    &open_terminal_tab,
                    &PredefinedMenuItem::separator(app)?,
                    &theme_submenu,
                    &PredefinedMenuItem::separator(app)?,
                    &toggle_sidebar,
                    &toggle_memory_debug,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::fullscreen(app, None)?,
                ],
            )?,
            &window_menu,
            &help_menu,
        ],
    )
}

#[tauri::command]
fn desktop_set_auto_worktree_menu(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let Some(state) = app.try_state::<MenuRuntimeState>() else {
        return Ok(());
    };

    {
        let mut guard = state.auto_worktree.lock().expect("menu state mutex");
        *guard = enabled;
    }

    #[cfg(target_os = "macos")]
    {
        use tauri::menu::MenuItemKind;

        let new_session_shortcut = if enabled { "Cmd+Shift+N" } else { "Cmd+N" };
        let new_worktree_shortcut = if enabled { "Cmd+N" } else { "Cmd+Shift+N" };

        if let Some(menu) = app.menu() {
            if let Some(MenuItemKind::MenuItem(item)) = menu.get(MENU_ITEM_NEW_SESSION_ID) {
                item.set_accelerator(Some(new_session_shortcut))
                    .map_err(|err| err.to_string())?;
            }
            if let Some(MenuItemKind::MenuItem(item)) = menu.get(MENU_ITEM_WORKTREE_CREATOR_ID) {
                item.set_accelerator(Some(new_worktree_shortcut))
                    .map_err(|err| err.to_string())?;
            }
        } else {
            // Should not happen on macOS, but keep as fallback.
            let menu = build_macos_menu(&app).map_err(|err| err.to_string())?;
            app.set_menu(menu).map_err(|err| err.to_string())?;
        }
    }

    Ok(())
}

const SIDECAR_NAME: &str = "openchamber-server";
const HEALTH_TIMEOUT: Duration = Duration::from_secs(20);
const HEALTH_POLL_INTERVAL: Duration = Duration::from_millis(250);

#[derive(Default)]
struct SidecarState {
    child: Mutex<Option<CommandChild>>,
    url: Mutex<Option<String>>,
}

#[derive(Default)]
struct MenuRuntimeState {
    auto_worktree: Mutex<bool>,
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data")]
enum UpdateProgressEvent {
    #[serde(rename_all = "camelCase")]
    Started {
        content_length: Option<u64>,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        chunk_length: usize,
        downloaded: u64,
        total: Option<u64>,
    },
    Finished,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopUpdateInfo {
    available: bool,
    current_version: String,
    version: Option<String>,
    body: Option<String>,
    date: Option<String>,
}

struct PendingUpdate(Mutex<Option<tauri_plugin_updater::Update>>);

fn pick_unused_port() -> Result<u16> {
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    Ok(port)
}

fn is_nonempty_string(value: &str) -> bool {
    !value.trim().is_empty()
}

async fn wait_for_health(url: &str) -> bool {
    let client = match reqwest::Client::builder().no_proxy().build() {
        Ok(c) => c,
        Err(_) => return false,
    };

    let deadline = std::time::Instant::now() + HEALTH_TIMEOUT;
    let health_url = format!("{}/health", url.trim_end_matches('/'));

    while std::time::Instant::now() < deadline {
        if let Ok(resp) = client.get(&health_url).send().await {
            if resp.status().is_success() {
                return true;
            }
        }
        tokio::time::sleep(HEALTH_POLL_INTERVAL).await;
    }

    false
}

fn kill_sidecar(app: tauri::AppHandle) {
    let Some(state) = app.try_state::<SidecarState>() else {
        return;
    };

    let mut guard = state.child.lock().expect("sidecar mutex");
    if let Some(child) = guard.take() {
        let _ = child.kill();
    }
}

fn build_local_url(port: u16) -> String {
    format!("http://127.0.0.1:{port}")
}

async fn spawn_local_server(app: &tauri::AppHandle) -> Result<String> {
    let port = pick_unused_port()?;
    let url = build_local_url(port);

    let dist_dir = resolve_web_dist_dir(app)?;

    let no_proxy = "localhost,127.0.0.1";

    // macOS app launch env often lacks Homebrew/user bins.
    let mut path_segments: Vec<String> = vec![
        "/opt/homebrew/bin".to_string(),
        "/usr/local/bin".to_string(),
        "/usr/bin".to_string(),
        "/bin".to_string(),
        "/usr/sbin".to_string(),
        "/sbin".to_string(),
    ];
    if let Ok(home) = env::var("HOME") {
        if !home.is_empty() {
            path_segments.push(format!("{home}/.local/bin"));
            path_segments.push(format!("{home}/.bun/bin"));
        }
    }
    if let Ok(existing) = env::var("PATH") {
        if !existing.is_empty() {
            path_segments.push(existing);
        }
    }
    let augmented_path = path_segments.join(":");

    let cmd = app
        .shell()
        .sidecar(SIDECAR_NAME)
        .map_err(|err| anyhow!("Failed to resolve sidecar '{SIDECAR_NAME}': {err}"))?
        .args(["--port", &port.to_string()])
        .env("OPENCHAMBER_HOST", "127.0.0.1")
        .env("OPENCHAMBER_DIST_DIR", dist_dir)
        .env("PATH", augmented_path)
        .env("NO_PROXY", no_proxy)
        .env("no_proxy", no_proxy);

    let (_rx, child) = cmd
        .spawn()
        .map_err(|err| anyhow!("Failed to spawn sidecar '{SIDECAR_NAME}': {err}"))?;

    if let Some(state) = app.try_state::<SidecarState>() {
        *state.child.lock().expect("sidecar mutex") = Some(child);
        *state.url.lock().expect("sidecar url mutex") = Some(url.clone());
    }

    if !wait_for_health(&url).await {
        kill_sidecar(app.clone());
        return Err(anyhow!("Sidecar health check failed"));
    }

    Ok(url)
}

fn resolve_web_dist_dir(app: &tauri::AppHandle) -> Result<PathBuf> {
    let candidates = ["web-dist", "resources/web-dist"];
    for candidate in candidates {
        let path = app
            .path()
            .resolve(candidate, tauri::path::BaseDirectory::Resource)
            .map_err(|err| anyhow!("Failed to resolve '{candidate}' resources: {err}"))?;
        let index = path.join("index.html");
        if fs::metadata(&index).is_ok() {
            return Ok(path);
        }
    }

    Err(anyhow!(
        "Web assets missing in app resources (expected index.html under web-dist)"
    ))
}

fn normalize_server_url(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }

    match url::Url::parse(trimmed) {
        Ok(url) => {
            if url.scheme() == "http" || url.scheme() == "https" {
                Some(trimmed.trim_end_matches('/').to_string())
            } else {
                None
            }
        }
        Err(_) => None,
    }
}

#[derive(Deserialize)]
struct DesktopNotifyPayload {
    title: Option<String>,
    body: Option<String>,
    tag: Option<String>,
}

#[tauri::command]
fn desktop_notify(
    app: tauri::AppHandle,
    payload: Option<DesktopNotifyPayload>,
) -> Result<bool, String> {
    let payload = payload.unwrap_or(DesktopNotifyPayload {
        title: None,
        body: None,
        tag: None,
    });

    use tauri_plugin_notification::NotificationExt;

    let mut builder = app
        .notification()
        .builder()
        .title(payload.title.unwrap_or_else(|| "OpenChamber".to_string()));

    if let Some(body) = payload.body {
        if is_nonempty_string(&body) {
            builder = builder.body(body);
        }
    }

    if let Some(tag) = payload.tag {
        if is_nonempty_string(&tag) {
            let _ = tag;
        }
    }

    builder.show().map(|_| true).map_err(|err| err.to_string())
}

#[tauri::command]
async fn desktop_check_for_updates(
    app: tauri::AppHandle,
    pending: tauri::State<'_, PendingUpdate>,
) -> Result<DesktopUpdateInfo, String> {
    let updater = app.updater().map_err(|err| err.to_string())?;
    let update = updater.check().await.map_err(|err| err.to_string())?;

    let current_version = app.package_info().version.to_string();

    let info = if let Some(update) = update {
        *pending.0.lock().expect("pending update mutex") = Some(update.clone());
        DesktopUpdateInfo {
            available: true,
            current_version,
            version: Some(update.version.clone()),
            body: update.body.clone(),
            date: update.date.map(|date| date.to_string()),
        }
    } else {
        *pending.0.lock().expect("pending update mutex") = None;
        DesktopUpdateInfo {
            available: false,
            current_version,
            version: None,
            body: None,
            date: None,
        }
    };

    Ok(info)
}

#[tauri::command]
async fn desktop_download_and_install_update(
    app: tauri::AppHandle,
    pending: tauri::State<'_, PendingUpdate>,
) -> Result<(), String> {
    let Some(update) = pending.0.lock().expect("pending update mutex").take() else {
        return Err("No pending update".to_string());
    };

    let mut downloaded: u64 = 0;
    let mut total: Option<u64> = None;
    let mut started = false;

    update
        .download_and_install(
            |chunk_length, content_length| {
                if !started {
                    total = content_length;
                    let _ = app.emit(
                        "openchamber:update-progress",
                        UpdateProgressEvent::Started { content_length },
                    );
                    started = true;
                }

                downloaded = downloaded.saturating_add(chunk_length as u64);
                let _ = app.emit(
                    "openchamber:update-progress",
                    UpdateProgressEvent::Progress {
                        chunk_length,
                        downloaded,
                        total,
                    },
                );
            },
            || {
                let _ = app.emit("openchamber:update-progress", UpdateProgressEvent::Finished);
            },
        )
        .await
        .map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
fn desktop_restart(app: tauri::AppHandle) {
    app.restart();
}

fn create_main_window(app: &tauri::AppHandle, url: &str) -> Result<()> {
    let parsed = url::Url::parse(url).map_err(|err| anyhow!("Invalid URL: {err}"))?;

    let home =
        std::env::var(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).unwrap_or_default();
    let home_escaped = home
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r");
    #[cfg(target_os = "macos")]
    fn macos_major_version() -> Option<u32> {
        fn cmd_stdout(cmd: &str, args: &[&str]) -> Option<String> {
            let output = Command::new(cmd).args(args).output().ok()?;
            if !output.status.success() {
                return None;
            }
            String::from_utf8(output.stdout).ok()
        }

        // We want Darwin major (kern.osrelease major), not marketing version.
        // Example: kern.osrelease="26.0.0".
        let raw = cmd_stdout("sysctl", &["-n", "kern.osrelease"]).or_else(|| cmd_stdout("uname", &["-r"]))?;

        let raw = raw.trim();
        let major = raw.split('.').next()?;
        major.parse::<u32>().ok()
    }

    #[cfg(not(target_os = "macos"))]
    fn macos_major_version() -> Option<u32> {
        None
    }

    let macos_major = macos_major_version().unwrap_or(0);
    let init_script = format!(
        "window.__OPENCHAMBER_HOME__ = \"{}\"; window.__OPENCHAMBER_MACOS_MAJOR__ = {};",
        home_escaped, macos_major
    );

    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
        .title("OpenChamber")
        .inner_size(1280.0, 800.0)
        .decorations(true)
        .visible(false)
        .initialization_script(&init_script)
        ;

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .hidden_title(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .traffic_light_position(tauri::Position::Logical(tauri::LogicalPosition { x: 17.0, y: 26.0 }));
    }

    let window = builder.build()?;

    let _ = window.show();
    let _ = window.set_focus();

    Ok(())
}

fn main() {
    let log_builder = tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .clear_targets()
        .targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
        ]);

    let builder = tauri::Builder::default()
        .manage(SidecarState::default())
        .manage(MenuRuntimeState::default())
        .manage(PendingUpdate(Mutex::new(None)))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(log_builder.build())
        .menu(|app| {
            #[cfg(target_os = "macos")]
            {
                build_macos_menu(app)
            }

            #[cfg(not(target_os = "macos"))]
            {
                tauri::menu::Menu::default(app)
            }
        })
        .on_menu_event(|app, event| {
            #[cfg(target_os = "macos")]
            {
                let id = event.id().as_ref();

                log::info!("[menu] click id={}", id);

                #[cfg(debug_assertions)]
                {
                    let msg = serde_json::to_string(id).unwrap_or_else(|_| "\"(unserializable)\"".into());
                    eval_in_main_window(app, &format!("console.log('[menu] id=', {});", msg));
                }

                if id == MENU_ITEM_CHECK_FOR_UPDATES_ID {
                    dispatch_check_for_updates(app);
                    return;
                }

                if id == MENU_ITEM_REPORT_BUG_ID {
                    use tauri_plugin_shell::ShellExt;
                    #[allow(deprecated)]
                    {
                        let _ = app.shell().open(GITHUB_BUG_REPORT_URL, None);
                    }
                    return;
                }

                if id == MENU_ITEM_REQUEST_FEATURE_ID {
                    use tauri_plugin_shell::ShellExt;
                    #[allow(deprecated)]
                    {
                        let _ = app.shell().open(GITHUB_FEATURE_REQUEST_URL, None);
                    }
                    return;
                }

                if id == MENU_ITEM_JOIN_DISCORD_ID {
                    use tauri_plugin_shell::ShellExt;
                    #[allow(deprecated)]
                    {
                        let _ = app.shell().open(DISCORD_INVITE_URL, None);
                    }
                    return;
                }

                if id == MENU_ITEM_ABOUT_ID {
                    dispatch_menu_action(app, "about");
                    return;
                }
                if id == MENU_ITEM_SETTINGS_ID {
                    dispatch_menu_action(app, "settings");
                    return;
                }
                if id == MENU_ITEM_COMMAND_PALETTE_ID {
                    dispatch_menu_action(app, "command-palette");
                    return;
                }

                if id == MENU_ITEM_NEW_SESSION_ID {
                    dispatch_menu_action(app, "new-session");
                    return;
                }
                if id == MENU_ITEM_WORKTREE_CREATOR_ID {
                    dispatch_menu_action(app, "new-worktree-session");
                    return;
                }
                if id == MENU_ITEM_CHANGE_WORKSPACE_ID {
                    dispatch_menu_action(app, "change-workspace");
                    return;
                }

                if id == MENU_ITEM_OPEN_GIT_TAB_ID {
                    dispatch_menu_action(app, "open-git-tab");
                    return;
                }
                if id == MENU_ITEM_OPEN_DIFF_TAB_ID {
                    dispatch_menu_action(app, "open-diff-tab");
                    return;
                }

                if id == MENU_ITEM_OPEN_FILES_TAB_ID {
                    dispatch_menu_action(app, "open-files-tab");
                    return;
                }
                if id == MENU_ITEM_OPEN_TERMINAL_TAB_ID {
                    dispatch_menu_action(app, "open-terminal-tab");
                    return;
                }

                if id == MENU_ITEM_THEME_LIGHT_ID {
                    dispatch_menu_action(app, "theme-light");
                    return;
                }
                if id == MENU_ITEM_THEME_DARK_ID {
                    dispatch_menu_action(app, "theme-dark");
                    return;
                }
                if id == MENU_ITEM_THEME_SYSTEM_ID {
                    dispatch_menu_action(app, "theme-system");
                    return;
                }

                if id == MENU_ITEM_TOGGLE_SIDEBAR_ID {
                    dispatch_menu_action(app, "toggle-sidebar");
                    return;
                }
                if id == MENU_ITEM_TOGGLE_MEMORY_DEBUG_ID {
                    dispatch_menu_action(app, "toggle-memory-debug");
                    return;
                }

                if id == MENU_ITEM_HELP_DIALOG_ID {
                    dispatch_menu_action(app, "help-dialog");
                    return;
                }
                if id == MENU_ITEM_DOWNLOAD_LOGS_ID {
                    dispatch_menu_action(app, "download-logs");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            desktop_notify,
            desktop_check_for_updates,
            desktop_download_and_install_update,
            desktop_restart,
            desktop_set_auto_worktree_menu,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let target_url = std::env::var("OPENCHAMBER_SERVER_URL")
                    .ok()
                    .and_then(|raw| normalize_server_url(&raw));

                let url = if let Some(remote) = target_url {
                    remote
                } else {
                    // In dev, prefer the CLI-managed devUrl server (tauri.conf.json) to avoid
                    // starting another instance on a random port.
                    if cfg!(debug_assertions) {
                        let dev_url = "http://127.0.0.1:3001";
                        if wait_for_health(dev_url).await {
                            dev_url.to_string()
                        } else {
                            match spawn_local_server(&handle).await {
                                Ok(local) => local,
                                Err(err) => {
                                    log::error!("[desktop] failed to start local server: {err}");
                                    return;
                                }
                            }
                        }
                    } else {
                        match spawn_local_server(&handle).await {
                            Ok(local) => local,
                            Err(err) => {
                                log::error!("[desktop] failed to start local server: {err}");
                                return;
                            }
                        }
                    }
                };

                if let Err(err) = create_main_window(&handle, &url) {
                    log::error!("[desktop] failed to create window: {err}");
                }
            });

            Ok(())
        })
        ;

    let app = builder
        .build(tauri::generate_context!())
        .expect("failed to build Tauri application");

    app.run(|app_handle, event| {
        match event {
            tauri::RunEvent::ExitRequested { .. } => {
                // Best-effort cleanup; never block shutdown.
                kill_sidecar(app_handle.clone());
            }
            tauri::RunEvent::Exit => {
                kill_sidecar(app_handle.clone());
            }
            _ => {}
        }
    });
}
