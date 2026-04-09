import { Link } from 'react-router-dom';
import { Play, Clock, Layers } from 'lucide-react';

// Scene 类型定义（内联避免模块导入问题）
interface Scene {
  id: string;
  title: string;
  description: string;
  phase: 1 | 2 | 3 | 4;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: string;
  isHot?: boolean;
}

interface SceneCardProps {
  scene: Scene;
}

const phaseColors = {
  1: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  2: 'border-green-500 bg-green-50 dark:bg-green-900/20',
  3: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
  4: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
};

const phaseBadges = {
  1: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  2: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  3: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  4: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
};

export function SceneCard({ scene }: SceneCardProps) {
  return (
    <Link
      to={`/scene/${scene.id}`}
      className={`group block p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
        phaseColors[scene.phase]
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            phaseBadges[scene.phase]
          }`}
        >
          Phase {scene.phase}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Layers size={12} />
          {scene.category}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {scene.title}
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {scene.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock size={14} />
          <span>5-10分钟</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
          <Play size={16} />
          <span>开始学习</span>
        </div>
      </div>
    </Link>
  );
}
