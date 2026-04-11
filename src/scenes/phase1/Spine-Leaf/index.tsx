import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
  type: 'spine' | 'leaf' | 'core' | 'aggregation' | 'access';
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
  bandwidth?: number; // 带宽 Gbps
}

// 流量路径类型
interface TrafficPath {
  id: string;
  from: string;
  to: string;
  path: string[];
  color: string;
  isActive: boolean;
  failoverPath?: string[]; // 故障时的备用路径
}

const sceneData: Scene = {
  id: 'spine-leaf',
  phase: 1,
  title: 'Spine-Leaf架构：现代数据中心网络',
  category: '网络架构',
  description: '深入理解现代数据中心的Spine-Leaf架构，对比传统三层网络，掌握等价多路径、带宽收敛比、无阻塞网络等核心概念。',
  duration: '8-12分钟',
  difficulty: 'medium',
  isHot: true,
};

// 增强后的动画步骤
const animationSteps = [
  {
    id: 'traditional-problem',
    title: '传统三层架构的瓶颈',
    description: '传统架构：核心-汇聚-接入层。问题：收敛比高达1:4到1:8，南北向流量必经核心层，东西向流量绕路，带宽浪费严重',
    duration: 3000,
  },
  {
    id: 'clos-evolution',
    title: 'Clos网络演进',
    description: 'Spine-Leaf源自1950年代Charles Clos提出的Clos网络。2014年Facebook开源其四post族设计，成为现代数据中心标准',
    duration: 3000,
  },
  {
    id: 'naming-origin',
    title: '命名由来',
    description: 'Leaf（叶子）像树叶连接枝干，Spine（脊椎）是主干。所有Leaf平等地连接所有Spine，任何两点间只有2跳',
    duration: 2500,
  },
  {
    id: 'spine-layer',
    title: 'Spine层：高速转发核心',
    description: 'Spine交换机是Underlay网络核心，提供L3路由转发。所有Spine之间通常不直接相连，仅通过Leaf通信',
    duration: 2500,
  },
  {
    id: 'leaf-layer',
    title: 'Leaf层：ToR交换机',
    description: 'Leaf交换机（ToR - Top of Rack）位于机架顶部，提供L2/L3边界、连接服务器、支持VXLAN VTEP，是Overlay与Underlay的边界',
    duration: 3000,
  },
  {
    id: 'full-mesh',
    title: '全互联拓扑',
    description: '每台Leaf与所有Spine全互联。任何两台服务器通信最多经过：Server→Leaf→Spine→Leaf→Server，仅2跳',
    duration: 3000,
  },
  {
    id: 'oversubscription',
    title: '带宽收敛比',
    description: '收敛比 = 下行总带宽 ÷ 上行总带宽。理想值1:1（无收敛），传统架构1:4~1:8，Spine-Leaf可达1:1.5~1:2',
    duration: 3000,
  },
  {
    id: 'ecmp',
    title: 'ECMP等价多路径',
    description: 'ECMP根据五元组（源/目的IP、端口、协议）哈希选择路径。流量在多条等价路径均匀分布，带宽利用率提升N倍',
    duration: 3000,
  },
  {
    id: 'traffic-flow',
    title: '东西向流量优势',
    description: 'Spine-Leaf专为云原生设计。云平台70-80%流量是东西向（服务器间），传统架构瓶颈在核心层，Spine-Leaf无阻塞转发',
    duration: 3000,
  },
  {
    id: 'mlag-vpc',
    title: 'MLAG跨机箱链路聚合',
    description: 'MLAG（多机箱链路聚合）允许两台Leaf共同连接服务器，实现跨设备链路冗余，提供双活上联和高可用',
    duration: 3000,
  },
  {
    id: 'vxlan-overlay',
    title: 'VXLAN Overlay集成',
    description: 'Leaf交换机作为VTEP（VXLAN隧道端点），在Underlay网络上封装Overlay网络。16M VNI解决VLAN数量限制问题',
    duration: 3000,
  },
  {
    id: 'failure-recovery',
    title: '故障快速收敛',
    description: '毫秒级故障收敛：链路故障→BFD检测（3.3ms）→路由收敛→ECMP更新。RSTP收敛需30-50秒，Spine-Leaf无需STP',
    duration: 4000,
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
    id: 'link-speed',
    name: '上行链路带宽',
    type: 'select' as const,
    value: '25G',
    options: [
      { label: '10G', value: '10G' },
      { label: '25G', value: '25G' },
      { label: '40G', value: '40G' },
      { label: '100G', value: '100G' },
    ],
    description: 'Leaf到Spine的链路带宽',
  },
  {
    id: 'show-ecmp',
    name: '显示ECMP路径',
    type: 'boolean' as const,
    value: true,
    description: '高亮显示等价多路径',
  },
  {
    id: 'show-traditional',
    name: '显示传统架构对比',
    type: 'boolean' as const,
    value: false,
    description: '并排显示传统三层架构',
  },
  {
    id: 'show-oversubscription',
    name: '显示收敛比',
    type: 'boolean' as const,
    value: true,
    description: '显示带宽收敛比计算',
  },
  {
    id: 'simulate-traffic',
    name: '模拟流量',
    type: 'boolean' as const,
    value: true,
    description: '显示数据包流动动画',
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

// 解析链路速度为数值
const parseLinkSpeed = (speed: string): number => {
  return parseInt(speed.replace('G', ''));
};

export function SpineLeafScene() {
  // 本地状态
  const [failedLink, setFailedLink] = useState<string | null>(null);
  const [failedSwitch, setFailedSwitch] = useState<string | null>(null);
  const [activeTrafficPaths, setActiveTrafficPaths] = useState<string[]>([]);
  const [failoverAnimation, setFailoverAnimation] = useState<{
    fromPath: string;
    toPath: string;
    progress: number;
  } | null>(null);

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
  const showTraditional = parameters.getValue<boolean>('show-traditional') ?? false;
  const showOversubscription = parameters.getValue<boolean>('show-oversubscription') ?? true;
  const simulateTraffic = parameters.getValue<boolean>('simulate-traffic') ?? true;
  const linkSpeedStr = parameters.getValue<string>('link-speed') || '25G';
  const linkSpeed = parseLinkSpeed(linkSpeedStr);

  // 计算收敛比
  const calculations = useMemo(() => {
    const totalServerBandwidth = serverPerLeaf * leafCount * 10; // 每服务器10G
    const totalSpineBandwidth = leafCount * linkSpeed; // 每Spine的上行总带宽
    const totalSpineInput = spineCount * linkSpeed; // Spine总下行带宽
    const oversubscriptionRatio = totalServerBandwidth / totalSpineInput;
    
    return {
      totalServerBandwidth,
      totalSpineBandwidth,
      totalSpineInput,
      oversubscriptionRatio,
      idealRatio: 1,
      isHealthy: oversubscriptionRatio <= 2,
    };
  }, [serverPerLeaf, leafCount, spineCount, linkSpeed]);

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
          ip: `10.${leafIndex}.${i + 1}/24`, // 修正：使用合理的子网划分
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
          trafficLoad: Math.random() * 60 + 20,
          bandwidth: linkSpeed,
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
        bandwidth: 10,
      });
    });

    return ls;
  }, [leafSwitches, spineSwitches, servers, failedLink, failedSwitch, linkSpeed]);

  // 生成ECMP路径
  const ecmpPaths: TrafficPath[] = useMemo(() => {
    if (!showEcmp || servers.length < 2) return [];
    
    const paths: TrafficPath[] = [];
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    
    const srcServer = servers[0];
    const dstServer = servers[servers.length - 1];
    const srcLeaf = `LEAF${srcServer.rack}`;
    const dstLeaf = `LEAF${dstServer.rack}`;
    
    spineSwitches.forEach((spine, index) => {
      if (spine.isActive) {
        paths.push({
          id: `path-${spine.id}`,
          from: srcServer.id,
          to: dstServer.id,
          path: [srcServer.id, srcLeaf, spine.id, dstLeaf, dstServer.id],
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
        return `传统三层架构：核心层→汇聚层→接入层。收敛比1:4~1:8，南北向流量必经核心，瓶颈严重`;
      case 1:
        return `Clos网络（1953年Charles Clos提出）。2014年Facebook开源四post族，奠定现代数据中心基础`;
      case 2:
        return `Leaf像树叶，Spine像脊椎。所有叶子平等连接主干，任意两点最多2跳`;
      case 3:
        return `Spine层：${spineCount}台L3核心交换机，提供${linkSpeed}G高速转发`;
      case 4:
        return `Leaf交换机（ToR）位于机架顶部，提供L2/L3边界、连接服务器、支持VXLAN VTEP`;
      case 5:
        return `全互联拓扑：${leafCount}台Leaf × ${spineCount}台Spine = ${totalLinks}条等价路径`;
      case 6:
        return `收敛比 = ${calculations.totalServerBandwidth}G ÷ ${calculations.totalSpineInput}G = 1:${calculations.oversubscriptionRatio.toFixed(1)}`;
      case 7:
        return `ECMP基于五元组哈希负载均衡，${spineCount}条等价路径，流量均匀分布`;
      case 8:
        return `东西向流量（服务器间）占云平台70-80%，Spine-Leaf无阻塞转发，完美适配`;
      case 9:
        return `MLAG双活上联：服务器双网卡分别连接两台Leaf，实现跨设备链路聚合`;
      case 10:
        return `VXLAN：Leaf作为VTEP封装Overlay报文，16M VNI支持多租户隔离`;
      case 11:
        return `故障收敛：毫秒级检测+路由收敛，无需STP，避免30-50秒的RSTP收敛延迟`;
      default:
        return '';
    }
  }, [spineCount, leafCount, servers.length, links, linkSpeed, calculations]);

  // 更新动画步骤描述
  const updatedAnimationSteps = useMemo(() => {
    return animationSteps.map((step, index) => ({
      ...step,
      description: getStepDescription(index),
    }));
  }, [getStepDescription]);

  // 模拟链路故障（带流量漂移动画）
  const simulateLinkFailure = useCallback(() => {
    const leafSpineLinks = links.filter(l => l.from.startsWith('LEAF') && l.to.startsWith('SPINE'));
    if (leafSpineLinks.length > 0) {
      const randomLink = leafSpineLinks[Math.floor(Math.random() * leafSpineLinks.length)];
      setFailedLink(randomLink.id);
      
      // 启动故障恢复动画
      setFailoverAnimation({
        fromPath: randomLink.id,
        toPath: 're-routing',
        progress: 0,
      });
      
      setTimeout(() => setFailedLink(null), 5000);
    }
  }, [links]);

  // 故障恢复动画更新
  useEffect(() => {
    if (failoverAnimation) {
      const interval = setInterval(() => {
        setFailoverAnimation(prev => {
          if (!prev) return null;
          if (prev.progress >= 1) {
            clearInterval(interval);
            return null;
          }
          return { ...prev, progress: prev.progress + 0.05 };
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [failoverAnimation]);

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
      <div className="relative w-full h-full">
        {/* Spine-Leaf 拓扑 */}
        <SpineLeafTopology
          spineSwitches={spineSwitches}
          leafSwitches={leafSwitches}
          servers={servers}
          links={links}
          ecmpPaths={ecmpPaths}
          currentStep={animation.currentStep}
          simulateTraffic={simulateTraffic}
          failedLink={failedLink}
          failoverAnimation={failoverAnimation}
          onSimulateFailure={simulateLinkFailure}
        />

        {/* 收敛比计算面板 */}
        {showOversubscription && (
          <OversubscriptionPanel calculations={calculations} />
        )}

        {/* 知识点提示面板 */}
        <KnowledgeTipsPanel currentStep={animation.currentStep} />
      </div>
    </SceneLayout>
  );
}

// 收敛比计算面板
interface OversubscriptionPanelProps {
  calculations: {
    totalServerBandwidth: number;
    totalSpineBandwidth: number;
    totalSpineInput: number;
    oversubscriptionRatio: number;
    idealRatio: number;
    isHealthy: boolean;
  };
}

function OversubscriptionPanel({ calculations }: OversubscriptionPanelProps) {
  return (
    <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4 w-64">
      <h4 className="text-sm font-semibold text-slate-200 mb-3">带宽收敛比分析</h4>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">服务器总带宽:</span>
          <span className="text-slate-200">{calculations.totalServerBandwidth}G</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Spine总下行:</span>
          <span className="text-slate-200">{calculations.totalSpineInput}G</span>
        </div>
        <div className="border-t border-slate-700 pt-2 mt-2">
          <div className="flex justify-between font-semibold">
            <span className="text-slate-300">收敛比:</span>
            <span className={calculations.isHealthy ? 'text-green-400' : 'text-amber-400'}>
              1:{calculations.oversubscriptionRatio.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-slate-400">理想值:</span>
          <span className="text-green-400">1:1</span>
        </div>
      </div>

      {/* 收敛比条形图 */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-8">理想</span>
          <div className="flex-1 h-2 bg-slate-700 rounded overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded"
              style={{ width: `${Math.min(100, (calculations.idealRatio / calculations.oversubscriptionRatio) * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-400 w-8">当前</span>
          <div className="flex-1 h-2 bg-slate-700 rounded overflow-hidden">
            <div 
              className={`h-full rounded transition-all ${calculations.isHealthy ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, (calculations.oversubscriptionRatio / 2) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className={`mt-2 text-xs ${calculations.isHealthy ? 'text-green-400' : 'text-amber-400'}`}>
        {calculations.isHealthy ? '✓ 收敛比健康' : '⚠ 收敛比较高'}
      </div>
    </div>
  );
}

// 知识点提示面板
interface KnowledgeTipsPanelProps {
  currentStep: number;
}

function KnowledgeTipsPanel({ currentStep }: KnowledgeTipsPanelProps) {
  const tips = [
    { step: 0, title: '传统三层瓶颈', points: ['收敛比1:4~1:8', '核心层单点瓶颈', '东西向流量绕路'] },
    { step: 1, title: 'Clos网络起源', points: ['1953年Charles Clos', 'Facebook 2014开源', '现代数据中心基础'] },
    { step: 2, title: '命名含义', points: ['Leaf = 叶子', 'Spine = 脊椎', '最多2跳可达'] },
    { step: 3, title: 'Spine层角色', points: ['L3高速转发', 'Underlay核心', '全互联等价'] },
    { step: 4, title: 'Leaf层角色', points: ['ToR交换机', 'L2/L3边界', 'VXLAN VTEP'] },
    { step: 5, title: '全互联拓扑', points: ['N×M等价路径', '无单点故障', '任两点2跳'] },
    { step: 6, title: '收敛比计算', points: ['下行÷上行', '1:1最理想', '≤1:2健康'] },
    { step: 7, title: 'ECMP原理', points: ['五元组哈希', '等价路径均衡', '带宽利用率↑'] },
    { step: 8, title: '东西向优势', points: ['云平台70-80%', '无阻塞转发', '完美适配云原生'] },
    { step: 9, title: 'MLAG双活', points: ['跨设备LAG', '双活上联', '高可用保障'] },
    { step: 10, title: 'VXLAN集成', points: ['Overlay封装', '16M VNI', '多租户隔离'] },
    { step: 11, title: '故障收敛', points: ['毫秒级检测', 'BFD 3.3ms', '无需STP'] },
  ];

  const currentTip = tips.find(t => t.step === currentStep);

  if (!currentTip) return null;

  return (
    <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 w-48">
      <h4 className="text-sm font-semibold text-indigo-400 mb-2">{currentTip.title}</h4>
      <ul className="space-y-1">
        {currentTip.points.map((point, idx) => (
          <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            {point}
          </li>
        ))}
      </ul>
    </div>
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
  failoverAnimation: { fromPath: string; toPath: string; progress: number } | null;
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
  failoverAnimation,
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
      if (currentStep >= 7 && ecmpPaths.length > 0) {
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

      // 绘制故障恢复漂移动画
      if (failoverAnimation && failoverAnimation.progress > 0) {
        const [failedLeaf, failedSpine] = failoverAnimation.fromPath.split('-');
        const failedLeafPos = getNodePos(failedLeaf);
        const failedSpinePos = getNodePos(failedSpine);
        
        if (failedLeafPos && failedSpinePos) {
          // 绘制漂移中的流量
          const driftProgress = failoverAnimation.progress;
          const midX = (failedLeafPos.x + failedSpinePos.x) / 2;
          const midY = (failedLeafPos.y + failedSpinePos.y) / 2;
          
          // 绘制警告图标
          ctx.fillStyle = `rgba(239, 68, 68, ${driftProgress})`;
          ctx.beginPath();
          ctx.arc(midX, midY, 15 * driftProgress, 0, Math.PI * 2);
          ctx.fill();
          
          // 绘制重新路由箭头
          if (driftProgress > 0.5) {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(midX, midY, 25, 0, Math.PI * 2 * (driftProgress - 0.5) * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
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
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
        } else if (!link.isActive) {
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1;
        } else if (isLeafSpine) {
          // 根据负载显示不同颜色
          const load = link.trafficLoad;
          if (load > 70) {
            ctx.strokeStyle = '#f59e0b';
          } else if (load > 40) {
            ctx.strokeStyle = '#3b82f6';
          } else {
            ctx.strokeStyle = '#22c55e';
          }
          ctx.lineWidth = 2 + (load / 50);
        } else {
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 2;
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // 显示链路带宽
        if (isLeafSpine && link.isActive && !isFailed && currentStep >= 3) {
          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${link.bandwidth}G`, midX, midY - 5);
        }
      });

      // 绘制Spine交换机
      spineSwitches.forEach((spine) => {
        const pos = getPos(spine.x, spine.y);
        
        if (!spine.isActive) {
          ctx.globalAlpha = 0.3;
        }

        // 外发光效果
        if (currentStep >= 3) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 38, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
          ctx.fill();
        }

        // 交换机主体
        ctx.fillStyle = spine.isActive ? '#5b21b6' : '#374151';
        ctx.beginPath();
        ctx.roundRect(pos.x - 35, pos.y - 22, 70, 44, 8);
        ctx.fill();

        // 边框
        ctx.strokeStyle = spine.isActive ? '#8b5cf6' : '#6b7280';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 类型标签
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SPINE', pos.x, pos.y - 6);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(spine.name.replace('Spine ', 'S'), pos.x, pos.y + 10);

        ctx.globalAlpha = 1;
      });

      // 绘制Leaf交换机
      leafSwitches.forEach((leaf) => {
        const pos = getPos(leaf.x, leaf.y);
        
        if (!leaf.isActive) {
          ctx.globalAlpha = 0.3;
        }

        // 外发光效果
        if (currentStep >= 4) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 38, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
          ctx.fill();
        }

        // 交换机主体
        ctx.fillStyle = leaf.isActive ? '#1e40af' : '#374151';
        ctx.beginPath();
        ctx.roundRect(pos.x - 35, pos.y - 22, 70, 44, 8);
        ctx.fill();

        // 边框
        ctx.strokeStyle = leaf.isActive ? '#3b82f6' : '#6b7280';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 类型标签
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LEAF', pos.x, pos.y - 6);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(leaf.name.replace('Leaf ', 'L'), pos.x, pos.y + 10);

        ctx.globalAlpha = 1;
      });

      // 绘制服务器
      servers.forEach((server) => {
        const pos = getPos(server.x, server.y);

        // 服务器主体
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.roundRect(pos.x - 28, pos.y - 18, 56, 36, 6);
        ctx.fill();
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 服务器指示灯（闪烁效果）
        const blinkOn = Math.floor(Date.now() / 500) % 2 === 0;
        ctx.fillStyle = blinkOn ? '#22c55e' : '#166534';
        ctx.beginPath();
        ctx.arc(pos.x - 18, pos.y - 8, 4, 0, Math.PI * 2);
        ctx.fill();

        // 名称和IP
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(server.name, pos.x + 5, pos.y - 4);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.fillText(server.ip, pos.x + 5, pos.y + 10);
      });

      // 绘制流量动画
      if (simulateTraffic && currentStep >= 8) {
        ecmpPaths.forEach((path) => {
          if (!path.isActive) return;

          const pathKey = path.id;
          let progress = packetPositions.current.get(pathKey) || 0;
          
          // 缓动效果
          progress += 0.003;
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
              ctx.arc(x, y, 6, 0, Math.PI * 2);
              ctx.fill();
              
              // 发光效果
              ctx.beginPath();
              ctx.arc(x, y, 10, 0, Math.PI * 2);
              ctx.fillStyle = path.color + '50';
              ctx.fill();
              
              // 数据包轨迹
              ctx.strokeStyle = path.color + '30';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(fromPos.x, fromPos.y);
              ctx.lineTo(x, y);
              ctx.stroke();
            }
          }
        });
      }

      // 绘制架构标签
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Spine-Leaf 现代数据中心架构', 20, 30);

      // 绘制层标签
      if (currentStep >= 3) {
        ctx.fillStyle = '#8b5cf6';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▲ Spine层', width / 2, 50);
      }
      
      if (currentStep >= 4) {
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼ Leaf层 (ToR)', width / 2, 185);
      }

      // 绘制图例
      const legendY = height - 100;
      
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(20, legendY, 25, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('Spine层', 50, legendY + 4);

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(20, legendY + 18, 25, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Leaf层 (ToR)', 50, legendY + 22);

      ctx.fillStyle = '#22c55e';
      ctx.fillRect(20, legendY + 36, 25, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('低负载链路', 50, legendY + 40);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(20, legendY + 54, 25, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('高负载链路', 50, legendY + 58);

      ctx.fillStyle = '#ef4444';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(20, legendY + 72);
      ctx.lineTo(45, legendY + 72);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('故障/漂移中', 50, legendY + 76);

      // 故障模拟按钮提示
      if (currentStep >= 11) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('👆 点击画布模拟链路故障', width - 20, 30);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [spineSwitches, leafSwitches, servers, links, ecmpPaths, currentStep, simulateTraffic, failedLink, failoverAnimation]);

  // 点击画布模拟故障
  const handleCanvasClick = () => {
    if (currentStep >= 11) {
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
