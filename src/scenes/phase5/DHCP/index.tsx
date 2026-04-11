import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Smartphone, Server, Wifi, CheckCircle, XCircle, 
  Clock, ArrowRight, RefreshCw, Zap, Info, Globe, RotateCcw, Play
} from 'lucide-react';

// Scene 类型定义
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

// 场景数据
const sceneData: Scene = {
  id: 'dhcp',
  title: 'DHCP协议：DORA四步交互与租约管理',
  description: '深入理解DHCP的DORA流程、租约续期、Nak拒绝等完整生命周期',
  phase: 5,
  category: '基础协议',
  difficulty: 'easy',
  duration: '8-10分钟',
  isHot: true,
};

// DHCP流程类型
type FlowType = 'DORA' | 'RENEW' | 'NAK';

// 步骤定义
interface DHSStep {
  id: number;
  name: string;
  label: string;
  fullName: string;
  from: 'client' | 'server';
  to: 'server' | 'client' | 'broadcast';
  direction: 'down' | 'up';
  description: string;
  technicalDetails: string[];
  color: string;
}

// DORA流程步骤
const doraSteps: DHSStep[] = [
  {
    id: 0,
    name: 'Discover',
    label: 'Discover',
    fullName: 'Step 1: DHCP Discover',
    from: 'client',
    to: 'broadcast',
    direction: 'down',
    description: '客户端广播发现DHCP服务器，请求分配IP地址',
    technicalDetails: [
      '源IP: 0.0.0.0（未知）',
      '目标IP: 255.255.255.255（广播）',
      'UDP: 客户端68 → 服务器67',
      '事务ID: 随机数（匹配响应）',
      'MAC: FF:FF:FF:FF:FF:FF'
    ],
    color: '#3B82F6'
  },
  {
    id: 1,
    name: 'Offer',
    label: 'Offer',
    fullName: 'Step 2: DHCP Offer',
    from: 'server',
    to: 'broadcast',
    direction: 'up',
    description: '服务器提供可用IP地址（可能多台服务器同时响应）',
    technicalDetails: [
      '服务器IP: 192.168.1.1',
      '提供IP: 192.168.1.100',
      'UDP: 服务器67 → 客户端68',
      '租约时间: 86400秒（1天）',
      'YIADDR: 预分配IP地址',
      '传输: 若客户端设broadcast flag则广播，否则单播到客户端MAC'
    ],
    color: '#10B981'
  },
  {
    id: 2,
    name: 'Request',
    label: 'Request',
    fullName: 'Step 3: DHCP Request',
    from: 'client',
    to: 'broadcast',
    direction: 'down',
    description: '客户端广播请求确认IP地址（选择第一个收到的Offer）',
    technicalDetails: [
      '广播告知所有服务器选择',
      '包含请求的IP地址',
      'Server Identifier指明服务器',
      '事务ID用于匹配Offer',
      '选择最先收到的Offer'
    ],
    color: '#F59E0B'
  },
  {
    id: 3,
    name: 'Ack',
    label: 'Ack',
    fullName: 'Step 4: DHCP Ack',
    from: 'server',
    to: 'broadcast',
    direction: 'up',
    description: '服务器确认租约成功，客户端正式获得IP地址',
    technicalDetails: [
      '确认IP: 192.168.1.100',
      '租约: 86400秒（1天）',
      'T1续租: 50% = 43200秒',
      'T2续租: 87.5% = 75600秒',
      '客户端立即可使用该IP'
    ],
    color: '#8B5CF6'
  }
];

// 续租流程步骤
const renewSteps: DHSStep[] = [
  {
    id: 0,
    name: 'Request',
    label: '续租Request',
    fullName: 'Step 1: DHCP Request (续租)',
    from: 'client',
    to: 'server',
    direction: 'up',
    description: '客户端直接向原服务器发送续租请求（T1=50%租约时）',
    technicalDetails: [
      '源IP: 192.168.1.100（已有IP）',
      '目标IP: 192.168.1.1（原服务器）',
      'UDP: 客户端68 → 服务器67',
      '单播直接发送（非广播）',
      'CIADDR: 192.168.1.100'
    ],
    color: '#06B6D4'
  },
  {
    id: 1,
    name: 'Ack',
    label: '续租Ack',
    fullName: 'Step 2: DHCP Ack (续租成功)',
    from: 'server',
    to: 'client',
    direction: 'down',
    description: '服务器确认续租成功，租约时间重置',
    technicalDetails: [
      '确认续租',
      '租约时间重置为86400秒',
      '新的T1/T2时间点',
      '单播回复',
      '客户端更新租约到期时间'
    ],
    color: '#10B981'
  }
];

// Nak流程步骤
const nakSteps: DHSStep[] = [
  {
    id: 0,
    name: 'Request',
    label: 'Request',
    fullName: 'Step 1: DHCP Request (请求)',
    from: 'client',
    to: 'broadcast',
    direction: 'down',
    description: '客户端广播请求之前分配的IP地址',
    technicalDetails: [
      '请求IP: 192.168.1.100',
      '广播给所有服务器',
      '事务ID匹配',
      '服务器可选择拒绝'
    ],
    color: '#F59E0B'
  },
  {
    id: 1,
    name: 'Nak',
    label: 'Nak',
    fullName: 'Step 2: DHCP Nak (拒绝)',
    from: 'server',
    to: 'broadcast',
    direction: 'up',
    description: '服务器拒绝该请求（IP已分配给其他客户端或租约过期）',
    technicalDetails: [
      'Nak = Negative Acknowledge',
      '原因: IP不可用/已过期',
      '客户端需重新发起Discover',
      '广播回复',
      'Code 53,6 = Nak'
    ],
    color: '#EF4444'
  },
  {
    id: 2,
    name: 'Discover',
    label: '重新Discover',
    fullName: 'Step 3: DHCP Discover (重新获取)',
    from: 'client',
    to: 'broadcast',
    direction: 'down',
    description: '收到Nak后，客户端重新发起Discover流程',
    technicalDetails: [
      '重新从DORA第一步开始',
      '客户端释放无效IP',
      '重新申请可用IP',
      '可能获得不同IP'
    ],
    color: '#3B82F6'
  }
];

// 介绍说明数据
const introData = {
  DORA: {
    title: 'DORA 四步流程',
    subtitle: '首次获取IP地址',
    description: 'DHCP客户端首次接入网络时，通过DORA流程获取IP地址：',
    steps: [
      { num: 1, text: 'Discover - 客户端广播发现服务器', color: '#3B82F6' },
      { num: 2, text: 'Offer - 服务器提供可用IP（广播或单播到客户端MAC）', color: '#10B981' },
      { num: 3, text: 'Request - 客户端广播请求确认IP', color: '#F59E0B' },
      { num: 4, text: 'Ack - 服务器确认租约成功', color: '#8B5CF6' },
    ]
  },
  RENEW: {
    title: '续租流程',
    subtitle: '租约到期前续期',
    description: '当租约时间过半（T1=50%），客户端主动续租：',
    steps: [
      { num: 1, text: 'Request - 客户端单播向原服务器续租', color: '#06B6D4' },
      { num: 2, text: 'Ack - 服务器确认续租成功', color: '#10B981' },
    ]
  },
  NAK: {
    title: 'Nak 拒绝流程',
    subtitle: '服务器拒绝租约请求',
    description: '当服务器无法满足客户端的IP请求时，返回Nak：',
    steps: [
      { num: 1, text: 'Request - 客户端请求原IP', color: '#F59E0B' },
      { num: 2, text: 'Nak - 服务器拒绝（IP不可用）', color: '#EF4444' },
      { num: 3, text: '重新Discover - 客户端重新获取IP', color: '#3B82F6' },
    ]
  }
};

export default function DHCPScene() {
  const [currentStep, setCurrentStep] = useState(-1); // -1 表示介绍状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowType>('DORA');
  const [packetAnimation, setPacketAnimation] = useState<'idle' | 'sending' | 'received'>('idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // 根据选择的流程获取步骤
  const getSteps = (): DHSStep[] => {
    switch (selectedFlow) {
      case 'DORA': return doraSteps;
      case 'RENEW': return renewSteps;
      case 'NAK': return nakSteps;
      default: return doraSteps;
    }
  };

  const steps = getSteps();
  const currentStepData = currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null;
  const intro = introData[selectedFlow];

  // 清除定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // 自动播放逻辑
  useEffect(() => {
    if (!isPlaying || currentStep < 0) {
      clearTimer();
      setPacketAnimation('idle');
      return;
    }

    // 如果当前步骤是最后一步，播放结束
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    // 开始数据包动画
    setPacketAnimation('sending');
    
    // 设置定时器进入下一步
    timerRef.current = setTimeout(() => {
      setPacketAnimation('received');
      setTimeout(() => {
        setPacketAnimation('idle');
        setCurrentStep(prev => prev + 1);
      }, 600);
    }, 1200);

    return () => clearTimer();
  }, [isPlaying, currentStep, steps.length, clearTimer]);

  // 开始播放
  const handleStart = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(true);
  }, []);

  const handlePlay = useCallback(() => {
    if (currentStep < 0) {
      handleStart();
      return;
    }
    
    if (currentStep >= steps.length - 1) {
      // 重置并重新播放
      setCurrentStep(0);
      setPacketAnimation('idle');
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  }, [currentStep, isPlaying, steps.length, handleStart]);

  const handleStep = useCallback((step: number) => {
    setIsPlaying(false);
    setPacketAnimation('idle');
    setCurrentStep(step);
  }, []);

  const handleReset = useCallback(() => {
    clearTimer();
    setCurrentStep(-1);
    setIsPlaying(false);
    setPacketAnimation('idle');
  }, [clearTimer]);

  const handleFlowChange = useCallback((flow: FlowType) => {
    clearTimer();
    setSelectedFlow(flow);
    setCurrentStep(-1);
    setIsPlaying(false);
    setPacketAnimation('idle');
  }, [clearTimer]);

  // 清理
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // 计算数据包位置
  const getPacketStyle = () => {
    if (packetAnimation === 'idle') return { opacity: 0, x: 0, y: 0 };
    
    const isDown = currentStepData?.direction === 'down';
    const baseX = isDown ? -80 : 80;
    
    if (packetAnimation === 'sending') {
      return { opacity: 1, x: baseX * 0.5, y: isDown ? 30 : -30 };
    }
    if (packetAnimation === 'received') {
      return { opacity: 1, x: 0, y: 0 };
    }
    return { opacity: 0, x: 0, y: 0 };
  };

  return (
    <SceneLayout
      scene={sceneData}
      animationProps={{
        steps: [
          { id: '-1', label: '说明', desc: '查看流程说明' },
          ...steps.map(s => ({ 
            id: String(s.id), 
            label: s.label, 
            desc: s.description 
          }))
        ],
        currentStep: currentStep + 1, // 偏移因为加了说明步骤
        isPlaying,
        onPlay: handlePlay,
        onPause: () => setIsPlaying(false),
        onStepChange: (step) => handleStep(step - 1), // 偏移因为加了说明步骤
        onReset: handleReset,
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* 左侧：拓扑图和动画 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 流程选择 */}
          <div className="flex gap-2">
            {(['DORA', 'RENEW', 'NAK'] as FlowType[]).map((flow) => (
              <button
                key={flow}
                onClick={() => handleFlowChange(flow)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedFlow === flow
                    ? flow === 'DORA' ? 'bg-blue-500 text-white'
                    : flow === 'RENEW' ? 'bg-cyan-500 text-white'
                    : 'bg-red-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {flow === 'DORA' && <RefreshCw className="w-4 h-4 inline mr-1" />}
                {flow === 'RENEW' && <RotateCcw className="w-4 h-4 inline mr-1" />}
                {flow === 'NAK' && <XCircle className="w-4 h-4 inline mr-1" />}
                {flow === 'DORA' ? 'DORA流程' : flow === 'RENEW' ? '续租流程' : 'Nak拒绝'}
              </button>
            ))}
          </div>

          {/* 流程动画区域 */}
          <div className="relative h-[380px] bg-gradient-to-br from-gray-900 to-slate-900 rounded-2xl border border-gray-800 overflow-hidden">
            {/* 背景网格 */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full">
                <defs>
                  <pattern id="dhcp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dhcp-grid)" />
              </svg>
            </div>

            {/* 当前流程标题 */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gray-800/80 rounded-full z-20">
              <span className="text-sm font-medium text-gray-300">
                {currentStep < 0 ? intro.subtitle 
                  : selectedFlow === 'DORA' ? '首次获取IP地址' 
                  : selectedFlow === 'RENEW' ? '租约续期' 
                  : 'IP地址被拒绝'}
              </span>
            </div>

            {/* 三层网络拓扑 */}
            <div className="absolute inset-0 flex flex-col">
              {/* 客户端层 */}
              <div className="flex-1 flex items-center justify-start pl-16 relative">
                <motion.div 
                  className="flex flex-col items-center gap-2"
                  animate={packetAnimation === 'sending' && currentStepData?.direction === 'down' ? { 
                    scale: [1, 1.05, 1],
                  } : packetAnimation === 'received' && currentStepData?.direction === 'up' ? {
                    scale: [1.05, 1],
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <div className={`relative w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-500 ${
                    currentStep < 0 ? 'bg-blue-600/70' 
                      : currentStepData?.from === 'client' ? 'bg-blue-500 shadow-lg shadow-blue-500/50' 
                      : 'bg-blue-600/50'
                  }`}>
                    <Smartphone className="w-8 h-8 text-white" />
                    {currentStep >= 0 && currentStepData?.from === 'client' && (
                      <motion.div 
                        className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white">DHCP客户端</div>
                  <div className="text-xs text-gray-400">
                    {selectedFlow === 'DORA' && currentStep >= 3 ? '192.168.1.100' :
                     selectedFlow === 'RENEW' && currentStep >= 0 ? '192.168.1.100' :
                     selectedFlow === 'NAK' && currentStep >= 1 ? '0.0.0.0' : 
                     currentStep > 0 && currentStep < 3 ? '0.0.0.0' : 
                     currentStep < 0 ? '待获取IP' : '待获取IP'}
                  </div>
                </motion.div>
              </div>

              {/* 交换机层 */}
              <div className="h-20 flex items-center justify-center relative">
                <motion.div 
                  className="flex flex-col items-center gap-1"
                  animate={currentStep >= 0 ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.4 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <div className="w-14 h-14 rounded-xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center">
                    <Wifi className="w-7 h-7 text-amber-500" />
                  </div>
                  <div className="text-[10px] text-amber-400">交换机/L2</div>
                </motion.div>

                {/* 数据包动画层 - 居中显示 */}
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ zIndex: 30 }}
                >
                  <AnimatePresence mode="wait">
                    {currentStepData && packetAnimation !== 'idle' && (
                      <motion.div
                        key={`${selectedFlow}-${currentStep}-packet`}
                        className="px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-3"
                        style={{ 
                          backgroundColor: currentStepData.color,
                          boxShadow: `0 0 25px ${currentStepData.color}60`
                        }}
                        initial={{ opacity: 0, scale: 0.6, y: currentStepData.direction === 'down' ? -40 : 40 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1, 
                          y: 0,
                          x: getPacketStyle().x
                        }}
                        exit={{ opacity: 0, scale: 0.6, y: currentStepData.direction === 'up' ? -40 : 40 }}
                        transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
                      >
                        <span className="text-sm font-bold text-white">{currentStepData.name}</span>
                        <ArrowRight className="w-4 h-4 text-white/80" />
                        <span className="text-xs text-white/80">
                          {currentStepData.direction === 'down' ? '↓ 上行' : '↑ 下行'}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* 服务器层 */}
              <div className="flex-1 flex items-center justify-end pr-16 relative">
                <motion.div 
                  className="flex flex-col items-center gap-2"
                  animate={packetAnimation === 'sending' && currentStepData?.direction === 'up' ? { 
                    scale: [1, 1.05, 1],
                  } : packetAnimation === 'received' && currentStepData?.direction === 'down' ? {
                    scale: [1.05, 1],
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <div className={`relative w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-500 ${
                    currentStep < 0 ? 'bg-green-600/70'
                      : currentStepData?.from === 'server' ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                      : 'bg-green-600/50'
                  }`}>
                    <Server className="w-8 h-8 text-white" />
                    {currentStep >= 1 && currentStepData?.from === 'server' && (
                      <motion.div 
                        className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white">DHCP服务器</div>
                  <div className="text-xs text-green-400">192.168.1.1</div>
                </motion.div>
              </div>
            </div>

            {/* 步骤指示器 */}
            <AnimatePresence mode="wait">
              {currentStep >= 0 && currentStepData && (
                <motion.div 
                  key={`step-indicator-${currentStep}`}
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-medium"
                  style={{ 
                    backgroundColor: `${currentStepData.color}30`,
                    border: `1px solid ${currentStepData.color}50`,
                    color: currentStepData.color
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {currentStep + 1} / {steps.length}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 完成状态 */}
            <AnimatePresence>
              {currentStep >= steps.length - 1 && currentStep >= 0 && selectedFlow !== 'NAK' && (
                <motion.div 
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl flex items-center gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <div>
                    <div className="text-sm font-semibold text-emerald-400">
                      {selectedFlow === 'DORA' ? '租约成功' : '续租成功'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {selectedFlow === 'DORA' ? 'IP: 192.168.1.100 | 租约: 1天' : '租约已延长1天'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nak失败状态 */}
            <AnimatePresence>
              {selectedFlow === 'NAK' && currentStep >= 1 && currentStep < 3 && (
                <motion.div 
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <XCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <div className="text-sm font-semibold text-red-400">
                      {currentStep === 1 ? 'IP被拒绝' : '重新获取IP'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {currentStep === 1 ? '需重新发起Discover' : '等待新IP分配'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 初始状态提示 - 只有在介绍状态才显示 */}
            <AnimatePresence>
              {currentStep < 0 && (
                <motion.div 
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Play className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-blue-300">点击播放按钮开始演示</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 当前步骤详情 */}
          <AnimatePresence mode="wait">
            {currentStep >= 0 && currentStepData ? (
              <motion.div 
                key={`${selectedFlow}-detail-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border p-4"
                style={{ borderColor: `${currentStepData.color}40`, backgroundColor: `${currentStepData.color}10` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="px-3 py-1 rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: currentStepData.color }}
                  >
                    {currentStepData.fullName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{currentStepData.from === 'client' ? '客户端' : '服务器'}</span>
                    <ArrowRight className="w-4 h-4" />
                    <span>{currentStepData.to === 'broadcast' ? '广播' : '单播'}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-3">{currentStepData.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {currentStepData.technicalDetails.map((detail, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="text-xs bg-gray-800/50 px-2 py-1.5 rounded text-gray-300"
                    >
                      {detail}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : currentStep < 0 ? (
              /* 介绍状态显示 */
              <motion.div 
                key="intro-detail"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="px-3 py-1 rounded-lg text-sm font-bold text-white bg-blue-500">
                    {intro.title}
                  </div>
                  <span className="text-xs text-blue-400">{intro.subtitle}</span>
                </div>
                <p className="text-sm text-gray-300 mb-3">{intro.description}</p>
                <div className="space-y-2">
                  {intro.steps.map((s, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.num}
                      </div>
                      <span className="text-gray-300">{s.text}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* 右侧：流程图和详情 */}
        <div className="space-y-4">
          {/* 流程步骤 */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              {selectedFlow === 'DORA' ? 'DORA 四步流程' 
                : selectedFlow === 'RENEW' ? '续租流程' 
                : 'Nak 拒绝流程'}
            </h3>
            <div className="space-y-3">
              {/* 介绍步骤 - 高亮显示 */}
              <motion.div 
                className={`relative p-3 rounded-xl cursor-pointer transition-all ring-2`}
                style={{
                  backgroundColor: currentStep < 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(55, 65, 81, 0.5)',
                  borderColor: currentStep < 0 ? '#3B82F6' : 'rgba(75, 85, 99, 0.5)',
                }}
                onClick={() => handleStep(-1)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div 
                  className={`absolute -left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep < 0 ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div className="ml-4">
                  <div className={`text-sm font-semibold ${currentStep < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                    流程说明
                  </div>
                  <div className="text-xs text-gray-500">查看完整流程介绍</div>
                </div>
                {currentStep < 0 && (
                  <motion.div
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                )}
              </motion.div>

              {steps.map((step, idx) => {
                const isActive = currentStep === idx;
                const isCompleted = currentStep > idx;
                
                return (
                  <motion.div 
                    key={step.id}
                    className={`relative p-3 rounded-xl cursor-pointer transition-all ${isActive ? 'ring-2' : ''}`}
                    style={{
                      backgroundColor: isActive ? `${step.color}20` : isCompleted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(55, 65, 81, 0.5)',
                      borderColor: isActive ? step.color : isCompleted ? '#22c55e' : 'rgba(75, 85, 99, 0.5)',
                    }}
                    onClick={() => handleStep(idx)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* 步骤编号 */}
                    <div 
                      className={`absolute -left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        isActive ? '' : isCompleted ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                      style={isActive ? { backgroundColor: step.color } : {}}
                    >
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    
                    {/* 连接线 */}
                    {idx < steps.length - 1 && (
                      <div 
                        className={`absolute left-2.5 -bottom-3 w-0.5 h-3 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      />
                    )}
                    
                    <div className="ml-4">
                      <div className={`text-sm font-semibold ${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-gray-400'}`}>
                        {step.label}
                      </div>
                      <div className={`text-xs ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                        {step.from === 'client' ? '客户端→' : '服务器→'}
                        {step.to === 'broadcast' ? '广播' : '单播'}
                      </div>
                    </div>

                    {isActive && (
                      <motion.div
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                        style={{ backgroundColor: step.color }}
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* 关键技术要点 */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20 p-4">
            <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              核心技术点
            </h3>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-gray-300">UDP端口：</strong>服务器67，客户端68</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-gray-300">广播通信：</strong>Discover/Request广播，Offer/Ack可单播</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-gray-300">租约机制：</strong>默认1天(86400秒)</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-gray-300">续租时机：</strong>T1=50%租约(12h)，T2=87.5%(21h)</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-gray-300">Nak原因：</strong>IP过期/被占用/服务器拒绝</span>
              </li>
            </ul>
          </div>

          {/* 租约状态机 */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              租约生命周期
            </h3>
            <div className="relative h-8 bg-gray-800 rounded-lg overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1/2 bg-green-500/30" />
              <div className="absolute inset-y-0 left-1/2 w-[37.5%] bg-amber-500/30" />
              <div className="absolute inset-y-0 right-0 w-[12.5%] bg-red-500/30" />
              
              <div className="absolute inset-0 flex items-center justify-between px-3 text-xs text-gray-400">
                <span>0</span>
                <span className="text-green-400">T1</span>
                <span className="text-amber-400">T2</span>
                <span>24h</span>
              </div>
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-green-400">● 正常通信</span>
                <span className="text-gray-500">0-12小时</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400">● T1续租（单播）</span>
                <span className="text-gray-500">12-21小时</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">● T2紧急续租（广播）</span>
                <span className="text-gray-500">21-24小时</span>
              </div>
            </div>
          </div>

          {/* DHCP报文格式 */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              关键字段
            </h3>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex bg-purple-500/20 px-2 py-1 rounded">
                <span className="text-purple-400 w-16">YIADDR</span>
                <span className="text-gray-400">Your IP（分配IP）</span>
              </div>
              <div className="flex bg-cyan-500/20 px-2 py-1 rounded">
                <span className="text-cyan-400 w-16">CIADDR</span>
                <span className="text-gray-400">Client IP（续租IP）</span>
              </div>
              <div className="flex bg-green-500/20 px-2 py-1 rounded">
                <span className="text-green-400 w-16">SIADDR</span>
                <span className="text-gray-400">Next Server IP</span>
              </div>
              <div className="flex bg-amber-500/20 px-2 py-1 rounded">
                <span className="text-amber-400 w-16">CHADDR</span>
                <span className="text-gray-400">Client MAC</span>
              </div>
              <div className="flex bg-pink-500/20 px-2 py-1 rounded">
                <span className="text-pink-400 w-16">Options</span>
                <span className="text-gray-400">53=消息类型</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
