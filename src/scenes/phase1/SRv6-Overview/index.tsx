import { useState, useEffect, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, Server, ArrowRight, Globe, Layers, MapPin, Route } from 'lucide-react';

// SRv6概览场景
export function SRv6OverviewScene() {
  // 场景数据
  const scene = {
    id: 'srv6-overview',
    title: 'SRv6概览',
    description: 'Segment Routing over IPv6原理与优势，展示Segment List、SRH扩展头、源路由编程',
    phase: 1 as const,
    category: 'SRv6技术',
    difficulty: 'hard' as const,
    duration: '8-10分钟',
  };

  // 状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [customPath, setCustomPath] = useState<string[]>(['R2', 'R4', 'R6']);

  // 步骤定义
  const steps = [
    { id: 'intro', title: 'SRv6简介', description: '基于IPv6的段路由技术，使用源路由实现显式路径控制' },
    { id: 'srh', title: 'SRH扩展头', description: 'Segment Routing Header携带段列表和指针，指导报文转发' },
    { id: 'segments', title: 'Segment类型', description: 'Prefix Segment、Adjacency Segment、Binding Segment三种类型' },
    { id: 'forwarding', title: '数据转发', description: '目的地址不断变换，逐跳处理Segment List' },
    { id: 'advantages', title: 'SRv6优势', description: '简化协议、原生IPv6、灵活编程、支持网络切片' },
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
    setCustomPath(['R2', 'R4', 'R6']);
  }, []);

  // 可用路由器
  const routers = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

  // 添加段到路径
  const addSegment = (router: string) => {
    if (customPath.length < 5) {
      setCustomPath([...customPath, router]);
    }
  };

  // 移除最后一个段
  const removeLastSegment = () => {
    if (customPath.length > 0) {
      setCustomPath(customPath.slice(0, -1));
    }
  };

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
            onClick={() => setIsPlaying(!isPlaying)}
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

        <div className="text-sm text-gray-600 dark:text-gray-400">
          步骤: {currentStep + 1} / {steps.length}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：网络拓扑 */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Route size={20} />
            SRv6 源路由路径编程
          </h3>

          {/* 网络拓扑图 */}
          <div className="relative h-80 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            {/* 源节点 R1 */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <div className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                currentStep >= 0 ? 'bg-green-100 border-green-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={20} className={currentStep >= 0 ? 'text-green-600' : 'text-gray-600'} />
                <span className="text-xs font-medium">R1</span>
                <span className="text-[10px] text-gray-500">源节点</span>
              </div>
            </div>

            {/* 中间节点 */}
            <div className="absolute left-1/4 top-1/4">
              <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                customPath.includes('R2') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={18} className="text-gray-600" />
                <span className="text-xs font-medium">R2</span>
              </div>
            </div>

            <div className="absolute left-1/4 bottom-1/4">
              <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                customPath.includes('R3') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={18} className="text-gray-600" />
                <span className="text-xs font-medium">R3</span>
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                customPath.includes('R4') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={18} className="text-gray-600" />
                <span className="text-xs font-medium">R4</span>
              </div>
            </div>

            <div className="absolute right-1/4 top-1/4">
              <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                customPath.includes('R5') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={18} className="text-gray-600" />
                <span className="text-xs font-medium">R5</span>
              </div>
            </div>

            <div className="absolute right-1/4 bottom-1/4">
              <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                customPath.includes('R6') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={18} className="text-gray-600" />
                <span className="text-xs font-medium">R6</span>
              </div>
            </div>

            {/* 目的节点 */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-16 h-16 rounded-full bg-purple-100 border-2 border-purple-500 flex flex-col items-center justify-center">
                <Server size={20} className="text-purple-600" />
                <span className="text-xs font-medium">R7</span>
                <span className="text-[10px] text-gray-500">目的</span>
              </div>
            </div>

            {/* 连接线 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* 路径高亮 */}
              {currentStep >= 3 && (
                <path
                  d="M 80 160 L 140 80 L 280 160 L 420 80 L 520 160"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3"
                  strokeDasharray="8,4"
                  className="animate-pulse"
                />
              )}
            </svg>

            {/* SRH 展示 */}
            {currentStep >= 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-lg p-3 border border-indigo-300">
                  <div className="text-xs font-medium text-indigo-900 dark:text-indigo-300 mb-2">SRH (Segment Routing Header)</div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] bg-white dark:bg-gray-800 px-2 py-1 rounded">Next Header</div>
                    <div className="text-[10px] bg-white dark:bg-gray-800 px-2 py-1 rounded">Length</div>
                    <div className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded font-medium">Segments Left: {customPath.length}</div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {customPath.map((seg, idx) => (
                      <div key={idx} className={`text-[10px] px-2 py-1 rounded flex items-center gap-2 ${
                        idx === 0 ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <span className="text-gray-500">[{idx}]</span>
                        <span className="font-mono">{seg}::/128</span>
                        {idx === 0 && <span className="text-green-700 text-[9px]">当前活跃</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 目的地址变换动画 */}
            {currentStep >= 3 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">目的地址:</span>
                  <span className="font-mono bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                    {customPath[0] || 'R7'}::/128
                  </span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span className="text-gray-400">逐跳更新</span>
                </div>
              </div>
            )}
          </div>

          {/* 步骤说明 */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              {steps[currentStep].title}
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* 右侧：信息面板 */}
        <div className="space-y-4">
          {/* Segment类型 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Layers size={18} className="text-indigo-500" />
              Segment类型
            </h4>
            <div className="space-y-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div className="font-medium text-blue-900 dark:text-blue-300 text-sm">Prefix Segment (节点段)</div>
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  标识节点，全局可见，最短路径转发
                </div>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="font-medium text-green-900 dark:text-green-300 text-sm">Adjacency Segment (邻接段)</div>
                <div className="text-xs text-green-800 dark:text-green-200">
                  标识链路，本地有效，显式指定下一跳
                </div>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                <div className="font-medium text-purple-900 dark:text-purple-300 text-sm">Binding Segment (绑定段)</div>
                <div className="text-xs text-purple-800 dark:text-purple-200">
                  绑定到路径或隧道，用于路径聚合
                </div>
              </div>
            </div>
          </div>

          {/* 自定义路径 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">自定义Segment List</h4>
            <div className="flex flex-wrap gap-1 mb-3">
              {customPath.map((seg, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded">
                    {seg}
                  </span>
                  {idx < customPath.length - 1 && (
                    <ArrowRight size={12} className="text-gray-400 mx-1" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {routers.filter(r => r !== 'R1' && r !== 'R7').map(router => (
                <button
                  key={router}
                  onClick={() => addSegment(router)}
                  disabled={customPath.includes(router) || customPath.length >= 5}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                >
                  + {router}
                </button>
              ))}
            </div>
            <button
              onClick={removeLastSegment}
              disabled={customPath.length === 0}
              className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded disabled:opacity-50"
            >
              移除最后一个
            </button>
          </div>

          {/* SRv6 vs MPLS对比 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">SRv6 vs MPLS</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">控制平面</span>
                <span className="font-medium">IGP/BGP (无需LDP/RSVP)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">数据平面</span>
                <span className="font-medium">原生IPv6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">扩展性</span>
                <span className="font-medium">128bit地址空间</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">部署成本</span>
                <span className="font-medium">低 (无需标签栈)</span>
              </div>
            </div>
          </div>

          {/* 配置示例 */}
          <div className="bg-gray-900 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-100 mb-3">配置示例</h4>
            <pre className="text-xs text-green-400 overflow-x-auto">
{`! 启用SRv6
segment-routing ipv6
 encapsulation source-address 2001:DB8::1
 locator MAIN ipv6-prefix 2001:DB8:1::/64
!
! 定义Segment List
segment-list PATH-A
 index 10 ipv6-address 2001:DB8:2::/128
 index 20 ipv6-address 2001:DB8:4::/128
 index 30 ipv6-address 2001:DB8:6::/128
!
! 创建SR Policy
sr-policy POLICY-1
 color 100 end-point 2001:DB8:7::1
 candidate-paths
  preference 100
   segment-list PATH-A`}
            </pre>
          </div>
        </div>
      </div>

      {/* 底部：应用场景 */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">5G承载</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            支持网络切片，满足5G低时延需求
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">云网融合</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            统一承载，简化云数据中心互联
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">流量工程</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            显式路径控制，实现精细化调度
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">VPN业务</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            L3VPN over SRv6，简化部署
          </p>
        </div>
      </div>
      </div>
    </SceneLayout>
  );
}
