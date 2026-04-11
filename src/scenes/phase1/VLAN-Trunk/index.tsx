import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Play, 
  Pause, 
  RotateCcw,
  ArrowRight, 
  ArrowLeft, 
  Info, 
  Monitor, 
  Server, 
  Layers, 
  Tag, 
  Route,
  Shield,
  Wifi,
  BookOpen,
  Target,
  Zap,
  CheckCircle,
  XCircle,
  ChevronRight,
  Activity,
  Network,
  Settings
} from 'lucide-react';

// VLAN场景 - 深度完善版
// 核心功能：VLAN隔离演示、数据包转发动画、Trunk标签可视化、考试要点

// 数据包类型
type PacketType = 'untagged' | 'tagged' | 'broadcast' | 'inter-vlan';

interface Packet {
  id: string;
  from: string;
  to: string;
  vlanId: number;
  type: PacketType;
  progress: number;
  x: number;
  y: number;
  showTag: boolean;
}

interface VLAN {
  id: number;
  name: string;
  color: string;
  subnet: string;
  gateway: string;
}

interface Port {
  id: string;
  switchId: string;
  mode: 'access' | 'trunk' | 'hybrid';
  vlan: number | null;
  allowedVlans: number[];
  nativeVlan: number;
}

interface Device {
  id: string;
  name: string;
  type: 'pc' | 'server';
  x: number;
  y: number;
  vlanId: number;
  ip: string;
  mac: string;
  switchId: string;
}

interface Switch {
  id: string;
  name: string;
  type: 'L2' | 'L3';
  x: number;
  y: number;
  ports: Port[];
}

// 场景步骤
type SceneStep = 
  | 'intro'           // VLAN基础概念
  | 'vlan-isolation'  // VLAN隔离演示
  | 'access-port'     // Access端口
  | 'trunk-port'      // Trunk端口
  | '8021q-tag'       // 802.1Q标签
  | 'native-vlan'     // Native VLAN
  | 'inter-vlan';     // Inter-VLAN路由

const STEPS: { id: SceneStep; title: string; desc: string }[] = [
  { 
    id: 'intro', 
    title: 'VLAN基础概念', 
    desc: '虚拟局域网(VLAN)将物理网络划分为多个逻辑广播域，隔离二层流量，提高安全性和性能' 
  },
  { 
    id: 'vlan-isolation', 
    title: 'VLAN隔离演示', 
    desc: '同一VLAN内的设备可以通信，不同VLAN之间默认隔离，即使物理连接在同一交换机上' 
  },
  { 
    id: 'access-port', 
    title: 'Access端口', 
    desc: 'Access端口只属于一个VLAN，连接终端设备，接收和发送的数据帧不带802.1Q标签' 
  },
  { 
    id: 'trunk-port', 
    title: 'Trunk端口', 
    desc: 'Trunk端口可以承载多个VLAN的流量，使用802.1Q标签区分不同VLAN，用于交换机互联' 
  },
  { 
    id: '8021q-tag', 
    title: '802.1Q标签结构', 
    desc: '802.1Q在以太网帧中插入4字节标签，包含TPID(0x8100)、优先级、CFI、VLAN ID(12bit，支持1-4094)' 
  },
  { 
    id: 'native-vlan', 
    title: 'Native VLAN', 
    desc: 'Native VLAN是Trunk端口上不打标签的VLAN，默认是VLAN 1，两端Native VLAN必须一致' 
  },
  { 
    id: 'inter-vlan', 
    title: 'Inter-VLAN路由', 
    desc: '不同VLAN之间通信需要三层设备(路由器或三层交换机)进行路由转发，每个VLAN一个SVI接口' 
  },
];

const VLANS: VLAN[] = [
  { id: 10, name: 'VLAN 10 - 研发部', color: '#3b82f6', subnet: '192.168.10.0/24', gateway: '192.168.10.1' },
  { id: 20, name: 'VLAN 20 - 市场部', color: '#10b981', subnet: '192.168.20.0/24', gateway: '192.168.20.1' },
  { id: 30, name: 'VLAN 30 - 服务器', color: '#f59e0b', subnet: '192.168.30.0/24', gateway: '192.168.30.1' },
];

export default function VLANTrunkScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedVLAN, setSelectedVLAN] = useState<number | null>(null);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [showExamPoints, setShowExamPoints] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showTagDetail, setShowTagDetail] = useState(false);
  const [communicationType, setCommunicationType] = useState<'intra' | 'inter'>('intra');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 设备数据
  const devices: Device[] = [
    { id: 'PC1', name: 'PC-1', type: 'pc', x: 80, y: 320, vlanId: 10, ip: '192.168.10.11', mac: '00:11:22:33:44:01', switchId: 'SW1' },
    { id: 'PC2', name: 'PC-2', type: 'pc', x: 180, y: 320, vlanId: 10, ip: '192.168.10.12', mac: '00:11:22:33:44:02', switchId: 'SW1' },
    { id: 'PC3', name: 'PC-3', type: 'pc', x: 280, y: 320, vlanId: 20, ip: '192.168.20.11', mac: '00:11:22:33:44:03', switchId: 'SW1' },
    { id: 'PC4', name: 'PC-4', type: 'pc', x: 420, y: 320, vlanId: 20, ip: '192.168.20.12', mac: '00:11:22:33:44:04', switchId: 'SW2' },
    { id: 'PC5', name: 'PC-5', type: 'pc', x: 520, y: 320, vlanId: 30, ip: '192.168.30.11', mac: '00:11:22:33:44:05', switchId: 'SW2' },
    { id: 'SRV1', name: 'Server', type: 'server', x: 620, y: 320, vlanId: 30, ip: '192.168.30.100', mac: '00:11:22:33:44:06', switchId: 'SW2' },
  ];

  // 交换机数据
  const switches: Switch[] = [
    { 
      id: 'L3SW', name: '三层交换机', type: 'L3', x: 350, y: 40,
      ports: [
        { id: 'P1', switchId: 'L3SW', mode: 'trunk', vlan: null, allowedVlans: [10, 20, 30], nativeVlan: 1 },
        { id: 'P2', switchId: 'L3SW', mode: 'trunk', vlan: null, allowedVlans: [10, 20, 30], nativeVlan: 1 },
      ]
    },
    { 
      id: 'SW1', name: 'SW1', type: 'L2', x: 180, y: 180,
      ports: [
        { id: 'P1', switchId: 'SW1', mode: 'access', vlan: 10, allowedVlans: [], nativeVlan: 1 },
        { id: 'P2', switchId: 'SW1', mode: 'access', vlan: 10, allowedVlans: [], nativeVlan: 1 },
        { id: 'P3', switchId: 'SW1', mode: 'access', vlan: 20, allowedVlans: [], nativeVlan: 1 },
        { id: 'P4', switchId: 'SW1', mode: 'trunk', vlan: null, allowedVlans: [10, 20, 30], nativeVlan: 1 },
      ]
    },
    { 
      id: 'SW2', name: 'SW2', type: 'L2', x: 520, y: 180,
      ports: [
        { id: 'P1', switchId: 'SW2', mode: 'access', vlan: 20, allowedVlans: [], nativeVlan: 1 },
        { id: 'P2', switchId: 'SW2', mode: 'access', vlan: 30, allowedVlans: [], nativeVlan: 1 },
        { id: 'P3', switchId: 'SW2', mode: 'access', vlan: 30, allowedVlans: [], nativeVlan: 1 },
        { id: 'P4', switchId: 'SW2', mode: 'trunk', vlan: null, allowedVlans: [10, 20, 30], nativeVlan: 1 },
      ]
    },
  ];

  // 发送数据包动画
  const sendPacket = useCallback((fromId: string, toId: string, vlanId: number, type: PacketType = 'untagged') => {
    const fromDev = devices.find(d => d.id === fromId) || switches.find(s => s.id === fromId);
    const toDev = devices.find(d => d.id === toId) || switches.find(s => s.id === toId);
    if (!fromDev || !toDev) return;

    const newPacket: Packet = {
      id: `pkt-${Date.now()}-${Math.random()}`,
      from: fromId,
      to: toId,
      vlanId,
      type,
      progress: 0,
      x: fromDev.x + (fromDev.type === 'pc' || fromDev.type === 'server' ? 0 : 40),
      y: fromDev.y + (fromDev.type === 'pc' || fromDev.type === 'server' ? 0 : 30),
      showTag: type === 'tagged',
    };

    setPackets(prev => [...prev, newPacket]);

    // 动画
    const duration = 1500;
    const startTime = Date.now();
    const startX = fromDev.x + (fromDev.type === 'pc' || fromDev.type === 'server' ? 0 : 40);
    const startY = fromDev.y + (fromDev.type === 'pc' || fromDev.type === 'server' ? 0 : 30);
    const endX = toDev.x + (toDev.type === 'pc' || toDev.type === 'server' ? 0 : 40);
    const endY = toDev.y + (toDev.type === 'pc' || toDev.type === 'server' ? 0 : 30);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setPackets(prev => 
        prev.map(pkt => 
          pkt.id === newPacket.id 
            ? { ...pkt, progress, x: startX + (endX - startX) * progress, y: startY + (endY - startY) * progress }
            : pkt
        )
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setPackets(prev => prev.filter(p => p.id !== newPacket.id));
        }, 300);
      }
    };

    requestAnimationFrame(animate);
  }, [devices, switches]);

  // 演示VLAN内通信
  const demoIntraVLAN = useCallback(() => {
    // PC1 (VLAN10) -> SW1 -> L3SW -> SW1 -> PC2 (VLAN10)
    setTimeout(() => sendPacket('PC1', 'SW1', 10, 'untagged'), 0);
    setTimeout(() => sendPacket('SW1', 'L3SW', 10, 'tagged'), 500);
    setTimeout(() => sendPacket('L3SW', 'SW1', 10, 'tagged'), 1000);
    setTimeout(() => sendPacket('SW1', 'PC2', 10, 'untagged'), 1500);
  }, [sendPacket]);

  // 演示VLAN间通信
  const demoInterVLAN = useCallback(() => {
    // PC1 (VLAN10) -> SW1 -> L3SW (路由) -> SW2 -> PC4 (VLAN20)
    setTimeout(() => sendPacket('PC1', 'SW1', 10, 'untagged'), 0);
    setTimeout(() => sendPacket('SW1', 'L3SW', 10, 'tagged'), 500);
    // 三层交换后，VLAN改变
    setTimeout(() => sendPacket('L3SW', 'SW2', 20, 'tagged'), 1000);
    setTimeout(() => sendPacket('SW2', 'PC4', 20, 'untagged'), 1500);
  }, [sendPacket]);

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
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // 步骤变化时触发演示
  useEffect(() => {
    const stepId = STEPS[currentStep].id;
    if (stepId === 'vlan-isolation') {
      setCommunicationType('intra');
      setTimeout(() => demoIntraVLAN(), 500);
    } else if (stepId === 'inter-vlan') {
      setCommunicationType('inter');
      setTimeout(() => demoInterVLAN(), 500);
    }
  }, [currentStep, demoIntraVLAN, demoInterVLAN]);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setIsRunning(false);
    setPackets([]);
    setSelectedDevice(null);
    setSelectedVLAN(null);
  };

  const scene = {
    id: 'vlan-trunk',
    title: 'VLAN与Trunk配置',
    description: '虚拟局域网VLAN划分与802.1Q标签，Access/Trunk/Hybrid端口模式，VTP协议，三层交换与Inter-VLAN路由',
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
                <Network className="text-blue-500" size={20} />
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
              </div>
            </div>

            {/* SVG拓扑图 */}
            <svg viewBox="0 0 720 380" className="w-full h-80 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {/* 连接线 - Trunk */}
              <g>
                {/* L3SW - SW1 */}
                <line x1="390" y1="70" x2="220" y2="180" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="5,5" />
                <text x="290" y="120" className="text-xs fill-purple-500">Trunk</text>
                
                {/* L3SW - SW2 */}
                <line x1="390" y1="70" x2="560" y2="180" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="5,5" />
                <text x="460" y="120" className="text-xs fill-purple-500">Trunk</text>
              </g>

              {/* 连接线 - Access */}
              {devices.map(dev => {
                const sw = switches.find(s => s.id === dev.switchId);
                if (!sw) return null;
                const vlan = VLANS.find(v => v.id === dev.vlanId);
                const isVisible = selectedVLAN === null || selectedVLAN === dev.vlanId;
                return (
                  <line
                    key={dev.id}
                    x1={dev.x}
                    y1={dev.y}
                    x2={sw.x + 40}
                    y2={sw.y + 60}
                    stroke={vlan?.color || '#gray'}
                    strokeWidth="2"
                    opacity={isVisible ? 1 : 0.2}
                  />
                );
              })}

              {/* 数据包动画 */}
              <AnimatePresence>
                {packets.map(pkt => {
                  const vlan = VLANS.find(v => v.id === pkt.vlanId);
                  return (
                    <motion.g key={pkt.id}>
                      {/* 数据包 */}
                      <circle
                        cx={pkt.x}
                        cy={pkt.y}
                        r={12}
                        fill={vlan?.color || '#3b82f6'}
                        stroke="white"
                        strokeWidth={2}
                      />
                      {/* 802.1Q标签 */}
                      {pkt.showTag && (
                        <g>
                          <rect
                            x={pkt.x - 8}
                            y={pkt.y - 20}
                            width={16}
                            height={10}
                            fill="#fbbf24"
                            rx={2}
                          />
                          <text x={pkt.x} y={pkt.y - 13} textAnchor="middle" className="text-xs font-bold fill-gray-800">
                            Q
                          </text>
                        </g>
                      )}
                      {/* VLAN ID */}
                      <text x={pkt.x} y={pkt.y + 4} textAnchor="middle" className="text-xs font-bold fill-white">
                        {pkt.vlanId}
                      </text>
                    </motion.g>
                  );
                })}
              </AnimatePresence>

              {/* 三层交换机 */}
              <g>
                <rect x="310" y="20" width="120" height="50" rx="8" fill="#6366f1" stroke="#4f46e5" strokeWidth="2" />
                <foreignObject x="335" y="25" width="30" height="30">
                  <Route size={30} className="text-white" />
                </foreignObject>
                <text x="370" y="50" textAnchor="middle" className="text-sm font-bold fill-white">
                  三层交换机
                </text>
                {/* SVI接口 */}
                <g transform="translate(310, 75)">
                  {VLANS.map((vlan, i) => (
                    <g key={vlan.id} transform={`translate(${i * 40}, 0)`}>
                      <rect width="35" height="20" rx={3} fill={vlan.color} opacity="0.8" />
                      <text x="17.5" y="14" textAnchor="middle" className="text-xs fill-white">
                        SVI{vlan.id}
                      </text>
                    </g>
                  ))}
                </g>
              </g>

              {/* 二层交换机 */}
              {switches.filter(s => s.type === 'L2').map(sw => (
                <g key={sw.id}>
                  <rect x={sw.x} y={sw.y} width="100" height="60" rx="8" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
                  <foreignObject x={sw.x + 35} y={sw.y + 10} width="30" height="30">
                    <Server size={30} className="text-white" />
                  </foreignObject>
                  <text x={sw.x + 50} y={sw.y + 50} textAnchor="middle" className="text-sm font-bold fill-white">
                    {sw.name}
                  </text>
                  {/* 端口标记 */}
                  <g transform={`translate(${sw.x}, ${sw.y + 65})`}>
                    {sw.ports.map((port, i) => (
                      <g key={port.id} transform={`translate(${i * 25 + 5}, 0)`}>
                        <rect width="20" height="15" rx={2} fill={port.mode === 'trunk' ? '#8b5cf6' : '#10b981'} />
                        <text x="10" y="11" textAnchor="middle" className="text-xs fill-white">
                          {port.mode === 'trunk' ? 'T' : 'A'}
                        </text>
                      </g>
                    ))}
                  </g>
                </g>
              ))}

              {/* 终端设备 */}
              {devices.map(dev => {
                const vlan = VLANS.find(v => v.id === dev.vlanId);
                const isVisible = selectedVLAN === null || selectedVLAN === dev.vlanId;
                return (
                  <g 
                    key={dev.id}
                    onClick={() => setSelectedDevice(dev)}
                    style={{ cursor: 'pointer', opacity: isVisible ? 1 : 0.2 }}
                  >
                    <rect
                      x={dev.x - 30}
                      y={dev.y}
                      width="60"
                      height="40"
                      rx={5}
                      fill={vlan?.color || '#gray'}
                      stroke="white"
                      strokeWidth={selectedDevice?.id === dev.id ? 3 : 1}
                    />
                    <foreignObject x={dev.x - 12} y={dev.y + 5} width="24" height="24">
                      {dev.type === 'server' ? <Server size={24} className="text-white" /> : <Monitor size={24} className="text-white" />}
                    </foreignObject>
                    <text x={dev.x} y={dev.y + 55} textAnchor="middle" className="text-xs font-bold fill-gray-700">
                      {dev.name}
                    </text>
                    <text x={dev.x} y={dev.y + 70} textAnchor="middle" className="text-xs fill-gray-500">
                      {dev.ip}
                    </text>
                  </g>
                );
              })}

              {/* 图例 */}
              <g transform="translate(10, 10)">
                <rect width="140" height="110" rx={5} fill="white" stroke="#e5e7eb" />
                <text x="10" y="20" className="text-sm font-bold fill-gray-700">图例</text>
                {VLANS.map((vlan, i) => (
                  <g key={vlan.id} transform={`translate(10, ${30 + i * 20})`}>
                    <rect width="15" height="12" rx={2} fill={vlan.color} />
                    <text x="22" y="10" className="text-xs fill-gray-600">{vlan.name}</text>
                  </g>
                ))}
                <g transform="translate(10, 90)">
                  <line x1="0" y1="6" x2="20" y2="6" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3,3" />
                  <text x="25" y="10" className="text-xs fill-gray-600">Trunk</text>
                </g>
              </g>
            </svg>

            {/* 通信演示控制 */}
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={demoIntraVLAN}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  communicationType === 'intra' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                演示VLAN内通信
              </button>
              <button
                onClick={demoInterVLAN}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  communicationType === 'inter' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                演示VLAN间路由
              </button>
            </div>
          </div>

          {/* 考试要点 */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
            <button
              onClick={() => setShowExamPoints(!showExamPoints)}
              className="flex items-center gap-2 w-full text-left"
            >
              <BookOpen size={18} className="text-indigo-600" />
              <span className="font-semibold text-indigo-900 dark:text-indigo-100">网络规划师考试要点</span>
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
                        VLAN基础
                      </h5>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• VLAN ID范围：1-4094（0和4095保留）</li>
                        <li>• 默认VLAN 1，不可删除</li>
                        <li>• VLAN作用：隔离广播域、提高安全性</li>
                        <li>• 同一VLAN = 同一广播域 = 同一子网</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <h5 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                        <Activity size={14} />
                        端口模式
                      </h5>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• <strong>Access</strong>：只属于一个VLAN，连接终端</li>
                        <li>• <strong>Trunk</strong>：承载多个VLAN，交换机互联</li>
                        <li>• <strong>Hybrid</strong>：华为特有，灵活配置</li>
                        <li>• Trunk默认允许VLAN 1通过</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <h5 className="font-semibold text-orange-700 mb-2 flex items-center gap-2">
                        <Tag size={14} />
                        802.1Q标签
                      </h5>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• 插入4字节标签，位于源MAC后</li>
                        <li>• TPID：0x8100（2字节）</li>
                        <li>• VLAN ID：12bit，支持4094个VLAN</li>
                        <li>• Priority：3bit，用于QoS</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <h5 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                        <Route size={14} />
                        Inter-VLAN路由
                      </h5>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• 不同VLAN通信必须经三层设备</li>
                        <li>• 单臂路由：路由器子接口</li>
                        <li>• 三层交换：SVI接口（Switch Virtual Interface）</li>
                        <li>• 每个VLAN一个SVI作为网关</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
                    <h5 className="font-semibold text-yellow-800 mb-2">⚠️ 常见考点</h5>
                    <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                      <li>1. Native VLAN：Trunk上不打标签的VLAN，默认VLAN 1，两端必须一致</li>
                      <li>2. VTP协议：Server/Client/Transparent三种模式，用于同步VLAN信息</li>
                      <li>3. VLAN规划：按部门/功能划分，避免VLAN过大导致广播风暴</li>
                      <li>4. 生成树：每个VLAN一个生成树实例（MSTP）或共享一个（CST）</li>
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
              学习步骤
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

          {/* VLAN选择 */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              VLAN选择
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedVLAN(null)}
                className={`w-full p-2 rounded-lg text-left transition-all ${
                  selectedVLAN === null ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                显示全部VLAN
              </button>
              {VLANS.map((vlan) => (
                <button
                  key={vlan.id}
                  onClick={() => setSelectedVLAN(vlan.id)}
                  className={`w-full p-2 rounded-lg text-left transition-all ${
                    selectedVLAN === vlan.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: vlan.color }}
                    />
                    <span className="font-medium text-sm">{vlan.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-6">{vlan.subnet}</div>
                  <div className="text-xs text-gray-400 ml-6">网关: {vlan.gateway}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 设备详情 */}
          <AnimatePresence mode="wait">
            {selectedDevice ? (
              <motion.div
                key="device-detail"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    {selectedDevice.type === 'server' ? <Server size={18} /> : <Monitor size={18} />}
                    {selectedDevice.name}
                  </h3>
                  <button
                    onClick={() => setSelectedDevice(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">类型:</span>
                    <span>{selectedDevice.type === 'server' ? '服务器' : 'PC'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">IP地址:</span>
                    <span className="font-mono">{selectedDevice.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">MAC地址:</span>
                    <span className="font-mono">{selectedDevice.mac}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">所属VLAN:</span>
                    <span 
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ 
                        backgroundColor: VLANS.find(v => v.id === selectedDevice.vlanId)?.color + '20',
                        color: VLANS.find(v => v.id === selectedDevice.vlanId)?.color 
                      }}
                    >
                      VLAN {selectedDevice.vlanId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">连接交换机:</span>
                    <span>{selectedDevice.switchId}</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="device-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center text-gray-500"
              >
                <Monitor size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">点击拓扑中的设备<br/>查看详细信息</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 802.1Q标签结构 */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Tag size={18} className="text-amber-500" />
              802.1Q标签结构
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => setShowTagDetail(!showTagDetail)}
                className="w-full p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-left text-sm hover:bg-amber-100 transition-colors"
              >
                {showTagDetail ? '隐藏详情' : '查看详情'}
              </button>
              
              <AnimatePresence>
                {showTagDetail && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded text-xs space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded">
                        <strong>TPID:</strong> 0x8100
                        <div className="text-gray-500">Tag Protocol Identifier</div>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <strong>PCP:</strong> 3bit (0-7)
                        <div className="text-gray-500">Priority Code Point</div>
                        <div className="text-xs text-blue-600">0=BE, 1=BK, 2=EE, 3=CA, 4=VI, 5=VO, 6=IC, 7=NC</div>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <strong>DEI:</strong> 1bit
                        <div className="text-gray-500">Drop Eligible Indicator</div>
                        <div className="text-xs text-gray-400">原CFI字段，用于丢包优先级</div>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <strong>VID:</strong> 12bit (1-4094)
                        <div className="text-gray-500">VLAN Identifier</div>
                        <div className="text-xs text-gray-400">0=优先级标记, 1=默认VLAN, 4095=保留</div>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-white rounded">
                      <strong>帧格式：</strong><br/>
                      DA(6) + SA(6) + <span className="text-amber-600 font-bold">Tag(4)</span> + Type(2) + Data + FCS(4)
                    </div>
                    <div className="mt-2 p-2 bg-blue-50 rounded text-blue-800">
                      <strong>📌 考试要点：</strong>VLAN ID范围1-4094，其中VLAN 1为默认VLAN，VLAN 1002-1005为Cisco保留
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 端口模式对比 */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Settings size={18} className="text-gray-500" />
              端口模式对比
            </h4>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="font-semibold text-green-800">Access端口</div>
                <div className="text-gray-600 text-xs mt-1">
                  • 只属于一个VLAN<br/>
                  • 连接终端设备<br/>
                  • 收发无标签帧
                </div>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                <div className="font-semibold text-purple-800">Trunk端口</div>
                <div className="text-gray-600 text-xs mt-1">
                  • 承载多个VLAN<br/>
                  • 交换机互联<br/>
                  • 收发带标签帧
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
