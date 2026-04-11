import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { Network, Route, ChevronRight, ChevronDown, CheckCircle, XCircle, ArrowRight, Trophy, Edit2, Plus, Trash2, Play, Settings, Info } from 'lucide-react';

// 内联类型定义 - 避免Vite模块导出错误
interface BGPPath {
  id: string;
  nextHop: string;
  asPath: number[];
  localPref: number;
  med: number;
  origin: 'IGP' | 'EGP' | 'Incomplete';
  routerId: string;
  weight?: number;
  isLocal?: boolean;
  isEBGP?: boolean;
  igpMetric?: number;
  pathAge?: number;
  clusterListLength?: number;
}

interface DecisionStep {
  id: number;
  name: string;
  description: string;
  attribute: string;
  compare: (a: BGPPath, b: BGPPath) => number;
}

// 完整的13条BGP选路原则（Cisco IOS标准顺序）
const bgpDecisionSteps: DecisionStep[] = [
  {
    id: 1,
    name: '最高权重 (Weight)',
    description: 'Cisco私有属性，本地有效，值越大越优先。默认0，通过neighbor命令设置',
    attribute: 'weight',
    compare: (a, b) => (b.weight || 0) - (a.weight || 0)
  },
  {
    id: 2,
    name: '最高本地优先级 (Local Preference)',
    description: 'IBGP邻居间传递，值越大越优先，默认100。用于影响离开AS的流量',
    attribute: 'localPref',
    compare: (a, b) => b.localPref - a.localPref
  },
  {
    id: 3,
    name: '本地起源 (Locally Originated)',
    description: '本地生成的路由(network/redistribute/aggregate)优先于学习到的路由',
    attribute: 'locallyOriginated',
    compare: (a, b) => (b.isLocal ? 1 : 0) - (a.isLocal ? 1 : 0)
  },
  {
    id: 4,
    name: '最短AS路径 (AS Path)',
    description: 'AS跳数越少越优先。可通过AS Path Prepend增加长度影响入站流量',
    attribute: 'asPath',
    compare: (a, b) => a.asPath.length - b.asPath.length
  },
  {
    id: 5,
    name: '最低起源类型 (Origin Type)',
    description: 'IGP(i) > EGP(e) > Incomplete(?)。network命令产生i，重分布产生?',
    attribute: 'originType',
    compare: (a, b) => {
      const originOrder = { 'IGP': 0, 'EGP': 1, 'Incomplete': 2 };
      return originOrder[a.origin] - originOrder[b.origin];
    }
  },
  {
    id: 6,
    name: '最低MED (Multi-Exit Discriminator)',
    description: '外部度量，值越小越优先，默认0。用于影响邻居AS的出站流量选择',
    attribute: 'med',
    compare: (a, b) => a.med - b.med
  },
  {
    id: 7,
    name: 'eBGP优先于iBGP',
    description: '外部BGP路径优先于内部BGP路径。eBGP管理距离20，iBGP为200',
    attribute: 'peerType',
    compare: (a, b) => (b.isEBGP ? 1 : 0) - (a.isEBGP ? 1 : 0)
  },
  {
    id: 8,
    name: '最近IGP下一跳',
    description: '到下一跳的IGP度量(Cost)最小。优选IGP路径最短的下一跳',
    attribute: 'igpMetric',
    compare: (a, b) => (a.igpMetric || 0) - (b.igpMetric || 0)
  },
  {
    id: 9,
    name: '最老的eBGP路径',
    description: '仅适用于eBGP路径：建立时间最长的路径优先（iBGP路径不比较时间，该原则帮助减少路由不稳定）',
    attribute: 'age',
    compare: (a, b) => (a.pathAge || 0) - (b.pathAge || 0)
  },
  {
    id: 10,
    name: '最低Router ID',
    description: '发送者的BGP Router ID最小。Router ID通常取最大Loopback IP',
    attribute: 'routerId',
    compare: (a, b) => a.routerId.localeCompare(b.routerId)
  },
  {
    id: 11,
    name: '最短Cluster List',
    description: 'RR反射路径中Cluster List长度最短。用于RR防环和选路',
    attribute: 'clusterList',
    compare: (a, b) => (a.clusterListLength || 0) - (b.clusterListLength || 0)
  },
  {
    id: 12,
    name: '最低邻居IP地址',
    description: '对等体IP地址数值最小。最后的决胜规则',
    attribute: 'neighborIp',
    compare: (a, b) => a.nextHop.localeCompare(b.nextHop)
  },
  {
    id: 13,
    name: '最优路径确定',
    description: '经过以上12条原则比较，最终选出最优路径安装到路由表',
    attribute: 'final',
    compare: (a, b) => 0
  }
];

// 示例路径数据 - 展示不同选路属性的对比
const samplePaths: BGPPath[] = [
  {
    id: 'path1',
    nextHop: '10.1.1.1',
    asPath: [100, 200, 300],
    localPref: 100,
    med: 0,
    origin: 'IGP',
    routerId: '1.1.1.1',
    weight: 0,
    isLocal: false,
    isEBGP: true,
    igpMetric: 10,
    pathAge: 3600,
    clusterListLength: 0
  },
  {
    id: 'path2',
    nextHop: '10.2.2.2',
    asPath: [100, 400],
    localPref: 200,
    med: 50,
    origin: 'IGP',
    routerId: '2.2.2.2',
    weight: 100,
    isLocal: false,
    isEBGP: true,
    igpMetric: 20,
    pathAge: 1800,
    clusterListLength: 0
  },
  {
    id: 'path3',
    nextHop: '10.3.3.3',
    asPath: [100, 200, 500, 300],
    localPref: 100,
    med: 0,
    origin: 'EGP',
    routerId: '3.3.3.3',
    weight: 0,
    isLocal: false,
    isEBGP: false,
    igpMetric: 15,
    pathAge: 7200,
    clusterListLength: 1
  }
];

export function BGPDecisionScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [remainingPaths, setRemainingPaths] = useState<BGPPath[]>(samplePaths);
  const [eliminatedPaths, setEliminatedPaths] = useState<BGPPath[]>([]);
  const [winner, setWinner] = useState<BGPPath | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [customPaths, setCustomPaths] = useState<BGPPath[]>(samplePaths);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [showPathEditor, setShowPathEditor] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const sceneData = {
    id: 'bgp-decision',
    title: 'BGP选路原则决策树',
    description: '13条选路原则的优先级决策流程可视化',
    phase: 1 as const,
    category: '路由协议',
    duration: '10-12分钟',
    difficulty: 'hard' as const,
  };

  const handleNextStep = useCallback(() => {
    if (currentStep >= bgpDecisionSteps.length || winner) return;

    const step = bgpDecisionSteps[currentStep];
    const newRemaining = [...remainingPaths];

    if (newRemaining.length <= 1) {
      setWinner(newRemaining[0] || null);
      return;
    }

    // 按当前步骤排序
    newRemaining.sort(step.compare);
    
    // 获取最优路径的值
    const bestPath = newRemaining[0];
    
    // 根据属性类型获取最优值
    const getPathValue = (path: BGPPath): any => {
      switch (step.attribute) {
        case 'weight': return path.weight || 0;
        case 'localPref': return path.localPref;
        case 'locallyOriginated': return path.isLocal ? 1 : 0;
        case 'asPath': return path.asPath.length;
        case 'originType': 
          const originOrder: Record<string, number> = { 'IGP': 0, 'EGP': 1, 'Incomplete': 2 };
          return originOrder[path.origin];
        case 'med': return path.med;
        case 'peerType': return path.isEBGP ? 1 : 0;
        case 'igpMetric': return path.igpMetric || 0;
        case 'age': return path.pathAge || 0;
        case 'routerId': return path.routerId;
        case 'clusterList': return path.clusterListLength || 0;
        case 'neighborIp': return path.nextHop;
        default: return 0;
      }
    };

    const bestValue = getPathValue(bestPath);

    // 确定属性比较方向
    const isHigherBetter = ['weight', 'localPref', 'locallyOriginated', 'peerType', 'age'].includes(step.attribute);
    const isLowerBetter = ['asPath', 'originType', 'med', 'igpMetric', 'clusterList', 'routerId'].includes(step.attribute);

    // 找出被淘汰的路径
    const toEliminate: BGPPath[] = [];
    const toKeep: BGPPath[] = [];

    newRemaining.forEach(path => {
      const pathValue = getPathValue(path);
      let eliminated = false;

      if (step.attribute === 'neighborIp') {
        // 邻居IP：数值最小优先
        if (pathValue !== bestValue) {
          eliminated = true;
        }
      } else if (isHigherBetter) {
        // 值越大越优
        if (pathValue < bestValue) {
          eliminated = true;
        }
      } else if (isLowerBetter) {
        // 值越小越优
        if (pathValue > bestValue) {
          eliminated = true;
        }
      }

      if (eliminated) {
        toEliminate.push(path);
      } else {
        toKeep.push(path);
      }
    });

    setEliminatedPaths(prev => [...prev, ...toEliminate]);
    setRemainingPaths(toKeep);
    setCurrentStep(prev => prev + 1);

    if (toKeep.length === 1) {
      setWinner(toKeep[0]);
    }
  }, [currentStep, remainingPaths, winner]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setRemainingPaths(customPaths);
    setEliminatedPaths([]);
    setWinner(null);
    setShowDetail(null);
  }, [customPaths]);

  // 更新路径属性
  const updatePathAttribute = (pathId: string, attribute: keyof BGPPath, value: any) => {
    setCustomPaths(prev => prev.map(path => 
      path.id === pathId ? { ...path, [attribute]: value } : path
    ));
  };

  // 添加新路径
  const addNewPath = () => {
    const newId = `path${customPaths.length + 1}`;
    const newPath: BGPPath = {
      id: newId,
      nextHop: `10.${customPaths.length + 1}.${customPaths.length + 1}.${customPaths.length + 1}`,
      asPath: [100],
      localPref: 100,
      med: 0,
      origin: 'IGP',
      routerId: `${customPaths.length + 1}.${customPaths.length + 1}.${customPaths.length + 1}.${customPaths.length + 1}`,
      weight: 0,
      isLocal: false,
      isEBGP: true,
      igpMetric: 10,
      pathAge: 0,
      clusterListLength: 0
    };
    setCustomPaths(prev => [...prev, newPath]);
    setRemainingPaths(prev => [...prev, newPath]);
  };

  // 删除路径
  const removePath = (pathId: string) => {
    setCustomPaths(prev => prev.filter(p => p.id !== pathId));
    setRemainingPaths(prev => prev.filter(p => p.id !== pathId));
    setEliminatedPaths(prev => prev.filter(p => p.id !== pathId));
  };

  const getOriginColor = (origin: string) => {
    switch (origin) {
      case 'IGP': return 'text-green-400';
      case 'EGP': return 'text-yellow-400';
      case 'Incomplete': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // 自动播放效果
  useEffect(() => {
    if (!autoPlay || winner || currentStep >= bgpDecisionSteps.length) {
      setAutoPlay(false);
      return;
    }
    const timer = setTimeout(() => {
      handleNextStep();
    }, 2000);
    return () => clearTimeout(timer);
  }, [autoPlay, currentStep, winner, handleNextStep]);

  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="space-y-6 h-full overflow-y-auto">
        {/* 控制按钮 */}
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handleNextStep}
            disabled={!!winner || currentStep >= bgpDecisionSteps.length}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold text-white transition-colors flex items-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="text-white font-bold">{winner ? '决策完成' : `执行第${currentStep + 1}步`}</span>
          </button>
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            disabled={!!winner || currentStep >= bgpDecisionSteps.length}
            className={`px-6 py-3 rounded-lg font-bold text-white transition-colors flex items-center gap-2 ${
              autoPlay ? 'bg-green-600 hover:bg-green-500' : 'bg-purple-600 hover:bg-purple-500'
            } disabled:bg-gray-700 disabled:cursor-not-allowed`}
          >
            <Play className="w-5 h-5" />
            <span className="text-white font-bold">{autoPlay ? '暂停' : '自动播放'}</span>
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white transition-colors"
          >
            <span className="text-white font-bold">重置</span>
          </button>
          <button
            onClick={() => setShowPathEditor(!showPathEditor)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-white transition-colors flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            <span className="text-white font-bold">{showPathEditor ? '关闭编辑器' : '编辑路径'}</span>
          </button>
        </div>

        {/* 路径编辑器 */}
        <AnimatePresence>
          {showPathEditor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-800/50 rounded-xl p-6 border border-indigo-500/30"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Edit2 className="w-5 h-5 text-indigo-400" />
                  路径属性编辑器
                </h3>
                <button
                  onClick={addNewPath}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加路径
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customPaths.map((path) => (
                  <motion.div
                    key={path.id}
                    layout
                    className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono font-bold text-white">路径 via {path.nextHop}</span>
                      <button
                        onClick={() => removePath(path.id)}
                        className="p-1 hover:bg-red-600/50 rounded text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-20">Weight:</span>
                        <input
                          type="number"
                          value={path.weight || 0}
                          onChange={(e) => updatePathAttribute(path.id, 'weight', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 bg-gray-800 rounded border border-gray-600 text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-20">LocalPref:</span>
                        <input
                          type="number"
                          value={path.localPref}
                          onChange={(e) => updatePathAttribute(path.id, 'localPref', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 bg-gray-800 rounded border border-gray-600 text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-20">MED:</span>
                        <input
                          type="number"
                          value={path.med}
                          onChange={(e) => updatePathAttribute(path.id, 'med', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 bg-gray-800 rounded border border-gray-600 text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-20">AS Path:</span>
                        <input
                          type="text"
                          value={path.asPath.join(',')}
                          onChange={(e) => updatePathAttribute(path.id, 'asPath', e.target.value.split(',').map(s => parseInt(s.trim()) || 0).filter(n => n > 0))}
                          className="flex-1 px-2 py-1 bg-gray-800 rounded border border-gray-600 text-white text-xs"
                          placeholder="100,200,300"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-20">Origin:</span>
                        <select
                          value={path.origin}
                          onChange={(e) => updatePathAttribute(path.id, 'origin', e.target.value)}
                          className="px-2 py-1 bg-gray-800 rounded border border-gray-600 text-white"
                        >
                          <option value="IGP">IGP</option>
                          <option value="EGP">EGP</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={path.isEBGP}
                            onChange={(e) => updatePathAttribute(path.id, 'isEBGP', e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-gray-300">eBGP</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={path.isLocal}
                            onChange={(e) => updatePathAttribute(path.id, 'isLocal', e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-gray-300">本地起源</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-400 flex items-center gap-2">
                <Info className="w-4 h-4" />
                修改属性后点击"重置"按钮重新开始决策流程
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 决策进度 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
            <Network className="w-5 h-5 text-blue-400" />
            BGP选路决策流程
          </h3>
          <div className="space-y-2">
            {bgpDecisionSteps.slice(0, Math.max(currentStep + 1, 1)).map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg flex items-center gap-3 ${
                  index === currentStep && !winner
                    ? 'bg-blue-600/30 border border-blue-500/50'
                    : index < currentStep
                    ? 'bg-green-600/20 border border-green-500/30'
                    : 'bg-gray-700/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep && !winner
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {index < currentStep ? <CheckCircle className="w-5 h-5" /> : step.id}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white">{step.name}</div>
                  <div className="text-sm text-gray-200">{step.description}</div>
                </div>
                {index === currentStep && !winner && (
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <ChevronRight className="w-5 h-5 text-blue-400" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 路径对比表 - 紧凑布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 剩余候选路径 */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-white">
              <Route className="w-4 h-4 text-green-400" />
              候选路径 ({remainingPaths.length})
            </h3>
            <AnimatePresence>
              {remainingPaths.map((path) => (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`p-3 rounded-lg mb-2 border-2 ${
                    winner?.id === path.id
                      ? 'bg-yellow-500/20 border-yellow-500'
                      : 'bg-gray-700/50 border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm">{path.nextHop}</span>
                    <div className="flex items-center gap-2">
                      {winner?.id === path.id && (
                        <Trophy className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-600/50">{path.isEBGP ? 'eBGP' : 'iBGP'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-gray-400">Weight:</div>
                    <div className={`font-mono ${(path.weight || 0) > 0 ? 'text-purple-400 font-bold' : 'text-gray-300'}`}>{path.weight || 0}</div>
                    <div className="text-gray-400">Local Pref:</div>
                    <div className={`font-mono ${path.localPref !== 100 ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>{path.localPref}</div>
                    <div className="text-gray-400">AS Path:</div>
                    <div className="font-mono text-gray-300">{path.asPath.length}跳</div>
                    <div className="text-gray-400">Origin:</div>
                    <div className={`font-mono ${getOriginColor(path.origin)}`}>{path.origin}</div>
                    <div className="text-gray-400">MED:</div>
                    <div className="font-mono text-gray-300">{path.med}</div>
                    <div className="text-gray-400">Router ID:</div>
                    <div className="font-mono text-gray-300 text-xs">{path.routerId}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {remainingPaths.length === 0 && (
              <div className="text-gray-500 text-center py-6 text-sm">无候选路径</div>
            )}
          </div>

          {/* 被淘汰路径 - 紧凑展示 */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-white">
              <XCircle className="w-4 h-4 text-red-400" />
              被淘汰路径 ({eliminatedPaths.length})
            </h3>
            <AnimatePresence>
              {eliminatedPaths.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eliminatedPaths.map((path) => (
                    <motion.div
                      key={path.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 0.6, x: 0 }}
                      className="p-3 rounded-lg bg-gray-700/40 border border-red-500/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-sm text-red-300">{path.nextHop}</span>
                        <XCircle className="w-4 h-4 text-red-500/60" />
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <span className="text-gray-500">AS:</span>
                        <span className="font-mono text-gray-400">{path.asPath.length}跳</span>
                        <span className="text-gray-500">LP:</span>
                        <span className="font-mono text-gray-400">{path.localPref}</span>
                        <span className="text-gray-500">MED:</span>
                        <span className="font-mono text-gray-400">{path.med}</span>
                        <span className="text-gray-500">Origin:</span>
                        <span className={`font-mono ${getOriginColor(path.origin)}`}>{path.origin}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-6 text-sm">
                  逐步执行决策过程，路径将被淘汰并显示在此
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 知识点说明 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">BGP选路原则要点 (12条 + 最终确定, Cisco IOS标准顺序)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-400 flex items-center justify-center text-xs font-bold">1</span>
                <span className="text-gray-200"><strong className="text-white">Weight</strong>: Cisco私有，本地有效，默认0，越大越优</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
                <span className="text-gray-200"><strong className="text-white">Local Preference</strong>: 默认100，IBGP传递，越大越优</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-green-500/30 text-green-400 flex items-center justify-center text-xs font-bold">3</span>
                <span className="text-gray-200"><strong className="text-white">本地起源</strong>: network/redistribute/aggregate优先</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-500/30 text-yellow-400 flex items-center justify-center text-xs font-bold">4</span>
                <span className="text-gray-200"><strong className="text-white">AS Path</strong>: 越短越优，可通过prepend增加长度</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500/30 text-orange-400 flex items-center justify-center text-xs font-bold">5</span>
                <span className="text-gray-200"><strong className="text-white">Origin</strong>: IGP(i) &gt; EGP(e) &gt; Incomplete(?)</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-red-500/30 text-red-400 flex items-center justify-center text-xs font-bold">6</span>
                <span className="text-gray-200"><strong className="text-white">MED</strong>: 外部度量，越小越优，默认0</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-400 flex items-center justify-center text-xs font-bold">7</span>
                <span className="text-gray-200"><strong className="text-white">eBGP &gt; iBGP</strong>: 外部邻居优先于内部邻居</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/30 text-cyan-400 flex items-center justify-center text-xs font-bold">8</span>
                <span className="text-gray-200"><strong className="text-white">最近IGP下一跳</strong>: IGP度量最小</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-pink-500/30 text-pink-400 flex items-center justify-center text-xs font-bold">9</span>
                <span className="text-gray-200"><strong className="text-white">最老eBGP路径</strong>: 仅eBGP路径比较建立时间（iBGP不适用）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-500/30 text-teal-400 flex items-center justify-center text-xs font-bold">10</span>
                <span className="text-gray-200"><strong className="text-white">最低Router ID</strong>: 发送者Router ID最小</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-lime-500/30 text-lime-400 flex items-center justify-center text-xs font-bold">11</span>
                <span className="text-gray-200"><strong className="text-white">最短Cluster List</strong>: RR反射路径Cluster List最短</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-400 flex items-center justify-center text-xs font-bold">12</span>
                <span className="text-gray-200"><strong className="text-white">最低邻居IP</strong>: 对等体IP地址最小</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold">13</span>
                <span className="text-gray-200"><strong className="text-white">最优路径确定</strong>: 最终胜出者安装到路由表</span>
              </div>
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                <span className="text-gray-300 text-xs">💡 提示: 使用"编辑路径"功能修改属性，观察选路结果变化</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
