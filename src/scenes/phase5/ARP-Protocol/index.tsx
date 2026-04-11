import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Play, Pause, RotateCcw, ChevronRight, ChevronLeft, 
  Shield, AlertTriangle, Network, Search, Database,
  CheckCircle, XCircle, Info, FileText, Clock, ChevronDown, ChevronUp
} from 'lucide-react';

interface ARPEntry {
  ip: string;
  mac: string;
  type: '动态' | '静态';
  status: string;
  timestamp?: number;
}

interface Packet {
  id: string;
  type: 'ARP-Request' | 'ARP-Reply' | 'Data';
  from: string;
  to: string;
  content: string;
}

export default function ARPProtocolScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGratuitous, setShowGratuitous] = useState(false);
  const [showProxy, setShowProxy] = useState(false);
  const [showAttack, setShowAttack] = useState(false);
  const [showExamPoints, setShowExamPoints] = useState(false);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [activePacket, setActivePacket] = useState<Packet | null>(null);
  const [arpTable, setArpTable] = useState<ARPEntry[]>([
    { ip: '192.168.1.10', mac: 'AA:BB:CC:DD:EE:01', type: '静态', status: '本机', timestamp: Date.now() },
    { ip: '192.168.1.1', mac: 'AA:BB:CC:DD:EE:FF', type: '静态', status: '网关', timestamp: Date.now() },
  ]);

  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const hosts = [
    { id: 'hostA', name: '主机A', ip: '192.168.1.10', mac: 'AA:BB:CC:DD:EE:01', x: 100, y: 120, color: '#3b82f6' },
    { id: 'hostB', name: '主机B', ip: '192.168.1.20', mac: 'AA:BB:CC:DD:EE:02', x: 420, y: 120, color: '#22c55e' },
    { id: 'switch', name: '交换机', ip: '', mac: '', x: 260, y: 180, color: '#f59e0b' },
  ];

  const steps = [
    {
      title: '初始状态',
      description: '主机A要与192.168.1.20通信，检查ARP缓存表，发现没有该IP的MAC地址映射',
      action: '检查ARP缓存',
    },
    {
      title: 'ARP请求广播',
      description: '主机A发送ARP请求广播帧，目标MAC为FF:FF:FF:FF:FF:FF，询问"谁是192.168.1.20？"',
      action: '发送ARP请求',
      packet: { type: 'ARP-Request' as const, from: 'hostA', to: 'broadcast', content: 'Who has 192.168.1.20?' }
    },
    {
      title: '广播传播',
      description: '交换机收到广播帧后，向所有端口（除接收端口）泛洪该ARP请求',
      action: '交换机泛洪',
    },
    {
      title: 'ARP响应单播',
      description: '主机B识别到自己的IP地址，向主机A单播ARP响应，告知自己的MAC地址',
      action: '回复ARP响应',
      packet: { type: 'ARP-Reply' as const, from: 'hostB', to: 'hostA', content: 'AA:BB:CC:DD:EE:02' }
    },
    {
      title: 'ARP缓存更新',
      description: '主机A收到响应后，将IP-MAC映射存入ARP缓存表，设置老化计时器',
      action: '更新缓存',
    },
    {
      title: '数据帧传输',
      description: '主机A现在可以直接发送数据帧到主机B的MAC地址，使用单播通信',
      action: '数据传输',
      packet: { type: 'Data' as const, from: 'hostA', to: 'hostB', content: 'Hello!' }
    },
  ];

  const examPoints = [
    {
      title: 'ARP协议核心概念',
      points: [
        'ARP工作在数据链路层（Layer 2），直接封装在以太网帧中',
        'ARP请求使用广播（目标MAC: FF:FF:FF:FF:FF:FF）',
        'ARP响应使用单播，直接发送给请求方',
        'ARP缓存表用于减少广播流量，提高性能'
      ]
    },
    {
      title: 'ARP缓存机制',
      points: [
        '动态条目：通过ARP协议学习，有老化时间',
        'Windows默认老化时间：2-20分钟',
        'Linux默认老化时间：60秒（gc_stale_time）',
        '静态条目：手动配置，不会老化，重启后保留',
        '命令：arp -a（查看）、arp -s（添加静态）、arp -d（删除）'
      ]
    },
    {
      title: '免费ARP (Gratuitous ARP)',
      points: [
        '发送方IP和目标IP相同，目标MAC为全0',
        '用途1：IP地址冲突检测（开机时发送）',
        '用途2：更新其他主机的ARP缓存（VRRP切换时）',
        ' gratuitous ARP是广播，不需要响应'
      ]
    },
    {
      title: 'ARP欺骗与防御',
      points: [
        '攻击原理：发送伪造ARP响应，篡改目标ARP缓存',
        '攻击后果：中间人攻击(MITM)、流量劫持、断网',
        '防御措施1：静态ARP绑定（arp -s）',
        '防御措施2：ARP防火墙、动态ARP检测(DAI)',
        '防御措施3：端口安全、802.1X认证'
      ]
    }
  ];

  useEffect(() => {
    if (isPlaying && currentStep < steps.length - 1) {
      autoPlayRef.current = setTimeout(() => {
        nextStep();
      }, 2500);
    } else if (currentStep === steps.length - 1) {
      setIsPlaying(false);
    }
    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, [isPlaying, currentStep]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      const step = steps[nextStepIndex];
      
      if (step.packet) {
        const newPacket: Packet = {
          id: `packet-${Date.now()}`,
          type: step.packet.type,
          from: step.packet.from,
          to: step.packet.to,
          content: step.packet.content
        };
        setActivePacket(newPacket);
        
        setTimeout(() => {
          setPackets(prev => [...prev, newPacket]);
          setActivePacket(null);
          
          // 更新ARP缓存
          if (nextStepIndex === 4) {
            setArpTable(prev => [...prev, { 
              ip: '192.168.1.20', 
              mac: 'AA:BB:CC:DD:EE:02', 
              type: '动态', 
              status: '已缓存',
              timestamp: Date.now()
            }]);
          }
          
          setCurrentStep(nextStepIndex);
        }, 1500);
      } else {
        setCurrentStep(nextStepIndex);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (packets.length > 0 && currentStep === 4) {
        setPackets(prev => prev.slice(0, -1));
        setArpTable(prev => prev.filter(entry => entry.ip !== '192.168.1.20'));
      }
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setPackets([]);
    setActivePacket(null);
    setIsPlaying(false);
    setArpTable([
      { ip: '192.168.1.10', mac: 'AA:BB:CC:DD:EE:01', type: '静态', status: '本机', timestamp: Date.now() },
      { ip: '192.168.1.1', mac: 'AA:BB:CC:DD:EE:FF', type: '静态', status: '网关', timestamp: Date.now() },
    ]);
  };

  const scene = {
    id: 'arp-protocol',
    title: 'ARP协议：地址解析',
    description: '理解ARP请求/响应过程、ARP缓存管理、代理ARP与ARP欺骗攻击',
    phase: 5 as const,
    category: '网络层协议',
    difficulty: 'medium' as const,
    duration: '10-15分钟',
  };

  return (
    <SceneLayout scene={scene}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 顶部步骤指示器 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center flex-1">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${
                    index <= currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentStep(index)}
                >
                  {index}
                </motion.div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-2 mx-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: index < currentStep ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {steps[currentStep].title}
            </h3>
            <p className="text-gray-600">{steps[currentStep].description}</p>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：可视化动画 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-500" />
                  ARP工作流程演示
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={currentStep === steps.length - 1}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                      isPlaying 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } disabled:opacity-50`}
                  >
                    {isPlaying ? <><Pause className="w-4 h-4" /> 暂停</> : <><Play className="w-4 h-4" /> 播放</>}
                  </button>
                  <button
                    onClick={reset}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> 重置
                  </button>
                </div>
              </div>
              
              <div className="relative h-80 bg-gradient-to-b from-blue-50 to-indigo-50 rounded-xl overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 600 320">
                  {/* 网络背景 */}
                  <rect x="50" y="40" width="500" height="240" fill="#f0f9ff" stroke="#3b82f6" strokeWidth="2" strokeDasharray="8,4" rx="12" />
                  <text x="300" y="25" textAnchor="middle" className="fill-blue-600 text-sm font-bold">
                    192.168.1.0/24 局域网
                  </text>

                  {/* 主机A */}
                  <g 
                    transform="translate(100, 100)" 
                    className="cursor-pointer"
                    onClick={() => setSelectedHost('hostA')}
                  >
                    <motion.rect 
                      x="0" y="0" width="90" height="70" 
                      fill={selectedHost === 'hostA' ? '#bfdbfe' : '#dbeafe'} 
                      stroke="#3b82f6" 
                      strokeWidth={selectedHost === 'hostA' ? 3 : 2} 
                      rx="8"
                      whileHover={{ scale: 1.05 }}
                    />
                    <text x="45" y="28" textAnchor="middle" className="fill-blue-800 text-sm font-bold">主机A</text>
                    <text x="45" y="45" textAnchor="middle" className="fill-gray-600 text-xs">192.168.1.10</text>
                    <text x="45" y="60" textAnchor="middle" className="fill-gray-500 text-xs font-mono">AA:BB:CC:DD:EE:01</text>
                  </g>

                  {/* 主机B */}
                  <g 
                    transform="translate(410, 100)" 
                    className="cursor-pointer"
                    onClick={() => setSelectedHost('hostB')}
                  >
                    <motion.rect 
                      x="0" y="0" width="90" height="70" 
                      fill={selectedHost === 'hostB' ? '#bbf7d0' : '#dcfce7'} 
                      stroke="#22c55e" 
                      strokeWidth={selectedHost === 'hostB' ? 3 : 2} 
                      rx="8"
                      whileHover={{ scale: 1.05 }}
                    />
                    <text x="45" y="28" textAnchor="middle" className="fill-green-800 text-sm font-bold">主机B</text>
                    <text x="45" y="45" textAnchor="middle" className="fill-gray-600 text-xs">192.168.1.20</text>
                    <text x="45" y="60" textAnchor="middle" className="fill-gray-500 text-xs font-mono">AA:BB:CC:DD:EE:02</text>
                  </g>

                  {/* 交换机 */}
                  <g transform="translate(255, 180)">
                    <rect x="0" y="0" width="90" height="55" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" rx="8" />
                    <text x="45" y="22" textAnchor="middle" className="fill-amber-800 text-sm font-bold">交换机</text>
                    <text x="45" y="42" textAnchor="middle" className="fill-gray-600 text-xs">二层转发</text>
                  </g>

                  {/* 连接线 */}
                  <line x1="190" y1="145" x2="255" y2="205" stroke="#6b7280" strokeWidth="2" />
                  <line x1="345" y1="205" x2="410" y2="145" stroke="#6b7280" strokeWidth="2" />

                  {/* ARP请求广播动画 */}
                  {currentStep === 1 && (
                    <>
                      <motion.circle
                        cx="220"
                        cy="165"
                        r="15"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        initial={{ r: 15, opacity: 1 }}
                        animate={{ r: 120, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <motion.circle
                        cx="220"
                        cy="165"
                        r="15"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        initial={{ r: 15, opacity: 1 }}
                        animate={{ r: 80, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                      />
                      <motion.g
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <rect x="160" y="50" width="120" height="35" fill="#fee2e2" stroke="#ef4444" strokeWidth="1" rx="5" />
                        <text x="220" y="70" textAnchor="middle" className="fill-red-700 text-xs font-bold">ARP请求广播</text>
                        <text x="220" y="85" textAnchor="middle" className="fill-red-600 text-xs">"谁是192.168.1.20？"</text>
                      </motion.g>
                    </>
                  )}

                  {/* 交换机泛洪指示 */}
                  {currentStep === 2 && (
                    <>
                      <motion.path
                        d="M 300 205 L 350 165"
                        stroke="#f59e0b"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                      <motion.text
                        x="340"
                        y="180"
                        textAnchor="middle"
                        className="fill-amber-700 text-xs font-bold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        泛洪
                      </motion.text>
                    </>
                  )}

                  {/* ARP响应动画 */}
                  {currentStep === 3 && (
                    <motion.g
                      initial={{ opacity: 0, x: 380 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 1.2 }}
                    >
                      <rect x="220" y="155" width="160" height="45" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" rx="8" />
                      <text x="300" y="175" textAnchor="middle" className="fill-green-800 text-sm font-bold">ARP响应（单播）</text>
                      <text x="300" y="192" textAnchor="middle" className="fill-green-700 text-xs">"我是AA:BB:CC:DD:EE:02"</text>
                    </motion.g>
                  )}

                  {/* 数据传输动画 */}
                  {currentStep >= 5 && (
                    <motion.g
                      initial={{ opacity: 0, x: 190 }}
                      animate={{ opacity: 1, x: 380 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <rect x="0" y="-12" width="70" height="30" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" rx="6" />
                      <text x="35" y="8" textAnchor="middle" className="fill-blue-800 text-xs font-bold">数据帧</text>
                    </motion.g>
                  )}

                  {/* 缓存更新指示 */}
                  {currentStep === 4 && (
                    <motion.g
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      transform="translate(100, 180)"
                    >
                      <rect x="0" y="0" width="90" height="40" fill="#ecfdf5" stroke="#22c55e" strokeWidth="2" rx="6" />
                      <text x="45" y="16" textAnchor="middle" className="fill-green-800 text-xs font-bold">ARP缓存</text>
                      <text x="45" y="32" textAnchor="middle" className="fill-green-700 text-xs">+192.168.1.20</text>
                    </motion.g>
                  )}
                </svg>
              </div>

              {/* 控制按钮 */}
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="px-6 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors flex items-center gap-2 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一步
                </button>
                <button
                  onClick={nextStep}
                  disabled={currentStep === steps.length - 1}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium"
                >
                  下一步
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ARP缓存表 */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-500" />
                ARP缓存表 (主机A)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">IP地址</th>
                      <th className="px-4 py-3 text-left font-semibold">MAC地址</th>
                      <th className="px-4 py-3 text-left font-semibold">类型</th>
                      <th className="px-4 py-3 text-left font-semibold">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arpTable.map((entry, index) => (
                      <motion.tr 
                        key={index} 
                        className="border-b hover:bg-gray-50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <td className="px-4 py-3 font-mono text-blue-600">{entry.ip}</td>
                        <td className="px-4 py-3 font-mono">{entry.mac}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.type === '静态' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.status === '已缓存' ? 'bg-green-100 text-green-700' : 
                            entry.status === '网关' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <Info className="w-4 h-4 inline mr-1" />
                  <strong>老化时间：</strong>Windows默认20分钟，Linux默认60秒。可通过命令 <code className="bg-blue-100 px-1 rounded">arp -a</code> 查看缓存表
                </p>
              </div>
            </div>
          </div>

          {/* 右侧：知识点面板 */}
          <div className="space-y-4">
            {/* ARP报文格式 */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                ARP报文格式
              </h4>
              <div className="space-y-2 text-sm">
                {[
                  { label: '硬件类型', value: '0x0001 (以太网)' },
                  { label: '协议类型', value: '0x0800 (IPv4)' },
                  { label: '硬件地址长度', value: '6 (MAC)' },
                  { label: '协议地址长度', value: '4 (IPv4)' },
                  { label: '操作码', value: '1=请求, 2=响应' },
                  { label: '发送方MAC', value: 'AA:BB:CC:DD:EE:01' },
                  { label: '发送方IP', value: '192.168.1.10' },
                  { label: '目标MAC', value: '00:00:00:00:00:00' },
                  { label: '目标IP', value: '192.168.1.20' },
                ].map((item, index) => (
                  <div key={index} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-mono text-gray-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 扩展知识点 */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <h4 className="font-bold text-gray-800 mb-4">扩展知识点</h4>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowGratuitous(!showGratuitous)}
                  className="w-full text-left p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700 font-medium">免费ARP (Gratuitous ARP)</span>
                    {showGratuitous ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  <AnimatePresence>
                    {showGratuitous && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 text-sm text-gray-600 space-y-1"
                      >
                        <p>• 发送方IP和目标IP相同，目标MAC为全0</p>
                        <p>• 用途：IP地址冲突检测、更新其他主机ARP缓存</p>
                        <p>• gratuitous ARP广播，不需要响应</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>

                <button
                  onClick={() => setShowProxy(!showProxy)}
                  className="w-full text-left p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">代理ARP (Proxy ARP)</span>
                    {showProxy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  <AnimatePresence>
                    {showProxy && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 text-sm text-gray-600 space-y-1"
                      >
                        <p>• 路由器代替其他主机响应ARP请求</p>
                        <p>• 用于不同子网间的通信</p>
                        <p>• 现代网络中已被三层交换取代</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>

                <button
                  onClick={() => setShowAttack(!showAttack)}
                  className="w-full text-left p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-red-700 font-medium">ARP欺骗攻击</span>
                    </div>
                    {showAttack ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  <AnimatePresence>
                    {showAttack && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 text-sm text-gray-600 space-y-1"
                      >
                        <p>• 攻击者发送伪造ARP响应，篡改目标ARP缓存</p>
                        <p>• 可导致中间人攻击(MITM)、流量劫持</p>
                        <p className="text-red-600 font-medium mt-2">防御措施：</p>
                        <p>• 静态ARP绑定 • ARP防火墙</p>
                        <p>• 端口安全 • 动态ARP检测(DAI)</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 考试要点折叠面板 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => setShowExamPoints(!showExamPoints)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-800">考试要点总结</h4>
                <p className="text-sm text-gray-600">ARP协议高频考点与易错点</p>
              </div>
            </div>
            {showExamPoints ? <ChevronUp className="w-6 h-6 text-gray-600" /> : <ChevronDown className="w-6 h-6 text-gray-600" />}
          </button>
          
          <AnimatePresence>
            {showExamPoints && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {examPoints.map((section, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-5">
                      <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm">
                          {index + 1}
                        </span>
                        {section.title}
                      </h5>
                      <ul className="space-y-2">
                        {section.points.map((point, pIndex) => (
                          <li key={pIndex} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SceneLayout>
  );
}
