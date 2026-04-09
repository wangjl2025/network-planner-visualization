// 镜头（场景）类型定义
export interface Scene {
  id: string;
  title: string;
  description: string;
  phase: 1 | 2 | 3 | 4;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: string;
  isHot?: boolean;
}

// 网络拓扑节点
export interface NetworkNode {
  id: string;
  label: string;
  type: 'router' | 'switch' | 'server' | 'firewall' | 'cloud' | 'host';
  x: number;
  y: number;
  data?: Record<string, any>;
}

// 网络拓扑边
export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  cost?: number;
  animated?: boolean;
  style?: 'solid' | 'dashed' | 'dotted';
}

// 动画状态
export interface AnimationState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
}

// 考点分级
export type ExamLevel = 'required' | 'important' | 'optional';

export interface KnowledgePoint {
  id: string;
  title: string;
  level: ExamLevel;
  content: string;
  relatedScenes: string[];
}
