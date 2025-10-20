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

    // Only load from public files - no fallback to private saved files
    console.log(`Loading from public file: ${fileName}`);
    const response = await fetch(`/${fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${fileName}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully loaded ${fileName} from public`);
    
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