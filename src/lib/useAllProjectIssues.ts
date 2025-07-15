import { useQuery } from '@tanstack/react-query';
import { getAllProjectIssues } from './jira-proxy';

export function useAllProjectIssues(projectKey: string) {
  return useQuery({
    queryKey: ['allProjectIssues', projectKey],
    queryFn: () => getAllProjectIssues(projectKey),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!projectKey,
  });
} 