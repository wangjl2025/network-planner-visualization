import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import {
  Layers,
  Server,
  Network,
  ArrowDown,
  ArrowUp,
  GitBranch,
  Cpu,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// 流表条目
interface FlowEntry {
  id: string;
  match: string;
  action: string;
  priority: number;
  hits: number;
  color: string;
}

// 数据包
interface Packet {
  id: number;
  src: string;
  dst: string;
  port: number;
  currentHop: string;
  matched: boolean;
  dropped: boolean;
  color: string;
}

const CONTROLLERS = [
  { id: 'c1', name: 'SDN控制器', ip: '10.0.0.1', role: '主控', color: '#3b82f6' },
];

const SWITCHES = [
  { id: 's1', name: '交换机S1', ip: '10.1.0.1', x: 20, y: 65, layer: 'core' },
  { id: 's2', name: '交换机S2', ip: '10.1.0.2', x: 50, y: 65, layer: 'core' },
  { id: 's3', name: '交换机S3', ip: '10.1.0.3', x: 80, y: 65, layer: 'core' },
];

const HOSTS = [
  { id: 'h1', name: 'Host 1', ip: '10.2.0.1', switchId: 's1', color: '#22c55e' },
  { id: 'h2', name: 'Host 2', ip: '10.2.0.2', switchId: 's1', color: '#22c55e' },
  { id: 'h3', name: 'Host 3', ip: '10.2.0.3', switchId: 's2', color: '#f59e0b' },
  { id: 'h4', name: 'Host 4', ip: '10.2.0.4', switchId: 's3', color: '#ef4444' },
];

const FLOW_TABLE_INITIAL: FlowEntry[] = [
  { id: 'f1', match: 'src=10.2.0.1, dst=10.2.0.3', action: 'Forward: S2 port 1', priority: 100, hits: 0, color: '#22c55e' },
  { id: 'f2', match: 'src=10.2.0.1, dst=10.2.0.4', action: 'Forward: S3 port 1', priority: 100, hits: 0, color: '#3b82f6' },
  { id: 'f3', match: 'dst=10.2.0.2, tcp dport=80', action: 'Forward + Meter(10Mbps)', priority: 200, hits: 0, color: '#8b5cf6' },
  { id: 'f4', match: '未知流量', action: 'Packet-In → 控制器', priority: 1, hits: 0, color: '#f59e0b' },
];

const ANIMATION_STEPS = [
  { id: 'overview', label: 'SDN架构概述', desc: 'SDN将控制平面与数据平面分离。控制平面集中在SDN控制器（软件），数据平面由OpenFlow交换机（硬件）实现，通过南向接口通信。' },
  { id: 'layers', label: 'SDN三层架构', desc: '应用层（业务逻辑）→ 控制层（SDN控制器，如OpenDaylight/ONOS）→ 基础设施层（OpenFlow交换机）。北向接口API供应用调用，南向接口下发流规则。' },
  { id: 'openflow', label: 'OpenFlow协议', desc: 'OpenFlow是SDN南向接口标准协议。控制器通过OF-Config管理交换机，通过OpenFlow协议下发流表，交换机按流表转发，未匹配的送给控制器决策。' },
  { id: 'packet-in', label: 'Packet-In：首包处理', desc: '交换机收到未知流量时，发送Packet-In消息给控制器。控制器分析后决定如何转发，并下发Flow-Mod消息写入流表。后续同类流量由交换机直接转发。' },
  { id: 'flow-mod', label: 'Flow-Mod：流规则下发', desc: '控制器向交换机下发Flow-Mod消息，写入流表条目（Match + Action）。Action可以是转发、丢弃、修改报文头、限速等。' },
  { id: 'forwarding', label: '流表驱动转发', desc: '交换机按优先级查找流表，命中则执行对应Action，未命中则送给控制器处理（miss action）。实现了"一次学习，后续直达"的效果。' },
  { id: 'nbi', label: '北向接口（NBI）', desc: 'SDN控制器提供REST API（北向接口），上层应用（负载均衡、防火墙策略、流量工程）通过API配置网络行为，无需理解底层网络细节。' },
  { id: 'traditional-vs-sdn', label: '传统网络 vs SDN', desc: '传统网络：控制平面分布在每台设备，配置复杂，需逐台管理。SDN：控制平面集中，全局视角，可编程，自动化运维效率大幅提升。' },
];

export function SDNArchitectureScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [flowTable, setFlowTable] = useState<FlowEntry[]>(FLOW_TABLE_INITIAL);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [packetInProgress, setPacketInProgress] = useState(false);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [sdnMode, setSdnMode] = useState(true);
  const [flowModAnimating, setFlowModAnimating] = useState(false);
  const [packetInAnimating, setPacketInAnimating] = useState(false);

  const parameters = [
    {
      id: 'controllerType',
      label: '控制器类型',
      type: 'select' as const,
      value: 'onos',
      options: [
        { value: 'onos', label: 'ONOS' },
        { value: 'odl', label: 'OpenDaylight' },
        { value: 'ryu', label: 'Ryu' },
        { value: 'floodlight', label: 'Floodlight' },
      ],
    },
    {
      id: 'ofVersion',
      label: 'OpenFlow版本',
      type: 'select' as const,
      value: 'of13',
      options: [
        { value: 'of10', label: 'OpenFlow 1.0' },
        { value: 'of13', label: 'OpenFlow 1.3' },
        { value: 'of15', label: 'OpenFlow 1.5' },
      ],
    },
  ];

  const currentStepId = ANIMATION_STEPS[currentStep]?.id;

  useEffect(() => {
    const step = currentStepId;
    if (step === 'layers') setActiveLayer('all');
    else if (step === 'openflow') setActiveLayer('infra');
    else if (step === 'nbi') setActiveLayer('app');
    else setActiveLayer(null);
  }, [currentStepId]);

  // 模拟Packet-In
  const simulatePacketIn = useCallback(() => {
    setPacketInAnimating(true);
    setTimeout(() => {
      setFlowModAnimating(true);
      setTimeout(() => {
        setFlowModAnimating(false);
        setPacketInAnimating(false);
        setFlowTable(prev => prev.map(f => f.id === 'f4' ? { ...f, hits: f.hits + 1 } : f));
      }, 1500);
    }, 1200);
  }, []);

  // 模拟流表命中
  const simulateFlowHit = useCallback((flowId: string) => {
    setFlowTable(prev => prev.map(f => f.id === flowId ? { ...f, hits: f.hits + 1 } : f));
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < ANIMATION_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 2800);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setFlowTable(FLOW_TABLE_INITIAL);
    setActiveLayer(null);
    setPacketInAnimating(false);
    setFlowModAnimating(false);
  }, []);

  const layers = [
    {
      id: 'app',
      name: '应用层（Application Layer）',
      color: '#3b82f6',
      desc: '网络应用与业务逻辑',
      apps: ['负载均衡', '防火墙策略', '流量工程', 'QoS管理', '网络监控'],
      interface: '北向接口（REST API）',
    },
    {
      id: 'ctrl',
      name: '控制层（Control Layer）',
      color: '#8b5cf6',
      desc: 'SDN控制器（ONOS / OpenDaylight）',
      apps: ['全局网络视图', '流表计算', '路径规划', '拓扑发现'],
      interface: '南向接口（OpenFlow / NETCONF）',
    },
    {
      id: 'infra',
      name: '基础设施层（Infrastructure Layer）',
      color: '#22c55e',
      desc: 'OpenFlow交换机/路由器',
      apps: ['S1', 'S2', 'S3', '高速转发', '流表存储'],
      interface: null,
    },
  ];

  // Scene 数据
  const sceneData = {
    id: 'sdn-architecture',
    title: 'SDN架构：控制与转发分离',
    description: 'SDN三层架构、OpenFlow协议、流表下发与Packet-In处理过程',
    phase: 4 as const,
    category: '前沿技术',
    duration: '7-9分钟',
    difficulty: 'hard' as const,
    isHot: true,
  };

  return (
    <SceneLayout
      scene={sceneData}
      showSidebar={false}
    >
      <div className="grid grid-cols-12 gap-4 h-full overflow-y-auto p-4">
        {/* 参数面板 */}
        <div className="col-span-3">
          <ParameterPanel
            title="SDN配置"
            parameters={parameters}
            onChange={() => {}}
            onReset={() => {}}
          />

          {/* 模式切换 */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">网络模式</h3>
            <div className="space-y-2">
              {[
                { id: true, label: 'SDN模式', desc: '集中控制，可编程' },
                { id: false, label: '传统模式', desc: '分布式控制，逐台配置' },
              ].map(mode => (
                <button
                  key={String(mode.id)}
                  onClick={() => setSdnMode(mode.id)}
                  className={`w-full flex items-start gap-2 p-2 rounded text-sm transition-all ${
                    sdnMode === mode.id
                      ? 'bg-blue-600/80 text-white border border-blue-500'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {sdnMode === mode.id ? <ToggleRight className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <ToggleLeft className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <div className="text-left">
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-xs opacity-70">{mode.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 交互操作 */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">交互演示</h3>
            <div className="space-y-2">
              <button
                onClick={simulatePacketIn}
                disabled={packetInAnimating}
                className="w-full py-2 px-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-xs transition-all flex items-center gap-2"
              >
                <ArrowUp className="w-3 h-3" />
                发送未知流量（触发Packet-In）
              </button>
              {['f1', 'f2', 'f3'].map(fid => {
                const f = flowTable.find(x => x.id === fid);
                if (!f) return null;
                return (
                  <button
                    key={fid}
                    onClick={() => simulateFlowHit(fid)}
                    className="w-full py-2 px-3 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs transition-all flex items-center gap-2"
                    style={{ borderLeft: `3px solid ${f.color}` }}
                  >
                    <CheckCircle className="w-3 h-3" style={{ color: f.color }} />
                    命中流表 {fid.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 主可视化区域 */}
        <div className="col-span-6">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-5 min-h-[460px]">
            <AnimatePresence mode="wait">
              {(currentStepId === 'traditional-vs-sdn') ? (
                /* 传统 vs SDN 对比 */
                <motion.div
                  key="compare"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 gap-4"
                >
                  {[
                    {
                      title: '传统网络',
                      color: '#f59e0b',
                      points: ['控制平面分散在每台设备', '逐台登录配置（CLI）', '协议行为固化，难以更改', '无全局视角，故障排查难', '扩容需手动配置'],
                      bad: true,
                    },
                    {
                      title: 'SDN网络',
                      color: '#22c55e',
                      points: ['控制平面集中在控制器', '统一API配置（REST）', '软件定义行为，灵活可编程', '全局网络视图，智能路由', '自动化编排，快速扩容'],
                      bad: false,
                    },
                  ].map(side => (
                    <div
                      key={side.title}
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: side.color + '15', border: `1px solid ${side.color}40` }}
                    >
                      <h3 className="font-bold mb-3 text-center" style={{ color: side.color }}>{side.title}</h3>
                      {side.points.map((p, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: side.bad ? -10 : 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-2 mb-2 text-xs"
                        >
                          {side.bad
                            ? <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                            : <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                          }
                          <span className="text-slate-300">{p}</span>
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </motion.div>
              ) : (
                /* SDN三层架构图 */
                <motion.div
                  key="sdn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {layers.map((layer, i) => {
                    const isActive = activeLayer === 'all' || activeLayer === layer.id;
                    const isCtrl = layer.id === 'ctrl';
                    return (
                      <div key={layer.id}>
                        <motion.div
                          className="rounded-xl p-4 cursor-pointer transition-all"
                          style={{
                            backgroundColor: layer.color + (isActive ? '20' : '0a'),
                            border: `2px solid ${layer.color}${isActive ? 'aa' : '40'}`,
                            boxShadow: isActive ? `0 0 20px ${layer.color}20` : 'none',
                          }}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {layer.id === 'app' ? <GitBranch className="w-4 h-4" style={{ color: layer.color }} /> :
                               layer.id === 'ctrl' ? <Cpu className="w-4 h-4" style={{ color: layer.color }} /> :
                               <Network className="w-4 h-4" style={{ color: layer.color }} />}
                              <span className="font-bold text-sm" style={{ color: layer.color }}>{layer.name}</span>
                            </div>
                            <span className="text-xs text-slate-500">{layer.desc}</span>
                          </div>
                          
                          {/* 内容展示 */}
                          <div className="flex flex-wrap gap-2">
                            {layer.apps.map(app => (
                              <span
                                key={app}
                                className="px-2 py-1 rounded text-xs text-white"
                                style={{ backgroundColor: layer.color + '50' }}
                              >
                                {app}
                              </span>
                            ))}
                          </div>

                          {/* 控制层显示流表控制 */}
                          {isCtrl && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {/* Packet-In动画 */}
                              <div className="relative p-2 bg-slate-900/50 rounded border border-slate-700">
                                <div className="text-xs text-slate-400 mb-1">← Packet-In</div>
                                <AnimatePresence>
                                  {packetInAnimating && (
                                    <motion.div
                                      initial={{ y: 20, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      exit={{ y: -10, opacity: 0 }}
                                      className="text-xs text-yellow-400 font-mono"
                                    >
                                      📦 unknown_pkt
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              {/* Flow-Mod动画 */}
                              <div className="relative p-2 bg-slate-900/50 rounded border border-slate-700">
                                <div className="text-xs text-slate-400 mb-1">→ Flow-Mod</div>
                                <AnimatePresence>
                                  {flowModAnimating && (
                                    <motion.div
                                      initial={{ y: -10, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      exit={{ y: 10, opacity: 0 }}
                                      className="text-xs text-green-400 font-mono"
                                    >
                                      ⚡ add flow_entry
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          )}
                        </motion.div>

                        {/* 接口标注 */}
                        {layer.interface && (
                          <div className="flex items-center justify-center my-1 gap-2">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <ArrowDown className="w-3 h-3 text-slate-500" />
                              <span>{layer.interface}</span>
                              <ArrowUp className="w-3 h-3 text-slate-500" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 动画播放器 */}
          <div className="mt-4">
            <AnimationPlayer
              steps={ANIMATION_STEPS}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onReset={handleReset}
              onStepChange={setCurrentStep}
            />
          </div>
        </div>

        {/* 信息面板 */}
        <div className="col-span-3 space-y-4">
          <InfoPanel
            title="当前步骤"
            content={
              <div className="text-xs">
                <div className="font-semibold text-blue-400 mb-2">{ANIMATION_STEPS[currentStep]?.label}</div>
                <p className="text-slate-400">{ANIMATION_STEPS[currentStep]?.desc}</p>
              </div>
            }
          />

          <InfoPanel
            title="流表（Flow Table）"
            content={
              <div className="space-y-2 text-xs">
                {flowTable.map(flow => (
                  <div
                    key={flow.id}
                    className="p-2 rounded border"
                    style={{ borderColor: flow.color + '60', backgroundColor: flow.color + '10' }}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-slate-300">{flow.id.toUpperCase()}</span>
                      <span className="text-slate-500">命中: {flow.hits}</span>
                    </div>
                    <div className="text-slate-400 mb-0.5">匹配: {flow.match}</div>
                    <div style={{ color: flow.color }}>动作: {flow.action}</div>
                    <div className="text-slate-600">优先级: {flow.priority}</div>
                  </div>
                ))}
              </div>
            }
          />

          <InfoPanel
            title="SDN接口对比"
            content={
              <div className="space-y-2 text-xs">
                {[
                  { name: '北向接口（NBI）', desc: '控制器 ↔ 应用。REST API，供编排系统、OSS/BSS调用', color: '#3b82f6' },
                  { name: '南向接口（SBI）', desc: '控制器 ↔ 交换机。OpenFlow、NETCONF、P4Runtime', color: '#22c55e' },
                  { name: '东西向接口', desc: '控制器 ↔ 控制器。多域协同，GMPLS、BGP-LS', color: '#8b5cf6' },
                ].map(item => (
                  <div key={item.name} className="p-2 rounded bg-slate-800">
                    <div className="font-semibold mb-1" style={{ color: item.color }}>{item.name}</div>
                    <div className="text-slate-400">{item.desc}</div>
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
