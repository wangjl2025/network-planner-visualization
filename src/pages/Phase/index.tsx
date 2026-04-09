import { useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { SceneCard } from '../../components/SceneCard';
import { scenesByPhase } from '../../data/scenes';
import { BookOpen, Layers, Grid, Cpu, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const phaseInfo = {
  1: {
    name: 'Phase 1',
    title: '核心基础',
    description: '动态路由协议、高可用技术、网络安全基础 — 约占综合知识30%',
    icon: BookOpen,
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  2: {
    name: 'Phase 2',
    title: '数据中心',
    description: '网络架构、基础设施、存储技术、容灾设计 — 约占综合知识25% + 案例30%',
    icon: Layers,
    color: 'green',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-600 dark:text-green-400',
  },
  3: {
    name: 'Phase 3',
    title: '扩展整合',
    description: 'SDN/NFV、云计算、无线网络、规划方法论',
    icon: Grid,
    color: 'purple',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  4: {
    name: 'Phase 4',
    title: '高级前沿',
    description: 'RoCE、AIOps、IPv6+ — 选考内容，拉分点',
    icon: Cpu,
    color: 'orange',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
};

export function Phase() {
  const { id } = useParams<{ id: string }>();
  const phaseId = parseInt(id || '1') as 1 | 2 | 3 | 4;
  const info = phaseInfo[phaseId];
  const scenes = scenesByPhase[phaseId] || [];
  const Icon = info.icon;

  return (
    <Layout>
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft size={18} />
        <span>返回首页</span>
      </Link>

      {/* Phase Header */}
      <div className={`${info.bgColor} ${info.borderColor} border rounded-2xl p-8 mb-8`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-white dark:bg-gray-800 ${info.textColor}`}>
            <Icon size={32} />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${info.textColor} mb-2`}>
              {info.name}: {info.title}
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-lg">
              {info.description}
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            学习进度
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            0 / {scenes.length} 完成
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 bg-${info.color}-500`}
            style={{ width: '0%' }}
          />
        </div>
      </div>

      {/* Scenes Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          学习镜头 ({scenes.length})
        </h2>
        {scenes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((scene) => (
              <SceneCard key={scene.id} scene={scene} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>该阶段内容正在开发中...</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
