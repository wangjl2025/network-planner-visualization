import { Layout } from '../../components/Layout';
import { SceneCard } from '../../components/SceneCard';
import { scenesByPhase } from '../../data/scenes';
import { BookOpen, Target, Zap, Award } from 'lucide-react';

export function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <div className="mb-10">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            网络规划设计师考试
            <br />
            可视化学习平台
          </h1>
          <p className="text-lg text-blue-100 mb-6 max-w-2xl">
            通过交互式动画和可视化演示，深入理解网络协议原理、数据中心架构和网络规划方法论。
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <BookOpen size={20} />
              <span>120+ 交互式镜头</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <Target size={20} />
              <span>紧扣考试大纲</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <Zap size={20} />
              <span>即时交互反馈</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">5</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">学习阶段</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">130+</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">可视化镜头</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">15+</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">知识分类</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">🔥</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">必考标注</div>
        </div>
      </div>

      {/* Phase 1 Preview */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Phase 1: 核心基础
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              OSPF、BGP、VRRP、Spine-Leaf — 考试必考内容
            </p>
          </div>
          <a
            href="/phase/1"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            查看全部 →
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenesByPhase[1].slice(0, 3).map((scene) => (
            <SceneCard key={scene.id} scene={scene} />
          ))}
        </div>
      </div>

      {/* Phase 2 Preview */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Phase 2: 数据中心
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              机房基础设施、存储技术、两地三中心 — 案例题重点
            </p>
          </div>
          <a
            href="/phase/2"
            className="text-green-600 dark:text-green-400 hover:underline text-sm font-medium"
          >
            查看全部 →
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenesByPhase[2].slice(0, 3).map((scene) => (
            <SceneCard key={scene.id} scene={scene} />
          ))}
        </div>
      </div>

      {/* Phase 5 Preview */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              Phase 5: 基础协议
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              DHCP、DNS、NAT — 网络通信的基石
            </p>
          </div>
          <a
            href="/phase/5"
            className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
          >
            查看全部 →
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenesByPhase[5].slice(0, 3).map((scene) => (
            <SceneCard key={scene.id} scene={scene} />
          ))}
        </div>
      </div>

      {/* Learning Path */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Award className="text-yellow-500" size={28} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">学习路径建议</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">掌握核心协议</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                先学习 OSPF、BGP、VRRP，这些是综合知识考试的重点
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">深入数据中心</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                理解 Spine-Leaf、VXLAN、RAID，为案例题做准备
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">学习规划方法</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                掌握网络生命周期模型，这是论文和案例的核心
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
