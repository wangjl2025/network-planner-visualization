import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// 类型定义
// ============================================================
type PortMode = 'Access' | 'Trunk' | 'Hybrid';
type VtpMode = 'Server' | 'Client' | 'Transparent';
type RoutingMode = 'none' | 'router-on-stick' | 'l3-switch';

interface VlanDef {
  id: number;
  name: string;
  color: string;
  subnet: string;
}

interface PortConfig {
  id: string;
  switchId: string;
  label: string;
  mode: PortMode;
  accessVlan?: number;
  allowedVlans?: number[];
  nativeVlan?: number;
}

interface SwitchDef {
  id: string;
  label: string;
  x: number;
  y: number;
  vtpMode: VtpMode;
  layer: 3 | 2;
}

// ============================================================
// 数据定义
// ============================================================
const VLANS: VlanDef[] = [
  { id: 10, name: 'VLAN10-办公', color: '#6366f1', subnet: '192.168.10.0/24' },
  { id: 20, name: 'VLAN20-研发', color: '#ec4899', subnet: '192.168.20.0/24' },
  { id: 30, name: 'VLAN30-运维', color: '#f59e0b', subnet: '192.168.30.0/24' },
  { id: 99, name: 'VLAN99-管理', color: '#10b981', subnet: '192.168.99.0/24' },
];

const SWITCHES: SwitchDef[] = [
  { id: 'CORE', label: '核心交换机\n(三层)', x: 400, y: 70, vtpMode: 'Server', layer: 3 },
  { id: 'ACC-A', label: '接入交换机A\n(二层)', x: 160, y: 240, vtpMode: 'Client', layer: 2 },
  { id: 'ACC-B', label: '接入交换机B\n(二层)', x: 640, y: 240, vtpMode: 'Client', layer: 2 },
];

const INITIAL_PORTS: PortConfig[] = [
  // 核心到接入A - Trunk
  { id: 'CORE-to-A', switchId: 'CORE', label: 'Gi0/1', mode: 'Trunk', allowedVlans: [10, 20, 30, 99], nativeVlan: 99 },
  { id: 'A-to-CORE', switchId: 'ACC-A', label: 'Gi0/1 (Up)', mode: 'Trunk', allowedVlans: [10, 20, 30, 99], nativeVlan: 99 },
  // 核心到接入B - Trunk
  { id: 'CORE-to-B', switchId: 'CORE', label: 'Gi0/2', mode: 'Trunk', allowedVlans: [10, 20, 30, 99], nativeVlan: 99 },
  { id: 'B-to-CORE', switchId: 'ACC-B', label: 'Gi0/1 (Up)', mode: 'Trunk', allowedVlans: [10, 20, 30, 99], nativeVlan: 99 },
  // 接入A端口
  { id: 'A-PC1', switchId: 'ACC-A', label: 'Fa0/1', mode: 'Access', accessVlan: 10 },
  { id: 'A-PC2', switchId: 'ACC-A', label: 'Fa0/2', mode: 'Access', accessVlan: 20 },
  { id: 'A-PC3', switchId: 'ACC-A', label: 'Fa0/3', mode: 'Access', accessVlan: 30 },
  // 接入B端口
  { id: 'B-PC1', switchId: 'ACC-B', label: 'Fa0/1', mode: 'Access', accessVlan: 10 },
  { id: 'B-PC2', switchId: 'ACC-B', label: 'Fa0/2', mode: 'Access', accessVlan: 20 },
  { id: 'B-Server', switchId: 'ACC-B', label: 'Fa0/10', mode: 'Access', accessVlan: 30 },
];

const LINKS = [
  { id: 'L-CORE-A', from: 'CORE', to: 'ACC-A' },
  { id: 'L-CORE-B', from: 'CORE', to: 'ACC-B' },
];

// ============================================================
// 802.1Q帧格式组件
// ============================================================
function FrameVisualization({ vlanId, color }: { vlanId: number; color: string }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0 min-w-max text-center text-xs font-mono">
        {[
          { label: '目标MAC', size: 64, color: '#374151' },
          { label: '源MAC', size: 64, color: '#374151' },
          { label: '802.1Q Tag\n(4字节)', size: 72, color: color + 'cc', border: true },
          { label: '类型/长度', size: 36, color: '#374151' },
          { label: '数据载荷', size: 80, color: '#1e293b' },
          { label: 'FCS', size: 28, color: '#374151' },
        ].map((f, i) => (
          <div
            key={i}
            style={{ width: f.size, background: f.color, border: f.border ? `2px solid ${color}` : '1px solid #374151' }}
            className="py-2 px-1 flex flex-col items-center justify-center"
          >
            <span className="text-gray-300 whitespace-pre-wrap text-center leading-tight" style={{ fontSize: 9 }}>
              {f.label}
            </span>
          </div>
        ))}
      </div>
      {/* 802.1Q Tag展开 */}
      <div className="mt-2 flex gap-0 min-w-max" style={{ marginLeft: 128 }}>
        {[
          { label: 'TPID\n0x8100', size: 18, color: color + '33' },
          { label: 'PCP\n3bit', size: 18, color: color + '44' },
          { label: 'DEI\n1bit', size: 9, color: color + '44' },
          { label: `VID\n${vlanId}`, size: 27, color: color + '88', bold: true },
        ].map((f, i) => (
          <div
            key={i}
            style={{ width: f.size * 4, background: f.color, border: `1px solid ${color}66` }}
            className="py-1 text-center"
          >
            <span className="text-gray-200 whitespace-pre-wrap" style={{ fontSize: 9, fontWeight: f.bold ? 'bold' : 'normal' }}>
              {f.label}
            </span>
          </div>
        ))}
        <div className="ml-2 flex items-center text-xs text-gray-500">← 802.1Q VLAN Tag (4字节)</div>
      </div>
    </div>
  );
}

// ============================================================
// 数据包动画
// ============================================================
function PacketAnimation({ srcVlan, dstVlan, routingMode }: { srcVlan: number; dstVlan: number; routingMode: RoutingMode }) {
  const sameVlan = srcVlan === dstVlan;
  const vlan = VLANS.find(v => v.id === srcVlan)!;
  const dstVlanObj = VLANS.find(v => v.id === dstVlan);

  return (
    <div className="bg-gray-800/60 rounded-lg p-3 text-xs">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ background: vlan?.color }}></div>
        <span className="text-gray-300">PC(VLAN{srcVlan}) → </span>
        {sameVlan ? (
          <span className="text-green-400">PC(VLAN{dstVlan}) ✅ 直接转发</span>
        ) : (
          <span className={routingMode !== 'none' ? 'text-blue-400' : 'text-red-400'}>
            PC(VLAN{dstVlan}) {routingMode !== 'none' ? '🔀 三层路由' : '🚫 无法通信（需要路由）'}
          </span>
        )}
      </div>
      {!sameVlan && routingMode !== 'none' && (
        <div className="text-gray-500 mt-1">
          路径: VLAN{srcVlan}({vlan?.subnet?.split('/')[0]}网段) →
          {routingMode === 'router-on-stick' ? ' 子接口路由 →' : ' SVI接口路由 →'}
          VLAN{dstVlan}({dstVlanObj?.subnet?.split('/')[0]}网段)
        </div>
      )}
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================
export default function VLANScene() {
  const [routingMode, setRoutingMode] = useState<RoutingMode>('l3-switch');
  const [selectedVlan, setSelectedVlan] = useState<number>(10);
  const [simSrcVlan, setSimSrcVlan] = useState<number>(10);
  const [simDstVlan, setSimDstVlan] = useState<number>(20);
  const [animStep, setAnimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfig, setShowConfig] = useState<'access' | 'trunk' | 'svi' | 'vtp'>('trunk');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const animSteps = [
    {
      title: '① VLAN概念：二层广播域隔离',
      desc: 'VLAN（Virtual LAN）在一台物理交换机上逻辑划分多个广播域。不同VLAN间流量互相隔离，等价于物理上接不同交换机。IEEE 802.1Q定义了VLAN标签格式。',
    },
    {
      title: '② Access端口：连接终端设备',
      desc: 'Access端口属于特定VLAN，发出帧时剥离Tag（终端看不到Tag），收到无Tag帧时打上所属VLAN的Tag。适合连接PC、服务器、IP电话等终端设备。',
    },
    {
      title: '③ Trunk端口：连接交换机/路由器',
      desc: 'Trunk端口可承载多个VLAN的流量。帧在Trunk上传输时携带802.1Q Tag（4字节）标识所属VLAN。Native VLAN的帧不打Tag，默认为VLAN 1。',
    },
    {
      title: '④ VTP协议：VLAN信息同步',
      desc: 'VTP（VLAN Trunking Protocol，Cisco私有）自动在交换机间同步VLAN数据库。Server模式可创建/删除VLAN；Client模式只接收；Transparent模式不参与同步。',
    },
    {
      title: '⑤ Inter-VLAN路由：单臂路由',
      desc: '路由器通过一个物理接口的多个子接口（Sub-Interface）实现VLAN间路由。每个子接口封装一个VLAN的Tag，配置IP作为该VLAN网关。链路为瓶颈。',
    },
    {
      title: '⑥ Inter-VLAN路由：三层交换SVI',
      desc: '三层交换机通过SVI（Switched Virtual Interface）为每个VLAN创建虚拟三层接口，实现VLAN间线速路由，性能远优于单臂路由，是企业网主流方案。',
    },
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

  // ---- Canvas绘制 ----
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const sx = W / 800, sy = H / 420;

    const swPos: Record<string, { x: number; y: number }> = {};
    for (const sw of SWITCHES) swPos[sw.id] = { x: sw.x * sx, y: sw.y * sy };

    // 绘制Trunk链路（彩色多条）
    for (const link of LINKS) {
      const from = swPos[link.from], to = swPos[link.to];
      const vlanColors = VLANS.map(v => v.color);
      const offsets = [-4.5, -1.5, 1.5, 4.5];
      for (let i = 0; i < 4; i++) {
        const dx = to.y - from.y, dy = from.x - to.x;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ox = (dx / len) * offsets[i] * sx, oy = (dy / len) * offsets[i] * sy;
        ctx.beginPath();
        ctx.moveTo(from.x + ox, from.y + oy);
        ctx.lineTo(to.x + ox, to.y + oy);
        ctx.strokeStyle = vlanColors[i];
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Trunk标签
      const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
      ctx.fillStyle = '#94a3b8'; ctx.font = `${10 * Math.min(sx, sy)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.fillText('Trunk', mx + 18 * sx, my);
    }

    // 终端设备（PC）
    const endpoints = [
      { id: 'PC1-A', label: 'PC1', vlan: 10, x: 60, y: 380 },
      { id: 'PC2-A', label: 'PC2', vlan: 20, x: 160, y: 380 },
      { id: 'PC3-A', label: 'PC3', vlan: 30, x: 260, y: 380 },
      { id: 'PC1-B', label: 'PC4', vlan: 10, x: 540, y: 380 },
      { id: 'PC2-B', label: 'PC5', vlan: 20, x: 640, y: 380 },
      { id: 'Server', label: 'SRV', vlan: 30, x: 740, y: 380 },
    ];
    const epSwitch: Record<string, string> = {
      'PC1-A': 'ACC-A', 'PC2-A': 'ACC-A', 'PC3-A': 'ACC-A',
      'PC1-B': 'ACC-B', 'PC2-B': 'ACC-B', 'Server': 'ACC-B',
    };

    for (const ep of endpoints) {
      const epPos = { x: ep.x * sx, y: ep.y * sy };
      const swId = epSwitch[ep.id];
      const swP = swPos[swId];
      const vlanColor = VLANS.find(v => v.id === ep.vlan)?.color || '#666';
      const isSelected = ep.vlan === selectedVlan;

      // 连线
      ctx.beginPath();
      ctx.moveTo(swP.x, swP.y);
      ctx.lineTo(epPos.x, epPos.y);
      ctx.strokeStyle = isSelected ? vlanColor : '#374151';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // PC图标
      ctx.beginPath();
      ctx.rect(epPos.x - 16 * sx, epPos.y - 12 * sy, 32 * sx, 22 * sy);
      ctx.fillStyle = isSelected ? vlanColor + '33' : '#1e293b';
      ctx.fill();
      ctx.strokeStyle = isSelected ? vlanColor : '#374151';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = isSelected ? vlanColor : '#94a3b8';
      ctx.font = `bold ${10 * Math.min(sx, sy)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ep.label, epPos.x, epPos.y + 3);
      ctx.font = `${9 * Math.min(sx, sy)}px monospace`;
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`V${ep.vlan}`, epPos.x, epPos.y + 20 * sy);
    }

    // 交换机节点
    for (const sw of SWITCHES) {
      const pos = swPos[sw.id];
      const r = 36 * Math.min(sx, sy);
      ctx.beginPath();
      ctx.roundRect(pos.x - 50 * sx, pos.y - 28 * sy, 100 * sx, 56 * sy, 8);
      ctx.fillStyle = sw.layer === 3 ? '#1e3a5f' : '#1e2d40';
      ctx.fill();
      ctx.strokeStyle = sw.layer === 3 ? '#3b82f6' : '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0'; ctx.font = `bold ${11 * Math.min(sx, sy)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(sw.label.split('\n')[0], pos.x, pos.y - 8 * sy);
      ctx.fillStyle = sw.layer === 3 ? '#93c5fd' : '#94a3b8';
      ctx.font = `${9 * Math.min(sx, sy)}px sans-serif`;
      ctx.fillText(sw.label.split('\n')[1], pos.x, pos.y + 8 * sy);
      ctx.fillStyle = '#64748b'; ctx.font = `${9 * Math.min(sx, sy)}px monospace`;
      ctx.fillText(`VTP:${sw.vtpMode}`, pos.x, pos.y + 20 * sy);
    }

    // 路由器单臂路由（可选）
    if (routingMode === 'router-on-stick') {
      const routerX = 400 * sx, routerY = 180 * sy;
      ctx.beginPath();
      ctx.arc(routerX, routerY, 20 * Math.min(sx, sy), 0, Math.PI * 2);
      ctx.fillStyle = '#166534';
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${10 * Math.min(sx, sy)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('R', routerX, routerY + 4);
      ctx.fillStyle = '#22c55e'; ctx.font = `${9 * Math.min(sx, sy)}px sans-serif`;
      ctx.fillText('单臂路由', routerX, routerY + 28 * sy);

      ctx.beginPath();
      ctx.moveTo(swPos['CORE'].x, swPos['CORE'].y);
      ctx.lineTo(routerX, routerY);
      ctx.strokeStyle = '#22c55e'; ctx.setLineDash([4, 3]); ctx.lineWidth = 2;
      ctx.stroke(); ctx.setLineDash([]);
    }
  }, [selectedVlan, routingMode]);

  useEffect(() => { draw(); }, [draw]);

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

  // 配置代码模板
  const configTemplates: Record<typeof showConfig, string> = {
    access: `! Access端口配置（连接PC/服务器）
interface FastEthernet0/1
  switchport mode access
  switchport access vlan 10
  spanning-tree portfast    ! 快速进入转发
  no shutdown

! 验证
show vlan brief
show interfaces fa0/1 switchport`,

    trunk: `! Trunk端口配置（连接交换机）
interface GigabitEthernet0/1
  switchport trunk encapsulation dot1q   ! 必须先指定封装
  switchport mode trunk
  switchport trunk allowed vlan 10,20,30,99
  switchport trunk native vlan 99        ! Native VLAN（不打Tag）
  no shutdown

! 验证
show interfaces gi0/1 trunk
show interfaces gi0/1 switchport`,

    svi: `! 三层交换机SVI配置（Inter-VLAN路由）
! 1. 创建VLAN
vlan 10
  name VLAN10-Office
vlan 20
  name VLAN20-RD

! 2. 创建SVI接口（虚拟三层接口）
interface Vlan10
  ip address 192.168.10.1 255.255.255.0
  no shutdown
interface Vlan20
  ip address 192.168.20.1 255.255.255.0
  no shutdown

! 3. 开启路由功能（三层交换机需要）
ip routing

! 验证
show ip interface brief
show ip route`,

    vtp: `! VTP配置
! Server模式（可创建/删除VLAN）
vtp mode server
vtp domain COMPANY
vtp password cisco123

! Client模式（自动同步，不能创建VLAN）
vtp mode client
vtp domain COMPANY
vtp password cisco123

! Transparent模式（不参与同步，但转发VTP消息）
vtp mode transparent

! 验证
show vtp status
show vtp counters`,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4">
      {/* 顶部 */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl">🏷️</div>
          <div>
            <h1 className="text-2xl font-bold text-white">VLAN与Trunk技术</h1>
            <p className="text-gray-400 text-sm">Virtual LAN · IEEE 802.1Q · VTP · Inter-VLAN路由</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：拓扑 + 帧格式 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 拓扑图 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">🗺️ 企业园区网VLAN拓扑</h3>
              <div className="flex gap-2 flex-wrap">
                {VLANS.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVlan(v.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${selectedVlan === v.id ? 'text-white' : 'bg-gray-800 text-gray-400'}`}
                    style={selectedVlan === v.id ? { background: v.color } : {}}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative w-full" style={{ height: '280px' }}>
              <canvas ref={canvasRef} width={800} height={420} style={{ width: '100%', height: '100%' }} className="rounded-lg" />
            </div>

            {/* Inter-VLAN路由模式 */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-gray-500">Inter-VLAN路由：</span>
              {[
                { v: 'none' as RoutingMode, label: '无路由' },
                { v: 'router-on-stick' as RoutingMode, label: '单臂路由' },
                { v: 'l3-switch' as RoutingMode, label: '三层交换SVI ✅' },
              ].map(item => (
                <button key={item.v} onClick={() => setRoutingMode(item.v)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${routingMode === item.v ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 通信模拟 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">💬 VLAN通信模拟</h3>
            <div className="flex items-center gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">源VLAN</label>
                <select value={simSrcVlan} onChange={e => setSimSrcVlan(Number(e.target.value))}
                  className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700">
                  {VLANS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="text-gray-500 mt-4">→</div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">目标VLAN</label>
                <select value={simDstVlan} onChange={e => setSimDstVlan(Number(e.target.value))}
                  className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700">
                  {VLANS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>
            <PacketAnimation srcVlan={simSrcVlan} dstVlan={simDstVlan} routingMode={routingMode} />
          </div>

          {/* 802.1Q帧格式 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">📦 802.1Q帧格式可视化（VLAN {selectedVlan}）</h3>
            <FrameVisualization vlanId={selectedVlan} color={VLANS.find(v => v.id === selectedVlan)?.color || '#6366f1'} />
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-500">
              <div>• <span className="text-yellow-400">TPID</span>：固定 0x8100，标识这是802.1Q帧</div>
              <div>• <span className="text-emerald-400">PCP</span>：3位优先级，用于QoS（0-7）</div>
              <div>• <span className="text-blue-400">DEI</span>：丢弃指示位（原CFI）</div>
              <div>• <span className="text-pink-400">VID</span>：12位VLAN ID，范围 1-4094</div>
            </div>
          </div>
        </div>

        {/* 右列：控制+知识点 */}
        <div className="space-y-4">
          {/* 动画步骤 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">📖 学习步骤</h3>
              <div className="flex gap-2">
                <button onClick={() => setAnimStep(Math.max(0, animStep - 1))} disabled={animStep === 0}
                  className="px-2 py-1 bg-gray-800 rounded text-xs disabled:opacity-30">◀</button>
                <button onClick={isPlaying ? () => setIsPlaying(false) : () => { if (animStep >= animSteps.length - 1) setAnimStep(0); setIsPlaying(true); }}
                  className="px-2 py-1 bg-blue-700 rounded text-xs">{isPlaying ? '⏸' : '▶'}</button>
                <button onClick={() => setAnimStep(Math.min(animSteps.length - 1, animStep + 1))} disabled={animStep >= animSteps.length - 1}
                  className="px-2 py-1 bg-gray-800 rounded text-xs disabled:opacity-30">▶</button>
              </div>
            </div>
            <div className="p-3 bg-gray-800/60 rounded-lg">
              <div className="text-blue-400 font-medium text-xs mb-1">{animSteps[animStep].title}</div>
              <div className="text-gray-300 text-xs leading-relaxed">{animSteps[animStep].desc}</div>
            </div>
            <div className="flex gap-1 mt-3 justify-center">
              {animSteps.map((_, i) => (
                <button key={i} onClick={() => setAnimStep(i)}
                  className={`h-2 rounded-full transition-all ${i === animStep ? 'bg-blue-500 w-4' : 'bg-gray-700 w-2 hover:bg-gray-600'}`} />
              ))}
            </div>
          </div>

          {/* VLAN信息 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">📋 VLAN数据库</h3>
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1.5">VLAN</th>
                <th className="text-left py-1.5">名称</th>
                <th className="text-left py-1.5">子网</th>
              </tr></thead>
              <tbody>
                {VLANS.map(v => (
                  <tr key={v.id} className={`border-b border-gray-800/50 cursor-pointer ${selectedVlan === v.id ? 'bg-gray-800/60' : ''}`}
                    onClick={() => setSelectedVlan(v.id)}>
                    <td className="py-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ background: v.color }}></span>
                        <span className="font-mono text-gray-300">{v.id}</span>
                      </span>
                    </td>
                    <td className="py-1.5 text-gray-400">{v.name.split('-')[1]}</td>
                    <td className="py-1.5 text-gray-500 font-mono text-xs">{v.subnet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 配置代码 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">💻 配置代码参考</h3>
            <div className="flex gap-1 mb-3 flex-wrap">
              {[
                { k: 'access' as const, label: 'Access' },
                { k: 'trunk' as const, label: 'Trunk' },
                { k: 'svi' as const, label: 'SVI路由' },
                { k: 'vtp' as const, label: 'VTP' },
              ].map(item => (
                <button key={item.k} onClick={() => setShowConfig(item.k)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${showConfig === item.k ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <pre className="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto font-mono leading-relaxed whitespace-pre" style={{ maxHeight: 240 }}>
              {configTemplates[showConfig]}
            </pre>
          </div>
        </div>
      </div>

      {/* 底部对比表 */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-blue-400 mb-3">🔌 端口模式对比</h4>
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-1">模式</th><th className="text-left py-1">Tag处理</th><th className="text-left py-1">用途</th>
            </tr></thead>
            <tbody className="text-gray-400">
              {[
                { mode: 'Access', tag: '收到无Tag→打Tag，发出时剥Tag', use: '连接PC/服务器' },
                { mode: 'Trunk', tag: '收发均带Tag（Native不带）', use: '连接交换机/路由器' },
                { mode: 'Hybrid', tag: 'Access+Trunk混合，可灵活配置', use: '华为特有，更灵活' },
              ].map(r => (
                <tr key={r.mode} className="border-b border-gray-800/40">
                  <td className="py-1.5 text-blue-300">{r.mode}</td>
                  <td className="py-1.5 text-gray-500">{r.tag}</td>
                  <td className="py-1.5">{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-blue-400 mb-3">🔀 Inter-VLAN路由对比</h4>
          <div className="space-y-3 text-xs">
            {[
              { title: '单臂路由（Router-on-Stick）', pros: '简单，复用一条物理链路', cons: '链路瓶颈，CPU负担重', badge: '⭐ 小型' },
              { title: '三层交换SVI', pros: '线速路由，性能优异', cons: '成本略高（需三层交换机）', badge: '✅ 企业首选' },
              { title: '独立路由器+多接口', pros: '路由功能最强', cons: '端口浪费，成本高', badge: '仅大型' },
            ].map(r => (
              <div key={r.title} className="p-2 bg-gray-800/50 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-300 font-medium">{r.title}</span>
                  <span className="text-xs text-gray-500">{r.badge}</span>
                </div>
                <div className="text-green-400">✅ {r.pros}</div>
                <div className="text-red-400">❌ {r.cons}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-blue-400 mb-3">⚠️ 常见陷阱（考试考点）</h4>
          <div className="space-y-2 text-xs text-gray-400">
            {[
              { title: 'Native VLAN不匹配', desc: '两端Native VLAN不一致会导致VLAN跨越安全漏洞（VLAN Hopping）' },
              { title: 'VTP版本不一致', desc: 'VTP v1/v2/v3不兼容，版本低的设备可能清空VLAN数据库' },
              { title: 'Trunk allowed未配置', desc: '默认允许所有VLAN，应明确指定允许通过的VLAN' },
              { title: '忘记ip routing命令', desc: '三层交换机必须启用ip routing才能路由VLAN间流量' },
              { title: 'VLAN 1管理风险', desc: '默认管理VLAN为1，建议修改为其他VLAN减少攻击面' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-2">
                <span className="text-yellow-400 flex-shrink-0">⚠️</span>
                <div><span className="text-yellow-300">{item.title}</span>：{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
