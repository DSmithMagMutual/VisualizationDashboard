import { invoke } from '@tauri-apps/api/core';

export interface IterationConfigItem {
	key: string;
	label: string;
	startDate?: string;
	endDate?: string;
}

export type IterationsConfig = IterationConfigItem[];

export async function loadIterations(): Promise<IterationsConfig | null> {
	try {
		const result = await invoke('load_iterations_config');
		if (!result) return null;
		// Rust returns { 0: [...] } because of tuple struct; normalize
		const vec = (result as any)[0] ?? result;
		return Array.isArray(vec) ? (vec as IterationsConfig) : null;
	} catch (err) {
		console.error('Failed to load iterations config:', err);
		return null;
	}
}

export async function saveIterations(iterations: IterationsConfig): Promise<void> {
	try {
		// Wrap in tuple to match Rust IterationsConfig tuple struct
		await invoke('save_iterations_config', { iterations: [ ...iterations ] });
	} catch (err) {
		throw new Error(err instanceof Error ? err.message : 'Failed to save iterations');
	}
}

export function getIterationEndDates(iterations: IterationsConfig): Record<string, Date> {
	const map: Record<string, Date> = {};
	for (const iter of iterations) {
		if (iter.endDate) {
			const d = new Date(iter.endDate);
			if (!isNaN(d.getTime())) {
				map[iter.key] = d;
			}
		}
	}
	return map;
}


