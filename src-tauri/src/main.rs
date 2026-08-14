use std::{
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    time::Duration,
};

use tauri::{WebviewUrl, WebviewWindowBuilder};

const LOCAL_APP_URL: &str = "http://127.0.0.1:3000";
const LOCAL_HEALTH_ADDRESS: &str = "127.0.0.1:3000";
const HEALTH_PATH: &str = "/api/health/live";

fn local_app_is_ready() -> bool {
    let address: SocketAddr = match LOCAL_HEALTH_ADDRESS.parse() {
        Ok(address) => address,
        Err(_) => return false,
    };

    let mut stream = match TcpStream::connect_timeout(&address, Duration::from_millis(750)) {
        Ok(stream) => stream,
        Err(_) => return false,
    };

    if stream
        .set_read_timeout(Some(Duration::from_millis(750)))
        .is_err()
        || stream
            .set_write_timeout(Some(Duration::from_millis(750)))
            .is_err()
    {
        return false;
    }

    let request = format!(
        "GET {HEALTH_PATH} HTTP/1.1\r\nHost: {LOCAL_HEALTH_ADDRESS}\r\nConnection: close\r\n\r\n"
    );

    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }

    let mut response = String::new();
    if stream.take(1_024).read_to_string(&mut response).is_err() {
        return false;
    }

    response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200")
}

fn is_allowed_navigation(url: &str) -> bool {
    if url == "tauri://localhost" || url.starts_with("tauri://localhost/") {
        return true;
    }

    let Some(remainder) = url.strip_prefix(LOCAL_APP_URL) else {
        return false;
    };

    remainder.is_empty()
        || remainder.starts_with('/')
        || remainder.starts_with('?')
        || remainder.starts_with('#')
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let initial_url = if local_app_is_ready() {
                WebviewUrl::External(LOCAL_APP_URL.parse().expect("fixed loopback URL is valid"))
            } else {
                WebviewUrl::App("index.html".into())
            };

            WebviewWindowBuilder::new(app, "main", initial_url)
                .title("Torrance Yachts")
                .user_agent("TorranceYachtsDesktop/0.19.1")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1024.0, 700.0)
                .resizable(true)
                .on_navigation(|url| is_allowed_navigation(url.as_str()))
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run Torrance Yachts desktop companion");
}

#[cfg(test)]
mod tests {
    use super::is_allowed_navigation;

    #[test]
    fn allows_only_bundled_content_and_fixed_loopback_app_urls() {
        assert!(is_allowed_navigation("tauri://localhost/index.html"));
        assert!(is_allowed_navigation("http://127.0.0.1:3000"));
        assert!(is_allowed_navigation("http://127.0.0.1:3000/login?next=%2F"));
        assert!(is_allowed_navigation("http://127.0.0.1:3000/tasks"));
    }

    #[test]
    fn blocks_remote_and_lookalike_urls() {
        assert!(!is_allowed_navigation("https://example.com"));
        assert!(!is_allowed_navigation("http://localhost:3000"));
        assert!(!is_allowed_navigation("http://127.0.0.1:3001"));
        assert!(!is_allowed_navigation("http://127.0.0.1:3000.evil.example"));
    }
}
