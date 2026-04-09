import { useMemo } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { useAnimation } from '../../../hooks/useAnimation';
import { useParameters } from '../../../hooks/useParameters';

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

// 机房等级数据
interface TierLevel {
  id: string;
  name: string;
  tier: string;
  availability: string;
  downtime: string;
  redundancy: string;
  features: string[];
  color: string;
}

// 国标等级数据
interface GBLevel {
  id: string;
  level: string;
  availability: string;
  redundancy: string;
  features: string[];
  color: string;
}

const sceneData: Scene = {
  id: 'tier-standard',
  phase: 2,
  title: '机房等级标准：TIA-942与国标对比',
  category: '数据中心',
  description: '通过可视化对比国际标准TIA-942的Tier I~IV等级与国标GB 50174-2017的A/B/C级，理解不同等级机房的可用性、冗余度和适用场景。',
  duration: '5-8分钟',
  difficulty: 'medium',
  isHot: true,
};

// TIA-942 Tier等级数据
const tierLevels: TierLevel[] = [
  {
    id: 'tier1',
    name: 'Tier I',
    tier: '基础级',
    availability: '99.671%',
    downtime: '28.8小时/年',
    redundancy: 'N（无冗余）',
    features: ['单路供电', '单路空调', '无备用组件', '计划内维护需停机'],
    color: '#ef4444',
  },
  {
    id: 'tier2',
    name: 'Tier II',
    tier: '组件冗余级',
    availability: '99.741%',
    downtime: '22.0小时/年',
    redundancy: 'N+1（关键组件冗余）',
    features: ['关键设备N+1冗余', '单路配电', '部分备用空调', '计划内维护需停机'],
    color: '#f97316',
  },
  {
    id: 'tier3',
    name: 'Tier III',
    tier: '并行维护级',
    availability: '99.982%',
    downtime: '1.6小时/年',
    redundancy: 'N+1（全冗余）',
    features: ['双路供电', '全系统N+1冗余', '支持并行维护', '单系统故障不影响运行'],
    color: '#3b82f6',
  },
  {
    id: 'tier4',
    name: 'Tier IV',
    tier: '容错级',
    availability: '99.995%',
    downtime: '26.3分钟/年',
    redundancy: '2N或2(N+1)（双系统）',
    features: ['双系统同时运行', '任何单点故障容错', '支持在线维护', '连续制冷'],
    color: '#22c55e',
  },
];

// 国标GB 50174-2017等级数据
const gbLevels: GBLevel[] = [
  {
    id: 'gbc',
    level: 'C级',
    availability: '≥99.5%',
    redundancy: '基本配置',
    features: ['单路供电', '基本空调', '适用于小型机房', '非核心业务'],
    color: '#ef4444',
  },
  {
    id: 'gbb',
    level: 'B级',
    availability: '≥99.9%',
    redundancy: '关键设备冗余',
    features: ['关键设备冗余', '部分双路供电', '重要业务支撑', '计划维护可停机'],
    color: '#3b82f6',
  },
  {
    id: 'gba',
    level: 'A级',
    availability: '≥99.99%',
    redundancy: '2N冗余',
    features: ['双路供电', '全系统冗余', '关键业务核心', '容错设计'],
    color: '#22c55e',
  },
];

// 动画步骤
const animationSteps = [
  {
    id: 'intro',
    title: '机房等级概述',
    description: '数据中心机房等级分为国际标准TIA-942（Tier I~IV）和国标GB 50174-2017（A/B/C级）',
    duration: 2000,
  },
  {
    id: 'tier-intro',
    title: 'TIA-942标准',
    description: '美国电信工业协会标准，分为Tier I（基础级）到Tier IV（容错级）四个等级',
    duration: 2500,
  },
  {
    id: 'tier1',
    title: 'Tier I - 基础级',
    description: '可用性99.671%，年停机约28.8小时，单路供电无冗余',
    duration: 2500,
  },
  {
    id: 'tier2',
    title: 'Tier II - 组件冗余级',
    description: '可用性99.741%，年停机约22小时，关键组件N+1冗余',
    duration: 2500,
  },
  {
    id: 'tier3',
    title: 'Tier III - 并行维护级',
    description: '可用性99.982%，年停机约1.6小时，支持并行维护，单系统故障不影响运行',
    duration: 3000,
  },
  {
    id: 'tier4',
    title: 'Tier IV - 容错级',
    description: '可用性99.995%，年停机约26分钟，双系统容错，任何单点故障不影响业务',
    duration: 3000,
  },
  {
    id: 'gb-intro',
    title: '国标GB 50174-2017',
    description: '中国国家标准，分为A级（容错型）、B级（冗余型）、C级（基本型）',
    duration: 2500,
  },
  {
    id: 'comparison',
    title: '标准对比',
    description: 'Tier III ≈ A级，Tier II ≈ B级，Tier I ≈ C级，Tier IV高于A级',
    duration: 3000,
  },
];

// 初始参数
const initialParameters = [
  {
    id: 'standard-type',
    name: '显示标准',
    type: 'select' as const,
    value: 'both',
    options: [
      { label: '全部显示', value: 'both' },
      { label: '仅TIA-942', value: 'tia' },
      { label: '仅国标GB', value: 'gb' },
    ],
    description: '选择要显示的机房等级标准',
  },
  {
    id: 'highlight-tier',
    name: '高亮等级',
    type: 'select' as const,
    value: 'all',
    options: [
      { label: '全部', value: 'all' },
      { label: 'Tier I / C级', value: 'tier1' },
      { label: 'Tier II / B级', value: 'tier2' },
      { label: 'Tier III / A级', value: 'tier3' },
      { label: 'Tier IV', value: 'tier4' },
    ],
    description: '高亮显示特定等级',
  },
  {
    id: 'show-availability',
    name: '显示可用性对比',
    type: 'boolean' as const,
    value: true,
    description: '显示各等级的可用性百分比',
  },
  {
    id: 'show-downtime',
    name: '显示停机时间',
    type: 'boolean' as const,
    value: true,
    description: '显示年停机时间对比',
  },
  {
    id: 'animation-speed',
    name: '动画速度',
    type: 'select' as const,
    value: '1x',
    options: [
      { label: '0.5x 慢速', value: '0.5x' },
      { label: '1x 正常', value: '1x' },
      { label: '1.5x 快速', value: '1.5x' },
      { label: '2x 极速', value: '2x' },
    ],
    description: '调整动画播放速度',
  },
];

export function TierStandardScene() {
  // 参数控制
  const parameters = useParameters({
    initialParameters,
    onChange: (id, value) => {
      console.log('Parameter changed:', id, value);
    },
  });

  // 获取参数值
  const standardType = parameters.getValue<string>('standard-type') || 'both';
  const highlightTier = parameters.getValue<string>('highlight-tier') || 'all';
  const showAvailability = parameters.getValue<boolean>('show-availability') ?? true;
  const showDowntime = parameters.getValue<boolean>('show-downtime') ?? true;

  // 动态生成动画步骤
  const animationSteps = useMemo(() => {
    const steps = [
      {
        id: 'intro',
        title: '机房等级概述',
        description: `当前显示: ${standardType === 'both' ? '全部标准' : standardType === 'tia' ? 'TIA-942' : '国标GB'}`,
        duration: 2000,
      },
      {
        id: 'tier-intro',
        title: 'TIA-942标准',
        description: highlightTier !== 'all' 
          ? `高亮显示: ${highlightTier.toUpperCase()} 等级`
          : '美国电信工业协会标准，分为Tier I（基础级）到Tier IV（容错级）四个等级',
        duration: 2500,
      },
      {
        id: 'tier1',
        title: 'Tier I - 基础级',
        description: `可用性99.671%，年停机约28.8小时${showAvailability ? '，可用性最低' : ''}${showDowntime ? '，停机时间最长' : ''}`,
        duration: 2500,
      },
      {
        id: 'tier2',
        title: 'Tier II - 组件冗余级',
        description: `可用性99.741%，年停机约22小时${showAvailability ? '，关键组件N+1冗余' : ''}`,
        duration: 2500,
      },
      {
        id: 'tier3',
        title: 'Tier III - 并行维护级',
        description: `可用性99.982%，年停机约1.6小时${showDowntime ? '，支持并行维护' : ''}，单系统故障不影响运行`,
        duration: 3000,
      },
      {
        id: 'tier4',
        title: 'Tier IV - 容错级',
        description: `可用性99.995%，年停机约26分钟${showAvailability && showDowntime ? '，最高可用性等级' : ''}，双系统容错`,
        duration: 3000,
      },
      {
        id: 'gb-intro',
        title: '国标GB 50174-2017',
        description: `中国国家标准${standardType === 'gb' ? '（当前显示）' : ''}，分为A级（容错型）、B级（冗余型）、C级（基本型）`,
        duration: 2500,
      },
      {
        id: 'comparison',
        title: '标准对比',
        description: `Tier III ≈ A级，Tier II ≈ B级，Tier I ≈ C级${showAvailability ? '，Tier IV高于A级' : ''}`,
        duration: 3000,
      },
    ];
    return steps;
  }, [standardType, highlightTier, showAvailability, showDowntime]);

  // 动画控制
  const animation = useAnimation({
    steps: animationSteps,
    autoPlay: false,
    loop: false,
  });

  return (
    <SceneLayout
      scene={sceneData}
      animationProps={{
        steps: animationSteps,
        currentStep: animation.currentStep,
        isPlaying: animation.isPlaying,
        progress: animation.progress,
        onPlay: animation.play,
        onPause: animation.pause,
        onStepChange: animation.goToStep,
        onReset: animation.reset,
      }}
      parameterProps={{
        parameters: parameters.parameters,
        onChange: parameters.updateParameter,
        onReset: parameters.resetParameters,
      }}
    >
      <TierStandardVisualization
        tierLevels={tierLevels}
        gbLevels={gbLevels}
        currentStep={animation.currentStep}
        standardType={standardType}
        highlightTier={highlightTier}
        showAvailability={showAvailability}
        showDowntime={showDowntime}
      />
    </SceneLayout>
  );
}

// 机房等级可视化组件
interface TierStandardVisualizationProps {
  tierLevels: TierLevel[];
  gbLevels: GBLevel[];
  currentStep: number;
  standardType: string;
  highlightTier: string;
  showAvailability: boolean;
  showDowntime: boolean;
}

function TierStandardVisualization({
  tierLevels,
  gbLevels,
  currentStep,
  standardType,
  highlightTier,
  showAvailability,
  showDowntime,
}: TierStandardVisualizationProps) {
  const showTIA = standardType === 'both' || standardType === 'tia';
  const showGB = standardType === 'both' || standardType === 'gb';

  return (
    <div className="w-full h-full bg-slate-900 p-4 overflow-auto">
      {/* 标题 */}
      <h2 className="text-lg font-bold text-slate-300 mb-4">数据中心机房等级标准对比</h2>
      
      {/* TIA-942 标准 */}
      {showTIA && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">TIA-942 国际标准</h3>
          <div className="space-y-3">
            {tierLevels.map((tier, index) => {
              const shouldShow = currentStep >= index + 2 || currentStep >= 7;
              const isHighlighted = highlightTier === 'all' || 
                (highlightTier === 'tier1' && index === 0) ||
                (highlightTier === 'tier2' && index === 1) ||
                (highlightTier === 'tier3' && index === 2) ||
                (highlightTier === 'tier4' && index === 3);

              if (!shouldShow && currentStep < 7) return null;

              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: isHighlighted ? 1 : 0.5, x: 0 }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isHighlighted 
                      ? 'bg-slate-800 border-slate-600' 
                      : 'bg-slate-800/50 border-slate-700/50'
                  }`}
                  style={{ borderLeftColor: tier.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-bold" style={{ color: tier.color }}>{tier.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{tier.tier}</span>
                    </div>
                    <div className="text-right">
                      {showAvailability && (
                        <div className="text-green-400 font-bold text-sm">{tier.availability}</div>
                      )}
                      {showDowntime && (
                        <div className="text-amber-400 text-xs">{tier.downtime}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">冗余: {tier.redundancy}</div>
                  {/* 显示详细特性 */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tier.features.map((feature, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 国标标准 */}
      {showGB && currentStep >= 6 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">GB 50174-2017 中国国标</h3>
          <div className="space-y-3">
            {gbLevels.map((level, index) => {
              const isHighlighted = highlightTier === 'all' || 
                (highlightTier === 'tier1' && index === 2) ||
                (highlightTier === 'tier2' && index === 1) ||
                (highlightTier === 'tier3' && index === 0);

              return (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: isHighlighted ? 1 : 0.5, x: 0 }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isHighlighted 
                      ? 'bg-slate-800 border-slate-600' 
                      : 'bg-slate-800/50 border-slate-700/50'
                  }`}
                  style={{ borderLeftColor: level.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-bold" style={{ color: level.color }}>{level.level}级</span>
                    </div>
                    {showAvailability && (
                      <div className="text-green-400 font-bold text-sm">{level.availability}</div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mb-2">冗余: {level.redundancy}</div>
                  {/* 显示详细特性 */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {level.features.map((feature, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 图例和说明 */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>可用性</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded" />
            <span>年停机时间</span>
          </div>
        </div>
        {currentStep >= 7 && (
          <div className="text-xs text-slate-500">
            对应关系: Tier IV &gt; A级 ≈ Tier III &gt; B级 ≈ Tier II &gt; C级 ≈ Tier I
          </div>
        )}
      </div>
    </div>
  );
}

// 导入React
import * as React from 'react';
