import { invoke } from '@tauri-apps/api/core';

export interface DataSource {
  [key: string]: any;
  lastUpdated?: string;
  source?: 'jira' | 'static';
  projectKey?: string;
}

export const dataSources: Record<string, string> = {
  'board-saveAdvice': 'board-saveAdvice.json',
  'board-saveAdvice-PI5': 'board-saveAdvice-PI5.json',
  'board-savePDD': 'board-savePDD.json',
};

export async function loadDataSource(sourceKey: string): Promise<DataSource | null> {
  try {
    const fileName = dataSources[sourceKey];
    if (!fileName) {
      console.error(`Unknown data source: ${sourceKey}`);
      return null;
    }

    console.log(`[dataService] Loading data source: ${sourceKey} -> ${fileName}`);

    // Resolve single source of truth: ~/.jira-dashboard/<fileName>
    // If missing, bootstrap by copying from app data 'data' folder (if present),
    // otherwise fall back to public file and then save into config dir for next time.
    const configDir = await invoke<string>('get_config_directory_path');
    const pathInConfig = `${configDir}/${fileName}`;

    // Try to read file via Rust side (load_board_data expects fileName only in config dir)
    let data: any | null = await invoke('load_board_data', { fileName });
    if (!data) {
      console.log(`[dataService] No config copy; attempting to bootstrap from public file: ${fileName}`);
      const response = await fetch(`/${fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${fileName}: ${response.statusText}`);
      }
      data = await response.json();
      try {
        await invoke('save_board_data', { boardData: data, fileName });
        console.log(`[dataService] Bootstrapped ${fileName} into ${pathInConfig}`);
      } catch (e) {
        console.warn(`[dataService] Failed to persist bootstrap for ${fileName}:`, e);
      }
    } else {
      console.log(`[dataService] Loaded from single source: ${pathInConfig}`);
    }
    
    // Add metadata if not present
    if (!data.lastUpdated) {
      data.lastUpdated = new Date().toISOString();
    }
    if (!data.source) {
      data.source = 'static';
    }
    if (!data.projectKey) {
      data.projectKey = sourceKey;
    }
    
    // Log data structure for debugging
    console.log(`[dataService] Loaded data for ${sourceKey}:`, {
      hasColumns: !!data.columns,
      columnKeys: data.columns ? Object.keys(data.columns) : [],
      totalCards: data.columns ? Object.values(data.columns).flat().length : 0,
      cardsWithStories: data.columns ? Object.values(data.columns).flat().filter((card: any) => card.stories && card.stories.length > 0).length : 0
    });
    
    return data;
  } catch (error) {
    console.error(`Error loading data source ${sourceKey}:`, error);
    return null;
  }
}

export async function loadAllDataSources(): Promise<Record<string, DataSource>> {
  const results: Record<string, DataSource> = {};
  
  for (const [key] of Object.entries(dataSources)) {
    try {
      const data = await loadDataSource(key);
      if (data) {
        results[key] = data;
      }
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
    }
  }
  
  return results;
} 