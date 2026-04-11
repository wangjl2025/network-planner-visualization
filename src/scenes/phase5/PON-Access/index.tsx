import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Server, Wifi, Monitor, Zap, ArrowRight, 
  Layers, Activity, RefreshCw, Settings
} from 'lucide-react';

interface Scene {
  id: string;
  title: string;
  description: string;
  phase: 1 | 2 | 3 | 4 | 5;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: string;
  isHot?: boolean;
}

const sceneData: Scene = {
  id: 'pon-access',
  title: 'PON接入技术：EPON vs GPON',
  description: '无源光网络PON技术原理、EPON(1Gbps)与GPON(2.5G)技术对比、WDM波分复用、分光器工作原理、TDMA时分多址',
  phase: 5,
  category: '基础协议',
  difficulty: 'medium',
  duration: '10-15分钟',
  isHot: true,
};

const animationSteps = [
  { id: '1', label: 'PON网络架构', desc: 'PON是无源光网络( Passive Optical Network)，OLT→分光器→ONT全程无源光器件' },
  { id: '2', label: '下行TDM广播', desc: 'OLT用TDM时分复用广播数据，所有ONT通过Gemport ID/LLID过滤属于自己的数据' },
  { id: '3', label: '上行TDMA', desc: 'ONT使用TDMA时分多址上传数据，由OLT统一分配时隙，避免光信号碰撞' },
  { id: '4', label: '分光器原理', desc: '光分路器(Power Splitter)将一路光信号均匀分成多路，GPON常见1:32/1:64，最大1:128' },
  { id: '5', label: 'GPON vs EPON', desc: 'GPON下行2.5G/上行1.25G，分光比更大；EPON对称1Gbps，以太网帧兼容，标准IEEE 802.3ah' },
];

// ODN网络拓扑可视化
function ODNTopology({ 
  splitRatio, 
  animationType,
  activeONT 
}: { 
  splitRatio: number; 
  animationType: 'idle' | 'downstream' | 'upstream';
  activeONT: number;
}) {
  const ontCount = splitRatio;
  
  // 生成ONT位置
  const getONTs = () => {
    if (ontCount <= 4) {
      return Array.from({ length: ontCount }, (_, i) => ({ x: 600, y: 80 + i * 120 }));
    } else if (ontCount <= 8) {
      return Array.from({ length: ontCount }, (_, i) => ({
        x: 550 + (i % 2) * 100,
        y: 60 + Math.floor(i / 2) * 100
      }));
    } else {
      return Array.from({ length: ontCount }, (_, i) => ({
        x: 500 + (i % 4) * 60,
        y: 50 + Math.floor(i / 4) * 80
      }));
    }
  };
  
  const onts = getONTs();
  
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl p-6 border border-gray-700">
      <div className="text-center mb-4">
        <h4 className="text-lg font-semibold text-white">ODN光分配网络架构</h4>
        <p className="text-xs text-gray-400 mt-1">分光比 1:{splitRatio}</p>
      </div>
      
      <div className="relative h-80">
        {/* OLT */}
        <motion.div 
          className="absolute left-8 top-1/2 -translate-y-1/2"
          animate={animationType !== 'idle' ? { scale: [1, 1.05, 1] } : {}}
        >
          <div className="w-20 h-20 rounded-xl bg-red-600 flex flex-col items-center justify-center border-2 border-red-400 shadow-lg shadow-red-500/30">
            <Server className="w-8 h-8 text-white" />
            <div className="text-[10px] text-white mt-1 font-bold">OLT</div>
          </div>
          <div className="mt-2 text-xs text-center">
            <div className="text-red-400">光线路终端</div>
            <div className="text-gray-500">运营商机房</div>
          </div>
        </motion.div>
        
        {/* 第一级分光器 */}
        <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div 
            className="w-16 h-16 rounded-xl bg-orange-600 flex flex-col items-center justify-center border-2 border-orange-400"
            animate={animationType === 'downstream' ? { scale: [1, 1.1, 1] } : {}}
          >
            <RefreshCw className="w-6 h-6 text-white" />
            <div className="text-[10px] text-white">1:4</div>
          </motion.div>
        </div>
        
        {/* 第二级分光器 */}
        {ontCount > 4 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div 
              className="w-14 h-14 rounded-xl bg-orange-500 flex flex-col items-center justify-center border-2 border-orange-300"
              animate={animationType === 'downstream' ? { scale: [1, 1.1, 1] } : {}}
            >
              <RefreshCw className="w-5 h-5 text-white" />
              <div className="text-[10px] text-white">1:{Math.ceil(ontCount/4)}</div>
            </motion.div>
          </div>
        )}
        
        {/* ONT设备 */}
        {onts.slice(0, 12).map((ont, idx) => (
          <motion.div
            key={idx}
            className={`absolute w-12 h-12 rounded-lg flex flex-col items-center justify-center border-2 transition-all ${
              activeONT === idx
                ? animationType === 'upstream'
                  ? 'bg-green-600 border-green-400 animate-pulse'
                  : animationType === 'downstream'
                  ? 'bg-green-600 border-green-400'
                  : 'bg-green-600 border-green-400'
                : 'bg-green-700 border-green-600'
            }`}
            style={{ left: ont.x, top: ont.y, transform: 'translate(-50%, -50%)' }}
          >
            <Wifi className="w-5 h-5 text-white" />
            <div className="text-[8px] text-white">ONT{idx + 1}</div>
          </motion.div>
        ))}
        
        {/* 光纤线 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* OLT到第一级 */}
          <motion.line
            x1={80}
            y1={200}
            x2={280}
            y2={200}
            stroke="#f97316"
            strokeWidth={3}
            animate={animationType === 'downstream' ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          />
          
          {/* 第一级分光器出口 */}
          {animationType === 'downstream' && (
            <motion.circle
              cx={320}
              cy={200}
              r={ontCount > 4 ? 30 : 60}
              fill="none"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5,5"
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
          
          {/* 活跃ONT的上行信号 */}
          {animationType === 'upstream' && activeONT < onts.length && (
            <motion.circle
              cx={onts[activeONT].x}
              cy={onts[activeONT].y}
              r={20}
              fill="#22c55e"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
            />
          )}
        </svg>
        
        {/* 动画标注 */}
        <AnimatePresence>
          {animationType === 'downstream' && (
            <motion.div
              className="absolute right-4 top-4 px-3 py-2 bg-red-900/50 rounded-lg border border-red-500"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="text-xs text-red-400">📡 下行广播</div>
              <div className="text-[10px] text-gray-400">所有ONT收到数据，按Gemport过滤</div>
            </motion.div>
          )}
          {animationType === 'upstream' && (
            <motion.div
              className="absolute right-4 top-4 px-3 py-2 bg-green-900/50 rounded-lg border border-green-500"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="text-xs text-green-400">📤 上行TDMA</div>
              <div className="text-[10px] text-gray-400">ONT{activeONT + 1}在时隙内发送</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// TDMA时隙可视化
function TDMASlotVisualizer({ 
  activeSlot, 
  onSlotChange 
}: { 
  activeSlot: number; 
  onSlotChange: (slot: number) => void;
}) {
  const slots = 8;
  
  return (
    <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
      <h4 className="text-sm font-semibold text-green-400 mb-4">TDMA时分多址复用</h4>
      <p className="text-xs text-gray-400 mb-4">
        OLT动态分配上行时隙给各ONT，避免光信号碰撞
      </p>
      
      {/* 时隙图 */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: slots }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => onSlotChange(idx)}
            className={`flex-1 h-12 rounded-lg border-2 transition-all flex items-center justify-center ${
              activeSlot === idx
                ? 'bg-green-600 border-green-400'
                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
            }`}
          >
            <span className="text-xs text-white font-mono">
              {activeSlot === idx ? `ONT${idx + 1}` : idx + 1}
            </span>
          </button>
        ))}
      </div>
      
      {/* 时间轴 */}
      <div className="relative h-8 bg-gray-800 rounded-lg mb-4 overflow-hidden">
        <div 
          className="absolute top-0 bottom-0 bg-green-600/50 border border-green-400"
          style={{ 
            left: `${(activeSlot / slots) * 100}%`,
            width: `${100 / slots}%`
          }}
        />
        <div className="absolute inset-0 flex items-center px-2">
          <span className="text-xs text-gray-400 font-mono">0ms</span>
          <span className="text-xs text-gray-400 font-mono ml-auto">125ms</span>
        </div>
      </div>
      
      {/* 说明 */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 bg-red-900/30 rounded-lg">
          <div className="text-red-400 font-medium">下行 (Broadcast)</div>
          <div className="text-gray-400">OLT向所有ONT广播</div>
        </div>
        <div className="p-2 bg-green-900/30 rounded-lg">
          <div className="text-green-400 font-medium">上行 (TDMA)</div>
          <div className="text-gray-400">ONT分时发送数据</div>
        </div>
      </div>
    </div>
  );
}

// PON类型对比
function PONTYpeComparison() {
  const types = [
    { 
      name: 'GPON', 
      fullName: 'Gigabit PON',
      rate: '2.488/1.244 Gbps', 
      splitRatio: '1:128', 
      efficiency: '93%',
      color: 'green',
      features: ['GEM封装', '动态带宽分配DBA', '电信级QoS']
    },
    { 
      name: 'EPON', 
      fullName: 'Ethernet PON',
      rate: '1 Gbps 对称', 
      splitRatio: '1:64', 
      efficiency: '70%',
      color: 'blue',
      features: ['以太网帧', '简单高效', '成本低廉']
    },
    { 
      name: '10G-EPON', 
      fullName: '10 Gigabit EPON',
      rate: '10 Gbps 对称', 
      splitRatio: '1:64', 
      efficiency: '70%',
      color: 'purple',
      features: ['IEEE 802.3av', '向后兼容EPON', '企业级应用']
    },
    { 
      name: 'XGS-PON', 
      fullName: '对称万兆PON',
      rate: '10 Gbps 对称', 
      splitRatio: '1:128', 
      efficiency: '93%',
      color: 'orange',
      features: ['NG-PON2标准', '对称带宽', '运营商首选']
    },
  ];
  
  return (
    <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">PON技术演进对比</h4>
      <div className="grid grid-cols-2 gap-3">
        {types.map((type) => (
          <div 
            key={type.name} 
            className={`p-4 rounded-lg border bg-${type.color}-900/20 border-${type.color}-500/30`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white">{type.name}</span>
              <span className={`text-xs text-${type.color}-400`}>{type.fullName}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="text-center">
                <div className={`text-${type.color}-400 font-mono`}>{type.rate}</div>
                <div className="text-gray-500">速率</div>
              </div>
              <div className="text-center">
                <div className={`text-${type.color}-400 font-mono`}>{type.splitRatio}</div>
                <div className="text-gray-500">分光比</div>
              </div>
              <div className="text-center">
                <div className={`text-${type.color}-400 font-mono`}>{type.efficiency}</div>
                <div className="text-gray-500">效率</div>
              </div>
            </div>
            <div className="space-y-1">
              {type.features.map((feat, idx) => (
                <div key={idx} className="text-xs text-gray-400 flex items-center gap-1">
                  <span className={`text-${type.color}-400`}>•</span>
                  {feat}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// GPON协议栈
function GPONProtocolStack() {
  const layers = [
    { name: 'GEM层', desc: 'GPON Encapsulation Mode，封装数据/语音/视频业务', color: 'cyan' },
    { name: 'PLOAM层', desc: 'Physical Layer OAM，ONU注册/带宽报告/告警', color: 'purple' },
    { name: 'OMCI层', desc: 'ONT Management and Control Interface，管理ONT业务', color: 'pink' },
    { name: 'GTC层', desc: 'GPON Transmission Convergence，帧结构复用', color: 'yellow' },
    { name: 'Physical层', desc: '光物理层，SFP光模块(Class B+/C+/C++ 光功率预算)', color: 'red' },
  ];
  
  return (
    <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
      <h4 className="text-sm font-semibold text-cyan-400 mb-4">GPON协议栈层次</h4>
      <div className="space-y-2">
        {layers.map((layer, idx) => (
          <motion.div
            key={layer.name}
            className={`p-3 rounded-lg bg-${layer.color}-900/20 border border-${layer.color}-500/30`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="flex items-center justify-between">
              <span className={`font-medium text-${layer.color}-400`}>{layer.name}</span>
              <span className="text-xs text-gray-500">({5 - idx})</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">{layer.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function PONAccessScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [splitRatio, setSplitRatio] = useState(8);
  const [animationType, setAnimationType] = useState<'idle' | 'downstream' | 'upstream'>('idle');
  const [activeONT, setActiveONT] = useState(0);
  const [activeSlot, setActiveSlot] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= animationSteps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlay = useCallback(() => {
    if (currentStep >= animationSteps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  }, [currentStep, isPlaying]);

  const handleStep = useCallback((step: number) => {
    setCurrentStep(step);
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setAnimationType('idle');
  }, []);

  const handleStartDownstream = () => {
    setAnimationType('downstream');
    setCurrentStep(2);
  };

  const handleStartUpstream = () => {
    setAnimationType('upstream');
    setActiveONT(Math.floor(Math.random() * Math.min(splitRatio, 12)));
    setActiveSlot(activeONT);
    setCurrentStep(3);
  };

  return (
    <SceneLayout
      scene={sceneData}
      showSidebar={false}
      animationProps={{
        steps: animationSteps,
        currentStep,
        isPlaying,
        onPlay: handlePlay,
        onPause: () => setIsPlaying(false),
        onStepChange: handleStep,
        onReset: handleReset,
      }}
    >
      <div className="space-y-6">
        {/* 分光比控制 */}
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-gray-300">分光比配置</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">1:4</span>
              <input
                type="range"
                min="4"
                max="64"
                step="4"
                value={splitRatio}
                onChange={(e) => setSplitRatio(Number(e.target.value))}
                className="w-32 accent-cyan-500"
              />
              <span className="text-xs text-gray-500">1:64</span>
              <span className="px-3 py-1 bg-cyan-900/50 rounded text-cyan-400 font-mono text-sm">
                1:{splitRatio}
              </span>
            </div>
          </div>
        </div>

        {/* 主可视化区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ODNTopology 
            splitRatio={splitRatio} 
            animationType={animationType}
            activeONT={activeONT}
          />
          
          <div className="space-y-4">
            {/* 控制按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleStartDownstream}
                disabled={animationType === 'downstream'}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  animationType === 'downstream'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-600/50 hover:bg-red-600 text-white'
                }`}
              >
                📡 演示下行广播
              </button>
              <button
                onClick={handleStartUpstream}
                disabled={animationType === 'upstream'}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  animationType === 'upstream'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-600/50 hover:bg-green-600 text-white'
                }`}
              >
                📤 演示上行TDMA
              </button>
              <button
                onClick={() => setAnimationType('idle')}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl"
              >
                重置
              </button>
            </div>
            
            <TDMASlotVisualizer activeSlot={activeSlot} onSlotChange={setActiveSlot} />
          </div>
        </div>

        {/* 技术对比 */}
        <PONTYpeComparison />
        
        {/* GPON协议栈 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GPONProtocolStack />
          
          <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">PON vs xDSL 对比</h4>
            <div className="space-y-3">
              <div className="p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/30">
                <div className="text-cyan-400 font-medium mb-2">PON优势</div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• 对称带宽能力 (GPON 2.5G/1.25G, XGS-PON 10G对称)</li>
                  <li>• 更远传输距离 (20-60km，远超DSL的5km)</li>
                  <li>• 全程无源器件，维护成本低</li>
                  <li>• 更高分光比，覆盖更多用户</li>
                </ul>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                <div className="text-blue-400 font-medium mb-2">xDSL优势</div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• 利用现有电话线，无需新布线</li>
                  <li>• 部署成本低，适合偏远农村</li>
                  <li>• 技术成熟，运维简单</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 技术要点 */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-green-500/10 rounded-xl p-5 border border-cyan-500/20">
          <h4 className="text-sm font-semibold text-cyan-400 mb-3">技术要点</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-cyan-400 font-medium mb-2">光功率预算</div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Class B+ (28dB) 最大32路分光</li>
                <li>• Class C+ (32dB) 最大64路分光</li>
                <li>• 光模块功率决定分光比</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-orange-400 font-medium mb-2">DBA动态带宽</div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 根据业务需求动态分配带宽</li>
                <li>• T-CONT (传输容器) 作为单位</li>
                <li>• 保证QoS和带宽公平性</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-green-400 font-medium mb-2">PON演进路线</div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• GPON → XGS-PON (对称10G)</li>
                <li>• 50G-PON (下一代标准)</li>
                <li>• WDM-PON (波分复用)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
