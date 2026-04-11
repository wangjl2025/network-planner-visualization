import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Info, 
  ArrowRight,
  Activity,
  Server,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  BookOpen,
  Target,
  Layers,
  Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// STP生成树协议场景 - 深度完善版
// 核心功能：根桥选举、BPDU传播动画、端口状态变化、故障模拟

interface Switch {
  id: string;
  name: string;
  priority: number;
  mac: string;
  x: number;
  y: number;
  isRoot: boolean;
  rootPathCost: number;
  rootId: string;
  selected: boolean;
  // 端口状态
  ports: {
    [linkId: string]: {
      role: 'root' | 'designated' | 'blocked' | 'unknown';
      state: 'blocking' | 'listening' | 'learning' | 'forwarding' | 'disabled';
    }
  };
}

interface Link {
  id: string;
  from: string;
  to: string;
  cost: number;
}

// BPDU报文
interface BPDU {
  id: string;
  from: string;
  to: string;
  rootId: string;
  rootPathCost: number;
  senderId: string;
  senderPriority: number;
  progress: number;
  x: number;
  y: number;
}

// 场景步骤
type SceneStep = 
  | 'initial'      // 初始状态
  | 'elect-root'   // 选举根桥
  | 'bpdu-spread'  // BPDU传播
  | 'rp-election'  // 根端口选举
  | 'dp-election'  // 指定端口选举
  | 'block-ports'  // 阻塞端口
  | 'converged';   // 收敛完成

const STEPS: { id: SceneStep; title: string; desc: string }[] = [
  { 
    id: 'initial', 
    title: '初始状态', 
    desc: '所有交换机启动时都认为自己是根桥，开始周期性发送BPDU（桥协议数据单元）' 
  },
  { 
    id: 'elect-root', 
    title: '选举根桥', 
    desc: '比较BID（桥ID = 优先级 + MAC地址），数值最小的交换机成为根桥。本例中SW2优先级4096最小，成为根桥' 
  },
  { 
    id: 'bpdu-spread', 
    title: 'BPDU传播', 
    desc: '根桥周期性发送BPDU，其他交换机接收后转发。BPDU包含：根桥ID、根路径开销、发送者ID等信息' 
  },
  { 
    id: 'rp-election', 
    title: '选举根端口(RP)', 
    desc: '非根桥交换机选择到达根桥路径开销最小的端口作为根端口。如果开销相同，比较发送者BID' 
  },
  { 
    id: 'dp-election', 
    title: '选举指定端口(DP)', 
    desc: '每段链路选举一个指定端口，负责在该链路上转发BPDU。根桥的所有端口都是指定端口' 
  },
  { 
    id: 'block-ports', 
    title: '阻塞端口', 
    desc: '既不是根端口也不是指定端口的端口被阻塞（Blocking状态），不转发数据帧，只接收BPDU，从而打破环路' 
  },
  { 
    id: 'converged', 
    title: '收敛完成', 
    desc: 'STP计算完成，逻辑上形成无环树形拓扑。阻塞端口在物理链路故障时可快速切换为转发状态' 
  },
];

// 端口状态说明
const PORT_STATES = {
  blocking: { color: '#ef4444', label: '阻塞', desc: '只接收BPDU，不转发数据' },
  listening: { color: '#f59e0b', label: '监听', desc: '接收和发送BPDU，不学习MAC' },
  learning: { color: '#3b82f6', label: '学习', desc: '学习MAC地址，不转发数据' },
  forwarding: { color: '#22c55e', label: '转发', desc: '正常转发数据帧' },
  disabled: { color: '#6b7280', label: '禁用', desc: '端口关闭' },
};

// 端口角色说明
const PORT_ROLES = {
  root: { color: '#22c55e', label: '根端口(RP)', desc: '离根桥最近的端口' },
  designated: { color: '#3b82f6', label: '指定端口(DP)', desc: '负责转发BPDU的端口' },
  blocked: { color: '#ef4444', label: '阻塞端口', desc: '被阻塞防止环路' },
  unknown: { color: '#9ca3af', label: '未知', desc: '初始状态' },
};

export default function STPSpanningTree() {
  // 交换机数据
  const [switches, setSwitches] = useState<Switch[]>([
    { 
      id: 'SW1', name: 'SW1', priority: 32768, mac: '00:11:22:33:44:01', 
      x: 150, y: 80, isRoot: false, rootPathCost: 0, rootId: '', selected: false,
      ports: {}
    },
    { 
      id: 'SW2', name: 'SW2', priority: 4096, mac: '00:11:22:33:44:02', 
      x: 400, y: 80, isRoot: false, rootPathCost: 0, rootId: '', selected: false,
      ports: {}
    },
    { 
      id: 'SW3', name: 'SW3', priority: 32768, mac: '00:11:22:33:44:03', 
      x: 275, y: 200, isRoot: false, rootPathCost: 0, rootId: '', selected: false,
      ports: {}
    },
    { 
      id: 'SW4', name: 'SW4', priority: 32768, mac: '00:11:22:33:44:04', 
      x: 525, y: 200, isRoot: false, rootPathCost: 0, rootId: '', selected: false,
      ports: {}
    },
  ]);

  // 链路数据
  const links: Link[] = [
    { id: 'L1', from: 'SW1', to: 'SW2', cost: 100 },
    { id: 'L2', from: 'SW1', to: 'SW3', cost: 100 },
    { id: 'L3', from: 'SW2', to: 'SW3', cost: 100 },
    { id: 'L4', from: 'SW2', to: 'SW4', cost: 100 },
    { id: 'L5', from: 'SW3', to: 'SW4', cost: 100 },
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showExamPoints, setShowExamPoints] = useState(false);
  const [selectedSwitch, setSelectedSwitch] = useState<Switch | null>(null);
  const [bpduPackets, setBpduPackets] = useState<BPDU[]>([]);
  const [showFaultSim, setShowFaultSim] = useState(false);
  const [faultLink, setFaultLink] = useState<string | null>(null);
  const [convergenceTime, setConvergenceTime] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 计算根桥
  const calculateRootBridge = useCallback(() => {
    const rootBridge = [...switches].sort((a, b) => {
      const bidA = a.priority * Math.pow(2, 48) + parseInt(a.mac.replace(/:/g, ''), 16);
      const bidB = b.priority * Math.pow(2, 48) + parseInt(b.mac.replace(/:/g, ''), 16);
      return bidA - bidB;
    })[0];

    setSwitches(prev => prev.map(sw => ({
      ...sw,
      isRoot: sw.id === rootBridge.id,
      rootId: rootBridge.id,
      rootPathCost: sw.id === rootBridge.id ? 0 : Infinity as any
    })));

    return rootBridge;
  }, [switches]);

  // 计算端口角色
  const calculatePortRoles = useCallback(() => {
    const rootBridge = switches.find(s => s.isRoot);
    if (!rootBridge) return;

    const newSwitches = switches.map(sw => ({ ...sw, ports: { ...sw.ports } }));

    // 初始化端口
    links.forEach(link => {
      newSwitches.forEach(sw => {
        if (sw.id === link.from || sw.id === link.to) {
          if (!sw.ports[link.id]) {
            sw.ports[link.id] = { role: 'unknown', state: 'blocking' };
          }
        }
      });
    });

    // 根桥的所有端口都是指定端口
    links.forEach(link => {
      if (link.from === rootBridge.id) {
        const sw = newSwitches.find(s => s.id === link.from);
        if (sw) sw.ports[link.id] = { role: 'designated', state: 'forwarding' };
      }
      if (link.to === rootBridge.id) {
        const sw = newSwitches.find(s => s.id === link.to);
        if (sw) sw.ports[link.id] = { role: 'designated', state: 'forwarding' };
      }
    });

    // 简化：非根桥的端口角色计算
    // SW1: L1连接根桥，是根端口
    const sw1 = newSwitches.find(s => s.id === 'SW1');
    if (sw1) {
      sw1.ports['L1'] = { role: 'root', state: 'forwarding' };
      sw1.ports['L2'] = { role: 'designated', state: 'forwarding' };
    }

    // SW3: L3连接根桥，是根端口
    const sw3 = newSwitches.find(s => s.id === 'SW3');
    if (sw3) {
      sw3.ports['L3'] = { role: 'root', state: 'forwarding' };
      sw3.ports['L2'] = { role: 'designated', state: 'forwarding' };
      sw3.ports['L5'] = { role: 'blocked', state: 'blocking' };
    }

    // SW4: L4连接根桥，是根端口
    const sw4 = newSwitches.find(s => s.id === 'SW4');
    if (sw4) {
      sw4.ports['L4'] = { role: 'root', state: 'forwarding' };
      sw4.ports['L5'] = { role: 'designated', state: 'forwarding' };
    }

    setSwitches(newSwitches);
  }, [switches, links]);

  // 发送BPDU动画 - 使用更流畅的缓动函数
  const sendBPDU = useCallback((fromId: string, toId: string) => {
    const fromSw = switches.find(s => s.id === fromId);
    const toSw = switches.find(s => s.id === toId);
    if (!fromSw || !toSw) return;

    const newBPDU: BPDU = {
      id: `bpdu-${Date.now()}-${Math.random()}`,
      from: fromId,
      to: toId,
      rootId: switches.find(s => s.isRoot)?.id || '',
      rootPathCost: 0,
      senderId: fromId,
      senderPriority: fromSw.priority,
      progress: 0,
      x: fromSw.x + 40,
      y: fromSw.y + 30,
    };

    setBpduPackets(prev => [...prev, newBPDU]);

    // 动画：BPDU从from移动到to - 使用easeOutCubic缓动函数更流畅
    const duration = 1200; // 稍微延长动画时间
    const startTime = performance.now();
    const startX = fromSw.x + 40;
    const startY = fromSw.y + 30;
    const endX = toSw.x + 40;
    const endY = toSw.y + 30;

    // easeOutCubic缓动函数 - 开始快结束慢，更自然
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const progress = easeOutCubic(rawProgress);

      setBpduPackets(prev => 
        prev.map(bpdu => 
          bpdu.id === newBPDU.id 
            ? {
                ...bpdu,
                progress: rawProgress,
                x: startX + (endX - startX) * progress,
                y: startY + (endY - startY) * progress,
              }
            : bpdu
        )
      );

      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画完成，短暂停留后移除BPDU
        setTimeout(() => {
          setBpduPackets(prev => prev.filter(b => b.id !== newBPDU.id));
        }, 300);
      }
    };

    requestAnimationFrame(animate);
  }, [switches]);

  // 自动播放
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= STEPS.length - 1) {
          setIsRunning(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // 步骤变化处理
  useEffect(() => {
    const stepId = STEPS[currentStep].id;

    switch (stepId) {
      case 'elect-root':
        calculateRootBridge();
        break;
      case 'bpdu-spread':
        // 触发BPDU传播动画
        const root = switches.find(s => s.isRoot);
        if (root) {
          links.filter(l => l.from === root.id || l.to === root.id).forEach(l => {
            const targetId = l.from === root.id ? l.to : l.from;
            setTimeout(() => sendBPDU(root.id, targetId), 100);
          });
        }
        break;
      case 'block-ports':
      case 'converged':
        calculatePortRoles();
        break;
    }
  }, [currentStep, calculateRootBridge, calculatePortRoles, sendBPDU, switches, links]);

  // 重置
  const reset = () => {
    setCurrentStep(0);
    setIsRunning(false);
    setBpduPackets([]);
    setFaultLink(null);
    setConvergenceTime(0);
    setSwitches(prev => prev.map(sw => ({
      ...sw,
      isRoot: false,
      rootPathCost: 0,
      rootId: '',
      selected: false,
      ports: {}
    })));
  };

  // 故障模拟
  const simulateFault = (linkId: string) => {
    setFaultLink(linkId);
    setConvergenceTime(30); // RSTP约30秒收敛
    
    // 重新计算STP
    setTimeout(() => {
      calculatePortRoles();
    }, 500);
  };

  // 恢复链路
  const restoreLink = () => {
    setFaultLink(null);
    setConvergenceTime(0);
    calculatePortRoles();
  };

  // 获取链路样式
  const getLinkStyle = (link: Link) => {
    const isFault = faultLink === link.id;
    const fromSw = switches.find(s => s.id === link.from);
    const toSw = switches.find(s => s.id === link.to);
    
    if (isFault) {
      return { stroke: '#6b7280', strokeDasharray: '5,5', opacity: 0.3 };
    }

    // 根据端口角色决定颜色
    const fromPort = fromSw?.ports[link.id];
    const toPort = toSw?.ports[link.id];
    
    if (fromPort?.role === 'blocked' || toPort?.role === 'blocked') {
      return { stroke: '#ef4444', strokeDasharray: '5,5', opacity: 0.6 };
    }
    if (fromPort?.role === 'root' || toPort?.role === 'root') {
      return { stroke: '#22c55e', strokeWidth: 3 };
    }
    if (fromPort?.role === 'designated' || toPort?.role === 'designated') {
      return { stroke: '#3b82f6', strokeWidth: 3 };
    }
    
    return { stroke: '#9ca3af', strokeWidth: 2 };
  };

  const scene = {
    id: 'stp-spanning-tree',
    title: 'STP生成树协议：防环机制',
    description: 'Spanning Tree Protocol防止二层环路，根桥选举、根端口/指定端口选择、阻塞端口状态，理解BPDU报文和收敛过程',
    phase: 1 as const,
    category: '交换技术',
    difficulty: 'medium' as const,
    duration: '8-10分钟',
    isHot: true,
  };

  return (
    <SceneLayout scene={scene}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：拓扑图 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="text-blue-500" size={20} />
                网络拓扑
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {isRunning ? <Pause size={16} /> : <Play size={16} />}
                  {isRunning ? '暂停' : '播放'}
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <RotateCcw size={16} />
                  重置
                </button>
                <button
                  onClick={() => setShowFaultSim(!showFaultSim)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    showFaultSim ? 'bg-red-500 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  <AlertTriangle size={16} />
                  故障模拟
                </button>
              </div>
            </div>

            {/* SVG拓扑图 */}
            <svg viewBox="0 0 700 320" className="w-full h-72 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {/* 定义箭头标记 */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>

              {/* 链路 */}
              {links.map(link => {
                const fromSw = switches.find(s => s.id === link.from);
                const toSw = switches.find(s => s.id === link.to);
                if (!fromSw || !toSw) return null;
                
                const style = getLinkStyle(link);
                const midX = (fromSw.x + toSw.x) / 2 + 40;
                const midY = (fromSw.y + toSw.y) / 2 + 30;
                
                return (
                  <g key={link.id}>
                    <line
                      x1={fromSw.x + 40}
                      y1={fromSw.y + 30}
                      x2={toSw.x + 40}
                      y2={toSw.y + 30}
                      {...style}
                    />
                    {/* 链路标签 */}
                    <text
                      x={midX}
                      y={midY - 8}
                      textAnchor="middle"
                      className="text-xs fill-gray-500"
                    >
                      Cost:{link.cost}
                    </text>
                    {/* 故障标记 */}
                    {faultLink === link.id && (
                      <g>
                        <line x1={midX-10} y1={midY+5} x2={midX+10} y2={midY+25} stroke="#ef4444" strokeWidth="2" />
                        <line x1={midX+10} y1={midY+5} x2={midX-10} y2={midY+25} stroke="#ef4444" strokeWidth="2" />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* BPDU报文动画 */}
              <AnimatePresence>
                {bpduPackets.map(bpdu => (
                  <motion.g
                    key={bpdu.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                  >
                    <circle
                      cx={bpdu.x}
                      cy={bpdu.y}
                      r={10}
                      fill="#fbbf24"
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                    <text
                      x={bpdu.x}
                      y={bpdu.y + 4}
                      textAnchor="middle"
                      className="text-xs font-bold fill-gray-800"
                    >
                      B
                    </text>
                  </motion.g>
                ))}
              </AnimatePresence>

              {/* 交换机 */}
              {switches.map(sw => (
                <g 
                  key={sw.id}
                  onClick={() => setSelectedSwitch(sw)}
                  className="cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {/* 交换机图标背景 */}
                  <rect
                    x={sw.x}
                    y={sw.y}
                    width={80}
                    height={60}
                    rx={8}
                    fill={sw.isRoot ? '#dbeafe' : sw.selected ? '#fef3c7' : '#f3f4f6'}
                    stroke={sw.isRoot ? '#3b82f6' : sw.selected ? '#f59e0b' : '#6b7280'}
                    strokeWidth={sw.isRoot ? 3 : sw.selected ? 3 : 2}
                    className="transition-all duration-300"
                  />
                  {/* 交换机图标 */}
                  <foreignObject x={sw.x + 25} y={sw.y + 8} width={30} height={30}>
                    <Server size={30} className={sw.isRoot ? 'text-blue-600' : 'text-gray-600'} />
                  </foreignObject>
                  {/* 交换机名称 */}
                  <text 
                    x={sw.x + 40} 
                    y={sw.y + 50} 
                    textAnchor="middle" 
                    className="text-sm font-bold fill-gray-800"
                  >
                    {sw.name}
                  </text>
                  {/* 根桥标记 */}
                  {sw.isRoot && (
                    <g>
                      <circle cx={sw.x + 70} cy={sw.y + 10} r={10} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} />
                      <text x={sw.x + 70} y={sw.y + 14} textAnchor="middle" className="text-xs font-bold fill-gray-800">R</text>
                    </g>
                  )}
                  {/* 优先级 */}
                  <text 
                    x={sw.x + 40} 
                    y={sw.y + 72} 
                    textAnchor="middle" 
                    className="text-xs fill-gray-500"
                  >
                    P:{sw.priority}
                  </text>
                </g>
              ))}
            </svg>

            {/* 图例 */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-200 border-2 border-blue-500" />
                <span>根桥</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-500 rounded" />
                <span>根端口(RP)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500 rounded" />
                <span>指定端口(DP)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-red-500" style={{ borderTop: '2px dashed #ef4444', height: 0 }} />
                <span>阻塞端口</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-500" />
                <span>BPDU报文</span>
              </div>
            </div>

            {/* 故障模拟面板 */}
            <AnimatePresence>
              {showFaultSim && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                >
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-500" />
                    链路故障模拟
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {links.map(link => (
                      <button
                        key={link.id}
                        onClick={() => faultLink === link.id ? restoreLink() : simulateFault(link.id)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          faultLink === link.id 
                            ? 'bg-red-500 text-white' 
                            : 'bg-white dark:bg-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {link.from}-{link.to}
                        {faultLink === link.id && ' (故障)'}
                      </button>
                    ))}
                    {faultLink && (
                      <button
                        onClick={restoreLink}
                        className="px-3 py-1 rounded text-sm bg-green-500 text-white hover:bg-green-600"
                      >
                        恢复所有链路
                      </button>
                    )}
                  </div>
                  {convergenceTime > 0 && (
                    <p className="mt-2 text-sm text-orange-600">
                      STP重新收敛预计时间: {convergenceTime}秒 (RSTP) / {convergenceTime * 2}秒 (传统STP)
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 考试要点 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
            <button
              onClick={() => setShowExamPoints(!showExamPoints)}
              className="flex items-center gap-2 w-full text-left"
            >
              <BookOpen size={18} className="text-blue-600" />
              <span className="font-semibold text-blue-900 dark:text-blue-100">网络规划师考试要点</span>
              <ChevronRight 
                size={16} 
                className={`ml-auto transition-transform ${showExamPoints ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {showExamPoints && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-3 text-sm"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <h5 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                        <Target size={14} />
                        根桥选举
                      </h5>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• BID = 优先级(2字节) + MAC地址(6字节)</li>
                        <li>• 优先级范围：0-61440，步长4096</li>
                        <li>• 默认值32768，有效值：0, 4096, 8192, ..., 61440</li>
                        <li>• 数值越小优先级越高</li>
                        <li>• 优先级相同则比较MAC地址</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <h5 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                        <Activity size={14} />
                        端口角色
                      </h5>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• <strong>根端口(RP)</strong>：离根桥最近的端口</li>
                        <li>• <strong>指定端口(DP)</strong>：转发BPDU的端口</li>
                        <li>• <strong>阻塞端口</strong>：打破环路，不转发数据</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <h5 className="font-semibold text-orange-700 mb-2 flex items-center gap-2">
                        <Layers size={14} />
                        端口状态
                      </h5>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• <strong>Blocking</strong>：只收BPDU，不转发(20s)</li>
                        <li>• <strong>Listening</strong>：收发BPDU，不学习(15s)</li>
                        <li>• <strong>Learning</strong>：学习MAC，不转发(15s)</li>
                        <li>• <strong>Forwarding</strong>：正常转发</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <h5 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                        <Zap size={14} />
                        收敛时间
                      </h5>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• <strong>传统STP</strong>：30-50秒</li>
                        <li>• <strong>RSTP</strong>：1-10秒</li>
                        <li>• <strong>MSTP</strong>：与RSTP相当</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
                    <h5 className="font-semibold text-yellow-800 mb-2">⚠️ 常见考点</h5>
                    <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                      <li>1. 根端口选举：路径开销 → 发送者BID → 端口ID</li>
                      <li>2. BPDU报文格式：协议ID、版本、BPDU类型、标志、根ID、根路径开销、桥ID、端口ID、消息年龄、最大年龄、Hello时间、转发延迟</li>
                      <li>3. 路径开销与带宽成反比：10M=100, 100M=19, 1G=4, 10G=2</li>
                      <li>4. STP缺点：收敛慢、单一生成树、负载均衡差</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 右侧：控制面板 */}
        <div className="space-y-4">
          {/* 步骤指示器 */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Layers size={18} className="text-blue-500" />
              STP计算步骤
            </h3>
            <div className="space-y-2">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    i === currentStep 
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500' 
                      : i < currentStep 
                        ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentStep(i)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      i < currentStep ? 'bg-green-500 text-white' :
                      i === currentStep ? 'bg-blue-500 text-white' : 'bg-gray-300'
                    }`}>
                      {i < currentStep ? '✓' : i + 1}
                    </span>
                    <span className="font-medium text-sm">{s.title}</span>
                  </div>
                  {i === currentStep && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm text-gray-600 dark:text-gray-300 mt-2 ml-8"
                    >
                      {s.desc}
                    </motion.p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* 交换机详情 */}
          <AnimatePresence mode="wait">
            {selectedSwitch ? (
              <motion.div
                key="switch-detail"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Server size={18} className={selectedSwitch.isRoot ? 'text-blue-500' : 'text-gray-500'} />
                    {selectedSwitch.name} 详情
                  </h3>
                  <button
                    onClick={() => setSelectedSwitch(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">优先级:</span>
                    <span className="font-mono">{selectedSwitch.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">MAC地址:</span>
                    <span className="font-mono">{selectedSwitch.mac}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">BID:</span>
                    <span className="font-mono">{selectedSwitch.priority}:{selectedSwitch.mac}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">角色:</span>
                    <span className={selectedSwitch.isRoot ? 'text-blue-600 font-semibold' : ''}>
                      {selectedSwitch.isRoot ? '根桥' : '非根桥'}
                    </span>
                  </div>
                  
                  {Object.keys(selectedSwitch.ports).length > 0 && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <span className="text-gray-500">端口状态:</span>
                      </div>
                      {Object.entries(selectedSwitch.ports).map(([linkId, port]) => {
                        const link = links.find(l => l.id === linkId);
                        const neighborId = link?.from === selectedSwitch.id ? link.to : link?.from;
                        return (
                          <div key={linkId} className="flex justify-between items-center py-1">
                            <span className="text-gray-600">→ {neighborId}:</span>
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: PORT_ROLES[port.role].color }}
                              />
                              <span className="text-xs">{PORT_ROLES[port.role].label}</span>
                              <span 
                                className="px-2 py-0.5 rounded text-xs"
                                style={{ 
                                  backgroundColor: PORT_STATES[port.state].color + '20',
                                  color: PORT_STATES[port.state].color 
                                }}
                              >
                                {PORT_STATES[port.state].label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="switch-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center text-gray-500"
              >
                <Server size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">点击拓扑中的交换机<br/>查看详细信息</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BPDU信息 */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Wifi size={18} className="text-yellow-500" />
              BPDU报文结构
            </h3>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">协议ID:</span> 0</div>
                  <div><span className="text-gray-500">版本:</span> 0 (STP)</div>
                  <div><span className="text-gray-500">类型:</span> 0x00</div>
                  <div><span className="text-gray-500">标志:</span> TC/TCA</div>
                  <div className="col-span-2"><span className="text-gray-500">根桥ID:</span> 优先级+MAC</div>
                  <div className="col-span-2"><span className="text-gray-500">根路径开销:</span> 到根桥的总开销</div>
                  <div className="col-span-2"><span className="text-gray-500">发送者ID:</span> 本桥BID</div>
                  <div className="col-span-2"><span className="text-gray-500">端口ID:</span> 发送端口标识</div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                BPDU每2秒(Hello Time)发送一次，用于维护拓扑信息
              </p>
            </div>
          </div>

          {/* 核心概念 */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info size={18} className="text-blue-500" />
              核心概念
            </h3>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <strong className="text-blue-700">为什么需要STP？</strong>
                <p className="text-gray-600 mt-1">防止二层网络环路导致的广播风暴、MAC地址表抖动、多帧复制</p>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <strong className="text-green-700">STP如何工作？</strong>
                <p className="text-gray-600 mt-1">通过阻塞冗余链路，逻辑上形成无环树形拓扑，同时保留冗余链路的备份能力</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
