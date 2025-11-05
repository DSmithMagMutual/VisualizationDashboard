use serde::{Deserialize, Serialize};
use base64::Engine;
use std::fs;
use std::path::Path;
use tauri::Manager;

// Cross-platform function to get home directory
fn get_home_dir() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE")
            .map_err(|_| "Could not determine Windows user profile directory".to_string())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME")
            .map_err(|_| "Could not determine home directory".to_string())
    }
}

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
    // Use standard system directories for config storage
    let home_dir = get_home_dir()?;
    
    let config_dir = std::path::Path::new(&home_dir).join(".jira-dashboard");
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    let config_file = config_dir.join("jira-config.json");
    let config_json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    fs::write(&config_file, config_json)
        .map_err(|e| format!("Failed to write config file: {}", e))?;
    
    println!("Jira config saved to: {:?}", config_file);
    Ok(())
}

#[tauri::command]
async fn load_jira_config() -> Result<Option<JiraConfig>, String> {
    // Use standard system directories for config storage
    let home_dir = get_home_dir()?;
    
    let config_file = std::path::Path::new(&home_dir).join(".jira-dashboard").join("jira-config.json");
    
    if !config_file.exists() {
        println!("Config file does not exist: {:?}", config_file);
        return Ok(None);
    }
    
    let config_content = fs::read_to_string(&config_file)
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    
    let config: JiraConfig = serde_json::from_str(&config_content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;
    
    println!("Jira config loaded from: {:?}", config_file);
    Ok(Some(config))
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
    let url = format!("{}/rest/api/3/search/jql", config.base_url.trim_end_matches('/'));
    
    let jql = format!("project = {} ORDER BY created DESC", project_key);
    let params = [
        ("jql", jql.as_str()),
        ("maxResults", "1000"),
        ("fields", "summary,status,issuetype,parent,customfield_10014,assignee,customfield_10001,issuelinks"),
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

#[tauri::command]
async fn fetch_card_data(config: JiraConfig, issue_key: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    // Fetch specific issue data
    let url = format!("{}/rest/api/3/issue/{}", config.base_url.trim_end_matches('/'), issue_key);
    
    let params = [
        ("fields", "summary,status,issuetype,parent,customfield_10014,assignee,customfield_10001,subtasks,issuelinks,duedate"),
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
        Err(format!("Failed to fetch card data: {} - {}", status, error_text))
    }
}

#[tauri::command]
async fn fetch_child_issues(config: JiraConfig, parent_key: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    // Fetch child issues for a parent
    let url = format!("{}/rest/api/3/search/jql", config.base_url.trim_end_matches('/'));
    
    // Use the most reliable JQL approach for finding child issues
    // 1. Direct subtasks: parent = KEY
    // 2. Epic children: "Epic Link" = KEY (company-managed) or parentEpic = KEY (team-managed)
    let jql = format!(
        "parent = {} OR \"Epic Link\" = {} OR parentEpic = {}",
        parent_key, parent_key, parent_key
    );
    let params = [
        ("jql", &jql),
        (
            "fields",
            &"summary,status,issuetype,key,parent,issuelinks,customfield_10014,customfield_10001".to_string(),
        ),
        ("maxResults", &"1000".to_string()),
    ];
    
    println!("Fetching child issues for {} with JQL: {}", parent_key, jql);
    
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
        let total_issues = data["total"].as_u64().unwrap_or(0);
        println!("Child issues response for {}: {} issues found", parent_key, total_issues);
        
        if total_issues > 0 {
            println!("Child issue keys found: {:?}", 
                data["issues"].as_array()
                    .map(|issues| issues.iter()
                        .map(|issue| issue["key"].as_str().unwrap_or("unknown"))
                        .collect::<Vec<_>>())
                    .unwrap_or_default()
            );
        }
        
        Ok(data)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        println!("Failed to fetch child issues for {}: {} - {}", parent_key, status, error_text);
        Err(format!("Failed to fetch child issues: {} - {}", status, error_text))
    }
}

#[tauri::command]
async fn test_child_issue_query(config: JiraConfig, parent_key: String, child_key: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    // Test if a specific child issue exists and what its parent/epic relationship is
    let url = format!("{}/rest/api/3/issue/{}", config.base_url.trim_end_matches('/'), child_key);
    
    let params = [
        ("fields", "summary,status,issuetype,key,parent,issuelinks,customfield_10014,customfield_10001"),
    ];
    
    println!("Testing child issue {} for parent {}", child_key, parent_key);
    
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
        println!("Child issue {} details: {:?}", child_key, data);
        Ok(data)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        println!("Failed to fetch child issue {}: {} - {}", child_key, status, error_text);
        Err(format!("Failed to fetch child issue: {} - {}", status, error_text))
    }
}

#[tauri::command]
async fn create_subtask(config: JiraConfig, parent_key: String, summary: String, description: Option<String>, assignee_email: Option<String>, priority: Option<String>) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    // Create a new sub-task under the parent issue
    let url = format!("{}/rest/api/3/issue", config.base_url.trim_end_matches('/'));
    
    let mut fields = serde_json::Map::new();
    
    // Set parent
    let mut parent_obj = serde_json::Map::new();
    parent_obj.insert("key".to_string(), serde_json::Value::String(parent_key.clone()));
    fields.insert("parent".to_string(), serde_json::Value::Object(parent_obj));
    
    // Set project (extract from parent key)
    let project_key = parent_key.split('-').next().unwrap_or("ADVICE");
    let mut project_obj = serde_json::Map::new();
    project_obj.insert("key".to_string(), serde_json::Value::String(project_key.to_string()));
    fields.insert("project".to_string(), serde_json::Value::Object(project_obj));
    
    // Set issue type to Sub-task
    let mut issue_type_obj = serde_json::Map::new();
    issue_type_obj.insert("name".to_string(), serde_json::Value::String("Sub-task".to_string()));
    fields.insert("issuetype".to_string(), serde_json::Value::Object(issue_type_obj));
    
    // Set summary
    fields.insert("summary".to_string(), serde_json::Value::String(summary.clone()));
    
    // Set description if provided
    if let Some(desc) = description {
        fields.insert("description".to_string(), serde_json::Value::String(desc));
    }
    
    // Set assignee if provided
    if let Some(email) = assignee_email {
        let mut assignee_obj = serde_json::Map::new();
        assignee_obj.insert("emailAddress".to_string(), serde_json::Value::String(email));
        fields.insert("assignee".to_string(), serde_json::Value::Object(assignee_obj));
    }
    
    // Set priority if provided
    if let Some(pri) = priority {
        let mut priority_obj = serde_json::Map::new();
        priority_obj.insert("name".to_string(), serde_json::Value::String(pri));
        fields.insert("priority".to_string(), serde_json::Value::Object(priority_obj));
    }
    
    let request_body = serde_json::json!({
        "fields": fields
    });
    
    println!("Creating sub-task for parent {}: {}", parent_key, summary);
    
    let response = client
        .post(&url)
        .header("Authorization", format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(format!("{}:{}", config.email, config.api_token))))
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        println!("Sub-task created successfully: {:?}", data);
        Ok(data)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        println!("Failed to create sub-task: {} - {}", status, error_text);
        Err(format!("Failed to create sub-task: {} - {}", status, error_text))
    }
}

#[tauri::command]
async fn get_issue_with_children(config: JiraConfig, issue_key: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    // Get issue with its sub-tasks
    let url = format!("{}/rest/api/3/issue/{}", config.base_url.trim_end_matches('/'), issue_key);
    
    let params = [
        ("fields", "summary,status,issuetype,assignee,priority,description,created,updated,subtasks,parent"),
        ("expand", "subtasks"),
    ];
    
    println!("Fetching issue with children: {}", issue_key);
    
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
        println!("Issue with children fetched successfully: {}", issue_key);
        Ok(data)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        println!("Failed to fetch issue with children {}: {} - {}", issue_key, status, error_text);
        Err(format!("Failed to fetch issue with children: {} - {}", status, error_text))
    }
}

#[tauri::command]
async fn update_subtask(config: JiraConfig, subtask_key: String, summary: Option<String>, description: Option<String>, assignee_email: Option<String>, priority: Option<String>) -> Result<(), String> {
    let client = reqwest::Client::new();
    
    // Update a sub-task
    let url = format!("{}/rest/api/3/issue/{}", config.base_url.trim_end_matches('/'), subtask_key);
    
    let mut fields = serde_json::Map::new();
    
    if let Some(sum) = summary {
        fields.insert("summary".to_string(), serde_json::Value::String(sum));
    }
    
    if let Some(desc) = description {
        fields.insert("description".to_string(), serde_json::Value::String(desc));
    }
    
    if let Some(email) = assignee_email {
        let mut assignee_obj = serde_json::Map::new();
        assignee_obj.insert("emailAddress".to_string(), serde_json::Value::String(email));
        fields.insert("assignee".to_string(), serde_json::Value::Object(assignee_obj));
    }
    
    if let Some(pri) = priority {
        let mut priority_obj = serde_json::Map::new();
        priority_obj.insert("name".to_string(), serde_json::Value::String(pri));
        fields.insert("priority".to_string(), serde_json::Value::Object(priority_obj));
    }
    
    let request_body = serde_json::json!({
        "fields": fields
    });
    
    println!("Updating sub-task: {}", subtask_key);
    
    let response = client
        .put(&url)
        .header("Authorization", format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(format!("{}:{}", config.email, config.api_token))))
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        println!("Sub-task updated successfully: {}", subtask_key);
        Ok(())
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        println!("Failed to update sub-task {}: {} - {}", subtask_key, status, error_text);
        Err(format!("Failed to update sub-task: {} - {}", status, error_text))
    }
}

#[tauri::command]
async fn save_board_data(board_data: serde_json::Value, file_name: String) -> Result<(), String> {
    let home_dir = get_home_dir()?;
    
    let config_dir = std::path::Path::new(&home_dir).join(".jira-dashboard");
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    let board_file = config_dir.join(&file_name);
    let board_json = serde_json::to_string_pretty(&board_data)
        .map_err(|e| format!("Failed to serialize board data: {}", e))?;
    
    fs::write(&board_file, board_json)
        .map_err(|e| format!("Failed to write board file: {}", e))?;
    
    println!("Board data saved to: {:?}", board_file);
    Ok(())
}

#[tauri::command]
async fn save_board_data_to_public(board_data: serde_json::Value, file_name: String, app: tauri::AppHandle) -> Result<String, String> {
    // Get Downloads directory
    let downloads_dir = app.path().download_dir()
        .map_err(|_| "Could not determine Downloads directory")?;

    // Create JiraDashboard subdirectory
    let jira_dashboard_dir = downloads_dir.join("JiraDashboard");
    
    // Create the directory if it doesn't exist
    if !jira_dashboard_dir.exists() {
        fs::create_dir_all(&jira_dashboard_dir)
            .map_err(|e| format!("Failed to create JiraDashboard directory: {}", e))?;
    }

    let board_file = jira_dashboard_dir.join(&file_name);
    let board_json = serde_json::to_string_pretty(&board_data)
        .map_err(|e| format!("Failed to serialize board data: {}", e))?;

    fs::write(&board_file, board_json)
        .map_err(|e| format!("Failed to write board file: {}", e))?;

    let file_path = board_file.to_string_lossy().to_string();
    println!("Board data saved to JiraDashboard folder: {}", file_path);

    Ok(file_path)
}

#[tauri::command]
async fn load_board_data(file_name: String, app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    // Load from JiraDashboard subdirectory in Downloads
    let downloads_dir = app.path().download_dir()
        .map_err(|_| "Could not determine Downloads directory")?;

    let jira_dashboard_dir = downloads_dir.join("JiraDashboard");
    let board_file = jira_dashboard_dir.join(&file_name);

    if board_file.exists() {
        let board_content = fs::read_to_string(&board_file)
            .map_err(|e| format!("Failed to read board file: {}", e))?;

        let board_data: serde_json::Value = serde_json::from_str(&board_content)
            .map_err(|e| format!("Failed to parse board data: {}", e))?;

        println!("Board data loaded from JiraDashboard folder: {:?}", board_file);
        return Ok(Some(board_data));
    }

    println!("Board file does not exist in JiraDashboard folder: {:?}", board_file);
    Ok(None)
}

#[tauri::command]
async fn initialize_data_directory(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|_| "Could not determine app data directory")?;
    
    let data_dir = app_dir.join("data");
    
    // Create data directory if it doesn't exist
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn copy_json_files_to_data_directory(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|_| "Could not determine app data directory")?;
    
    let data_dir = app_dir.join("data");
    
    // Ensure data directory exists
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    
    // List of JSON files to copy
    let json_files = vec![
        "board-saveAdvice.json",
        "board-savePDD.json",
    ];
    
    let mut copied_files = Vec::new();
    
    for file_name in json_files {
        // Try to read from the public directory (during development)
        let public_path = Path::new("public").join(file_name);
        let data_path = data_dir.join(file_name);
        
        // Only copy if the file doesn't already exist in data directory
        if !data_path.exists() {
            if public_path.exists() {
                // Copy from public directory
                fs::copy(&public_path, &data_path)
                    .map_err(|e| format!("Failed to copy {}: {}", file_name, e))?;
                copied_files.push(file_name.to_string());
            } else {
                // Try to read from the app's resource directory
                let resource_path = app.path().resource_dir()
                    .map_err(|_| "Could not determine resource directory")?
                    .join(file_name);
                
                if resource_path.exists() {
                    fs::copy(&resource_path, &data_path)
                        .map_err(|e| format!("Failed to copy {}: {}", file_name, e))?;
                    copied_files.push(file_name.to_string());
                } else {
                    println!("Warning: Could not find {} in public or resource directories", file_name);
                }
            }
        } else {
            println!("File {} already exists in data directory", file_name);
        }
    }
    
    Ok(copied_files)
}

#[tauri::command]
async fn read_json_file_from_data_directory(app: tauri::AppHandle, file_name: String) -> Result<String, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|_| "Could not determine app data directory")?;
    
    let file_path = app_dir.join("data").join(&file_name);
    
    if !file_path.exists() {
        return Err(format!("File {} not found in data directory", file_name));
    }
    
    fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read {}: {}", file_name, e))
}

#[tauri::command]
async fn list_data_directory_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|_| "Could not determine app data directory")?;
    
    let data_dir = app_dir.join("data");
    
    if !data_dir.exists() {
        return Ok(Vec::new());
    }
    
    let entries = fs::read_dir(&data_dir)
        .map_err(|e| format!("Failed to read data directory: {}", e))?;
    
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Some(file_name) = entry.file_name().to_str() {
                if file_name.ends_with(".json") {
                    files.push(file_name.to_string());
                }
            }
        }
    }
    
    Ok(files)
}

#[tauri::command]
async fn open_data_directory(app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|_| "Could not determine app data directory")?;
    
    let data_dir = app_dir.join("data");
    
    if !data_dir.exists() {
        return Err("Data directory does not exist".to_string());
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .arg(data_dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(data_dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(data_dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
async fn get_downloads_directory(app: tauri::AppHandle) -> Result<String, String> {
    let downloads_dir = app.path().download_dir()
        .map_err(|_| "Could not determine Downloads directory")?;
    Ok(downloads_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn list_downloads_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let downloads_dir = app.path().download_dir()
        .map_err(|_| "Could not determine Downloads directory")?;
    
    let jira_dashboard_dir = downloads_dir.join("JiraDashboard");
    
    if !jira_dashboard_dir.exists() {
        return Ok(Vec::new());
    }
    
    let entries = fs::read_dir(&jira_dashboard_dir)
        .map_err(|e| format!("Failed to read JiraDashboard directory: {}", e))?;
    
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Some(file_name) = entry.file_name().to_str() {
                if file_name.ends_with(".json") {
                    files.push(file_name.to_string());
                }
            }
        }
    }
    
    Ok(files)
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
      fetch_card_data,
      fetch_child_issues,
      test_child_issue_query,
      create_subtask,
      get_issue_with_children,
      update_subtask,
      save_board_data,
      save_board_data_to_public,
      load_board_data,
      get_downloads_directory,
      list_downloads_files
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
