import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import { 
  Zap, 
  Wind, 
  Thermometer, 
  Droplets,
  Activity,
  AlertTriangle,
  CheckCircle,
  Server,
  Battery,
  Gauge
} from 'lucide-react';

// 供电架构类型（可用性对应TIA-942标准：Tier I~IV分别对应N/N+1/2N/2N+1）
const POWER_ARCHITECTURES = {
  n: {
    name: 'N配置',
    description: '无冗余，单路供电（对应Tier I）',
    redundancy: '0%',
    availability: '99.671%',
    color: '#ef4444'
  },
  nPlus1: {
    name: 'N+1配置',
    description: '一个备用模块（对应Tier II）',
    redundancy: '1/N',
    availability: '99.741%',
    color: '#f59e0b'
  },
  nPlusN: {
    name: '2N配置',
    description: '完全冗余，双路独立（对应Tier III~IV）',
    redundancy: '100%',
    availability: '99.982%',
    color: '#22c55e'
  },
  twoNPlus1: {
    name: '2(N+1)配置',
    description: '双路各N+1冗余（对应Tier IV容错级）',
    redundancy: '100%+',
    availability: '99.995%',
    color: '#3b82f6'
  }
};

// 制冷类型
const COOLING_TYPES = {
  air: {
    name: '风冷',
    efficiency: 1.5,
    description: '传统精密空调',
    suitable: '中小机房'
  },
  water: {
    name: '水冷',
    efficiency: 1.3,
    description: '冷冻水系统',
    suitable: '大型机房'
  },
  liquid: {
    name: '液冷',
    efficiency: 1.1,
    description: '浸没式/冷板式',
    suitable: '高密度计算'
  }
};

interface PowerSystem {
  id: string;
  name: string;
  status: 'normal' | 'failure' | 'standby';
  load: number;
  capacity: number;
}

interface CoolingUnit {
  id: string;
  name: string;
  type: keyof typeof COOLING_TYPES;
  status: 'running' | 'standby' | 'failure';
  temp: number;
  humidity: number;
}

interface AnimationStep {
  id: string;
  title: string;
  description: string;
}

export function DataCenterInfraScene() {
  const [powerArch, setPowerArch] = useState<keyof typeof POWER_ARCHITECTURES>('nPlusN');
  const [coolingType, setCoolingType] = useState<keyof typeof COOLING_TYPES>('water');
  const [itLoad, setItLoad] = useState(500); // kW
  const [showPowerFlow, setShowPowerFlow] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [powerSystems, setPowerSystems] = useState<PowerSystem[]>([]);
  const [coolingUnits, setCoolingUnits] = useState<CoolingUnit[]>([]);
  const [failedSystem, setFailedSystem] = useState<string | null>(null);

  const powerInfo = POWER_ARCHITECTURES[powerArch];
  const coolingInfo = COOLING_TYPES[coolingType];

  // 计算PUE
  const pue = useMemo(() => {
    const coolingPower = itLoad * (coolingInfo.efficiency - 1);
    const otherPower = itLoad * 0.1; // 其他损耗10%
    const totalPower = itLoad + coolingPower + otherPower;
    return (totalPower / itLoad).toFixed(2);
  }, [itLoad, coolingInfo]);

  // 初始化系统
  const initializeSystems = useCallback(() => {
    const systems: PowerSystem[] = [];
    const units: CoolingUnit[] = [];

    // 根据架构生成供电系统
    const baseCapacity = Math.ceil(itLoad / 2); // 每路承载一半负载
    
    if (powerArch === 'n') {
      systems.push(
        { id: 'ups1', name: 'UPS 1', status: 'normal', load: itLoad, capacity: itLoad * 1.2 },
        { id: 'pdu1', name: 'PDU A', status: 'normal', load: itLoad, capacity: itLoad * 1.2 }
      );
    } else if (powerArch === 'nPlus1') {
      const moduleCapacity = Math.ceil(itLoad / 2);
      systems.push(
        { id: 'ups1', name: 'UPS 1', status: 'normal', load: moduleCapacity, capacity: moduleCapacity },
        { id: 'ups2', name: 'UPS 2', status: 'normal', load: moduleCapacity, capacity: moduleCapacity },
        { id: 'ups3', name: 'UPS 3', status: 'standby', load: 0, capacity: moduleCapacity },
        { id: 'pdu1', name: 'PDU A', status: 'normal', load: itLoad, capacity: itLoad * 1.2 }
      );
    } else if (powerArch === 'nPlusN') {
      systems.push(
        { id: 'ups1', name: 'UPS A1', status: 'normal', load: itLoad / 2, capacity: itLoad },
        { id: 'ups2', name: 'UPS B1', status: 'normal', load: itLoad / 2, capacity: itLoad },
        { id: 'pdu1', name: 'PDU A', status: 'normal', load: itLoad / 2, capacity: itLoad },
        { id: 'pdu2', name: 'PDU B', status: 'normal', load: itLoad / 2, capacity: itLoad }
      );
    } else {
      // 2(N+1)
      const moduleCapacity = Math.ceil(itLoad / 4);
      systems.push(
        { id: 'ups1', name: 'UPS A1', status: 'normal', load: moduleCapacity, capacity: moduleCapacity },
        { id: 'ups2', name: 'UPS A2', status: 'normal', load: moduleCapacity, capacity: moduleCapacity },
        { id: 'ups3', name: 'UPS A3', status: 'standby', load: 0, capacity: moduleCapacity },
        { id: 'ups4', name: 'UPS B1', status: 'normal', load: moduleCapacity, capacity: moduleCapacity },
        { id: 'ups5', name: 'UPS B2', status: 'normal', load: moduleCapacity, capacity: moduleCapacity },
        { id: 'ups6', name: 'UPS B3', status: 'standby', load: 0, capacity: moduleCapacity },
        { id: 'pdu1', name: 'PDU A', status: 'normal', load: itLoad / 2, capacity: itLoad },
        { id: 'pdu2', name: 'PDU B', status: 'normal', load: itLoad / 2, capacity: itLoad }
      );
    }

    // 生成制冷单元
    const coolingNeeded = Math.ceil(itLoad * coolingInfo.efficiency / 200); // 每200kW一台
    for (let i = 0; i < coolingNeeded + 1; i++) {
      units.push({
        id: `cooling${i}`,
        name: `精密空调 ${String.fromCharCode(65 + i)}`,
        type: coolingType,
        status: i < coolingNeeded ? 'running' : 'standby',
        temp: 22 + Math.random() * 2,
        humidity: 45 + Math.random() * 5
      });
    }

    setPowerSystems(systems);
    setCoolingUnits(units);
  }, [powerArch, coolingType, itLoad, coolingInfo]);

  useEffect(() => {
    initializeSystems();
  }, [initializeSystems]);

  // 模拟故障
  const simulateFailure = (systemId: string) => {
    if (failedSystem) return;
    
    setFailedSystem(systemId);
    setPowerSystems(prev => prev.map(sys => 
      sys.id === systemId ? { ...sys, status: 'failure', load: 0 } : sys
    ));

    // 如果是UPS故障，切换负载
    if (systemId.startsWith('ups')) {
      setPowerSystems(prev => {
        const failed = prev.find(s => s.id === systemId);
        if (!failed) return prev;
        
        return prev.map(sys => {
          if (sys.status === 'standby') {
            return { ...sys, status: 'normal', load: failed.load };
          }
          return sys;
        });
      });
    }
  };

  // 恢复
  const handleRecovery = () => {
    setFailedSystem(null);
    initializeSystems();
  };

  // 动画步骤
  const steps: AnimationStep[] = useMemo(() => {
    const steps: AnimationStep[] = [
      {
        id: 'power',
        title: '供电系统',
        description: `${powerInfo.name}：${powerInfo.description}，可用性${powerInfo.availability}`
      },
      {
        id: 'cooling',
        title: '制冷系统',
        description: `${coolingInfo.name}：PUE因子${coolingInfo.efficiency}，适合${coolingInfo.suitable}`
      },
      {
        id: 'pue',
        title: 'PUE计算',
        description: `当前PUE = ${pue}，IT负载${itLoad}kW`
      }
    ];
    return steps;
  }, [powerInfo, coolingInfo, pue, itLoad]);

  // 参数定义
  const parameters = [
    {
      id: 'powerArch',
      name: '供电架构',
      type: 'select' as const,
      value: powerArch,
      options: [
        { value: 'n', label: 'N - 无冗余' },
        { value: 'nPlus1', label: 'N+1 - 模块冗余' },
        { value: 'nPlusN', label: '2N - 完全冗余' },
        { value: 'twoNPlus1', label: '2(N+1) - 双路冗余' }
      ]
    },
    {
      id: 'coolingType',
      name: '制冷方式',
      type: 'select' as const,
      value: coolingType,
      options: [
        { value: 'air', label: '风冷（PUE 1.5）' },
        { value: 'water', label: '水冷（PUE 1.3）' },
        { value: 'liquid', label: '液冷（PUE 1.1）' }
      ]
    },
    {
      id: 'itLoad',
      name: 'IT负载',
      type: 'range' as const,
      value: itLoad,
      min: 100,
      max: 2000,
      step: 50,
      unit: 'kW'
    },
    {
      id: 'showPowerFlow',
      name: '显示能流',
      type: 'boolean' as const,
      value: showPowerFlow
    }
  ];

  const handleParameterChange = (id: string, value: string | number | boolean) => {
    switch (id) {
      case 'powerArch':
        setPowerArch(value as keyof typeof POWER_ARCHITECTURES);
        setFailedSystem(null);
        break;
      case 'coolingType':
        setCoolingType(value as keyof typeof COOLING_TYPES);
        break;
      case 'itLoad':
        setItLoad(value as number);
        break;
      case 'showPowerFlow':
        setShowPowerFlow(value as boolean);
        break;
    }
  };

  const getLoadPercentage = (load: number, capacity: number) => {
    return Math.round((load / capacity) * 100);
  };

  const sceneData = {
    id: 'data-center-infra',
    title: '机房基础设施',
    description: '供电2N冗余、制冷PUE、环境监控可视化',
    phase: 2 as const,
    category: '数据中心',
    duration: '8-10分钟',
    difficulty: 'medium' as const,
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false} noHeightLimit={true}>
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* 参数面板 */}
        <div className="col-span-3 h-full overflow-y-auto">
          <ParameterPanel
            title="基础设施配置"
            parameters={parameters}
            onChange={handleParameterChange}
          />

          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">故障模拟</h3>
            <div className="space-y-2">
              {powerSystems.filter(s => s.id.startsWith('ups')).map(sys => (
                <button
                  key={sys.id}
                  onClick={() => simulateFailure(sys.id)}
                  disabled={failedSystem === sys.id || sys.status === 'standby'}
                  className="w-full py-1.5 px-2 bg-red-600/80 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-xs transition-all"
                >
                  {sys.name}故障
                </button>
              ))}
            </div>
            {failedSystem && (
              <button
                onClick={handleRecovery}
                className="w-full mt-2 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> 恢复系统
              </button>
            )}
          </div>
        </div>

        {/* 可视化区域 */}
        <div className="col-span-6">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-6 relative overflow-hidden">
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* 供电系统 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-slate-200">供电系统</h3>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${powerInfo.color}30`, color: powerInfo.color }}>
                    {powerInfo.name}
                  </span>
                </div>

                <div className="space-y-3">
                  {powerSystems.map((sys, index) => (
                    <motion.div
                      key={sys.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        sys.status === 'failure'
                          ? 'bg-red-900/50 border-red-600'
                          : sys.status === 'standby'
                          ? 'bg-slate-800/50 border-slate-600'
                          : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                      }`}
                      onClick={() => sys.status !== 'standby' && simulateFailure(sys.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Battery className={`w-4 h-4 ${
                            sys.status === 'failure' ? 'text-red-400' : 
                            sys.status === 'standby' ? 'text-slate-500' : 'text-green-400'
                          }`} />
                          <span className="text-sm font-medium text-slate-200">{sys.name}</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          sys.status === 'failure' ? 'bg-red-500' :
                          sys.status === 'standby' ? 'bg-slate-500' : 'bg-green-500 animate-pulse'
                        }`} />
                      </div>
                      
                      {sys.status !== 'standby' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">负载</span>
                            <span className={sys.load > sys.capacity * 0.8 ? 'text-red-400' : 'text-slate-300'}>
                              {sys.load.toFixed(0)}kW / {sys.capacity.toFixed(0)}kW
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${
                                sys.load > sys.capacity * 0.8 ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${getLoadPercentage(sys.load, sys.capacity)}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {sys.status === 'standby' && (
                        <div className="text-xs text-slate-500">待机中</div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* IT负载 */}
                <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-700 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">IT设备负载</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{itLoad} kW</div>
                  <div className="text-xs text-slate-400">总功耗</div>
                </div>
              </div>

              {/* 制冷系统 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Wind className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold text-slate-200">制冷系统</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-400">
                    {coolingInfo.name}
                  </span>
                </div>

                <div className="space-y-3">
                  {coolingUnits.map((unit, index) => (
                    <motion.div
                      key={unit.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-3 rounded-lg border ${
                        unit.status === 'running'
                          ? 'bg-cyan-900/30 border-cyan-700'
                          : 'bg-slate-800/50 border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-200">{unit.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          unit.status === 'running' ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300'
                        }`}>
                          {unit.status === 'running' ? '运行中' : '待机'}
                        </span>
                      </div>
                      
                      {unit.status === 'running' && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-orange-400" />
                            <span className="text-slate-300">{unit.temp.toFixed(1)}°C</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-blue-400" />
                            <span className="text-slate-300">{unit.humidity.toFixed(0)}%</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* PUE显示 */}
                <div className="p-4 bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-lg border border-green-700 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">PUE 能效指标</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{pue}</span>
                    <span className="text-sm text-slate-400">
                      {parseFloat(pue) < 1.3 ? '优秀' : parseFloat(pue) < 1.5 ? '良好' : '一般'}
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        parseFloat(pue) < 1.3 ? 'bg-green-500' : 
                        parseFloat(pue) < 1.5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((parseFloat(pue) - 1) * 100, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    总功耗: {(parseFloat(pue) * itLoad).toFixed(0)} kW
                  </div>
                </div>
              </div>
            </div>

            {/* 能流动画 */}
            {showPowerFlow && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                    initial={{ left: '25%', top: '30%', opacity: 0 }}
                    animate={{
                      left: ['25%', '25%'],
                      top: ['30%', '70%'],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.2,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                  />
                ))}
              </div>
            )}
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
        <div className="col-span-3 space-y-4">
          <InfoPanel
            title="供电架构对比"
            content={
              <div className="space-y-2">
                {Object.entries(POWER_ARCHITECTURES).map(([key, arch]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      powerArch === key
                        ? 'bg-slate-700 border-slate-500'
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                    }`}
                    onClick={() => setPowerArch(key as keyof typeof POWER_ARCHITECTURES)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-200">{arch.name}</span>
                      <span className="text-xs" style={{ color: arch.color }}>{arch.availability}</span>
                    </div>
                    <div className="text-xs text-slate-400">{arch.description}</div>
                    <div className="text-xs text-slate-500 mt-1">冗余度: {arch.redundancy}</div>
                  </div>
                ))}
              </div>
            }
          />

          <InfoPanel
            title="制冷方式对比"
            content={
              <div className="space-y-2">
                {Object.entries(COOLING_TYPES).map(([key, type]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      coolingType === key
                        ? 'bg-slate-700 border-slate-500'
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                    }`}
                    onClick={() => setCoolingType(key as keyof typeof COOLING_TYPES)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-200">{type.name}</span>
                      <span className="text-xs text-cyan-400">PUE {type.efficiency}</span>
                    </div>
                    <div className="text-xs text-slate-400">{type.description}</div>
                    <div className="text-xs text-slate-500 mt-1">适用: {type.suitable}</div>
                  </div>
                ))}
              </div>
            }
          />

          <InfoPanel
            title="PUE参考标准"
            content={
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 bg-green-900/30 rounded border border-green-700">
                  <span className="text-green-400">优秀</span>
                  <span className="text-slate-300">&lt; 1.3</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-yellow-900/30 rounded border border-yellow-700">
                  <span className="text-yellow-400">良好</span>
                  <span className="text-slate-300">1.3 - 1.5</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-900/30 rounded border border-orange-700">
                  <span className="text-orange-400">一般</span>
                  <span className="text-slate-300">1.5 - 2.0</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-900/30 rounded border border-red-700">
                  <span className="text-red-400">较差</span>
                  <span className="text-slate-300">&gt; 2.0</span>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </SceneLayout>
  );
}
