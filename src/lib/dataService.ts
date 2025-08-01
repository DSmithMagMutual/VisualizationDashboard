export interface DataSource {
  [key: string]: any;
}

export const dataSources: Record<string, string> = {
  'board-saveAdvice': 'board-saveAdvice.json',
  'board-savePDD': 'board-savePDD.json',
  'test-relationships': 'test-relationships.json',
};

export async function loadDataSource(sourceKey: string): Promise<DataSource | null> {
  try {
    const fileName = dataSources[sourceKey];
    if (!fileName) {
      console.error(`Unknown data source: ${sourceKey}`);
      return null;
    }

    const response = await fetch(`/${fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${fileName}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error loading data source ${sourceKey}:`, error);
    return null;
  }
}

export async function loadAllDataSources(): Promise<Record<string, DataSource>> {
  const results: Record<string, DataSource> = {};
  
  for (const [key, fileName] of Object.entries(dataSources)) {
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