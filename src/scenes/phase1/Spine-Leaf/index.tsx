import { useMemo, useState, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { useAnimation } from '../../../hooks/useAnimation';
import { useParameters } from '../../../hooks/useParameters';

// Scene 类型定义（内联避免模块导入问题）
interface Scene {
  id: string;
  title: string;
  description: string;
  phase: 1 | 2 | 3 | 4;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: string;
  isHot?: boolean;
}

// 交换机类型
interface Switch {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'spine' | 'leaf';
  isActive: boolean;
}

// 服务器类型
interface Server {
  id: string;
  name: string;
  x: number;
  y: number;
  rack: number;
  ip: string;
}

// 链路类型
interface Link {
  id: string;
  from: string;
  to: string;
  isActive: boolean;
  trafficLoad: number; // 0-100
}

// 流量路径类型
interface TrafficPath {
  id: string;
  from: string;
  to: string;
  path: string[]; // 经过的节点ID序列
  color: string;
  isActive: boolean;
}

const sceneData: Scene = {
  id: 'spine-leaf',
  phase: 1,
  title: 'Spine-Leaf架构：数据中心网络拓扑',
  category: '网络架构',
  description: '通过可视化演示现代数据中心Spine-Leaf架构，展示全互联拓扑、ECMP等价多路径负载均衡、以及无阻塞网络的设计理念。',
  duration: '5-8分钟',
  difficulty: 'medium',
  isHot: true,
};

// 动画步骤
const animationSteps = [
  {
    id: 'intro',
    title: '架构概览',
    description: 'Spine-Leaf是现代化数据中心的标准架构，由Spine层和Leaf层组成全互联拓扑',
    duration: 2000,
  },
  {
    id: 'spine-layer',
    title: 'Spine层',
    description: 'Spine交换机位于架构顶层，负责高速转发，所有Spine之间不直接相连',
    duration: 2500,
  },
  {
    id: 'leaf-layer',
    title: 'Leaf层',
    description: 'Leaf交换机位于接入层，连接服务器和Spine，每台Leaf与所有Spine全互联',
    duration: 2500,
  },
  {
    id: 'full-mesh',
    title: '全互联拓扑',
    description: '每台Leaf交换机都与所有Spine交换机相连，形成全互联网络，消除单点故障',
    duration: 3000,
  },
  {
    id: 'ecmp',
    title: 'ECMP负载均衡',
    description: '等价多路径（ECMP）允许流量在多条等价路径上均匀分布，提高带宽利用率',
    duration: 3000,
  },
  {
    id: 'traffic-flow',
    title: '流量演示',
    description: '观察服务器间通信如何通过不同路径传输，实现负载均衡和冗余备份',
    duration: 4000,
  },
  {
    id: 'failure',
    title: '故障恢复',
    description: '当某条链路或交换机故障时，流量自动切换到备用路径，保证业务连续性',
    duration: 3000,
  },
];

// 初始参数
const initialParameters = [
  {
    id: 'spine-count',
    name: 'Spine交换机数量',
    type: 'range' as const,
    value: 2,
    min: 2,
    max: 4,
    step: 1,
    unit: '台',
    description: 'Spine层交换机数量（通常2-4台）',
  },
  {
    id: 'leaf-count',
    name: 'Leaf交换机数量',
    type: 'range' as const,
    value: 4,
    min: 2,
    max: 6,
    step: 1,
    unit: '台',
    description: 'Leaf层交换机数量（通常4-8台）',
  },
  {
    id: 'server-per-leaf',
    name: '每Leaf服务器数',
    type: 'range' as const,
    value: 2,
    min: 1,
    max: 4,
    step: 1,
    unit: '台',
    description: '每台Leaf连接的服务器数量',
  },
  {
    id: 'show-ecmp',
    name: '显示ECMP路径',
    type: 'boolean' as const,
    value: true,
    description: '高亮显示等价多路径',
  },
  {
    id: 'simulate-traffic',
    name: '模拟流量',
    type: 'boolean' as const,
    value: true,
    description: '显示数据包流动动画',
  },
  {
    id: 'link-speed',
    name: '链路带宽',
    type: 'select' as const,
    value: '10G',
    options: [
      { label: '1G', value: '1G' },
      { label: '10G', value: '10G' },
      { label: '25G', value: '25G' },
      { label: '40G', value: '40G' },
      { label: '100G', value: '100G' },
    ],
    description: 'Leaf到Spine的链路带宽',
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

export function SpineLeafScene() {
  // 本地状态
  const [failedLink, setFailedLink] = useState<string | null>(null);
  const [failedSwitch, setFailedSwitch] = useState<string | null>(null);
  const [activeTrafficPaths, setActiveTrafficPaths] = useState<string[]>([]);

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

  // 获取参数值
  const spineCount = parameters.getValue<number>('spine-count') || 2;
  const leafCount = parameters.getValue<number>('leaf-count') || 4;
  const serverPerLeaf = parameters.getValue<number>('server-per-leaf') || 2;
  const showEcmp = parameters.getValue<boolean>('show-ecmp') ?? true;
  const simulateTraffic = parameters.getValue<boolean>('simulate-traffic') ?? true;
  const linkSpeed = parameters.getValue<string>('link-speed') || '10G';

  // 生成Spine交换机
  const spineSwitches: Switch[] = useMemo(() => {
    const spines: Switch[] = [];
    const spacing = 600 / (spineCount + 1);
    for (let i = 0; i < spineCount; i++) {
      spines.push({
        id: `SPINE${i + 1}`,
        name: `Spine ${i + 1}`,
        x: spacing * (i + 1),
        y: 80,
        type: 'spine',
        isActive: failedSwitch !== `SPINE${i + 1}`,
      });
    }
    return spines;
  }, [spineCount, failedSwitch]);

  // 生成Leaf交换机
  const leafSwitches: Switch[] = useMemo(() => {
    const leaves: Switch[] = [];
    const spacing = 600 / (leafCount + 1);
    for (let i = 0; i < leafCount; i++) {
      leaves.push({
        id: `LEAF${i + 1}`,
        name: `Leaf ${i + 1}`,
        x: spacing * (i + 1),
        y: 220,
        type: 'leaf',
        isActive: failedSwitch !== `LEAF${i + 1}`,
      });
    }
    return leaves;
  }, [leafCount, failedSwitch]);

  // 生成服务器
  const servers: Server[] = useMemo(() => {
    const srvs: Server[] = [];
    leafSwitches.forEach((leaf, leafIndex) => {
      const serverSpacing = 100 / (serverPerLeaf + 1);
      for (let i = 0; i < serverPerLeaf; i++) {
        srvs.push({
          id: `SERVER${leafIndex}-${i}`,
          name: `S${leafIndex + 1}-${i + 1}`,
          x: leaf.x - 50 + serverSpacing * (i + 1) * 2,
          y: 340,
          rack: leafIndex + 1,
          ip: `10.0.${leafIndex + 1}.${i + 1}`,
        });
      }
    });
    return srvs;
  }, [leafSwitches, serverPerLeaf]);

  // 生成链路（Leaf到Spine全互联）
  const links: Link[] = useMemo(() => {
    const ls: Link[] = [];
    
    // Leaf到Spine的链路
    leafSwitches.forEach((leaf) => {
      spineSwitches.forEach((spine) => {
        const linkId = `${leaf.id}-${spine.id}`;
        ls.push({
          id: linkId,
          from: leaf.id,
          to: spine.id,
          isActive: leaf.isActive && spine.isActive && failedLink !== linkId,
          trafficLoad: Math.random() * 60 + 20, // 模拟20-80%负载
        });
      });
    });

    // 服务器到Leaf的链路
    servers.forEach((server) => {
      const leafId = `LEAF${server.rack}`;
      const linkId = `${server.id}-${leafId}`;
      ls.push({
        id: linkId,
        from: server.id,
        to: leafId,
        isActive: !failedSwitch || !failedSwitch.includes(`LEAF${server.rack}`),
        trafficLoad: 30,
      });
    });

    return ls;
  }, [leafSwitches, spineSwitches, servers, failedLink, failedSwitch]);

  // 生成ECMP路径
  const ecmpPaths: TrafficPath[] = useMemo(() => {
    if (!showEcmp || servers.length < 2) return [];
    
    const paths: TrafficPath[] = [];
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    
    // 从第一个服务器到最后一个服务器的多条路径
    const srcServer = servers[0];
    const dstServer = servers[servers.length - 1];
    
    spineSwitches.forEach((spine, index) => {
      if (spine.isActive) {
        paths.push({
          id: `path-${spine.id}`,
          from: srcServer.id,
          to: dstServer.id,
          path: [srcServer.id, `LEAF${srcServer.rack}`, spine.id, `LEAF${dstServer.rack}`, dstServer.id],
          color: colors[index % colors.length],
          isActive: true,
        });
      }
    });
    
    return paths;
  }, [servers, spineSwitches, showEcmp]);

  // 根据动画步骤生成描述
  const getStepDescription = useCallback((step: number): string => {
    const totalLinks = links.filter(l => l.from.startsWith('LEAF') && l.to.startsWith('SPINE')).length;
    
    switch (step) {
      case 0:
        return `当前架构：${spineCount}台Spine，${leafCount}台Leaf，${servers.length}台服务器，共${totalLinks}条Leaf-Spine链路`;
      case 1:
        return `Spine层：${spineCount}台核心交换机，提供高速转发能力，支持${linkSpeed}链路`;
      case 2:
        return `Leaf层：${leafCount}台接入交换机，每台Leaf上行连接到所有Spine`;
      case 3:
        return `全互联拓扑：每台Leaf与所有Spine相连，任意单点故障不影响整体连通性`;
      case 4:
        return `ECMP：利用${spineCount}条等价路径进行负载均衡，带宽利用率提升${spineCount}倍`;
      case 5:
        return `流量在东-西向（服务器间）通过不同Spine转发，实现负载分担`;
      case 6:
        return `故障自动切换：当链路或设备故障时，流量在毫秒级切换到备用路径`;
      default:
        return '';
    }
  }, [spineCount, leafCount, servers.length, links, linkSpeed]);

  // 更新动画步骤描述
  const updatedAnimationSteps = useMemo(() => {
    return animationSteps.map((step, index) => ({
      ...step,
      description: getStepDescription(index),
    }));
  }, [getStepDescription]);

  // 模拟链路故障
  const simulateLinkFailure = useCallback(() => {
    const leafSpineLinks = links.filter(l => l.from.startsWith('LEAF') && l.to.startsWith('SPINE'));
    if (leafSpineLinks.length > 0) {
      const randomLink = leafSpineLinks[Math.floor(Math.random() * leafSpineLinks.length)];
      setFailedLink(randomLink.id);
      setTimeout(() => setFailedLink(null), 3000);
    }
  }, [links]);

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
      <SpineLeafTopology
        spineSwitches={spineSwitches}
        leafSwitches={leafSwitches}
        servers={servers}
        links={links}
        ecmpPaths={ecmpPaths}
        currentStep={animation.currentStep}
        simulateTraffic={simulateTraffic}
        failedLink={failedLink}
        onSimulateFailure={simulateLinkFailure}
      />
    </SceneLayout>
  );
}

// Spine-Leaf拓扑组件
interface SpineLeafTopologyProps {
  spineSwitches: Switch[];
  leafSwitches: Switch[];
  servers: Server[];
  links: Link[];
  ecmpPaths: TrafficPath[];
  currentStep: number;
  simulateTraffic: boolean;
  failedLink: string | null;
  onSimulateFailure: () => void;
}

function SpineLeafTopology({
  spineSwitches,
  leafSwitches,
  servers,
  links,
  ecmpPaths,
  currentStep,
  simulateTraffic,
  failedLink,
  onSimulateFailure,
}: SpineLeafTopologyProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationRef = React.useRef<number>(0);
  const packetPositions = React.useRef<Map<string, number>>(new Map());

  React.useEffect(() => {
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

    // 动画循环
    const animate = () => {
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

      // 计算位置（相对于画布中心）
      const scaleX = width / 700;
      const scaleY = height / 450;
      const offsetX = 50;
      const offsetY = 20;

      const getPos = (x: number, y: number) => ({
        x: x * scaleX + offsetX,
        y: y * scaleY + offsetY,
      });

      // 获取节点位置
      const getNodePos = (nodeId: string) => {
        const spine = spineSwitches.find(s => s.id === nodeId);
        if (spine) return getPos(spine.x, spine.y);
        
        const leaf = leafSwitches.find(l => l.id === nodeId);
        if (leaf) return getPos(leaf.x, leaf.y);
        
        const server = servers.find(s => s.id === nodeId);
        if (server) return getPos(server.x, server.y);
        
        return null;
      };

      // 绘制ECMP路径（在链路下方）
      if (currentStep >= 4 && ecmpPaths.length > 0) {
        ecmpPaths.forEach((path, index) => {
          if (!path.isActive) return;
          
          ctx.strokeStyle = path.color;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.3;
          ctx.setLineDash([5, 5]);
          
          ctx.beginPath();
          path.path.forEach((nodeId, i) => {
            const pos = getNodePos(nodeId);
            if (pos) {
              if (i === 0) {
                ctx.moveTo(pos.x, pos.y);
              } else {
                ctx.lineTo(pos.x, pos.y);
              }
            }
          });
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        });
      }

      // 绘制链路
      links.forEach((link) => {
        const fromPos = getNodePos(link.from);
        const toPos = getNodePos(link.to);
        
        if (!fromPos || !toPos) return;

        const isFailed = failedLink === link.id;
        const isLeafSpine = link.from.startsWith('LEAF') && link.to.startsWith('SPINE');

        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);

        if (isFailed) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
        } else if (!link.isActive) {
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1;
        } else if (isLeafSpine) {
          // 根据负载显示不同颜色
          const load = link.trafficLoad;
          if (load > 70) {
            ctx.strokeStyle = '#f59e0b'; // 高负载-黄色
          } else if (load > 40) {
            ctx.strokeStyle = '#3b82f6'; // 中负载-蓝色
          } else {
            ctx.strokeStyle = '#22c55e'; // 低负载-绿色
          }
          ctx.lineWidth = 2 + (load / 50);
        } else {
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 2;
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // 显示链路负载百分比
        if (isLeafSpine && link.isActive && !isFailed && currentStep >= 4) {
          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(link.trafficLoad)}%`, midX, midY - 5);
        }
      });

      // 绘制Spine交换机
      spineSwitches.forEach((spine) => {
        const pos = getPos(spine.x, spine.y);
        
        if (!spine.isActive) {
          ctx.globalAlpha = 0.3;
        }

        // 外发光效果
        if (currentStep >= 1) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
          ctx.fill();
        }

        // 交换机主体
        ctx.fillStyle = spine.isActive ? '#5b21b6' : '#374151';
        ctx.beginPath();
        ctx.roundRect(pos.x - 30, pos.y - 20, 60, 40, 6);
        ctx.fill();

        // 边框
        ctx.strokeStyle = spine.isActive ? '#8b5cf6' : '#6b7280';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 名称
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spine.name, pos.x, pos.y);

        ctx.globalAlpha = 1;
      });

      // 绘制Leaf交换机
      leafSwitches.forEach((leaf) => {
        const pos = getPos(leaf.x, leaf.y);
        
        if (!leaf.isActive) {
          ctx.globalAlpha = 0.3;
        }

        // 外发光效果
        if (currentStep >= 2) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.fill();
        }

        // 交换机主体
        ctx.fillStyle = leaf.isActive ? '#1e40af' : '#374151';
        ctx.beginPath();
        ctx.roundRect(pos.x - 30, pos.y - 20, 60, 40, 6);
        ctx.fill();

        // 边框
        ctx.strokeStyle = leaf.isActive ? '#3b82f6' : '#6b7280';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 名称
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(leaf.name, pos.x, pos.y);

        ctx.globalAlpha = 1;
      });

      // 绘制服务器
      servers.forEach((server) => {
        const pos = getPos(server.x, server.y);

        // 服务器主体
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.roundRect(pos.x - 25, pos.y - 15, 50, 30, 4);
        ctx.fill();
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 服务器指示灯
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(pos.x - 15, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // 名称
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(server.name, pos.x, pos.y);

        // IP地址
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.fillText(server.ip, pos.x, pos.y + 22);
      });

      // 绘制流量动画
      if (simulateTraffic && currentStep >= 5) {
        ecmpPaths.forEach((path) => {
          if (!path.isActive) return;

          const pathKey = path.id;
          let progress = packetPositions.current.get(pathKey) || 0;
          progress += 0.005;
          if (progress > 1) progress = 0;
          packetPositions.current.set(pathKey, progress);

          // 计算当前位置
          const totalSegments = path.path.length - 1;
          const segmentProgress = progress * totalSegments;
          const segmentIndex = Math.floor(segmentProgress);
          const localProgress = segmentProgress - segmentIndex;

          if (segmentIndex < totalSegments) {
            const fromPos = getNodePos(path.path[segmentIndex]);
            const toPos = getNodePos(path.path[segmentIndex + 1]);
            
            if (fromPos && toPos) {
              const x = fromPos.x + (toPos.x - fromPos.x) * localProgress;
              const y = fromPos.y + (toPos.y - fromPos.y) * localProgress;

              // 绘制数据包
              ctx.fillStyle = path.color;
              ctx.beginPath();
              ctx.arc(x, y, 5, 0, Math.PI * 2);
              ctx.fill();
              
              // 发光效果
              ctx.beginPath();
              ctx.arc(x, y, 8, 0, Math.PI * 2);
              ctx.fillStyle = path.color + '40';
              ctx.fill();
            }
          }
        });
      }

      // 绘制标题
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Spine-Leaf 数据中心架构', 20, 30);

      // 绘制图例
      const legendY = height - 120;
      
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(20, legendY, 20, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('Spine层', 45, legendY + 4);

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(20, legendY + 18, 20, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Leaf层', 45, legendY + 22);

      ctx.fillStyle = '#22c55e';
      ctx.fillRect(20, legendY + 36, 20, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('低负载链路', 45, legendY + 40);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(20, legendY + 54, 20, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('高负载链路', 45, legendY + 58);

      ctx.fillStyle = '#ef4444';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(20, legendY + 72);
      ctx.lineTo(40, legendY + 72);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('故障链路', 45, legendY + 76);

      // 故障模拟按钮提示
      if (currentStep >= 6) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('点击模拟链路故障', width - 20, 30);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [spineSwitches, leafSwitches, servers, links, ecmpPaths, currentStep, simulateTraffic, failedLink]);

  // 点击画布模拟故障
  const handleCanvasClick = () => {
    if (currentStep >= 6) {
      onSimulateFailure();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-pointer"
      style={{ display: 'block' }}
      onClick={handleCanvasClick}
    />
  );
}

// 导入React
import * as React from 'react';
