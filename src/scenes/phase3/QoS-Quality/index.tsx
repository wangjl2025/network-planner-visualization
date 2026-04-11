import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Play, Pause, ChevronRight, ChevronLeft, RotateCcw, 
  Network, Gauge, Layers, Filter, Shield, AlertTriangle,
  CheckCircle, FileText, ChevronDown, ChevronUp, Info
} from 'lucide-react';

// ============================================================
// 类型与数据
// ============================================================
type QosModel = 'IntServ' | 'DiffServ';
type QueueType = 'FIFO' | 'PQ' | 'WFQ' | 'CBWFQ' | 'LLQ';

interface TrafficFlow {
  id: string;
  name: string;
  type: 'voice' | 'video' | 'business' | 'bulk' | 'default';
  dscp: number;
  dscpName: string;
  priority: number;
  bandwidth: number;
  color: string;
  latencyReq: string;
  description: string;
}

const TRAFFIC_FLOWS: TrafficFlow[] = [
  { id: 'voice', name: 'VoIP语音', type: 'voice', dscp: 46, dscpName: 'EF', priority: 1, bandwidth: 1, color: '#ef4444', latencyReq: '< 150ms', description: '实时语音，不可丢包、超低时延' },
  { id: 'video', name: '视频会议', type: 'video', dscp: 34, dscpName: 'AF41', priority: 2, bandwidth: 5, color: '#f97316', latencyReq: '< 200ms', description: '高清视频，需要稳定带宽' },
  { id: 'business', name: '关键业务', type: 'business', dscp: 26, dscpName: 'AF31', priority: 3, bandwidth: 10, color: '#6366f1', latencyReq: '< 500ms', description: 'ERP/OA等企业核心应用' },
  { id: 'bulk', name: '文件传输', type: 'bulk', dscp: 10, dscpName: 'AF11', priority: 4, bandwidth: 20, color: '#8b5cf6', latencyReq: 'Best Effort', description: '非实时数据传输' },
  { id: 'default', name: '默认流量', type: 'default', dscp: 0, dscpName: 'BE', priority: 5, bandwidth: 14, color: '#64748b', latencyReq: 'Best Effort', description: '未分类/互联网流量' },
];

const QUEUE_DESCRIPTIONS: Record<QueueType, { desc: string; pros: string; cons: string }> = {
  FIFO: { desc: '先进先出，按到达顺序处理', pros: '简单，无配置开销', cons: '高优先级流量无法优先处理，遇到突发时延增大' },
  PQ: { desc: '严格优先队列，高优先级队列先出', pros: '高优先级流量有最低时延', cons: '低优先级队列可能饥饿（被高优先级占满时永远得不到服务）' },
  WFQ: { desc: '加权公平队列，按权重比例分配带宽', pros: '每条流都能公平获得服务，防止饥饿', cons: '不能保证绝对优先，低时延流量无法保证' },
  CBWFQ: { desc: '基于类别的加权公平队列，按业务类型分配', pros: '精细化带宽保障，支持按类配置', cons: '配置复杂，需配合策略路由' },
  LLQ: { desc: 'CBWFQ + 严格优先队列（LLQ=CBWFQ+PQ）', pros: '最推荐：语音走PQ，其他走CBWFQ，两者兼顾', cons: '配置最复杂，需合理规划优先级带宽比例' },
};

const DSCP_TABLE = [
  { name: 'CS0/BE', value: 0, ph: '0b000 000', use: '默认，Best Effort' },
  { name: 'AF11', value: 10, ph: '0b001 010', use: '低优先级数据（金融行情）' },
  { name: 'AF21', value: 18, ph: '0b010 010', use: '标准数据' },
  { name: 'AF31', value: 26, ph: '0b011 010', use: '关键业务数据' },
  { name: 'AF41', value: 34, ph: '0b100 010', use: '视频会议/流媒体' },
  { name: 'CS5', value: 40, ph: '0b101 000', use: '语音信令' },
  { name: 'EF', value: 46, ph: '0b101 110', use: 'VoIP语音（最高实时优先）' },
  { name: 'CS6', value: 48, ph: '0b110 000', use: '网络控制（OSPF/BGP）' },
  { name: 'CS7', value: 56, ph: '0b111 000', use: '保留（最高控制平面）' },
];

const examPoints = [
  {
    title: 'QoS核心概念',
    points: [
      'QoS目标：带宽、时延、抖动、丢包率四个指标',
      'QoS必要性：网络拥塞时保障关键业务质量',
      'QoS三要素：分类标记、队列调度、拥塞避免',
      'IntServ vs DiffServ：流状态 vs 每跳行为'
    ]
  },
  {
    title: 'DSCP与PHB',
    points: [
      'DSCP：IP头部ToS字段的6位（0-63）',
      'EF（46）：加速转发，用于VoIP语音',
      'AFxy：确保转发，x=优先级(1-4)，y=丢弃优先级(1-3)',
      'BE（0）：尽力而为，默认流量',
      'PHB：每跳行为，路由器根据DSCP执行的动作'
    ]
  },
  {
    title: '队列调度算法',
    points: [
      'FIFO：简单，但无优先级区分',
      'PQ：严格优先，低优先级可能饥饿',
      'WFQ：加权公平，按权重分配带宽',
      'CBWFQ：基于类别的WFQ，精细化控制',
      'LLQ：PQ+CBWFQ，企业网推荐方案'
    ]
  },
  {
    title: '流量整形与监管',
    points: [
      'Shaping（整形）：超出限速时缓存延迟发送，流量平滑',
      'Policing（监管）：超出限速时直接丢包或降级标记',
      '令牌桶算法：CIR/PIR、CBS/PBS、Tc/Te',
      '整形适合入向，监管适合出向/运营商'
    ]
  }
];

// ============================================================
// 队列可视化组件
// ============================================================
function QueueViz({ queueType, flows }: { queueType: QueueType; flows: TrafficFlow[] }) {
  const queues: { label: string; color: string; items: TrafficFlow[] }[] = [];

  if (queueType === 'FIFO') {
    queues.push({ label: 'FIFO队列', color: '#64748b', items: [...flows].reverse() });
  } else if (queueType === 'PQ') {
    queues.push({ label: '高优先（P1）', color: '#ef4444', items: [flows[0]] });
    queues.push({ label: '中优先（P2）', color: '#f97316', items: [flows[1]] });
    queues.push({ label: '低优先（P3）', color: '#6366f1', items: [flows[2], flows[3]] });
    queues.push({ label: '默认（P4）', color: '#64748b', items: [flows[4]] });
  } else if (queueType === 'LLQ') {
    queues.push({ label: '🔴 PQ严格优先（语音）', color: '#ef4444', items: [flows[0]] });
    queues.push({ label: '🟠 CBWFQ-视频 15%', color: '#f97316', items: [flows[1]] });
    queues.push({ label: '🟣 CBWFQ-业务 30%', color: '#6366f1', items: [flows[2]] });
    queues.push({ label: '🟤 CBWFQ-传输 20%', color: '#8b5cf6', items: [flows[3]] });
    queues.push({ label: '⚫ 默认 35%', color: '#64748b', items: [flows[4]] });
  } else {
    flows.forEach(f => {
      queues.push({ label: `类${f.priority}: ${f.name}`, color: f.color, items: [f] });
    });
  }

  return (
    <div className="space-y-2">
      {queues.map((q, qi) => (
        <div key={qi} className="flex items-center gap-2">
          <div className="text-xs text-gray-500 w-44 flex-shrink-0">{q.label}</div>
          <div className="flex-1 flex gap-1 items-center">
            {q.items.map(item => (
              <div key={item.id} className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ background: item.color + '22', border: `1px solid ${item.color}66` }}>
                <span style={{ color: item.color }}>{item.name}</span>
                <span className="text-gray-600">{item.bandwidth}M</span>
              </div>
            ))}
          </div>
          {qi === 0 && queueType === 'LLQ' && (
            <span className="text-xs text-red-400 ml-2">← 最先出队</span>
          )}
        </div>
      ))}
      <div className="flex justify-end mt-2">
        <div className="text-xs text-blue-400">→ 出口链路</div>
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================
export default function QoSScene() {
  const [model, setModel] = useState<QosModel>('DiffServ');
  const [queueType, setQueueType] = useState<QueueType>('LLQ');
  const [selectedFlow, setSelectedFlow] = useState<string>('voice');
  const [congestion, setCongestion] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showExamPoints, setShowExamPoints] = useState(false);
  const [showTokenBucket, setShowTokenBucket] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flow = TRAFFIC_FLOWS.find(f => f.id === selectedFlow)!;
  const qDesc = QUEUE_DESCRIPTIONS[queueType];

  const animSteps = [
    { title: '① QoS为什么必要？', desc: '网络共享时，所有流量竞争同一出口链路。当流量超过带宽（拥塞），路由器默认FIFO丢包——语音、视频和文件备份被同等对待，实时业务质量严重下降。QoS通过分类、标记、排队、整形来差异化保障。' },
    { title: '② 流量分类与标记（Classification/Marking）', desc: '在网络入口对流量打标记：DiffServ使用IP头部DSCP字段（6位，64个值）；IntServ使用RSVP预留资源。标记一次，网络内所有设备据此处理。VoIP标记EF(46)，视频AF41(34)，默认BE(0)。' },
    { title: '③ 队列调度（Queuing/Scheduling）', desc: '出口有队列时，调度算法决定先发哪个包：FIFO无差别；PQ严格优先但低优先级可能饥饿；WFQ按权重公平；CBWFQ按类别分配带宽；LLQ=PQ+CBWFQ，是企业网推荐方案。' },
    { title: '④ 流量整形与监管（Shaping/Policing）', desc: '整形（Shaping）：超出限速时将流量放入缓冲区延迟发送，流量平滑，适合入向对SLA敏感的流量。监管（Policing）：超出限速直接丢包或降级DSCP标记，适合运营商强制执行用户SLA。' },
    { title: '⑤ 拥塞避免（RED/WRED）', desc: 'TCP流量在拥塞时才反应。RED(随机早期检测)在队列快满时随机丢弃低优先级包，提前触发TCP退避，防止队列满溢（尾丢弃）造成全局同步。WRED按DSCP优先级差异化丢弃概率。' },
    { title: '⑥ IntServ vs DiffServ', desc: 'IntServ：每条流用RSVP预留资源，可保证绝对QoS，但路由器需维护每流状态，不可扩展（适合企业小规模）。DiffServ：仅标记DSCP，路由器按PHB(每跳行为)处理，无流状态，可扩展（适合骨干网）。' },
  ];

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (animStep < animSteps.length - 1) setAnimStep(p => p + 1);
        else setIsPlaying(false);
      }, 2800);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, animStep, animSteps.length]);

  // Canvas：流量管道可视化
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const sx = W / 700, sy = H / 200;

    const pipeY = 100 * sy;
    const pipeH = 40 * sy;

    ctx.beginPath();
    ctx.rect(0, pipeY - pipeH / 2, W, pipeH);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    let x = 40 * sx;
    const now = Date.now() / 1000;
    for (const f of TRAFFIC_FLOWS) {
      const pkts = Math.max(1, Math.round(f.bandwidth / 3));
      for (let i = 0; i < pkts; i++) {
        const px = (x + (Math.sin(now * 2 + i * 1.3) * 10)) * 1;
        const py = pipeY + (Math.sin(now + i * 0.7) * (pipeH * 0.3));
        ctx.beginPath();
        ctx.rect(px, py - 6 * sy, 14 * sx, 12 * sy);
        ctx.fillStyle = f.color + (congestion && f.type !== 'voice' && f.type !== 'video' ? '44' : 'cc');
        ctx.fill();
        x += 18 * sx;
      }
      x += 10 * sx;
    }

    if (congestion) {
      ctx.beginPath();
      ctx.rect(300 * sx, pipeY - pipeH * 0.6, 80 * sx, pipeH * 1.2);
      ctx.fillStyle = 'rgba(239,68,68,0.1)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${11 * Math.min(sx, sy)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚠ 拥塞', 340 * sx, pipeY - pipeH * 0.7);
    }

    ctx.fillStyle = '#475569';
    ctx.font = `${10 * Math.min(sx, sy)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('← 入口方向', 8, pipeY - pipeH * 0.6);
    ctx.textAlign = 'right';
    ctx.fillText('出口 →', W - 8, pipeY - pipeH * 0.6);
  }, [congestion]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const id = setInterval(() => draw(), 80);
    return () => clearInterval(id);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const p = canvas.parentElement;
      if (p) { canvas.width = p.clientWidth; canvas.height = p.clientHeight; draw(); }
    });
    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, [draw]);

  const configs: Record<string, string> = {
    DiffServ: `! DiffServ策略配置（Cisco IOS）

! 1. 定义类（分类）
class-map match-any VOICE
  match dscp ef
class-map match-any VIDEO
  match dscp af41
class-map match-any BUSINESS
  match dscp af31

! 2. 定义策略（调度/带宽）
policy-map LLQ-POLICY
  class VOICE
    priority 2000 kbps    ! 严格优先队列
  class VIDEO
    bandwidth percent 15   ! 保证15%带宽
  class BUSINESS
    bandwidth percent 30   ! 保证30%带宽
  class class-default
    fair-queue             ! 其余公平排队

! 3. 应用到接口
interface GigabitEthernet0/0
  service-policy output LLQ-POLICY`,

    IntServ: `! IntServ RSVP配置（Cisco IOS）

! 1. 启用RSVP
interface GigabitEthernet0/0
  ip rsvp bandwidth 10000   ! 可预留总带宽10Mbps

! 2. 发送RSVP PATH消息（发送方触发）
ip rsvp sender 192.168.1.1 192.168.2.1 UDP 5004 5004 \\
  192.168.1.1 GigabitEthernet0/0 1000 1500

! 3. 验证
show ip rsvp installed
show ip rsvp sender
show ip rsvp reservation`,
  };

  const scene = {
    id: 'qos-quality',
    title: 'QoS服务质量',
    description: 'IntServ/DiffServ、队列调度、流量整形、拥塞避免',
    phase: 3 as const,
    category: 'QoS',
    difficulty: 'hard' as const,
    duration: '15-20分钟',
  };

  return (
    <SceneLayout scene={scene}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 顶部模型切换 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Gauge className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">QoS 服务质量</h1>
                <p className="text-gray-500 text-sm">IntServ · DiffServ · 队列调度 · 流量整形 · 拥塞避免</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(['IntServ', 'DiffServ'] as QosModel[]).map(m => (
                <button 
                  key={m} 
                  onClick={() => setModel(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${model === m ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 流量管道 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-500" />
                  流量管道可视化
                </h3>
                <button 
                  onClick={() => setCongestion(!congestion)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${congestion ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {congestion ? '⚠️ 拥塞中' : '模拟拥塞'}
                </button>
              </div>
              <div className="relative w-full bg-gray-900 rounded-xl overflow-hidden" style={{ height: '140px' }}>
                <canvas ref={canvasRef} width={700} height={200} style={{ width: '100%', height: '100%' }} />
              </div>
              <div className="flex gap-3 mt-4 flex-wrap">
                {TRAFFIC_FLOWS.map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => setSelectedFlow(f.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${selectedFlow === f.id ? 'ring-2 ring-purple-500' : ''}`}
                    style={{ background: f.color + '15', border: `1px solid ${f.color}40` }}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ background: f.color }}></span>
                    <span className="font-medium" style={{ color: f.color }}>{f.name}</span>
                    <span className="text-gray-500 text-xs">DSCP:{f.dscp}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 选中流量详情 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-500" />
                流量详情：{flow.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'DSCP值', value: flow.dscp, color: flow.color },
                  { label: 'PHB名称', value: flow.dscpName, color: flow.color },
                  { label: '带宽占用', value: `${flow.bandwidth} Mbps`, color: '#64748b' },
                  { label: '时延要求', value: flow.latencyReq, color: flow.latencyReq.includes('<') ? '#22c55e' : '#64748b' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                    <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <Info className="w-4 h-4 inline mr-1" />
                  {flow.description}
                </p>
              </div>
            </div>

            {/* 队列调度 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                队列调度算法
              </h3>
              <div className="flex gap-2 mb-6 flex-wrap">
                {(['FIFO', 'PQ', 'WFQ', 'CBWFQ', 'LLQ'] as QueueType[]).map(q => (
                  <button 
                    key={q} 
                    onClick={() => setQueueType(q)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${queueType === q ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {q}{q === 'LLQ' ? ' ✅推荐' : ''}
                  </button>
                ))}
              </div>
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <QueueViz queueType={queueType} flows={TRAFFIC_FLOWS} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <div className="text-purple-700 font-bold mb-2">{queueType} 简介</div>
                  <div className="text-gray-600 text-sm">{qDesc.desc}</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="text-green-700 font-bold mb-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> 优点
                  </div>
                  <div className="text-gray-600 text-sm">{qDesc.pros}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="text-red-700 font-bold mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> 缺点
                  </div>
                  <div className="text-gray-600 text-sm">{qDesc.cons}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧 */}
          <div className="space-y-6">
            {/* 学习步骤 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">学习步骤</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setAnimStep(Math.max(0, animStep - 1))} 
                    disabled={animStep === 0} 
                    className="p-2 bg-gray-100 rounded-lg disabled:opacity-30 hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={isPlaying ? () => setIsPlaying(false) : () => { if (animStep >= animSteps.length - 1) setAnimStep(0); setIsPlaying(true); }} 
                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => setAnimStep(Math.min(animSteps.length - 1, animStep + 1))} 
                    disabled={animStep >= animSteps.length - 1} 
                    className="p-2 bg-gray-100 rounded-lg disabled:opacity-30 hover:bg-gray-200 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-purple-700 font-bold mb-2">{animSteps[animStep].title}</div>
                <div className="text-gray-700 text-sm leading-relaxed">{animSteps[animStep].desc}</div>
              </div>
              <div className="flex gap-2 mt-4 justify-center">
                {animSteps.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setAnimStep(i)} 
                    className={`h-2 rounded-full transition-all ${i === animStep ? 'bg-purple-600 w-6' : 'bg-gray-300 w-2'}`} 
                  />
                ))}
              </div>
            </div>

            {/* DSCP值表 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">DSCP标记值表</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-200">
                      <th className="text-left py-2">名称</th>
                      <th className="text-left py-2">值</th>
                      <th className="text-left py-2">用途</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DSCP_TABLE.map(d => {
                      const matchFlow = TRAFFIC_FLOWS.find(f => f.dscp === d.value);
                      return (
                        <tr key={d.value} className={`border-b border-gray-100 ${matchFlow ? 'bg-purple-50' : ''}`}>
                          <td className="py-2 font-mono font-medium" style={{ color: matchFlow?.color || '#64748b' }}>{d.name}</td>
                          <td className="py-2 text-gray-500">{d.value}</td>
                          <td className="py-2 text-gray-500 text-xs">{d.use}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 配置代码 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">{model} 配置示例</h3>
              <pre className="bg-gray-900 rounded-xl p-4 text-xs text-green-400 overflow-x-auto font-mono leading-relaxed whitespace-pre" style={{ maxHeight: 280 }}>
                {configs[model]}
              </pre>
            </div>

            {/* 令牌桶算法 */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => setShowTokenBucket(!showTokenBucket)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-gray-800">令牌桶算法</span>
                </div>
                {showTokenBucket ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
              </button>
              <AnimatePresence>
                {showTokenBucket && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-amber-50 rounded-lg p-3">
                          <div className="font-bold text-amber-800 mb-1">CIR</div>
                          <div className="text-gray-600">承诺信息速率</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                          <div className="font-bold text-amber-800 mb-1">CBS</div>
                          <div className="text-gray-600">承诺突发尺寸</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                          <div className="font-bold text-amber-800 mb-1">PIR</div>
                          <div className="text-gray-600">峰值信息速率</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                          <div className="font-bold text-amber-800 mb-1">PBS</div>
                          <div className="text-gray-600">峰值突发尺寸</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        令牌桶以CIR速率产生令牌，数据包需要消耗令牌才能通过。令牌充足时正常转发，不足时进入队列或丢弃。
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* IntServ vs DiffServ对比 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all ${model === 'IntServ' ? 'border-purple-500' : 'border-transparent'}`}>
            <h4 className="font-bold text-purple-700 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              IntServ（综合服务）
            </h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">协议：</span>
                <span>RSVP（资源预留协议）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">机制：</span>
                <span>每条流单独预留资源，路径上每台路由器维护流状态</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">保证：</span>
                <span>可提供绝对QoS保证（Guaranteed Service）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">扩展性：</span>
                <span className="text-red-600">❌ 差，流量越多路由器状态越多，不适合大规模网络</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">适用：</span>
                <span>企业内部小规模、对QoS要求极严的场景</span>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all ${model === 'DiffServ' ? 'border-purple-500' : 'border-transparent'}`}>
            <h4 className="font-bold text-purple-700 mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              DiffServ（差分服务）
            </h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">机制：</span>
                <span>在IP头部DSCP字段打标记（6位，64种行为）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">处理：</span>
                <span>路由器按PHB（每跳行为）处理，无需维护流状态</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">保证：</span>
                <span>提供相对QoS（优先级保障），非绝对</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">扩展性：</span>
                <span className="text-green-600">✅ 强，适合运营商骨干网和大型企业网</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">适用：</span>
                <span>企业园区网、骨干网、互联网，目前主流方案</span>
              </div>
            </div>
          </div>
        </div>

        {/* 考试要点折叠面板 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => setShowExamPoints(!showExamPoints)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-800">考试要点总结</h4>
                <p className="text-sm text-gray-600">QoS高频考点与易错点</p>
              </div>
            </div>
            {showExamPoints ? <ChevronUp className="w-6 h-6 text-gray-600" /> : <ChevronDown className="w-6 h-6 text-gray-600" />}
          </button>
          
          <AnimatePresence>
            {showExamPoints && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {examPoints.map((section, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-5">
                      <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm">
                          {index + 1}
                        </span>
                        {section.title}
                      </h5>
                      <ul className="space-y-2">
                        {section.points.map((point, pIndex) => (
                          <li key={pIndex} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SceneLayout>
  );
}
