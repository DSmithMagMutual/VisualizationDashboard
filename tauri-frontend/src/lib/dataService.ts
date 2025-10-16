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

    // First, try to load saved board data
    console.log(`Checking for saved board data: ${fileName}`);
    const savedData = await loadBoardData(fileName);
    
    if (savedData) {
      console.log(`Found saved board data for ${sourceKey}, loading from saved file`);
      return savedData as DataSource;
    }

    // If no saved data, load from original public files
    console.log(`No saved data found for ${sourceKey}, loading from original file`);
    const response = await fetch(`/${fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${fileName}: ${response.statusText}`);
    }

    const data = await response.json();
    
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