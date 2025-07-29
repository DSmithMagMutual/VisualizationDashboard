import { useMemo, useRef, useEffect, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Chip, Button } from '@mui/material';
import * as d3 from 'd3';

interface Issue {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  team?: string;
  url?: string;
}

interface Epic {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  team?: string;
  url?: string;
  stories: Issue[];
}

interface DependencyGraphWidgetProps {
  data: {
    columns: Record<string, Epic[]>;
  };
  title?: string;
  teamFilter?: string[];
}

const statusColors: Record<string, string> = {
  'To Do': '#dc3545',
  'In Progress': '#fd7e14', 
  'Done': '#198754',
  'Ready': '#6c757d',
  'Ready for Release': '#6c757d',
  'Creating': '#fd7e14',
  'Validating': '#0d6efd',
  'UAT': '#fd7e14',
  'default': '#6c757d'
};

const teamColors: Record<string, string> = {
  'OG Team': '#6C63FF',
  'Special Forces': '#FF6B6B',
  'Avengers': '#4ECDC4',
  'Hogwarts Express': '#45B7D1',
  'Data Divers': '#96CEB4',
  'Other': '#FFEAA7',
  'default': '#6c757d'
};

function getStatusCategory(status: string): string {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('done') || 
      statusLower.includes('complete') || 
      statusLower.includes('closed') ||
      statusLower.includes('resolved')) {
    return 'Done';
  } else if (statusLower.includes('progress') || 
             statusLower.includes('creating') || 
             statusLower.includes('uat') || 
             statusLower.includes('validating') ||
             statusLower.includes('testing') ||
             statusLower.includes('review') ||
             statusLower.includes('development') ||
             statusLower.includes('in development')) {
    return 'In Progress';
  } else if (statusLower.includes('ready') ||
             statusLower.includes('to do') ||
             statusLower.includes('open') ||
             statusLower.includes('new') ||
             statusLower.includes('backlog') ||
             statusLower.includes('selected for development') ||
             statusLower.includes('ready for development')) {
    return 'To Do';
  } else {
    return 'To Do';
  }
}

function getColorForTeam(team: string): string {
  if (!team) return teamColors.default;
  if (teamColors[team]) return teamColors[team];
  
  // Generate a consistent color for unknown teams
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = team.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export default function DependencyGraphWidget({ data, title = "Dependency Graph", teamFilter = [] }: DependencyGraphWidgetProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);

  const graphData = useMemo(() => {
    const nodes: Array<{
      id: string;
      label: string;
      type: 'epic' | 'story';
      status: string;
      statusCategory: string;
      team?: string;
      url?: string;
      summary: string;
      iteration?: string;
      x?: number;
      y?: number;
      fx?: number | null;
      fy?: number | null;
    }> = [];
    
    const links: Array<{
      source: string;
      target: string;
      type: 'epic-story';
    }> = [];

    // Process all epics and their stories with iteration information
    Object.entries(data.columns).forEach(([iteration, epics]) => {
      epics.forEach(epic => {
        // Check if epic should be included based on team filter
        const epicMatchesFilter = teamFilter.length === 0 || (epic.team && teamFilter.includes(epic.team));
        
        // Check if any stories match the team filter
        const matchingStories = epic.stories.filter(story => 
          teamFilter.length === 0 || (story.team && teamFilter.includes(story.team))
        );
        
        // Include epic if it matches filter or has matching stories
        if (epicMatchesFilter || matchingStories.length > 0) {
          // Add epic node
          nodes.push({
            id: epic.key,
            label: epic.key,
            type: 'epic',
            status: epic.status,
            statusCategory: epic.statusCategory,
            team: epic.team,
            url: epic.url,
            summary: epic.summary,
            iteration: iteration
          });

          // Add only matching story nodes and links
          matchingStories.forEach(story => {
            nodes.push({
              id: story.key,
              label: story.key,
              type: 'story',
              status: story.status,
              statusCategory: story.statusCategory,
              team: story.team,
              url: story.url,
              summary: story.summary,
              iteration: iteration
            });

            // Add link from epic to story
            links.push({
              source: epic.key,
              target: story.key,
              type: 'epic-story'
            });
          });
        }
      });
    });

    return { nodes, links };
  }, [data, teamFilter]);

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1200;
    const height = 800;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // Store zoom reference for external access
    zoomRef.current = zoom;

    // Apply zoom to SVG
    svg.call(zoom as any);

    // Create the SVG container
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create the force simulation with better spacing
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create the links
    const link = g.append('g')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Create the nodes
    const node = g.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles for nodes
    node.append('circle')
      .attr('r', (d: any) => d.type === 'epic' ? 25 : 18)
      .attr('fill', (d: any) => {
        const statusCat = getStatusCategory(d.status);
        return statusColors[statusCat] || statusColors.default;
      })
      .attr('stroke', (d: any) => getColorForTeam(d.team))
      .attr('stroke-width', 3);

    // Add labels
    node.append('text')
      .text((d: any) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '11px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold');

    // Add iteration labels for epics
    node.filter((d: any) => d.type === 'epic')
      .append('text')
      .text((d: any) => d.iteration || '')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.8em')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('font-weight', '500');

    // Add tooltips with iteration information
    node.append('title')
      .text((d: any) => 
        `${d.label}\n${d.summary}\nStatus: ${d.status}\nTeam: ${d.team || 'N/A'}\nIteration: ${d.iteration || 'N/A'}`
      );

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  const legendData = [
    { label: 'Epic', type: 'epic', color: '#6c757d' },
    { label: 'Story', type: 'story', color: '#6c757d' },
    { label: 'To Do', status: 'To Do', color: statusColors['To Do'] },
    { label: 'In Progress', status: 'In Progress', color: statusColors['In Progress'] },
    { label: 'Done', status: 'Done', color: statusColors['Done'] },
  ];

  const teams = Array.from(new Set(graphData.nodes.map(node => node.team).filter(Boolean)));
  const iterations = Array.from(new Set(graphData.nodes.map(node => node.iteration).filter(Boolean))).sort();

  // Function to zoom to fit all nodes
  const handleViewAll = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = 1200;
    const height = 800;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Calculate bounds of all nodes
    const xExtent = d3.extent(graphData.nodes, (d: any) => d.x) as [number, number];
    const yExtent = d3.extent(graphData.nodes, (d: any) => d.y) as [number, number];

    if (xExtent[0] === undefined || yExtent[0] === undefined) return;

    // Add padding around the bounds
    const padding = 50;
    const bounds = {
      x: xExtent[0] - padding,
      y: yExtent[0] - padding,
      width: xExtent[1] - xExtent[0] + 2 * padding,
      height: yExtent[1] - yExtent[0] + 2 * padding
    };

    // Calculate the scale to fit the bounds in the viewport
    const scale = Math.min(
      (width - margin.left - margin.right) / bounds.width,
      (height - margin.top - margin.bottom) / bounds.height
    );

    // Calculate the transform to center the bounds
    const transform = d3.zoomIdentity
      .translate(
        (width - bounds.width * scale) / 2 - bounds.x * scale,
        (height - bounds.height * scale) / 2 - bounds.y * scale
      )
      .scale(scale);

    // Apply the transform with smooth transition
    svg.transition()
      .duration(750)
      .call(zoomRef.current.transform as any, transform);
  }, [graphData.nodes]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#212529', fontWeight: 600 }}>
          {title}
        </Typography>
        
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Controls and Legend */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            {/* Zoom Controls */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#212529', fontWeight: 600 }}>
                Navigation:
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleViewAll}
                sx={{ mb: 1 }}
              >
                View All
              </Button>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                • Scroll to zoom in/out
              </Typography>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                • Drag to pan around
              </Typography>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                • Drag nodes to rearrange
              </Typography>
            </Box>

            {/* Status Legend */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#212529', fontWeight: 600 }}>
                Status Colors:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {legendData.map((item, index) => (
                  <Chip
                    key={index}
                    label={item.label}
                    size="small"
                    sx={{
                      backgroundColor: item.color,
                      color: 'white',
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
              </Box>
            </Box>
            
            {/* Teams Legend */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#212529', fontWeight: 600 }}>
                Teams (Border Colors):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {teams.map((team, index) => (
                  <Chip
                    key={index}
                    label={team || 'Unknown'}
                    size="small"
                    sx={{
                      border: `2px solid ${getColorForTeam(team || '')}`,
                      backgroundColor: '#ffffff',
                      color: '#212529',
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Iterations Legend */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#212529', fontWeight: 600 }}>
                Iterations:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {iterations.map((iteration, index) => (
                  <Chip
                    key={index}
                    label={iteration}
                    size="small"
                    sx={{
                      backgroundColor: '#f0f0f0',
                      color: '#333',
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>

          {/* Graph */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {graphData.nodes.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#6c757d' }}>
                No data available for dependency graph
              </Typography>
            ) : (
              <svg
                ref={svgRef}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fafafa'
                }}
              />
            )}
          </Box>

          {/* Stats */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#6c757d' }}>
              Total Issues: {graphData.nodes.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d' }}>
              Dependencies: {graphData.links.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d' }}>
              Iterations: {iterations.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d' }}>
              Teams: {teams.length}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
} 