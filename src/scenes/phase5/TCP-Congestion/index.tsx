import React, { useState, useEffect } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, AlertCircle, Play, RotateCcw, Info, BookOpen, BarChart3, Network } from 'lucide-react';

interface Algorithm {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  formula: string;
  color: string;
  examPoint: string;
}

const algorithms: Algorithm[] = [
  {
    id: 'slowstart',
    name: '慢启动 (Slow Start)',
    description: '连接建立初期或超时后，拥塞窗口指数增长，快速探测网络容量',
    trigger: '连接建立、超时重传',
    action: 'cwnd *= 2 (每RTT)',
    formula: 'cwnd = cwnd × 2',
    color: 'bg-green-500',
    examPoint: '初始cwnd=1~2 MSS，指数增长至ssthresh',
  },
  {
    id: 'congavoid',
    name: '拥塞避免 (Congestion Avoidance)',
    description: 'cwnd达到ssthresh后转为线性增长，保守探测剩余容量',
    trigger: 'cwnd >= ssthresh',
    action: 'cwnd += 1 (每RTT)',
    formula: 'cwnd = cwnd + 1',
    color: 'bg-blue-500',
    examPoint: '线性增长，加法增大(Additive Increase)',
  },
  {
    id: 'fastretransmit',
    name: '快速重传 (Fast Retransmit)',
    description: '收到3个重复ACK立即重传，不等待超时，减少等待时间',
    trigger: '收到3个重复ACK (dup ACK)',
    action: '立即重传丢失段',
    formula: '重传seq = ack',
    color: 'bg-orange-500',
    examPoint: '3个dup ACK触发，不等RTO超时',
  },
  {
    id: 'fastrecovery',
    name: '快速恢复 (Fast Recovery)',
    description: '快速重传后进入恢复阶段，cwnd不降为1，保持吞吐量',
    trigger: '快速重传后',
    action: 'ssthresh=cwnd/2, cwnd=ssthresh+3',
    formula: 'ssthresh = cwnd/2, cwnd = ssthresh + 3',
    color: 'bg-purple-500',
    examPoint: '乘法减小(Multiplicative Decrease)，cwnd不回到1',
  },
];

// TCP版本对比
const tcpVersions = [
  { name: 'TCP Tahoe', features: ['慢启动', '拥塞避免', '超时重传'], missing: '快速恢复', desc: '早期版本，超时后cwnd直接降为1' },
  { name: 'TCP Reno', features: ['慢启动', '拥塞避免', '快速重传', '快速恢复'], missing: '-', desc: '现代主流，3个dup ACK触发快速恢复' },
  { name: 'TCP NewReno', features: ['慢启动', '拥塞避免', '快速重传', '改进的快速恢复'], missing: '-', desc: '部分ACK处理优化，避免不必要的重传' },
  { name: 'TCP CUBIC', features: ['基于三次函数的拥塞控制', '适合高带宽延迟积网络'], missing: '-', desc: 'Linux默认，高速网络优化' },
];

export default function TCPCongestion() {
  const [cwnd, setCwnd] = useState(1);
  const [ssthresh, setSsthresh] = useState(16);
  const [rtt, setRtt] = useState(0);
  const [phase, setPhase] = useState<'slowstart' | 'congavoid' | 'fastrecovery'>('slowstart');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<{rtt: number; cwnd: number; phase: string; note?: string}[]>([{rtt: 0, cwnd: 1, phase: 'slowstart'}]);
  const [selectedAlgo, setSelectedAlgo] = useState<Algorithm>(algorithms[0]);
  const [showExamTips, setShowExamTips] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setRtt(prev => {
          const newRtt = prev + 1;
          setCwnd(currentCwnd => {
            let newCwnd = currentCwnd;
            let newPhase = phase;

            if (phase === 'slowstart') {
              newCwnd = currentCwnd * 2;
              if (newCwnd >= ssthresh) {
                newPhase = 'congavoid';
                setPhase('congavoid');
              }
            } else if (phase === 'congavoid') {
              newCwnd = currentCwnd + 1;
            } else if (phase === 'fastrecovery') {
              newCwnd = ssthresh;
              newPhase = 'congavoid';
              setPhase('congavoid');
            }

            setHistory(h => [...h, {rtt: newRtt, cwnd: newCwnd, phase: newPhase}]);
            return newCwnd;
          });
          return newRtt;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isRunning, phase, ssthresh]);

  const handleCongestion = () => {
    const newSsthresh = Math.floor(cwnd / 2);
    setSsthresh(newSsthresh);
    setCwnd(1);
    setPhase('slowstart');
    setHistory(h => [...h, {rtt: rtt + 1, cwnd: 1, phase: 'slowstart', note: `拥塞! ssthresh=${newSsthresh}`}]);
  };

  const handleFastRetransmit = () => {
    const newSsthresh = Math.floor(cwnd / 2);
    setSsthresh(newSsthresh);
    setCwnd(newSsthresh + 3);
    setPhase('fastrecovery');
    setHistory(h => [...h, {rtt: rtt + 1, cwnd: newSsthresh + 3, phase: 'fastrecovery', note: '快速重传/恢复'}]);
  };

  const reset = () => {
    setCwnd(1);
    setSsthresh(16);
    setRtt(0);
    setPhase('slowstart');
    setHistory([{rtt: 0, cwnd: 1, phase: 'slowstart'}]);
    setIsRunning(false);
  };

  const maxCwnd = Math.max(32, ...history.map(h => h.cwnd));

  return (
    <SceneLayout
      title="TCP拥塞控制"
      description="TCP拥塞控制四大算法：慢启动、拥塞避免、快速重传、快速恢复"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：可视化 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 拥塞窗口变化图 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                <BarChart3 className="w-5 h-5 inline mr-2" />
                拥塞窗口(cwnd)变化图
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-slate-600 dark:text-slate-400">慢启动</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-slate-600 dark:text-slate-400">拥塞避免</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-slate-600 dark:text-slate-400">快速恢复</span>
                </div>
              </div>
            </div>

            {/* 图表 */}
            <div className="relative h-64 border-l border-b border-slate-300 dark:border-slate-600">
              {/* Y轴标签 */}
              <div className="absolute -left-8 top-0 text-xs text-slate-500">cwnd</div>
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-xs text-slate-500 transform -rotate-90">
                窗口大小(MSS)
              </div>

              {/* X轴标签 */}
              <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-xs text-slate-500">
                RTT (往返时间)
              </div>

              {/* ssthresh线 */}
              <div
                className="absolute w-full border-t-2 border-dashed border-red-400"
                style={{ bottom: `${(ssthresh / maxCwnd) * 100}%` }}
              >
                <span className="absolute right-0 -top-5 text-xs text-red-500">
                  ssthresh={ssthresh}
                </span>
              </div>

              {/* 数据点 */}
              <svg className="absolute inset-0 w-full h-full">
                {history.map((point, index) => {
                  if (index === 0) return null;
                  const prev = history[index - 1];
                  const x1 = (prev.rtt / Math.max(20, history.length)) * 100;
                  const y1 = 100 - (prev.cwnd / maxCwnd) * 100;
                  const x2 = (point.rtt / Math.max(20, history.length)) * 100;
                  const y2 = 100 - (point.cwnd / maxCwnd) * 100;
                  
                  const color = point.phase === 'slowstart' ? '#22c55e' :
                               point.phase === 'congavoid' ? '#3b82f6' : '#a855f7';
                  
                  return (
                    <line
                      key={index}
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke={color}
                      strokeWidth="2"
                    />
                  );
                })}
                
                {/* 当前点 */}
                <circle
                  cx={`${(rtt / Math.max(20, history.length)) * 100}%`}
                  cy={`${100 - (cwnd / maxCwnd) * 100}%`}
                  r="6"
                  fill={phase === 'slowstart' ? '#22c55e' : phase === 'congavoid' ? '#3b82f6' : '#a855f7'}
                  className="animate-pulse"
                />
              </svg>
            </div>

            {/* 当前状态 */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                <div className="text-sm text-slate-500 dark:text-slate-400">当前阶段</div>
                <div className={`text-lg font-bold ${
                  phase === 'slowstart' ? 'text-green-600' : 
                  phase === 'congavoid' ? 'text-blue-600' : 'text-purple-600'
                }`}>
                  {phase === 'slowstart' ? '慢启动' : 
                   phase === 'congavoid' ? '拥塞避免' : '快速恢复'}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                <div className="text-sm text-slate-500 dark:text-slate-400">拥塞窗口(cwnd)</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{cwnd}</div>
                <div className="text-xs text-slate-500">MSS</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                <div className="text-sm text-slate-500 dark:text-slate-400">慢启动阈值</div>
                <div className="text-2xl font-bold text-red-600">{ssthresh}</div>
                <div className="text-xs text-slate-500">ssthresh</div>
              </div>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex flex-wrap gap-3">
              <motion.button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                  isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isRunning ? '暂停模拟' : <><Play className="w-4 h-4 inline mr-2" />开始模拟</>}
              </motion.button>

              <motion.button
                onClick={handleCongestion}
                disabled={isRunning}
                className="px-6 py-3 rounded-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AlertCircle className="w-4 h-4 inline mr-2" />
                模拟拥塞(超时)
              </motion.button>

              <motion.button
                onClick={handleFastRetransmit}
                disabled={isRunning}
                className="px-6 py-3 rounded-lg font-semibold bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                快速重传/恢复
              </motion.button>

              <motion.button
                onClick={reset}
                className="px-6 py-3 rounded-lg font-semibold bg-slate-500 hover:bg-slate-600 text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCcw className="w-4 h-4 inline mr-2" />
                重置
              </motion.button>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              💡 提示：点击"开始模拟"观察慢启动→拥塞避免的转变，点击"模拟拥塞"查看超时后的行为，点击"快速重传"查看3个dup ACK的处理
            </div>
          </div>

          {/* TCP版本对比 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4"
            >
              <Network className="w-5 h-5" />
              {showComparison ? '▼' : '▶'} TCP版本演进对比
            </button>
            {showComparison && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3">版本</th>
                      <th className="text-left py-2 px-3">核心特性</th>
                      <th className="text-left py-2 px-3">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tcpVersions.map((v, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{v.name}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {v.features.map((f, j) => (
                              <span key={j} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">{f}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{v.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：算法说明 */}
        <div className="space-y-6">
          {/* 算法列表 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              拥塞控制算法
            </h3>
            <div className="space-y-3">
              {algorithms.map((algo) => (
                <motion.button
                  key={algo.id}
                  onClick={() => setSelectedAlgo(algo)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedAlgo.id === algo.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${algo.color}`}></div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {algo.name}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 算法详情 */}
          <motion.div
            key={selectedAlgo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
          >
            <div className={`w-12 h-12 ${selectedAlgo.color} rounded-lg flex items-center justify-center mb-4`}>
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
              {selectedAlgo.name}
            </h3>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              {selectedAlgo.description}
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400">触发条件</div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedAlgo.trigger}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400">执行动作</div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedAlgo.action}
                </div>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-sm text-yellow-600 dark:text-yellow-400">📌 考试重点</div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedAlgo.examPoint}
                </div>
              </div>
            </div>
          </motion.div>

          {/* 关键概念 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              关键概念
            </h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <strong className="text-slate-800 dark:text-slate-200">cwnd (拥塞窗口)</strong>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  发送方根据网络拥塞程度动态调整的窗口大小，初始值通常为1~2 MSS
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <strong className="text-slate-800 dark:text-slate-200">ssthresh (慢启动阈值)</strong>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  慢启动和拥塞避免的分界点，拥塞时降为当前cwnd的一半（乘法减小）
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <strong className="text-slate-800 dark:text-slate-200">AIMD策略</strong>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  加法增大(Additive Increase)：cwnd线性增长<br/>
                  乘法减小(Multiplicative Decrease)：拥塞时cwnd减半
                </p>
              </div>
            </div>
          </div>

          {/* 考试要点 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <button
              onClick={() => setShowExamTips(!showExamTips)}
              className="flex items-center gap-2 text-lg font-semibold text-yellow-600 dark:text-yellow-400 mb-2"
            >
              <BookOpen className="w-5 h-5" />
              {showExamTips ? '▼' : '▶'} 考试要点总结
            </button>
            {showExamTips && (
              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="font-medium text-yellow-700 dark:text-yellow-400 mb-2">必考公式</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>慢启动：cwnd = cwnd × 2（每RTT）</li>
                    <li>拥塞避免：cwnd = cwnd + 1（每RTT）</li>
                    <li>超时后：ssthresh = cwnd/2, cwnd = 1</li>
                    <li>快速恢复：ssthresh = cwnd/2, cwnd = ssthresh + 3</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="font-medium text-slate-800 dark:text-slate-200 mb-2">常见考题</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                    <li>计算cwnd达到某个值需要的RTT数</li>
                    <li>拥塞发生后cwnd和ssthresh的变化</li>
                    <li>区分超时和3个dup ACK的处理差异</li>
                    <li>TCP Tahoe vs Reno的区别</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="font-medium text-slate-800 dark:text-slate-200 mb-2">易错点</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                    <li>快速恢复后cwnd不回到1，而是ssthresh+3</li>
                    <li>ssthresh是cwnd/2后取整</li>
                    <li>拥塞避免阶段是线性增长，不是指数</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
