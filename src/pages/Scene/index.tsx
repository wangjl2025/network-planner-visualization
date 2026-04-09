import { useParams, Navigate } from 'react-router-dom';
import { scenes } from '../../data/scenes';

// 已实现场景的ID列表
const IMPLEMENTED_SCENES = [
  'ospf-spf',
  'ospf-lsa',
  'ospf-neighbor',
  'bgp-fsm',
  'isis-overview',
  'bgp-rr',
  'mpls-l3vpn',
  'srv6-overview',
  'vxlan-detail',
  'vrrp-ha',
  'spine-leaf',
  'tier-standard',
  'datacenter-infra',
  'raid',
  'disaster-recovery',
  'storage-protocol',
  'ipsec-vpn',
  'defense-depth',
  'wifi6-ofdma',
  'network-lifecycle',
  'sdn-architecture',
  'roce-rdma',
];

export function Scene() {
  const { id } = useParams<{ id: string }>();
  const scene = scenes.find((s) => s.id === id);

  // 如果是已实现的场景，直接重定向到具体路由
  if (id && IMPLEMENTED_SCENES.includes(id)) {
    return <Navigate to={`/scene/${id}`} replace />;
  }

  // 未实现的场景显示开发中
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          🚧 镜头开发中
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          「{scene?.title || id}」正在开发中，敬请期待
        </p>
        <a
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
