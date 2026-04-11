import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import { 
  RotateCcw, HardDrive, AlertTriangle, CheckCircle, Database, 
  Calculator, TrendingUp, Zap, Play, Pause, RefreshCw, 
  ShieldAlert, XCircle, Activity, Server, ArrowRight,
  Binary, Layers, AlertOctagon, Info
} from 'lucide-react';

// ==================== 类型定义 ====================

type BlockType = 'data' | 'parity' | 'mirror' | 'empty' | 'failed' | 'rebuilding';
type DiskStatus = 'normal' | 'failed' | 'rebuilding' | 'hotspare';

interface Block {
  id: string;
  type: BlockType;
  value?: number; // 用于XOR计算演示
  row: number;
}

interface Disk {
  id: number;
  blocks: Block[];
  status: DiskStatus;
  progress?: number; // 重建进度
}

interface XORCalculation {
  inputs: number[];
  result: number;
  step: number;
}

interface RebuildAnimation {
  isActive: boolean;
  currentRow: number;
  totalRows: number;
  sourceDisks: number[];
  targetDisk: number;
  phase: 'reading' | 'calculating' | 'writing' | 'complete';
}

// ==================== RAID配置数据 ====================

const RAID_CONFIGS = {
  RAID0: {
    name: 'RAID 0',
    description: '条带化存储，无冗余',
    detailDesc: '数据被分割成块并均匀分布在所有磁盘上，没有冗余信息。任何一块磁盘故障都会导致全部数据丢失。',
    minDisks: 2,
    capacity: '100%',
    faultTolerance: 0,
    readSpeed: 'N倍',
    writeSpeed: 'N倍',
    useCase: '视频编辑、临时数据缓存（追求极致性能，可接受数据丢失）',
    color: '#ef4444',
    riskLevel: '极高',
    failureImpact: '单盘故障 = 全部数据丢失',
    recoveryMethod: '无法恢复，需从备份还原'
  },
  RAID1: {
    name: 'RAID 1',
    description: '镜像存储，完全冗余',
    detailDesc: '数据同时写入两块或多块磁盘，形成完全相同的副本。单盘故障时，另一块盘可立即接管，数据零丢失。',
    minDisks: 2,
    capacity: '50%',
    faultTolerance: 'N-1',
    readSpeed: 'N倍',
    writeSpeed: '1倍',
    useCase: '系统盘、关键配置文件（高可靠性要求）',
    color: '#22c55e',
    riskLevel: '低',
    failureImpact: '单盘故障无影响，数据可正常读取',
    recoveryMethod: '更换故障盘，自动从镜像复制数据'
  },
  RAID5: {
    name: 'RAID 5',
    description: '分布式奇偶校验',
    detailDesc: '数据和奇偶校验信息交叉分布在所有磁盘上。通过XOR运算，单盘故障时可利用其他盘的数据和校验信息重建丢失数据。',
    minDisks: 3,
    capacity: '(N-1)/N',
    faultTolerance: 1,
    readSpeed: '(N-1)倍',
    writeSpeed: '较慢（写惩罚）',
    useCase: '文件服务器、数据库（平衡性能与可靠性）',
    color: '#3b82f6',
    riskLevel: '中等',
    failureImpact: '单盘故障可重建，双盘故障数据丢失',
    recoveryMethod: 'XOR校验计算重建丢失数据'
  },
  RAID6: {
    name: 'RAID 6',
    description: '双分布式奇偶校验',
    detailDesc: '使用两套独立的奇偶校验系统（P和Q），可容忍两块磁盘同时故障。适用于大容量存储，降低重建期间二次故障风险。',
    minDisks: 4,
    capacity: '(N-2)/N',
    faultTolerance: 2,
    readSpeed: '(N-2)倍',
    writeSpeed: '慢（双重写惩罚）',
    useCase: '大容量归档、冷数据存储（高可靠性大容量）',
    color: '#8b5cf6',
    riskLevel: '低',
    failureImpact: '可容忍双盘故障，三盘故障数据丢失',
    recoveryMethod: '双重校验计算重建，支持同时重建两盘'
  },
  RAID10: {
    name: 'RAID 10',
    description: '镜像+条带化',
    detailDesc: '先做镜像(RAID1)，再做条带(RAID0)。结合两者优点：高性能+高可靠性。每组镜像可容忍一块磁盘故障。',
    minDisks: 4,
    capacity: '50%',
    faultTolerance: '每组1个',
    readSpeed: 'N倍',
    writeSpeed: 'N/2倍',
    useCase: '高并发数据库、OLTP系统（性能+可靠性最优）',
    color: '#f59e0b',
    riskLevel: '低',
    failureImpact: '每组镜像可容忍1盘故障，但不能同时坏同一组的两盘',
    recoveryMethod: '从同组镜像盘复制数据重建'
  }
};

// ==================== 组件实现 ====================

export function RAIDScene() {
  // ===== 常量定义（必须在状态之前） =====
  const blocksPerDisk = 6;
  
  // ===== 状态管理 =====
  const [selectedRAID, setSelectedRAID] = useState<keyof typeof RAID_CONFIGS>('RAID5');
  const [diskCount, setDiskCount] = useState(4);
  const [disks, setDisks] = useState<Disk[]>([]);
  const [failedDisks, setFailedDisks] = useState<number[]>([]);
  const [rebuildingDisks, setRebuildingDisks] = useState<number[]>([]);
  const [hasHotSpare, setHasHotSpare] = useState(false);
  const [hotSpareDisk, setHotSpareDisk] = useState<number | null>(null);
  
  // 动画控制
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationMode, setAnimationMode] = useState<'normal' | 'failure' | 'rebuild' | 'xor'>('normal');
  
  // XOR演示
  const [showXORDetail, setShowXORDetail] = useState(false);
  const [xorCalculation, setXorCalculation] = useState<XORCalculation | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  
  // 写惩罚演示
  const [showWritePenalty, setShowWritePenalty] = useState(false);
  const [writePenaltyStep, setWritePenaltyStep] = useState(0);
  
  // 重建动画
  const [rebuildAnimation, setRebuildAnimation] = useState<RebuildAnimation>({
    isActive: false,
    currentRow: 0,
    totalRows: blocksPerDisk,
    sourceDisks: [],
    targetDisk: -1,
    phase: 'reading'
  });
  const [rebuiltBlocks, setRebuiltBlocks] = useState<Set<string>>(new Set());
  
  // 数据流
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [diskSize, setDiskSize] = useState(1000);

  // RAID信息（根据当前选择动态计算）
  const raidInfo = RAID_CONFIGS[selectedRAID];

  // ===== 计算属性 =====
  const calculations = useMemo(() => {
    let usableCapacity = 0;
    let readIOPS = 0;
    let writeIOPS = 0;
    let faultTolerance = 0;
    let efficiency = 0;
    let writePenalty = 1;

    switch (selectedRAID) {
      case 'RAID0':
        usableCapacity = diskSize * diskCount;
        readIOPS = diskCount * 100;
        writeIOPS = diskCount * 100;
        faultTolerance = 0;
        efficiency = 100;
        writePenalty = 1;
        break;
      case 'RAID1':
        usableCapacity = diskSize * Math.floor(diskCount / 2);
        readIOPS = diskCount * 100;
        writeIOPS = Math.floor(diskCount / 2) * 100;
        faultTolerance = Math.floor(diskCount / 2);
        efficiency = 50;
        writePenalty = 2;
        break;
      case 'RAID5':
        usableCapacity = diskSize * (diskCount - 1);
        readIOPS = (diskCount - 1) * 100;
        writeIOPS = (diskCount - 1) * 25;
        faultTolerance = 1;
        efficiency = ((diskCount - 1) / diskCount) * 100;
        writePenalty = 4; // Read-Modify-Write
        break;
      case 'RAID6':
        usableCapacity = diskSize * (diskCount - 2);
        readIOPS = (diskCount - 2) * 100;
        writeIOPS = (diskCount - 2) * 20;
        faultTolerance = 2;
        efficiency = ((diskCount - 2) / diskCount) * 100;
        writePenalty = 6; // 双重校验
        break;
      case 'RAID10':
        usableCapacity = diskSize * Math.floor(diskCount / 2);
        readIOPS = diskCount * 100;
        writeIOPS = Math.floor(diskCount / 2) * 100;
        faultTolerance = Math.floor(diskCount / 2);
        efficiency = 50;
        writePenalty = 2;
        break;
    }

    return {
      usableCapacity,
      readIOPS,
      writeIOPS,
      faultTolerance,
      efficiency,
      totalRawCapacity: diskSize * diskCount,
      writePenalty
    };
  }, [selectedRAID, diskCount, diskSize]);

  // ===== 磁盘数据生成 =====
  const generateDisks = useCallback(() => {
    const newDisks: Disk[] = [];
    const totalDisks = hasHotSpare ? diskCount + 1 : diskCount;

    for (let i = 0; i < totalDisks; i++) {
      const isHotSpare = hasHotSpare && i === diskCount;
      const blocks: Block[] = [];

      for (let row = 0; row < blocksPerDisk; row++) {
        let blockType: BlockType = 'data';
        let value = Math.floor(Math.random() * 256); // 模拟数据值

        if (isHotSpare) {
          blockType = 'empty';
          value = 0;
        } else {
          switch (selectedRAID) {
            case 'RAID0':
              blockType = 'data';
              break;
            case 'RAID1':
              blockType = i === 0 ? 'data' : 'mirror';
              if (i > 0) value = newDisks[0].blocks[row].value || value;
              break;
            case 'RAID5': {
              const parityPos = row % diskCount;
              if (i === parityPos) {
                blockType = 'parity';
                // 计算XOR校验值
                let xor = 0;
                for (let d = 0; d < diskCount; d++) {
                  if (d !== parityPos) {
                    xor ^= newDisks[d]?.blocks[row]?.value || Math.floor(Math.random() * 256);
                  }
                }
                value = xor;
              }
              break;
            }
            case 'RAID6': {
              const parityPos1 = row % diskCount;
              const parityPos2 = (row + 1) % diskCount;
              if (i === parityPos1 || i === parityPos2) {
                blockType = 'parity';
                value = 0; // 简化显示
              }
              break;
            }
            case 'RAID10': {
              const pairIndex = Math.floor(i / 2);
              const isPrimary = i % 2 === 0;
              blockType = isPrimary ? 'data' : 'mirror';
              if (!isPrimary) {
                const primaryDisk = pairIndex * 2;
                value = newDisks[primaryDisk]?.blocks[row]?.value || value;
              }
              break;
            }
          }
        }

        blocks.push({
          id: `${i}-${row}`,
          type: blockType,
          value,
          row
        });
      }

      newDisks.push({
        id: i,
        blocks,
        status: isHotSpare ? 'hotspare' : 'normal',
        progress: 0
      });
    }

    setDisks(newDisks);
    if (hasHotSpare) setHotSpareDisk(diskCount);
  }, [selectedRAID, diskCount, hasHotSpare]);

  useEffect(() => {
    generateDisks();
    setFailedDisks([]);
    setRebuildingDisks([]);
    setCurrentStep(0);
    setAnimationMode('normal');
    setRebuildAnimation({
      isActive: false,
      currentRow: 0,
      totalRows: blocksPerDisk,
      sourceDisks: [],
      targetDisk: -1,
      phase: 'reading'
    });
    setRebuiltBlocks(new Set());
  }, [generateDisks]);

  // ===== 故障模拟 =====
  const simulateFailure = () => {
    if (failedDisks.length > 0) {
      // 恢复所有磁盘
      setFailedDisks([]);
      setRebuildingDisks([]);
      setAnimationMode('normal');
      generateDisks();
    } else {
      // 模拟故障
      const maxFailures = selectedRAID === 'RAID6' ? 2 : 
                         selectedRAID === 'RAID0' ? 1 : 1;
      const failures = Math.min(maxFailures, diskCount - 1);
      const newFailed: number[] = [];
      
      for (let i = 0; i < failures; i++) {
        let diskId;
        do {
          diskId = Math.floor(Math.random() * diskCount);
        } while (newFailed.includes(diskId));
        newFailed.push(diskId);
      }
      
      setFailedDisks(newFailed);
      setAnimationMode('failure');
      
      // 如果有热备盘，自动开始重建
      if (hasHotSpare && hotSpareDisk !== null && newFailed.length <= calculations.faultTolerance) {
        setTimeout(() => startRebuild(), 1000);
      }
    }
  };

  // ===== 重建过程 =====
  const startRebuild = () => {
    if (failedDisks.length === 0) return;
    
    setAnimationMode('rebuild');
    setRebuiltBlocks(new Set());
    
    // 确定目标磁盘（热备盘或更换的新盘）
    const targetDisk = hasHotSpare && hotSpareDisk !== null ? hotSpareDisk : failedDisks[0];
    
    // 确定源磁盘（用于重建数据的磁盘）
    const sourceDisks = disks
      .map(d => d.id)
      .filter(id => !failedDisks.includes(id) && id !== targetDisk && id !== hotSpareDisk);
    
    setRebuildingDisks([targetDisk]);
    
    // 初始化重建动画状态
    setRebuildAnimation({
      isActive: true,
      currentRow: 0,
      totalRows: blocksPerDisk,
      sourceDisks,
      targetDisk,
      phase: 'reading'
    });
    
    // 逐块重建动画
    let currentRow = 0;
    const totalRows = blocksPerDisk;
    
    const rebuildInterval = setInterval(() => {
      if (currentRow >= totalRows) {
        clearInterval(rebuildInterval);
        // 重建完成
        setRebuildAnimation(prev => ({ ...prev, isActive: false, phase: 'complete' }));
        setTimeout(() => {
          setRebuildingDisks([]);
          setFailedDisks([]);
          setAnimationMode('normal');
          setRebuiltBlocks(new Set());
        }, 1500);
        return;
      }
      
      // 更新当前重建的行
      setRebuildAnimation(prev => ({
        ...prev,
        currentRow,
        phase: currentRow % 3 === 0 ? 'reading' : currentRow % 3 === 1 ? 'calculating' : 'writing'
      }));
      
      // 标记该块已重建完成
      setRebuiltBlocks(prev => new Set([...prev, `${targetDisk}-${currentRow}`]));
      
      // 更新进度
      const progress = Math.floor(((currentRow + 1) / totalRows) * 100);
      setDisks(prev => prev.map(d => 
        d.id === targetDisk ? { ...d, progress } : d
      ));
      
      currentRow++;
    }, 800); // 每800ms重建一块
  };

  // ===== XOR计算演示 =====
  const demonstrateXOR = (row: number) => {
    if (selectedRAID !== 'RAID5' && selectedRAID !== 'RAID6') return;
    
    setSelectedRow(row);
    setShowXORDetail(true);
    setAnimationMode('xor');
    
    // 获取该行的所有数据块值
    const rowValues: number[] = [];
    disks.forEach((disk, idx) => {
      if (idx < diskCount && !failedDisks.includes(idx)) {
        const block = disk.blocks[row];
        if (block && block.type === 'data') {
          rowValues.push(block.value || 0);
        }
      }
    });
    
    // 计算XOR结果
    const xorResult = rowValues.reduce((acc, val) => acc ^ val, 0);
    
    setXorCalculation({
      inputs: rowValues,
      result: xorResult,
      step: 0
    });
    
    // 动画演示XOR计算步骤
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setXorCalculation(prev => prev ? { ...prev, step } : null);
      if (step >= rowValues.length) {
        clearInterval(interval);
      }
    }, 800);
  };

  // ===== 写惩罚演示 =====
  const demonstrateWritePenalty = () => {
    setShowWritePenalty(true);
    setWritePenaltyStep(0);
    
    // Read-Modify-Write 周期动画
    const steps = ['read_old', 'read_parity', 'modify', 'write_data', 'write_parity'];
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      setWritePenaltyStep(currentStep);
      if (currentStep >= steps.length) {
        clearInterval(interval);
        setTimeout(() => setShowWritePenalty(false), 2000);
      }
    }, 1000);
  };

  // ===== 渲染辅助函数 =====
  const getBlockColor = (block: Block, diskStatus: DiskStatus, isRebuilt: boolean, isBeingRebuilt: boolean) => {
    // 已重建完成的块显示绿色
    if (isRebuilt) return 'bg-green-500/90 border-green-400';
    // 正在重建的块显示黄色脉冲
    if (isBeingRebuilt) return 'bg-yellow-400/90 border-yellow-300 animate-pulse';
    
    if (diskStatus === 'failed') return 'bg-red-900/50 border-red-600';
    if (diskStatus === 'rebuilding') return 'bg-yellow-900/50 border-yellow-500';
    if (diskStatus === 'hotspare') return 'bg-emerald-900/30 border-emerald-600';
    
    switch (block.type) {
      case 'data': return 'bg-blue-500/80 border-blue-400';
      case 'parity': return 'bg-yellow-500/80 border-yellow-400';
      case 'mirror': return 'bg-green-500/80 border-green-400';
      case 'empty': return 'bg-slate-800 border-slate-700';
      case 'rebuilding': return 'bg-yellow-500/60 border-yellow-400 animate-pulse';
      default: return 'bg-slate-700 border-slate-600';
    }
  };

  const getBlockIcon = (block: Block) => {
    switch (block.type) {
      case 'data': return <Database className="w-3 h-3" />;
      case 'parity': return <Binary className="w-3 h-3" />;
      case 'mirror': return <Layers className="w-3 h-3" />;
      case 'empty': return <span className="text-xs text-slate-600">-</span>;
      case 'rebuilding': return <RefreshCw className="w-3 h-3 animate-spin" />;
      default: return null;
    }
  };

  // ===== 动画步骤生成 =====
  const animationSteps = useMemo(() => {
    const steps = [
      {
        id: 'intro',
        title: `${raidInfo.name} 架构原理`,
        description: raidInfo.detailDesc
      },
      {
        id: 'capacity',
        title: '容量与效率',
        description: `原始容量: ${calculations.totalRawCapacity}GB → 可用容量: ${calculations.usableCapacity}GB (利用率${calculations.efficiency.toFixed(1)}%)`
      },
      {
        id: 'performance',
        title: '读写性能分析',
        description: `读IOPS: ${calculations.readIOPS} | 写IOPS: ${calculations.writeIOPS} | 写惩罚系数: ${calculations.writePenalty}x`
      },
      {
        id: 'fault',
        title: '容错能力',
        description: `可容忍故障: ${calculations.faultTolerance}块磁盘 | 风险等级: ${raidInfo.riskLevel}`
      }
    ];

    if (failedDisks.length > 0) {
      steps.push({
        id: 'failure',
        title: '故障影响分析',
        description: raidInfo.failureImpact
      });
      
      if (failedDisks.length <= calculations.faultTolerance) {
        steps.push({
          id: 'recovery',
          title: '数据恢复机制',
          description: raidInfo.recoveryMethod
        });
      } else {
        steps.push({
          id: 'dataloss',
          title: '数据丢失警告',
          description: '故障磁盘数超过容错上限，数据已不可恢复！'
        });
      }
    }

    return steps;
  }, [raidInfo, calculations, failedDisks]);

  // ===== 参数面板配置 =====
  const parameters = [
    {
      id: 'raidLevel',
      name: 'RAID级别',
      type: 'select' as const,
      value: selectedRAID,
      options: Object.entries(RAID_CONFIGS).map(([key, config]) => ({
        value: key,
        label: `${config.name} - ${config.description}`
      }))
    },
    {
      id: 'diskCount',
      name: '数据磁盘数',
      type: 'range' as const,
      value: diskCount,
      min: raidInfo.minDisks,
      max: 8,
      step: 1,
      unit: '块'
    },
    {
      id: 'diskSize',
      name: '单盘容量',
      type: 'range' as const,
      value: diskSize,
      min: 100,
      max: 4000,
      step: 100,
      unit: 'GB'
    },
    {
      id: 'hasHotSpare',
      name: '启用热备盘',
      type: 'boolean' as const,
      value: hasHotSpare
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
        setSelectedRAID(value as keyof typeof RAID_CONFIGS);
        setFailedDisks([]);
        setRebuildingDisks([]);
        const minDisks = RAID_CONFIGS[value as keyof typeof RAID_CONFIGS].minDisks;
        if (diskCount < minDisks) setDiskCount(minDisks);
        break;
      case 'diskCount':
        setDiskCount(value as number);
        setFailedDisks([]);
        break;
      case 'diskSize':
        setDiskSize(value as number);
        break;
      case 'hasHotSpare':
        setHasHotSpare(value as boolean);
        break;
      case 'showDataFlow':
        setShowDataFlow(value as boolean);
        break;
    }
  };

  // ===== 场景数据 =====
  const sceneData = {
    id: 'raid',
    title: 'RAID技术深度解析',
    description: 'RAID故障影响、数据恢复、XOR校验原理可视化',
    phase: 2 as const,
    category: '数据中心',
    duration: '10-15分钟',
    difficulty: 'medium' as const,
  };

  // ===== 渲染 =====
  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-full">
        {/* 左侧：参数面板 - 移动端全宽，桌面端3列 */}
        <div className="xl:col-span-3 h-auto xl:h-full overflow-y-auto space-y-4 order-2 xl:order-1">
          <ParameterPanel
            title="RAID配置"
            parameters={parameters}
            onChange={handleParameterChange}
          />
          
          {/* 故障模拟控制 */}
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" />
              故障模拟
            </h3>
            <div className="space-y-2">
              <button
                onClick={simulateFailure}
                disabled={rebuildingDisks.length > 0}
                className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  failedDisks.length > 0
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {failedDisks.length > 0 ? (
                  <><CheckCircle className="w-4 h-4" /> 恢复所有磁盘</>
                ) : (
                  <><AlertTriangle className="w-4 h-4" /> 模拟磁盘故障</>
                )}
              </button>
              
              {failedDisks.length > 0 && failedDisks.length <= calculations.faultTolerance && (
                <button
                  onClick={startRebuild}
                  disabled={rebuildingDisks.length > 0}
                  className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${rebuildingDisks.length > 0 ? 'animate-spin' : ''}`} />
                  {rebuildingDisks.length > 0 ? '重建中...' : '开始数据重建'}
                </button>
              )}
            </div>
            
            {failedDisks.length > 0 && (
              <div className="mt-3 p-2 bg-red-900/30 rounded border border-red-700/50">
                <div className="text-xs text-red-400 font-medium mb-1">故障磁盘</div>
                <div className="flex gap-2">
                  {failedDisks.map(id => (
                    <span key={id} className="px-2 py-1 bg-red-800 rounded text-xs text-white">
                      Disk {id + 1}
                    </span>
                  ))}
                </div>
                {failedDisks.length > calculations.faultTolerance && (
                  <div className="mt-2 text-xs text-red-300 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    超过容错上限，数据不可恢复！
                  </div>
                )}
              </div>
            )}
          </div>

          {/* XOR演示按钮 */}
          {(selectedRAID === 'RAID5' || selectedRAID === 'RAID6') && (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Binary className="w-4 h-4" />
                校验原理演示
              </h3>
              <button
                onClick={() => demonstrateXOR(0)}
                className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200"
              >
                查看XOR校验计算
              </button>
              <p className="mt-2 text-xs text-slate-500">
                点击磁盘上的数据块查看XOR计算过程
              </p>
            </div>
          )}

          {/* 写惩罚演示 */}
          {(selectedRAID === 'RAID5' || selectedRAID === 'RAID6') && (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                写惩罚演示
              </h3>
              <button
                onClick={demonstrateWritePenalty}
                disabled={showWritePenalty}
                className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-all duration-200 disabled:opacity-50"
              >
                {showWritePenalty ? '演示中...' : 'Read-Modify-Write周期'}
              </button>
            </div>
          )}
        </div>

        {/* 中间：可视化区域 - 移动端全宽，桌面端6列 */}
        <div className="xl:col-span-6 order-1 xl:order-2">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 xl:p-6 h-auto min-h-[400px] xl:h-[520px] relative overflow-hidden">
            {/* 主可视化区域 */}
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
                      disk.status === 'failed' || failedDisks.includes(disk.id)
                        ? 'bg-red-900/30 border-red-600' 
                        : disk.status === 'rebuilding' || rebuildingDisks.includes(disk.id)
                        ? 'bg-yellow-900/30 border-yellow-500'
                        : disk.status === 'hotspare'
                        ? 'bg-emerald-900/20 border-emerald-600'
                        : 'bg-slate-800 border-slate-600'
                    }`}
                  >
                    {/* 磁盘标签 */}
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className={`w-4 h-4 ${
                        failedDisks.includes(disk.id) ? 'text-red-500' :
                        disk.status === 'hotspare' ? 'text-emerald-400' :
                        'text-slate-400'
                      }`} />
                      <span className={`text-xs font-medium ${
                        failedDisks.includes(disk.id) ? 'text-red-400' :
                        disk.status === 'hotspare' ? 'text-emerald-400' :
                        'text-slate-300'
                      }`}>
                        {disk.status === 'hotspare' ? 'Hot Spare' : `Disk ${disk.id + 1}`}
                      </span>
                      {failedDisks.includes(disk.id) && (
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                      {disk.status === 'hotspare' && (
                        <ShieldAlert className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>

                    {/* 数据块网格 */}
                    <div className="grid grid-cols-2 gap-1 relative">
                      {disk.blocks.map((block, blockIndex) => {
                        const isRebuilt = rebuiltBlocks.has(`${disk.id}-${block.row}`);
                        const isBeingRebuilt = rebuildAnimation.isActive && 
                          rebuildAnimation.targetDisk === disk.id && 
                          rebuildAnimation.currentRow === block.row;
                        
                        return (
                          <motion.div
                            key={block.id}
                            initial={{ scale: 0 }}
                            animate={{ 
                              scale: 1,
                              backgroundColor: isRebuilt ? '#22c55e' : undefined
                            }}
                            transition={{ 
                              delay: diskIndex * 0.1 + blockIndex * 0.05,
                              backgroundColor: { duration: 0.3 }
                            }}
                            onClick={() => {
                              if ((selectedRAID === 'RAID5' || selectedRAID === 'RAID6') 
                                  && block.type === 'data' 
                                  && !failedDisks.includes(disk.id)) {
                                demonstrateXOR(block.row);
                              }
                            }}
                            className={`w-10 h-10 rounded border flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-all ${
                              getBlockColor(block, failedDisks.includes(disk.id) ? 'failed' : 
                                rebuildingDisks.includes(disk.id) ? 'rebuilding' : disk.status,
                                isRebuilt, isBeingRebuilt)
                            } ${selectedRow === block.row ? 'ring-2 ring-white' : ''}`}
                          >
                            {isRebuilt ? <CheckCircle className="w-4 h-4" /> : 
                             isBeingRebuilt ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                             getBlockIcon(block)}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* 故障遮罩 */}
                    {failedDisks.includes(disk.id) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-red-900/70 rounded-lg flex items-center justify-center"
                      >
                        <div className="text-center">
                          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-1" />
                          <span className="text-red-200 font-bold text-sm">FAILED</span>
                        </div>
                      </motion.div>
                    )}

                    {/* 重建进度 */}
                    {rebuildingDisks.includes(disk.id) && disk.progress !== undefined && disk.progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-yellow-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${disk.progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-yellow-400 text-center mt-1">
                          {disk.progress}%
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* 图例 */}
              <div className="flex gap-4 mt-2 text-xs flex-wrap justify-center">
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
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-900/30 border border-emerald-600 rounded" />
                  <span className="text-slate-400">热备盘</span>
                </div>
              </div>

              {/* 数据流动画 - 正常运行 */}
              {showDataFlow && animationMode === 'normal' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(6)].map((_, i) => (
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
                        delay: i * 0.3,
                        repeat: Infinity,
                        ease: 'linear'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* 重建数据流动画 */}
              {rebuildAnimation.isActive && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {/* 重建状态指示器 */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-900/80 border border-yellow-500/50 rounded-lg px-4 py-2 flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
                    <div className="text-sm">
                      <span className="text-yellow-400 font-medium">
                        {rebuildAnimation.phase === 'reading' && '正在读取数据块...'}
                        {rebuildAnimation.phase === 'calculating' && 'XOR计算校验...'}
                        {rebuildAnimation.phase === 'writing' && '写入重建数据...'}
                      </span>
                      <span className="text-yellow-200 ml-2">
                        ({rebuildAnimation.currentRow + 1}/{rebuildAnimation.totalRows})
                      </span>
                    </div>
                  </div>
                  
                  {/* 数据粒子流动画 - 从源盘流向目标盘 */}
                  {rebuildAnimation.sourceDisks.map((sourceId, idx) => (
                    <motion.div
                      key={`rebuild-flow-${sourceId}`}
                      className="absolute w-3 h-3 rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #22c55e)',
                        boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)'
                      }}
                      initial={{ 
                        left: `${15 + sourceId * 12}%`, 
                        top: '35%', 
                        opacity: 0,
                        scale: 0.5
                      }}
                      animate={{
                        left: `${15 + rebuildAnimation.targetDisk * 12}%`,
                        top: '35%',
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1, 1, 0.8]
                      }}
                      transition={{
                        duration: 0.6,
                        delay: idx * 0.1,
                        repeat: Infinity,
                        repeatDelay: 0.2
                      }}
                    />
                  ))}
                  
                  {/* XOR计算特效 */}
                  {rebuildAnimation.phase === 'calculating' && (
                    <motion.div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="w-16 h-16 rounded-full bg-purple-500/30 border-2 border-purple-400 flex items-center justify-center">
                        <Binary className="w-8 h-8 text-purple-400" />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* XOR计算详情弹窗 */}
              <AnimatePresence>
                {showXORDetail && xorCalculation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-4 bg-slate-900/95 rounded-lg border border-purple-500/50 p-6 flex flex-col items-center justify-center"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Binary className="w-6 h-6 text-purple-400" />
                      <h3 className="text-lg font-bold text-white">XOR 校验计算演示</h3>
                    </div>
                    
                    <div className="text-sm text-slate-400 mb-4">
                      第 {selectedRow !== null ? selectedRow + 1 : '-'} 行数据块 XOR 运算
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                      {xorCalculation.inputs.map((val, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <motion.div
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: idx <= xorCalculation.step ? 1 : 0.3 }}
                            className={`px-4 py-2 rounded-lg font-mono text-lg ${
                              idx <= xorCalculation.step 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-700 text-slate-500'
                            }`}
                          >
                            {val.toString(16).toUpperCase().padStart(2, '0')}h
                          </motion.div>
                          {idx < xorCalculation.inputs.length - 1 && (
                            <span className="text-2xl text-purple-400">⊕</span>
                          )}
                        </div>
                      ))}
                      <span className="text-2xl text-slate-400">=</span>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: xorCalculation.step >= xorCalculation.inputs.length ? 1 : 0 }}
                        className="px-4 py-2 rounded-lg font-mono text-lg bg-yellow-600 text-white"
                      >
                        {xorCalculation.result.toString(16).toUpperCase().padStart(2, '0')}h
                      </motion.div>
                    </div>

                    <div className="text-sm text-slate-400 max-w-md text-center mb-4">
                      <Info className="w-4 h-4 inline mr-1" />
                      XOR运算特性：A ⊕ B ⊕ C = P，则 A = B ⊕ C ⊕ P。当某块磁盘故障时，
                      可通过其他磁盘的数据和校验值计算出丢失的数据。
                    </div>

                    <button
                      onClick={() => {
                        setShowXORDetail(false);
                        setSelectedRow(null);
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
                    >
                      关闭
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 写惩罚演示 */}
              <AnimatePresence>
                {showWritePenalty && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-4 bg-slate-900/95 rounded-lg border border-orange-500/50 p-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-6 h-6 text-orange-400" />
                      <h3 className="text-lg font-bold text-white">RAID 5 写惩罚演示</h3>
                    </div>

                    <div className="flex justify-center items-center gap-4 mb-6">
                      {['读取旧数据', '读取旧校验', '计算新校验', '写入新数据', '写入新校验'].map((step, idx) => (
                        <div key={step} className="flex items-center gap-4">
                          <motion.div
                            initial={{ opacity: 0.3, scale: 0.9 }}
                            animate={{ 
                              opacity: writePenaltyStep > idx ? 1 : 0.3,
                              scale: writePenaltyStep > idx ? 1 : 0.9
                            }}
                            className={`px-3 py-2 rounded-lg text-sm text-center w-24 ${
                              writePenaltyStep > idx 
                                ? idx < 2 ? 'bg-blue-600' : idx === 2 ? 'bg-purple-600' : 'bg-green-600'
                                : 'bg-slate-700'
                            }`}
                          >
                            {step}
                          </motion.div>
                          {idx < 4 && (
                            <ArrowRight className={`w-4 h-4 ${
                              writePenaltyStep > idx + 1 ? 'text-green-400' : 'text-slate-600'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="text-center text-sm text-slate-400">
                      {writePenaltyStep === 0 && '准备开始 Read-Modify-Write 周期...'}
                      {writePenaltyStep === 1 && '1. 读取目标位置的旧数据'}
                      {writePenaltyStep === 2 && '2. 读取对应的旧校验值'}
                      {writePenaltyStep === 3 && '3. 计算新校验值: NewParity = OldData ⊕ NewData ⊕ OldParity'}
                      {writePenaltyStep === 4 && '4. 写入新数据到数据盘'}
                      {writePenaltyStep === 5 && '5. 写入新校验值到校验盘，完成！'}
                    </div>

                    <div className="mt-4 p-3 bg-orange-900/30 rounded border border-orange-700/50 text-xs text-orange-300">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      写惩罚：一次写操作需要 4 次磁盘 I/O（2读2写），因此 RAID 5 的随机写性能较差
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 动画播放器 */}
          <div className="mt-4">
            <AnimationPlayer
              steps={animationSteps}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onReset={() => {
                setIsPlaying(false);
                setCurrentStep(0);
                setFailedDisks([]);
                setRebuildingDisks([]);
                setAnimationMode('normal');
              }}
              onStepChange={setCurrentStep}
            />
          </div>
        </div>

        {/* 右侧：信息面板 - 移动端全宽，桌面端3列 */}
        <div className="xl:col-span-3 space-y-4 order-3">
          {/* RAID特性 */}
          <InfoPanel
            title={`${raidInfo.name} 深度解析`}
            content={
              <div className="space-y-3">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">技术原理</div>
                  <div className="text-sm text-slate-200">{raidInfo.detailDesc}</div>
                </div>

                {/* 故障影响 */}
                <div className={`p-3 rounded-lg border ${
                  failedDisks.length > calculations.faultTolerance 
                    ? 'bg-red-900/30 border-red-700' 
                    : failedDisks.length > 0
                    ? 'bg-yellow-900/30 border-yellow-700'
                    : 'bg-slate-800/50 border-slate-700'
                }`}>
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    故障影响
                  </div>
                  <div className={`text-sm ${
                    failedDisks.length > calculations.faultTolerance ? 'text-red-300' : 'text-slate-200'
                  }`}>
                    {failedDisks.length > 0 
                      ? failedDisks.length > calculations.faultTolerance
                        ? '⚠️ 故障磁盘数超过容错上限，数据已不可恢复！'
                        : `✓ ${raidInfo.failureImpact}`
                      : raidInfo.failureImpact
                    }
                  </div>
                </div>

                {/* 恢复机制 */}
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    数据恢复机制
                  </div>
                  <div className="text-sm text-slate-200">{raidInfo.recoveryMethod}</div>
                </div>

                {/* 容量计算器 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-slate-800/50 rounded-lg border border-blue-500/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-blue-400" />
                    <div className="text-xs text-blue-400 font-medium">容量与性能</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">原始容量:</span>
                      <span className="font-mono">{calculations.totalRawCapacity.toLocaleString()} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">可用容量:</span>
                      <span className="font-mono text-green-400 font-bold">{calculations.usableCapacity.toLocaleString()} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">利用率:</span>
                      <span className="font-mono" style={{ color: raidInfo.color }}>{calculations.efficiency.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">读IOPS:</span>
                      <span className="font-mono text-green-400">{calculations.readIOPS.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">写IOPS:</span>
                      <span className={`font-mono ${calculations.writeIOPS < calculations.readIOPS * 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {calculations.writeIOPS.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">写惩罚:</span>
                      <span className={`font-mono ${calculations.writePenalty > 2 ? 'text-orange-400' : 'text-green-400'}`}>
                        {calculations.writePenalty}x
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* 适用场景 */}
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">适用场景</div>
                  <div className="text-sm text-slate-200">{raidInfo.useCase}</div>
                </div>
              </div>
            }
          />

          {/* RAID对比 */}
          <InfoPanel
            title="RAID级别对比"
            content={
              <div className="space-y-2 text-xs">
                {Object.entries(RAID_CONFIGS).map(([key, info]) => (
                  <div
                    key={key}
                    className={`p-2 rounded cursor-pointer transition-all ${
                      selectedRAID === key 
                        ? 'bg-slate-700 border border-slate-500' 
                        : 'bg-slate-800/50 hover:bg-slate-700/50'
                    }`}
                    onClick={() => handleParameterChange('raidLevel', key)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium" style={{ color: info.color }}>
                        {info.name}
                      </span>
                      <span className="text-slate-400">{info.capacity}</span>
                    </div>
                    <div className="text-slate-500 mt-1 flex justify-between">
                      <span>容错: {info.faultTolerance}</span>
                      <span className={info.riskLevel === '极高' ? 'text-red-400' : info.riskLevel === '中等' ? 'text-yellow-400' : 'text-green-400'}>
                        {info.riskLevel}风险
                      </span>
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
