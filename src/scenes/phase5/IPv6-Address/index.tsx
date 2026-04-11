import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Smartphone, Server, Wifi, CheckCircle, Copy, 
  RefreshCw, Zap, ArrowRight, Layers, Settings, Info
} from 'lucide-react';

const sceneData = {
  id: 'ipv6-address',
  title: 'IPv6地址详解：128位地址结构',
  description: 'IPv6地址结构可视化、零压缩规则、EUI-64接口ID生成、NDP邻居发现协议',
  phase: 5 as const,
  category: '基础协议',
  difficulty: 'medium' as const,
  duration: '10-15分钟',
  isHot: true,
};

const animationSteps = [
  { id: '1', label: '地址结构', desc: 'IPv6地址128位，分为8组16进制数，每组16位' },
  { id: '2', label: '分组详解', desc: '前48位全球路由前缀 + 16位子网ID + 64位接口ID' },
  { id: '3', label: '零压缩', desc: '连续全零组压缩为::，每地址仅用一次' },
  { id: '4', label: 'EUI-64', desc: 'MAC地址转换为接口ID：插入FFFE，第7位取反' },
  { id: '5', label: 'NDP发现', desc: 'NS/NA邻居请求公告，RS/RA路由器请求公告' },
  { id: '6', label: '地址类型', desc: '全球单播2000::/3、链路本地fe80::/10、唯一本地fc00::/7' },
];

// NDP拓扑节点
const ndpNodes = [
  { id: 'host1', label: '主机A', xPct: 20, yPct: 50, type: 'host' as const },
  { id: 'host2', label: '主机B', xPct: 80, yPct: 50, type: 'host' as const },
  { id: 'router', label: '路由器', xPct: 50, yPct: 25, type: 'router' as const },
];

// NDP消息序列
const ndpMessages = [
  { id: 1, from: 'host1', to: 'router', type: 'RS', label: '路由请求', color: '#22c55e' },
  { id: 2, from: 'router', to: 'host1', type: 'RA', label: '路由公告', color: '#3b82f6' },
  { id: 3, from: 'host1', to: 'host2', type: 'NS', label: '邻居请求', color: '#f59e0b' },
  { id: 4, from: 'host2', to: 'host1', type: 'NA', label: '邻居公告', color: '#8b5cf6' },
];

// 地址类型数据
const addressTypes = [
  { type: '全球单播', prefix: '2000::/3', example: '2001:db8::/32', desc: '可路由的公网地址（2000::~3FFF::）', color: '#06b6d4' },
  { type: '链路本地', prefix: 'fe80::/10', example: 'fe80::1', desc: '仅本地链路有效，不可路由', color: '#8b5cf6' },
  { type: '唯一本地(ULA)', prefix: 'fc00::/7', example: 'fd12:3456::1', desc: 'RFC4193，类似IPv4私网（FC/FD开头）', color: '#10b981' },
  { type: '组播', prefix: 'ff00::/8', example: 'ff02::1', desc: '一对多通信，替代IPv4广播', color: '#f97316' },
];

export default function IPv6AddressScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'address' | 'eui64' | 'ndp'>('address');
  const [sampleAddress, setSampleAddress] = useState('2001:0db8:3a2f:01fe::0001');
  const [macAddress, setMacAddress] = useState('00:1A:2B:3C:4D:5E');
  const [ndpStep, setNdpStep] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);

  // EUI-64计算
  const eui64Result = useMemo(() => {
    const parts = macAddress.split(':').map(p => parseInt(p, 16).toString(16).padStart(2, '0').toUpperCase());
    if (parts.length !== 6) return null;
    
    // 第7位取反
    const firstByte = parseInt(parts[0], 16);
    const flipped = firstByte ^ 0x02;
    const flippedHex = flipped.toString(16).padStart(2, '0').toUpperCase();
    
    return `${flippedHex}${parts[1]}${parts[2]}:FFFE:${parts[3]}${parts[4]}${parts[5]}`;
  }, [macAddress]);

  // 动画播放
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= animationSteps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  // NDP动画
  useEffect(() => {
    if (!showAnimation) return;
    
    setNdpStep(0);
    const timers: NodeJS.Timeout[] = [];
    
    ndpMessages.forEach((msg, index) => {
      const timer = setTimeout(() => {
        setNdpStep(msg.id);
      }, index * 1200);
      timers.push(timer);
    });
    
    const endTimer = setTimeout(() => {
      setShowAnimation(false);
      setNdpStep(0);
    }, ndpMessages.length * 1200 + 500);
    timers.push(endTimer);
    
    return () => timers.forEach(clearTimeout);
  }, [showAnimation]);

  const handlePlay = useCallback(() => {
    if (currentStep >= animationSteps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  }, [currentStep, isPlaying]);

  const handleStep = useCallback((step: number) => {
    setCurrentStep(step);
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  return (
    <SceneLayout 
      scene={sceneData} 
      showSidebar={false}
    >
      <div className="space-y-6 h-full overflow-y-auto p-2">
        {/* 标签切换 */}
        <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg max-w-md mx-auto">
          {[
            { id: 'address' as const, label: '地址结构', color: 'cyan' },
            { id: 'eui64' as const, label: 'EUI-64', color: 'yellow' },
            { id: 'ndp' as const, label: 'NDP邻居发现', color: 'purple' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? `bg-${tab.color}-600 text-white` 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左侧 - 可视化区域 */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* 地址结构可视化 */}
            {activeTab === 'address' && (
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  IPv6地址结构
                </h3>
                
                {/* 地址显示 */}
                <div className="bg-gray-900 rounded-lg p-4 mb-4">
                  <div className="text-center mb-3">
                    <span className="text-xs text-gray-500">示例地址</span>
                  </div>
                  <div className="font-mono text-xl text-cyan-300 text-center break-all">
                    {sampleAddress}
                  </div>
                </div>
                
                {/* 128位分组可视化 */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-center gap-1 mb-3">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-3 rounded-sm ${
                          i % 4 === 0 ? 'bg-cyan-500' : 'bg-cyan-800/50'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <div className="flex justify-center gap-1 flex-wrap">
                    {sampleAddress.split(':').map((group, idx) => (
                      <motion.div
                        key={idx}
                        className={`px-3 py-2 rounded-lg text-center min-w-[52px] ${
                          idx < 3 ? 'bg-cyan-600/20 border border-cyan-500/50' :
                          idx === 3 ? 'bg-purple-600/20 border border-purple-500/50' :
                          'bg-green-600/20 border border-green-500/50'
                        }`}
                        animate={currentStep === idx ? { scale: 1.1 } : {}}
                      >
                        <div className={`font-mono text-lg font-bold ${
                          idx < 3 ? 'text-cyan-300' :
                          idx === 3 ? 'text-purple-300' :
                          'text-green-300'
                        }`}>
                          {group || '0'}
                        </div>
                        <div className="text-[9px] text-gray-500 mt-0.5">
                          {idx < 3 ? 'Prefix' : idx === 3 ? 'Subnet' : 'IID'}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* 图例 */}
                  <div className="flex justify-center gap-6 mt-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 bg-cyan-600/50 rounded" />
                      <span className="text-cyan-400">全球路由前缀 (48位)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 bg-purple-600/50 rounded" />
                      <span className="text-purple-400">子网ID (16位)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 bg-green-600/50 rounded" />
                      <span className="text-green-400">接口ID (64位)</span>
                    </div>
                  </div>
                </div>
                
                {/* 地址示例选择 */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { addr: '2001:db8:3a2f:1::1', type: '全球单播' },
                    { addr: 'fe80::1', type: '链路本地' },
                    { addr: 'fc00::1', type: '唯一本地' },
                    { addr: 'ff02::1', type: '组播' },
                  ].map(item => (
                    <button
                      key={item.addr}
                      onClick={() => setSampleAddress(item.addr)}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        sampleAddress === item.addr
                          ? 'bg-cyan-900/30 border-cyan-500'
                          : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-mono text-sm text-cyan-300">{item.addr}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.type}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* EUI-64转换 */}
            {activeTab === 'eui64' && (
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-yellow-400" />
                  EUI-64 接口ID生成
                </h3>
                
                <div className="space-y-6">
                  {/* MAC地址输入 */}
                  <div className="bg-gray-900 rounded-lg p-4">
                    <label className="text-xs text-gray-400 mb-2 block">输入MAC地址</label>
                    <input
                      type="text"
                      value={macAddress}
                      onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg font-mono text-lg text-center text-cyan-300 focus:border-cyan-500 focus:outline-none"
                      placeholder="00:1A:2B:3C:4D:5E"
                    />
                  </div>
                  
                  {/* 转换过程 */}
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      {/* MAC地址 */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-2">MAC地址</div>
                        <div className="flex gap-1">
                          {macAddress.split(':').map((part, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-1 bg-blue-900/50 border border-blue-500/50 rounded font-mono text-sm text-blue-300"
                            >
                              {part || '00'}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-center gap-4 mt-1 text-[10px] text-gray-500">
                          <span>OUI</span>
                          <span>NIC</span>
                        </div>
                      </div>
                      
                      <ArrowRight className="w-6 h-6 text-cyan-400" />
                      
                      {/* 插入FFFE */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-2">插入FFFE</div>
                        <div className="px-3 py-2 bg-orange-600/30 border border-orange-500 rounded font-mono text-sm text-orange-300 animate-pulse">
                          FFFE
                        </div>
                      </div>
                      
                      <ArrowRight className="w-6 h-6 text-cyan-400" />
                      
                      {/* 第7位取反 */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-2">第7位取反</div>
                        <div className="px-3 py-2 bg-yellow-600/30 border border-yellow-500 rounded text-xs text-yellow-300">
                          U/L位反转
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 结果 */}
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-2 text-center">EUI-64 结果</div>
                    <div className="font-mono text-xl text-green-300 text-center">
                      {eui64Result ? eui64Result.toUpperCase() : '无效MAC'}
                    </div>
                  </div>
                  
                  {/* 原理说明 */}
                  <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
                    <div className="text-sm font-medium text-yellow-400 mb-2">EUI-64原理</div>
                    <ul className="text-xs text-gray-300 space-y-1">
                      <li>1. MAC地址48位，需扩展为64位接口ID</li>
                      <li>2. 在OUI和NIC之间插入FFFE</li>
                      <li>3. 第1字节第7位(U/L位)取反</li>
                      <li className="text-yellow-400 mt-2">应用：自动生成接口ID，无需手动配置</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {/* NDP邻居发现 */}
            {activeTab === 'ndp' && (
              <div className="bg-gray-800/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-purple-400" />
                    NDP 邻居发现协议
                  </h3>
                  <button
                    onClick={() => setShowAnimation(true)}
                    disabled={showAnimation}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white"
                  >
                    {showAnimation ? '播放中...' : '播放动画'}
                  </button>
                </div>
                
                {/* 拓扑图 - 使用viewBox保持比例 */}
                <div className="relative w-full" style={{ paddingBottom: '50%' }}>
                  <div className="absolute inset-0 bg-gray-900/80 rounded-lg overflow-hidden">
                    {/* 网络线 */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                      {/* 主机A到路由器 */}
                      <motion.line
                        x1="160" y1="200"
                        x2="400" y2="100"
                        stroke={ndpStep >= 1 ? '#22c55e' : '#4b5563'}
                        strokeWidth={ndpStep >= 1 ? 4 : 2}
                        animate={{ opacity: ndpStep >= 1 ? 1 : 0.5 }}
                      />
                      {/* 路由器到主机B */}
                      <motion.line
                        x1="400" y1="100"
                        x2="640" y2="200"
                        stroke={ndpStep >= 2 ? '#3b82f6' : '#4b5563'}
                        strokeWidth={ndpStep >= 2 ? 4 : 2}
                        animate={{ opacity: ndpStep >= 2 ? 1 : 0.5 }}
                      />
                      {/* 主机A到主机B */}
                      <motion.line
                        x1="160" y1="220"
                        x2="640" y2="220"
                        stroke={ndpStep >= 3 ? '#f59e0b' : '#4b5563'}
                        strokeWidth={ndpStep >= 3 ? 4 : 2}
                        strokeDasharray="10,5"
                        animate={{ opacity: ndpStep >= 3 ? 1 : 0.5 }}
                      />
                      
                      {/* 动画数据包 */}
                      <AnimatePresence>
                        {ndpMessages.filter(m => m.id <= ndpStep).map(msg => (
                          <motion.circle
                            key={`${msg.id}-${ndpStep}`}
                            cx={msg.from === 'host1' ? 160 : msg.from === 'host2' ? 640 : 400}
                            cy={msg.from === 'host1' || msg.from === 'host2' ? 200 : 100}
                            r={20}
                            fill={msg.color}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                          />
                        ))}
                      </AnimatePresence>
                    </svg>
                    
                    {/* 节点 */}
                    {ndpNodes.map(node => (
                      <motion.div
                        key={node.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${node.xPct}%`, top: `${node.yPct}%` }}
                        whileHover={{ scale: 1.1 }}
                      >
                        <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-lg ${
                          node.type === 'router' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}>
                          {node.type === 'router' ? (
                            <Server className="w-7 h-7 text-white" />
                          ) : (
                            <Smartphone className="w-7 h-7 text-white" />
                          )}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-white font-medium whitespace-nowrap">
                          {node.label}
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* 消息标签 */}
                    <AnimatePresence>
                      {ndpStep > 0 && ndpMessages.filter(m => m.id === ndpStep).map(msg => (
                        <motion.div
                          key={`label-${msg.id}`}
                          className="absolute px-3 py-1.5 rounded-lg text-white text-sm font-bold shadow-lg"
                          style={{
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: msg.color,
                          }}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                        >
                          {msg.type} - {msg.label}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {/* 链路信息 */}
                    <div className="absolute bottom-2 left-2 right-2 text-center">
                      <span className="text-xs text-gray-400 bg-gray-900/80 px-3 py-1 rounded-full">
                        fe80::/10 链路本地网络
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 步骤说明 */}
                {showAnimation && ndpStep > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500/50"
                  >
                    <div className="text-xs text-purple-300 mb-1">当前步骤</div>
                    <div className="text-sm text-white font-medium">
                      {ndpMessages.find(m => m.id === ndpStep)?.label}
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-purple-500"
                        animate={{ width: `${(ndpStep / ndpMessages.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}
                
                {/* NDP类型说明 */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { type: 'RS', name: '路由请求', desc: '主机请求路由器信息', color: 'green' },
                    { type: 'RA', name: '路由公告', desc: '路由器周期性公告', color: 'blue' },
                    { type: 'NS', name: '邻居请求', desc: '请求邻居链路地址', color: 'yellow' },
                    { type: 'NA', name: '邻居公告', desc: '公告自己的链路地址', color: 'purple' },
                  ].map(item => (
                    <div 
                      key={item.type}
                      className={`p-3 bg-${item.color}-900/20 rounded-lg border border-${item.color}-500/30`}
                    >
                      <div className={`font-mono text-${item.color}-400 font-bold text-lg`}>{item.type}</div>
                      <div className="text-sm text-white mt-1">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 右侧 - 知识卡片 */}
          <div className="space-y-4">
            
            {/* 地址类型速查 */}
            <div className="bg-gray-800/50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                IPv6地址类型速查
              </h4>
              
              <div className="space-y-3">
                {addressTypes.map(item => (
                  <div 
                    key={item.type}
                    className="p-3 rounded-lg border"
                    style={{ borderColor: `${item.color}50`, backgroundColor: `${item.color}10` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold" style={{ color: item.color }}>{item.type}</span>
                      <span className="text-xs text-gray-500 font-mono">{item.prefix}</span>
                    </div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                    <div className="mt-1 font-mono text-xs" style={{ color: item.color }}>
                      {item.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 零压缩规则 */}
            <div className="bg-gray-800/50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                零压缩规则
              </h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <div>
                    <span className="text-white">每组前导零可省略</span>
                    <div className="text-xs text-gray-400 mt-1">0001 → 1</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <div>
                    <span className="text-white">连续全零组用::压缩</span>
                    <div className="text-xs text-gray-400 mt-1">0000:0000:0001 → ::1</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <div>
                    <span className="text-white">::只能出现一次</span>
                    <div className="text-xs text-gray-400 mt-1">2001:0:0:1::1 ✓</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 技术要点 */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl p-5 border border-cyan-500/20">
              <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                技术要点
              </h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>IPv6地址长度128位，是IPv4的4倍</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>接口ID通常为64位 (EUI-64或随机)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>默认路由 = ::/0 (等同于0.0.0.0/0)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>被请求节点组播 = ff02::1:FFXX:XXXX</span>
                </li>
              </ul>
            </div>
            
            {/* IPv4 vs IPv6 */}
            <div className="bg-gray-800/50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-3">地址解析对比</h4>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-900/20 rounded-lg">
                  <div className="text-blue-400 font-medium">IPv4: ARP</div>
                  <div className="text-xs text-gray-400 mt-1">广播请求，单播响应</div>
                </div>
                <div className="p-3 bg-purple-900/20 rounded-lg">
                  <div className="text-purple-400 font-medium">IPv6: NDP</div>
                  <div className="text-xs text-gray-400 mt-1">组播请求(Solicited-Node)，可选单播响应</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 底部动画控制 */}
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white font-medium">动画步骤</span>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
              >
                重置
              </button>
              <button
                onClick={handlePlay}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isPlaying 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                    : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                }`}
              >
                {isPlaying ? '暂停' : '播放'}
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {animationSteps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => handleStep(idx)}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  currentStep === idx
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>
          
          {animationSteps[currentStep] && (
            <div className="mt-3 p-3 bg-gray-900/50 rounded-lg">
              <div className="text-xs text-cyan-400 mb-1">当前步骤说明</div>
              <div className="text-sm text-white">{animationSteps[currentStep].desc}</div>
            </div>
          )}
        </div>
      </div>
    </SceneLayout>
  );
}
