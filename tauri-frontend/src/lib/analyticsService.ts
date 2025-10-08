export interface TeamPerformanceMetrics {
  team: string;
  averageStoryCompletion: number; // days
  averageEpicCompletion: number; // days
  statusEfficiency: Record<string, number>; // status -> average days
  totalIssues: number;
  completedIssues: number;
  completionRate: number;
  teamVelocity: number; // issues completed per iteration
  bottleneckStatuses: string[];
  recommendedActions: string[];
}

export interface StatusDurationAnalysis {
  status: string;
  averageDuration: number; // days
  teamBreakdown: Record<string, number>; // team -> average days
  totalIssues: number;
  standardDeviation: number;
  confidenceInterval: { min: number; max: number };
  trend: 'improving' | 'stable' | 'declining';
}

export interface IssueTimeline {
  key: string;
  summary: string;
  team: string;
  currentStatus: string;
  estimatedCompletion: number; // days
  statusHistory: Array<{
    status: string;
    estimatedDuration: number;
    teamEfficiency: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  teamPerformance: {
    averageVelocity: number;
    reliabilityScore: number;
    riskFactors: string[];
  };
}

export interface EpicProgressAnalysis {
  epicKey: string;
  summary: string;
  team: string;
  overallProgress: number;
  estimatedCompletion: number; // days
  childStories: Array<{
    key: string;
    status: string;
    team: string;
    estimatedCompletion: number;
    riskLevel: 'low' | 'medium' | 'high';
    dependencies: string[];
  }>;
  criticalPath: string[];
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    riskFactors: string[];
    mitigationStrategies: string[];
  };
  teamPerformance: {
    velocity: number;
    reliability: number;
    capacity: number;
  };
}

export class AnalyticsService {
  private data: any;
  private teamMetrics: Map<string, TeamPerformanceMetrics> = new Map();
  private statusMetrics: Map<string, StatusDurationAnalysis> = new Map();

  constructor(data: any) {
    this.data = data;
    this.analyzeData();
  }

  private analyzeData() {
    this.calculateTeamMetrics();
    this.calculateStatusMetrics();
  }

  private calculateTeamMetrics() {
    const teamData = new Map<string, {
      stories: any[];
      epics: any[];
      totalIssues: number;
      completedIssues: number;
      statusCounts: Record<string, number>;
    }>();

    // Collect all data by team
    Object.entries(this.data.columns).forEach(([, epics]) => {
      (epics as any[]).forEach((epic: any) => {
        const epicTeam = epic.team || 'Unknown';
        const epicData = teamData.get(epicTeam) || {
          stories: [],
          epics: [],
          totalIssues: 0,
          completedIssues: 0,
          statusCounts: {}
        };

        epicData.epics.push(epic);
        epicData.totalIssues += 1;
        if (epic.statusCategory === 'done') {
          epicData.completedIssues += 1;
        }

        // Count statuses
        epicData.statusCounts[epic.status] = (epicData.statusCounts[epic.status] || 0) + 1;

        // Process child stories
        if (epic.stories) {
          epic.stories.forEach((story: any) => {
            const storyTeam = story.team || epicTeam;
            const storyData = teamData.get(storyTeam) || {
              stories: [],
              epics: [],
              totalIssues: 0,
              completedIssues: 0,
              statusCounts: {}
            };

            storyData.stories.push(story);
            storyData.totalIssues += 1;
            if (story.statusCategory === 'done') {
              storyData.completedIssues += 1;
            }

            storyData.statusCounts[story.status] = (storyData.statusCounts[story.status] || 0) + 1;
            teamData.set(storyTeam, storyData);
          });
        }

        teamData.set(epicTeam, epicData);
      });
    });

    // Calculate metrics for each team
    teamData.forEach((data, team) => {
      const metrics: TeamPerformanceMetrics = {
        team,
        averageStoryCompletion: this.calculateAverageCompletion(data.stories),
        averageEpicCompletion: this.calculateAverageCompletion(data.epics),
        statusEfficiency: this.calculateStatusEfficiency(data.stories, data.epics),
        totalIssues: data.totalIssues,
        completedIssues: data.completedIssues,
        completionRate: data.totalIssues > 0 ? (data.completedIssues / data.totalIssues) * 100 : 0,
        teamVelocity: this.calculateTeamVelocity(data.stories, data.epics),
        bottleneckStatuses: this.identifyBottlenecks(data.statusCounts),
        recommendedActions: this.generateRecommendations(data, team)
      };

      this.teamMetrics.set(team, metrics);
    });
  }

  private calculateStatusMetrics() {
    const statusData = new Map<string, {
      totalIssues: number;
      teamDurations: Record<string, number[]>;
      allDurations: number[];
    }>();

    // Collect duration data for each status
    Object.entries(this.data.columns).forEach(([iteration, epics]) => {
      (epics as any[]).forEach((epic: any) => {
        this.addStatusData(statusData, epic.status, epic.team || 'Unknown', iteration);
        
        if (epic.stories) {
          epic.stories.forEach((story: any) => {
            this.addStatusData(statusData, story.status, story.team || epic.team || 'Unknown', iteration);
          });
        }
      });
    });

    // Calculate metrics for each status
    statusData.forEach((data, status) => {
      const allDurations = data.allDurations;
      const averageDuration = allDurations.length > 0 ? 
        allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length : 0;

      const teamBreakdown: Record<string, number> = {};
      Object.entries(data.teamDurations).forEach(([team, durations]) => {
        teamBreakdown[team] = durations.length > 0 ? 
          durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
      });

      const standardDeviation = this.calculateStandardDeviation(allDurations);
      const confidenceInterval = this.calculateConfidenceInterval(allDurations, averageDuration, standardDeviation);

      const analysis: StatusDurationAnalysis = {
        status,
        averageDuration,
        teamBreakdown,
        totalIssues: data.totalIssues,
        standardDeviation,
        confidenceInterval,
        trend: this.determineTrend(allDurations)
      };

      this.statusMetrics.set(status, analysis);
    });
  }

  private addStatusData(statusData: Map<string, any>, status: string, team: string, iteration: string) {
    const data = statusData.get(status) || {
      totalIssues: 0,
      teamDurations: {},
      allDurations: []
    };

    data.totalIssues += 1;
    
    // Simulate duration based on team and status (in real scenario, this would come from actual timestamps)
    const duration = this.simulateDuration(status, team, iteration);
    data.allDurations.push(duration);
    
    if (!data.teamDurations[team]) {
      data.teamDurations[team] = [];
    }
    data.teamDurations[team].push(duration);
    
    statusData.set(status, data);
  }

  private simulateDuration(status: string, team: string, iteration: string): number {
    // Base durations by status (in days)
    const baseDurations: Record<string, number> = {
      'OPEN': 2,
      'Ready': 1,
      'Creating': 5,
      'In Progress': 7,
      'Testing': 4,
      'Validating': 3,
      'Under Review': 4,
      'Ready for Release': 2,
      'Done': 0,
      'Complete': 0
    };

        // Calculate real team efficiency from actual data
    const getTeamEfficiency = (team: string): number => {
      const teamMetrics = this.teamMetrics.get(team);
      if (teamMetrics) {
        // Base efficiency on completion rate and velocity
        const completionEfficiency = teamMetrics.completionRate / 100;
        const velocityEfficiency = Math.min(teamMetrics.teamVelocity / 10, 1); // Normalize to 0-1
        return (completionEfficiency * 0.7) + (velocityEfficiency * 0.3);
      }
      return 0.8; // Default if no team data available
    };
    
    // Iteration pressure (later iterations have more pressure)
    const iterationPressure = this.getIterationPressure(iteration);

    const baseDuration = baseDurations[status] || 3;
    const teamMultiplier = getTeamEfficiency(team);
    const pressureMultiplier = iterationPressure;

    return Math.round(baseDuration * teamMultiplier * pressureMultiplier);
  }

  private getIterationPressure(iteration: string): number {
    const iterationOrder = ['4.1', '4.2', '4.3', '4.4', '4.5IP'];
    const index = iterationOrder.indexOf(iteration);
    if (index === -1) return 1.0;
    
    // Later iterations have more pressure (shorter durations)
    return 1.0 - (index * 0.1);
  }

  private calculateAverageCompletion(issues: any[]): number {
    if (issues.length === 0) return 0;
    
    const completedIssues = issues.filter(issue => issue.statusCategory === 'done');
    if (completedIssues.length === 0) return 0;

    // Simulate completion times based on status and team
    const completionTimes = completedIssues.map(issue => 
      this.simulateDuration(issue.status, issue.team || 'Unknown', '4.1')
    );

    return Math.round(completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length);
  }

  private calculateStatusEfficiency(stories: any[], epics: any[]): Record<string, number> {
    const allIssues = [...stories, ...epics];
    const efficiency: Record<string, number> = {};

    allIssues.forEach(issue => {
      const status = issue.status;
      if (!efficiency[status]) {
        efficiency[status] = 0;
      }
      efficiency[status] += 1;
    });

    // Convert to percentages
    const total = allIssues.length;
    Object.keys(efficiency).forEach(status => {
      efficiency[status] = Math.round((efficiency[status] / total) * 100);
    });

    return efficiency;
  }

  private calculateTeamVelocity(stories: any[], epics: any[]): number {
    const completedIssues = [...stories, ...epics].filter(issue => issue.statusCategory === 'done');
    return completedIssues.length;
  }

  private identifyBottlenecks(statusCounts: Record<string, number>): string[] {
    const bottlenecks: string[] = [];
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = (count / total) * 100;
      if (percentage > 30 && !status.toLowerCase().includes('done')) {
        bottlenecks.push(status);
      }
    });

    return bottlenecks;
  }

  private generateRecommendations(data: any, _team: string): string[] {
    const recommendations: string[] = [];
    
    if (data.completionRate < 50) {
      recommendations.push('Focus on completing existing work before starting new items');
    }
    
    if (data.bottleneckStatuses.length > 0) {
      recommendations.push(`Address bottlenecks in: ${data.bottleneckStatuses.join(', ')}`);
    }
    
    if (data.stories.length > data.epics.length * 3) {
      recommendations.push('Consider breaking down large epics into smaller stories');
    }

    return recommendations;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateConfidenceInterval(values: number[], mean: number, stdDev: number): { min: number; max: number } {
    if (values.length === 0) return { min: 0, max: 0 };
    
    const marginOfError = 1.96 * (stdDev / Math.sqrt(values.length)); // 95% confidence
    return {
      min: Math.max(0, mean - marginOfError),
      max: mean + marginOfError
    };
  }

  private determineTrend(durations: number[]): 'improving' | 'stable' | 'declining' {
    if (durations.length < 3) return 'stable';
    
    const recent = durations.slice(-3);
    const older = durations.slice(0, -3);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, d) => sum + d, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change < -10) return 'improving';
    if (change > 10) return 'declining';
    return 'stable';
  }

  // Public methods
  public getTeamMetrics(team?: string): TeamPerformanceMetrics[] | TeamPerformanceMetrics | null {
    if (team) {
      return this.teamMetrics.get(team) || null;
    }
    return Array.from(this.teamMetrics.values());
  }

  public getStatusMetrics(status?: string): StatusDurationAnalysis[] | StatusDurationAnalysis | null {
    if (status) {
      return this.statusMetrics.get(status) || null;
    }
    return Array.from(this.statusMetrics.values());
  }

  public getIssueTimeline(issueKey: string): IssueTimeline | null {
    // Find the issue in the data
    let issue: any = null;
    let epic: any = null;

    Object.entries(this.data.columns).forEach(([, epics]) => {
      (epics as any[]).forEach((epicItem: any) => {
        if (epicItem.key === issueKey) {
          issue = epicItem;
          epic = epicItem;
        } else if (epicItem.stories) {
          const story = epicItem.stories.find((s: any) => s.key === issueKey);
          if (story) {
            issue = story;
            epic = epicItem;
          }
        }
      });
    });

    if (!issue) return null;

    const team = issue.team || epic?.team || 'Unknown';
    const teamMetrics = this.teamMetrics.get(team);
    const statusMetrics = this.statusMetrics.get(issue.status);

    return {
      key: issue.key,
      summary: issue.summary,
      team,
      currentStatus: issue.status,
      estimatedCompletion: statusMetrics?.averageDuration || 0,
      statusHistory: this.generateStatusHistory(issue, team),
      teamPerformance: {
        averageVelocity: teamMetrics?.teamVelocity || 0,
        reliabilityScore: teamMetrics?.completionRate || 0,
        riskFactors: teamMetrics?.bottleneckStatuses || []
      }
    };
  }

  public getEpicProgressAnalysis(epicKey: string): EpicProgressAnalysis | null {
    let epic: any = null;

    Object.entries(this.data.columns).forEach(([, epics]) => {
      const foundEpic = (epics as any[]).find((e: any) => e.key === epicKey);
      if (foundEpic) {
        epic = foundEpic;
      }
    });

    if (!epic) return null;

    const team = epic.team || 'Unknown';
    const teamMetrics = this.teamMetrics.get(team);
    const childStories = epic.stories || [];

    const completedStories = childStories.filter((s: any) => s.statusCategory === 'done');
    const overallProgress = childStories.length > 0 ? 
      (completedStories.length / childStories.length) * 100 : 0;

    const estimatedCompletion = this.calculateEpicCompletion(epic, teamMetrics);

    return {
      epicKey: epic.key,
      summary: epic.summary,
      team,
      overallProgress,
      estimatedCompletion,
      childStories: childStories.map((story: any) => ({
        key: story.key,
        status: story.status,
        team: story.team || team,
        estimatedCompletion: this.simulateDuration(story.status, story.team || team, '4.1'),
        riskLevel: this.assessRiskLevel(story, teamMetrics),
        dependencies: this.identifyDependencies(story, childStories)
      })),
      criticalPath: this.identifyCriticalPath(childStories),
      riskAssessment: this.assessEpicRisk(epic, childStories, teamMetrics),
      teamPerformance: {
        velocity: teamMetrics?.teamVelocity || 0,
        reliability: teamMetrics?.completionRate || 0,
        capacity: teamMetrics?.totalIssues || 0
      }
    };
  }

  private generateStatusHistory(issue: any, team: string): Array<{
    status: string;
    estimatedDuration: number;
    teamEfficiency: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    // Simulate status history based on current status and team performance
    const statuses = ['OPEN', 'IN PROGRESS', 'UNDER REVIEW', 'APPROVED', 'DONE'];
    const currentIndex = statuses.indexOf(issue.status.toUpperCase());
    
    if (currentIndex === -1) return [];

    const history = [];
    for (let i = 0; i <= currentIndex; i++) {
      const status = statuses[i];
      const duration = this.simulateDuration(status, team, '4.1');
      const teamMetrics = this.teamMetrics.get(team);
      const efficiency = teamMetrics?.completionRate || 50;
      const riskLevel = this.assessRiskLevel({ status }, teamMetrics);

      history.push({
        status,
        estimatedDuration: duration,
        teamEfficiency: efficiency,
        riskLevel
      });
    }

    return history;
  }

  private assessRiskLevel(issue: any, teamMetrics?: TeamPerformanceMetrics): 'low' | 'medium' | 'high' {
    if (!teamMetrics) return 'medium';

    const status = issue.status.toLowerCase();
    const isBlocked = status.includes('blocked') || status.includes('waiting');
    const isOverdue = this.isIssueOverdue(issue);

    if (isBlocked || isOverdue) return 'high';
    if (teamMetrics.completionRate < 50) return 'high';
    if (teamMetrics.completionRate < 75) return 'medium';
    return 'low';
  }

  private isIssueOverdue(issue: any): boolean {
    // This would normally check actual dates
    // For now, simulate based on status and team
    const status = issue.status.toLowerCase();
    return status.includes('creating') || status.includes('in progress');
  }

  private identifyDependencies(_story: any, _allStories: any[]): string[] {
    // Simulate dependencies based on story relationships
    // In real scenario, this would come from Jira data
    return [];
  }

  private identifyCriticalPath(stories: any[]): string[] {
    // Identify critical path based on dependencies and estimated durations
    const criticalStories = stories
      .filter(story => !story.statusCategory.includes('done'))
      .sort((a, b) => {
        const aDuration = this.simulateDuration(a.status, a.team || 'Unknown', '4.1');
        const bDuration = this.simulateDuration(b.status, b.team || 'Unknown', '4.1');
        return bDuration - aDuration;
      })
      .slice(0, 3)
      .map(story => story.key);

    return criticalStories;
  }

  private assessEpicRisk(_epic: any, childStories: any[], teamMetrics?: TeamPerformanceMetrics): {
    overallRisk: 'low' | 'medium' | 'high';
    riskFactors: string[];
    mitigationStrategies: string[];
  } {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Check completion rate
    if (teamMetrics && teamMetrics.completionRate < 50) {
      riskFactors.push('Low team completion rate');
      riskScore += 2;
    }

    // Check for blocked stories
    const blockedStories = childStories.filter(story => 
      story.status.toLowerCase().includes('blocked') || 
      story.status.toLowerCase().includes('waiting')
    );
    if (blockedStories.length > 0) {
      riskFactors.push(`${blockedStories.length} blocked stories`);
      riskScore += blockedStories.length;
    }

    // Check for overdue stories
    const overdueStories = childStories.filter(story => this.isIssueOverdue(story));
    if (overdueStories.length > 0) {
      riskFactors.push(`${overdueStories.length} overdue stories`);
      riskScore += overdueStories.length;
    }

    // Determine overall risk
    let overallRisk: 'low' | 'medium' | 'high';
    if (riskScore <= 2) overallRisk = 'low';
    else if (riskScore <= 5) overallRisk = 'medium';
    else overallRisk = 'high';

    // Generate mitigation strategies
    const mitigationStrategies: string[] = [];
    if (blockedStories.length > 0) {
      mitigationStrategies.push('Unblock blocked stories immediately');
    }
    if (overdueStories.length > 0) {
      mitigationStrategies.push('Focus resources on overdue stories');
    }
    if (teamMetrics && teamMetrics.completionRate < 50) {
      mitigationStrategies.push('Review team capacity and workload');
    }

    return {
      overallRisk,
      riskFactors,
      mitigationStrategies
    };
  }

  private calculateEpicCompletion(epic: any, teamMetrics?: TeamPerformanceMetrics): number {
    const childStories = epic.stories || [];
    if (childStories.length === 0) return 0;

    const activeStories = childStories.filter((s: any) => !s.statusCategory.includes('done'));
    if (activeStories.length === 0) return 0;

    // Calculate based on team velocity and story complexity
    const teamVelocity = teamMetrics?.teamVelocity || 1;
    const averageStoryDuration = teamMetrics?.averageStoryCompletion || 5;
    
    return Math.round((activeStories.length * averageStoryDuration) / teamVelocity);
  }

  public getTeamComparison(): Array<{
    team: string;
    metrics: TeamPerformanceMetrics;
    rank: number;
    performance: 'excellent' | 'good' | 'average' | 'needs-improvement';
  }> {
    const teams = Array.from(this.teamMetrics.values());
    
    // Sort by completion rate and velocity
    const rankedTeams = teams
      .map(team => ({
        team: team.team,
        metrics: team,
        rank: 0,
        performance: 'average' as 'excellent' | 'good' | 'average' | 'needs-improvement'
      }))
      .sort((a, b) => {
        const aScore = (a.metrics.completionRate * 0.7) + (a.metrics.teamVelocity * 0.3);
        const bScore = (b.metrics.completionRate * 0.7) + (b.metrics.teamVelocity * 0.3);
        return bScore - aScore;
      });

    // Assign ranks and performance levels
    rankedTeams.forEach((team, index) => {
      team.rank = index + 1;
      
      if (team.rank === 1) team.performance = 'excellent';
      else if (team.rank <= Math.ceil(rankedTeams.length / 3)) team.performance = 'good';
      else if (team.rank <= Math.ceil(rankedTeams.length * 2 / 3)) team.performance = 'average';
      else team.performance = 'needs-improvement';
    });

    return rankedTeams;
  }
}
