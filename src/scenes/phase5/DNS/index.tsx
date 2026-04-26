import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { InfoPanel } from '../../../components/InfoPanel';
import { 
  Globe, Server, Database, Monitor, 
  ArrowDown, ArrowRight, RefreshCw, 
  Layers, Clock, CheckCircle, XCircle,
  ChevronRight, Hash, Network
} from 'lucide-react';

// DNS服务器配置
const DNS_SERVERS = [
  { id: 'client', name: '浏览器', ip: '192.168.1.100', type: 'client', x: 80, y: 280, color: '#3b82f6', icon: Monitor },
  { id: 'local', name: '本地DNS\n(递归解析器)', ip: '8.8.8.8', type: 'recursive', x: 220, y: 280, color: '#8b5cf6', icon: Server },
  { id: 'root', name: '根DNS\n(.)', ip: '198.41.0.4', type: 'root', x: 400, y: 80, color: '#f59e0b', icon: Globe },
  { id: 'tld', name: '顶级域DNS\n(.com)', ip: '192.5.6.30', type: 'tld', x: 400, y: 200, color: '#06b6d4', icon: Globe },
  { id: 'auth', name: '权威DNS\n(example.com)', ip: '93.184.216.34', type: 'authority', x: 400, y: 320, color: '#22c55e', icon: Database },
];

// 递归查询步骤
const RECURSIVE_STEPS = [
  { id: 'r1', label: '发起查询', desc: '浏览器向本地DNS发送查询请求：查询 www.example.com 的IP地址', icon: Monitor, color: '#3b82f6' },
  { id: 'r2', label: '检查缓存', desc: '本地DNS检查缓存，若命中则直接返回结果', icon: Database, color: '#8b5cf6' },
  { id: 'r3', label: '查询根DNS', desc: '本地DNS向根DNS(. )发送迭代查询请求', icon: Globe, color: '#f59e0b' },
  { id: 'r4', label: '返回TLD地址', desc: '根DNS返回：.com TLD服务器的IP地址列表', icon: Globe, color: '#f59e0b' },
  { id: 'r5', label: '查询TLD DNS', desc: '本地DNS向.com TLD服务器发送查询请求', icon: Globe, color: '#06b6d4' },
  { id: 'r6', label: '返回权威地址', desc: 'TLD返回：example.com权威DNS的IP地址', icon: Globe, color: '#06b6d4' },
  { id: 'r7', label: '查询权威DNS', desc: '本地DNS向权威DNS发送查询请求', icon: Database, color: '#22c55e' },
  { id: 'r8', label: '返回结果', desc: '权威DNS返回：93.184.216.34', icon: Database, color: '#22c55e' },
  { id: 'r9', label: '缓存结果', desc: '本地DNS缓存结果(TTL=3600s)，并返回给浏览器', icon: Server, color: '#8b5cf6' },
];

// 迭代查询步骤
const ITERATIVE_STEPS = [
  { id: 'i1', label: '发起查询', desc: 'DNS解析器向根DNS发送查询：www.example.com', icon: Monitor, color: '#3b82f6' },
  { id: 'i2', label: '根DNS响应', desc: '根DNS返回：我不认识这个域名，但告诉你.com的TLD服务器地址', icon: Globe, color: '#f59e0b' },
  { id: 'i3', label: '查询TLD', desc: '解析器向TLD服务器发送查询请求', icon: Globe, color: '#06b6d4' },
  { id: 'i4', label: 'TLD响应', desc: 'TLD返回：example.com的权威DNS服务器地址', icon: Globe, color: '#06b6d4' },
  { id: 'i5', label: '查询权威DNS', desc: '解析器向权威DNS发送最终查询请求', icon: Database, color: '#22c55e' },
  { id: 'i6', label: '权威DNS响应', desc: '权威DNS返回最终IP：93.184.216.34', icon: Database, color: '#22c55e' },
  { id: 'i7', label: '查询完成', desc: '所有查询由发起者自己完成，每步都返回"下一个该问谁"', icon: Server, color: '#8b5cf6' },
];

// 数据包动画 - 增强版
interface Packet {
  id: string;
  from: string;
  to: string;
  label: string;
  color: string;
  delay: number;
  type: 'query' | 'response' | 'cache-hit';
  direction: 'forward' | 'backward';
}

const RECURSIVE_PACKETS: Packet[] = [
  // 客户端到本地DNS
  { id: 'p1', from: 'client', to: 'local', label: '递归查询: www.example.com', color: '#3b82f6', delay: 0, type: 'query', direction: 'forward' },
  
  // 本地DNS到根DNS
  { id: 'p2', from: 'local', to: 'root', label: '迭代查询: .', color: '#f59e0b', delay: 400, type: 'query', direction: 'forward' },
  { id: 'p3', from: 'root', to: 'local', label: '返回: .com TLD地址', color: '#f59e0b', delay: 800, type: 'response', direction: 'backward' },
  
  // 本地DNS到TLD DNS
  { id: 'p4', from: 'local', to: 'tld', label: '迭代查询: .com', color: '#06b6d4', delay: 1200, type: 'query', direction: 'forward' },
  { id: 'p5', from: 'tld', to: 'local', label: '返回: example.com权威', color: '#06b6d4', delay: 1600, type: 'response', direction: 'backward' },
  
  // 本地DNS到权威DNS
  { id: 'p6', from: 'local', to: 'auth', label: '迭代查询: example.com', color: '#22c55e', delay: 2000, type: 'query', direction: 'forward' },
  { id: 'p7', from: 'auth', to: 'local', label: '返回: 93.184.216.34', color: '#22c55e', delay: 2400, type: 'response', direction: 'backward' },
  
  // 本地DNS返回给客户端
  { id: 'p8', from: 'local', to: 'client', label: '递归响应: 93.184.216.34', color: '#8b5cf6', delay: 2800, type: 'response', direction: 'backward' },
  
  // 缓存命中（可选）
  { id: 'p9', from: 'local', to: 'client', label: '缓存命中: 93.184.216.34', color: '#10b981', delay: 3200, type: 'cache-hit', direction: 'backward' },
];

const ITERATIVE_PACKETS: Packet[] = [
  // 客户端到根DNS
  { id: 'p1', from: 'client', to: 'root', label: '迭代查询: www.example.com', color: '#3b82f6', delay: 0, type: 'query', direction: 'forward' },
  { id: 'p2', from: 'root', to: 'client', label: '返回: .com TLD地址', color: '#f59e0b', delay: 400, type: 'response', direction: 'backward' },
  
  // 客户端到TLD DNS
  { id: 'p3', from: 'client', to: 'tld', label: '迭代查询: www.example.com', color: '#06b6d4', delay: 800, type: 'query', direction: 'forward' },
  { id: 'p4', from: 'tld', to: 'client', label: '返回: example.com权威', color: '#06b6d4', delay: 1200, type: 'response', direction: 'backward' },
  
  // 客户端到权威DNS
  { id: 'p5', from: 'client', to: 'auth', label: '迭代查询: www.example.com', color: '#22c55e', delay: 1600, type: 'query', direction: 'forward' },
  { id: 'p6', from: 'auth', to: 'client', label: '返回: 93.184.216.34', color: '#22c55e', delay: 2000, type: 'response', direction: 'backward' },
  
  // 客户端缓存（可选）
  { id: 'p7', from: 'client', to: 'auth', label: '缓存查询: www.example.com', color: '#10b981', delay: 2400, type: 'cache-hit', direction: 'forward' },
];

export default function DNSScene() {
  const [queryMode, setQueryMode] = useState<'recursive' | 'iterative'>('recursive');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePackets, setActivePackets] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [cacheHits, setCacheHits] = useState<string[]>([]);
  const [showCompletePath, setShowCompletePath] = useState(false);

  const steps = queryMode === 'recursive' ? RECURSIVE_STEPS : ITERATIVE_STEPS;
  const packets = queryMode === 'recursive' ? RECURSIVE_PACKETS : ITERATIVE_PACKETS;

  // 获取服务器位置
  const getServerPos = (id: string) => DNS_SERVERS.find(s => s.id === id)!;

  // 动画控制 - 增强版：支持多个数据包同时显示
  useEffect(() => {
    if (isPlaying && currentStep < steps.length) {
      // 当前步骤对应的所有数据包（可能是多个）
      const currentStepPackets = packets.filter(p => {
        // 根据步骤计算对应的数据包
        if (queryMode === 'recursive') {
          if (currentStep === 0) return p.id === 'p1'; // 客户端到本地DNS
          if (currentStep === 1) return p.id === 'p2' || p.id === 'p3'; // 本地到根DNS+返回
          if (currentStep === 2) return p.id === 'p4' || p.id === 'p5'; // 本地到TLD+返回
          if (currentStep === 3) return p.id === 'p6' || p.id === 'p7'; // 本地到权威+返回
          if (currentStep === 4) return p.id === 'p8'; // 本地返回给客户端
          if (currentStep === 5) return p.id === 'p9'; // 缓存命中
        } else {
          if (currentStep === 0) return p.id === 'p1' || p.id === 'p2'; // 客户端到根DNS+返回
          if (currentStep === 1) return p.id === 'p3' || p.id === 'p4'; // 客户端到TLD+返回
          if (currentStep === 2) return p.id === 'p5' || p.id === 'p6'; // 客户端到权威+返回
          if (currentStep === 3) return p.id === 'p7'; // 缓存查询
        }
        return false;
      });
      
      // 设置活跃数据包
      setActivePackets(currentStepPackets.map(p => p.id));
      
      // 延迟后清除活跃数据包并进入下一步
      const timer = setTimeout(() => {
        setActivePackets([]);
        if (currentStep === steps.length - 1) {
          setResult('93.184.216.34');
          if (queryMode === 'recursive') {
            setCacheHits(prev => [...prev, 'local']);
          } else {
            setCacheHits(prev => [...prev, 'client']);
          }
          // 显示完整路径
          setShowCompletePath(true);
        } else if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentStep, steps.length, packets, queryMode]);

  // 获取完整查询路径（显示所有数据包轨迹）
  const getCompletePath = () => {
    if (queryMode === 'recursive') {
      return [
        { from: 'client', to: 'local', color: '#3b82f6' },
        { from: 'local', to: 'root', color: '#f59e0b' },
        { from: 'root', to: 'local', color: '#f59e0b' },
        { from: 'local', to: 'tld', color: '#06b6d4' },
        { from: 'tld', to: 'local', color: '#06b6d4' },
        { from: 'local', to: 'auth', color: '#22c55e' },
        { from: 'auth', to: 'local', color: '#22c55e' },
        { from: 'local', to: 'client', color: '#8b5cf6' },
      ];
    } else {
      return [
        { from: 'client', to: 'root', color: '#3b82f6' },
        { from: 'root', to: 'client', color: '#f59e0b' },
        { from: 'client', to: 'tld', color: '#06b6d4' },
        { from: 'tld', to: 'client', color: '#06b6d4' },
        { from: 'client', to: 'auth', color: '#22c55e' },
        { from: 'auth', to: 'client', color: '#22c55e' },
      ];
    }
  };

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setActivePackets([]);
    setResult(null);
    setCacheHits([]);
    setShowCompletePath(false);
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
    setIsPlaying(false);
    setActivePackets([]);
    if (step === steps.length - 1) {
      setResult('93.184.216.34');
      setShowCompletePath(true);
    } else {
      setResult(null);
      setShowCompletePath(false);
    }
  }, [steps.length]);

  // Scene 数据
  const sceneData = {
    id: 'dns',
    title: 'DNS递归与迭代解析',
    description: 'DNS域名系统递归查询与迭代查询完整流程可视化，理解根DNS、TLD、权威DNS的层级关系',
    phase: 5 as const,
    category: '基础协议',
    duration: '6-8分钟',
    difficulty: 'medium' as const,
    isHot: true,
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false} noHeightLimit={true}>
      <div className="grid grid-cols-12 gap-4 h-full overflow-hidden p-4">
        {/* 左侧：模式切换和知识点 */}
        <div className="col-span-3 space-y-3">
          {/* 查询模式切换 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              查询模式
            </h3>
            <div className="space-y-2">
              {[
                { id: 'recursive' as const, label: '递归查询', desc: 'DNS服务器代为完成全部查询，客户端只收最终结果', icon: RefreshCw, color: '#8b5cf6' },
                { id: 'iterative' as const, label: '迭代查询', desc: '每步返回"下一个该问谁"，由查询发起者自行继续', icon: ChevronRight, color: '#06b6d4' },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => { setQueryMode(mode.id); handleReset(); }}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    queryMode === mode.id 
                      ? 'bg-slate-700 border-slate-600' 
                      : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <mode.icon className="w-4 h-4" style={{ color: mode.color }} />
                    <span className="text-sm font-medium" style={{ color: queryMode === mode.id ? mode.color : '#94a3b8' }}>
                      {mode.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{mode.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 域名结构 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              域名层级结构
            </h3>
            <div className="bg-slate-900 rounded p-2 space-y-1">
              {[
                { label: '根域', value: '.', color: '#f59e0b' },
                { label: '顶级域(TLD)', value: '.com .cn .net', color: '#06b6d4' },
                { label: '二级域(SLD)', value: 'example', color: '#22c55e' },
                { label: '子域', value: 'www mail', color: '#3b82f6' },
              ].map((level, i) => (
                <div key={level.label} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: level.color }} />
                  <span className="text-slate-400 w-20">{level.label}:</span>
                  <span className="font-mono" style={{ color: level.color }}>{level.value}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-500">完整域名: </span>
                <span className="font-mono text-cyan-400 text-xs">www.example.com.</span>
              </div>
            </div>
          </div>

          {/* DNS记录类型 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">常见DNS记录</h3>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { type: 'A', desc: 'IPv4地址', color: '#3b82f6' },
                { type: 'AAAA', desc: 'IPv6地址', color: '#06b6d4' },
                { type: 'CNAME', desc: '别名', color: '#8b5cf6' },
                { type: 'MX', desc: '邮件交换', color: '#f59e0b' },
                { type: 'NS', desc: '域名服务器', color: '#22c55e' },
                { type: 'TXT', desc: '文本记录', color: '#64748b' },
              ].map(r => (
                <div key={r.type} className="flex items-center gap-1 p-1.5 bg-slate-900 rounded">
                  <span className="font-mono font-bold text-xs" style={{ color: r.color }}>{r.type}</span>
                  <span className="text-slate-500">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中间：DNS拓扑图 */}
        <div className="col-span-6">
          <div className="bg-slate-900/80 rounded-lg border border-slate-700 p-4 h-[420px] relative">
            {/* 查询域名和结果 */}
            <div className="absolute top-3 left-4 flex items-center gap-4">
              <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
                <span className="text-xs text-slate-500">查询: </span>
                <span className="font-mono text-cyan-400 text-sm">www.example.com</span>
              </div>
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-500/20 px-3 py-1.5 rounded border border-emerald-500/50"
                  >
                    <span className="text-xs text-emerald-400">结果: </span>
                    <span className="font-mono text-emerald-400 font-bold">{result}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 额外的动画控制 */}
            <div className="absolute top-3 right-4 flex items-center gap-4">
              {/* TTL */}
              <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700 flex items-center gap-2">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-400">TTL: </span>
                <span className="text-xs text-emerald-400">3600s</span>
              </div>
              
              {/* 缓存命中按钮 */}
              <button
                onClick={() => {
                  if (queryMode === 'recursive') {
                    setCacheHits(['local']);
                  } else {
                    setCacheHits(['client']);
                  }
                  // 触发缓存命中动画
                  const cachePacket = packets.find(p => p.type === 'cache-hit');
                  if (cachePacket) {
                    setActivePackets([cachePacket.id]);
                    setTimeout(() => setActivePackets([]), 600);
                  }
                }}
                className="bg-purple-500/20 px-3 py-1.5 rounded border border-purple-500/50 hover:bg-purple-500/30 transition-colors"
              >
                <span className="text-xs text-purple-400">模拟缓存命中</span>
              </button>
              
              {/* 显示完整路径 */}
              <button
                onClick={() => setShowCompletePath(!showCompletePath)}
                className="bg-indigo-500/20 px-3 py-1.5 rounded border border-indigo-500/50 hover:bg-indigo-500/30 transition-colors"
              >
                <span className="text-xs text-indigo-400">
                  {showCompletePath ? '隐藏路径' : '显示完整路径'}
                </span>
              </button>
            </div>

            <svg className="w-full h-full" viewBox="0 0 500 380">
              {/* 连接线和区域背景 */}
              {/* 客户端到本地DNS */}
              <motion.line
                x1="120" y1="300" x2="180" y2="300"
                stroke={queryMode === 'recursive' ? '#3b82f6' : '#334155'}
                strokeWidth={queryMode === 'recursive' ? 2 : 0.5}
                strokeDasharray={queryMode === 'recursive' ? "none" : "5,5"}
              />
              
              {/* 本地DNS到各服务器 - 递归模式 */}
              {queryMode === 'recursive' && (
                <>
                  <motion.line
                    x1="260" y1="290" x2="360" y2="120"
                    stroke={activePackets.length > 0 ? '#f59e0b' : '#334155'}
                    strokeWidth={activePackets.length > 0 ? 3 : 1.5}
                    strokeDasharray="5,5"
                  />
                  <motion.line
                    x1="260" y1="295" x2="360" y2="200"
                    stroke={activePackets.length > 0 ? '#06b6d4' : '#334155'}
                    strokeWidth={activePackets.length > 0 ? 3 : 1.5}
                    strokeDasharray="5,5"
                  />
                  <motion.line
                    x1="260" y1="300" x2="360" y2="300"
                    stroke={activePackets.length > 0 ? '#22c55e' : '#334155'}
                    strokeWidth={activePackets.length > 0 ? 3 : 1.5}
                    strokeDasharray="5,5"
                  />
                </>
              )}

              {/* 本地DNS到各服务器 - 迭代模式：客户端直接连 */}
              {queryMode === 'iterative' && (
                <>
                  <motion.line
                    x1="120" y1="290" x2="360" y2="120"
                    stroke={activePackets.length > 0 ? '#f59e0b' : '#334155'}
                    strokeWidth={activePackets.length > 0 ? 3 : 1.5}
                    strokeDasharray="5,5"
                  />
                  <motion.line
                    x1="120" y1="295" x2="360" y2="200"
                    stroke={activePackets.length > 0 ? '#06b6d4' : '#334155'}
                    strokeWidth={activePackets.length > 0 ? 3 : 1.5}
                    strokeDasharray="5,5"
                  />
                  <motion.line
                    x1="120" y1="300" x2="360" y2="300"
                    stroke={activePackets.length > 0 ? '#22c55e' : '#334155'}
                    strokeWidth={activePackets.length > 0 ? 3 : 1.5}
                    strokeDasharray="5,5"
                  />
                </>
              )}

              {/* DNS服务器节点 */}
              {DNS_SERVERS.map((server, i) => {
                // 判断服务器是否活跃
                const isActive = activePackets.some(packetId => {
                  const packet = packets.find(p => p.id === packetId);
                  return packet && (packet.from === server.id || packet.to === server.id);
                }) || cacheHits.includes(server.id);
                const Icon = server.icon;
                return (
                  <g key={server.id} transform={`translate(${server.x}, ${server.y})`}>
                    {/* 服务器框 */}
                    <motion.rect
                      x="-50" y="-30"
                      width="100" height="60"
                      rx="8"
                      fill={server.color}
                      fillOpacity={isActive ? 0.2 : 0.05}
                      stroke={server.color}
                      strokeOpacity={isActive ? 0.8 : 0.3}
                      strokeWidth="2"
                      animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                    />
                    <Icon x="-12" y="-18" className="w-6 h-6" style={{ color: server.color }} />
                    <text x="0" y="0" textAnchor="middle" className="text-xs font-medium fill-white" style={{ fontSize: '10px' }}>
                      {server.name.split('\n')[0]}
                    </text>
                    <text x="0" y="12" textAnchor="middle" className="text-[9px] fill-slate-400">
                      {server.ip}
                    </text>
                    {server.type === 'recursive' && (
                      <text x="0" y="24" textAnchor="middle" className="text-[8px] fill-slate-500">
                        {server.name.split('\n')[1]}
                      </text>
                    )}
                    
                    {/* 缓存标记 */}
                    {cacheHits.includes(server.id) && (
                      <motion.circle
                        cx="40" cy="-20" r="8"
                        fill="#22c55e"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      />
                    )}
                  </g>
                );
              })}

              {/* 活跃数据包动画 - 增强版 */}
              <AnimatePresence>
                {activePackets.map(packetId => {
                  const packet = packets.find(p => p.id === packetId);
                  if (!packet) return null;
                  const from = getServerPos(packet.from);
                  const to = getServerPos(packet.to);
                  
                  // 不同包类型的形状和样式
                  const packetShape = packet.type === 'query' ? 'arrow' : 'circle';
                  const packetSize = packet.type === 'cache-hit' ? 8 : 12;
                  const packetOpacity = packet.type === 'cache-hit' ? 0.8 : 0.9;
                  const textOffset = packet.direction === 'forward' ? -15 : 15;
                  
                  return (
                    <motion.g
                      key={packet.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {packetShape === 'arrow' ? (
                        <motion.path
                          d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                          fill={packet.color}
                          stroke={packet.color}
                          strokeWidth={3}
                          initial={{ strokeDashoffset: 100 }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ duration: 0.6, ease: 'easeInOut' }}
                          strokeDasharray="10,5"
                        />
                      ) : (
                        <motion.circle
                          r={packetSize}
                          fill={packet.color}
                          initial={{ cx: from.x, cy: from.y }}
                          animate={{ 
                            cx: [from.x, to.x],
                            cy: [from.y, to.y]
                          }}
                          transition={{ duration: 0.6, ease: 'easeInOut' }}
                          style={{ opacity: packetOpacity }}
                        />
                      )}
                      
                      {/* 数据包标签 */}
                      <motion.text
                        x={(from.x + to.x) / 2}
                        y={(from.y + to.y) / 2 + textOffset}
                        textAnchor="middle"
                        className="text-xs fill-white font-bold"
                        fill={packet.color}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        {packet.label}
                      </motion.text>
                    </motion.g>
                  );
                })}
              </AnimatePresence>
              
              {/* 完整查询路径（静态显示） */}
              {showCompletePath && (
                <g>
                  {getCompletePath().map((path, i) => {
                    const from = getServerPos(path.from);
                    const to = getServerPos(path.to);
                    return (
                      <motion.path
                        key={`path-${i}`}
                        d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                        stroke={path.color}
                        strokeWidth={1.5}
                        strokeDasharray="4,4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        transition={{ delay: i * 0.1 }}
                      />
                    );
                  })}
                </g>
              )}

              {/* 图例 */}
              <g transform="translate(30, 340)">
                <text x="0" y="0" className="text-xs fill-slate-500">图例</text>
                {[
                  { color: '#3b82f6', label: '客户端' },
                  { color: '#8b5cf6', label: '递归DNS' },
                  { color: '#f59e0b', label: '根DNS' },
                  { color: '#06b6d4', label: 'TLD DNS' },
                  { color: '#22c55e', label: '权威DNS' },
                ].map((item, i) => (
                  <g key={item.label} transform={`translate(${i * 85}, 15)`}>
                    <circle r="4" fill={item.color} />
                    <text x="8" y="4" className="text-[10px] fill-slate-500">{item.label}</text>
                  </g>
                ))}
              </g>
            </svg>
          </div>

          {/* 动画播放器 */}
          <div className="mt-3">
            <AnimationPlayer
              steps={steps.map(s => ({ id: s.id, label: s.label, desc: s.desc }))}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onReset={handleReset}
              onStepChange={handleStepChange}
            />
          </div>
        </div>

        {/* 右侧：当前步骤和缓存 */}
        <div className="col-span-3 space-y-3">
          {/* 当前步骤 */}
          <InfoPanel
            title="查询过程"
            content={
              <div className="space-y-2">
                {steps.map((step, i) => {
                  const isActive = i === currentStep;
                  const isCompleted = i < currentStep;
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.id}
                      className={`p-2 rounded border transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-slate-700 border-slate-500' 
                          : isCompleted 
                            ? 'bg-slate-800/50 border-slate-700/50 opacity-60' 
                            : 'bg-slate-800/30 border-slate-700/30 opacity-40'
                      }`}
                      onClick={() => handleStepChange(i)}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-emerald-500/20' : isActive ? 'bg-slate-600' : 'bg-slate-700'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <span className="text-[10px] text-slate-400">{i + 1}</span>
                          )}
                        </div>
                        <span className={`text-xs font-medium ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      <p className={`text-[10px] leading-relaxed ${
                        isActive ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        {step.desc}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            }
          />

          {/* 递归vs迭代对比 */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Hash className="w-4 h-4 text-purple-400" />
              递归 vs 迭代
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                <div className="font-medium text-purple-400 mb-0.5">递归查询</div>
                <ul className="text-slate-400 space-y-0.5 ml-2">
                  <li>• DNS服务器完成全部查询</li>
                  <li>• 客户端只收最终答案</li>
                  <li>• 常见于客户端→本地DNS</li>
                </ul>
              </div>
              <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                <div className="font-medium text-cyan-400 mb-0.5">迭代查询</div>
                <ul className="text-slate-400 space-y-0.5 ml-2">
                  <li>• 返回最佳答案(NS记录)</li>
                  <li>• 客户端自行继续查询</li>
                  <li>• DNS服务器间常用</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 根服务器信息 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              根域名服务器 (.)
            </h3>
            <div className="text-xs text-slate-400 space-y-1">
              <div>• 全球共 <span className="text-amber-400 font-mono">13组</span> 根服务器（A-M）</div>
              <div>• 根域名为空字符串""，顶级域包括.com/.net/.org等</div>
              <div>• 根服务器只返回TLD服务器地址，不查询具体域名</div>
              <div>• 根服务器IP由IANA管理，很少变化</div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
