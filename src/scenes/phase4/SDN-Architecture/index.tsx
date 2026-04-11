import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import {
  Server,
  Router,
  Monitor,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Zap,
  Layers,
  Globe,
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

const CONTROLLERS = [
  { id: 'ctrl', name: 'ONOS控制器', ip: '10.0.0.1', x: 400, y: 60, color: '#8b5cf6' },
];

const SWITCHES = [
  { id: 's1', name: 'OpenFlow S1', ip: '10.1.0.1', x: 200, y: 220 },
  { id: 's2', name: 'OpenFlow S2', ip: '10.1.0.2', x: 400, y: 220 },
  { id: 's3', name: 'OpenFlow S3', ip: '10.1.0.3', x: 600, y: 220 },
];

const HOSTS = [
  { id: 'h1', name: 'Host 1', ip: '10.2.0.1', x: 100, y: 380, switchId: 's1' },
  { id: 'h2', name: 'Host 2', ip: '10.2.0.2', x: 200, y: 380, switchId: 's1' },
  { id: 'h3', name: 'Host 3', ip: '10.2.0.3', x: 350, y: 380, switchId: 's2' },
  { id: 'h4', name: 'Host 4', ip: '10.2.0.4', x: 500, y: 380, switchId: 's2' },
  { id: 'h5', name: 'Host 5', ip: '10.2.0.5', x: 600, y: 380, switchId: 's3' },
];

// 应用层组件
const APPS = [
  { id: 'lb', name: '负载均衡', x: 150, y: 30, color: '#3b82f6' },
  { id: 'fw', name: '防火墙', x: 280, y: 30, color: '#ef4444' },
  { id: 'te', name: '流量工程', x: 410, y: 30, color: '#22c55e' },
  { id: 'vm', name: '网络监控', x: 540, y: 30, color: '#f59e0b' },
];

const FLOW_TABLE_INITIAL: FlowEntry[] = [
  { id: 'f1', match: 'src=10.2.0.1, dst=10.2.0.3', action: 'Forward: S2:port3', priority: 100, hits: 0, color: '#3b82f6' },
  { id: 'f2', match: 'src=10.2.0.1, dst=10.2.0.5', action: 'Forward: S3:port3', priority: 100, hits: 0, color: '#22c55e' },
  { id: 'f3', match: 'tcp_dst=80', action: 'Forward + Mod', priority: 200, hits: 0, color: '#8b5cf6' },
  { id: 'f4', match: '未匹配流量', action: 'Packet-In → 控制器', priority: 1, hits: 0, color: '#f59e0b' },
];

const ANIMATION_STEPS = [
  { id: 'topology', label: 'SDN网络拓扑', desc: 'SDN网络由三部分组成：应用层（负载均衡、防火墙等）、控制层（SDN控制器）、基础设施层（OpenFlow交换机）。控制器位于中心，交换机连接各个主机。' },
  { id: 'southbound', label: '南向接口：OpenFlow', desc: '控制器与交换机之间通过OpenFlow协议通信。这是SDN的核心南向接口，控制器向交换机下发流表，交换机按流表转发数据。' },
  { id: 'northbound', label: '北向接口：REST API', desc: '应用层通过REST API与控制器通信。例如负载均衡应用请求最优路径，控制器计算后下发流表到交换机。' },
  { id: 'packet-in', label: 'Packet-In：首包处理', desc: '交换机收到未知流量时（如红色虚线），发送Packet-In消息给控制器请求指令。这是SDN集中控制的体现。' },
  { id: 'flow-mod', label: 'Flow-Mod：流表下发', desc: '控制器分析后，通过Flow-Mod消息向交换机下发新流表（如绿色实线）。后续同类流量由交换机直接按流表转发。' },
  { id: 'forward', label: '流表驱动转发', desc: '现在Host1→Host5的流量已写入流表，交换机S1→S3直接按流表转发（蓝色实线），无需再送控制器，实现"一次学习，后续直达"。' },
  { id: 'multi-controller', label: '控制器集群', desc: '生产环境通常部署多控制器集群（东西向通信），实现高可用和负载均衡。通过BGP-LS或GMPLS同步网络状态。' },
];

export function SDNArchitectureScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [flowTable, setFlowTable] = useState<FlowEntry[]>(FLOW_TABLE_INITIAL);
  const [flowModAnimating, setFlowModAnimating] = useState(false);
  const [packetInAnimating, setPacketInAnimating] = useState(false);
  const [forwardAnimating, setForwardAnimating] = useState(false);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const canvasRef = useRef<SVGSVGElement>(null);

  const currentStepId = ANIMATION_STEPS[currentStep]?.id;

  // 根据步骤控制动画
  useEffect(() => {
    setActiveLayer(null);
    setFlowModAnimating(false);
    setPacketInAnimating(false);
    setForwardAnimating(false);

    if (currentStepId === 'southbound') {
      setActiveLayer('southbound');
    } else if (currentStepId === 'northbound') {
      setActiveLayer('northbound');
    } else if (currentStepId === 'packet-in') {
      setPacketInAnimating(true);
    } else if (currentStepId === 'flow-mod') {
      setFlowModAnimating(true);
    } else if (currentStepId === 'forward') {
      setForwardAnimating(true);
      setFlowTable(prev => prev.map(f => f.id === 'f2' ? { ...f, hits: f.hits + 1 } : f));
    }
  }, [currentStepId]);

  // 自动播放
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < ANIMATION_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setFlowTable(FLOW_TABLE_INITIAL);
    setFlowModAnimating(false);
    setPacketInAnimating(false);
    setForwardAnimating(false);
    setActiveLayer(null);
  }, []);

  // 模拟Packet-In
  const simulatePacketIn = useCallback(() => {
    setPacketInAnimating(true);
    setTimeout(() => {
      setPacketInAnimating(false);
      setFlowModAnimating(true);
      setTimeout(() => {
        setFlowModAnimating(false);
        setFlowTable(prev => prev.map(f => f.id === 'f4' ? { ...f, hits: f.hits + 1 } : f));
      }, 1500);
    }, 1200);
  }, []);

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
      ],
    },
  ];

  // Scene 数据
  const sceneData = {
    id: 'sdn-architecture',
    title: 'SDN架构：控制与转发分离',
    description: 'SDN三层架构、OpenFlow协议、流表下发与Packet-In处理过程',
    phase: 4 as const,
    category: '前沿技术',
    duration: '6-8分钟',
    difficulty: 'hard' as const,
    isHot: true,
  };

  // 获取交换机位置
  const getSwitchPos = (id: string) => SWITCHES.find(s => s.id === id) || SWITCHES[0];

  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="grid grid-cols-12 gap-4 h-full overflow-hidden p-4">
        {/* 左侧：应用层 */}
        <div className="col-span-2 flex flex-col gap-2">
          <div className="bg-blue-600/20 border-2 border-blue-500/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-blue-400">应用层</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">业务逻辑与网络应用</p>
            <div className="space-y-1.5">
              {APPS.map(app => (
                <motion.div
                  key={app.id}
                  className="p-2 rounded text-xs text-center text-white font-medium"
                  style={{ backgroundColor: app.color }}
                  animate={activeLayer === 'northbound' ? { scale: 1.05 } : {}}
                >
                  {app.name}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex-1">
            <div className="text-xs text-slate-400 mb-2">北向接口 REST API</div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>• JSON / HTTP</div>
              <div>• 应用编程接口</div>
              <div>• 网络抽象化</div>
            </div>
          </div>
        </div>

        {/* 中间：主拓扑图 */}
        <div className="col-span-8">
          <div className="bg-slate-900/80 rounded-lg border border-slate-700 p-4 h-full">
            <svg ref={canvasRef} className="w-full h-full" viewBox="0 0 800 420">
              {/* ===== 区域背景 ===== */}
              {/* 控制层区域 */}
              <motion.rect
                x="50" y="20" width="700" height="100" rx="8"
                fill="#8b5cf6" fillOpacity="0.08"
                stroke="#8b5cf6" strokeOpacity={activeLayer === 'southbound' || activeLayer === 'northbound' ? 0.5 : 0.2}
                strokeWidth="2"
                animate={{ strokeOpacity: activeLayer ? 0.6 : 0.2 }}
              />
              <text x="60" y="45" className="text-xs" fill="#8b5cf6" fillOpacity="0.6">控制层 Control Layer</text>

              {/* 基础设施层区域 */}
              <motion.rect
                x="50" y="140" width="700" height="250" rx="8"
                fill="#22c55e" fillOpacity="0.05"
                stroke="#22c55e" strokeOpacity={activeLayer === 'southbound' ? 0.5 : 0.2}
                strokeWidth="2"
              />
              <text x="60" y="165" className="text-xs" fill="#22c55e" fillOpacity="0.6">基础设施层 Infrastructure Layer</text>

              {/* ===== 连接线：交换机到控制器（南向） ===== */}
              {SWITCHES.map((sw, i) => (
                <motion.line
                  key={`ctrl-${sw.id}`}
                  x1={CONTROLLERS[0].x} y1={CONTROLLERS[0].y + 30}
                  x2={sw.x} y2={sw.y - 25}
                  stroke="#8b5cf6"
                  strokeWidth={activeLayer === 'southbound' ? 3 : 1.5}
                  strokeDasharray={activeLayer === 'southbound' ? "0" : "5,5"}
                  animate={{ strokeWidth: activeLayer === 'southbound' ? [3, 2, 3] : 1.5 }}
                />
              ))}

              {/* ===== 连接线：交换机之间 ===== */}
              <motion.line
                x1={SWITCHES[0].x + 25} y1={SWITCHES[0].y}
                x2={SWITCHES[1].x - 25} y2={SWITCHES[1].y}
                stroke="#64748b" strokeWidth="1.5"
              />
              <motion.line
                x1={SWITCHES[1].x + 25} y1={SWITCHES[1].y}
                x2={SWITCHES[2].x - 25} y2={SWITCHES[2].y}
                stroke="#64748b" strokeWidth="1.5"
              />

              {/* ===== Packet-In 动画（h1到h5的未知流量） ===== */}
              <AnimatePresence>
                {packetInAnimating && (
                  <>
                    {/* 从h1发出的未知流量 */}
                    <motion.circle
                      r="8" fill="#ef4444"
                      initial={{ cx: HOSTS[0].x, cy: HOSTS[0].y }}
                      animate={{ cx: [HOSTS[0].x, SWITCHES[0].x, CONTROLLERS[0].x], cy: [HOSTS[0].y, SWITCHES[0].y, CONTROLLERS[0].y] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                    />
                    <motion.text
                      x={CONTROLLERS[0].x + 50} y={CONTROLLERS[0].y - 10}
                      className="text-xs fill-yellow-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Packet-In (未知流量)
                    </motion.text>
                  </>
                )}
              </AnimatePresence>

              {/* ===== Flow-Mod 动画 ===== */}
              <AnimatePresence>
                {flowModAnimating && (
                  <>
                    <motion.circle
                      r="8" fill="#22c55e"
                      initial={{ cx: CONTROLLERS[0].x, cy: CONTROLLERS[0].y }}
                      animate={{ cx: [CONTROLLERS[0].x, SWITCHES[2].x], cy: [CONTROLLERS[0].y, SWITCHES[2].y] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                    <motion.text
                      x={SWITCHES[2].x + 40} y={SWITCHES[2].y - 15}
                      className="text-xs fill-green-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Flow-Mod (新规则)
                    </motion.text>
                  </>
                )}
              </AnimatePresence>

              {/* ===== 转发动画 (Host1 -> Host5) ===== */}
              <AnimatePresence>
                {forwardAnimating && (
                  <>
                    <motion.circle
                      r="8" fill="#3b82f6"
                      initial={{ cx: HOSTS[0].x, cy: HOSTS[0].y }}
                      animate={{
                        cx: [HOSTS[0].x, SWITCHES[0].x, SWITCHES[2].x, HOSTS[4].x],
                        cy: [HOSTS[0].y, SWITCHES[0].y, SWITCHES[2].y, HOSTS[4].y]
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.5, ease: "easeInOut" }}
                    />
                    <motion.text
                      x={300} y={180}
                      className="text-xs fill-blue-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      命中流表 f2 → 直接转发
                    </motion.text>
                  </>
                )}
              </AnimatePresence>

              {/* ===== 南向接口标签 ===== */}
              {activeLayer === 'southbound' && (
                <motion.text
                  x={CONTROLLERS[0].x} y={CONTROLLERS[0].y + 60}
                  className="text-xs fill-purple-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  textAnchor="middle"
                >
                  OpenFlow 1.3 / NETCONF / P4Runtime
                </motion.text>
              )}

              {/* ===== 北向接口标签 ===== */}
              {activeLayer === 'northbound' && (
                <>
                  {APPS.map((app, i) => (
                    <motion.line
                      key={`nbi-${app.id}`}
                      x1={app.x + 40} y1={app.y + 20}
                      x2={CONTROLLERS[0].x} y2={CONTROLLERS[0].y + 20}
                      stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                    />
                  ))}
                  <motion.text
                    x={300} y={15}
                    className="text-xs fill-blue-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    REST API (JSON/HTTP)
                  </motion.text>
                </>
              )}

              {/* ===== 控制器 ===== */}
              {CONTROLLERS.map(ctrl => (
                <g key={ctrl.id}>
                  <motion.rect
                    x={ctrl.x - 50} y={ctrl.y - 20}
                    width="100" height="50" rx="8"
                    fill={ctrl.color} fillOpacity="0.2"
                    stroke={ctrl.color} strokeWidth="2"
                    animate={{ boxShadow: activeLayer ? `0 0 20px ${ctrl.color}40` : 'none' }}
                  />
                  <Monitor x={ctrl.x - 12} y={ctrl.y - 10} className="w-6 h-6" style={{ color: ctrl.color }} />
                  <text x={ctrl.x} y={ctrl.y + 20} textAnchor="middle" className="text-xs font-bold" fill="white">{ctrl.name}</text>
                  <text x={ctrl.x} y={ctrl.y + 32} textAnchor="middle" className="text-[10px]" fill="#94a3b8">{ctrl.ip}</text>
                </g>
              ))}

              {/* ===== OpenFlow交换机 ===== */}
              {SWITCHES.map((sw, i) => (
                <g key={sw.id}>
                  <motion.rect
                    x={sw.x - 40} y={sw.y - 25}
                    width="80" height="50" rx="6"
                    fill="#1e293b" fillOpacity="0.8"
                    stroke={activeLayer === 'southbound' ? '#8b5cf6' : '#475569'}
                    strokeWidth={activeLayer === 'southbound' ? 2 : 1}
                  />
                  <Router x={sw.x - 10} y={sw.y - 15} className="w-5 h-5 text-emerald-400" />
                  <text x={sw.x} y={sw.y + 8} textAnchor="middle" className="text-xs font-medium" fill="white">{sw.name}</text>
                  <text x={sw.x} y={sw.y + 20} textAnchor="middle" className="text-[10px]" fill="#94a3b8">{sw.ip}</text>

                  {/* 交换机端口标签 */}
                  <text x={sw.x - 45} y={sw.y} className="text-[9px]" fill="#64748b">p1</text>
                  <text x={sw.x} y={sw.y + 35} className="text-[9px]" fill="#64748b">p2</text>
                  <text x={sw.x + 45} y={sw.y} className="text-[9px]" fill="#64748b">p3</text>
                </g>
              ))}

              {/* ===== 主机 ===== */}
              {HOSTS.map((host, i) => (
                <g key={host.id}>
                  <motion.rect
                    x={host.x - 30} y={host.y - 15}
                    width="60" height="30" rx="4"
                    fill="#0f172a" stroke="#334155" strokeWidth="1"
                  />
                  <Server x={host.x - 8} y={host.y - 8} className="w-4 h-4 text-slate-400" />
                  <text x={host.x} y={host.y + 12} textAnchor="middle" className="text-[10px]" fill="#e2e8f0">{host.name}</text>
                  <text x={host.x} y={host.y + 22} textAnchor="middle" className="text-[9px]" fill="#64748b">{host.ip}</text>

                  {/* 连接到交换机 */}
                  {(() => {
                    const sw = getSwitchPos(host.switchId);
                    const swPort = host.switchId === 's1' ? 0 : host.switchId === 's2' ? 1 : 2;
                    return (
                      <motion.line
                        x1={host.x} y1={host.y - 15}
                        x2={sw.x} y2={sw.y + 25}
                        stroke="#334155" strokeWidth="1"
                      />
                    );
                  })()}
                </g>
              ))}

              {/* ===== 图例 ===== */}
              <g transform="translate(620, 360)">
                <text x="0" y="0" className="text-xs fill-slate-500">图例</text>
                <line x1="0" y1="10" x2="30" y2="10" stroke="#8b5cf6" strokeWidth="2" />
                <text x="35" y="14" className="text-[10px]" fill="#64748b">控制通道</text>
                <line x1="0" y1="25" x2="30" y2="25" stroke="#334155" strokeWidth="1" />
                <text x="35" y="29" className="text-[10px]" fill="#64748b">数据通道</text>
                <motion.circle cx="15" cy="40" r="4" fill="#ef4444" />
                <text x="35" y="44" className="text-[10px]" fill="#64748b">Packet-In</text>
                <motion.circle cx="15" cy="52" r="4" fill="#22c55e" />
                <text x="35" y="56" className="text-[10px]" fill="#64748b">Flow-Mod</text>
              </g>
            </svg>
          </div>

          {/* 动画播放器 */}
          <div className="mt-3">
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

        {/* 右侧：信息面板 */}
        <div className="col-span-2 flex flex-col gap-3">
          {/* 流表 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex-1 overflow-auto">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-slate-300">流表 (Flow Table)</span>
            </div>
            <div className="space-y-2">
              {flowTable.map(flow => (
                <motion.div
                  key={flow.id}
                  className="p-2 rounded border text-xs"
                  style={{ borderColor: flow.color + '60', backgroundColor: flow.color + '10' }}
                  animate={flow.hits > 0 ? { scale: [1, 1.02, 1] } : {}}
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-mono font-bold" style={{ color: flow.color }}>{flow.id.toUpperCase()}</span>
                    <span className="text-slate-500">命中: {flow.hits}</span>
                  </div>
                  <div className="text-slate-400 truncate">匹配: {flow.match}</div>
                  <div className="truncate" style={{ color: flow.color }}>→ {flow.action}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* SDN接口 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300">SDN接口体系</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
                <div className="font-medium text-blue-400 mb-0.5">北向接口 (NBI)</div>
                <div className="text-slate-400">REST API (JSON/HTTP)</div>
                <div className="text-slate-500 mt-0.5">控制器 → 应用层</div>
              </div>
              <div className="p-2 rounded bg-purple-500/10 border border-purple-500/30">
                <div className="font-medium text-purple-400 mb-0.5">南向接口 (SBI)</div>
                <div className="text-slate-400">OpenFlow, NETCONF</div>
                <div className="text-slate-500 mt-0.5">控制器 → 交换机</div>
              </div>
              <div className="p-2 rounded bg-orange-500/10 border border-orange-500/30">
                <div className="font-medium text-orange-400 mb-0.5">东西向接口</div>
                <div className="text-slate-400">BGP-LS, XMPP</div>
                <div className="text-slate-500 mt-0.5">控制器 ↔ 控制器</div>
              </div>
            </div>
          </div>

          {/* 交互操作 */}
          <button
            onClick={simulatePacketIn}
            disabled={packetInAnimating || flowModAnimating}
            className="w-full py-2 px-3 bg-yellow-600/80 hover:bg-yellow-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-xs transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3 h-3 ${packetInAnimating ? 'animate-spin' : ''}`} />
            模拟Packet-In流程
          </button>
        </div>
      </div>
    </SceneLayout>
  );
}
