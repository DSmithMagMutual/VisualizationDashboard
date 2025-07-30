use serde::{Deserialize, Serialize};
use base64::Engine;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraConfig {
    pub base_url: String,
    pub email: String,
    pub api_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JiraTestResponse {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
async fn save_jira_config(config: JiraConfig) -> Result<(), String> {
  // TODO: Implement secure storage when store plugin is properly configured
  println!("Saving config: {:?}", config);
  Ok(())
}

#[tauri::command]
async fn load_jira_config() -> Result<Option<JiraConfig>, String> {
  // TODO: Implement secure storage when store plugin is properly configured
  println!("Loading config - not yet implemented");
  Ok(None)
}

#[tauri::command]
async fn test_jira_connection(config: JiraConfig) -> Result<JiraTestResponse, String> {
    let client = reqwest::Client::new();
    
    // Test with a simple API call to get user info
    let url = format!("{}/rest/api/3/myself", config.base_url.trim_end_matches('/'));
    
    let response = client
        .get(&url)
        .header("Authorization", format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(format!("{}:{}", config.email, config.api_token))))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(JiraTestResponse {
            success: true,
            message: "Connection successful!".to_string(),
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        Ok(JiraTestResponse {
            success: false,
            message: format!("Connection failed: {} - {}", status, error_text),
        })
    }
}

#[tauri::command]
async fn fetch_jira_data(config: JiraConfig, project_key: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    // Fetch project issues
    let url = format!("{}/rest/api/3/search", config.base_url.trim_end_matches('/'));
    
    let jql = format!("project = {} ORDER BY created DESC", project_key);
    let params = [
        ("jql", jql.as_str()),
        ("maxResults", "1000"),
        ("fields", "summary,status,issuetype,parent,customfield_10014,assignee,customfield_10001"),
    ];
    
    let response = client
        .get(&url)
        .header("Authorization", format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(format!("{}:{}", config.email, config.api_token))))
        .header("Accept", "application/json")
        .query(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        Ok(data)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        Err(format!("Failed to fetch data: {} - {}", status, error_text))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      save_jira_config,
      load_jira_config,
      test_jira_connection,
      fetch_jira_data
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
