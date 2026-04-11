import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { scenes } from '../../data/scenes';

interface SceneNavigationProps {
  currentSceneId: string;
  currentPhase: 1 | 2 | 3 | 4 | 5;
}

export function SceneNavigation({ currentSceneId, currentPhase }: SceneNavigationProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();

  // 获取当前 Phase 的所有场景
  const phaseScenes = useMemo(() => {
    return scenes.filter(s => s.phase === currentPhase);
  }, [currentPhase]);

  // 获取当前场景索引
  const currentIndex = useMemo(() => {
    return phaseScenes.findIndex(s => s.id === currentSceneId);
  }, [phaseScenes, currentSceneId]);

  // 上一个/下一个场景
  const prevScene = currentIndex > 0 ? phaseScenes[currentIndex - 1] : null;
  const nextScene = currentIndex < phaseScenes.length - 1 ? phaseScenes[currentIndex + 1] : null;

  // 场景路径映射
  const getScenePath = (sceneId: string) => {
    const pathMap: Record<string, string> = {
      'ospf-spf': '/scene/ospf-spf',
      'ospf-lsa': '/scene/ospf-lsa',
      'ospf-neighbor': '/scene/ospf-neighbor',
      'bgp-decision': '/scene/bgp-decision',
      'bgp-rr': '/scene/bgp-rr',
      'bgp-fsm': '/scene/bgp-fsm',
      'mpls-l3vpn': '/scene/mpls-l3vpn',
      'srv6-overview': '/scene/srv6-overview',
      'vxlan-detail': '/scene/vxlan-detail',
      'lacp': '/scene/lacp',
      'vxlan': '/scene/vxlan',
      'vrrp-ha': '/scene/vrrp-ha',
      'spine-leaf': '/scene/spine-leaf',
      'isis-overview': '/scene/isis-overview',
      'tier-standard': '/scene/tier-standard',
      'data-center-infra': '/scene/data-center-infra',
      'storage-protocol': '/scene/storage-protocol',
      'raid': '/scene/raid',
      'disaster-recovery': '/scene/disaster-recovery',
      'ipsec-vpn': '/scene/ipsec-vpn',
      'defense-depth': '/scene/defense-depth',
      'wifi6-ofdma': '/scene/wifi6-ofdma',
      'network-lifecycle': '/scene/network-lifecycle',
      'security-compliance': '/scene/security-compliance',
      'sdn-architecture': '/scene/sdn-architecture',
      'roce-rdma': '/scene/roce-rdma',
      'tls-handshake': '/scene/tls-handshake',
      '5g-network-slice': '/scene/5g-network-slice',
      'dhcp': '/scene/dhcp',
      'dns': '/scene/dns',
      'nat': '/scene/nat',
      'ipv6-address': '/scene/ipv6-address',
      'ipv6-transition': '/scene/ipv6-transition',
      'ddos-defense': '/scene/ddos-defense',
      'pki-certificate': '/scene/pki-certificate',
      'pon-access': '/scene/pon-access',
    };
    return pathMap[sceneId] || `/scene/${sceneId}`;
  };

  return (
    <>
      {/* 折叠按钮 - 始终可见 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-r-lg shadow-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 ${
          isExpanded ? 'translate-x-64' : 'translate-x-0'
        }`}
        title={isExpanded ? '收起导航' : '展开导航'}
      >
        {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* 侧边导航栏 */}
      <div
        className={`fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30 transition-transform duration-300 overflow-hidden ${
          isExpanded ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Phase 标题 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <BookOpen size={16} />
            <span>Phase {currentPhase}</span>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {currentPhase === 1 && '核心基础'}
            {currentPhase === 2 && '数据中心'}
            {currentPhase === 3 && '网络安全'}
            {currentPhase === 4 && '新技术'}
            {currentPhase === 5 && '基础协议'}
          </h2>
        </div>

        {/* 场景列表 */}
        <div className="overflow-y-auto h-[calc(100%-180px)]">
          {phaseScenes.map((scene, index) => {
            const isActive = scene.id === currentSceneId;
            const isCompleted = index < currentIndex;
            const isPending = index > currentIndex;

            return (
              <Link
                key={scene.id}
                to={getScenePath(scene.id)}
                className={`block px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                    : 'border-l-4 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 状态指示器 */}
                  <div className="mt-0.5 flex-shrink-0">
                    {isActive ? (
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    ) : isCompleted ? (
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                    )}
                  </div>

                  {/* 场景信息 */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      isActive 
                        ? 'text-blue-700 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {scene.title.split('：')[0]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
                      {scene.category}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 上一篇/下一篇 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex gap-2">
            {prevScene ? (
              <Link
                to={getScenePath(prevScene.id)}
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-center"
              >
                ← 上一篇
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextScene ? (
              <Link
                to={getScenePath(nextScene.id)}
                className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                下一篇 →
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
      </div>

      {/* 遮罩层 - 移动端点击关闭 */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
