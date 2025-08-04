export interface DataSource {
  [key: string]: any;
}

export const dataSources: Record<string, string> = {
  'board-saveAdvice': 'board-saveAdvice.json',
  'board-savePDD': 'board-savePDD.json',
};

// Dynamic data sources that can be added at runtime
export const dynamicDataSources: Record<string, any> = {};

export function addDynamicDataSource(key: string, data: any) {
  dynamicDataSources[key] = data;
}

export function removeDynamicDataSource(key: string) {
  delete dynamicDataSources[key];
}

export function getDynamicDataSource(key: string): any {
  return dynamicDataSources[key];
}

export function getAllDataSources(): Record<string, string> {
  return { ...dataSources };
}

export function getAllDynamicDataSources(): Record<string, any> {
  return { ...dynamicDataSources };
}

export async function loadDataSource(sourceKey: string): Promise<DataSource | null> {
  try {
    // Check if it's a dynamic data source first
    if (dynamicDataSources[sourceKey]) {
      return dynamicDataSources[sourceKey];
    }

    // Check if it's a static data source
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
  
  // Load static data sources
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

  // Add dynamic data sources
  Object.entries(dynamicDataSources).forEach(([key, data]) => {
    results[key] = data;
  });
  
  return results;
} 