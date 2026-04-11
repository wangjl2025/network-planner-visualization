import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// 类型定义
// ============================================================
interface Parameter {
  id: string;
  name: string;
  type: 'select' | 'toggle' | 'slider';
  value: string | number | boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

interface AnimationStep {
  id: string;
  title: string;
  description: string;
}

// ============================================================
// 常量：STP桥接优先级和MAC地址
// ============================================================
const BRIDGES = [
  { id: 'SW-A', label: 'SW-A', priority: 32768, mac: '00:1A:2B:3C:4D:01', color: '#6366f1', x: 400, y: 80 },
  { id: 'SW-B', label: 'SW-B', priority: 32768, mac: '00:1A:2B:3C:4D:02', color: '#8b5cf6', x: 160, y: 260 },
  { id: 'SW-C', label: 'SW-C', priority: 32768, mac: '00:1A:2B:3C:4D:03', color: '#ec4899', x: 640, y: 260 },
  { id: 'SW-D', label: 'SW-D', priority: 32768, mac: '00:1A:2B:3C:4D:04', color: '#f59e0b', x: 400, y: 420 },
];

const LINKS = [
  { id: 'L1', from: 'SW-A', to: 'SW-B', cost: 4, label: '1G' },
  { id: 'L2', from: 'SW-A', to: 'SW-C', cost: 4, label: '1G' },
  { id: 'L3', from: 'SW-B', to: 'SW-D', cost: 4, label: '1G' },
  { id: 'L4', from: 'SW-C', to: 'SW-D', cost: 4, label: '1G' },
  { id: 'L5', from: 'SW-B', to: 'SW-C', cost: 19, label: '100M' },
];

type PortRole = 'Root' | 'Designated' | 'Blocked' | 'Alternate' | 'Backup' | 'Disabled';
type PortState = 'Forwarding' | 'Blocking' | 'Learning' | 'Listening' | 'Disabled';
type StpMode = 'STP' | 'RSTP' | 'MSTP';

interface PortInfo {
  bridgeId: string;
  linkId: string;
  role: PortRole;
  state: PortState;
  cost: number;
}

interface StpResult {
  rootBridge: string;
  ports: PortInfo[];
  blockedLink: string;
}

// ============================================================
// STP计算逻辑
// ============================================================
function calcSTP(bridges: typeof BRIDGES, links: typeof LINKS, rootOverride?: string): StpResult {
  // 1. 选根桥：优先级最小，相同则MAC最小
  const sorted = [...bridges].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.mac.localeCompare(b.mac);
  });
  const rootBridge = rootOverride || sorted[0].id;

  // 2. 计算每个非根桥到根的最短路径（BFS）
  const rootCost: Record<string, number> = { [rootBridge]: 0 };
  const rootPort: Record<string, string> = {};
  const queue = [rootBridge];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const link of links) {
      let neighbor = '';
      if (link.from === cur) neighbor = link.to;
      else if (link.to === cur) neighbor = link.from;
      if (neighbor && rootCost[neighbor] === undefined) {
        rootCost[neighbor] = rootCost[cur] + link.cost;
        rootPort[neighbor] = link.id;
        queue.push(neighbor);
      }
    }
  }

  // 3. 分配端口角色
  const ports: PortInfo[] = [];
  const designatedLinks = new Set<string>();

  // 根桥所有端口为Designated
  for (const link of links) {
    if (link.from === rootBridge || link.to === rootBridge) {
      designatedLinks.add(link.id);
    }
  }

  // 非根桥：Root Port = 到根路径的端口
  for (const bridge of bridges) {
    if (bridge.id === rootBridge) continue;
    if (rootPort[bridge.id]) {
      designatedLinks.add(rootPort[bridge.id]);
    }
  }

  // 确定阻塞端口：连接两个非根桥且都不是根端口的链路
  const blockedLinks: string[] = [];
  for (const link of links) {
    if (!designatedLinks.has(link.id)) {
      blockedLinks.push(link.id);
    }
  }

  // 生成端口信息
  for (const link of links) {
    const isBlocked = blockedLinks.includes(link.id);
    const isRootPortFrom = rootPort[link.from] === link.id;
    const isRootPortTo = rootPort[link.to] === link.id;

    // from端口
    let fromRole: PortRole = 'Designated';
    if (isBlocked) fromRole = link.from < link.to ? 'Designated' : 'Blocked';
    else if (isRootPortFrom) fromRole = 'Root';
    ports.push({
      bridgeId: link.from,
      linkId: link.id,
      role: fromRole,
      state: isBlocked && fromRole === 'Blocked' ? 'Blocking' : 'Forwarding',
      cost: link.cost,
    });

    // to端口
    let toRole: PortRole = 'Designated';
    if (isBlocked) toRole = link.to < link.from ? 'Designated' : 'Blocked';
    else if (isRootPortTo) toRole = 'Root';
    ports.push({
      bridgeId: link.to,
      linkId: link.id,
      role: toRole,
      state: isBlocked && toRole === 'Blocked' ? 'Blocking' : 'Forwarding',
      cost: link.cost,
    });
  }

  return {
    rootBridge,
    ports,
    blockedLink: blockedLinks[0] || '',
  };
}

// ============================================================
// 主组件
// ============================================================
export default function STPScene() {
  const [mode, setMode] = useState<StpMode>('STP');
  const [rootOverride, setRootOverride] = useState<string>('');
  const [priorityOverrides, setPriorityOverrides] = useState<Record<string, number>>({});
  const [animStep, setAnimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [failedLink, setFailedLink] = useState<string>('');
  const [hoveredBridge, setHoveredBridge] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bridges = BRIDGES.map(b => ({
    ...b,
    priority: priorityOverrides[b.id] ?? b.priority,
  }));

  const stpResult = calcSTP(bridges, LINKS, rootOverride || undefined);

  // 动画步骤定义
  const animSteps: AnimationStep[] = [
    {
      id: 'step1',
      title: '① 初始状态：所有端口发送BPDU',
      description: '网络启动时，所有交换机认为自己是根桥，向所有端口发送BPDU（桥接协议数据单元）。BPDU包含：根桥ID、路径开销、发送桥ID、端口ID。',
    },
    {
      id: 'step2',
      title: '② 选举根桥（Root Bridge）',
      description: '比较所有BPDU中的桥ID（优先级+MAC）：优先级最小者为根桥；优先级相同则MAC地址最小者获胜。当前根桥为 SW-A（优先级32768，MAC最小）。',
    },
    {
      id: 'step3',
      title: '③ 确定根端口（Root Port）',
      description: '每个非根交换机选出一个到根桥路径开销最小的端口作为Root Port。路径开销：1G=4，100M=19，10M=100。每台交换机只有一个Root Port，处于Forwarding状态。',
    },
    {
      id: 'step4',
      title: '④ 选举指定端口（Designated Port）',
      description: '每条链路上选出一个Designated Port：来自根桥路径开销最小的那端。根桥的所有端口均为指定端口。指定端口处于Forwarding状态。',
    },
    {
      id: 'step5',
      title: '⑤ 阻塞多余端口（Blocked Port）',
      description: '非根、非指定的端口进入Blocking状态，不转发数据帧（但仍接收BPDU）。这消除了环路。当前 SW-B↔SW-C 链路上的一个端口被阻塞。',
    },
    {
      id: 'step6',
      title: '⑥ RSTP快速收敛（Proposal/Agreement）',
      description: mode === 'RSTP'
        ? 'RSTP改进：Proposal/Agreement握手机制代替等待计时器（30秒→1秒）。新端口通过与邻居协商立即进入Forwarding状态，不再经历Listening/Learning阶段等待。'
        : 'STP收敛需等待：Blocking(20s) → Listening(15s) → Learning(15s) → Forwarding。总计50秒。切换到RSTP模式可查看快速收敛机制。',
    },
  ];

  // 自动播放
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (animStep < animSteps.length - 1) {
          setAnimStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 2500);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, animStep, animSteps.length]);

  const handlePlay = () => {
    if (animStep >= animSteps.length - 1) setAnimStep(0);
    setIsPlaying(true);
  };

  // 链路故障模拟
  const simulateFailure = (linkId: string) => {
    setFailedLink(linkId);
    setShowFailure(true);
    setTimeout(() => setShowFailure(false), 3000);
  };

  // ---- 画布渲染 ----
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const scaleX = W / 800;
    const scaleY = H / 520;

    // 缩放坐标
    const bPos: Record<string, { x: number; y: number }> = {};
    for (const b of BRIDGES) {
      bPos[b.id] = { x: b.x * scaleX, y: b.y * scaleY };
    }

    // 绘制链路
    for (const link of LINKS) {
      const from = bPos[link.from];
      const to = bPos[link.to];
      const isBlocked = stpResult.blockedLink === link.id;
      const isFailed = failedLink === link.id;
      const isRoot = [
        ...stpResult.ports.filter(p => p.linkId === link.id && p.role === 'Root')
      ].length > 0;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);

      if (isFailed) {
        ctx.strokeStyle = '#6b7280';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
      } else if (isBlocked) {
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([8, 5]);
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = isRoot ? '#10b981' : '#6366f1';
        ctx.setLineDash([]);
        ctx.lineWidth = isRoot ? 4 : 3;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 链路标签
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${11 * Math.min(scaleX, scaleY)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(link.label, mx, my - 6);

      // 阻塞标记
      if (isBlocked && !isFailed) {
        ctx.beginPath();
        ctx.arc(mx, my, 10 * Math.min(scaleX, scaleY), 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${12 * Math.min(scaleX, scaleY)}px sans-serif`;
        ctx.fillText('✕', mx, my + 4);
      }

      // 故障标记
      if (isFailed) {
        ctx.beginPath();
        ctx.arc(mx, my, 10 * Math.min(scaleX, scaleY), 0, Math.PI * 2);
        ctx.fillStyle = '#6b7280';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${10 * Math.min(scaleX, scaleY)}px sans-serif`;
        ctx.fillText('✕', mx, my + 3);
      }
    }

    // 绘制交换机节点
    for (const bridge of BRIDGES) {
      const pos = bPos[bridge.id];
      const isRoot = stpResult.rootBridge === bridge.id;
      const isHovered = hoveredBridge === bridge.id;
      const r = (isRoot ? 40 : 32) * Math.min(scaleX, scaleY);

      // 发光效果
      if (isRoot || isHovered) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = isRoot ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)';
        ctx.fill();
      }

      // 节点圆
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, 0, pos.x, pos.y, r);
      if (isRoot) {
        grad.addColorStop(0, '#34d399');
        grad.addColorStop(1, '#059669');
      } else {
        grad.addColorStop(0, bridge.color + 'cc');
        grad.addColorStop(1, bridge.color);
      }
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = isRoot ? '#10b981' : bridge.color;
      ctx.lineWidth = isRoot ? 3 : 2;
      ctx.stroke();

      // 文字
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${13 * Math.min(scaleX, scaleY)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(bridge.label, pos.x, pos.y - 4);

      // 优先级
      const pri = priorityOverrides[bridge.id] ?? bridge.priority;
      ctx.font = `${10 * Math.min(scaleX, scaleY)}px monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(`P:${pri}`, pos.x, pos.y + 10);

      // 根桥标志
      if (isRoot) {
        ctx.fillStyle = '#fef08a';
        ctx.font = `${11 * Math.min(scaleX, scaleY)}px sans-serif`;
        ctx.fillText('👑 Root', pos.x, pos.y + r + 16);
      }
    }
  }, [stpResult, failedLink, hoveredBridge, priorityOverrides]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        draw();
      }
    });
    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, [draw]);

  // ---- STP收敛时间对比 ----
  const convergenceTime = {
    STP: { total: '30-50秒', steps: ['Blocking 20s', 'Listening 15s', 'Learning 15s', 'Forwarding'] },
    RSTP: { total: '< 1秒', steps: ['P/A握手', '立即 Forwarding'] },
    MSTP: { total: '< 1秒（每实例）', steps: ['多实例VLAN映射', '独立生成树', '负载均衡'] },
  };

  const conv = convergenceTime[mode];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4">
      {/* 顶部标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl">🌲</div>
          <div>
            <h1 className="text-2xl font-bold text-white">STP / RSTP 生成树协议</h1>
            <p className="text-gray-400 text-sm">Spanning Tree Protocol — 消除以太网环路，保证无环拓扑</p>
          </div>
        </div>
        {/* 模式切换 */}
        <div className="flex gap-2 mt-3">
          {(['STP', 'RSTP', 'MSTP'] as StpMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左列：拓扑图 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Canvas拓扑 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">🔗 网络拓扑（点击交换机修改优先级）</h3>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-emerald-500 inline-block"></span>Root Port</span>
                <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-indigo-500 inline-block"></span>Designated</span>
                <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-red-500 inline-block border-dashed border-t-2" style={{borderStyle:'dashed'}}></span>Blocked</span>
              </div>
            </div>
            <div className="relative w-full" style={{ height: '340px' }}>
              <canvas
                ref={canvasRef}
                width={800}
                height={520}
                style={{ width: '100%', height: '100%' }}
                className="rounded-lg"
              />
            </div>
          </div>

          {/* 端口角色表格 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">📋 端口角色与状态</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-2 pr-4">交换机</th>
                    <th className="text-left py-2 pr-4">链路</th>
                    <th className="text-left py-2 pr-4">端口角色</th>
                    <th className="text-left py-2 pr-4">端口状态</th>
                    <th className="text-left py-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {stpResult.ports.map((p, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-1.5 pr-4 font-mono text-gray-300">{p.bridgeId}</td>
                      <td className="py-1.5 pr-4 text-gray-500">{p.linkId}</td>
                      <td className="py-1.5 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.role === 'Root' ? 'bg-emerald-900/50 text-emerald-400' :
                          p.role === 'Designated' ? 'bg-indigo-900/50 text-indigo-400' :
                          p.role === 'Blocked' ? 'bg-red-900/50 text-red-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>{p.role}</span>
                      </td>
                      <td className="py-1.5 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          p.state === 'Forwarding' ? 'text-green-400' :
                          p.state === 'Blocking' ? 'text-red-400' : 'text-yellow-400'
                        }`}>{p.state}</span>
                      </td>
                      <td className="py-1.5 text-gray-400">{p.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 右列：控制面板 + 知识点 */}
        <div className="space-y-4">
          {/* 根桥选举控制 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">⚙️ 根桥选举控制</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">强制指定根桥</label>
                <select
                  value={rootOverride}
                  onChange={e => setRootOverride(e.target.value)}
                  className="w-full bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700"
                >
                  <option value="">自动选举（按桥ID）</option>
                  {BRIDGES.map(b => <option key={b.id} value={b.id}>{b.id}（{b.mac}）</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">调整优先级（越小越优先，步长4096）</label>
                {BRIDGES.map(b => (
                  <div key={b.id} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 w-12">{b.id}</span>
                    <input
                      type="range" min={0} max={61440} step={4096}
                      value={priorityOverrides[b.id] ?? b.priority}
                      onChange={e => setPriorityOverrides(prev => ({ ...prev, [b.id]: Number(e.target.value) }))}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="text-xs text-emerald-400 w-12 text-right">{priorityOverrides[b.id] ?? b.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 故障模拟 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">⚡ 链路故障模拟</h3>
            <div className="grid grid-cols-2 gap-2">
              {LINKS.map(link => (
                <button
                  key={link.id}
                  onClick={() => simulateFailure(link.id)}
                  className="px-3 py-2 bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-600 rounded-lg text-xs text-gray-300 transition-all"
                >
                  断开 {link.from}↔{link.to}
                </button>
              ))}
            </div>
            {showFailure && (
              <div className="mt-3 p-3 bg-amber-900/30 border border-amber-700 rounded-lg text-xs text-amber-300">
                ⚠️ 链路故障！{mode === 'RSTP' ? 'RSTP快速重收敛中（< 1秒）...' : 'STP重新计算中（约30-50秒）...'}
                <br/>阻塞的备份端口将自动恢复为Forwarding状态。
              </div>
            )}
          </div>

          {/* 收敛时间对比 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">⏱️ 收敛时间：{mode}</h3>
            <div className={`text-2xl font-bold mb-2 ${mode === 'STP' ? 'text-red-400' : 'text-emerald-400'}`}>
              {conv.total}
            </div>
            <div className="space-y-1">
              {conv.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${mode === 'STP' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                  <span className="text-gray-400">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 动画步骤 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">📖 生成树计算过程</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setAnimStep(Math.max(0, animStep - 1))}
                  disabled={animStep === 0}
                  className="px-2 py-1 bg-gray-800 rounded text-xs disabled:opacity-30"
                >◀</button>
                <button
                  onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
                  className="px-2 py-1 bg-emerald-700 rounded text-xs"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => setAnimStep(Math.min(animSteps.length - 1, animStep + 1))}
                  disabled={animStep >= animSteps.length - 1}
                  className="px-2 py-1 bg-gray-800 rounded text-xs disabled:opacity-30"
                >▶</button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-2">{animStep + 1} / {animSteps.length}</div>
            <div className="p-3 bg-gray-800/60 rounded-lg">
              <div className="text-emerald-400 font-medium text-xs mb-1">{animSteps[animStep].title}</div>
              <div className="text-gray-300 text-xs leading-relaxed">{animSteps[animStep].description}</div>
            </div>
            {/* 步骤指示点 */}
            <div className="flex gap-1 mt-3 justify-center">
              {animSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setAnimStep(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === animStep ? 'bg-emerald-500 w-4' : 'bg-gray-700 hover:bg-gray-600'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部知识点 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* STP vs RSTP vs MSTP */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">📊 协议版本对比</h4>
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-1">协议</th><th className="text-left py-1">标准</th><th className="text-left py-1">收敛时间</th>
            </tr></thead>
            <tbody className="text-gray-400">
              <tr className={`border-b border-gray-800/50 ${mode === 'STP' ? 'text-white' : ''}`}>
                <td className="py-1.5">STP</td><td>IEEE 802.1D</td><td className="text-red-400">30-50秒</td>
              </tr>
              <tr className={`border-b border-gray-800/50 ${mode === 'RSTP' ? 'text-white' : ''}`}>
                <td className="py-1.5">RSTP</td><td>IEEE 802.1w</td><td className="text-emerald-400">&lt; 1秒</td>
              </tr>
              <tr className={mode === 'MSTP' ? 'text-white' : ''}>
                <td className="py-1.5">MSTP</td><td>IEEE 802.1s</td><td className="text-emerald-400">&lt; 1秒/实例</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 端口角色说明 */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">🔌 端口角色详解（RSTP）</h4>
          <div className="space-y-2 text-xs">
            {[
              { role: 'Root Port', color: 'text-emerald-400', desc: '到根桥路径最短，每台非根桥唯一' },
              { role: 'Designated Port', color: 'text-indigo-400', desc: '每段链路上转发帧的端口' },
              { role: 'Alternate Port', color: 'text-yellow-400', desc: 'RSTP备用根端口，根路径故障时快速切换' },
              { role: 'Backup Port', color: 'text-orange-400', desc: 'RSTP备用指定端口，同网段冗余' },
              { role: 'Disabled Port', color: 'text-gray-500', desc: '管理员手动关闭的端口' },
            ].map(item => (
              <div key={item.role} className="flex items-start gap-2">
                <span className={`${item.color} font-medium w-24 flex-shrink-0`}>{item.role}</span>
                <span className="text-gray-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BPDU格式 */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">📦 BPDU关键字段</h4>
          <div className="space-y-2 text-xs font-mono">
            {[
              { field: 'Root Bridge ID', value: '8字节（优先级+MAC）', color: 'text-yellow-400' },
              { field: 'Root Path Cost', value: '到根桥的累计开销', color: 'text-emerald-400' },
              { field: 'Bridge ID', value: '发送方桥ID', color: 'text-indigo-400' },
              { field: 'Port ID', value: '发送端口（优先级+编号）', color: 'text-purple-400' },
              { field: 'Message Age', value: '消息已存活时间', color: 'text-gray-400' },
              { field: 'Max Age', value: '最大存活时间（20s）', color: 'text-gray-400' },
              { field: 'Hello Time', value: 'BPDU发送间隔（2s）', color: 'text-gray-400' },
              { field: 'Forward Delay', value: '端口状态转换延时（15s）', color: 'text-gray-400' },
            ].map(item => (
              <div key={item.field} className="flex items-start gap-2">
                <span className={`${item.color} w-28 flex-shrink-0`}>{item.field}</span>
                <span className="text-gray-500">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MSTP说明（仅MSTP模式） */}
      {mode === 'MSTP' && (
        <div className="mt-4 bg-gray-900 rounded-xl p-4 border border-purple-800/50">
          <h4 className="text-sm font-semibold text-purple-400 mb-3">🌐 MSTP多生成树协议</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
            <div>
              <div className="font-medium text-purple-300 mb-2">核心概念</div>
              <ul className="space-y-1 list-disc list-inside">
                <li><span className="text-purple-300">MST实例（MSTI）</span>：每个实例对应一组VLAN，独立运行生成树</li>
                <li><span className="text-purple-300">MST区域（Region）</span>：相同名称、版本、VLAN映射的交换机集合</li>
                <li><span className="text-purple-300">CST（公共生成树）</span>：区域间的单一生成树</li>
                <li><span className="text-purple-300">IST（内部生成树）</span>：区域内的生成树（实例0）</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-purple-300 mb-2">负载均衡示例</div>
              <div className="bg-gray-800 rounded p-3 font-mono text-xs">
                <div className="text-purple-300"># VLAN映射到不同实例</div>
                <div>MSTI 1: VLAN 10,20 → SW-A为根</div>
                <div>MSTI 2: VLAN 30,40 → SW-B为根</div>
                <div className="mt-2 text-gray-500"># 不同VLAN流量走不同路径</div>
                <div className="text-gray-500"># 实现链路利用率均衡</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
