// Removed loadBoardData import - now only using public files

export interface DataSource {
  [key: string]: any;
  lastUpdated?: string;
  source?: 'jira' | 'static';
  projectKey?: string;
}

export const dataSources: Record<string, string> = {
  'board-saveAdvice': 'board-saveAdvice.json',
  'board-savePDD': 'board-savePDD.json',
  'board-savePI5Advice': 'board-savePI5Advice.json',
  'board-savePI5PDD': 'board-savePI5PDD.json',
};

export async function loadDataSource(sourceKey: string): Promise<DataSource | null> {
  try {
    const fileName = dataSources[sourceKey];
    if (!fileName) {
      console.error(`Unknown data source: ${sourceKey}`);
      return null;
    }

    console.log(`Loading from Downloads: ${fileName}`);
    
    const { invoke } = await import('@tauri-apps/api/core');
    const data: any = await invoke('load_board_data', { fileName });
    
    if (data) {
      console.log(`Successfully loaded ${fileName} from Downloads`);
      
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
      
      return data;
    }
    
    // If not found in Downloads, fall back to public files
    console.log(`File not found in Downloads, trying public files...`);
    const response = await fetch(`/${fileName}?t=${Date.now()}`);
    if (response.ok) {
      const data: any = await response.json();
      console.log(`Successfully loaded ${fileName} from public files`);
      
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
      
      return data;
    }
    
    console.error(`Could not load ${fileName} from any source`);
    return null;
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