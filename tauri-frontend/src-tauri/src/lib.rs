use serde::{Deserialize, Serialize};
use base64::Engine;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshResponse {
    pub success: bool,
    pub message: String,
    pub files_updated: Vec<String>,
    pub results: HashMap<String, serde_json::Value>,
    pub errors: Option<HashMap<String, String>>,
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

// Helper function to fetch and organize data for a project
async fn fetch_project_data(config: &JiraConfig, project_key: &str) -> Result<Vec<serde_json::Value>, String> {
    let client = reqwest::Client::new();
    let max_results = 1000;
    let mut start_at = 0;
    let mut all_issues: Vec<serde_json::Value> = Vec::new();
    let mut total = 0;
    let mut parent_keys = std::collections::HashSet::new();
    
    // First pass: fetch all issues for the project
    loop {
        let jql = format!("project = {} ORDER BY created DESC", project_key);
        let url = format!("{}/rest/api/3/search", config.base_url.trim_end_matches('/'));
        
        let params = [
            ("jql", jql.as_str()),
            ("startAt", &start_at.to_string()),
            ("maxResults", &max_results.to_string()),
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

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Failed to fetch issues from Jira for {}: {} - {}", project_key, status, error_text));
        }
        
        let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        
        if let Some(issues) = data["issues"].as_array() {
            all_issues.extend(issues.clone());
            // Collect parent keys from children
            for issue in issues {
                if let Some(parent) = issue["fields"]["parent"]["key"].as_str() {
                    parent_keys.insert(parent.to_string());
                }
            }
        }
        
        total = data["total"].as_u64().unwrap_or(0);
        start_at += max_results;
        
        if all_issues.len() >= total as usize {
            break;
        }
    }
    
    // Second pass: fetch any missing parents
    let existing_keys: std::collections::HashSet<String> = all_issues
        .iter()
        .filter_map(|issue| issue["key"].as_str())
        .map(|s| s.to_string())
        .collect();
    
    let missing_parent_keys: Vec<String> = parent_keys
        .into_iter()
        .filter(|k| !existing_keys.contains(k))
        .collect();
    
    if !missing_parent_keys.is_empty() {
        // Fetch missing parents in batches of 50 (Jira JQL limit)
        for chunk in missing_parent_keys.chunks(50) {
            let keys_str = chunk.iter().map(|k| format!("'{}'", k)).collect::<Vec<_>>().join(",");
            let jql = format!("key in ({})", keys_str);
            let url = format!("{}/rest/api/3/search", config.base_url.trim_end_matches('/'));
            
            let params = [
                ("jql", jql.as_str()),
                ("fields", "summary,status,issuetype,parent,customfield_10014,assignee,customfield_10001"),
            ];
            
            match client
                .get(&url)
                .header("Authorization", format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(format!("{}:{}", config.email, config.api_token))))
                .header("Accept", "application/json")
                .query(&params)
                .send()
                .await
            {
                Ok(response) => {
                    if response.status().is_success() {
                        if let Ok(data) = response.json::<serde_json::Value>().await {
                            if let Some(issues) = data["issues"].as_array() {
                                all_issues.extend(issues.clone());
                            }
                        }
                    }
                }
                Err(_) => continue, // Skip failed parent fetches
            }
        }
    }
    
    Ok(all_issues)
}

// Helper function to organize issues into columns
fn organize_issues_into_columns(issues: &[serde_json::Value]) -> serde_json::Value {
    let mut columns: HashMap<String, Vec<serde_json::Value>> = HashMap::new();
    
    // Initialize columns
    let column_keys = vec!["4.1", "4.2", "4.3", "4.4", "4.5IP", "uncommitted"];
    for key in column_keys {
        columns.insert(key.to_string(), Vec::new());
    }
    
    // Group issues by iteration (customfield_10014)
    for issue in issues {
        let iteration = issue["fields"]["customfield_10014"]
            .as_str()
            .unwrap_or("uncommitted");
        let column_key = iteration.to_string();
        
        if !columns.contains_key(&column_key) {
            columns.insert(column_key.clone(), Vec::new());
        }
        
        // Create epic structure
        let epic = serde_json::json!({
            "key": issue["key"],
            "summary": issue["fields"]["summary"],
            "status": issue["fields"]["status"]["name"],
            "statusCategory": issue["fields"]["status"]["statusCategory"]["name"],
            "team": issue["fields"]["assignee"]["displayName"].as_str().unwrap_or("Unassigned"),
            "url": format!("https://jira.atlassian.com/browse/{}", issue["key"].as_str().unwrap_or("")),
            "stories": []
        });
        
        columns.get_mut(&column_key).unwrap().push(epic);
    }
    
    serde_json::json!({ "columns": columns })
}

#[tauri::command]
async fn refresh_all_data(config: JiraConfig) -> Result<RefreshResponse, String> {
    let mut results: HashMap<String, serde_json::Value> = HashMap::new();
    let mut errors: HashMap<String, String> = HashMap::new();
    let mut files_updated: Vec<String> = Vec::new();
    
    // Define projects to refresh
    let projects = vec![
        ("ADVICE", "board-saveAdvice.json"),
        ("PDD", "board-savePDD.json"),
    ];
    
    for (project_key, filename) in &projects {
        match fetch_project_data(&config, project_key).await {
            Ok(issues) => {
                if !issues.is_empty() {
                    let columns_data = organize_issues_into_columns(&issues);
                    
                    // Save to both public directories
                    let public_dirs = vec![
                        "public", // Main public directory
                        "../public", // Parent public directory (for Next.js)
                    ];
                    
                    for public_dir in public_dirs {
                        if Path::new(public_dir).exists() {
                            let file_path = format!("{}/{}", public_dir, filename);
                            match fs::write(&file_path, serde_json::to_string_pretty(&columns_data).unwrap()) {
                                Ok(_) => println!("Successfully updated {} with {} issues", file_path, issues.len()),
                                Err(e) => eprintln!("Failed to write {}: {}", file_path, e),
                            }
                        }
                    }
                    
                    results.insert(project_key.to_string(), serde_json::json!({
                        "issues": issues.len(),
                        "columns": columns_data["columns"].as_object().unwrap().len()
                    }));
                    files_updated.push(filename.to_string());
                } else {
                    errors.insert(project_key.to_string(), "No issues found".to_string());
                }
            }
            Err(e) => {
                errors.insert(project_key.to_string(), e);
            }
        }
    }
    
    if files_updated.is_empty() {
        return Err("Failed to refresh any data. All projects failed.".to_string());
    }
    
    Ok(RefreshResponse {
        success: true,
        message: format!("Data refreshed successfully. Updated {} of {} projects.", files_updated.len(), projects.len()),
        files_updated,
        results,
        errors: if errors.is_empty() { None } else { Some(errors) },
    })
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
      fetch_jira_data,
      refresh_all_data
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
