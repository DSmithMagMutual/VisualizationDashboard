import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, Typography, Box, Tooltip, CircularProgress } from '@mui/material';

const colorScale = (days: number) => {
  // Blue (fast) to Red (slow)
  if (days < 10) return '#00bfff';
  if (days < 30) return '#4caf50';
  if (days < 100) return '#ffb300';
  return '#f44336';
};

const nodeColor = '#23293A';

const StatusNode = ({ data }: any) => (
  <Tooltip title={<>
    <b>{data.label}</b><br/>
    {data.count} issues
  </>} arrow>
    <div style={{
      width: 60 + Math.min(data.count, 200) * 0.4,
      height: 60 + Math.min(data.count, 200) * 0.4,
      borderRadius: '50%',
      background: nodeColor,
      border: '4px solid #6C63FF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: 18,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      position: 'relative',
      cursor: 'pointer',
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, textAlign: 'center', lineHeight: 1.1 }}>{data.label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{data.count}</div>
      <Handle type="source" position={Position.Right} style={{ top: '50%', background: nodeColor, border: 'none' }} />
      <Handle type="target" position={Position.Left} style={{ top: '50%', background: nodeColor, border: 'none' }} />
    </div>
  </Tooltip>
);

const nodeTypes = { status: StatusNode };

function layoutNodes(nodes: any[], edges: any[]) {
  // Simple horizontal layout by order of appearance
  const order: string[] = [];
  edges.forEach(e => {
    if (!order.includes(e.source)) order.push(e.source);
    if (!order.includes(e.target)) order.push(e.target);
  });
  const y = 120;
  return nodes.map((n, i) => ({
    ...n,
    position: {
      x: 80 + order.indexOf(n.id) * 220,
      y,
    },
    draggable: false,
  }));
}

const ProcessDiagramWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setLoading(true);
    fetch('/api/jira/process-diagram?project=JPP')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        // Map nodes
        const rfNodes = layoutNodes(
          data.nodes.map((n: any) => ({
            id: n.id,
            type: 'status',
            data: { label: n.id, count: n.count },
          })),
          data.edges
        );
        // Map edges
        const maxCount = Math.max(...data.edges.map((e: any) => e.count), 1);
        const rfEdges = data.edges.map((e: any, i: number) => ({
          id: `e${i}`,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          label: `${e.count} / ${e.avgDurationDays} days`,
          animated: false,
          style: {
            stroke: colorScale(e.avgDurationDays),
            strokeWidth: 2 + 6 * (e.count / maxCount),
          },
          labelStyle: {
            fill: colorScale(e.avgDurationDays),
            fontWeight: 700,
            fontSize: 14,
            textShadow: '0 1px 2px #222',
          },
          data: {
            count: e.count,
            avgDurationDays: e.avgDurationDays,
          },
        }));
        setNodes(rfNodes);
        setEdges(rfEdges);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Card sx={{ mb: 2, maxWidth: 950, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }}>
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress color="primary" size={40} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Loading process diagram…
        </Typography>
      </CardContent>
    </Card>;
  }
  if (error) {
    return <Card sx={{ mb: 2, maxWidth: 950, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" color="error" gutterBottom tabIndex={0}>
          Process Diagram
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {error}
        </Typography>
      </CardContent>
    </Card>;
  }

  return (
    <Card sx={{ mb: 2, maxWidth: 950, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: '#181e2a', color: '#fff' }} aria-label="Process diagram" role="region" tabIndex={0}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} color="#fff" mb={2}>
          Process Diagram
        </Typography>
        <Box sx={{ width: '100%', height: 420, background: '#23293A', borderRadius: 2 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            panOnScroll
            elementsSelectable={false}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesFocusable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#23293A" gap={32} />
            <MiniMap nodeColor={() => '#6C63FF'} nodeStrokeWidth={3} zoomable pannable />
            <Controls showInteractive={true} />
          </ReactFlow>
        </Box>
        <Box mt={2}>
          <Typography variant="caption" color="#fff">
            <b>Legend:</b> Node size = count, Arrow thickness = transition count, Arrow color = duration (blue = fast, red = slow)
          </Typography>
          <Box mt={1} display="flex" alignItems="center" gap={2}>
            <Box width={80} height={10} borderRadius={5} bgcolor="#00bfff" />
            <Typography variant="caption" color="#fff">Short Duration</Typography>
            <Box width={80} height={10} borderRadius={5} bgcolor="#f44336" />
            <Typography variant="caption" color="#fff">Long Duration</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProcessDiagramWidget; 