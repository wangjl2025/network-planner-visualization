import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import { 
  Building2, 
  Server, 
  Database, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Clock,
  MapPin,
  ArrowLeft
} from 'lucide-react';

// 两地三中心架构定义
const CENTER_TYPES = {
  production: {
    name: '生产中心',
    color: '#3b82f6',
    icon: Building2,
    description: '主数据中心，承载核心业务'
  },
  sameCity: {
    name: '同城灾备',
    color: '#22c55e',
    icon: Building2,
    description: '同城灾备中心，同步复制'
  },
  remote: {
    name: '异地灾备',
    color: '#f59e0b',
    icon: Building2,
    description: '异地灾备中心，异步复制'
  }
};

// 复制模式
const REPLICATION_MODES = {
  sync: {
    name: '同步复制',
    rpo: '0',
    rto: '分钟级',
    description: '数据实时同步，RPO≈0',
    distance: '≤100km'
  },
  async: {
    name: '异步复制',
    rpo: '分钟~小时',
    rto: '小时级',
    description: '数据异步传输，有一定延迟',
    distance: '数百~数千km'
  }
};

interface DataCenter {
  id: string;
  type: keyof typeof CENTER_TYPES;
  name: string;
  status: 'normal' | 'failure' | 'switching';
  services: { name: string; status: 'running' | 'stopped' | 'switching' }[];
  latency: number;
}

interface ReplicationLink {
  from: string;
  to: string;
  mode: keyof typeof REPLICATION_MODES;
  bandwidth: string;
  status: 'active' | 'failed' | 'syncing';
}

interface AnimationStep {
  id: string;
  title: string;
  description: string;
}

export function DisasterRecoveryScene() {
  const [replicationMode, setReplicationMode] = useState<keyof typeof REPLICATION_MODES>('sync');
  const [failedCenter, setFailedCenter] = useState<string | null>(null);
  const [isFailoverInProgress, setIsFailoverInProgress] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [dataCenters, setDataCenters] = useState<DataCenter[]>([]);
  const [links, setLinks] = useState<ReplicationLink[]>([]);

  // 初始化数据中心
  const initializeDataCenters = useCallback(() => {
    const centers: DataCenter[] = [
      {
        id: 'production',
        type: 'production',
        name: '生产中心（北京）',
        status: 'normal',
        services: [
          { name: '核心业务', status: 'running' },
          { name: '数据库', status: 'running' },
          { name: 'Web服务', status: 'running' }
        ],
        latency: 2
      },
      {
        id: 'sameCity',
        type: 'sameCity',
        name: '同城灾备（北京）',
        status: 'normal',
        services: [
          { name: '核心业务', status: 'stopped' },
          { name: '数据库', status: 'stopped' },
          { name: 'Web服务', status: 'stopped' }
        ],
        latency: 5
      },
      {
        id: 'remote',
        type: 'remote',
        name: '异地灾备（上海）',
        status: 'normal',
        services: [
          { name: '核心业务', status: 'stopped' },
          { name: '数据库', status: 'stopped' },
          { name: 'Web服务', status: 'stopped' }
        ],
        latency: 30
      }
    ];

    const replicationLinks: ReplicationLink[] = [
      {
        from: 'production',
        to: 'sameCity',
        mode: 'sync',
        bandwidth: '10Gbps',
        status: 'active'
      },
      {
        from: 'production',
        to: 'remote',
        mode: 'async',
        bandwidth: '1Gbps',
        status: 'active'
      }
    ];

    setDataCenters(centers);
    setLinks(replicationLinks);
  }, []);

  useEffect(() => {
    initializeDataCenters();
  }, [initializeDataCenters]);

  // 故障切换
  const handleFailover = (centerId: string) => {
    if (isFailoverInProgress) return;
    
    setIsFailoverInProgress(true);
    setFailedCenter(centerId);

    // 模拟切换过程
    setTimeout(() => {
      setDataCenters(prev => prev.map(dc => {
        if (dc.id === centerId) {
          return { ...dc, status: 'failure' };
        }
        // 切换到灾备中心
        if (centerId === 'production') {
          if (dc.id === 'sameCity') {
            return {
              ...dc,
              status: 'normal',
              services: dc.services.map(s => ({ ...s, status: 'running' }))
            };
          }
        }
        return dc;
      }));

      setLinks(prev => prev.map(link => ({
        ...link,
        status: link.from === centerId || link.to === centerId ? 'failed' : link.status
      })));

      setIsFailoverInProgress(false);
    }, 2000);
  };

  // 恢复
  const handleRecovery = () => {
    initializeDataCenters();
    setFailedCenter(null);
    setCurrentStep(0);
  };

  // 动画步骤
  const steps: AnimationStep[] = useMemo(() => {
    const steps: AnimationStep[] = [
      {
        id: 'normal',
        title: '正常运行',
        description: '生产中心承载业务，同城和异地灾备实时同步数据'
      },
      {
        id: 'sync',
        title: '数据同步',
        description: `同城同步复制（RPO≈0），异地异步复制（RPO=${REPLICATION_MODES.async.rpo}）`
      }
    ];

    if (failedCenter) {
      steps.push({
        id: 'failure',
        title: '故障检测',
        description: `${dataCenters.find(dc => dc.id === failedCenter)?.name} 发生故障`
      });
      steps.push({
        id: 'failover',
        title: '故障切换',
        description: '自动切换到灾备中心，业务继续运行'
      });
      steps.push({
        id: 'recovery',
        title: '数据恢复',
        description: '故障中心恢复后，进行数据同步回切'
      });
    }

    return steps;
  }, [failedCenter, dataCenters]);

  // 参数定义
  const parameters = [
    {
      id: 'replicationMode',
      name: '复制模式',
      type: 'select' as const,
      value: replicationMode,
      options: [
        { value: 'sync', label: '同步复制' },
        { value: 'async', label: '异步复制' }
      ]
    },
    {
      id: 'showDataFlow',
      name: '显示数据流',
      type: 'boolean' as const,
      value: showDataFlow
    }
  ];

  const handleParameterChange = (id: string, value: string | number | boolean) => {
    switch (id) {
      case 'replicationMode':
        setReplicationMode(value as keyof typeof REPLICATION_MODES);
        break;
      case 'showDataFlow':
        setShowDataFlow(value as boolean);
        break;
    }
  };

  const getCenterPosition = (index: number) => {
    const positions = [
      { x: 50, y: 22 },   // 生产中心 - 上方
      { x: 22, y: 70 },   // 同城灾备 - 左下
      { x: 78, y: 70 }    // 异地灾备 - 右下
    ];
    return positions[index];
  };

  const sceneData = {
    id: 'disaster-recovery',
    title: '两地三中心灾备架构',
    description: '生产中心 + 同城灾备 + 异地灾备，故障自动切换可视化',
    phase: 2 as const,
    category: '数据中心',
    duration: '8-10分钟',
    difficulty: 'hard' as const,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to={`/phase/${sceneData.phase}`}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {sceneData.title}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {sceneData.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock size={16} />
                <span>{sceneData.duration}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 140px)' }}>
          {/* 参数面板 */}
          <div className="col-span-3 h-full overflow-y-auto">
            <ParameterPanel
              title="灾备配置"
              parameters={parameters}
              onChange={handleParameterChange}
            />

            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">故障模拟</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleFailover('production')}
                  disabled={isFailoverInProgress || failedCenter === 'production'}
                  className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-all"
                >
                  {isFailoverInProgress ? '切换中...' : '生产中心故障'}
                </button>
                {failedCenter && (
                  <button
                    onClick={handleRecovery}
                    className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> 恢复系统
                  </button>
                )}
              </div>
            </div>

            <InfoPanel
              title="RPO/RTO说明"
              content={
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700">
                    <div className="text-blue-400 font-medium mb-1">RPO (恢复点目标)</div>
                    <div className="text-slate-300">可接受的数据丢失量</div>
                    <div className="text-xs text-slate-400 mt-1">
                      同步: 0 | 异步: 分钟~小时
                    </div>
                  </div>
                  <div className="p-3 bg-green-900/30 rounded-lg border border-green-700">
                    <div className="text-green-400 font-medium mb-1">RTO (恢复时间目标)</div>
                    <div className="text-slate-300">业务恢复所需时间</div>
                    <div className="text-xs text-slate-400 mt-1">
                      自动切换: 分钟级
                    </div>
                  </div>
                </div>
              }
            />
          </div>

          {/* 可视化区域 */}
          <div className="col-span-6 h-full">
            <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-6 h-full relative overflow-hidden">
              {/* 网络拓扑 */}
              <div className="relative w-full h-full">
              {/* 复制链路 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {links.map((link, index) => {
                  const fromCenter = dataCenters.findIndex(dc => dc.id === link.from);
                  const toCenter = dataCenters.findIndex(dc => dc.id === link.to);
                  const fromPos = getCenterPosition(fromCenter);
                  const toPos = getCenterPosition(toCenter);

                  return (
                    <g key={index}>
                      <line
                        x1={`${fromPos.x}%`}
                        y1={`${fromPos.y}%`}
                        x2={`${toPos.x}%`}
                        y2={`${toPos.y}%`}
                        stroke={link.status === 'failed' ? '#ef4444' : '#3b82f6'}
                        strokeWidth="2"
                        strokeDasharray={link.mode === 'async' ? '5,5' : '0'}
                        opacity={link.status === 'failed' ? 0.3 : 0.6}
                      />
                      {showDataFlow && link.status === 'active' && (
                        <motion.circle
                          r="4"
                          fill={link.mode === 'sync' ? '#3b82f6' : '#f59e0b'}
                          initial={{ 
                            cx: `${fromPos.x}%`, 
                            cy: `${fromPos.y}%`,
                            opacity: 0
                          }}
                          animate={{ 
                            cx: [`${fromPos.x}%`, `${toPos.x}%`],
                            cy: [`${fromPos.y}%`, `${toPos.y}%`],
                            opacity: [0, 1, 0]
                          }}
                          transition={{
                            duration: link.mode === 'sync' ? 1 : 2,
                            repeat: Infinity,
                            ease: 'linear'
                          }}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* 数据中心节点 */}
              {dataCenters.map((dc, index) => {
                const pos = getCenterPosition(index);
                const centerType = CENTER_TYPES[dc.type];
                const Icon = centerType.icon;

                return (
                  <motion.div
                    key={dc.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.2 }}
                  >
                    <div
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        dc.status === 'failure'
                          ? 'bg-red-900/50 border-red-600'
                          : dc.status === 'switching'
                          ? 'bg-yellow-900/50 border-yellow-600'
                          : 'bg-slate-800 border-slate-600'
                      }`}
                    >
                      {/* 中心标题 */}
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${centerType.color}30` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: centerType.color }} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">{dc.name}</div>
                          <div className="text-xs text-slate-400">{centerType.description}</div>
                        </div>
                      </div>

                      {/* 状态指示 */}
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            dc.status === 'normal'
                              ? 'bg-green-500 animate-pulse'
                              : dc.status === 'failure'
                              ? 'bg-red-500'
                              : 'bg-yellow-500 animate-pulse'
                          }`}
                        />
                        <span className="text-xs text-slate-400">
                          {dc.status === 'normal' ? '正常运行' : dc.status === 'failure' ? '故障' : '切换中'}
                        </span>
                        <span className="text-xs text-slate-500">| 延迟: {dc.latency}ms</span>
                      </div>

                      {/* 服务状态 */}
                      <div className="space-y-1">
                        {dc.services.map((service, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-900/50"
                          >
                            <span className="text-slate-400">{service.name}</span>
                            <span
                              className={`flex items-center gap-1 ${
                                service.status === 'running'
                                  ? 'text-green-400'
                                  : service.status === 'switching'
                                  ? 'text-yellow-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {service.status === 'running' && <Activity className="w-3 h-3" />}
                              {service.status === 'switching' && <Clock className="w-3 h-3 animate-spin" />}
                              {service.status === 'stopped' && <div className="w-2 h-2 rounded-full bg-slate-600" />}
                              {service.status === 'running' ? '运行中' : service.status === 'switching' ? '切换中' : '停止'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* 故障遮罩 */}
                      {dc.status === 'failure' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-red-900/70 rounded-xl flex items-center justify-center"
                        >
                          <div className="text-center">
                            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                            <span className="text-red-200 font-bold">故障</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* 图例 */}
              <div className="absolute bottom-4 left-4 bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                <div className="text-xs font-medium text-slate-300 mb-2">复制链路</div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-blue-500" />
                    <span className="text-slate-400">同步复制</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-yellow-500 border-dashed" style={{ borderTop: '2px dashed #f59e0b' }} />
                    <span className="text-slate-400">异步复制</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 动画播放器 */}
          <div className="mt-4">
            <AnimationPlayer
              steps={steps}
              currentStep={currentStep}
              isPlaying={isAnimating}
              onPlay={() => setIsAnimating(true)}
              onPause={() => setIsAnimating(false)}
              onReset={handleRecovery}
              onStepChange={setCurrentStep}
            />
          </div>
        </div>

        {/* 信息面板 */}
        <div className="col-span-3 space-y-4 h-full overflow-y-auto">
          <InfoPanel
            title="两地三中心架构"
            content={
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-blue-400">生产中心</span>
                  </div>
                  <p className="text-slate-300 text-xs">承载核心业务，7×24小时运行</p>
                </div>
                <div className="p-3 bg-green-900/30 rounded-lg border border-green-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-green-400" />
                    <span className="font-medium text-green-400">同城灾备</span>
                  </div>
                  <p className="text-slate-300 text-xs">距离≤100km，同步复制，RPO≈0</p>
                </div>
                <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-yellow-400" />
                    <span className="font-medium text-yellow-400">异地灾备</span>
                  </div>
                  <p className="text-slate-300 text-xs">距离数百km，异步复制，防区域性灾难</p>
                </div>
              </div>
            }
          />

          <InfoPanel
            title="复制模式对比"
            content={
              <div className="space-y-2">
                {Object.entries(REPLICATION_MODES).map(([key, mode]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      replicationMode === key
                        ? 'bg-slate-700 border-slate-500'
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                    }`}
                    onClick={() => setReplicationMode(key as keyof typeof REPLICATION_MODES)}
                  >
                    <div className="font-medium text-slate-200 mb-1">{mode.name}</div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>RPO: {mode.rpo}</div>
                      <div>RTO: {mode.rto}</div>
                      <div>距离: {mode.distance}</div>
                    </div>
                  </div>
                ))}
              </div>
            }
          />

          <InfoPanel
            title="灾备等级"
            content={
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                  <span className="text-slate-400">Level 1</span>
                  <span className="text-slate-300">数据级灾备</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                  <span className="text-slate-400">Level 2</span>
                  <span className="text-slate-300">应用级灾备</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-900/30 rounded border border-blue-700">
                  <span className="text-blue-400">Level 3</span>
                  <span className="text-blue-300">业务级灾备</span>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </main>
  </div>
  );
}
