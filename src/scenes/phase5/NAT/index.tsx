import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Monitor, Router, Globe, ArrowRight, ArrowLeft, 
  Zap, Layers, MapPin, CheckCircle, XCircle, Clock,
  Network, RefreshCw, Lock, Unlock, Users, Eye,
  ChevronRight, Play, RotateCcw, Settings2
} from 'lucide-react';

// ==================== 类型定义 ====================
interface NATModeInfo {
  id: 'static' | 'dynamic' | 'pat';
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  mapping: string;
  keyFeature: string;
  useCases: string[];
}

interface Packet {
  id: number;
  srcIP: string;
  srcPort: number;
  dstIP: string;
  dstPort: number;
  originalSrc: string;
  originalDst: string;
  direction: 'out' | 'in';
  status: 'pending' | 'translating' | 'forwarded' | 'returning';
}

interface NATEntry {
  id: number;
  insideIP: string;
  insidePort: number;
  outsideIP: string;
  outsidePort: number;
  protocol: string;
  type: string;
  created: string;
}

// ==================== 常量数据 ====================
const NAT_MODES: NATModeInfo[] = [
  {
    id: 'static',
    name: '静态 NAT',
    icon: <Lock className="w-5 h-5" />,
    color: '#3b82f6',
    description: '私网IP与公网IP一对一固定双向映射，外网可直接访问内网服务器。映射关系永久存在，一对一对应。',
    mapping: '192.168.1.10 ↔ 202.96.128.100\n192.168.1.11 ↔ 202.96.128.101',
    keyFeature: '固定1:1双向映射，IP永久对应',
    useCases: ['企业对外服务', 'Web服务器发布', '邮件服务器', '需要外网主动访问的场景'],
  },
  {
    id: 'dynamic',
    name: '动态 NAT',
    icon: <RefreshCw className="w-5 h-5" />,
    color: '#8b5cf6',
    description: '从公网地址池动态分配映射，连接结束后释放IP回池。同一内网IP每次可能映射到不同公网IP，池满时需等待。',
    mapping: '池: 202.96.128.100-105\n192.168.1.x → 池中可用IP',
    keyFeature: '按需分配，连接结束释放回池',
    useCases: ['员工上网', '企业办公网络', '一般互联网访问'],
  },
  {
    id: 'pat',
    name: 'PAT/NAPT',
    icon: <Users className="w-5 h-5" />,
    color: '#22c55e',
    description: '端口地址转换（Port Address Translation），多个私网IP/端口共享一个公网IP，通过不同端口号区分不同会话。',
    mapping: '192.168.1.100:12345 → 202.96.128.86:12345\n192.168.1.101:54321 → 202.96.128.86:54321',
    keyFeature: '多:1复用，节约公网IP（常用）',
    useCases: ['家庭网络（光猫）', '中小企业', '运营商级NAT（CGN）'],
  },
];

const PRIVATE_IP_RANGES = [
  { range: '10.0.0.0/8', usable: '约1600万', desc: '大型企业内网' },
  { range: '172.16.0.0/12', usable: '约100万', desc: '中型网络' },
  { range: '192.168.0.0/16', usable: '约6.5万', desc: '家庭/小型办公室' },
];

// 场景数据
const sceneData = {
  id: 'nat',
  title: 'NAT地址转换详解',
  description: '深入理解NAT：静态NAT、动态NAT、PAT三种模式的工作原理、可视化对比和实际应用场景',
  phase: 5 as const,
  category: '网络基础',
  difficulty: 'medium' as const,
  duration: '10-15分钟',
  isHot: true,
};

// ==================== 组件 ====================

// 数据包组件
const PacketBox = ({ 
  packet, 
  position,
  phase 
}: { 
  packet: Packet; 
  position: 'inside' | 'nat' | 'outside';
  phase: string;
}) => {
  const isOutbound = packet.direction === 'out';
  const isActive = phase.includes(position) || phase === 'all';
  
  return (
    <motion.div
      className={`absolute px-3 py-2 rounded-lg shadow-lg text-xs font-mono z-20 ${
        isOutbound ? 'bg-blue-500/90 border border-blue-400' : 'bg-green-500/90 border border-green-400'
      }`}
      style={{
        left: position === 'inside' ? '60px' : position === 'nat' ? '50%' : 'auto',
        right: position === 'outside' ? '60px' : 'auto',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
      initial={{ opacity: 0, x: isOutbound ? -50 : 50 }}
      animate={{ 
        opacity: isActive ? 1 : 0,
        x: 0,
      }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-white font-bold">
        {isOutbound ? 'SRC' : 'DST'}: {packet.srcIP}:{packet.srcPort}
      </div>
      <div className="text-white/80">
        {isOutbound ? 'DST' : 'SRC'}: {packet.dstIP}:{packet.dstPort}
      </div>
      {packet.status === 'translating' && (
        <div className="text-yellow-300 text-[10px] mt-1">⚡ NAT转换中...</div>
      )}
    </motion.div>
  );
};

// ==================== 主组件 ====================
export default function NATScene() {
  const [selectedMode, setSelectedMode] = useState<'static' | 'dynamic' | 'pat'>('pat');
  const [showNATTable, setShowNATTable] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [natEntries, setNatEntries] = useState<NATEntry[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'complete'>('idle');
  const [highlightArea, setHighlightArea] = useState<'inside' | 'nat' | 'outside' | 'all'>('all');
  const [packetLog, setPacketLog] = useState<string[]>([]);
  const [activeInternalHost, setActiveInternalHost] = useState<number>(0);
  
  const currentMode = NAT_MODES.find(m => m.id === selectedMode)!;

  // 执行NAT演示
  const runDemo = useCallback(() => {
    if (currentPhase !== 'idle') return;
    
    setNatEntries([]);
    setPacketLog([]);
    
    // 根据模式生成不同的演示
    const steps = [
      { phase: 'step1' as const, area: 'inside' as const, log: '① 内网主机发起请求' },
      { phase: 'step2' as const, area: 'nat' as const, log: '② NAT网关接收数据包' },
      { phase: 'step3' as const, area: 'nat' as const, log: `③ 地址转换: 源IP ${getSrcIP(selectedMode, activeInternalHost)} → ${getMappedIP(selectedMode, activeInternalHost)}` },
      { phase: 'step4' as const, area: 'outside' as const, log: '④ 数据包发送到公网服务器' },
      { phase: 'step5' as const, area: 'all' as const, log: '⑤ 服务器响应返回' },
      { phase: 'complete' as const, area: 'all' as const, log: '✅ 完整的请求-响应周期完成' },
    ];

    // 添加NAT表项
    const newEntry: NATEntry = {
      id: 1,
      insideIP: getInsideIP(selectedMode, activeInternalHost),
      insidePort: 12345 + activeInternalHost * 1000,
      outsideIP: getMappedIP(selectedMode, activeInternalHost),
      outsidePort: selectedMode === 'pat' ? 12345 + activeInternalHost * 1000 : 80,
      protocol: 'TCP',
      type: selectedMode === 'static' ? 'Static' : selectedMode === 'dynamic' ? 'Dynamic' : 'PAT',
      created: new Date().toLocaleTimeString(),
    };

    let delay = 0;
    steps.forEach((step, i) => {
      setTimeout(() => {
        setCurrentPhase(step.phase);
        setHighlightArea(step.area);
        setPacketLog(prev => [...prev, step.log]);
        if (step.phase === 'step3') {
          setNatEntries([newEntry]);
        }
      }, delay);
      delay += 1200;
    });

    setTimeout(() => {
      setCurrentPhase('idle');
      setHighlightArea('all');
    }, delay + 1000);
  }, [currentPhase, selectedMode, activeInternalHost]);

  // 重置
  const handleReset = useCallback(() => {
    setCurrentPhase('idle');
    setHighlightArea('all');
    setNatEntries([]);
    setPacketLog([]);
  }, []);

  // 根据模式获取内部IP
  const getInsideIP = (mode: string, host: number) => {
    const hosts = ['192.168.1.100', '192.168.1.101', '192.168.1.102'];
    return hosts[host] || hosts[0];
  };

  // 根据模式获取映射后的IP
  const getMappedIP = (mode: string, host: number) => {
    if (mode === 'static') {
      return `202.96.128.${100 + host}`;
    } else if (mode === 'dynamic') {
      return `202.96.128.${100 + (host % 6)}`;
    } else {
      return '202.96.128.86';
    }
  };

  // 获取内部主机列表（用于演示）
  const internalHosts = [
    { ip: '192.168.1.100', label: 'PC-1', port: 12345 },
    { ip: '192.168.1.101', label: 'PC-2', port: 23456 },
    { ip: '192.168.1.102', label: 'Server', port: 34567 },
  ];

  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="grid grid-cols-12 gap-4 h-full p-4 overflow-auto">
        
        {/* 左侧：NAT模式选择 */}
        <div className="col-span-3 space-y-3">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              NAT模式
            </h3>
            <div className="space-y-2">
              {NAT_MODES.map(mode => (
                <motion.button
                  key={mode.id}
                  onClick={() => {
                    setSelectedMode(mode.id);
                    handleReset();
                  }}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    selectedMode === mode.id ? 'border-opacity-100' : 'border-opacity-30 hover:border-opacity-50'
                  }`}
                  style={{ 
                    backgroundColor: selectedMode === mode.id ? mode.color + '15' : '#1e293b',
                    borderColor: mode.color + (selectedMode === mode.id ? '' : '50'),
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: mode.color }}>{mode.icon}</span>
                    <span className="font-medium text-sm" style={{ color: mode.color }}>{mode.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{mode.keyFeature}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 当前模式详情 */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ color: currentMode.color }}>{currentMode.icon}</div>
              <span className="font-medium text-sm" style={{ color: currentMode.color }}>{currentMode.name}</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">{currentMode.description}</p>
            
            <div className="bg-slate-900/50 rounded-lg p-2 mb-3">
              <div className="text-[10px] text-slate-500 mb-1">地址映射规则</div>
              <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap">{currentMode.mapping}</pre>
            </div>

            <div className="text-[10px] text-slate-500 mb-2">适用场景</div>
            <div className="flex flex-wrap gap-1">
              {currentMode.useCases.map((uc, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300">
                  {uc}
                </span>
              ))}
            </div>
          </div>

          {/* 私有地址段 */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
            <div className="text-[10px] text-slate-500 mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              RFC 1918 私有地址
            </div>
            {PRIVATE_IP_RANGES.map((r, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-slate-700/50 last:border-0">
                <span className="text-xs font-mono text-blue-400">{r.range}</span>
                <span className="text-[10px] text-slate-500">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 中间：网络拓扑可视化 */}
        <div className="col-span-6 space-y-4">
          
          {/* 控制面板 */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">NAT工作原理演示</span>
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={runDemo}
                  disabled={currentPhase !== 'idle'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                    currentPhase !== 'idle' 
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  }`}
                  whileHover={currentPhase === 'idle' ? { scale: 1.05 } : {}}
                  whileTap={currentPhase === 'idle' ? { scale: 0.95 } : {}}
                >
                  <Play className="w-4 h-4" />
                  开始演示
                </motion.button>
                <motion.button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                  whileHover={{ scale: 1.05 }}
                >
                  <RotateCcw className="w-4 h-4" />
                  重置
                </motion.button>
              </div>
            </div>

            {/* 选择演示的内网主机 */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-400">选择内网主机:</span>
              <div className="flex gap-1">
                {internalHosts.map((host, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveInternalHost(i)}
                    className={`px-3 py-1 rounded text-xs transition-all ${
                      activeInternalHost === i 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {host.label}
                    <span className="ml-1 text-[10px] opacity-70">{host.ip.split('.').pop()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 网络拓扑图 */}
          <div className="relative h-[320px] bg-gradient-to-r from-blue-900/20 via-slate-900 to-green-900/20 rounded-xl border border-slate-700 overflow-hidden">
            
            {/* 区域标注 */}
            <div className={`absolute top-2 left-3 text-xs font-medium transition-all ${
              highlightArea === 'inside' ? 'text-blue-400 scale-110' : 'text-blue-400/50'
            }`}>
              私有网络 (192.168.1.0/24)
            </div>
            <div className={`absolute top-2 right-3 text-xs font-medium transition-all ${
              highlightArea === 'outside' ? 'text-green-400 scale-110' : 'text-green-400/50'
            }`}>
              公网 Internet
            </div>

            {/* 分界线 */}
            <div className={`absolute top-0 bottom-0 w-0.5 transition-all ${
              highlightArea === 'nat' ? 'bg-purple-500 scale-x-150' : 'bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-green-500/50'
            }`} style={{ left: '35%' }} />

            {/* 内网主机区域 */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 space-y-3">
              {internalHosts.map((host, i) => (
                <motion.div
                  key={i}
                  className={`w-28 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    activeInternalHost === i 
                      ? 'bg-blue-500/20 border-blue-500' 
                      : currentPhase !== 'idle' && activeInternalHost === i
                        ? 'bg-blue-500/10 border-blue-400'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                  onClick={() => setActiveInternalHost(i)}
                  animate={currentPhase === 'step1' && activeInternalHost === i ? { scale: [1, 1.05, 1] } : {}}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2">
                    <Monitor className={`w-5 h-5 ${activeInternalHost === i ? 'text-blue-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs text-white">{host.label}</div>
                      <div className="text-[10px] text-blue-400 font-mono">{host.ip}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* NAT网关 */}
            <motion.div
              className={`absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all ${
                highlightArea === 'nat' ? 'scale-110' : ''
              }`}
              style={{ left: '35%', transform: 'translate(-50%, -50%)' }}
            >
              <motion.div
                className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 transition-all ${
                  currentPhase === 'step2' || currentPhase === 'step3'
                    ? 'bg-purple-500/30 border-purple-500 shadow-lg shadow-purple-500/30'
                    : 'bg-slate-800/70 border-slate-600'
                }`}
                animate={currentPhase === 'step3' ? { scale: [1, 1.05, 1], boxShadow: ['0 0 0 rgba(168,85,247,0)', '0 0 20px rgba(168,85,247,0.5)', '0 0 0 rgba(168,85,247,0)'] } : {}}
                style={{ left: '35%' }}
              >
                <Router className={`w-10 h-10 ${currentPhase === 'step2' || currentPhase === 'step3' ? 'text-purple-400' : 'text-slate-500'}`} />
                <div className="text-[10px] text-purple-300 font-bold mt-1">NAT网关</div>
              </motion.div>
              
              {/* 公网IP标注 */}
              <div className="mt-2 text-center">
                <div className="text-xs font-mono text-green-400">公网IP:</div>
                <div className="text-sm font-mono text-green-400 font-bold">202.96.128.86</div>
              </div>
            </motion.div>

            {/* 公网服务器 */}
            <motion.div
              className={`absolute right-4 top-1/2 -translate-y-1/2 w-28 p-3 rounded-xl border-2 transition-all ${
                currentPhase === 'step4' || currentPhase === 'step5'
                  ? 'bg-green-500/20 border-green-500'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
              animate={currentPhase === 'step4' ? { scale: [1, 1.05, 1] } : {}}
              style={{ right: '20px' }}
            >
              <div className="flex items-center gap-2">
                <Globe className={`w-5 h-5 ${currentPhase === 'step4' ? 'text-green-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs text-white">公网服务器</div>
                  <div className="text-[10px] text-green-400 font-mono">8.8.8.8:443</div>
                </div>
              </div>
            </motion.div>

            {/* 出站数据包动画 */}
            <AnimatePresence>
              {(currentPhase === 'step1' || currentPhase === 'step2') && (
                <motion.div
                  className="absolute px-3 py-2 bg-blue-500 rounded-lg shadow-lg z-30"
                  initial={{ left: '130px', top: '50%', opacity: 0 }}
                  animate={{ left: 'calc(35% - 60px)', top: '50%', opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="text-xs font-mono text-white">
                    SRC: {getInsideIP(selectedMode, activeInternalHost)}:{12345 + activeInternalHost * 1000}
                  </div>
                  <div className="text-[10px] text-blue-200">待转换</div>
                </motion.div>
              )}
              
              {currentPhase === 'step3' && (
                <motion.div
                  className="absolute px-3 py-2 bg-purple-500 rounded-lg shadow-lg z-30"
                  initial={{ left: '130px', top: '50%', opacity: 0 }}
                  animate={{ left: 'calc(35% - 60px)', top: '50%', opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-xs font-mono text-white">
                    ⚡ SRC: {getMappedIP(selectedMode, activeInternalHost)}:{selectedMode === 'pat' ? 12345 + activeInternalHost * 1000 : 80}
                  </div>
                  <div className="text-[10px] text-purple-200">已转换!</div>
                </motion.div>
              )}
              
              {currentPhase === 'step4' && (
                <motion.div
                  className="absolute px-3 py-2 bg-green-500 rounded-lg shadow-lg z-30"
                  initial={{ left: 'calc(35% + 30px)', top: '50%', opacity: 0 }}
                  animate={{ left: 'calc(100% - 180px)', top: '50%', opacity: 1 }}
                  transition={{ duration: 1 }}
                >
                  <div className="text-xs font-mono text-white">
                    SRC: {getMappedIP(selectedMode, activeInternalHost)}
                  </div>
                  <div className="text-[10px] text-green-200">转发中...</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 流量方向 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-6 text-xs">
              <div className="flex items-center gap-1 text-blue-400">
                <ArrowRight className="w-4 h-4" />
                <span>出站流量</span>
              </div>
              <div className="flex items-center gap-1 text-green-400">
                <ArrowLeft className="w-4 h-4" />
                <span>入站流量</span>
              </div>
            </div>
          </div>

          {/* 当前操作说明 */}
          <AnimatePresence mode="wait">
            {packetLog.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-slate-800/50 rounded-xl border border-slate-700 p-3"
              >
                <div className="text-xs text-slate-500 mb-2">操作日志</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {packetLog.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`text-xs font-mono ${
                        log.includes('✅') ? 'text-green-400' :
                        log.includes('⚡') ? 'text-purple-400' :
                        log.includes('①') ? 'text-blue-400' :
                        log.includes('②') ? 'text-blue-300' :
                        log.includes('③') ? 'text-purple-300' :
                        log.includes('④') ? 'text-green-300' :
                        log.includes('⑤') ? 'text-green-400' :
                        'text-slate-400'
                      }`}
                    >
                      {log}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 模式对比说明 */}
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              三种NAT模式对比
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {NAT_MODES.map((mode, i) => (
                <div key={i} className="p-2 rounded-lg" style={{ backgroundColor: mode.color + '10', border: `1px solid ${mode.color}30` }}>
                  <div className="font-medium mb-1" style={{ color: mode.color }}>{mode.name}</div>
                  <div className="text-slate-400 text-[10px] space-y-0.5">
                    <div>• {mode.keyFeature}</div>
                    <div>• {mode.useCases[0]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：NAT表和技术要点 */}
        <div className="col-span-3 space-y-4">
          
          {/* NAT转换表 */}
          {showNATTable && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Network className="w-4 h-4 text-slate-400" />
                  NAT转换表
                </h3>
                <span className="text-xs text-slate-500">{natEntries.length} 条</span>
              </div>
              {natEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  点击"开始演示"查看NAT表项
                </div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto">
                  <table className="w-full text-[10px]">
                    <thead className="bg-slate-900/50 sticky top-0">
                      <tr className="text-slate-500">
                        <th className="px-2 py-1.5 text-left">内网地址</th>
                        <th className="px-2 py-1.5 text-left">转换地址</th>
                        <th className="px-2 py-1.5 text-left">类型</th>
                      </tr>
                    </thead>
                    <tbody>
                      {natEntries.map((entry, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, backgroundColor: 'rgba(168,85,247,0.2)' }}
                          animate={{ opacity: 1, backgroundColor: 'transparent' }}
                          className="border-t border-slate-700/50"
                        >
                          <td className="px-2 py-1.5">
                            <div className="font-mono text-blue-400">{entry.insideIP}</div>
                            <div className="text-slate-500">:{entry.insidePort}</div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1">
                              <ArrowRight className="w-2 h-2 text-purple-400" />
                              <span className="font-mono text-purple-400">{entry.outsideIP}</span>
                            </div>
                            <div className="text-slate-500">:{entry.outsidePort}</div>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded ${
                              entry.type === 'Static' ? 'bg-blue-500/30 text-blue-300' :
                              entry.type === 'Dynamic' ? 'bg-purple-500/30 text-purple-300' :
                              'bg-green-500/30 text-green-300'
                            }`}>
                              {entry.type}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 技术要点 */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 p-4">
            <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              技术要点
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                <span><b className="text-slate-300">NAT表</b>：维护内网IP/端口与公网IP/端口的映射关系</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                <span><b className="text-slate-300">超时机制</b>：NAT表项在连接结束后自动老化删除</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                <span><b className="text-slate-300">PAT端口复用</b>：不同内网主机的不同端口映射到同一公网IP的不同端口</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span><b className="text-slate-300">NAT穿透</b>：STUN/TURN/ICE用于P2P应用和VoIP</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span><b className="text-slate-300">对称NAT</b>：每个会话映射到不同的外部IP/端口对，穿透最难</span>
              </li>
            </ul>
          </div>

          {/* PAT端口转换详解 */}
          {selectedMode === 'pat' && (
            <div className="bg-green-500/10 rounded-xl border border-green-500/20 p-4">
              <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                PAT端口转换原理
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-slate-800/50 rounded">
                  <div className="text-green-400 mb-1">内网主机1发起请求:</div>
                  <div className="font-mono text-slate-300">
                    192.168.1.100:12345 → 202.96.128.86:12345
                  </div>
                </div>
                <div className="p-2 bg-slate-800/50 rounded">
                  <div className="text-green-400 mb-1">内网主机2发起请求:</div>
                  <div className="font-mono text-slate-300">
                    192.168.1.101:54321 → 202.96.128.86:54321
                  </div>
                </div>
                <div className="p-2 bg-slate-800/50 rounded">
                  <div className="text-green-400 mb-1">内网主机3发起请求:</div>
                  <div className="font-mono text-slate-300">
                    192.168.1.102:34567 → 202.96.128.86:34567
                  </div>
                </div>
                <div className="text-slate-500 text-[10px] mt-2">
                  多个内网主机共享一个公网IP，通过不同的源端口号区分各自主机
                </div>
              </div>
            </div>
          )}

          {/* 静态NAT详解 */}
          {selectedMode === 'static' && (
            <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-4">
              <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                静态NAT特点
              </h3>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                  <span>固定1:1映射，永远不变</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                  <span>外网可直接访问映射后的公网IP</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                  <span>适合将内网服务器发布到外网</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-3 h-3 text-red-400 mt-0.5" />
                  <span>需要等量的公网IP地址</span>
                </div>
              </div>
            </div>
          )}

          {/* 动态NAT详解 */}
          {selectedMode === 'dynamic' && (
            <div className="bg-purple-500/10 rounded-xl border border-purple-500/20 p-4">
              <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                动态NAT特点
              </h3>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                  <span>地址池按需分配，连接结束释放</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                  <span>同一内网IP可能映射到不同公网IP</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                  <span>地址池可复用，比静态NAT节约</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-3 h-3 text-red-400 mt-0.5" />
                  <span>外网无法主动访问内网（IP不固定）</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SceneLayout>
  );
}
