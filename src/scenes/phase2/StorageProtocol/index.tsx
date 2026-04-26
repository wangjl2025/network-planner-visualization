import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import { 
  HardDrive, 
  Network, 
  Zap, 
  Clock,
  Activity,
  Server,
  Database,
  Cable
} from 'lucide-react';

// 存储协议定义
const STORAGE_PROTOCOLS = {
  fcSan: {
    name: 'FC-SAN',
    fullName: 'Fibre Channel SAN',
    description: '光纤通道存储区域网络',
    latency: 0.5,
    bandwidth: '16/32/64 Gbps',
    distance: '10km(单模)，2km(多模)',
    cost: '高',
    complexity: '中',
    useCase: '核心数据库、ERP、关键业务',
    color: '#3b82f6',
    icon: Cable
  },
  ipSan: {
    name: 'IP-SAN',
    fullName: 'iSCSI/NFS over IP',
    description: '基于IP网络的块/文件存储',
    latency: 5,
    bandwidth: '10/25/100 Gbps',
    distance: '不限（IP可达即可用）',
    cost: '低',
    complexity: '低',
    useCase: '通用业务、虚拟化、备份',
    color: '#22c55e',
    icon: Network
  },
  nvmeOf: {
    name: 'NVMe-oF',
    fullName: 'NVMe over Fabrics',
    description: '高性能NVMe over RDMA/TCP网络',
    latency: 0.2,
    bandwidth: '100/200/400 Gbps',
    distance: '本地<100m，RDMA可达100km+',
    cost: '很高',
    complexity: '高',
    useCase: 'AI/ML训练、实时分析、高频交易',
    color: '#f59e0b',
    icon: Zap
  }
};

// 测试场景
const TEST_SCENARIOS = {
  database: {
    name: '数据库事务',
    ioPattern: '随机小IO',
    blockSize: '8KB',
    readRatio: '70%'
  },
  analytics: {
    name: '大数据分析',
    ioPattern: '顺序大IO',
    blockSize: '1MB',
    readRatio: '90%'
  },
  virtualization: {
    name: '虚拟化桌面',
    ioPattern: '混合IO',
    blockSize: '32KB',
    readRatio: '60%'
  }
};

interface IOPoint {
  time: number;
  latency: number;
  throughput: number;
}

interface AnimationStep {
  id: string;
  title: string;
  description: string;
}

export function StorageProtocolScene() {
  const [selectedProtocol, setSelectedProtocol] = useState<keyof typeof STORAGE_PROTOCOLS>('fcSan');
  const [testScenario, setTestScenario] = useState<keyof typeof TEST_SCENARIOS>('database');
  const [ioSize, setIoSize] = useState(8); // KB
  const [queueDepth, setQueueDepth] = useState(32);
  const [isTesting, setIsTesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: IOPoint[] }>({});
  const [currentResult, setCurrentResult] = useState<{ iops: number; latency: number; throughput: number } | null>(null);

  const protocolInfo = STORAGE_PROTOCOLS[selectedProtocol];
  const scenarioInfo = TEST_SCENARIOS[testScenario];

  // 计算性能指标
  const calculatePerformance = useCallback(() => {
    const baseLatency = protocolInfo.latency;
    const ioOverhead = ioSize * 0.01; // 每KB增加0.01ms
    const queueLatency = queueDepth * 0.05; // 队列延迟
    
    const totalLatency = baseLatency + ioOverhead + queueLatency;
    const iops = Math.floor(1000 / totalLatency * queueDepth * 0.8);
    const throughput = (iops * ioSize / 1024).toFixed(1);

    return {
      iops,
      latency: totalLatency, // 改为数字，而不是字符串
      throughput: parseFloat(throughput)
    };
  }, [protocolInfo.latency, ioSize, queueDepth]);

  // 运行测试
  const runTest = useCallback(() => {
    setIsTesting(true);
    setCurrentResult(null);

    // 生成测试数据点
    const points: IOPoint[] = [];
    const result = calculatePerformance();
    
    for (let i = 0; i < 50; i++) {
      points.push({
        time: i * 0.1,
        latency: result.latency + Math.random() * 2,
        throughput: result.throughput * (0.8 + Math.random() * 0.4)
      });
    }

    setTimeout(() => {
      setTestResults(prev => ({ ...prev, [selectedProtocol]: points }));
      setCurrentResult(result);
      setIsTesting(false);
    }, 1500);
  }, [calculatePerformance, selectedProtocol]);

  // 动画步骤
  const steps: AnimationStep[] = useMemo(() => {
    return [
      {
        id: 'protocol',
        title: protocolInfo.name,
        description: `${protocolInfo.fullName} - ${protocolInfo.description}`
      },
      {
        id: 'performance',
        title: '性能特性',
        description: `延迟: ${protocolInfo.latency}ms, 带宽: ${protocolInfo.bandwidth}`
      },
      {
        id: 'scenario',
        title: '测试场景',
        description: `${scenarioInfo.name} - ${scenarioInfo.ioPattern}`
      }
    ];
  }, [protocolInfo, scenarioInfo]);

  // 参数定义
  const parameters = [
    {
      id: 'protocol',
      name: '存储协议',
      type: 'select' as const,
      value: selectedProtocol,
      options: [
        { value: 'fcSan', label: 'FC-SAN (光纤通道)' },
        { value: 'ipSan', label: 'IP-SAN (iSCSI/NFS)' },
        { value: 'nvmeOf', label: 'NVMe-oF (高性能)' }
      ]
    },
    {
      id: 'scenario',
      name: '测试场景',
      type: 'select' as const,
      value: testScenario,
      options: [
        { value: 'database', label: '数据库事务' },
        { value: 'analytics', label: '大数据分析' },
        { value: 'virtualization', label: '虚拟化桌面' }
      ]
    },
    {
      id: 'ioSize',
      name: 'IO大小',
      type: 'range' as const,
      value: ioSize,
      min: 4,
      max: 1024,
      step: 4,
      unit: 'KB'
    },
    {
      id: 'queueDepth',
      name: '队列深度',
      type: 'range' as const,
      value: queueDepth,
      min: 1,
      max: 256,
      step: 1,
      unit: ''
    }
  ];

  const handleParameterChange = (id: string, value: string | number | boolean) => {
    switch (id) {
      case 'protocol':
        setSelectedProtocol(value as keyof typeof STORAGE_PROTOCOLS);
        setCurrentResult(null);
        break;
      case 'scenario':
        setTestScenario(value as keyof typeof TEST_SCENARIOS);
        // 根据场景设置默认IO大小
        if (value === 'database') setIoSize(8);
        if (value === 'analytics') setIoSize(1024);
        if (value === 'virtualization') setIoSize(32);
        setCurrentResult(null);
        break;
      case 'ioSize':
        setIoSize(value as number);
        setCurrentResult(null);
        break;
      case 'queueDepth':
        setQueueDepth(value as number);
        setCurrentResult(null);
        break;
    }
  };

  const ProtocolIcon = protocolInfo.icon;

  const sceneData = {
    id: 'storage-protocol',
    title: '存储协议对比',
    description: 'FC-SAN、IP-SAN、NVMe-oF 延迟、带宽、适用场景可视化对比',
    phase: 2 as const,
    category: '数据中心',
    duration: '6-8分钟',
    difficulty: 'medium' as const,
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false} noHeightLimit={true}>
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* 参数面板 */}
        <div className="col-span-3 h-full overflow-y-auto">
          <ParameterPanel
            title="测试配置"
            parameters={parameters}
            onChange={handleParameterChange}
          />

          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">性能测试</h3>
            <button
              onClick={runTest}
              disabled={isTesting}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <><Activity className="w-4 h-4 animate-spin" /> 测试中...</>
              ) : (
                <><Zap className="w-4 h-4" /> 运行测试</>
              )}
            </button>
          </div>

          <InfoPanel
            title="测试场景"
            content={
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">场景</div>
                  <div className="text-slate-200 font-medium">{scenarioInfo.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">IO模式</div>
                    <div className="text-sm text-slate-300">{scenarioInfo.ioPattern}</div>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">块大小</div>
                    <div className="text-sm text-slate-300">{scenarioInfo.blockSize}</div>
                  </div>
                </div>
                <div className="p-2 bg-slate-800/50 rounded">
                  <div className="text-xs text-slate-400">读比例</div>
                  <div className="text-sm text-slate-300">{scenarioInfo.readRatio}</div>
                </div>
              </div>
            }
          />
        </div>

        {/* 可视化区域 */}
        <div className="col-span-6">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-6 h-[500px] relative overflow-hidden">
            {/* 协议架构图 */}
            <div className="flex flex-col items-center justify-center h-full">
              {/* 服务器端 */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mb-8"
              >
                <div className="p-4 bg-slate-800 rounded-xl border border-slate-600">
                  <Server className="w-8 h-8 text-blue-400" />
                  <div className="text-xs text-slate-400 mt-2 text-center">应用服务器</div>
                </div>
                
                {/* 连接 */}
                <div className="flex flex-col items-center">
                  <motion.div
                    className="w-24 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    {protocolInfo.bandwidth}
                  </div>
                  {isTesting && (
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: protocolInfo.color }}
                      animate={{ x: [-48, 48], opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  )}
                </div>

                <div className="p-4 bg-slate-800 rounded-xl border border-slate-600">
                  <ProtocolIcon className="w-8 h-8" style={{ color: protocolInfo.color }} />
                  <div className="text-xs text-slate-400 mt-2 text-center">{protocolInfo.name}</div>
                </div>
              </motion.div>

              {/* 网络层 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-md p-4 bg-slate-800/50 rounded-lg border border-slate-700 mb-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-300">传输网络</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    距离: {protocolInfo.distance} | 延迟: {protocolInfo.latency}ms
                  </div>
                </div>
                
                {/* 延迟可视化 */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">协议延迟</span>
                    <span style={{ color: protocolInfo.color }}>{protocolInfo.latency} ms</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: protocolInfo.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(protocolInfo.latency / 10) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* 存储端 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-4 bg-slate-800 rounded-xl border border-slate-600"
              >
                <Database className="w-8 h-8 text-purple-400 mx-auto" />
                <div className="text-xs text-slate-400 mt-2 text-center">存储阵列</div>
                <div className="flex gap-4 mt-3">
                  {[1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      className="w-8 h-12 bg-slate-700 rounded border border-slate-600"
                      animate={isTesting ? { opacity: [0.5, 1, 0.5] } : {}}
                      transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                    />
                  ))}
                </div>
              </motion.div>

              {/* 测试结果 */}
              {currentResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute bottom-4 left-4 right-4 p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg border border-slate-600"
                >
                  <div className="text-sm font-medium text-slate-300 mb-3">测试结果</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: protocolInfo.color }}>
                        {currentResult.iops.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">IOPS</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: protocolInfo.color }}>
                        {currentResult.latency}
                      </div>
                      <div className="text-xs text-slate-400">延迟 (ms)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: protocolInfo.color }}>
                        {currentResult.throughput}
                      </div>
                      <div className="text-xs text-slate-400">吞吐量 (GB/s)</div>
                    </div>
                  </div>
                </motion.div>
              )}
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
              onReset={() => {
                setIsAnimating(false);
                setCurrentStep(0);
                setCurrentResult(null);
              }}
              onStepChange={setCurrentStep}
            />
          </div>
        </div>

        {/* 信息面板 */}
        <div className="col-span-3 space-y-4">
          <InfoPanel
            title={`${protocolInfo.name} 特性`}
            content={
              <div className="space-y-3">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">全称</div>
                  <div className="text-sm text-slate-200">{protocolInfo.fullName}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">描述</div>
                  <div className="text-sm text-slate-200">{protocolInfo.description}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">延迟</div>
                    <div className="text-sm font-medium" style={{ color: protocolInfo.color }}>
                      {protocolInfo.latency} ms
                    </div>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">带宽</div>
                    <div className="text-sm text-slate-200">{protocolInfo.bandwidth}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">传输距离</div>
                    <div className="text-sm text-slate-200">{protocolInfo.distance}</div>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">成本</div>
                    <div className="text-sm text-slate-200">{protocolInfo.cost}</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">适用场景</div>
                  <div className="text-sm text-slate-200">{protocolInfo.useCase}</div>
                </div>
              </div>
            }
          />

          <InfoPanel
            title="协议对比"
            content={
              <div className="space-y-2">
                {Object.entries(STORAGE_PROTOCOLS).map(([key, protocol]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedProtocol === key
                        ? 'bg-slate-700 border-slate-500'
                        : 'bg-slate-800/50 hover:bg-slate-700/50'
                    }`}
                    onClick={() => setSelectedProtocol(key as keyof typeof STORAGE_PROTOCOLS)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-200">{protocol.name}</span>
                      <span className="text-xs" style={{ color: protocol.color }}>
                        {protocol.latency}ms
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{protocol.bandwidth}</div>
                    <div className="text-xs text-slate-500 mt-1">{protocol.useCase}</div>
                  </div>
                ))}
              </div>
            }
          />

          <InfoPanel
            title="延迟对比"
            content={
              <div className="space-y-3">
                {Object.entries(STORAGE_PROTOCOLS)
                  .sort((a, b) => a[1].latency - b[1].latency)
                  .map(([key, protocol]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">{protocol.name}</span>
                        <span style={{ color: protocol.color }}>{protocol.latency}ms</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ 
                            backgroundColor: protocol.color,
                            width: `${(protocol.latency / 10) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            }
          />
        </div>
      </div>
    </SceneLayout>
  );
}
