import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { InfoPanel } from '../../../components/InfoPanel';
import {
  ClipboardList,
  PenTool,
  Wrench,
  Activity,
  TrendingUp,
  ChevronRight,
  CheckCircle,
  FileText,
  Users,
  AlertTriangle,
  BarChart2,
  Settings,
  RefreshCw,
} from 'lucide-react';

// 五阶段生命周期
const LIFECYCLE_PHASES = [
  {
    id: 'plan',
    name: '规划',
    en: 'Plan',
    color: '#3b82f6',
    icon: ClipboardList,
    shortDesc: '明确目标与需求',
    description: '确定网络目标、业务需求分析、现状评估、可行性研究，输出网络规划报告。',
    keyActivities: [
      '收集业务需求（带宽、延迟、可靠性）',
      '现有网络评估（容量、性能、安全）',
      '技术路线选择（SDN/传统、有线/无线）',
      'TCO成本分析（建设+运营）',
      '风险识别与规避策略',
    ],
    deliverables: ['需求规格说明书', '现状评估报告', '技术选型方案', '项目计划'],
    duration: '2-4周',
    checkpoints: ['业务需求确认', '技术路线批准'],
  },
  {
    id: 'design',
    name: '设计',
    en: 'Design',
    color: '#8b5cf6',
    icon: PenTool,
    shortDesc: '逻辑与物理设计',
    description: '详细网络设计，包括逻辑拓扑、IP地址规划、设备选型、安全策略，输出设计文档。',
    keyActivities: [
      '逻辑拓扑设计（核心/汇聚/接入层）',
      'IP地址规划（子网划分、VLAN设计）',
      '路由协议选择（OSPF/BGP/静态）',
      '安全策略设计（防火墙规则、ACL）',
      '物理布线规划（机柜、路由、冗余）',
    ],
    deliverables: ['逻辑拓扑图', 'IP地址规划表', '设备清单', '安全策略文档', '物理布线图'],
    duration: '3-6周',
    checkpoints: ['设计方案评审', '设备采购批准'],
  },
  {
    id: 'implement',
    name: '实施',
    en: 'Implement',
    color: '#22c55e',
    icon: Wrench,
    shortDesc: '部署与配置',
    description: '按设计方案安装部署网络设备，配置路由/交换/安全，完成功能测试和验收。',
    keyActivities: [
      '硬件安装（机架、布线、供电）',
      '设备基础配置（系统、接口、VLAN）',
      '路由协议配置（OSPF、BGP邻居）',
      '安全策略部署（防火墙、IPS）',
      '功能测试（连通性、性能、冗余）',
    ],
    deliverables: ['安装验收报告', '配置文档（as-built）', '测试报告', '用户培训记录'],
    duration: '2-8周',
    checkpoints: ['阶段性功能验收', '最终验收测试'],
  },
  {
    id: 'operate',
    name: '运营',
    en: 'Operate',
    color: '#f59e0b',
    icon: Activity,
    shortDesc: '日常监控与维护',
    description: '网络正式投产后的日常运维，包括监控告警、故障处理、变更管理、安全运营。',
    keyActivities: [
      '7×24小时监控（流量、性能、告警）',
      '故障处理（排障流程、升级机制）',
      '变更管理（审批流程、回滚方案）',
      '容量管理（带宽利用率追踪）',
      '安全运营（日志审计、漏洞管理）',
    ],
    deliverables: ['运维手册（SOPs）', '月度报告', '变更记录', '事故报告'],
    duration: '持续（建议SLA: 99.99%）',
    checkpoints: ['月度服务评审', '季度安全评审'],
  },
  {
    id: 'optimize',
    name: '优化',
    en: 'Optimize',
    color: '#ef4444',
    icon: TrendingUp,
    shortDesc: '持续改进与演进',
    description: '基于运营数据分析发现瓶颈，进行性能优化、架构升级，推动技术演进与成本降低。',
    keyActivities: [
      '性能数据分析（延迟、丢包、利用率）',
      '瓶颈识别与扩容规划',
      '协议调优（OSPF定时器、BGP策略）',
      '新技术引入评估（SDN、Wi-Fi 6）',
      '成本优化（链路整合、设备更新）',
    ],
    deliverables: ['优化报告', '升级方案', '技术演进路线图'],
    duration: '持续（季度/年度评审）',
    checkpoints: ['优化效果验证', '下一周期规划启动'],
  },
];

// 需求分析五大维度
const REQUIREMENT_DIMENSIONS = [
  { name: '业务需求', desc: '业务流量模型、应用类型（语音/视频/数据）、用户规模增长预测', color: '#3b82f6', icon: '📊' },
  { name: '可用性', desc: '99.9%~99.999%（几个9）、RTO/RPO目标、冗余级别要求', color: '#22c55e', icon: '🔄' },
  { name: '性能', desc: '带宽需求（峰值/均值）、端到端延迟（<10ms/50ms）、丢包率（<0.1%）', color: '#f59e0b', icon: '⚡' },
  { name: '安全', desc: '等保级别、访问控制策略、加密要求、审计日志留存周期', color: '#ef4444', icon: '🔒' },
  { name: '可管理性', desc: '集中管理平台、自动化运维能力、监控覆盖率、变更管理流程', color: '#8b5cf6', icon: '🛠️' },
];

export function NetworkLifecycleScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<'activities' | 'deliverables'>('activities');
  const [selectedDimension, setSelectedDimension] = useState<number | null>(null);

  // 动态生成动画步骤
  const ANIMATION_STEPS = useMemo(() => {
    const activePhase = activePhaseId ? LIFECYCLE_PHASES.find(p => p.id === activePhaseId) : null;
    const dimension = selectedDimension !== null ? REQUIREMENT_DIMENSIONS[selectedDimension] : null;
    
    return [
      { 
        id: 'overview', 
        label: '网络生命周期概述', 
        desc: activePhase 
          ? `当前聚焦: ${activePhase.name}阶段 - ${activePhase.shortDesc}`
          : '网络规划遵循"规划-设计-实施-运营-优化"五阶段循环模型，每个阶段都有明确的输入、输出和检查点。'
      },
      { 
        id: 'plan', 
        label: '第1阶段：规划（Plan）', 
        desc: `规划阶段持续${LIFECYCLE_PHASES[0].duration}，关键交付物包括${LIFECYCLE_PHASES[0].deliverables.slice(0, 2).join('、')}等。`
      },
      { 
        id: 'design', 
        label: '第2阶段：设计（Design）', 
        desc: `设计阶段持续${LIFECYCLE_PHASES[1].duration}，需要完成${LIFECYCLE_PHASES[1].keyActivities.length}项关键活动。`
      },
      { 
        id: 'implement', 
        label: '第3阶段：实施（Implement）', 
        desc: `实施阶段持续${LIFECYCLE_PHASES[2].duration}，注意变更控制和分阶段测试。`
      },
      { 
        id: 'operate', 
        label: '第4阶段：运营（Operate）', 
        desc: `运营阶段是持续的，建议SLA: ${LIFECYCLE_PHASES[3].duration.split('（')[1]?.replace('）', '') || '99.99%'}。`
      },
      { 
        id: 'optimize', 
        label: '第5阶段：优化（Optimize）', 
        desc: `优化阶段${LIFECYCLE_PHASES[4].duration.replace('持续（', '').replace('）', '')}，形成持续改进闭环。`
      },
      { 
        id: 'requirements', 
        label: '需求分析五大维度', 
        desc: dimension 
          ? `当前查看: ${dimension.name} - ${dimension.desc.slice(0, 30)}...`
          : '规划阶段的核心是需求分析。从业务需求、可用性、性能、安全、可管理性五个维度全面收集需求。'
      },
      { 
        id: 'deliverables', 
        label: '关键交付物', 
        desc: showDetails === 'activities' 
          ? `当前显示: 关键活动（共${activePhase?.keyActivities.length || 0}项）`
          : `当前显示: 交付物清单（共${activePhase?.deliverables.length || 0}项）`
      },
    ];
  }, [activePhaseId, selectedDimension, showDetails]);

  const currentStepId = ANIMATION_STEPS[currentStep]?.id;

  useEffect(() => {
    const step = currentStepId;
    const phaseIds = ['plan', 'design', 'implement', 'operate', 'optimize'];
    if (phaseIds.includes(step)) {
      setActivePhaseId(step);
    } else if (step === 'overview') {
      setActivePhaseId(null);
    }
  }, [currentStepId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < ANIMATION_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 2800);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setActivePhaseId(null);
  }, []);

  const activePhase = LIFECYCLE_PHASES.find(p => p.id === activePhaseId);

  // Scene 数据
  const sceneData = {
    id: 'network-lifecycle',
    title: '网络生命周期规划方法论',
    description: '五阶段生命周期模型（规划→设计→实施→运营→优化），关键交付物与检查点',
    phase: 3 as const,
    category: '网络规划',
    duration: '5-7分钟',
    difficulty: 'medium' as const,
    isHot: false,
  };

  return (
    <SceneLayout
      scene={sceneData}
      showSidebar={false}
    >
      <div className="grid grid-cols-12 gap-4 h-full overflow-y-auto p-4">
        {/* 左侧：阶段选择 */}
        <div className="col-span-3">
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">五阶段概览</h3>
            <div className="space-y-2">
              {LIFECYCLE_PHASES.map((phase, i) => {
                const Icon = phase.icon;
                const isActive = activePhaseId === phase.id;
                return (
                  <motion.button
                    key={phase.id}
                    onClick={() => setActivePhaseId(isActive ? null : phase.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                      isActive
                        ? 'text-white shadow-lg'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                    style={isActive ? { backgroundColor: phase.color + 'aa', border: `1px solid ${phase.color}` } : {}}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: phase.color + (isActive ? '40' : '20') }}
                    >
                      <Icon className="w-4 h-4" style={{ color: phase.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: phase.color }}>0{i + 1}</span>
                        <span className="font-semibold text-sm">{phase.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">{phase.shortDesc}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 详情切换 */}
          {activePhase && (
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex gap-2 mb-3">
                {(['activities', 'deliverables'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setShowDetails(tab)}
                    className={`flex-1 py-1.5 text-xs rounded transition-all ${
                      showDetails === tab ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {tab === 'activities' ? '关键活动' : '交付物'}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={showDetails}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-1.5 text-xs"
                >
                  {showDetails === 'activities'
                    ? activePhase.keyActivities.map((act, i) => (
                        <div key={i} className="flex gap-2 text-slate-300">
                          <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </div>
                      ))
                    : activePhase.deliverables.map((del, i) => (
                        <div key={i} className="flex gap-2 text-slate-300">
                          <FileText className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>{del}</span>
                        </div>
                      ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* 主可视化区域 */}
        <div className="col-span-6">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-5 min-h-[460px]">
            <AnimatePresence mode="wait">
              {currentStepId === 'requirements' ? (
                /* 需求分析五维度视图 */
                <motion.div
                  key="requirements"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-4">
                    <h3 className="text-base font-bold text-slate-200">需求分析五大维度</h3>
                    <p className="text-xs text-slate-400 mt-1">规划阶段核心工作：全面、结构化地收集需求</p>
                  </div>
                  {REQUIREMENT_DIMENSIONS.map((dim, i) => (
                    <motion.div
                      key={dim.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: dim.color + '15', border: `1px solid ${dim.color}40` }}
                    >
                      <div className="text-2xl">{dim.icon}</div>
                      <div>
                        <div className="font-semibold mb-1" style={{ color: dim.color }}>{dim.name}</div>
                        <div className="text-xs text-slate-400">{dim.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : currentStepId === 'deliverables' ? (
                /* 交付物汇总视图 */
                <motion.div
                  key="deliverables"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="text-center mb-4">
                    <h3 className="text-base font-bold text-slate-200">各阶段关键交付物</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {LIFECYCLE_PHASES.map((phase, i) => {
                      const Icon = phase.icon;
                      return (
                        <motion.div
                          key={phase.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-3 rounded-lg"
                          style={{ backgroundColor: phase.color + '15', border: `1px solid ${phase.color}40` }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-4 h-4" style={{ color: phase.color }} />
                            <span className="font-semibold text-sm" style={{ color: phase.color }}>{phase.name}</span>
                            <span className="text-xs text-slate-500">({phase.duration})</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {phase.deliverables.map(d => (
                              <span key={d} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs">{d}</span>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                /* 生命周期流程图 */
                <motion.div
                  key="lifecycle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* 循环箭头示意 */}
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-500">持续迭代的闭环模型</span>
                  </div>

                  {/* 五阶段环形流程 */}
                  <div className="relative">
                    {/* 中心圆 - 移到顶部标题位置 */}
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-600 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-400">网络</span>
                        <span className="text-xs font-bold text-slate-400">生命</span>
                        <span className="text-xs font-bold text-slate-400">周期</span>
                      </div>
                    </div>

                    {/* 五阶段排列 */}
                    <div className="flex items-center justify-center gap-2 px-2 flex-wrap">
                      {LIFECYCLE_PHASES.map((phase, i) => {
                        const Icon = phase.icon;
                        const isActive = activePhaseId === phase.id;
                        const isCurrent = currentStepId === phase.id;
                        
                        return (
                          <div key={phase.id} className="flex items-center">
                            <motion.div
                              className="flex flex-col items-center gap-2 cursor-pointer"
                              onClick={() => setActivePhaseId(isActive ? null : phase.id)}
                              animate={{
                                scale: isCurrent ? 1.15 : isActive ? 1.08 : 1,
                              }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              {/* 阶段圆圈 */}
                              <motion.div
                                className="w-14 h-14 rounded-full flex flex-col items-center justify-center"
                                style={{
                                  backgroundColor: phase.color + (isActive || isCurrent ? '30' : '15'),
                                  border: `2px solid ${phase.color}${isActive || isCurrent ? 'ff' : '60'}`,
                                  boxShadow: isCurrent ? `0 0 20px ${phase.color}60` : 'none',
                                }}
                              >
                                <Icon className="w-5 h-5" style={{ color: phase.color }} />
                                <span className="text-xs font-bold mt-0.5" style={{ color: phase.color }}>
                                  {phase.name}
                                </span>
                              </motion.div>

                              {/* 阶段标注 */}
                              <div className="text-center">
                                <div className="text-xs text-slate-500">{phase.en}</div>
                                <div className="text-xs text-slate-600 whitespace-nowrap">{phase.duration.split('（')[0]}</div>
                              </div>
                            </motion.div>

                            {/* 箭头连接 - 仅在非换行时显示 */}
                            {i < LIFECYCLE_PHASES.length - 1 && i !== 2 && (
                              <motion.div
                                className="mx-1 hidden sm:block"
                                animate={{ x: [0, 3, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 反向箭头（优化→规划闭环） */}
                    <div className="flex justify-center mt-2">
                      <motion.div
                        className="px-4 py-1 flex items-center gap-2 text-xs text-slate-500"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <span>↩ 优化结果反馈到下一轮规划（闭环迭代）</span>
                      </motion.div>
                    </div>
                  </div>

                  {/* 激活阶段详情 */}
                  <AnimatePresence>
                    {activePhase && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="p-4 rounded-lg mt-2"
                        style={{ backgroundColor: activePhase.color + '15', border: `1px solid ${activePhase.color}50` }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <activePhase.icon className="w-5 h-5" style={{ color: activePhase.color }} />
                          <span className="font-bold" style={{ color: activePhase.color }}>{activePhase.name}阶段详情</span>
                          <span className="text-xs text-slate-500 ml-auto">⏱ {activePhase.duration}</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{activePhase.description}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                              <Settings className="w-3 h-3" /> 检查点
                            </div>
                            {activePhase.checkpoints.map((cp, i) => (
                              <div key={i} className="text-xs text-slate-300 flex gap-1 items-start mb-1">
                                <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                                {cp}
                              </div>
                            ))}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> 主要交付物
                            </div>
                            {activePhase.deliverables.slice(0, 3).map((d, i) => (
                              <div key={i} className="text-xs text-slate-300 flex gap-1 items-start mb-1">
                                <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                                {d}
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 动画播放器 */}
          <div className="mt-4">
            <AnimationPlayer
              steps={ANIMATION_STEPS}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onReset={handleReset}
              onStepChange={setCurrentStep}
            />
          </div>
        </div>

        {/* 信息面板 */}
        <div className="col-span-3 space-y-4">
          <InfoPanel
            title="当前步骤"
            content={
              <div className="text-xs">
                <div className="font-semibold text-blue-400 mb-2">{ANIMATION_STEPS[currentStep]?.label}</div>
                <p className="text-slate-400">{ANIMATION_STEPS[currentStep]?.desc}</p>
              </div>
            }
          />

          <InfoPanel
            title="逻辑网络设计要素"
            content={
              <div className="space-y-2 text-xs">
                {[
                  { title: '层次模型', desc: '核心层（快速转发）、汇聚层（策略）、接入层（接入）', color: '#3b82f6' },
                  { title: '冗余设计', desc: '关键节点双上行，避免单点故障，STP/MSTP环路保护', color: '#22c55e' },
                  { title: 'IP地址规划', desc: 'VLSM精细划分，预留扩展空间，汇总路由减少路由表', color: '#f59e0b' },
                  { title: '路由策略', desc: 'IGP（OSPF/IS-IS）承载内部，BGP承载跨AS路由', color: '#8b5cf6' },
                ].map(item => (
                  <div key={item.title} className="p-2 rounded bg-slate-800">
                    <div className="font-semibold mb-0.5" style={{ color: item.color }}>{item.title}</div>
                    <div className="text-slate-400">{item.desc}</div>
                  </div>
                ))}
              </div>
            }
          />

          <InfoPanel
            title="物理网络设计要素"
            content={
              <div className="space-y-1 text-xs">
                {[
                  { icon: '🏢', label: '机房选址', desc: '防震、防洪、供电可靠性' },
                  { icon: '🔌', label: '布线规范', desc: 'EIA/TIA-568，天地布线' },
                  { icon: '🖥️', label: '机架规划', desc: '承重、散热、电源密度' },
                  { icon: '🔋', label: '供电设计', desc: '2N冗余，UPS、发电机' },
                  { icon: '❄️', label: '制冷设计', desc: 'PUE目标，冷热通道隔离' },
                ].map(item => (
                  <div key={item.label} className="flex gap-2 items-start p-1.5 bg-slate-800 rounded">
                    <span>{item.icon}</span>
                    <div>
                      <span className="font-semibold text-slate-200">{item.label}：</span>
                      <span className="text-slate-400">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            }
          />

          <InfoPanel
            title="项目管理要点"
            content={
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-1"><Users className="w-3 h-3 text-blue-400" />干系人管理：技术、业务、采购</div>
                <div className="flex items-center gap-1"><BarChart2 className="w-3 h-3 text-green-400" />WBS工作分解结构</div>
                <div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-400" />风险登记册与应对预案</div>
                <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-purple-400" />阶段门评审（Stage Gate）</div>
              </div>
            }
          />
        </div>
      </div>
    </SceneLayout>
  );
}
