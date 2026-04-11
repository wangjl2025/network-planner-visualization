import { useState, useEffect, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, ArrowRight, Layers, Network, Database, Target, Shield, Zap, Radio } from 'lucide-react';

// VXLAN实战场景 - 数据中心多租户网络
export function VXLANDetailScene() {
  const sceneData = {
    id: 'vxlan-detail',
    title: 'VXLAN实战 - 数据中心多租户网络',
    description: '基于Spine-Leaf架构的VXLAN隧道、MAC学习、跨VTEP转发完整流程',
    phase: 1 as const,
    category: '网络虚拟化',
    difficulty: 'hard' as const,
    duration: '8-10分钟',
  };

  // 动画步骤
  const steps = [
    { id: 'topology', title: '数据中心拓扑', description: 'Spine-Leaf架构下的VXLAN部署' },
    { id: 'arp', title: 'ARP请求触发', description: 'VM-A需要找10.1.1.20，发出ARP广播' },
    { id: 'mac-learn', title: 'VTEP MAC学习', description: 'VTEP-1学习VM-A的MAC和VNI映射' },
    { id: 'vxlan-encap', title: 'VXLAN封装', description: 'VTEP-1封装：BUM封装到远端VTEP-2' },
    { id: 'underlay', title: 'Underlay传输', description: '通过IP Fabric（Spine-Leaf）转发' },
    { id: 'decap', title: '解封装交付', description: 'VTEP-2解封装，交付给VM-C' },
    { id: 'isolation', title: 'VNI隔离验证', description: 'VNI 100和VNI 200完全隔离' },
  ];

  // 状态
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<'A' | 'B'>('A');

  // 自动播放
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    setSelectedTenant('A');
  }, []);

  // 判断当前动画元素是否激活
  const isActive = (step: number) => currentStep >= step;
  const isCurrent = (step: number) => currentStep === step;

  return (
    <SceneLayout scene={sceneData} noHeightLimit={true}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左侧控制面板 */}
        <div className="space-y-4">
          {/* 学习目标 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="text-blue-400" size={18} />
              <h3 className="text-white font-medium">学习目标</h3>
            </div>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 理解Spine-Leaf架构下的VXLAN部署</li>
              <li>• 掌握VTEP的MAC学习机制</li>
              <li>• 看清VXLAN封装的完整过程</li>
              <li>• 理解Underlay与Overlay的协同</li>
            </ul>
          </div>

          {/* 步骤进度 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">学习步骤</h3>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    index === currentStep
                      ? 'bg-blue-600 text-white'
                      : index < currentStep
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      index === currentStep
                        ? 'bg-white text-blue-600'
                        : index < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-400'
                    }`}>
                      {index < currentStep ? '✓' : index + 1}
                    </div>
                    <span className="font-medium text-sm">{step.title}</span>
                  </div>
                  {index === currentStep && (
                    <p className="text-xs mt-1 opacity-80">{step.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 播放控制 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? '暂停' : '播放'}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 租户选择 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">选择租户查看</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTenant('A')}
                className={`flex-1 p-3 rounded-lg transition-all ${
                  selectedTenant === 'A'
                    ? 'bg-blue-600 ring-2 ring-white'
                    : 'bg-blue-900/50 hover:bg-blue-900'
                }`}
              >
                <div className="text-white font-bold">租户A</div>
                <div className="text-xs text-blue-200">VNI 100</div>
              </button>
              <button
                onClick={() => setSelectedTenant('B')}
                className={`flex-1 p-3 rounded-lg transition-all ${
                  selectedTenant === 'B'
                    ? 'bg-green-600 ring-2 ring-white'
                    : 'bg-green-900/50 hover:bg-green-900'
                }`}
              >
                <div className="text-white font-bold">租户B</div>
                <div className="text-xs text-green-200">VNI 200</div>
              </button>
            </div>
          </div>
        </div>

        {/* 右侧可视化区域 */}
        <div className="lg:col-span-3 space-y-4">
          {/* ===== 核心拓扑区域 ===== */}
          <div className="bg-gray-900 rounded-xl p-4 relative">
            {/* 标题 */}
            <div className="text-center mb-4">
              <h3 className="text-white font-bold text-lg">
                数据中心 Spine-Leaf + VXLAN 架构
              </h3>
            </div>

            {/* 拓扑区域 - 使用Grid精确布局 */}
            <div className="relative" style={{ height: '420px' }}>
              
              {/* ===== 第1层：Spine节点 ===== */}
              <div className="absolute top-0 left-0 right-0 flex justify-center items-start gap-8">
                <div className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  isActive(4) ? 'border-yellow-400 bg-yellow-900/30 shadow-lg shadow-yellow-400/30' : 'border-gray-600 bg-gray-800'
                }`}>
                  <div className="text-yellow-400 font-bold text-sm flex items-center gap-2 justify-center">
                    <Zap size={14} />
                    Spine-1
                  </div>
                  <div className="text-xs text-gray-400 text-center">10.255.1.1</div>
                </div>
                <div className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  isActive(4) ? 'border-yellow-400 bg-yellow-900/30 shadow-lg shadow-yellow-400/30' : 'border-gray-600 bg-gray-800'
                }`}>
                  <div className="text-yellow-400 font-bold text-sm flex items-center gap-2 justify-center">
                    <Zap size={14} />
                    Spine-2
                  </div>
                  <div className="text-xs text-gray-400 text-center">10.255.1.2</div>
                </div>
              </div>

              {/* ===== Spine到Leaf的连接线 ===== */}
              <div className="absolute top-16 left-0 right-0 flex justify-center">
                <div className="flex gap-16 relative">
                  {/* 左连接线 */}
                  <div className="w-0.5 h-6 bg-gray-600" />
                  {/* 右连接线 */}
                  <div className="w-0.5 h-6 bg-gray-600" />
                </div>
              </div>

              {/* ===== 第2层：Leaf节点 ===== */}
              <div className="absolute top-24 left-0 right-0 flex justify-center gap-16">
                {/* Leaf-1 + VTEP-1 */}
                <div className="flex flex-col items-center">
                  <div className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    isActive(2) || isActive(3) ? 'border-white bg-indigo-700 shadow-lg shadow-indigo-500/40' : 'border-indigo-500 bg-indigo-900/50'
                  }`}>
                    <div className="text-white font-bold text-sm flex items-center gap-2 justify-center">
                      <Network size={14} />
                      Leaf-1
                    </div>
                    <div className="text-xs text-indigo-200 text-center">10.0.1.254</div>
                  </div>
                  {/* VTEP标注 */}
                  <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    isActive(2) || isActive(3) ? 'bg-purple-600 text-white ring-2 ring-purple-300' : 'bg-purple-900/50 text-purple-300'
                  }`}>
                    VTEP-1 (10.0.1.1)
                  </div>
                  {/* 连接线到VM */}
                  <div className="w-0.5 h-6 bg-indigo-500 mt-1" />
                </div>

                {/* Leaf-2 + VTEP-2 */}
                <div className="flex flex-col items-center">
                  <div className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    isActive(5) ? 'border-white bg-indigo-700 shadow-lg shadow-indigo-500/40' : 'border-indigo-500 bg-indigo-900/50'
                  }`}>
                    <div className="text-white font-bold text-sm flex items-center gap-2 justify-center">
                      <Network size={14} />
                      Leaf-2
                    </div>
                    <div className="text-xs text-indigo-200 text-center">10.0.2.254</div>
                  </div>
                  {/* VTEP标注 */}
                  <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    isActive(5) ? 'bg-purple-600 text-white ring-2 ring-purple-300' : 'bg-purple-900/50 text-purple-300'
                  }`}>
                    VTEP-2 (10.0.2.1)
                  </div>
                  {/* 连接线到VM */}
                  <div className="w-0.5 h-6 bg-indigo-500 mt-1" />
                </div>
              </div>

              {/* ===== 第3层：VXLAN隧道 ===== */}
              <div className={`absolute top-48 left-0 right-0 flex justify-center transition-opacity ${
                isActive(3) || isActive(4) ? 'opacity-100' : 'opacity-20'
              }`}>
                <div className="relative w-80 h-8">
                  {/* 隧道线 SVG */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 30">
                    <defs>
                      <linearGradient id="tunnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="50%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 20,15 Q 160,0 300,15"
                      stroke="url(#tunnelGrad)"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="8,4"
                      className={isActive(3) || isActive(4) ? 'animate-pulse' : ''}
                    />
                  </svg>
                  {/* 隧道标签 */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-900 px-2 py-0.5 rounded text-[10px] text-purple-200 whitespace-nowrap">
                    VXLAN Tunnel (VNI {selectedTenant === 'A' ? '100' : '200'})
                  </div>
                </div>
              </div>

              {/* ===== 数据包动画 ===== */}
              {/* ARP请求 */}
              {isCurrent(1) && (
                <div className="absolute top-32 left-[18%] animate-bounce z-10">
                  <div className="bg-yellow-500 px-2 py-1 rounded text-[10px] text-black font-bold flex items-center gap-1 shadow-lg">
                    <Radio size={10} />
                    ARP广播
                  </div>
                </div>
              )}

              {/* VXLAN封装 */}
              {(isCurrent(3) || isCurrent(4)) && (
                <div className="absolute top-44 left-1/2 -translate-x-1/2 animate-pulse z-10">
                  <div className="bg-purple-500 px-3 py-1 rounded text-xs text-white font-bold flex items-center gap-2 shadow-lg">
                    <Layers size={12} />
                    VXLAN封装
                    <span className="text-[10px] bg-purple-900 px-1 rounded">
                      VNI={selectedTenant === 'A' ? '100' : '200'}
                    </span>
                  </div>
                </div>
              )}

              {/* 解封装 */}
              {isCurrent(5) && (
                <div className="absolute top-44 right-[18%] animate-pulse z-10">
                  <div className="bg-green-500 px-3 py-1 rounded text-xs text-white font-bold flex items-center gap-2 shadow-lg">
                    <ArrowRight size={12} className="rotate-180" />
                    解封装交付
                  </div>
                </div>
              )}

              {/* ===== 第4层：VM区域 ===== */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4">
                {/* 左侧：本地VM */}
                <div className={`w-44 transition-all ${selectedTenant === 'A' ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-3">
                    <div className="text-blue-400 text-xs font-bold mb-2 flex items-center gap-1">
                      <Shield size={12} />
                      VNI 100 - 本地站点
                    </div>
                    {/* VM-A */}
                    <div className={`bg-gray-800 p-2 rounded border-2 mb-2 transition-all ${
                      isCurrent(1) || isCurrent(2) ? 'border-blue-400 shadow-lg shadow-blue-400/40' : 'border-gray-600'
                    }`}>
                      <div className="text-white text-xs font-bold">VM-A (源)</div>
                      <div className="text-[10px] text-gray-400">10.1.1.10</div>
                      <div className="text-[10px] text-blue-300">MAC: 00:11:22:AA:BB:01</div>
                      {isCurrent(1) && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-yellow-400 animate-pulse">
                          <Radio size={10} />
                          ARP请求
                        </div>
                      )}
                    </div>
                    {/* VM-B */}
                    <div className="bg-gray-800 p-2 rounded border border-gray-600">
                      <div className="text-white text-xs font-bold">VM-B</div>
                      <div className="text-[10px] text-gray-400">10.1.1.11</div>
                    </div>
                  </div>
                </div>

                {/* 中间：租户B（条件显示） */}
                {selectedTenant === 'B' && (
                  <div className="w-44 opacity-100">
                    <div className="bg-green-900/50 border border-green-500 rounded-lg p-3">
                      <div className="text-green-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Shield size={12} />
                        VNI 200 - 本地站点
                      </div>
                      <div className="bg-gray-800 p-2 rounded border border-gray-600 mb-2">
                        <div className="text-white text-xs font-bold">VM-D</div>
                        <div className="text-[10px] text-gray-400">10.2.2.10</div>
                      </div>
                      <div className="bg-gray-800 p-2 rounded border border-gray-600">
                        <div className="text-white text-xs font-bold">VM-E</div>
                        <div className="text-[10px] text-gray-400">10.2.2.11</div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedTenant === 'A' && (
                  <div className="w-44 opacity-30">
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                      <div className="text-green-500 text-xs font-bold mb-2 flex items-center gap-1">
                        <Shield size={12} />
                        VNI 200 - 租户B (隐藏)
                      </div>
                      <div className="text-[10px] text-green-600">切换上方按钮查看</div>
                    </div>
                  </div>
                )}

                {/* 右侧：远端VM */}
                <div className={`w-44 transition-all ${selectedTenant === 'A' ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-3">
                    <div className="text-blue-400 text-xs font-bold mb-2 flex items-center gap-1">
                      <Shield size={12} />
                      VNI 100 - 远端站点
                    </div>
                    {/* VM-C */}
                    <div className={`bg-gray-800 p-2 rounded border-2 mb-2 transition-all ${
                      isCurrent(5) ? 'border-green-400 shadow-lg shadow-green-400/40' : 'border-gray-600'
                    }`}>
                      <div className="text-white text-xs font-bold">VM-C (目标)</div>
                      <div className="text-[10px] text-gray-400">10.1.1.20</div>
                      <div className="text-[10px] text-blue-300">MAC: 00:11:22:CC:DD:02</div>
                      {isCurrent(5) && (
                        <div className="mt-1 text-[10px] text-green-400">
                          ✓ 收到ARP响应
                        </div>
                      )}
                    </div>
                    {/* VM-D */}
                    <div className="bg-gray-800 p-2 rounded border border-gray-600">
                      <div className="text-white text-xs font-bold">VM-D</div>
                      <div className="text-[10px] text-gray-400">10.1.1.21</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== 步骤说明 ===== */}
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2 bg-gray-800 rounded-lg p-3 w-80 transition-all ${
                isCurrent(currentStep) ? 'ring-2 ring-blue-400' : ''
              }`}>
                <h4 className="text-white font-bold text-sm mb-1">
                  {steps[currentStep]?.title}
                </h4>
                <p className="text-gray-300 text-xs">
                  {steps[currentStep]?.description}
                </p>
              </div>
            </div>

            {/* ===== 步骤详情提示 ===== */}
            <div className={`mt-4 bg-gray-800/80 rounded-lg p-4 transition-all ${
              isActive(1) ? 'ring-2 ring-blue-400' : ''
            }`}>
              {currentStep === 0 && (
                <div className="text-sm text-gray-400">
                  <span className="text-blue-400 font-bold">提示：</span>这是一个典型的数据中心Spine-Leaf + VXLAN架构。Spine交换机提供Layer 3转发，Leaf交换机集成VTEP功能。
                </div>
              )}
              
              {currentStep === 1 && (
                <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded">
                  <div className="text-yellow-300 text-xs space-y-1">
                    <div className="font-bold">📡 ARP广播原理：</div>
                    <div>• VM-A想知道10.1.1.20的MAC地址</div>
                    <div>• 在本地VLAN内广播ARP请求</div>
                    <div>• VTEP-1收到后会代理响应并学习MAC</div>
                  </div>
                </div>
              )}
              
              {currentStep === 2 && (
                <div className="p-3 bg-purple-900/30 border border-purple-600/50 rounded">
                  <div className="text-purple-300 text-xs space-y-1">
                    <div className="font-bold">📝 VTEP MAC学习：</div>
                    <div>• VTEP-1学习到：VM-A ∈ VNI 100</div>
                    <div>• 生成表项：(MAC 00:11:22:AA:BB:01, VNI 100, 本地)</div>
                    <div>• 通过EVPN/BGP向其他VTEP宣告此路由</div>
                  </div>
                </div>
              )}
              
              {currentStep === 3 && (
                <div className="p-3 bg-blue-900/30 border border-blue-600/50 rounded">
                  <div className="text-blue-300 text-xs">
                    <div className="font-bold mb-1">🔒 VXLAN封装格式：</div>
                    <div className="font-mono bg-black/30 p-2 rounded text-[10px] grid grid-cols-2 gap-1">
                      <span className="text-green-400">[Outer Eth]</span>
                      <span className="text-green-400">DstMAC=VTEP-2</span>
                      <span className="text-blue-400">[Outer IP]</span>
                      <span className="text-blue-400">Dst=10.0.2.1</span>
                      <span className="text-indigo-400">[UDP]</span>
                      <span className="text-indigo-400">Dst=4789</span>
                      <span className="text-purple-400 border border-yellow-400">[VXLAN]</span>
                      <span className="text-purple-400">VNI=100 🔥</span>
                    </div>
                  </div>
                </div>
              )}
              
              {currentStep === 4 && (
                <div className="p-3 bg-amber-900/30 border border-amber-600/50 rounded">
                  <div className="text-amber-300 text-xs space-y-1">
                    <div className="font-bold">🌐 Underlay传输：</div>
                    <div>• VXLAN报文在标准IP网络中转发</div>
                    <div>• Spine-Leaf提供ECMP负载均衡</div>
                    <div>• 交换机只处理外层IP，不感知VXLAN</div>
                  </div>
                </div>
              )}
              
              {currentStep === 5 && (
                <div className="p-3 bg-green-900/30 border border-green-600/50 rounded">
                  <div className="text-green-300 text-xs space-y-1">
                    <div className="font-bold">📦 解封装交付：</div>
                    <div>• VTEP-2根据VNI查找本地MAC表</div>
                    <div>• 找到VM-C在本地直连</div>
                    <div>• 剥离VXLAN头部，转发给VM-C</div>
                  </div>
                </div>
              )}
              
              {currentStep === 6 && (
                <div className="p-3 bg-red-900/30 border border-red-600/50 rounded">
                  <div className="text-red-300 text-xs space-y-1">
                    <div className="font-bold">🔒 VNI隔离：</div>
                    <div>• 租户A(VNI 100) 无法访问租户B(VNI 200)</div>
                    <div>• 每个VNI是独立的广播域</div>
                    <div>• VTEP根据VNI区分不同租户流量</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== VTEP MAC表可视化 ===== */}
          <div className={`bg-gray-800 rounded-lg p-4 transition-all ${
            isActive(2) || isActive(3) ? 'ring-2 ring-purple-400' : ''
          }`}>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Database size={18} className="text-purple-400" />
              VTEP-1 MAC地址表
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* 本地表项 */}
              <div className="bg-gray-900 rounded p-3">
                <div className="text-purple-400 text-xs font-bold mb-2">本地学习</div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      <th className="text-left py-1">MAC</th>
                      <th className="text-left">VNI</th>
                      <th className="text-left">来源</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className={`border-b border-gray-800 ${isActive(2) ? 'text-green-400' : ''}`}>
                      <td className="py-1">00:11:22:AA:BB:01</td>
                      <td>100</td>
                      <td>VM-A</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-1">00:11:22:AA:BB:02</td>
                      <td>100</td>
                      <td>VM-B</td>
                    </tr>
                    <tr className={`border-b border-gray-800 ${isActive(2) ? 'text-yellow-400' : 'opacity-50'}`}>
                      <td className="py-1">学习中...</td>
                      <td>100</td>
                      <td>ARP</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* 远端表项 */}
              <div className="bg-gray-900 rounded p-3">
                <div className="text-blue-400 text-xs font-bold mb-2">远端VTEP同步 (EVPN)</div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      <th className="text-left py-1">MAC</th>
                      <th className="text-left">VNI</th>
                      <th className="text-left">VTEP</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className={`border-b border-gray-800 ${isActive(3) ? 'text-green-400' : ''}`}>
                      <td className="py-1">00:11:22:CC:DD:02</td>
                      <td>100</td>
                      <td>VTEP-2</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-1">00:11:22:CC:DD:03</td>
                      <td>100</td>
                      <td>VTEP-2</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ===== VXLAN封装格式总览 ===== */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              VXLAN报文封装格式
            </h3>
            <div className="bg-gray-900 rounded p-3">
              <div className="flex items-center justify-center gap-1 text-[10px]">
                <div className="bg-green-700/70 px-2 py-1.5 rounded text-green-200 text-center">
                  Outer Eth<br/>
                  <span className="text-[9px] opacity-70">MAC</span>
                </div>
                <div className="text-gray-500">→</div>
                <div className="bg-blue-700/70 px-2 py-1.5 rounded text-blue-200 text-center">
                  Outer IP<br/>
                  <span className="text-[9px] opacity-70">UDP</span>
                </div>
                <div className="text-gray-500">→</div>
                <div className="bg-indigo-700/70 px-2 py-1.5 rounded text-indigo-200 text-center">
                  UDP<br/>
                  <span className="text-[9px] opacity-70">4789</span>
                </div>
                <div className="text-gray-500">→</div>
                <div className="bg-purple-700/70 px-2 py-1.5 rounded text-purple-200 text-center border-2 border-yellow-400">
                  VXLAN<br/>
                  <span className="text-[9px]">VNI 🔥</span>
                </div>
                <div className="text-gray-500">→</div>
                <div className="bg-gray-600/70 px-2 py-1.5 rounded text-gray-200 text-center">
                  Inner Eth<br/>
                  <span className="text-[9px] opacity-70">原始帧</span>
                </div>
                <div className="text-gray-500">→</div>
                <div className="bg-orange-700/70 px-2 py-1.5 rounded text-orange-200 text-center">
                  Payload<br/>
                  <span className="text-[9px] opacity-70">数据</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}

export default VXLANDetailScene;
