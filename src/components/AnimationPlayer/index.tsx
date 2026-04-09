import { useState, useCallback, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export interface AnimationStep {
  id: string;
  title: string;
  description: string;
  duration: number; // 毫秒
}

export interface AnimationPlayerProps {
  steps: AnimationStep[];
  currentStep: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepChange: (step: number) => void;
  onReset: () => void;
  progress: number; // 0-100
}

export function AnimationPlayer({
  steps,
  currentStep,
  isPlaying,
  onPlay,
  onPause,
  onStepChange,
  onReset,
  progress,
}: AnimationPlayerProps) {
  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  const handleNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    }
  }, [currentStep, steps.length, onStepChange]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    const newStep = Math.floor((newProgress / 100) * steps.length);
    onStepChange(Math.min(newStep, steps.length - 1));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 进度条 */}
      <div
        className="h-2 bg-gray-200 dark:bg-gray-700 cursor-pointer relative group"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-full bg-white/10" />
        </div>
      </div>

      {/* 控制栏 */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title="重置"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="上一步"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-500/30"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={handleNextStep}
            disabled={currentStep === steps.length - 1}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="下一步"
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-white">{currentStep + 1}</span>
          <span className="mx-1">/</span>
          <span>{steps.length}</span>
        </div>
      </div>

      {/* 步骤导航 */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => onStepChange(index)}
              className={`
                flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${index === currentStep
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : index < currentStep
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <span className="mr-1.5">
                {index < currentStep ? '✓' : index + 1}
              </span>
              {step.title}
            </button>
          ))}
        </div>
      </div>

      {/* 当前步骤说明 */}
      <div className="px-4 pb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {steps[currentStep]?.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {steps[currentStep]?.description}
          </p>
        </div>
      </div>
    </div>
  );
}
