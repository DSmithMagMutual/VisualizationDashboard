import { loadBoardData } from './jiraDataService';

export interface DataSource {
  [key: string]: any;
  lastUpdated?: string;
  source?: 'jira' | 'static';
  projectKey?: string;
}

export const dataSources: Record<string, string> = {
  'board-saveAdvice': 'board-saveAdvice.json',
  'board-savePDD': 'board-savePDD.json',
};

export async function loadDataSource(sourceKey: string): Promise<DataSource | null> {
  try {
    const fileName = dataSources[sourceKey];
    if (!fileName) {
      console.error(`Unknown data source: ${sourceKey}`);
      return null;
    }

    // Prefer public file first for dev parity with browser
    console.log(`Attempting to load from public: ${fileName}`);
    let data: any | null = null;
    try {
      const response = await fetch(`/${fileName}`);
      if (response.ok) {
        data = await response.json();
        console.log(`Loaded ${fileName} from public`);
      } else {
        console.warn(`Public fetch failed for ${fileName}: ${response.statusText}`);
      }
    } catch (e) {
      console.warn(`Public fetch error for ${fileName}:`, e);
    }

    // Fallback to saved board data in ~/.jira-dashboard if public missing/unavailable
    if (!data) {
      console.log(`Falling back to saved board data: ${fileName}`);
      const savedData = await loadBoardData(fileName);
      if (savedData) {
        data = savedData as DataSource;
      } else {
        throw new Error(`Neither public nor saved data available for ${sourceKey}`);
      }
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