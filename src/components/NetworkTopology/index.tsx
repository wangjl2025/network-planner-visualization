import { useEffect, useRef, useCallback } from 'react';

// 网络节点类型（内联定义）
interface NetworkNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'root' | 'router' | 'switch' | 'host';
}

// 网络边类型（内联定义）
interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  cost: number;
}

// Dijkstra结果类型（内联定义）
interface DijkstraResult {
  distances: Record<string, number>;
  previous: Record<string, string | null>;
  visited: string[];
  path: string[];
}

export interface NetworkTopologyProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  currentStep: number;
  showDistances?: boolean;
  highlightPath?: boolean;
  dijkstraResult?: DijkstraResult;
}

export function NetworkTopology({
  nodes,
  edges,
  currentStep,
  showDistances = true,
  highlightPath = true,
  dijkstraResult,
}: NetworkTopologyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 绘制函数
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布大小
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // 清空画布
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格背景
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 计算节点位置（相对于画布中心）
    const scaleX = width / 600;
    const scaleY = height / 400;
    const offsetX = 50;
    const offsetY = 50;

    const getNodePos = (node: NetworkNode) => ({
      x: node.x * scaleX + offsetX,
      y: node.y * scaleY + offsetY,
    });

    // 确定最短路径边
    const shortestPathEdges = new Set<string>();
    if (highlightPath && dijkstraResult && currentStep >= 5) {
      const { previous } = dijkstraResult;
      nodes.forEach(node => {
        if (node.id !== 'R1') {
          let current: string | null = node.id;
          while (current !== null && previous[current] !== null) {
            const prevNode: string = previous[current]!;
            // 构建边ID用于查找
            const _edgeId1 = `e-${prevNode}-${current}`;
            const _edgeId2 = `e-${current}-${prevNode}`;
            const edge = edges.find(e => 
              (e.from === prevNode && e.to === current) || 
              (e.from === current && e.to === prevNode)
            );
            if (edge) {
              shortestPathEdges.add(edge.id);
            }
            current = prevNode;
          }
        }
      });
    }

    // 绘制边
    edges.forEach((edge) => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const from = getNodePos(fromNode);
      const to = getNodePos(toNode);

      // 判断是否是最短路径上的边
      const isOnShortestPath = shortestPathEdges.has(edge.id);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      
      if (isOnShortestPath && highlightPath && currentStep >= 5) {
        ctx.strokeStyle = '#22c55e'; // 绿色表示最短路径
        ctx.lineWidth = 4;
        // 绘制发光效果
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // 重置阴影

      // 绘制Cost标签背景
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      
      ctx.fillStyle = isOnShortestPath ? '#166534' : '#1e293b';
      ctx.fillRect(midX - 18, midY - 12, 36, 24);
      
      // 绘制Cost标签边框
      ctx.strokeStyle = isOnShortestPath ? '#22c55e' : '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(midX - 18, midY - 12, 36, 24);
      
      // 绘制Cost文字
      ctx.fillStyle = isOnShortestPath ? '#86efac' : '#94a3b8';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(edge.cost), midX, midY);
    });

    // 绘制节点
    nodes.forEach((node) => {
      const pos = getNodePos(node);
      const isRoot = node.type === 'root';
      
      // 根据Dijkstra结果和当前动画步骤判断是否已访问
      // 动画步骤与访问顺序的映射：
      // Step 0: 初始化 - 无节点访问
      // Step 1: 选择根节点 - R1作为根
      // Step 2: 访问R2 - R1, R2已访问
      // Step 3: 访问R3 - R1, R2, R3已访问
      // Step 4: 访问R4 - R1, R2, R3, R4已访问
      // Step 5: 完成 - 全部访问
      let isVisited = false;
      let isCurrentVisiting = false;
      let distance: number | null = null;
      
      if (dijkstraResult) {
        const visitIndex = dijkstraResult.visited.indexOf(node.id);
        distance = dijkstraResult.distances[node.id];
        
        // 根据动画步骤确定访问状态
        // currentStep: 0=init, 1=root, 2=visit R2, 3=visit R3, 4=visit R4, 5=complete
        const stepToVisitCount: Record<number, number> = {
          0: 0,  // 初始化：无节点访问
          1: 0,  // 选择根节点：R1是根，不算"已访问"
          2: 1,  // 访问R2：R2已访问
          3: 2,  // 访问R3：R2, R3已访问
          4: 3,  // 访问R4：R2, R3, R4已访问
          5: 3,  // 完成：全部已访问
        };
        
        const visitCount = stepToVisitCount[currentStep] ?? 0;
        isVisited = visitIndex !== -1 && visitIndex < visitCount;
        
        // 当前正在访问的节点（高亮显示）
        if (currentStep >= 2 && currentStep <= 4) {
          const currentNodeId = dijkstraResult.visited[currentStep - 1];
          isCurrentVisiting = node.id === currentNodeId;
        }
      }

      // 节点外圈（发光效果）
      if (isVisited || isRoot || isCurrentVisiting) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
        if (isCurrentVisiting) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.5)'; // 黄色高亮当前访问节点
        } else if (isRoot) {
          ctx.fillStyle = 'rgba(220, 38, 38, 0.3)';
        } else {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        }
        ctx.fill();
      }

      // 节点主体
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
      if (isCurrentVisiting) {
        ctx.fillStyle = '#facc15'; // 黄色表示当前正在访问
      } else if (isRoot) {
        ctx.fillStyle = '#dc2626';
      } else if (isVisited) {
        ctx.fillStyle = '#3b82f6';
      } else {
        ctx.fillStyle = '#475569';
      }
      ctx.fill();

      // 节点内圈
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // 节点边框
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
      if (isCurrentVisiting) {
        ctx.strokeStyle = '#fbbf24'; // 黄色边框
        ctx.lineWidth = 4; // 更粗的边框
      } else if (isRoot) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
      } else if (isVisited) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
      }
      ctx.stroke();

      // 节点标签
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, pos.x, pos.y);

      // 显示距离值
      if (showDistances && distance !== null && distance !== Infinity && !isRoot) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`d=${distance}`, pos.x, pos.y + 35);
      }
    });

    // 绘制标题和信息
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('OSPF 网络拓扑 - Dijkstra算法演示', 20, 30);

    // 绘制图例
    const legendY = height - 100;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(20, legendY, 20, 3);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('最短路径', 45, legendY + 4);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(20, legendY + 20, 20, 3);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('已访问节点', 45, legendY + 24);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(20, legendY + 40, 20, 3);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('当前访问', 45, legendY + 44);

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(30, legendY + 65, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('根节点(R1)', 45, legendY + 69);
  }, [nodes, edges, currentStep, showDistances, highlightPath, dijkstraResult]);

  // 初始绘制和依赖变化时重绘
  useEffect(() => {
    draw();
  }, [draw]);

  // 窗口resize监听
  useEffect(() => {
    const handleResize = () => {
      // 使用requestAnimationFrame避免频繁重绘
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        draw();
      });
    };

    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block', minHeight: '320px' }}
    />
  );
}
