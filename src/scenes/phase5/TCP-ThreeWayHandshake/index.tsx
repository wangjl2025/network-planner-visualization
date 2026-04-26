import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  ArrowRight, ArrowLeft, Info, Monitor, Server, Activity, 
  CheckCircle, XCircle, Play, RotateCcw, Network, Shield,
  Clock, AlertTriangle, FileText, ChevronDown, ChevronUp
} from 'lucide-react';

interface Packet {
  id: string;
  type: 'SYN' | 'SYN-ACK' | 'ACK' | 'DATA';
  seq: number;
  ack?: number;
  from: 'client' | 'server';
  to: 'client' | 'server';
}

interface ConnectionState {
  client: 'CLOSED' | 'SYN_SENT' | 'ESTABLISHED';
  server: 'CLOSED' | 'LISTEN' | 'SYN_RCVD' | 'ESTABLISHED';
}

interface Step {
  title: string;
  description: string;
  clientState: 'CLOSED' | 'SYN_SENT' | 'ESTABLISHED';
  serverState: 'CLOSED' | 'LISTEN' | 'SYN_RCVD' | 'ESTABLISHED';
  action: string;
  packet?: {
    type: 'SYN' | 'SYN-ACK' | 'ACK' | 'DATA';
    seq: number;
    ack?: number;
    from: 'client' | 'server';
    to: 'client' | 'server';
  };
}

const getClientColor = (state: ConnectionState['client'], isFill: boolean) => {
  const map = {
    CLOSED: isFill ? '#9ca3af' : '#4b5563',
    SYN_SENT: isFill ? '#fbbf24' : '#92400e',
    ESTABLISHED: isFill ? '#22c55e' : '#166534',
  };
  return map[state] || map.CLOSED;
};

const getServerColor = (state: ConnectionState['server'], isFill: boolean) => {
  const map = {
    CLOSED: isFill ? '#9ca3af' : '#4b5563',
    LISTEN: isFill ? '#60a5fa' : '#1e40af',
    SYN_RCVD: isFill ? '#fb923c' : '#9a3412',
    ESTABLISHED: isFill ? '#22c55e' : '#166534',
  };
  return map[state] || map.CLOSED;
};

export default function TCPThreeWayHandshakeScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPacketDetails, setShowPacketDetails] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showExamPoints, setShowExamPoints] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    client: 'CLOSED',
    server: 'LISTEN'
  });
  const [packets, setPackets] = useState<Packet[]>([]);
  const [activePacket, setActivePacket] = useState<Packet | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = [
    {
      title: '初始状态',
      description: '客户端CLOSED，服务器LISTEN。双方尚未建立连接，等待客户端发起连接请求',
      clientState: 'CLOSED' as const,
      serverState: 'LISTEN' as const,
      action: '等待连接',
    },
    {
      title: '第一次握手：SYN',
      description: '客户端发送SYN包（seq=x），进入SYN_SENT状态。SYN=1表示请求建立连接',
      clientState: 'SYN_SENT' as const,
      serverState: 'LISTEN' as const,
      action: '发送SYN',
      packet: { type: 'SYN' as const, seq: 100, from: 'client', to: 'server' }
    },
    {
      title: '第二次握手：SYN-ACK',
      description: '服务器收到SYN，发送SYN-ACK（seq=y, ack=x+1），进入SYN_RCVD状态',
      clientState: 'SYN_SENT' as const,
      serverState: 'SYN_RCVD' as const,
      action: '回复SYN-ACK',
      packet: { type: 'SYN-ACK' as const, seq: 200, ack: 101, from: 'server', to: 'client' }
    },
    {
      title: '第三次握手：ACK',
      description: '客户端收到SYN-ACK，发送ACK（ack=y+1），进入ESTABLISHED状态',
      clientState: 'ESTABLISHED' as const,
      serverState: 'SYN_RCVD' as const,
      action: '发送ACK',
      packet: { type: 'ACK' as const, seq: 101, ack: 201, from: 'client', to: 'server' }
    },
    {
      title: '连接建立完成',
      description: '服务器收到ACK，进入ESTABLISHED。TCP全双工连接建立完成，可以传输数据',
      clientState: 'ESTABLISHED' as const,
      serverState: 'ESTABLISHED' as const,
      action: '连接就绪',
    },
  ];

  const examPoints = [
    {
      title: '为什么是三次握手？',
      points: [
        '确认双方收发能力正常（全双工）',
        '同步初始序号(ISN)，防止乱序',
        '防止历史重复连接初始化',
        '避免服务器资源浪费（SYN洪泛攻击防护）'
      ]
    },
    {
      title: '序号机制',
      points: [
        'seq：本报文段发送数据的起始序号',
        'ack：期望收到对方下一个报文段的序号',
        '初始序号(ISN)是随机生成的，防止序列号预测攻击',
        'SYN和FIN标志位各占一个序号（即使不携带数据）'
      ]
    },
    {
      title: '状态转换',
      points: [
        '客户端：CLOSED → SYN_SENT → ESTABLISHED',
        '服务器：CLOSED → LISTEN → SYN_RCVD → ESTABLISHED',
        'LISTEN状态：服务器被动打开，等待连接',
        'ESTABLISHED：连接建立，可以传输数据'
      ]
    },
    {
      title: '常见考点',
      points: [
        'ACK报文可以携带数据，也可以不携带',
        '第三次握手可以携带应用层数据',
        'SYN洪泛攻击：攻击者发送大量SYN包但不完成握手',
        'SYN Cookie：防御SYN洪泛攻击的技术'
      ]
    }
  ];

  useEffect(() => {
    setConnectionState({
      client: steps[currentStep].clientState,
      server: steps[currentStep].serverState
    });
  }, [currentStep]);

  useEffect(() => {
    if (autoPlay && currentStep < steps.length - 1) {
      autoPlayRef.current = setTimeout(() => {
        nextStep();
      }, 2500);
    } else if (currentStep === steps.length - 1) {
      setAutoPlay(false);
    }
    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, [autoPlay, currentStep]);

  const nextStep = () => {
    if (currentStep < steps.length - 1 && !isAnimating) {
      setIsAnimating(true);
      const nextStepIndex = currentStep + 1;
      const step = steps[nextStepIndex];
      
      if (step.packet) {
        const newPacket: Packet = {
          id: `packet-${Date.now()}`,
          type: step.packet.type,
          seq: step.packet.seq,
          ack: step.packet.ack,
          from: step.packet.from as 'client' | 'server',
          to: step.packet.to as 'client' | 'server'
        };
        setActivePacket(newPacket);
        
        setTimeout(() => {
          setPackets(prev => [...prev, newPacket]);
          setActivePacket(null);
          setCurrentStep(nextStepIndex);
          setIsAnimating(false);
        }, 1500);
      } else {
        setCurrentStep(nextStepIndex);
        setIsAnimating(false);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0 && !isAnimating) {
      setCurrentStep(currentStep - 1);
      if (packets.length > currentStep - 1) {
        setPackets(prev => prev.slice(0, -1));
      }
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setPackets([]);
    setActivePacket(null);
    setAutoPlay(false);
    setConnectionState({ client: 'CLOSED', server: 'LISTEN' });
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'bg-gray-500';
      case 'LISTEN': return 'bg-blue-500';
      case 'SYN_SENT': return 'bg-yellow-500';
      case 'SYN_RCVD': return 'bg-orange-500';
      case 'ESTABLISHED': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStateTextColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'text-gray-700';
      case 'LISTEN': return 'text-blue-700';
      case 'SYN_SENT': return 'text-yellow-700';
      case 'SYN_RCVD': return 'text-orange-700';
      case 'ESTABLISHED': return 'text-green-700';
      default: return 'text-gray-700';
    }
  };

  const getPacketColor = (type: string) => {
    switch (type) {
      case 'SYN': return 'bg-blue-500';
      case 'SYN-ACK': return 'bg-purple-500';
      case 'ACK': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const scene = {
    id: 'tcp-three-way-handshake',
    title: 'TCP三次握手',
    description: 'TCP连接建立的三次握手过程：SYN → SYN-ACK → ACK',
    phase: 5 as const,
    category: '传输层协议',
    difficulty: 'medium' as const,
    duration: '10-15分钟',
  };

  return (
    <SceneLayout scene={scene} showSidebar={false} noHeightLimit={true}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 顶部步骤指示器 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center flex-1">
                <motion.div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${
                    index <= currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => !isAnimating && setCurrentStep(index)}
                >
                  {index === 0 ? '0' : index}
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
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {steps[currentStep].title}
            </h3>
            <p className="text-gray-600 text-lg">{steps[currentStep].description}</p>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：连接动画 */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <Network className="w-5 h-5 text-blue-500" />
                握手过程可视化
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  disabled={currentStep === steps.length - 1}
                  className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                    autoPlay 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } disabled:opacity-50`}
                >
                  {autoPlay ? <><XCircle className="w-4 h-4" /> 停止</> : <><Play className="w-4 h-4" /> 自动播放</>}
                </button>
                <button
                  onClick={reset}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> 重置
                </button>
              </div>
            </div>
            
            <div className="relative h-96 bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl overflow-hidden">
              <svg viewBox="0 0 700 350" className="w-full h-full">
                {/* 时间轴 */}
                <line x1="180" y1="60" x2="180" y2="320" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />
                <line x1="520" y1="60" x2="520" y2="320" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />

                {/* 客户端 */}
                <g transform="translate(130, 20)">
                  <rect x="0" y="0" width="100" height="45" rx="8" fill="#3b82f6" filter="url(#shadow)" />
                  <text x="50" y="28" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                    客户端
                  </text>
                  <foreignObject x="35" y="50" width="30" height="30">
                    <Monitor className="w-full h-full text-blue-500" />
                  </foreignObject>
                </g>
                <text x="180" y="340" textAnchor="middle" fontSize="12" fill="#6b7280">
                  主动打开 (Active Open)
                </text>

                {/* 服务器 */}
                <g transform="translate(470, 20)">
                  <rect x="0" y="0" width="100" height="45" rx="8" fill="#10b981" filter="url(#shadow)" />
                  <text x="50" y="28" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                    服务器
                  </text>
                  <foreignObject x="35" y="50" width="30" height="30">
                    <Server className="w-full h-full text-green-500" />
                  </foreignObject>
                </g>
                <text x="520" y="340" textAnchor="middle" fontSize="12" fill="#6b7280">
                  被动打开 (Passive Open)
                </text>

                {/* 阴影滤镜 */}
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                  </filter>
                </defs>

                {/* 状态显示 */}
                <g transform="translate(130, 90)">
                  <motion.rect 
                    x="0" y="0" width="100" height="35" rx="6" 
                    fill={getClientColor(connectionState.client, true)} 
                    fillOpacity="0.2" 
                    stroke={getClientColor(connectionState.client, true)} 
                    strokeWidth="2"
                    animate={{ 
                      fillOpacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <text x="50" y="23" textAnchor="middle" fontSize="12" fontWeight="bold" 
                    fill={getClientColor(connectionState.client, false)}>
                    {connectionState.client}
                  </text>
                </g>

                <g transform="translate(470, 90)">
                  <motion.rect 
                    x="0" y="0" width="100" height="35" rx="6" 
                    fill={getServerColor(connectionState.server, true)} 
                    fillOpacity="0.2"  
                    stroke={getServerColor(connectionState.server, true)}
                    strokeWidth="2"
                    animate={{ 
                      fillOpacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <text x="50" y="23" textAnchor="middle" fontSize="12" fontWeight="bold"
                    fill={getServerColor(connectionState.server, false)}>
                    {connectionState.server}
                  </text>
                </g>

                {/* 历史数据包连线 */}
                {packets.map((packet, index) => {
                  const y = 140 + index * 50;
                  const isClientToServer = packet.from === 'client';
                  return (
                    <g key={packet.id}>
                      <line 
                        x1={isClientToServer ? 180 : 520} 
                        y1={y} 
                        x2={isClientToServer ? 520 : 180} 
                        y2={y} 
                        stroke={packet.type === 'SYN' ? '#3b82f6' : packet.type === 'SYN-ACK' ? '#8b5cf6' : '#22c55e'} 
                        strokeWidth="2"
                        strokeDasharray={packet.type === 'ACK' ? "0" : "5,3"}
                        opacity="0.6"
                      />
                      <g transform={`translate(${isClientToServer ? 350 : 350}, ${y})`}>
                        <rect x="-35" y="-15" width="70" height="30" rx="5" 
                          fill={packet.type === 'SYN' ? '#3b82f6' : packet.type === 'SYN-ACK' ? '#8b5cf6' : '#22c55e'} 
                          opacity="0.9"
                          className="cursor-pointer hover:opacity-100"
                          onClick={() => { setSelectedPacket(packet); setShowPacketDetails(true); }}
                        />
                        <text x="0" y="-2" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                          {packet.type}
                        </text>
                        <text x="0" y="10" textAnchor="middle" fontSize="8" fill="white">
                          seq={packet.seq}{packet.ack ? ` ack=${packet.ack}` : ''}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* 活跃数据包动画 */}
                <AnimatePresence>
                  {activePacket && (
                    <motion.g
                      initial={{ x: activePacket.from === 'client' ? 180 : 520, y: 140 + packets.length * 50 }}
                      animate={{ x: activePacket.to === 'client' ? 180 : 520, y: 140 + packets.length * 50 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.5, ease: 'easeInOut' }}
                    >
                      <motion.rect 
                        x="-40" y="-20" width="80" height="40" rx="8" 
                        fill={activePacket.type === 'SYN' ? '#3b82f6' : activePacket.type === 'SYN-ACK' ? '#8b5cf6' : '#22c55e'}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: 2 }}
                      />
                      <text x="0" y="-5" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">
                        {activePacket.type}
                      </text>
                      <text x="0" y="10" textAnchor="middle" fontSize="9" fill="white">
                        seq={activePacket.seq}
                      </text>
                      {activePacket.ack && (
                        <text x="0" y="22" textAnchor="middle" fontSize="8" fill="white">
                          ack={activePacket.ack}
                        </text>
                      )}
                    </motion.g>
                  )}
                </AnimatePresence>

                {/* 完成标记 */}
                {currentStep === 4 && (
                  <motion.g 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    transform="translate(350, 280)"
                  >
                    <circle cx="0" cy="0" r="35" fill="#22c55e" />
                    <text x="0" y="-5" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">
                      ESTABLISHED
                    </text>
                    <text x="0" y="12" textAnchor="middle" fontSize="10" fill="white">
                      连接建立
                    </text>
                    <motion.path
                      d="M -15 5 L -5 15 L 20 -10"
                      stroke="white"
                      strokeWidth="3"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    />
                  </motion.g>
                )}
              </svg>
            </div>

            {/* 控制按钮 */}
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={prevStep}
                disabled={currentStep === 0 || isAnimating}
                className="px-6 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors flex items-center gap-2 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                上一步
              </button>
              <button
                onClick={nextStep}
                disabled={currentStep === steps.length - 1 || isAnimating}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium"
              >
                下一步
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 右侧：信息面板 */}
          <div className="space-y-4">
            {/* TCP标志位 */}
            <div className="bg-white rounded-xl shadow p-5">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                TCP标志位
              </h4>
              <div className="space-y-3">
                {[
                  { flag: 'SYN', color: 'bg-blue-100 text-blue-800', desc: '同步序号，发起连接' },
                  { flag: 'ACK', color: 'bg-green-100 text-green-800', desc: '确认序号有效' },
                  { flag: 'FIN', color: 'bg-red-100 text-red-800', desc: '释放连接（四次挥手）' },
                  { flag: 'RST', color: 'bg-yellow-100 text-yellow-800', desc: '重置连接' },
                ].map((item) => (
                  <div key={item.flag} className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded font-mono text-sm font-bold ${item.color}`}>
                      {item.flag}
                    </span>
                    <span className="text-gray-600 text-sm">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 序号机制 */}
            <div className="bg-white rounded-xl shadow p-5">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                序号机制
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-600">seq</span>
                  <span>本报文段发送数据的起始序号</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono font-bold text-green-600">ack</span>
                  <span>期望收到对方下一个报文段的序号</span>
                </div>
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-800 text-xs">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    初始序号(ISN)是随机生成的，防止序列号预测攻击
                  </p>
                </div>
              </div>
            </div>

            {/* 为什么是三次 */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow p-5 border border-amber-200">
              <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                为什么是三次？
              </h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>确认双方收发能力正常</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>同步初始序号(ISN)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>防止历史重复连接</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>防御SYN洪泛攻击</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 考试要点折叠面板 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => setShowExamPoints(!showExamPoints)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-800">考试要点总结</h4>
                <p className="text-sm text-gray-600">TCP三次握手高频考点与易错点</p>
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
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
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

        {/* 数据包详情弹窗 */}
        <AnimatePresence>
          {showPacketDetails && selectedPacket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowPacketDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-gray-800">TCP报文详情</h4>
                  <button 
                    onClick={() => setShowPacketDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">类型</span>
                    <span className={`px-3 py-1 rounded font-mono font-bold text-white ${getPacketColor(selectedPacket.type)}`}>
                      {selectedPacket.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">序号 (seq)</span>
                    <span className="font-mono font-bold text-blue-600">{selectedPacket.seq}</span>
                  </div>
                  {selectedPacket.ack && (
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">确认号 (ack)</span>
                      <span className="font-mono font-bold text-green-600">{selectedPacket.ack}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">方向</span>
                    <span className="text-gray-800">
                      {selectedPacket.from === 'client' ? '客户端 → 服务器' : '服务器 → 客户端'}
                    </span>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <Info className="w-4 h-4 inline mr-1" />
                      {selectedPacket.type === 'SYN' && 'SYN=1表示请求建立连接，seq=x是客户端选择的初始序号'}
                      {selectedPacket.type === 'SYN-ACK' && 'SYN=1, ACK=1表示同意建立连接，seq=y是服务器初始序号，ack=x+1确认收到客户端SYN'}
                      {selectedPacket.type === 'ACK' && 'ACK=1表示确认号有效，ack=y+1确认收到服务器SYN，连接建立完成'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneLayout>
  );
}
