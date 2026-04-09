import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import { RotateCcw, HardDrive, AlertTriangle, CheckCircle, Database } from 'lucide-react';

// RAID级别定义
const RAID_LEVELS = {
  RAID0: {
    name: 'RAID 0',
    description: '条带化，无冗余',
    minDisks: 2,
    capacity: '100%',
    faultTolerance: 0,
    readSpeed: 'N倍',
    writeSpeed: 'N倍',
    useCase: '视频编辑、游戏（追求性能，可接受数据丢失风险）',
    color: '#ef4444'
  },
  RAID1: {
    name: 'RAID 1',
    description: '镜像，完全冗余',
    minDisks: 2,
    capacity: '50%',
    faultTolerance: 1,
    readSpeed: 'N倍',
    writeSpeed: '1倍',
    useCase: '系统盘、关键数据（高可靠性要求）',
    color: '#22c55e'
  },
  RAID5: {
    name: 'RAID 5',
    description: '分布式奇偶校验',
    minDisks: 3,
    capacity: '(N-1)/N',
    faultTolerance: 1,
    readSpeed: '(N-1)倍',
    writeSpeed: '较慢（需计算校验）',
    useCase: '文件服务器、数据库（平衡性能与可靠性）',
    color: '#3b82f6'
  },
  RAID6: {
    name: 'RAID 6',
    description: '双分布式奇偶校验',
    minDisks: 4,
    capacity: '(N-2)/N',
    faultTolerance: 2,
    readSpeed: '(N-2)倍',
    writeSpeed: '较慢（双重校验）',
    useCase: '大容量存储、归档系统（高可靠性大容量）',
    color: '#8b5cf6'
  },
  RAID10: {
    name: 'RAID 10',
    description: '镜像+条带化',
    minDisks: 4,
    capacity: '50%',
    faultTolerance: '每组1个',
    readSpeed: 'N倍',
    writeSpeed: 'N/2倍',
    useCase: '数据库、高性能应用（性能+可靠性最优）',
    color: '#f59e0b'
  }
};

interface Disk {
  id: number;
  data: ('data' | 'parity' | 'mirror' | 'empty' | 'failed')[];
  status: 'normal' | 'failed' | 'rebuilding';
}

interface AnimationStep {
  id: string;
  title: string;
  description: string;
}

export function RAIDScene() {
  const [selectedRAID, setSelectedRAID] = useState<keyof typeof RAID_LEVELS>('RAID5');
  const [diskCount, setDiskCount] = useState(4);
  const [failedDisk, setFailedDisk] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [disks, setDisks] = useState<Disk[]>([]);

  const raidInfo = RAID_LEVELS[selectedRAID];

  // 生成磁盘数据结构
  const generateDisks = useCallback(() => {
    const newDisks: Disk[] = [];
    const blocksPerDisk = 8;

    for (let i = 0; i < diskCount; i++) {
      const disk: Disk = {
        id: i,
        data: [],
        status: failedDisk === i ? 'failed' : 'normal'
      };

      for (let j = 0; j < blocksPerDisk; j++) {
        switch (selectedRAID) {
          case 'RAID0':
            disk.data.push('data');
            break;
          case 'RAID1':
            disk.data.push(i === 0 ? 'data' : 'mirror');
            break;
          case 'RAID5':
            const parityPos5 = j % diskCount;
            disk.data.push(i === parityPos5 ? 'parity' : 'data');
            break;
          case 'RAID6':
            const parityPos6a = j % diskCount;
            const parityPos6b = (j + 1) % diskCount;
            disk.data.push(i === parityPos6a || i === parityPos6b ? 'parity' : 'data');
            break;
          case 'RAID10':
            const pairIndex = Math.floor(i / 2);
            const isPrimary = i % 2 === 0;
            disk.data.push(isPrimary ? 'data' : 'mirror');
            break;
        }
      }
      newDisks.push(disk);
    }
    setDisks(newDisks);
  }, [selectedRAID, diskCount, failedDisk]);

  useEffect(() => {
    generateDisks();
  }, [generateDisks]);

  // 动画步骤
  const steps: AnimationStep[] = useMemo(() => {
    const steps: AnimationStep[] = [
      {
        id: 'intro',
        title: `${raidInfo.name} 架构`,
        description: raidInfo.description
      },
      {
        id: 'capacity',
        title: '容量利用率',
        description: `有效容量: ${raidInfo.capacity}，最小磁盘数: ${raidInfo.minDisks}`
      },
      {
        id: 'performance',
        title: '读写性能',
        description: `读性能: ${raidInfo.readSpeed}，写性能: ${raidInfo.writeSpeed}`
      },
      {
        id: 'fault',
        title: '容错能力',
        description: `可容忍故障磁盘: ${raidInfo.faultTolerance}个`
      }
    ];

    if (failedDisk !== null) {
      steps.push({
        id: 'recovery',
        title: '数据恢复',
        description: `磁盘${failedDisk + 1}故障，正在通过校验数据恢复...`
      });
    }

    return steps;
  }, [raidInfo, failedDisk]);

  // 参数定义
  const parameters = [
    {
      id: 'raidLevel',
      name: 'RAID级别',
      type: 'select' as const,
      value: selectedRAID,
      options: [
        { value: 'RAID0', label: 'RAID 0 - 条带化' },
        { value: 'RAID1', label: 'RAID 1 - 镜像' },
        { value: 'RAID5', label: 'RAID 5 - 分布式校验' },
        { value: 'RAID6', label: 'RAID 6 - 双校验' },
        { value: 'RAID10', label: 'RAID 10 - 镜像+条带' }
      ]
    },
    {
      id: 'diskCount',
      name: '磁盘数量',
      type: 'range' as const,
      value: diskCount,
      min: raidInfo.minDisks,
      max: 8,
      step: 1,
      unit: '块'
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
      case 'raidLevel':
        setSelectedRAID(value as keyof typeof RAID_LEVELS);
        setFailedDisk(null);
        const minDisks = RAID_LEVELS[value as keyof typeof RAID_LEVELS].minDisks;
        if (diskCount < minDisks) {
          setDiskCount(minDisks);
        }
        break;
      case 'diskCount':
        setDiskCount(value as number);
        setFailedDisk(null);
        break;
      case 'showDataFlow':
        setShowDataFlow(value as boolean);
        break;
    }
  };

  const handleSimulateFailure = () => {
    if (failedDisk === null) {
      setFailedDisk(Math.floor(Math.random() * diskCount));
    } else {
      setFailedDisk(null);
    }
  };

  const getBlockColor = (type: string, status: string) => {
    if (status === 'failed') return 'bg-red-900/50 border-red-600';
    switch (type) {
      case 'data': return 'bg-blue-500/80 border-blue-400';
      case 'parity': return 'bg-yellow-500/80 border-yellow-400';
      case 'mirror': return 'bg-green-500/80 border-green-400';
      default: return 'bg-slate-700 border-slate-600';
    }
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'data': return <Database className="w-3 h-3" />;
      case 'parity': return <span className="text-xs font-bold">P</span>;
      case 'mirror': return <span className="text-xs font-bold">M</span>;
      default: return null;
    }
  };

  const sceneData = {
    id: 'raid',
    title: 'RAID技术对比',
    description: 'RAID 0/1/5/6/10 原理、容量、性能与容错能力可视化对比',
    phase: 2 as const,
    category: '数据中心',
    duration: '8-10分钟',
    difficulty: 'medium' as const,
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* 参数面板 */}
        <div className="col-span-3 h-full overflow-y-auto">
          <ParameterPanel
            title="RAID配置"
            parameters={parameters}
            onChange={handleParameterChange}
          />
          
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">故障模拟</h3>
            <button
              onClick={handleSimulateFailure}
              className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                failedDisk !== null
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {failedDisk !== null ? (
                <><CheckCircle className="w-4 h-4" /> 恢复磁盘</>
              ) : (
                <><AlertTriangle className="w-4 h-4" /> 模拟磁盘故障</>
              )}
            </button>
            {failedDisk !== null && (
              <p className="mt-2 text-xs text-red-400 text-center">
                磁盘 {failedDisk + 1} 已故障
              </p>
            )}
          </div>
        </div>

        {/* 可视化区域 */}
        <div className="col-span-6">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-6 h-[500px] relative overflow-hidden">
            {/* RAID可视化 */}
            <div className="flex flex-col items-center justify-center h-full gap-4">
              {/* 磁盘阵列 */}
              <div className="flex gap-3 flex-wrap justify-center">
                {disks.map((disk, diskIndex) => (
                  <motion.div
                    key={disk.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: diskIndex * 0.1 }}
                    className={`relative p-3 rounded-lg border-2 ${
                      disk.status === 'failed' 
                        ? 'bg-red-900/30 border-red-600' 
                        : 'bg-slate-800 border-slate-600'
                    }`}
                  >
                    {/* 磁盘标签 */}
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className={`w-4 h-4 ${
                        disk.status === 'failed' ? 'text-red-500' : 'text-slate-400'
                      }`} />
                      <span className={`text-xs font-medium ${
                        disk.status === 'failed' ? 'text-red-400' : 'text-slate-300'
                      }`}>
                        Disk {disk.id + 1}
                      </span>
                      {disk.status === 'failed' && (
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                    </div>

                    {/* 数据块 */}
                    <div className="grid grid-cols-2 gap-1">
                      {disk.data.map((block, blockIndex) => (
                        <motion.div
                          key={blockIndex}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: diskIndex * 0.1 + blockIndex * 0.05 }}
                          className={`w-8 h-8 rounded border flex items-center justify-center text-white ${
                            getBlockColor(block, disk.status)
                          }`}
                        >
                          {getBlockIcon(block)}
                        </motion.div>
                      ))}
                    </div>

                    {/* 故障遮罩 */}
                    {disk.status === 'failed' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-red-900/60 rounded-lg flex items-center justify-center"
                      >
                        <span className="text-red-200 font-bold text-lg">FAILED</span>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* 图例 */}
              <div className="flex gap-4 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500/80 border border-blue-400 rounded" />
                  <span className="text-slate-400">数据块</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500/80 border border-yellow-400 rounded" />
                  <span className="text-slate-400">校验块</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500/80 border border-green-400 rounded" />
                  <span className="text-slate-400">镜像块</span>
                </div>
              </div>

              {/* 数据流动画 */}
              {showDataFlow && !failedDisk && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-blue-400 rounded-full"
                      initial={{ left: '10%', top: '20%', opacity: 0 }}
                      animate={{
                        left: ['10%', '50%', '90%'],
                        top: ['20%', '50%', '80%'],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.4,
                        repeat: Infinity,
                        ease: 'linear'
                      }}
                    />
                  ))}
                </div>
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
                setFailedDisk(null);
              }}
              onStepChange={setCurrentStep}
            />
          </div>
        </div>

        {/* 信息面板 */}
        <div className="col-span-3 space-y-4">
          <InfoPanel
            title={`${raidInfo.name} 特性`}
            content={
              <div className="space-y-3">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">描述</div>
                  <div className="text-sm text-slate-200">{raidInfo.description}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">容量利用率</div>
                  <div className="text-sm font-medium" style={{ color: raidInfo.color }}>
                    {raidInfo.capacity}
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">容错能力</div>
                  <div className="text-sm text-slate-200">
                    可容忍 <span className="font-bold text-yellow-400">{raidInfo.faultTolerance}</span> 块磁盘故障
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">读写性能</div>
                  <div className="text-sm text-slate-200">
                    <div>读: {raidInfo.readSpeed}</div>
                    <div>写: {raidInfo.writeSpeed}</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">适用场景</div>
                  <div className="text-sm text-slate-200">{raidInfo.useCase}</div>
                </div>
              </div>
            }
          />

          {/* RAID对比表 */}
          <InfoPanel
            title="RAID对比速查"
            content={
              <div className="space-y-2 text-xs">
                {Object.entries(RAID_LEVELS).map(([key, info]) => (
                  <div
                    key={key}
                    className={`p-2 rounded cursor-pointer transition-all ${
                      selectedRAID === key 
                        ? 'bg-slate-700 border border-slate-500' 
                        : 'bg-slate-800/50 hover:bg-slate-700/50'
                    }`}
                    onClick={() => setSelectedRAID(key as keyof typeof RAID_LEVELS)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium" style={{ color: info.color }}>
                        {info.name}
                      </span>
                      <span className="text-slate-400">{info.capacity}</span>
                    </div>
                    <div className="text-slate-500 mt-1">
                      容错: {info.faultTolerance} | 最少: {info.minDisks}盘
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
