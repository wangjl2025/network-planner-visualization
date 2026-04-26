import { useState, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Activity, 
  Zap, 
  Wifi, 
  Cpu, 
  AlertTriangle,
  CheckCircle,
  Sliders,
  Signal
} from 'lucide-react';

// 切片类型
type SliceType = 'eMBB' | 'uRLLC' | 'mMTC';

// 切片定义
interface NetworkSlice {
  id: SliceType;
  name: string;
  fullName: string;
  color: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  use: string[];
  bandwidth: number;    // Mbps
  latency: number;      // ms
  reliability: string;
  connections: string;
  description: string;
  slaWarning?: string;
}

// 资源分配
interface ResourceAlloc {
  spectrum: number;   // %
  compute: number;    // %
  memory: number;     // %
}

const SLICE_DEFS: Record<SliceType, NetworkSlice> = {
  eMBB: {
    id: 'eMBB',
    name: 'eMBB',
    fullName: '增强移动宽带',
    color: '#3b82f6',
    icon: Wifi,
    use: ['4K/8K视频流', 'VR/AR体验', '高清直播', '云游戏'],
    bandwidth: 1000,
    latency: 10,
    reliability: '99.9%',
    connections: '10,000/km²',
    description: '为大带宽业务提供高达1Gbps的峰值速率，适合视频流媒体、VR/AR等高带宽场景',
  },
  uRLLC: {
    id: 'uRLLC',
    name: 'uRLLC',
    fullName: '超可靠低时延',
    color: '#22c55e',
    icon: Zap,
    use: ['自动驾驶', '远程手术', '工业控制', '智能电网'],
    bandwidth: 10,
    latency: 1,
    reliability: '99.9999%',
    connections: '100/km²',
    description: '端到端时延低于1ms，可靠性99.9999%，专为工业控制、自动驾驶等超低时延场景设计',
    slaWarning: '时延超过1ms触发SLA告警',
  },
  mMTC: {
    id: 'mMTC',
    name: 'mMTC',
    fullName: '海量机器通信',
    color: '#f59e0b',
    icon: Cpu,
    use: ['智能电表', '智慧农业', '环境监测', '资产追踪'],
    bandwidth: 1,
    latency: 1000,
    reliability: '99%',
    connections: '1,000,000/km²',
    description: '支持每平方公里百万级设备连接，功耗极低，适合IoT传感器、智能城市等大规模连接场景',
  },
};

// 初始资源分配
const DEFAULT_ALLOC: Record<SliceType, ResourceAlloc> = {
  eMBB: { spectrum: 60, compute: 50, memory: 40 },
  uRLLC: { spectrum: 25, compute: 30, memory: 35 },
  mMTC: { spectrum: 15, compute: 20, memory: 25 },
};

const SCENE_DATA = {
  id: '5g-network-slice',
  title: '5G网络切片可视化',
  description: '理解5G三大切片类型（eMBB/uRLLC/mMTC）的差异化QoS保障，可视化资源隔离分配、SLA监控和典型应用场景',
  phase: 4 as const,
  category: '无线网络',
  difficulty: 'medium' as const,
  duration: '5-8分钟',
};

export function FiveGNetworkSliceScene() {
  const [selectedSlice, setSelectedSlice] = useState<SliceType | null>(null);
  const [alloc, setAlloc] = useState<Record<SliceType, ResourceAlloc>>(DEFAULT_ALLOC);
  const [slaAlert, setSlaAlert] = useState<SliceType | null>(null);
  const [dataFlowActive, setDataFlowActive] = useState(true);

  // 更新资源分配（保持总和约束）
  const updateAlloc = useCallback((slice: SliceType, resource: keyof ResourceAlloc, value: number) => {
    setAlloc(prev => ({
      ...prev,
      [slice]: { ...prev[slice], [resource]: value },
    }));
    // uRLLC频谱低于20%触发告警
    if (slice === 'uRLLC' && resource === 'spectrum' && value < 20) {
      setSlaAlert('uRLLC');
    } else {
      setSlaAlert(null);
    }
  }, []);

  // 计算总利用率
  const totalAlloc = useCallback((resource: keyof ResourceAlloc) => {
    return Object.values(alloc).reduce((sum, a) => sum + a[resource], 0);
  }, [alloc]);

  const sliceTypes: SliceType[] = ['eMBB', 'uRLLC', 'mMTC'];

  const renderScene = () => (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* 左侧：物理基础设施 + 切片选择 */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        {/* 物理网络 */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex-shrink-0">
          <div className="text-xs font-semibold text-slate-400 mb-3">物理网络基础设施</div>
          <div className="flex items-center justify-between text-xs font-mono">
            {['基站\ngNB', '传输网\nXHaul', '核心网\nUPF', '数据中心\nMEC'].map((node, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <motion.div
                    className="w-12 h-10 bg-slate-700 border border-slate-500 rounded-lg flex items-center justify-center"
                    animate={dataFlowActive ? { borderColor: ['#475569', '#3b82f6', '#475569'] } : {}}
                    transition={{ delay: i * 0.3, repeat: Infinity, duration: 2 }}
                  >
                    <Signal className="w-5 h-5 text-slate-400" />
                  </motion.div>
                  <span className="text-slate-500 text-center whitespace-pre-line leading-tight text-[10px]">{node}</span>
                </div>
                {i < 3 && (
                  <div className="mx-1 w-4 h-0.5 bg-slate-600 relative overflow-hidden">
                    {dataFlowActive && (
                      <motion.div
                        className="absolute top-0 left-0 h-full w-2 bg-blue-400"
                        animate={{ x: [-8, 24] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 三大切片卡片 */}
        {sliceTypes.map(sliceId => {
          const slice = SLICE_DEFS[sliceId];
          const Icon = slice.icon;
          const isSelected = selectedSlice === sliceId;
          const hasAlert = slaAlert === sliceId;

          return (
            <motion.button
              key={sliceId}
              onClick={() => setSelectedSlice(isSelected ? null : sliceId)}
              className={`relative text-left p-3 border-2 rounded-xl transition-all ${
                isSelected
                  ? 'border-opacity-100 shadow-lg'
                  : 'border-opacity-30 hover:border-opacity-60'
              }`}
              style={{
                borderColor: slice.color,
                backgroundColor: isSelected ? slice.color + '20' : slice.color + '08',
                boxShadow: isSelected ? `0 0 20px ${slice.color}40` : undefined,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {hasAlert && (
                <motion.div
                  className="absolute top-2 right-2 flex items-center gap-1 text-xs text-red-300 bg-red-900/40 border border-red-700 rounded px-1.5 py-0.5"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  SLA告警
                </motion.div>
              )}

              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: slice.color + '30' }}>
                  <Icon className="w-4 h-4" style={{ color: slice.color }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: slice.color }}>{slice.name}</div>
                  <div className="text-xs text-slate-400">{slice.fullName}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">峰值带宽</span>
                  <span className="font-mono" style={{ color: slice.color }}>
                    {slice.bandwidth >= 1000 ? `${slice.bandwidth/1000}G` : slice.bandwidth}Mbps
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">端到端时延</span>
                  <span className="font-mono" style={{ color: slice.color }}>{slice.latency}ms</span>
                </div>
              </div>

              {/* 资源条 */}
              <div className="mt-2 space-y-1">
                {(['spectrum', 'compute', 'memory'] as const).map(res => (
                  <div key={res} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 w-8">{res === 'spectrum' ? '频谱' : res === 'compute' ? '算力' : '内存'}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                      <motion.div
                        className="h-1.5 rounded-full"
                        style={{ backgroundColor: slice.color + 'cc' }}
                        animate={{ width: `${alloc[sliceId][res]}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: slice.color }}>{alloc[sliceId][res]}%</span>
                  </div>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 右侧：详情 + 资源调整 */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* 选中切片详情 */}
        {selectedSlice ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedSlice}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-slate-800/80 border rounded-xl p-4 flex-shrink-0"
              style={{ borderColor: SLICE_DEFS[selectedSlice].color + '60' }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold" style={{ color: SLICE_DEFS[selectedSlice].color }}>
                      {SLICE_DEFS[selectedSlice].name}
                    </span>
                    <span className="text-sm text-slate-400">{SLICE_DEFS[selectedSlice].fullName}</span>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">{SLICE_DEFS[selectedSlice].description}</p>
                  
                  {/* KPI指标 */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '峰值带宽', value: SLICE_DEFS[selectedSlice].bandwidth >= 1000 ? `${SLICE_DEFS[selectedSlice].bandwidth/1000}Gbps` : `${SLICE_DEFS[selectedSlice].bandwidth}Mbps` },
                      { label: '端到端时延', value: `${SLICE_DEFS[selectedSlice].latency}ms` },
                      { label: '可靠性', value: SLICE_DEFS[selectedSlice].reliability },
                      { label: '连接密度', value: SLICE_DEFS[selectedSlice].connections },
                    ].map(kpi => (
                      <div
                        key={kpi.label}
                        className="p-2 rounded-lg text-center border"
                        style={{ borderColor: SLICE_DEFS[selectedSlice].color + '40', backgroundColor: SLICE_DEFS[selectedSlice].color + '10' }}
                      >
                        <div className="text-xs text-slate-400 mb-0.5">{kpi.label}</div>
                        <div className="text-sm font-bold font-mono" style={{ color: SLICE_DEFS[selectedSlice].color }}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 应用场景 */}
                <div className="w-40 flex-shrink-0">
                  <div className="text-xs font-semibold text-slate-400 mb-2">典型应用</div>
                  <div className="space-y-1.5">
                    {SLICE_DEFS[selectedSlice].use.map(app => (
                      <div
                        key={app}
                        className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg"
                        style={{ backgroundColor: SLICE_DEFS[selectedSlice].color + '20' }}
                      >
                        <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: SLICE_DEFS[selectedSlice].color }} />
                        <span className="text-slate-300">{app}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex-shrink-0 flex items-center justify-center h-32 text-slate-600 text-sm">
            点击左侧切片卡片查看详情
          </div>
        )}

        {/* 资源分配调整面板 */}
        <div className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-slate-200">资源分配调整</span>
            <span className="ml-auto text-xs text-slate-500">点击切片后调整滑块</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {(['spectrum', 'compute', 'memory'] as const).map(resource => {
              const labels = { spectrum: '📡 无线频谱资源', compute: '💻 计算资源', memory: '🗄️ 内存资源' };
              const total = totalAlloc(resource);
              const overLimit = total > 100;

              return (
                <div key={resource}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">{labels[resource]}</span>
                    <span className={`text-xs font-mono ${overLimit ? 'text-red-400' : 'text-slate-400'}`}>
                      总计: {total}% {overLimit ? '⚠️ 超限' : ''}
                    </span>
                  </div>

                  {/* 可视化条 */}
                  <div className="h-6 bg-slate-700 rounded-lg overflow-hidden flex mb-2">
                    {sliceTypes.map(sliceId => {
                      const pct = alloc[sliceId][resource];
                      return (
                        <motion.div
                          key={sliceId}
                          className="h-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                          style={{ backgroundColor: SLICE_DEFS[sliceId].color + 'cc' }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.3 }}
                          title={`${SLICE_DEFS[sliceId].name}: ${pct}%`}
                        >
                          {pct > 8 && `${SLICE_DEFS[sliceId].name} ${pct}%`}
                        </motion.div>
                      );
                    })}
                    {total < 100 && (
                      <div className="h-full flex-1 flex items-center justify-center text-[10px] text-slate-500">
                        空闲 {100 - total}%
                      </div>
                    )}
                  </div>

                  {/* 各切片滑块 */}
                  <div className="space-y-1">
                    {sliceTypes.map(sliceId => (
                      <div key={sliceId} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SLICE_DEFS[sliceId].color }} />
                        <span className="text-xs text-slate-400 w-12">{SLICE_DEFS[sliceId].name}</span>
                        <input
                          type="range"
                          min={5}
                          max={80}
                          value={alloc[sliceId][resource]}
                          onChange={e => updateAlloc(sliceId, resource, parseInt(e.target.value))}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{ accentColor: SLICE_DEFS[sliceId].color }}
                        />
                        <span className="text-xs font-mono w-8 text-right" style={{ color: SLICE_DEFS[sliceId].color }}>
                          {alloc[sliceId][resource]}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA告警 */}
        <AnimatePresence>
          {slaAlert && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-shrink-0 flex items-center gap-3 p-3 bg-red-900/30 border border-red-700 rounded-xl"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-red-300">SLA违约告警 — {SLICE_DEFS[slaAlert].name}</div>
                <div className="text-xs text-red-400/80">{SLICE_DEFS[slaAlert].slaWarning || '资源不足，无法保障SLA承诺'}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 切片对比表 */}
        <div className="flex-shrink-0 bg-slate-800/80 border border-slate-700 rounded-xl p-3">
          <div className="text-xs font-semibold text-slate-400 mb-2">三大切片对比</div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-slate-500">指标</div>
            {sliceTypes.map(id => (
              <div key={id} className="text-center font-bold" style={{ color: SLICE_DEFS[id].color }}>{id}</div>
            ))}
            {[
              { label: '带宽需求', values: ['极高', '低', '极低'] },
              { label: '时延要求', values: ['中等', '极低', '不严格'] },
              { label: '连接数量', values: ['中等', '少', '海量'] },
              { label: '典型场景', values: ['视频/VR', '工业/自驾', 'IoT传感'] },
            ].map(row => (
              <Fragment key={row.label}>
                <div className="text-slate-500">{row.label}</div>
                {row.values.map((v, i) => (
                  <div key={i} className="text-center text-slate-300">{v}</div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SceneLayout scene={SCENE_DATA} showSidebar={false} noHeightLimit={true}>
      {renderScene()}
    </SceneLayout>
  );
}
