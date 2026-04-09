import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { Network, Route, ChevronRight, ChevronDown, CheckCircle, XCircle, ArrowRight, Trophy } from 'lucide-react';

// 内联类型定义 - 避免Vite模块导出错误
interface BGPPath {
  id: string;
  nextHop: string;
  asPath: number[];
  localPref: number;
  med: number;
  origin: 'IGP' | 'EGP' | 'Incomplete';
  routerId: string;
}

interface DecisionStep {
  id: number;
  name: string;
  description: string;
  attribute: string;
  compare: (a: BGPPath, b: BGPPath) => number;
}

const bgpDecisionSteps: DecisionStep[] = [
  {
    id: 1,
    name: '最高权重 (Weight)',
    description: 'Cisco私有属性，本地有效，值越大越优先',
    attribute: 'weight',
    compare: (a, b) => 0 // 简化：假设相同
  },
  {
    id: 2,
    name: '最高本地优先级 (Local Preference)',
    description: 'IBGP邻居间传递，值越大越优先，默认100',
    attribute: 'localPref',
    compare: (a, b) => b.localPref - a.localPref
  },
  {
    id: 3,
    name: '本地起源 (Locally Originated)',
    description: '本地生成的路由优先于学习到的',
    attribute: 'origin',
    compare: (a, b) => 0
  },
  {
    id: 4,
    name: '最短AS路径 (AS Path)',
    description: 'AS跳数越少越优先',
    attribute: 'asPath',
    compare: (a, b) => a.asPath.length - b.asPath.length
  },
  {
    id: 5,
    name: '最低起源类型 (Origin Type)',
    description: 'IGP > EGP > Incomplete',
    attribute: 'originType',
    compare: (a, b) => {
      const originOrder = { 'IGP': 0, 'EGP': 1, 'Incomplete': 2 };
      return originOrder[a.origin] - originOrder[b.origin];
    }
  },
  {
    id: 6,
    name: '最低MED (Multi-Exit Discriminator)',
    description: '外部度量，值越小越优先',
    attribute: 'med',
    compare: (a, b) => a.med - b.med
  },
  {
    id: 7,
    name: 'eBGP优先于iBGP',
    description: '外部BGP路径优先于内部BGP路径',
    attribute: 'peerType',
    compare: (a, b) => 0
  },
  {
    id: 8,
    name: '最近IGP下一跳',
    description: '到下一跳的IGP度量最小',
    attribute: 'igpMetric',
    compare: (a, b) => 0
  },
  {
    id: 9,
    name: '最老的路径',
    description: '建立时间最长的路径优先',
    attribute: 'age',
    compare: (a, b) => 0
  },
  {
    id: 10,
    name: '最低Router ID',
    description: '发送者的BGP Router ID最小',
    attribute: 'routerId',
    compare: (a, b) => a.routerId.localeCompare(b.routerId)
  },
  {
    id: 11,
    name: '最短Cluster List',
    description: 'RR反射路径中Cluster List最短',
    attribute: 'clusterList',
    compare: (a, b) => 0
  },
  {
    id: 12,
    name: '最低邻居IP地址',
    description: '对等体IP地址最小',
    attribute: 'neighborIp',
    compare: (a, b) => 0
  }
];

const samplePaths: BGPPath[] = [
  {
    id: 'path1',
    nextHop: '10.1.1.1',
    asPath: [100, 200, 300],
    localPref: 100,
    med: 0,
    origin: 'IGP',
    routerId: '1.1.1.1'
  },
  {
    id: 'path2',
    nextHop: '10.2.2.2',
    asPath: [100, 400],
    localPref: 200,
    med: 50,
    origin: 'IGP',
    routerId: '2.2.2.2'
  },
  {
    id: 'path3',
    nextHop: '10.3.3.3',
    asPath: [100, 200, 500, 300],
    localPref: 100,
    med: 0,
    origin: 'EGP',
    routerId: '3.3.3.3'
  }
];

export function BGPDecisionScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [remainingPaths, setRemainingPaths] = useState<BGPPath[]>(samplePaths);
  const [eliminatedPaths, setEliminatedPaths] = useState<BGPPath[]>([]);
  const [winner, setWinner] = useState<BGPPath | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);

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

    // 按当前步骤比较路径
    newRemaining.sort(step.compare);
    const bestValue = step.compare(newRemaining[0], newRemaining[0]) === 0 
      ? step.attribute === 'localPref' ? newRemaining[0].localPref
      : step.attribute === 'asPath' ? newRemaining[0].asPath.length
      : step.attribute === 'med' ? newRemaining[0].med
      : step.attribute === 'originType' ? newRemaining[0].origin
      : newRemaining[0].routerId
      : null;

    // 找出被淘汰的路径
    const toEliminate: BGPPath[] = [];
    const toKeep: BGPPath[] = [];

    newRemaining.forEach(path => {
      const pathValue = step.attribute === 'localPref' ? path.localPref
        : step.attribute === 'asPath' ? path.asPath.length
        : step.attribute === 'med' ? path.med
        : step.attribute === 'originType' ? path.origin
        : path.routerId;
      
      if (step.attribute === 'med') {
        // MED越小越好
        if (pathValue > bestValue) {
          toEliminate.push(path);
        } else {
          toKeep.push(path);
        }
      } else if (step.attribute === 'localPref') {
        // LocalPref越大越好
        if (pathValue < bestValue) {
          toEliminate.push(path);
        } else {
          toKeep.push(path);
        }
      } else if (step.attribute === 'asPath') {
        // AS Path越短越好
        if (pathValue > bestValue) {
          toEliminate.push(path);
        } else {
          toKeep.push(path);
        }
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
    setRemainingPaths(samplePaths);
    setEliminatedPaths([]);
    setWinner(null);
    setShowDetail(null);
  }, []);

  const getOriginColor = (origin: string) => {
    switch (origin) {
      case 'IGP': return 'text-green-400';
      case 'EGP': return 'text-yellow-400';
      case 'Incomplete': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="space-y-6 h-full overflow-y-auto">
        {/* 控制按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleNextStep}
            disabled={!!winner || currentStep >= bgpDecisionSteps.length}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            {winner ? '决策完成' : `执行第${currentStep + 1}步`}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            重置
          </button>
        </div>

        {/* 决策进度 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                  <div className="font-medium">{step.name}</div>
                  <div className="text-sm text-gray-400">{step.description}</div>
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

        {/* 路径对比表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 剩余候选路径 */}
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Route className="w-5 h-5 text-green-400" />
              候选路径 ({remainingPaths.length})
            </h3>
            <AnimatePresence>
              {remainingPaths.map((path) => (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`p-4 rounded-lg mb-3 border-2 ${
                    winner?.id === path.id
                      ? 'bg-yellow-500/20 border-yellow-500'
                      : 'bg-gray-700/50 border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold">路径 via {path.nextHop}</span>
                    {winner?.id === path.id && (
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-400">AS Path:</div>
                    <div className="font-mono">{path.asPath.join(' > ')}</div>
                    <div className="text-gray-400">Local Pref:</div>
                    <div className="font-mono text-blue-400">{path.localPref}</div>
                    <div className="text-gray-400">MED:</div>
                    <div className="font-mono">{path.med}</div>
                    <div className="text-gray-400">Origin:</div>
                    <div className={`font-mono ${getOriginColor(path.origin)}`}>{path.origin}</div>
                    <div className="text-gray-400">Router ID:</div>
                    <div className="font-mono">{path.routerId}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {remainingPaths.length === 0 && (
              <div className="text-gray-500 text-center py-8">无候选路径</div>
            )}
          </div>

          {/* 被淘汰路径 */}
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              被淘汰路径 ({eliminatedPaths.length})
            </h3>
            <AnimatePresence>
              {eliminatedPaths.map((path) => (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 0.5, x: 0 }}
                  className="p-4 rounded-lg mb-3 bg-gray-700/30 border border-red-500/30"
                >
                  <div className="font-mono font-bold mb-2">路径 via {path.nextHop}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">AS Path:</div>
                    <div className="font-mono text-gray-500">{path.asPath.join(' > ')}</div>
                    <div className="text-gray-500">Local Pref:</div>
                    <div className="font-mono text-gray-500">{path.localPref}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {eliminatedPaths.length === 0 && (
              <div className="text-gray-500 text-center py-8">暂无被淘汰路径</div>
            )}
          </div>
        </div>

        {/* 知识点说明 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">BGP选路原则要点</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span><strong>Weight</strong>: Cisco私有，本地有效，不传递</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span><strong>Local Preference</strong>: 默认100，IBGP传递，越大越优</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span><strong>AS Path</strong>: 越短越优，可通过prepend增加长度</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span><strong>Origin</strong>: IGP(i) &gt; EGP(e) &gt; Incomplete(?)</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span><strong>MED</strong>: 外部度量，越小越优，默认0</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span><strong>eBGP &gt; iBGP</strong>: 外部邻居优先于内部邻居</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span><strong>Router ID</strong>: 越小越优，最后比较项</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span>可通过<strong>路由策略</strong>修改选路结果</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
