import { useState, useCallback, useEffect, useRef } from 'react';

// AnimationStep 类型内联定义
interface AnimationStep {
  id: string;
  title: string;
  description: string;
  duration: number;
}

export interface UseAnimationOptions {
  steps: AnimationStep[];
  autoPlay?: boolean;
  loop?: boolean;
  onStepComplete?: (step: number) => void;
  onComplete?: () => void;
}

export function useAnimation(options: UseAnimationOptions) {
  const { steps, autoPlay = false, loop = false, onStepComplete, onComplete } = options;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  
  const animationRef = useRef<number | null>(null);
  const stepStartTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(isPlaying);

  // 同步 ref
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 动画循环
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!isPlayingRef.current) return;

      if (stepStartTimeRef.current === 0) {
        stepStartTimeRef.current = timestamp;
      }

      const currentStepData = steps[currentStep];
      if (!currentStepData) return;

      const elapsed = timestamp - stepStartTimeRef.current;
      const stepProgress = Math.min((elapsed / currentStepData.duration) * 100, 100);
      
      // 计算总进度
      const totalProgress = ((currentStep + stepProgress / 100) / steps.length) * 100;
      setProgress(totalProgress);

      if (elapsed >= currentStepData.duration) {
        // 当前步骤完成
        onStepComplete?.(currentStep);
        
        if (currentStep < steps.length - 1) {
          // 进入下一步
          setCurrentStep(prev => prev + 1);
          stepStartTimeRef.current = timestamp;
        } else {
          // 全部完成
          if (loop) {
            setCurrentStep(0);
            stepStartTimeRef.current = timestamp;
          } else {
            setIsPlaying(false);
            onComplete?.();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, currentStep, steps, loop, onStepComplete, onComplete]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  const play = useCallback(() => {
    stepStartTimeRef.current = 0;
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    setProgress(0);
    stepStartTimeRef.current = 0;
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, steps.length - 1)));
    setProgress((step / steps.length) * 100);
    stepStartTimeRef.current = 0;
  }, [steps.length]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, steps.length, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  return {
    currentStep,
    isPlaying,
    progress,
    play,
    pause,
    reset,
    goToStep,
    nextStep,
    prevStep,
  };
}
