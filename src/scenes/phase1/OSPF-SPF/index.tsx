import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { useAnimation } from '../../../hooks/useAnimation';
import { useParameters } from '../../../hooks/useParameters';
import { NetworkTopology } from '../../../components/NetworkTopology';
import { Calculator, Table, Info, ArrowRight } from 'lucide-react';

// Scene 类型定义（内联避免模块导入问题）
interface Scene {
  id: string;
  title: string;
  description: string;
  phase: 1 | 2 | 3 | 4 | 5;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: string;
  isHot?: boolean;
}

// 网络节点类型
interface NetworkNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'root' | 'router' | 'switch' | 'host';
}

// 网络边类型
interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  cost: number;
}

// Dijkstra算法结果
interface DijkstraResult {
  distances: Record<string, number>;
  previous: Record<string, string | null>;
  visited: string[];
  path: string[];
}

const sceneData: Scene = {
  id: 'ospf-spf',
  phase: 1,
  title: 'OSPF SPF算法：最短路径计算',
  category: 'OSPF路由协议',
  description: '通过Dijkstra算法计算最短路径，理解LSDB如何构建最短路径树(SPT)。可以调节链路Cost观察路径变化。',
  duration: '5-8分钟',
  difficulty: 'medium',
  isHot: true,
};

// 动画步骤
const animationSteps = [
  {
    id: 'init',
    title: '初始化',
    description: '路由器R1收集到所有LSA，构建完整的LSDB（链路状态数据库）',
    duration: 2000,
  },
  {
    id: 'select-root',
    title: '选择根节点',
    description: '以自己(R1)为根，初始化距离：自己为0，其他为无穷大',
    duration: 1500,
  },
  {
    id: 'visit-r2',
    title: '访问R2',
    description: '选择距离最小的未访问节点R2。更新R2邻居的距离。',
    duration: 2500,
  },
  {
    id: 'visit-r3',
    title: '访问R3',
    description: '选择下一个距离最小的节点，比较各路径选择最优路由。',
    duration: 3000,
  },
  {
    id: 'visit-r4',
    title: '访问R4',
    description: '继续选择并计算到R4的最短路径。',
    duration: 2500,
  },
  {
    id: 'complete',
    title: '算法完成',
    description: '最短路径树(SPT)构建完成，所有节点都已访问，生成路由表。',
    duration: 2000,
  },
];

// 初始参数
const initialParameters = [
  {
    id: 'r1-r2-cost',
    name: 'R1-R2 链路Cost',
    type: 'range' as const,
    value: 10,
    min: 1,
    max: 100,
    step: 1,
    unit: '',
    description: 'R1到R2的OSPF链路开销值',
  },
  {
    id: 'r2-r3-cost',
    name: 'R2-R3 链路Cost',
    type: 'range' as const,
    value: 5,
    min: 1,
    max: 100,
    step: 1,
    unit: '',
    description: 'R2到R3的OSPF链路开销值',
  },
  {
    id: 'r1-r3-cost',
    name: 'R1-R3 链路Cost',
    type: 'range' as const,
    value: 20,
    min: 1,
    max: 100,
    step: 1,
    unit: '',
    description: 'R1到R3的直接链路开销值',
  },
  {
    id: 'r3-r4-cost',
    name: 'R3-R4 链路Cost',
    type: 'range' as const,
    value: 8,
    min: 1,
    max: 100,
    step: 1,
    unit: '',
    description: 'R3到R4的OSPF链路开销值',
  },
  {
    id: 'r2-r4-cost',
    name: 'R2-R4 链路Cost',
    type: 'range' as const,
    value: 30,
    min: 1,
    max: 100,
    step: 1,
    unit: '',
    description: 'R2到R4的OSPF链路开销值',
  },
  {
    id: 'reference-bandwidth',
    name: '参考带宽 (Mbps)',
    type: 'range' as const,
    value: 100,
    min: 10,
    max: 10000,
    step: 10,
    unit: 'Mbps',
    description: 'OSPF参考带宽，默认100Mbps。Cost = 参考带宽 / 接口带宽',
  },
  {
    id: 'show-distances',
    name: '显示距离值',
    type: 'boolean' as const,
    value: true,
    description: '在节点上显示到根节点的最短距离',
  },
  {
    id: 'highlight-path',
    name: '高亮最短路径',
    type: 'boolean' as const,
    value: true,
    description: '高亮显示从R1到各节点的最短路径',
  },
  {
    id: 'show-cost-calc',
    name: '显示Cost计算',
    type: 'boolean' as const,
    value: true,
    description: '显示OSPF Cost计算公式和过程',
  },
  {
    id: 'animation-speed',
    name: '动画速度',
    type: 'select' as const,
    value: '1x',
    options: [
      { label: '0.5x 慢速', value: '0.5x' },
      { label: '1x 正常', value: '1x' },
      { label: '1.5x 快速', value: '1.5x' },
      { label: '2x 极速', value: '2x' },
    ],
    description: '调整动画播放速度',
  },
];

// Dijkstra算法实现
function runDijkstra(nodes: NetworkNode[], edges: NetworkEdge[], startNodeId: string): DijkstraResult {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visited: string[] = [];
  const unvisited = new Set(nodes.map(n => n.id));

  // 初始化
  nodes.forEach(node => {
    distances[node.id] = node.id === startNodeId ? 0 : Infinity;
    previous[node.id] = null;
  });

  // 构建邻接表
  const adjacencyList: Record<string, { nodeId: string; cost: number }[]> = {};
  nodes.forEach(node => {
    adjacencyList[node.id] = [];
  });
  edges.forEach(edge => {
    adjacencyList[edge.from].push({ nodeId: edge.to, cost: edge.cost });
    adjacencyList[edge.to].push({ nodeId: edge.from, cost: edge.cost });
  });

  // 主循环
  while (unvisited.size > 0) {
    // 找到未访问节点中距离最小的
    let currentNodeId: string | null = null;
    let minDistance = Infinity;
    
    unvisited.forEach(nodeId => {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentNodeId = nodeId;
      }
    });

    if (currentNodeId === null || distances[currentNodeId] === Infinity) break;

    // 标记为已访问
    unvisited.delete(currentNodeId);
    visited.push(currentNodeId);

    // 更新邻居距离
    const neighbors = adjacencyList[currentNodeId] || [];
    neighbors.forEach(({ nodeId, cost }) => {
      if (unvisited.has(nodeId)) {
        const newDistance = distances[currentNodeId!] + cost;
        if (newDistance < distances[nodeId]) {
          distances[nodeId] = newDistance;
          previous[nodeId] = currentNodeId;
        }
      }
    });
  }

  // 构建最短路径
  const path: string[] = [];
  let current: string | null = 'R4'; // 目标节点
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  return { distances, previous, visited, path };
}

export function OSPFSPFScene() {
  // 动画控制
  const animation = useAnimation({
    steps: animationSteps,
    autoPlay: false,
    loop: false,
  });

  // 参数控制
  const parameters = useParameters({
    initialParameters,
    onChange: (id, value) => {
      console.log('Parameter changed:', id, value);
    },
  });

  // 根据参数计算节点和边
  const { nodes, edges, dijkstraResult } = useMemo(() => {
    const r1r2Cost = parameters.getValue<number>('r1-r2-cost') || 10;
    const r2r3Cost = parameters.getValue<number>('r2-r3-cost') || 5;
    const r1r3Cost = parameters.getValue<number>('r1-r3-cost') || 20;
    const r3r4Cost = parameters.getValue<number>('r3-r4-cost') || 8;
    const r2r4Cost = parameters.getValue<number>('r2-r4-cost') || 30;

    const nodesData: NetworkNode[] = [
      { id: 'R1', label: 'R1', x: 100, y: 200, type: 'root' },
      { id: 'R2', label: 'R2', x: 300, y: 100, type: 'router' },
      { id: 'R3', label: 'R3', x: 300, y: 300, type: 'router' },
      { id: 'R4', label: 'R4', x: 500, y: 200, type: 'router' },
    ];

    const edgesData: NetworkEdge[] = [
      { id: 'e1', from: 'R1', to: 'R2', cost: r1r2Cost },
      { id: 'e2', from: 'R2', to: 'R3', cost: r2r3Cost },
      { id: 'e3', from: 'R1', to: 'R3', cost: r1r3Cost },
      { id: 'e4', from: 'R3', to: 'R4', cost: r3r4Cost },
      { id: 'e5', from: 'R2', to: 'R4', cost: r2r4Cost },
    ];

    // 运行Dijkstra算法
    const result = runDijkstra(nodesData, edgesData, 'R1');

    return {
      nodes: nodesData,
      edges: edgesData,
      dijkstraResult: result,
    };
  }, [parameters]);

  // 计算Cost的公式
  const referenceBandwidth = parameters.getValue<number>('reference-bandwidth') || 100;
  const showCostCalc = parameters.getValue<boolean>('show-cost-calc') ?? true;

  // 根据带宽计算Cost
  const calculateCost = (bandwidthMbps: number): number => {
    return Math.max(1, Math.round(referenceBandwidth / bandwidthMbps));
  };

  // 常见接口带宽对应的Cost表
  const interfaceCosts = useMemo(() => {
    const interfaces = [
      { name: '10Gbps', bandwidth: 10000 },
      { name: '1Gbps', bandwidth: 1000 },
      { name: '100Mbps', bandwidth: 100 },
      { name: '10Mbps', bandwidth: 10 },
      { name: '1.544Mbps(T1)', bandwidth: 1.544 },
      { name: '64Kbps', bandwidth: 0.064 },
    ];
    return interfaces.map(iface => ({
      ...iface,
      cost: calculateCost(iface.bandwidth),
    }));
  }, [referenceBandwidth]);

  // 根据动画步骤生成描述
  const getStepDescription = useCallback((step: number): string => {
    const r1r2Cost = parameters.getValue<number>('r1-r2-cost') || 10;
    const r2r3Cost = parameters.getValue<number>('r2-r3-cost') || 5;
    const r1r3Cost = parameters.getValue<number>('r1-r3-cost') || 20;
    const r3r4Cost = parameters.getValue<number>('r3-r4-cost') || 8;
    const r2r4Cost = parameters.getValue<number>('r2-r4-cost') || 30;

    switch (step) {
      case 0:
        return '路由器R1收集到所有LSA，构建完整的LSDB（链路状态数据库）';
      case 1:
        return '以自己(R1)为根，初始化距离：自己为0，其他为无穷大';
      case 2:
        return `选择距离最小的未访问节点R2，距离为${r1r2Cost}。更新R2邻居的距离。`;
      case 3: {
        const viaR2 = r1r2Cost + r2r3Cost;
        const direct = r1r3Cost;
        const best = Math.min(viaR2, direct);
        const path = best === viaR2 ? `经R2到R3的路径(${r1r2Cost}+${r2r3Cost}=${viaR2})` : `直接到R3的路径(${direct})`;
        return `选择R3，比较路径：直接链路Cost=${direct}，${path}。选择最优路径Cost=${best}。`;
      }
      case 4: {
        const r2Dist = r1r2Cost;
        const r3Dist = Math.min(r1r2Cost + r2r3Cost, r1r3Cost);
        const viaR3 = r3Dist + r3r4Cost;
        const viaR2 = r2Dist + r2r4Cost;
        const best = Math.min(viaR3, viaR2);
        const path = best === viaR3 ? `R1→R3→R4 = ${r3Dist}+${r3r4Cost} = ${viaR3}` : `R1→R2→R4 = ${r2Dist}+${r2r4Cost} = ${viaR2}`;
        return `选择R4，计算最短路径：${path}`;
      }
      case 5:
        return '最短路径树(SPT)构建完成，所有节点都已访问，生成路由表。';
      default:
        return '';
    }
  }, [parameters]);

  // 更新动画步骤描述
  const updatedAnimationSteps = useMemo(() => {
    return animationSteps.map((step, index) => ({
      ...step,
      description: getStepDescription(index),
    }));
  }, [getStepDescription]);

  // 生成路由表数据
  const routingTable = useMemo(() => {
    const table: { destination: string; nextHop: string; cost: number; path: string[] }[] = [];
    
    // 到R2的路由
    table.push({
      destination: 'R2',
      nextHop: 'R2 (直连)',
      cost: dijkstraResult.distances['R2'] || 0,
      path: ['R1', 'R2'],
    });
    
    // 到R3的路由
    const r3Cost = dijkstraResult.distances['R3'] || 0;
    const r3Prev = dijkstraResult.previous['R3'];
    table.push({
      destination: 'R3',
      nextHop: r3Prev === 'R1' ? 'R3 (直连)' : `via ${r3Prev}`,
      cost: r3Cost,
      path: dijkstraResult.path.filter(n => n === 'R1' || n === 'R3' || (r3Prev === 'R2' && n === 'R2')),
    });
    
    // 到R4的路由
    const r4Cost = dijkstraResult.distances['R4'] || 0;
    const r4Path = dijkstraResult.path;
    const r4NextHop = r4Path.length > 1 ? r4Path[1] : 'R4';
    table.push({
      destination: 'R4',
      nextHop: `via ${r4NextHop}`,
      cost: r4Cost,
      path: r4Path,
    });
    
    return table;
  }, [dijkstraResult]);

  return (
    <SceneLayout
      scene={sceneData}
      animationProps={{
        steps: updatedAnimationSteps,
        currentStep: animation.currentStep,
        isPlaying: animation.isPlaying,
        progress: animation.progress,
        onPlay: animation.play,
        onPause: animation.pause,
        onStepChange: animation.goToStep,
        onReset: animation.reset,
      }}
      parameterProps={{
        parameters: parameters.parameters,
        onChange: parameters.updateParameter,
        onReset: parameters.resetParameters,
      }}
    >
      <div className="space-y-6">
        {/* 网络拓扑图 - 固定高度 */}
        <div className="h-[300px] shrink-0">
          <NetworkTopology
            nodes={nodes}
            edges={edges}
            currentStep={animation.currentStep}
            showDistances={parameters.getValue<boolean>('show-distances') ?? true}
            highlightPath={parameters.getValue<boolean>('highlight-path') ?? true}
            dijkstraResult={dijkstraResult}
          />
        </div>
        
        {/* Cost计算器和路由表 */}
        {showCostCalc && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cost计算器 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
            >
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
                <Calculator className="w-5 h-5 text-blue-400" />
                OSPF Cost计算器
              </h3>
              
              {/* 公式说明 */}
              <div className="bg-gray-900/50 rounded-lg p-3 mb-3">
                <div className="text-sm text-gray-300 font-mono">
                  Cost = 参考带宽 / 接口带宽
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  当前参考带宽: {referenceBandwidth} Mbps
                </div>
              </div>
              
              {/* 接口Cost表 */}
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-medium border-b border-gray-700 pb-2">
                  <span>接口类型</span>
                  <span>带宽</span>
                  <span>Cost</span>
                </div>
                {interfaceCosts.map((iface, idx) => (
                  <motion.div
                    key={iface.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="grid grid-cols-3 gap-2 text-sm py-1 border-b border-gray-700/50"
                  >
                    <span className="text-gray-300">{iface.name}</span>
                    <span className="text-gray-400">{iface.bandwidth >= 1 ? `${iface.bandwidth}Mbps` : `${(iface.bandwidth * 1000).toFixed(0)}Kbps`}</span>
                    <span className={`font-mono font-bold ${iface.cost > 100 ? 'text-red-400' : iface.cost > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {iface.cost}
                    </span>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-3 p-2 bg-blue-900/20 rounded-lg border border-blue-500/30">
                <div className="flex items-start gap-2 text-xs text-blue-300">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    现代网络中，10Gbps接口的Cost计算为1，而默认参考带宽100Mbps会导致10Gbps和1Gbps接口Cost相同(都是1)。
                    建议根据网络实际情况调整参考带宽。
                  </span>
                </div>
              </div>
            </motion.div>
            
            {/* 路由表 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
            >
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
                <Table className="w-5 h-5 text-green-400" />
                R1的OSPF路由表
              </h3>
              
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 font-medium border-b border-gray-700 pb-2">
                  <span>目的网络</span>
                  <span>下一跳</span>
                  <span>Cost</span>
                  <span>出接口</span>
                </div>
                {routingTable.map((route, idx) => (
                  <motion.div
                    key={route.destination}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="grid grid-cols-4 gap-2 text-sm py-2 border-b border-gray-700/50 hover:bg-gray-700/30 rounded px-2"
                  >
                    <span className="text-white font-medium">{route.destination}</span>
                    <span className="text-gray-300 text-xs">{route.nextHop}</span>
                    <span className="font-mono font-bold text-blue-400">{route.cost}</span>
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {route.path.join(' → ')}
                    </span>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-3 p-2 bg-green-900/20 rounded-lg border border-green-500/30">
                <div className="text-xs text-green-300">
                  <strong>最短路径树(SPT)已构建完成</strong>
                  <br />
                  所有Cost值基于当前链路参数实时计算
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </SceneLayout>
  );
}
