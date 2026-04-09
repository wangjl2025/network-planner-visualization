import type { ReactNode } from 'react';
import { ArrowLeft, Clock, Target, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimationPlayer, type AnimationStep } from '../AnimationPlayer';
import { ParameterPanel, type Parameter } from '../ParameterPanel';

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

// AnimationPlayerProps 内联定义
interface AnimationPlayerProps {
  steps: AnimationStep[];
  currentStep: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepChange: (step: number) => void;
  onReset: () => void;
  progress?: number;
}

// ParameterPanelProps 内联定义
interface ParameterPanelProps {
  parameters: Parameter[];
  onChange: (id: string, value: number | string | boolean) => void;
  onReset?: () => void;
  title?: string;
}

export interface SceneLayoutProps {
  scene: Scene;
  children: ReactNode;
  animationProps?: AnimationPlayerProps;
  parameterProps?: ParameterPanelProps;
  showSidebar?: boolean;
  fullHeight?: boolean;
}

export function SceneLayout({
  scene,
  children,
  animationProps,
  parameterProps,
  showSidebar = true,
  fullHeight = false,
}: SceneLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Link
                to={`/phase/${scene.phase}`}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {scene.title}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {scene.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {scene.isHot && (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full flex items-center gap-1">
                  <AlertCircle size={14} />
                  必考
                </span>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock size={16} />
                <span>{scene.duration}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className={`mx-auto px-4 sm:px-6 lg:px-8 py-6 ${fullHeight ? 'flex-1 flex flex-col overflow-hidden' : 'max-w-[1600px]'}`} style={fullHeight ? { height: 'calc(100vh - 64px)' } : undefined}>
        <div className={`grid gap-6 ${showSidebar ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'} ${fullHeight ? 'h-full' : ''}`}>
          {/* 左侧/主内容区 - 可视化 */}
          <div className={`${showSidebar ? 'lg:col-span-3' : 'col-span-1'} ${fullHeight ? 'h-full flex flex-col min-h-0' : ''}`}>
            {/* 可视化画布 - 根据内容自适应高度 */}
            {/* showSidebar=false 时 children 是完整页面内容，不限制高度；有侧边栏时用 clamp 固定画布高度 */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${fullHeight ? 'flex-1 min-h-0 relative' : ''}`}>
              <div className={`${fullHeight ? 'absolute inset-0' : showSidebar ? 'h-[clamp(320px,45vh,580px)]' : ''} bg-gray-900 relative`}>
                {children}
              </div>
            </div>

            {/* 动画控制 */}
            {animationProps && (
              <div className={`${fullHeight ? 'mt-4 flex-shrink-0' : 'mt-6'}`}>
                <AnimationPlayer {...animationProps} />
              </div>
            )}
          </div>

          {/* 右侧边栏 - 参数和说明 */}
          {showSidebar && (
            <div className={`space-y-6 overflow-y-auto`}>
              {/* 知识点说明 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="text-blue-600 dark:text-blue-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">学习目标</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {scene.description}
                </p>
              </div>

              {/* 参数面板 */}
              {parameterProps && (
                <ParameterPanel {...parameterProps} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
