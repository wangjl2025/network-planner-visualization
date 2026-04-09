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

  // 步骤定义
  const steps = [
    { id: 'intro', title: 'MPLS L3VPN架构', description: 'CE-PE-P三层架构，PE维护独立的VRF路由表' },
    { id: 'rd', title: 'RD路由区分符', description: 'RD将IPv4路由转换为VPNv4路由，解决地址重叠问题' },
    { id: 'rt', title: 'RT路由目标', description: 'RT控制VPN路由的导入导出，实现VPN拓扑' },
    { id: 'signaling', title: '信令协议', description: 'MP-BGP传递VPNv4路由，LDP/RSVP建立标签隧道' },
    { id: 'forwarding', title: '数据转发', description: '双层标签：外层LDP标签+内层VPN标签' },
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

      {/* 主内容区 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：网络拓扑 */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Globe size={20} />
            MPLS L3VPN 网络架构
          </h3>

          {/* 网络拓扑图 */}
          <div className="relative h-96 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            {/* Site A - CE */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <div className="w-16 h-16 rounded-lg bg-blue-100 border-2 border-blue-500 flex flex-col items-center justify-center">
                <Server size={20} className="text-blue-600" />
                <span className="text-xs font-medium">CE-A</span>
                <span className="text-[10px] text-gray-500">192.168.1.0/24</span>
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500">Site A</span>
              </div>
            </div>

            {/* PE1 */}
            <div className="absolute left-32 top-1/2 -translate-y-1/2">
              <div className={`w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                currentStep >= 1 ? 'bg-purple-100 border-purple-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={24} className={currentStep >= 1 ? 'text-purple-600' : 'text-gray-600'} />
                <span className="text-sm font-medium">PE1</span>
                <span className="text-[10px] text-gray-500">VRF: VPN_A</span>
              </div>
              {/* VRF标签 */}
              {currentStep >= 1 && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <div className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    RD: 100:1
                  </div>
                </div>
              )}
            </div>

            {/* P Router */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-400 flex flex-col items-center justify-center">
                <Server size={20} className="text-gray-600" />
                <span className="text-xs font-medium">P</span>
                <span className="text-[10px] text-gray-500">核心</span>
              </div>
            </div>

            {/* PE2 */}
            <div className="absolute right-32 top-1/2 -translate-y-1/2">
              <div className={`w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                currentStep >= 1 ? 'bg-purple-100 border-purple-500' : 'bg-white border-gray-300'
              }`}>
                <Server size={24} className={currentStep >= 1 ? 'text-purple-600' : 'text-gray-600'} />
                <span className="text-sm font-medium">PE2</span>
                <span className="text-[10px] text-gray-500">VRF: VPN_A</span>
              </div>
              {/* VRF标签 */}
              {currentStep >= 1 && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <div className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    RD: 100:1
                  </div>
                </div>
              )}
            </div>

            {/* Site B - CE */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-16 h-16 rounded-lg bg-blue-100 border-2 border-blue-500 flex flex-col items-center justify-center">
                <Server size={20} className="text-blue-600" />
                <span className="text-xs font-medium">CE-B</span>
                <span className="text-[10px] text-gray-500">192.168.1.0/24</span>
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500">Site B</span>
              </div>
            </div>

            {/* 公网/骨干网标识 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-sm font-medium text-indigo-700 dark:text-indigo-300">
                MPLS 骨干网 (AS 100)
              </div>
            </div>

            {/* 连接线 - CE到PE */}
            <div className="absolute left-20 top-1/2 w-12 h-0.5 bg-blue-300" />
            <div className="absolute right-20 top-1/2 w-12 h-0.5 bg-blue-300" />

            {/* 连接线 - PE到P */}
            <div className="absolute left-52 top-1/2 right-52 h-0.5 bg-gray-300">
              {/* 标签栈动画 */}
              {showLabels && currentStep >= 4 && (
                <div className="absolute top-1/2 -translate-y-1/2 left-1/4 animate-pulse">
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded">LDP: 1024</div>
                    <div className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded">VPN: 17</div>
                  </div>
                </div>
              )}
            </div>

            {/* MP-BGP连接 - 虚线 */}
            {currentStep >= 3 && (
              <div className="absolute left-40 right-40 top-20 h-0.5 border-t-2 border-dashed border-purple-400">
                <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded">
                    <ArrowRight size={10} />
                    MP-BGP VPNv4
                  </div>
                </div>
              </div>
            )}

            {/* VPN标识 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  <Shield size={12} />
                  VPN Instance A
                </div>
                {currentStep >= 2 && (
                  <div className="text-[10px] text-gray-500">
                    RT Import/Export: 100:100
                  </div>
                )}
              </div>
            </div>
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
          {/* RD/RT说明 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Layers size={18} className="text-purple-500" />
              RD与RT
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                <div className="font-medium text-purple-900 dark:text-purple-300 text-sm">RD (Route Distinguisher)</div>
                <div className="text-xs text-purple-800 dark:text-purple-200 mt-1">
                  • 格式: AS:NN 或 IP:NN<br/>
                  • 作用: 区分相同IPv4地址<br/>
                  • VPNv4地址: RD + IPv4
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div className="font-medium text-blue-900 dark:text-blue-300 text-sm">RT (Route Target)</div>
                <div className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                  • Export RT: 发布路由时附加<br/>
                  • Import RT: 接收匹配路由<br/>
                  • 控制VPN拓扑（Full-mesh/Hub-Spoke）
                </div>
              </div>
            </div>
          </div>

          {/* 标签栈 */}
          {showLabels && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">标签栈结构</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <div className="text-sm">
                    <div className="font-medium">外层标签 (LDP/RSVP)</div>
                    <div className="text-xs text-gray-500">用于PE到PE的隧道</div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight size={16} className="text-gray-400 rotate-90" />
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <div className="text-sm">
                    <div className="font-medium">内层标签 (VPN)</div>
                    <div className="text-xs text-gray-500">标识目标VRF</div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight size={16} className="text-gray-400 rotate-90" />
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <div className="w-4 h-4 rounded bg-gray-400" />
                  <div className="text-sm">
                    <div className="font-medium">原始IP包</div>
                    <div className="text-xs text-gray-500">用户数据</div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
 peer 2.2.2.2 connect-interface Loop0
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

      {/* 底部：VPN拓扑类型 */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Full-Mesh</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            所有站点互通，使用相同的Import/Export RT
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Hub-Spoke</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Spoke通过Hub互访，Hub站点使用不同的RT策略
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Extranet</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            跨VPN访问，通过RT的精细控制实现
          </p>
        </div>
      </div>
      </div>
    </SceneLayout>
  );
}
