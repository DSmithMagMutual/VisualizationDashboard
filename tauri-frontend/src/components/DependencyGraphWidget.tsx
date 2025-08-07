import { useRef, useMemo, useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Button, Chip } from '@mui/material';
import * as d3 from 'd3';

interface Issue {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  team?: string;
  url?: string;
  relationships?: {
    relatesTo: string[];
    blocks: string[];
    blockedBy: string[];
  };
}

interface Epic {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  team?: string;
  url?: string;
  stories: Issue[];
  relationships?: {
    relatesTo: string[];
    blocks: string[];
    blockedBy: string[];
  };
}

interface DependencyGraphWidgetProps {
  data: {
    columns: Record<string, Epic[]>;
  };
  title?: string;
  teamFilter?: string[];
  onNodeClick?: (node: any) => void;
}

const statusColors: Record<string, string> = {
  'To Do': '#ffc107',
  'In Progress': '#ff8c00',
  'Done': '#28a745',
  'new': '#ffc107',
  'indeterminate': '#ff8c00',
  'done': '#28a745'
};

function getStatusCategory(status: string): string {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('to do') || lowerStatus.includes('ready') || lowerStatus.includes('new')) {
    return 'new';
  } else if (lowerStatus.includes('in progress') || lowerStatus.includes('creating') || lowerStatus.includes('testing')) {
    return 'indeterminate';
  } else if (lowerStatus.includes('done') || lowerStatus.includes('complete')) {
    return 'done';
  }
  return 'new';
}

function getColorForTeam(team: string): string {
  // Generate a consistent color based on team name
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = team.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export default function DependencyGraphWidget({ data, title = "Dependency Graph", teamFilter = [], onNodeClick }: DependencyGraphWidgetProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderStep, setRenderStep] = useState<string>('Initializing...');
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

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
      type: 'epic-story' | 'relates-to' | 'blocks' | 'blocked-by';
    }> = [];

    // Create a Set of all node IDs for quick lookup
    const nodeIds = new Set<string>();

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
          nodeIds.add(epic.key); // Add to node IDs set

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
            nodeIds.add(story.key); // Add to node IDs set

            // Add link from epic to story
            links.push({
              source: epic.key,
              target: story.key,
              type: 'epic-story'
            });

            // Add relationship links if they exist (only if target node exists in graph)
            if (story.relationships) {
              // Add "relates to" links
              story.relationships.relatesTo.forEach(relatedKey => {
                if (nodeIds.has(relatedKey)) {
                  links.push({
                    source: story.key,
                    target: relatedKey,
                    type: 'relates-to'
                  });
                }
              });

              // Add "blocks" links
              story.relationships.blocks.forEach(blockedKey => {
                if (nodeIds.has(blockedKey)) {
                  links.push({
                    source: story.key,
                    target: blockedKey,
                    type: 'blocks'
                  });
                }
              });

              // Add "blocked by" links
              story.relationships.blockedBy.forEach(blockingKey => {
                if (nodeIds.has(blockingKey)) {
                  links.push({
                    source: story.key,
                    target: blockingKey,
                    type: 'blocked-by'
                  });
                }
              });
            }
          });

          // Add epic-level relationships if they exist (only if target node exists in graph)
          if (epic.relationships) {
            // Add "relates to" links for epics
            epic.relationships.relatesTo.forEach(relatedKey => {
              if (nodeIds.has(relatedKey)) {
                links.push({
                  source: epic.key,
                  target: relatedKey,
                  type: 'relates-to'
                });
              }
            });

            // Add "blocks" links for epics
            epic.relationships.blocks.forEach(blockedKey => {
              if (nodeIds.has(blockedKey)) {
                links.push({
                  source: epic.key,
                  target: blockedKey,
                  type: 'blocks'
                });
              }
            });

            // Add "blocked by" links for epics
            epic.relationships.blockedBy.forEach(blockingKey => {
              if (nodeIds.has(blockingKey)) {
                links.push({
                  source: epic.key,
                  target: blockingKey,
                  type: 'blocked-by'
                });
              }
            });
          }
        }
      });
    });

    console.log(`DependencyGraphWidget: Created ${nodes.length} nodes and ${links.length} links`);
    console.log(`DependencyGraphWidget: Node IDs available:`, Array.from(nodeIds).slice(0, 10), '...');
    
    return { nodes, links };
  }, [data, teamFilter]);

  useEffect(() => {
    setRenderError(null);
    setRenderStep('Starting render...');
    
    console.log('DependencyGraphWidget useEffect triggered');
    console.log('svgRef.current:', svgRef.current);
    console.log('graphData.nodes.length:', graphData.nodes.length);
    
    if (!svgRef.current) {
      setRenderError('No SVG ref available');
      setRenderStep('Failed: No SVG element');
      console.log('No SVG ref available');
      return;
    }
    
    if (graphData.nodes.length === 0) {
      setRenderError('No nodes to render');
      setRenderStep('Failed: No data');
      console.log('No nodes to render');
      return;
    }

    try {
      setRenderStep('Clearing SVG...');
      console.log('Starting D3.js rendering...');
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      setRenderStep('SVG cleared successfully');
      console.log('SVG cleared successfully');

      setRenderStep('Setting up dimensions...');
      const width = 1200;
      const height = 800;
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };

      setRenderStep('Creating zoom behavior...');
      // Create zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      // Store zoom reference for external access
      zoomRef.current = zoom;

      setRenderStep('Applying zoom to SVG...');
      // Apply zoom to SVG
      svg.call(zoom as any);

      setRenderStep('Creating SVG container...');
      // Create the SVG container
      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      setRenderStep('Creating force simulation...');
      // Create the force simulation with better spacing
      const simulation = d3.forceSimulation(graphData.nodes)
        .force('link', d3.forceLink(graphData.links).id((d: any) => d.id).distance(200))
        .force('charge', d3.forceManyBody().strength(-800))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(60));

      setRenderStep('Creating arrow markers...');
      // Define arrow markers for different relationship types
      const defs = svg.append('defs');
      
      // Arrow marker for "relates to" (blue dotted) - Smaller and positioned away from nodes
      defs.append('marker')
        .attr('id', 'arrow-relates')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25) // Move arrow far from node edge
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', '#0066cc')
        .attr('stroke', '#004499')
        .attr('stroke-width', '0.5');

      // Arrow marker for "blocks" (red dotted) - Smaller and positioned away from nodes
      defs.append('marker')
        .attr('id', 'arrow-blocks')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25) // Move arrow far from node edge
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', '#dc3545')
        .attr('stroke', '#a71e2a')
        .attr('stroke-width', '0.5');

      // Arrow marker for "blocked by" (red dotted, reverse direction) - Smaller and positioned away from nodes
      defs.append('marker')
        .attr('id', 'arrow-blocked-by')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', -15) // Move arrow far from node edge
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M8,-4L0,0L8,4')
        .attr('fill', '#dc3545')
        .attr('stroke', '#a71e2a')
        .attr('stroke-width', '0.5');

      // Create the links with different styles for different relationship types
      const link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(graphData.links)
        .enter()
        .append('line')
        .attr('stroke', (d: any) => {
          switch (d.type) {
            case 'epic-story':
              return '#999';
            case 'relates-to':
              return '#0066cc'; // Blue for relates to
            case 'blocks':
              return '#dc3545'; // Red for blocks
            case 'blocked-by':
              return '#dc3545'; // Red for blocked by
            default:
              return '#999';
          }
        })
        .attr('stroke-opacity', (d: any) => {
          switch (d.type) {
            case 'epic-story':
              return 0.6;
            case 'relates-to':
              return 0.7;
            case 'blocks':
            case 'blocked-by':
              return 0.8;
            default:
              return 0.6;
          }
        })
        .attr('stroke-width', (d: any) => {
          switch (d.type) {
            case 'epic-story':
              return 2;
            case 'relates-to':
            case 'blocks':
            case 'blocked-by':
              return 3; // Slightly thicker lines for relationship arrows
            default:
              return 2;
          }
        })
        .attr('stroke-dasharray', (d: any) => {
          switch (d.type) {
            case 'epic-story':
              return 'none';
            case 'relates-to':
              return '8,4'; // Dotted blue
            case 'blocks':
            case 'blocked-by':
              return '8,4'; // Dotted red
            default:
              return 'none';
          }
        })
        .attr('marker-end', (d: any) => {
          switch (d.type) {
            case 'relates-to':
              return 'url(#arrow-relates)';
            case 'blocks':
              return 'url(#arrow-blocks)';
            case 'blocked-by':
              return 'url(#arrow-blocked-by)';
            default:
              return 'none';
          }
        });

      // Create the nodes
      const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(graphData.nodes)
        .enter()
        .append('g')
        .call(d3.drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended))
        .on('click', (_event: any, d: any) => {
          if (onNodeClick) {
            onNodeClick(d);
          }
        })
        .style('cursor', 'pointer');

      // Add circles for nodes
      node.append('circle')
        .attr('r', (d: any) => d.type === 'epic' ? 35 : 25)
        .attr('fill', (d: any) => getColorForTeam(d.team || ''))
        .attr('stroke', (d: any) => {
          const statusCat = getStatusCategory(d.status);
          return statusColors[statusCat] || statusColors['new'];
        })
        .attr('stroke-width', 4);

      // Add labels
      node.append('text')
        .text((d: any) => d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .attr('font-size', '14px')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .attr('stroke', 'black')
        .attr('stroke-width', '0.8px')
        .attr('paint-order', 'stroke fill');

      // Add iteration labels for epics
      node.filter((d: any) => d.type === 'epic')
        .append('text')
        .text((d: any) => d.iteration || '')
        .attr('text-anchor', 'middle')
        .attr('dy', '2.2em')
        .attr('font-size', '12px')
        .attr('fill', '#666')
        .attr('font-weight', '500')
        .attr('stroke', 'black')
        .attr('stroke-width', '0.5px')
        .attr('paint-order', 'stroke fill');

      // Add tooltips with iteration information
      node.append('title')
        .text((d: any) => 
          `${d.label}\n${d.summary}\nStatus: ${d.status}\nTeam: ${d.team || 'N/A'}\nIteration: ${d.iteration || 'N/A'}`
        );

      // Function to calculate link endpoints that avoid node overlap
      const getLinkEndpoints = (source: any, target: any) => {
        const sourceRadius = source.type === 'epic' ? 35 : 25;
        const targetRadius = target.type === 'epic' ? 35 : 25;
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return { x1: source.x, y1: source.y, x2: target.x, y2: target.y };
        
        // Calculate unit vector
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        // Calculate endpoints at node edges
        const x1 = source.x + unitX * sourceRadius;
        const y1 = source.y + unitY * sourceRadius;
        const x2 = target.x - unitX * targetRadius;
        const y2 = target.y - unitY * targetRadius;
        
        return { x1, y1, x2, y2 };
      };

      // Update positions on simulation tick
      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => {
            const endpoints = getLinkEndpoints(d.source, d.target);
            return endpoints.x1;
          })
          .attr('y1', (d: any) => {
            const endpoints = getLinkEndpoints(d.source, d.target);
            return endpoints.y1;
          })
          .attr('x2', (d: any) => {
            const endpoints = getLinkEndpoints(d.source, d.target);
            return endpoints.x2;
          })
          .attr('y2', (d: any) => {
            const endpoints = getLinkEndpoints(d.source, d.target);
            return endpoints.y2;
          });

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setRenderError(`D3.js Error: ${errorMessage}`);
      setRenderStep('Failed: D3.js rendering error');
      console.error('Error rendering dependency graph:', error);
    }
  }, [graphData, onNodeClick]);

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
  const handleViewAll = () => {
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
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#212529', fontWeight: 600 }}>
          {title}
        </Typography>
        
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Debug Info - Collapsible */}
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              sx={{ mb: 1, fontSize: '0.75rem' }}
            >
              {showDebugInfo ? '🔽 Hide Debug Info' : '🔼 Show Debug Info'}
            </Button>
            
            {showDebugInfo && (
              <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 'bold' }}>
                  DEBUG INFO:
                </Typography>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  Nodes: {graphData.nodes.length} | Links: {graphData.links.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  Teams: {teams.length} | Iterations: {iterations.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  Team Filter: {teamFilter.length > 0 ? teamFilter.join(', ') : 'None'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#333', mt: 1 }}>
                  Render Step: {renderStep}
                </Typography>
                {renderError && (
                  <Typography variant="body2" sx={{ color: '#dc3545', mt: 1, fontWeight: 'bold' }}>
                    ❌ ERROR: {renderError}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

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

            {/* Teams Legend */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#212529', fontWeight: 600 }}>
                Teams (Fill Colors):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {teams.slice(0, 5).map((team, index) => (
                  <Chip
                    key={index}
                    label={team || 'Unknown'}
                    size="small"
                    sx={{
                      backgroundColor: getColorForTeam(team || ''),
                      color: 'white',
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
                {teams.length > 5 && (
                  <Chip
                    label={`+${teams.length - 5} more`}
                    size="small"
                    sx={{
                      backgroundColor: '#f0f0f0',
                      color: '#666',
                      fontSize: '0.75rem'
                    }}
                  />
                )}
              </Box>
            </Box>
            
            {/* Status Legend */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#212529', fontWeight: 600 }}>
                Status (Border Colors):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {legendData.map((item, index) => (
                  <Chip
                    key={index}
                    label={item.label}
                    size="small"
                    sx={{
                      border: `2px solid ${item.color}`,
                      backgroundColor: '#ffffff',
                      color: '#212529',
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Relationship Legend */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#212529', fontWeight: 600 }}>
                Relationships:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 2, backgroundColor: '#999' }} />
                  <Typography variant="caption" sx={{ color: '#6c757d' }}>
                    Epic → Story
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 20, 
                    height: 4, 
                    background: 'repeating-linear-gradient(to right, #0066cc 0px, #0066cc 4px, transparent 4px, transparent 8px)',
                    position: 'relative'
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      right: -6,
                      top: -2,
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid #0066cc',
                      borderTop: '4px solid transparent',
                      borderBottom: '4px solid transparent'
                    }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#6c757d' }}>
                    Relates To (Blue Dotted) →
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 20, 
                    height: 4, 
                    background: 'repeating-linear-gradient(to right, #dc3545 0px, #dc3545 4px, transparent 4px, transparent 8px)',
                    position: 'relative'
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      right: -6,
                      top: -2,
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid #dc3545',
                      borderTop: '4px solid transparent',
                      borderBottom: '4px solid transparent'
                    }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#6c757d' }}>
                    Blocks (Red Dotted) →
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 20, 
                    height: 4, 
                    background: 'repeating-linear-gradient(to right, #dc3545 0px, #dc3545 4px, transparent 4px, transparent 8px)',
                    position: 'relative'
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      left: -6,
                      top: -2,
                      width: 0,
                      height: 0,
                      borderRight: '8px solid #dc3545',
                      borderTop: '4px solid transparent',
                      borderBottom: '4px solid transparent'
                    }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#6c757d' }}>
                    Blocked By (Red Dotted) ←
                  </Typography>
                </Box>
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
              <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                <svg
                  ref={svgRef}
                  width="1200"
                  height="800"
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fafafa'
                  }}
                />
                <style>
                  {`
                    .links line {
                      pointer-events: none;
                      z-index: 10;
                    }
                    .nodes g {
                      z-index: 5;
                    }
                  `}
                </style>
                {/* Fallback content if SVG is empty */}
                <Box sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <Typography variant="h6" sx={{ color: '#28a745', mb: 1 }}>
                    ✅ Dependency Graph Ready
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    {graphData.nodes.length} nodes and {graphData.links.length} links
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333', mt: 1 }}>
                    Current Step: {renderStep}
                  </Typography>
                  {renderError && (
                    <Typography variant="body2" sx={{ color: '#dc3545', mt: 1, fontWeight: 'bold' }}>
                      ❌ ERROR: {renderError}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: '#999', mt: 1 }}>
                    If you don't see the graph, check the debug info above
                  </Typography>
                </Box>
              </Box>
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