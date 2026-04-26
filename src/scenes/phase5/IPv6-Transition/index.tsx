import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { 
  Monitor, Server, Globe, Router, 
  ArrowRight, ArrowDown, Layers, Zap,
  RefreshCw, Package, Network, ChevronRight,
  CheckCircle, Clock
} from 'lucide-react';

// ===== 动画步骤 =====
const ANIMATION_STEPS = [
  { id: 'dual-intro', label: '双栈技术概述', desc: '双栈设备同时运行IPv4和IPv6协议栈，根据DNS解析结果选择通信协议。新建网络推荐策略。' },
  { id: 'dual-dns', label: '双栈DNS解析', desc: 'DNS服务器同时返回A记录(IPv4)和AAAA记录(IPv6)。Happy Eyeballs算法优先IPv6。' },
  { id: 'dual-flow', label: '双栈通信选择', desc: '客户端根据目的地址类型选择对应协议栈：目的IPv4走IPv4协议栈，IPv6走IPv6协议栈。' },
  { id: 'tunnel-intro', label: '隧道技术概述', desc: 'IPv6站点间通过IPv4骨干网络通信，需要在入口封装IPv6数据包，出口解封装。' },
  { id: 'tunnel-encap', label: '隧道封装过程', desc: '隧道入口路由器将IPv6包封装在IPv4报文中：外层IPv4 Src=200.1.1.1Dst=200.1.2.1，内层IPv6原始报文。' },
  { id: 'tunnel-trans', label: '穿越IPv4骨干', desc: '封装后的报文在IPv4网络中传输，路由器只看到外层IPv4地址，不感知内层IPv6内容。' },
  { id: 'tunnel-decap', label: '隧道解封装', desc: '隧道出口路由器剥离IPv4头部，还原原始IPv6数据包，交付给目标IPv6主机。' },
  { id: 'nat64-intro', label: 'NAT64概述', desc: 'NAT64解决纯IPv6客户端访问IPv4服务器的问题。配合DNS64合成AAAA记录。' },
  { id: 'nat64-dns64', label: 'DNS64合成记录', desc: 'DNS64服务器收到IPv6客户端的查询，若无原生AAAA记录，则合成一条：前缀64:ff9b::/96 + IPv4地址。' },
  { id: 'nat64-translate', label: 'NAT64地址转换', desc: 'NAT64网关将IPv6地址(64:ff9b::192.0.2.1格式)转换为公网IPv4(192.0.2.1)，维护连接状态表。' },
  { id: 'compare', label: '技术选型对比', desc: '新建网络用双栈，IPv4存量网络用隧道，纯IPv6访问IPv4用NAT64。实际常组合使用。' },
];

// ===== 详细知识点数据 =====
const TUNNEL_TYPES = [
  { 
    name: '6in4 (手动隧道)', 
    desc: '手动配置隧道端点地址',
    prefix: '无特定前缀',
    protocol: '41 (IPv6 over IPv4)',
    use: '站点间固定连接',
    example: '隧道端点: 203.0.113.1 ↔ 203.0.113.2',
    color: '#06b6d4'
  },
  { 
    name: '6to4', 
    desc: '自动隧道，使用2002::/16前缀',
    prefix: '2002:XXXX:XXXX::/48',
    protocol: '41',
    use: '站点自动发现',
    example: '2002:c000:0201::c000:201 (203.0.2.1嵌入)',
    color: '#8b5cf6'
  },
  { 
    name: 'ISATAP', 
    desc: '站内自动隧道，IPv4内嵌IPv6',
    prefix: '::0200:5EFE:A.B.C.D',
    protocol: '41',
    use: '企业内网IPv6过渡',
    example: '::5EFE:192.168.1.100',
    color: '#f59e0b'
  },
  { 
    name: '6RD (快速部署)', 
    desc: '运营商自定义前缀的6to4变种',
    prefix: '运营商自定义',
    protocol: '41',
    use: 'IPv6 ISP快速部署',
    example: '中国电信: 240e::/20',
    color: '#22c55e'
  },
  { 
    name: 'Teredo', 
    desc: '穿越NAT的IPv6隧道技术，使用UDP封装',
    prefix: '2001:0000:/32',
    protocol: '17 (UDP 3544)',
    use: 'IPv4 NAT后的IPv6访问',
    example: '2001:0:53aa:64c:a8f6::1',
    color: '#ef4444'
  },
];

const NAT64_KNOWLEDGE = {
  wellKnownPrefix: '64:ff9b::/96',
  dns64Synthetic: {
    desc: 'DNS64合成AAAA记录规则',
    formula: '64:ff9b:: + IPv4地址(后32位转十六进制)',
    example: {
      originalIPv4: '93.184.216.34',
      // 93=0x5d, 184=0xb8, 216=0xd8, 34=0x22
      syntheticIPv6: '64:ff9b::5db8:d822'
    }
  },
  statefulNat64: {
    desc: 'NAT64状态表维护IPv6/IPv4映射',
    table: [
      { ipv6Src: '2001:db8::100', ipv4Dst: '93.184.216.34:443', translated: 'NAT64网关:1xxxxx' },
      { ipv6Src: '2001:db8::200', ipv4Dst: '8.8.8.8:53', translated: 'NAT64网关:2xxxxx' },
    ]
  },
  headerTranslation: {
    desc: '报文头转换',
    v6ToV4: 'IPv6(40B固定头) → IPv4(20B)，去除扩展头，映射IPv6地址到IPv4',
    v4ToV6: 'IPv4(20B) → IPv6(40B固定头)，IPv4嵌入64:ff9b::后缀'
  }
};

export default function IPv6TransitionScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMethod, setActiveMethod] = useState<'dual' | 'tunnel' | 'nat64'>('dual');
  const [animationPhase, setAnimationPhase] = useState(0);

  // 根据步骤更新活动方法和动画阶段
  const updateForStep = useCallback((step: number) => {
    if (step < 3) {
      setActiveMethod('dual');
      setAnimationPhase(step);
    } else if (step < 7) {
      setActiveMethod('tunnel');
      setAnimationPhase(step - 3);
    } else {
      setActiveMethod('nat64');
      setAnimationPhase(step - 7);
    }
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
    setIsPlaying(false);
    updateForStep(step);
  }, [updateForStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setAnimationPhase(0);
    setActiveMethod('dual');
  }, []);

  const handleMethodClick = (method: 'dual' | 'tunnel' | 'nat64') => {
    setActiveMethod(method);
    setAnimationPhase(0);
  };

  // Scene 数据
  const   sceneData = {
    id: 'ipv6-transition',
    title: 'IPv6过渡技术详解',
    description: '双栈、隧道(6in4/6to4/ISATAP/6RD/Teredo)、NAT64/DNS64完整技术方案',
    phase: 5 as const,
    category: '基础协议',
    duration: '12-15分钟',
    difficulty: 'hard' as const,
    isHot: true,
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false} noHeightLimit={true}>
      <div className="grid grid-cols-12 gap-4 h-full overflow-hidden p-4">
        {/* 左侧：技术选择和知识点 */}
        <div className="col-span-3 space-y-3 overflow-auto">
          {/* 三种技术对比 */}
          <div className="space-y-2">
            {[
              { id: 'dual' as const, name: '双栈', icon: Layers, color: '#3b82f6', desc: '同时运行IPv4/IPv6' },
              { id: 'tunnel' as const, name: '隧道', icon: Package, color: '#06b6d4', desc: 'IPv6 over IPv4' },
              { id: 'nat64' as const, name: 'NAT64', icon: RefreshCw, color: '#f59e0b', desc: 'IPv6访问IPv4' },
            ].map(method => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => handleMethodClick(method.id)}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    activeMethod === method.id 
                      ? 'border-slate-500 bg-slate-800' 
                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" style={{ color: method.color }} />
                    <span className="font-medium" style={{ color: activeMethod === method.id ? method.color : '#94a3b8' }}>
                      {method.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-7">{method.desc}</p>
                </button>
              );
            })}
          </div>

          {/* 隧道类型详情 */}
          {activeMethod === 'tunnel' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-cyan-400 mb-2">常见隧道类型</h3>
              <div className="space-y-2">
                {TUNNEL_TYPES.map(t => (
                  <div key={t.name} className="p-2 rounded bg-slate-900 border border-slate-700">
                    <div className="font-mono text-xs" style={{ color: t.color }}>{t.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{t.desc}</div>
                    <div className="text-[9px] text-yellow-500 mt-1">前缀: {t.prefix}</div>
                    <div className="text-[9px] text-slate-500">用途: {t.use}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NAT64详情 */}
          {activeMethod === 'nat64' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2">NAT64/DNS64</h3>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded bg-slate-900">
                  <div className="text-yellow-400 mb-1">已知前缀</div>
                  <code className="text-cyan-400">64:ff9b::/96</code>
                </div>
                <div className="p-2 rounded bg-slate-900">
                  <div className="text-yellow-400 mb-1">DNS64合成</div>
                  <div className="text-slate-400 text-[10px]">
                    <div>IPv4: 93.184.216.34</div>
                    <div>↓ 合成</div>
                    <div className="text-cyan-400">IPv6: 64:ff9b::5dc4:d822</div>
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-900">
                  <div className="text-yellow-400 mb-1">协议号</div>
                  <div className="text-slate-400">IPv6=41 (非UDP)</div>
                </div>
              </div>
            </div>
          )}

          {/* 双栈详情 */}
          {activeMethod === 'dual' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">双栈原理</h3>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-1">
                  <span className="text-blue-400">1.</span>
                  <span>DNS返回A和AAAA两条记录</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="text-blue-400">2.</span>
                  <span>Happy Eyeballs优先选IPv6</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="text-blue-400">3.</span>
                  <span>失败时快速回退IPv4</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 中间：主拓扑和报文可视化 */}
        <div className="col-span-6">
          <div className="bg-slate-900/80 rounded-lg border border-slate-700 p-4 h-[380px] relative">
            {/* 方法标签 */}
            <div className="absolute top-3 left-4 flex gap-2">
              {[
                { id: 'dual', label: '双栈', color: '#3b82f6' },
                { id: 'tunnel', label: '隧道', color: '#06b6d4' },
                { id: 'nat64', label: 'NAT64', color: '#f59e0b' },
              ].map(m => (
                <span 
                  key={m.id}
                  className="px-2 py-1 text-xs rounded"
                  style={{ 
                    backgroundColor: activeMethod === m.id ? m.color + '30' : 'transparent',
                    color: activeMethod === m.id ? m.color : '#64748b',
                    border: `1px solid ${activeMethod === m.id ? m.color + '50' : '#334155'}`
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* 当前阶段 */}
            <div className="absolute top-3 right-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">
                阶段: <span className="text-cyan-400">{animationPhase + 1}/4</span>
              </span>
            </div>

            <svg className="w-full h-full" viewBox="0 0 580 340">
              {/* ===== 双栈拓扑 ===== */}
              {activeMethod === 'dual' && (
                <>
                  {/* 区域背景 */}
                  <rect x="20" y="40" width="540" height="260" rx="8" fill="#3b82f6" fillOpacity="0.05" stroke="#3b82f6" strokeOpacity="0.2" />
                  
                  {/* 客户端 */}
                  <g transform="translate(80, 170)">
                    <rect x="-45" y="-50" width="90" height="100" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                    <Monitor x="-12" y="-35" className="w-6 h-6 text-slate-400" />
                    <text x="0" y="-10" textAnchor="middle" className="text-xs fill-white">双栈主机</text>
                    
                    {/* IPv4协议栈 */}
                    <rect x="-40" y="10" width="35" height="25" rx="4" fill={animationPhase >= 1 ? '#3b82f6' : '#475569'} fillOpacity="0.8" />
                    <text x="-22" y="27" textAnchor="middle" className="text-[9px] fill-white">IPv4</text>
                    
                    {/* IPv6协议栈 */}
                    <rect x="5" y="10" width="35" height="25" rx="4" fill={animationPhase >= 2 ? '#8b5cf6' : '#475569'} fillOpacity="0.8" />
                    <text x="22" y="27" textAnchor="middle" className="text-[9px] fill-white">IPv6</text>
                  </g>

                  {/* 网络 */}
                  <g transform="translate(290, 170)">
                    <rect x="-60" y="-40" width="120" height="80" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                    <Globe x="-8" y="-25" className="w-5 h-5 text-slate-400" />
                    <text x="0" y="-5" textAnchor="middle" className="text-xs fill-white">IPv4/IPv6</text>
                    <text x="0" y="15" textAnchor="middle" className="text-[10px] fill-slate-400">互联网骨干</text>
                  </g>

                  {/* 服务器 */}
                  <g transform="translate(500, 170)">
                    <rect x="-45" y="-50" width="90" height="100" rx="8" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2" />
                    <Server x="-12" y="-35" className="w-6 h-6 text-slate-400" />
                    <text x="0" y="-10" textAnchor="middle" className="text-xs fill-white">双栈服务器</text>
                    
                    <rect x="-40" y="10" width="35" height="25" rx="4" fill="#3b82f6" fillOpacity="0.8" />
                    <text x="-22" y="27" textAnchor="middle" className="text-[9px] fill-white">IPv4</text>
                    <rect x="5" y="10" width="35" height="25" rx="4" fill="#8b5cf6" fillOpacity="0.8" />
                    <text x="22" y="27" textAnchor="middle" className="text-[9px] fill-white">IPv6</text>
                  </g>

                  {/* 连接线和标签 */}
                  <line x1="135" y1="170" x2="220" y2="170" stroke="#64748b" strokeWidth="1" strokeDasharray="4,4" />
                  <line x1="360" y1="170" x2="445" y2="170" stroke="#64748b" strokeWidth="1" strokeDasharray="4,4" />
                  
                  {/* DNS记录 */}
                  <g transform="translate(290, 80)">
                    <rect x="-70" y="-25" width="140" height="50" rx="6" fill="#1e293b" stroke="#22c55e" strokeWidth="1" />
                    <text x="0" y="-5" textAnchor="middle" className="text-xs fill-emerald-400">DNS解析</text>
                    <text x="-50" y="12" className="text-[10px] fill-blue-400">A: 93.184.216.34</text>
                    <text x="30" y="12" className="text-[10px] fill-purple-400">AAAA: 2606:2800...</text>
                  </g>

                  {/* 动画: IPv6优先 */}
                  {animationPhase >= 2 && (
                    <>
                      <motion.circle r="6" fill="#8b5cf6" initial={{ cx: 80, cy: 180 }}>
                        <animateMotion dur="2s" repeatCount="indefinite" path="M0,0 L210,0" />
                      </motion.circle>
                      <motion.text x="200" y="160" className="text-xs fill-purple-400" initial={{ opacity: 0 }}>
                        IPv6优先选择
                      </motion.text>
                    </>
                  )}
                </>
              )}

              {/* ===== 隧道拓扑 ===== */}
              {activeMethod === 'tunnel' && (
                <>
                  {/* IPv4骨干区域 */}
                  <rect x="20" y="80" width="540" height="120" rx="8" fill="#06b6d4" fillOpacity="0.05" stroke="#06b6d4" strokeOpacity="0.2" />
                  <text x="290" y="100" textAnchor="middle" className="text-xs fill-cyan-400">IPv4骨干网络 (Protocol 41)</text>
                  
                  {/* IPv6站点A */}
                  <g transform="translate(80, 240)">
                    <rect x="-50" y="-40" width="100" height="80" rx="8" fill="#1e293b" stroke="#22c55e" strokeWidth="2" />
                    <Globe x="-8" y="-25" className="w-5 h-5 text-emerald-400" />
                    <text x="0" y="-5" textAnchor="middle" className="text-xs fill-white">IPv6站点A</text>
                    <text x="0" y="12" textAnchor="middle" className="text-[9px] fill-emerald-400">2001:db8:1::/48</text>
                    <text x="0" y="26" textAnchor="middle" className="text-[9px] fill-slate-500">2001:db8:1::1</text>
                  </g>

                  {/* IPv6站点B */}
                  <g transform="translate(500, 240)">
                    <rect x="-50" y="-40" width="100" height="80" rx="8" fill="#1e293b" stroke="#22c55e" strokeWidth="2" />
                    <Globe x="-8" y="-25" className="w-5 h-5 text-emerald-400" />
                    <text x="0" y="-5" textAnchor="middle" className="text-xs fill-white">IPv6站点B</text>
                    <text x="0" y="12" textAnchor="middle" className="text-[9px] fill-emerald-400">2001:db8:2::/48</text>
                    <text x="0" y="26" textAnchor="middle" className="text-[9px] fill-slate-500">2001:db8:2::1</text>
                  </g>

                  {/* 隧道入口路由器 */}
                  <g transform="translate(150, 140)">
                    <rect x="-45" y="-30" width="90" height="60" rx="6" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
                    <Router x="-10" y="-18" className="w-5 h-5 text-cyan-400" />
                    <text x="0" y="0" textAnchor="middle" className="text-[10px] fill-white">隧道入口</text>
                    <text x="0" y="15" textAnchor="middle" className="text-[9px] fill-cyan-400">203.0.113.1</text>
                  </g>

                  {/* 隧道出口路由器 */}
                  <g transform="translate(430, 140)">
                    <rect x="-45" y="-30" width="90" height="60" rx="6" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
                    <Router x="-10" y="-18" className="w-5 h-5 text-cyan-400" />
                    <text x="0" y="0" textAnchor="middle" className="text-[10px] fill-white">隧道出口</text>
                    <text x="0" y="15" textAnchor="middle" className="text-[9px] fill-cyan-400">203.0.113.2</text>
                  </g>

                  {/* 连接线 */}
                  <line x1="80" y1="200" x2="150" y2="170" stroke="#22c55e" strokeWidth="2" />
                  <line x1="195" y1="140" x2="385" y2="140" stroke="#06b6d4" strokeWidth="2" strokeDasharray="8,4" />
                  <line x1="475" y1="170" x2="500" y2="200" stroke="#22c55e" strokeWidth="2" />

                  {/* 报文封装动画 */}
                  {animationPhase >= 1 && (
                    <>
                      {/* 封装前的IPv6包 */}
                      <motion.g initial={{ opacity: 0 }}>
                        <rect x="100" y="185" width="60" height="30" rx="4" fill="#22c55e" fillOpacity="0.3" stroke="#22c55e" />
                        <text x="130" y="200" textAnchor="middle" className="text-[8px] fill-emerald-400">IPv6</text>
                        <text x="130" y="210" textAnchor="middle" className="text-[7px] fill-slate-400">Data</text>
                      </motion.g>
                    </>
                  )}

                  {/* 封装后的双层报文 */}
                  {(animationPhase >= 1 || animationPhase >= 2) && (
                    <>
                      <motion.g
                        animate={animationPhase === 2 ? { x: [0, 180] } : {}}
                        transition={animationPhase === 2 ? { duration: 2, repeat: Infinity } : {}}
                      >
                        {/* 外层IPv4 */}
                        <rect x="180" y="125" width="80" height="30" rx="4" fill="#f59e0b" fillOpacity="0.8" stroke="#f59e0b" />
                        <text x="220" y="140" textAnchor="middle" className="text-[8px] fill-white font-bold">IPv4 Header</text>
                        <text x="220" y="150" textAnchor="middle" className="text-[7px] fill-yellow-200">Src:203.0.113.1</text>
                        
                        {/* 内层IPv6 */}
                        <rect x="180" y="155" width="80" height="30" rx="4" fill="#22c55e" fillOpacity="0.8" stroke="#22c55e" />
                        <text x="220" y="170" textAnchor="middle" className="text-[8px] fill-white font-bold">IPv6 Header</text>
                        <text x="220" y="180" textAnchor="middle" className="text-[7px] fill-emerald-200">Src:2001:db8:1::1</text>
                      </motion.g>
                    </>
                  )}
                </>
              )}

              {/* ===== NAT64拓扑 ===== */}
              {activeMethod === 'nat64' && (
                <>
                  {/* IPv6网络区域 */}
                  <rect x="20" y="40" width="260" height="260" rx="8" fill="#8b5cf6" fillOpacity="0.05" stroke="#8b5cf6" strokeOpacity="0.2" />
                  <text x="150" y="60" textAnchor="middle" className="text-xs fill-purple-400">IPv6 Only 网络</text>
                  
                  {/* IPv4网络区域 */}
                  <rect x="300" y="40" width="260" height="260" rx="8" fill="#3b82f6" fillOpacity="0.05" stroke="#3b82f6" strokeOpacity="0.2" />
                  <text x="430" y="60" textAnchor="middle" className="text-xs fill-blue-400">IPv4 互联网</text>

                  {/* IPv6客户端 */}
                  <g transform="translate(100, 180)">
                    <rect x="-50" y="-40" width="100" height="80" rx="8" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2" />
                    <Monitor x="-10" y="-25" className="w-5 h-5 text-purple-400" />
                    <text x="0" y="-5" textAnchor="middle" className="text-xs fill-white">IPv6客户端</text>
                    <text x="0" y="12" textAnchor="middle" className="text-[9px] fill-purple-400 font-mono">2001:db8::100</text>
                  </g>

                  {/* DNS64服务器 */}
                  <g transform="translate(100, 80)">
                    <rect x="-50" y="-25" width="100" height="50" rx="6" fill="#1e293b" stroke="#22c55e" strokeWidth="1" />
                    <Server x="-8" y="-12" className="w-4 h-4 text-emerald-400" />
                    <text x="0" y="5" textAnchor="middle" className="text-[10px] fill-white">DNS64</text>
                    <text x="0" y="18" textAnchor="middle" className="text-[8px] fill-slate-400">合成AAAA记录</text>
                  </g>

                  {/* NAT64网关 */}
                  <g transform="translate(290, 180)">
                    <rect x="-60" y="-45" width="120" height="90" rx="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="3" />
                    <RefreshCw x="-12" y="-30" className={`w-6 h-6 text-yellow-400 ${animationPhase >= 2 ? 'animate-spin' : ''}`} />
                    <text x="0" y="-5" textAnchor="middle" className="text-xs fill-white font-bold">NAT64</text>
                    <text x="0" y="12" textAnchor="middle" className="text-[9px] fill-yellow-400">64:ff9b::/96</text>
                    <text x="0" y="30" textAnchor="middle" className="text-[8px] fill-slate-500">状态表跟踪</text>
                    
                    {/* 转换中动画 */}
                    {animationPhase >= 2 && (
                      <motion.text x="0" y="50" textAnchor="middle" className="text-[8px] fill-orange-400" animate={{ opacity: [0.5, 1, 0.5] }}>
                        转换中...
                      </motion.text>
                    )}
                  </g>

                  {/* IPv4服务器 */}
                  <g transform="translate(500, 180)">
                    <rect x="-50" y="-40" width="100" height="80" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                    <Server x="-10" y="-25" className="w-5 h-5 text-blue-400" />
                    <text x="0" y="-5" textAnchor="middle" className="text-xs fill-white">IPv4服务器</text>
                    <text x="0" y="12" textAnchor="middle" className="text-[9px] fill-blue-400 font-mono">93.184.216.34</text>
                  </g>

                  {/* 连接线和数据流 */}
                  <line x1="100" y1="110" x2="100" y2="130" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="100" y1="130" x2="230" y2="160" stroke="#8b5cf6" strokeWidth="1" />
                  <line x1="350" y1="180" x2="440" y2="180" stroke="#f59e0b" strokeWidth="2" />
                  
                  {/* 数据包动画 */}
                  {animationPhase >= 1 && (
                    <motion.circle r="5" fill="#8b5cf6">
                      <animateMotion dur="1.5s" repeatCount="indefinite" path="M100,200 L230,200" />
                    </motion.circle>
                  )}
                  {animationPhase >= 2 && (
                    <motion.circle r="5" fill="#f59e0b">
                      <animateMotion dur="1.5s" repeatCount="indefinite" path="M350,200 L440,200" />
                    </motion.circle>
                  )}

                  {/* 地址转换说明 */}
                  <g transform="translate(290, 260)">
                    <rect x="-100" y="-20" width="200" height="40" rx="6" fill="#1e293b" stroke="#64748b" />
                    <text x="0" y="-5" textAnchor="middle" className="text-[9px] fill-slate-400">地址映射</text>
                    <text x="-80" y="12" className="text-[8px] fill-purple-400">2001:db8::100</text>
                    <text x="0" y="12" className="text-[8px] fill-yellow-400">→</text>
                    <text x="80" y="12" className="text-[8px] fill-blue-400">93.184.216.34</text>
                  </g>
                </>
              )}

              {/* 图例 */}
              <g transform="translate(30, 310)">
                {activeMethod === 'dual' && [
                  { color: '#3b82f6', label: 'IPv4协议栈' },
                  { color: '#8b5cf6', label: 'IPv6协议栈' },
                  { color: '#22c55e', label: 'DNS记录' },
                ].map((item, i) => (
                  <g key={item.label} transform={`translate(${i * 100}, 0)`}>
                    <rect x="0" y="-6" width="8" height="8" rx="2" fill={item.color} />
                    <text x="12" y="0" className="text-[9px] fill-slate-500">{item.label}</text>
                  </g>
                ))}
                {activeMethod === 'tunnel' && [
                  { color: '#f59e0b', label: 'IPv4封装头' },
                  { color: '#22c55e', label: 'IPv6原始包' },
                  { color: '#06b6d4', label: '隧道通道' },
                ].map((item, i) => (
                  <g key={item.label} transform={`translate(${i * 110}, 0)`}>
                    <rect x="0" y="-6" width="8" height="8" rx="2" fill={item.color} />
                    <text x="12" y="0" className="text-[9px] fill-slate-500">{item.label}</text>
                  </g>
                ))}
                {activeMethod === 'nat64' && [
                  { color: '#8b5cf6', label: 'IPv6流量' },
                  { color: '#f59e0b', label: 'NAT64转换' },
                  { color: '#3b82f6', label: 'IPv4流量' },
                ].map((item, i) => (
                  <g key={item.label} transform={`translate(${i * 100}, 0)`}>
                    <rect x="0" y="-6" width="8" height="8" rx="2" fill={item.color} />
                    <text x="12" y="0" className="text-[9px] fill-slate-500">{item.label}</text>
                  </g>
                ))}
              </g>
            </svg>
          </div>

          {/* 报文格式详情 */}
          {activeMethod === 'tunnel' && (
            <div className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">隧道封装报文格式</div>
              <div className="flex gap-1">
                {[
                  { label: 'IPv4 Header', sub: 'Src,Dst,Proto=41', color: '#f59e0b' },
                  { label: 'IPv6 Header', sub: 'Src,Dst', color: '#22c55e' },
                  { label: 'TCP/UDP', sub: 'SrcPort,DstPort', color: '#3b82f6' },
                  { label: 'Data', sub: 'Payload', color: '#64748b' },
                ].map((p, i) => (
                  <div key={i} className="flex-1 p-2 rounded text-center" style={{ backgroundColor: p.color + '30' }}>
                    <div className="text-[10px] font-medium" style={{ color: p.color }}>{p.label}</div>
                    <div className="text-[8px] text-slate-500">{p.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NAT64地址转换 */}
          {activeMethod === 'nat64' && (
            <div className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">DNS64合成 + NAT64转换</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-purple-900/50 text-purple-400 font-mono">93.184.216.34</span>
                <ArrowRight className="w-4 h-4 text-yellow-400" />
                <span className="px-2 py-1 rounded bg-yellow-900/50 text-yellow-400 font-mono">64:ff9b::5dc4:d822</span>
              </div>
            </div>
          )}

          {/* 动画播放器 */}
          <div className="mt-2">
            <AnimationPlayer
              steps={ANIMATION_STEPS}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onReset={handleReset}
              onStepChange={handleStepChange}
            />
          </div>
        </div>

        {/* 右侧：详细步骤和技术对比 */}
        <div className="col-span-3 space-y-3 overflow-auto">
          {/* 当前步骤详情 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              当前步骤
            </h3>
            <div className="text-xs">
              <div className="font-medium text-cyan-400 mb-1">{ANIMATION_STEPS[currentStep]?.label}</div>
              <p className="text-slate-400 leading-relaxed">{ANIMATION_STEPS[currentStep]?.desc}</p>
            </div>
          </div>

          {/* 技术选型指南 */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">技术选型指南</h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
                <div className="font-medium text-blue-400 mb-0.5">双栈</div>
                <div className="text-slate-400">适用：新建网络</div>
                <div className="text-slate-500 mt-1">推荐策略，IPv4/IPv6并存</div>
              </div>
              <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/30">
                <div className="font-medium text-cyan-400 mb-0.5">隧道</div>
                <div className="text-slate-400">适用：IPv4存量网络</div>
                <div className="text-slate-500 mt-1">6to4/ISATAP/6RD/Teredo</div>
              </div>
              <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                <div className="font-medium text-yellow-400 mb-0.5">NAT64</div>
                <div className="text-slate-400">适用：IPv6 Only访问IPv4</div>
                <div className="text-slate-500 mt-1">需配合DNS64使用</div>
              </div>
            </div>
          </div>

          {/* 协议号参考 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">相关协议号</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">IPv6 over IPv4</span>
                <span className="font-mono text-cyan-400">Protocol 41</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Teredo (UDP)</span>
                <span className="font-mono text-red-400">UDP 3544</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NAT64前缀</span>
                <span className="font-mono text-yellow-400">64:ff9b::/96</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">6to4前缀</span>
                <span className="font-mono text-purple-400">2002::/16</span>
              </div>
            </div>
          </div>

          {/* 常见问题 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">常见问题</h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-slate-900">
                <div className="text-slate-300 mb-1">Q: 双栈是否需要双份地址？</div>
                <div className="text-slate-500">A: 是的，IPv4和IPv6地址池独立管理</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-slate-300 mb-1">Q: 隧道MTU问题？</div>
                <div className="text-slate-500">A: 封装后增加20字节，需分片或Path MTU Discovery</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-slate-300 mb-1">Q: NAT64支持所有协议？</div>
                <div className="text-slate-500">A: 不支持ICMP/FTP等复杂协议</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
