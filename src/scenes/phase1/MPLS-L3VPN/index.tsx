import { useState, useEffect, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, Server, ArrowRight, Globe, Layers, Shield, MapPin } from 'lucide-react';

// MPLS L3VPN场景
export function MPLSL3VPNScene() {
  // 场景数据
  const scene = {
    id: 'mpls-l3vpn',
    title: 'MPLS L3VPN',
    description: 'MPLS三层VPN原理与数据转发流程，展示RD/RT、VPNv4路由、标签栈封装',
    phase: 1 as const,
    category: 'MPLS技术',
    difficulty: 'hard' as const,
    duration: '8-10分钟',
  };

  // 状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showLabels, setShowLabels] = useState(true);

  // 步骤定义 - 增强版
  const steps = [
    { 
      id: 'intro', 
      title: 'MPLS L3VPN三层架构', 
      description: 'CE-PE-P三层架构，PE设备维护独立的VRF路由表实现跨域VPN',
      detail: '• CE（Customer Edge）：用户边缘设备，通过IGP/BGP连接PE\n• PE（Provider Edge）：服务商边缘，负责VRF绑定、VPNv4路由交换\n• P（Provider）：核心路由器，仅运行MPLS，不维护VPN路由'
    },
    { 
      id: 'rd', 
      title: 'RD路由区分符', 
      description: 'RD将重叠的IPv4路由转换为唯一的VPNv4路由',
      detail: '• 问题：不同Site可以使用相同的私网地址段\n• 解决：RD（Route Distinguisher）= 8字节标识符\n• 格式：AS:NN（100:1）或 IP:NN（192.168.1.1:1）\n• VPNv4 = RD（8字节）+ IPv4（4字节）= 12字节唯一路由'
    },
    { 
      id: 'rt', 
      title: 'RT路由目标', 
      description: 'RT控制VPN路由的导入/导出，实现灵活的VPN拓扑',
      detail: '• Export RT：本地VRF导出路由时附加的BGP扩展团体属性\n• Import RT：PE接收VPNv4路由时，只有RT匹配的才会导入VRF\n• Full-Mesh：所有站点使用相同的Import/Export RT\n• Hub-Spoke：Hub站点配置不同的RT实现集中流量控制'
    },
    { 
      id: 'signaling', 
      title: 'MP-BGP信令交换', 
      description: 'MP-BGP在PE之间传递VPNv4路由，建立跨域VPN连接',
      detail: '• MP-BGP（Multiprotocol BGP）：BGP的VPN扩展能力\n• VPNv4路由携带：RD、RT、下一跳（PE地址）、隧道标签\n• LDP/RSVP：为LSP分发内层/外层隧道标签\n• 路由交换流程：PE1发布 → MP-BGP → PE2接收验证RT后导入'
    },
    { 
      id: 'forwarding', 
      title: '双层标签数据转发', 
      description: '数据包使用两层标签：外层LDP隧道标签 + 内层VPN标签',
      detail: '• CE-A发出IP包（目的：192.168.1.0/24）\n• PE1压入双层标签：[外层LDP][内层VPN]\n• P路由器：只查外层LDP标签交换转发（PHP倒数第二跳弹出）\n• PE2：弹出LDP标签，查看VPN标签 → 找到VRF_A\n• PE2剥离VPN标签，将原始IP包转发给CE-B\n\n📌 标签栈顺序：外层LDP先被处理，内层VPN后被处理'
    },
  ];

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
    }, 3000);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // 重置
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  return (
    <SceneLayout
      scene={scene}
      showSidebar={false}
    >
      <div className="h-full overflow-y-auto">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setIsPlaying(prev => !prev);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <RotateCcw size={18} />
            重置
          </button>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded"
            />
            显示标签栈
          </label>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          步骤: {currentStep + 1} / {steps.length}
        </div>
      </div>

      {/* 主内容区 - 左侧拓扑 + 右侧信息 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：网络拓扑 + 步骤说明 + VPN拓扑卡片 */}
        <div className="col-span-2 space-y-4">
          {/* 拓扑图卡片 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <Globe size={20} />
              MPLS L3VPN 网络架构
            </h3>

            {/* 网络拓扑图 */}
            <div className="relative h-80 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            {/* 背景高亮区域 - MPLS骨干网 */}
            <div className={`absolute inset-4 rounded-lg transition-all duration-500 ${
              currentStep >= 2 ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-700' : ''
            }`}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-100 dark:bg-indigo-800 rounded-b-lg text-xs font-medium text-indigo-700 dark:text-indigo-200">
                MPLS 骨干网 (AS 100)
              </div>
            </div>

            {/* Site A - CE */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <div className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                currentStep === 0 || currentStep >= 4 ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={20} className={currentStep === 0 || currentStep >= 4 ? 'text-blue-600' : 'text-gray-600'} />
                <span className="text-xs font-medium">CE-A</span>
                <span className="text-[10px] text-gray-500">192.168.1.0/24</span>
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500">Site A</span>
              </div>
            </div>

            {/* PE1 */}
            <div className="absolute left-32 top-1/2 -translate-y-1/2 z-10">
              <div className={`w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-500 ${
                currentStep >= 1 ? 'bg-purple-100 border-purple-500 shadow-lg shadow-purple-200' : 'bg-white border-gray-300'
              }`}>
                <Server size={24} className={currentStep >= 1 ? 'text-purple-600' : 'text-gray-600'} />
                <span className="text-sm font-medium">PE1</span>
                <span className="text-[10px] text-gray-500">VRF: VPN_A</span>
              </div>
              {/* RD标签 */}
              <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300 ${
                currentStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              }`}>
                <div className="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                  RD: 100:1
                </div>
              </div>
            </div>

            {/* P Router */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-500 ${
                currentStep >= 3 ? 'bg-yellow-100 border-yellow-400 shadow-lg shadow-yellow-200' : 'bg-gray-100 border-gray-400'
              }`}>
                <Server size={20} className={currentStep >= 3 ? 'text-yellow-600' : 'text-gray-600'} />
                <span className="text-xs font-medium">P</span>
                <span className="text-[10px] text-gray-500">核心</span>
              </div>
              {/* P设备标签 */}
              {currentStep >= 3 && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-yellow-600">
                  LDP LSP
                </div>
              )}
            </div>

            {/* PE2 */}
            <div className="absolute right-32 top-1/2 -translate-y-1/2 z-10">
              <div className={`w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-500 ${
                currentStep >= 2 ? 'bg-purple-100 border-purple-500 shadow-lg shadow-purple-200' : 'bg-white border-gray-300'
              }`}>
                <Server size={24} className={currentStep >= 2 ? 'text-purple-600' : 'text-gray-600'} />
                <span className="text-sm font-medium">PE2</span>
                <span className="text-[10px] text-gray-500">VRF: VPN_A</span>
              </div>
              {/* RD标签 */}
              <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300 ${
                currentStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              }`}>
                <div className="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                  RD: 100:1
                </div>
              </div>
            </div>

            {/* Site B - CE */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
              <div className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                currentStep >= 4 ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={20} className={currentStep >= 4 ? 'text-blue-600' : 'text-gray-600'} />
                <span className="text-xs font-medium">CE-B</span>
                <span className="text-[10px] text-gray-500">192.168.1.0/24</span>
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500">Site B</span>
              </div>
            </div>

            {/* 连接线 - CE到PE */}
            <div className={`absolute left-20 top-1/2 w-12 h-0.5 transition-all duration-500 ${
              currentStep === 0 || currentStep >= 4 ? 'bg-blue-400' : 'bg-gray-300'
            }`} />
            <div className={`absolute right-20 top-1/2 w-12 h-0.5 transition-all duration-500 ${
              currentStep >= 4 ? 'bg-blue-400' : 'bg-gray-300'
            }`} />

            {/* PE到P连接线 */}
            <div className={`absolute left-52 top-1/2 right-52 h-0.5 transition-all duration-500 ${
              currentStep >= 3 ? 'bg-yellow-400' : 'bg-gray-300'
            }`}>
              {/* 标签栈动画 */}
              {showLabels && currentStep >= 3 && (
                <div className="absolute top-1/2 -translate-y-1/2 left-1/4 animate-pulse">
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded shadow">LDP: 1024</div>
                    {currentStep >= 4 && <div className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded shadow">VPN: 17</div>}
                  </div>
                </div>
              )}
            </div>

            {/* MP-BGP连接 - 虚线 - 移到底部避免挡住骨干网文字 */}
            <div className={`absolute left-40 right-40 h-0.5 transition-all duration-500 ${
              currentStep >= 3 ? 'border-t-2 border-dashed border-purple-400 opacity-100' : 'border-t border-gray-200 opacity-0'
            }`} style={{ top: '75%' }}>
              <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 transition-all duration-300 ${
                currentStep >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}>
                <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] px-2 py-1 rounded shadow whitespace-nowrap">
                  <ArrowRight size={10} />
                  MP-BGP VPNv4
                </div>
              </div>
            </div>

            {/* Step 0: CE-A发送数据包动画 */}
            <div className="absolute left-20 top-1/2 -translate-y-1/2">
              <div 
                className={`transition-all duration-500 ${
                  currentStep === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
              >
                <div className="relative">
                  {/* CE-A数据标签 */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded shadow animate-pulse">
                      IP包
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Step 3: PE1到P的数据包 - 沿连接线移动 */}
            <div 
              className={`absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ${
                currentStep >= 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{
                left: currentStep === 3 ? '30%' : currentStep >= 4 ? '70%' : '30%',
                transitionProperty: 'left, opacity'
              }}
            >
              <div className="relative">
                {/* 双层标签栈 */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
                  <div className={`bg-green-500 text-white text-[10px] px-2 py-0.5 rounded shadow transition-all duration-300 ${
                    currentStep >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}>
                    LDP: 1024
                  </div>
                  <div className={`bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded shadow transition-all duration-300 ${
                    currentStep >= 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`} style={{ transitionDelay: '0.2s' }}>
                    VPN: 17
                  </div>
                </div>
                {/* 数据包主体 */}
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-blue-500 shadow-lg shadow-green-500/30 animate-pulse flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/50" />
                </div>
              </div>
            </div>

            {/* Step 4: CE-B接收数据包 */}
            <div className="absolute right-20 top-1/2 -translate-y-1/2">
              <div 
                className={`transition-all duration-500 ${
                  currentStep >= 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
              >
                <div className="relative">
                  {/* CE-B数据标签 */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded shadow animate-pulse">
                      IP包
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse" />
                </div>
              </div>
            </div>

            {/* VPN标识 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs shadow">
                  <Shield size={12} />
                  VPN Instance A
                </div>
                <div className={`text-[10px] text-gray-500 transition-all duration-300 ${
                  currentStep >= 2 ? 'opacity-100' : 'opacity-0'
                }`}>
                  RT Import/Export: 100:100
                </div>
              </div>
            </div>

            {/* 步骤进度指示器 */}
            <div className="absolute bottom-4 right-4 flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === currentStep ? 'bg-blue-500 w-4' : i < currentStep ? 'bg-blue-300' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          </div>

          {/* 步骤说明 - 增强版 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">{currentStep + 1}</span>
              {steps[currentStep].title}
            </h4>
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
              {steps[currentStep].description}
            </p>
            {/* 详细说明 - 支持换行 */}
            <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
              {steps[currentStep].detail}
            </div>
          </div>

          {/* VPN拓扑类型 - 紧凑三列 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">Full-Mesh</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                所有站点互通，使用相同的Import/Export RT
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">Hub-Spoke</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Spoke通过Hub互访，Hub站点使用不同的RT策略
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">Extranet</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                跨VPN访问，通过RT的精细控制实现
              </p>
            </div>
          </div>
        </div>

        {/* 右侧：信息面板 - 步骤联动 */}
        <div className="space-y-4">
          {/* RD/RT说明 - 根据步骤高亮 */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-all duration-300 ${
            currentStep === 1 ? 'ring-2 ring-purple-400' : currentStep === 2 ? 'ring-2 ring-blue-400' : ''
          }`}>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Layers size={18} className="text-purple-500" />
              RD与RT
            </h4>
            <div className="space-y-3">
              <div className={`p-3 rounded transition-all duration-300 ${
                currentStep >= 1 ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-700/50'
              }`}>
                <div className={`font-medium text-sm transition-colors ${
                  currentStep >= 1 ? 'text-purple-900 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  RD (Route Distinguisher)
                </div>
                <div className={`text-xs mt-1 transition-colors ${
                  currentStep >= 1 ? 'text-purple-800 dark:text-purple-200' : 'text-gray-500 dark:text-gray-500'
                }`}>
                  • 格式: AS:NN 或 IP:NN<br/>
                  • RD = 8字节（64位）<br/>
                  • VPNv4 = RD(8B) + IPv4(4B) = 12B
                </div>
              </div>
              <div className={`p-3 rounded transition-all duration-300 ${
                currentStep >= 2 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700/50'
              }`}>
                <div className={`font-medium text-sm transition-colors ${
                  currentStep >= 2 ? 'text-blue-900 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  RT (Route Target)
                </div>
                <div className={`text-xs mt-1 transition-colors ${
                  currentStep >= 2 ? 'text-blue-800 dark:text-blue-200' : 'text-gray-500 dark:text-gray-500'
                }`}>
                  • Export RT: 发布路由时附加<br/>
                  • Import RT: 接收匹配路由<br/>
                  • 控制VPN拓扑
                </div>
              </div>
            </div>
          </div>

          {/* 标签栈 - 步骤联动 */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-all duration-300 ${
            currentStep >= 3 ? 'ring-2 ring-green-400' : ''
          }`}>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">标签栈结构</h4>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 p-2 rounded transition-all duration-300 ${
                currentStep >= 3 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700/50'
              }`}>
                <div className={`w-4 h-4 rounded transition-colors ${
                  currentStep >= 3 ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <div className="text-sm">
                  <div className={`font-medium transition-colors ${
                    currentStep >= 3 ? 'text-green-900 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'
                  }`}>外层标签 (LDP/RSVP)</div>
                  <div className={`text-xs transition-colors ${
                    currentStep >= 3 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500'
                  }`}>隧道转发，PE→P→PE</div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight size={14} className="text-gray-400 rotate-90" />
              </div>
              <div className={`flex items-center gap-2 p-2 rounded transition-all duration-300 ${
                currentStep >= 4 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700/50'
              }`}>
                <div className={`w-4 h-4 rounded transition-colors ${
                  currentStep >= 4 ? 'bg-blue-500' : 'bg-gray-400'
                }`} />
                <div className="text-sm">
                  <div className={`font-medium transition-colors ${
                    currentStep >= 4 ? 'text-blue-900 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                  }`}>内层标签 (VPN)</div>
                  <div className={`text-xs transition-colors ${
                    currentStep >= 4 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500'
                  }`}>查找VRF，确定目标站点</div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight size={14} className="text-gray-400 rotate-90" />
              </div>
              <div className={`flex items-center gap-2 p-2 rounded transition-all duration-300 ${
                currentStep >= 4 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'
              }`}>
                <div className="w-4 h-4 rounded bg-gray-400" />
                <div className="text-sm">
                  <div className="font-medium text-gray-700 dark:text-gray-300">原始IP包</div>
                  <div className="text-xs text-gray-500">CE到CE的用户数据</div>
                </div>
              </div>
              {/* 标签栈处理顺序说明 */}
              {currentStep >= 3 && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-700">
                  <div className="text-[10px] text-amber-700 dark:text-amber-300">
                    <div className="font-medium mb-1">📌 处理顺序：</div>
                    <div>1️⃣ P设备：查外层LDP → 交换标签 → 转发</div>
                    <div>2️⃣ PE设备：弹出外层 → 查内层VPN → 剥离标签 → 转发IP</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 配置示例 */}
          <div className="bg-gray-900 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-100 mb-3">配置示例</h4>
            <pre className="text-xs text-green-400 overflow-x-auto">
{`! PE1配置
ip vpn-instance VPN_A
 rd 100:1
 vpn-target 100:100 export-extcommunity
 vpn-target 100:100 import-extcommunity
!
interface Gig0/0/1
 ip binding vpn-instance VPN_A
 ip address 10.1.1.1 255.255.255.0
!
router bgp 100
 peer 2.2.2.2 as-number 100
 #
 ipv4-family vpnv4
  peer 2.2.2.2 enable
 #
 ipv4-family vpn-instance VPN_A
  peer 10.1.1.2 as-number 65001`}
            </pre>
          </div>
        </div>
      </div>
      </div>
    </SceneLayout>
  );
}
