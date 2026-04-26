import { useState, useEffect, useRef } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';

// Scene 类型定义（内联避免模块导入问题）
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

type Layer = 'physical' | 'datalink' | 'network' | 'transport' | 'application';
type Severity = 'critical' | 'high' | 'medium' | 'low';

interface Case {
  id: string;
  title: string;
  symptom: string;
  layer: Layer;
  severity: Severity;
  cause: string;
  solution: string;
  steps: { cmd: string; out: string; tip: string }[];
  topology?: { type: 'star' | 'chain' | 'mesh'; nodes: string[]; faultNode?: number };
}

const sceneData: Scene = {
  id: 'network-troubleshooting',
  phase: 3,
  title: '网络故障排查',
  category: '故障处理',
  description: 'OSI七层排查法 · 典型故障案例 · 诊断工具实战',
  duration: '8-10分钟',
  difficulty: 'hard',
  isHot: true,
};

const CASES: Case[] = [
  {
    id: 'ip-conflict',
    title: 'IP地址冲突',
    symptom: 'PC间歇性断网，提示IP冲突',
    layer: 'network',
    severity: 'high',
    cause: '两台设备配置了相同IP',
    solution: '1. 使用arp-scan查找冲突设备\n2. 修改其中一台设备的IP\n3. 或启用DHCP避免手动配置',
    topology: { type: 'star', nodes: ['PC-A', 'PC-B', 'Switch', 'Router'], faultNode: 0 },
    steps: [
      { cmd: 'ping 192.168.1.100', out: 'Reply time=1ms... Reply time=15ms', tip: '同一IP响应时间差异大，可能存在冲突' },
      { cmd: 'arp -a', out: '192.168.1.100 00-11-22-33-44-55\n192.168.1.100 00-11-22-33-44-AA', tip: '确认冲突！同一IP对应两个不同MAC地址' },
      { cmd: 'arp-scan -l | grep 192.168.1.100', out: '192.168.1.100 00:11:22:33:44:55 VendorA\n192.168.1.100 00:11:22:33:44:AA VendorB', tip: '找到两台冲突设备，分别来自不同厂商' },
    ],
  },
  {
    id: 'route-blackhole',
    title: '路由黑洞',
    symptom: '能ping通网关，不能访问外网',
    layer: 'network',
    severity: 'critical',
    cause: '路由器配置了错误的下一跳或缺少默认路由',
    solution: '1. 检查路由表\n2. 确认默认路由指向正确的下一跳\n3. 检查ACL是否阻止了流量',
    topology: { type: 'chain', nodes: ['PC', 'Switch', 'Router-A', 'Router-B', 'Internet'], faultNode: 2 },
    steps: [
      { cmd: 'ping 192.168.1.1', out: 'Reply from 192.168.1.1: bytes=32 time<1ms', tip: '网关可达，问题不在本地网络' },
      { cmd: 'ping 8.8.8.8', out: 'Request timed out.\nRequest timed out.', tip: '外网不可达，可能是路由问题' },
      { cmd: 'tracert 8.8.8.8', out: '1 <1ms <1ms <1ms 192.168.1.1\n2 * * * Request timed out.\n3 * * * Request timed out.', tip: '流量在路由器后丢失，存在路由黑洞' },
      { cmd: 'show ip route', out: 'Gateway of last resort is not set\nC 192.168.1.0/24 is directly connected', tip: '缺少默认路由！需要添加ip route 0.0.0.0 0.0.0.0 [next-hop]' },
    ],
  },
  {
    id: 'mtu-mismatch',
    title: 'MTU不匹配',
    symptom: '小数据包正常，大数据包丢包，网页加载不全',
    layer: 'network',
    severity: 'medium',
    cause: '路径中存在MTU较小的链路（如PPPoE、VPN隧道）',
    solution: '1. 使用ping -f测试MTU\n2. 调整接口MTU或启用PMTUD\n3. 检查MSS钳制配置',
    topology: { type: 'chain', nodes: ['PC', 'Router', 'VPN-Tunnel', 'Remote-Net'], faultNode: 2 },
    steps: [
      { cmd: 'ping -f -l 1472 10.0.0.1', out: 'Reply from 10.0.0.1: bytes=1472 time=10ms', tip: '1472字节通过，MTU至少1500（1472+28 IP/ICMP头）' },
      { cmd: 'ping -f -l 1473 10.0.0.1', out: 'Packet needs to be fragmented but DF set.', tip: '确认MTU问题！数据包超过路径MTU且不允许分片' },
      { cmd: 'ping -f -l 1400 10.0.0.1', out: 'Reply from 10.0.0.1: bytes=1400 time=10ms', tip: '1400字节通过，实际MTU约1428' },
      { cmd: 'show interface tunnel0', out: 'MTU 1406 bytes, BW 100 Kbit', tip: 'GRE隧道开销24字节，建议调整TCP MSS或启用PMTUD' },
    ],
  },
  {
    id: 'duplex-mismatch',
    title: '双工不匹配',
    symptom: '网络慢，大量CRC错误，性能严重下降',
    layer: 'datalink',
    severity: 'high',
    cause: '一端全双工，一端半双工，导致冲突',
    solution: '1. 检查接口双工配置\n2. 统一配置为全双工或自动协商\n3. 更换可能损坏的网线',
    topology: { type: 'chain', nodes: ['Server', 'Switch-Port-1'], faultNode: 1 },
    steps: [
      { cmd: 'show interfaces gi0/1', out: 'Full-duplex, 1000Mb/s, media type is RJ45\n5 minute input rate 1000 bits/sec', tip: '本端配置为全双工' },
      { cmd: 'show interfaces gi0/1 counters errors', out: 'CRC errors: 15234\nRunts: 2341\nGiants: 123', tip: '大量CRC错误！典型的双工不匹配症状' },
      { cmd: 'show interfaces status', out: 'Gi0/1 connected full a-full 1000 auto', tip: '本端auto协商为full，但对端可能是half' },
      { cmd: 'show log | include duplex', out: '%DUPLEX_MISMATCH-5-ERROR: Duplex mismatch discovered', tip: '交换机日志已记录双工不匹配警告' },
    ],
  },
  {
    id: 'dns-fail',
    title: 'DNS解析失败',
    symptom: '能ping通IP，打不开网页，QQ能上但浏览器不行',
    layer: 'application',
    severity: 'medium',
    cause: 'DNS服务器不可达、配置错误或缓存污染',
    solution: '1. 检查DNS配置\n2. 更换公共DNS（8.8.8.8/114.114.114.114）\n3. 清除DNS缓存',
    topology: { type: 'chain', nodes: ['PC', 'Router', 'DNS-Server'], faultNode: 2 },
    steps: [
      { cmd: 'ping 142.250.185.78', out: 'Reply from 142.250.185.78: bytes=32 time=25ms', tip: 'IP地址可达，网络层正常' },
      { cmd: 'ping www.google.com', out: 'Ping request could not find host www.google.com.', tip: '域名解析失败，问题在DNS' },
      { cmd: 'nslookup www.google.com', out: 'DNS request timed out.\nDefault Server: UnKnown\nAddress: 192.168.1.1', tip: 'DNS服务器无响应，可能是DNS服务器故障或配置错误' },
      { cmd: 'nslookup www.google.com 8.8.8.8', out: 'Server:  dns.google\nAddress:  8.8.8.8\nName:    www.google.com\nAddresses:  142.250.185.78', tip: '使用公共DNS正常，原DNS服务器有问题' },
    ],
  },
  {
    id: 'acl-block',
    title: 'ACL阻断',
    symptom: '特定端口/服务无法访问，其他正常',
    layer: 'network',
    severity: 'high',
    cause: '防火墙或路由器ACL阻止了特定流量',
    solution: '1. 检查ACL规则\n2. 确认规则顺序（ACL按顺序匹配）\n3. 添加放行规则或调整规则顺序',
    topology: { type: 'chain', nodes: ['PC', 'Router', 'Server:80'], faultNode: 1 },
    steps: [
      { cmd: 'telnet 192.168.1.10 80', out: 'Connecting to 192.168.1.10...\nCould not open connection', tip: 'HTTP端口不通' },
      { cmd: 'ping 192.168.1.10', out: 'Reply from 192.168.1.10: bytes=32 time<1ms', tip: '主机可达，问题不在网络层' },
      { cmd: 'telnet 192.168.1.10 443', out: 'Connecting to 192.168.1.10...\nConnected!', tip: 'HTTPS端口正常，仅HTTP被阻止' },
      { cmd: 'show access-lists', out: '10 deny tcp any any eq 80\n20 permit ip any any', tip: '发现阻断HTTP的ACL规则！需要删除或调整' },
    ],
  },
  {
    id: 'stp-loop',
    title: 'STP环路',
    symptom: '网络瘫痪，广播风暴，所有指示灯狂闪',
    layer: 'datalink',
    severity: 'critical',
    cause: '交换机之间形成物理环路且STP未生效',
    solution: '1. 立即断开冗余链路\n2. 检查STP配置\n3. 启用BPDU Guard和Root Guard',
    topology: { type: 'mesh', nodes: ['SW-A', 'SW-B', 'SW-C'], faultNode: 0 },
    steps: [
      { cmd: 'show spanning-tree summary', out: 'Switch is in pvst mode\nPortfast BPDU Guard is disabled', tip: 'STP运行中，但BPDU Guard未启用' },
      { cmd: 'show interfaces counters | include broadcast', out: 'Gi0/1 1523401 0 0 2341234 0 0', tip: '广播包数量异常高，存在广播风暴' },
      { cmd: 'show spanning-tree blockedports', out: 'Name Blocked Interfaces List\n------------------------------\nVLAN0001 None', tip: '没有阻塞端口！存在环路' },
      { cmd: 'show log | include LOOP', out: '%SW_MATM-4-MACFLAP_NOTIF: Host 0011.2233.4455 in vlan 1 is flapping', tip: 'MAC地址漂移，确认存在二层环路' },
    ],
  },
  {
    id: 'port-security',
    title: '端口安全违规',
    symptom: '单台PC突然断网，接口err-disabled',
    layer: 'datalink',
    severity: 'medium',
    cause: '端口安全检测到违规（MAC地址变化或数量超限）',
    solution: '1. 查看err-disabled原因\n2. 重新启用接口\n3. 调整端口安全策略或更换合法设备',
    topology: { type: 'chain', nodes: ['PC', 'Switch-Port'], faultNode: 1 },
    steps: [
      { cmd: 'show interfaces status', out: 'Gi0/2 err-disabled port-security', tip: '接口因端口安全被禁用' },
      { cmd: 'show port-security interface gi0/2', out: 'Port Security: Enabled\nViolation Mode: Shutdown\nMaximum MAC Addresses: 1', tip: '端口安全启用，最大MAC数为1，违规模式为shutdown' },
      { cmd: 'show port-security interface gi0/2 addr', out: 'Secure Mac Address Table\nVlan Mac Address Type', tip: '没有安全MAC，原设备已断开或MAC已清除' },
      { cmd: 'show log | include PORT_SECURITY', out: '%PORT_SECURITY-2-PSECURE_VIOLATION: Security violation occurred', tip: '日志记录端口安全违规事件' },
    ],
  },
];

const LAYER_NAMES: Record<Layer, string> = {
  physical: '物理层',
  datalink: '数据链路层',
  network: '网络层',
  transport: '传输层',
  application: '应用层',
};

const LAYER_COLOR: Record<Layer, string> = {
  physical: '#ef4444',
  datalink: '#f97316',
  network: '#eab308',
  transport: '#22c55e',
  application: '#3b82f6',
};

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; label: string }> = {
  critical: { color: '#dc2626', bg: 'bg-red-900/30', label: '严重' },
  high: { color: '#ea580c', bg: 'bg-orange-900/30', label: '高' },
  medium: { color: '#ca8a04', bg: 'bg-yellow-900/30', label: '中' },
  low: { color: '#16a34a', bg: 'bg-green-900/30', label: '低' },
};

// 排查流程图组件
function TroubleshootingFlowchart({ layer }: { layer: Layer }) {
  const steps: Record<Layer, string[]> = {
    physical: ['检查网线连接', '检查接口指示灯', '检查设备电源', '测试网线通断', '检查接口速率/双工'],
    datalink: ['查看MAC地址表', '检查VLAN配置', '检查STP状态', '查看接口统计', '检查端口安全'],
    network: ['测试IP连通性', '检查路由表', '检查ACL/防火墙', '检查NAT配置', '检查MTU设置'],
    transport: ['检查端口状态', '检查TCP连接', '检查负载均衡', '检查QoS策略', '抓包分析'],
    application: ['检查DNS解析', '检查服务状态', '检查应用配置', '查看应用日志', '检查认证授权'],
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-2">{LAYER_NAMES[layer]}排查流程</div>
      <div className="space-y-1">
        {steps[layer].map((step, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-gray-700 text-xs flex items-center justify-center text-gray-400">
              {idx + 1}
            </span>
            <span className="text-xs text-gray-300">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 网络拓扑可视化组件
function TopologyVisualizer({ topology }: { topology?: Case['topology'] }) {
  if (!topology) return null;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    ctx.clearRect(0, 0, width, height);

    const nodes = topology.nodes.map((name, i) => {
      if (topology.type === 'star') {
        if (i === topology.nodes.length - 1) {
          return { x: width / 2, y: height / 2, name };
        }
        const angle = (i / (topology.nodes.length - 1)) * Math.PI * 2 - Math.PI / 2;
        return {
          x: width / 2 + Math.cos(angle) * 60,
          y: height / 2 + Math.sin(angle) * 60,
          name,
        };
      } else if (topology.type === 'chain') {
        return { x: 30 + (i * (width - 60) / (topology.nodes.length - 1)), y: height / 2, name };
      } else {
        const angle = (i / topology.nodes.length) * Math.PI * 2 - Math.PI / 2;
        return {
          x: width / 2 + Math.cos(angle) * 50,
          y: height / 2 + Math.sin(angle) * 50,
          name,
        };
      }
    });

    // 绘制连线
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    if (topology.type === 'star') {
      for (let i = 0; i < nodes.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
        ctx.stroke();
      }
    } else if (topology.type === 'chain') {
      for (let i = 0; i < nodes.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // 绘制节点
    nodes.forEach((node, i) => {
      const isFault = i === topology.faultNode;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = isFault ? '#dc2626' : '#1f2937';
      ctx.fill();
      ctx.strokeStyle = isFault ? '#ef4444' : '#4b5563';
      ctx.lineWidth = isFault ? 3 : 2;
      ctx.stroke();

      // 节点标签
      ctx.fillStyle = isFault ? '#fca5a5' : '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name.length > 8 ? node.name.slice(0, 6) + '...' : node.name, node.x, node.y + 32);

      if (isFault) {
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('!', node.x, node.y + 4);
      }
    });
  }, [topology]);

  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-2">故障拓扑示意</div>
      <canvas ref={canvasRef} className="w-full h-32" />
    </div>
  );
}

export default function NetworkTroubleshooting() {
  const [selectedCase, setSelectedCase] = useState<Case>(CASES[0]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [filterLayer, setFilterLayer] = useState<Layer | 'all'>('all');
  const [showExamTips, setShowExamTips] = useState(false);

  useEffect(() => {
    setCurrentStep(0);
    setShowSolution(false);
  }, [selectedCase]);

  const filteredCases = filterLayer === 'all' ? CASES : CASES.filter(c => c.layer === filterLayer);

  return (
    <SceneLayout scene={sceneData} showSidebar={false} noHeightLimit={true}>
      <div className="p-6 text-gray-100">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-xl">🔧</div>
            <div>
              <h1 className="text-2xl font-bold text-white">网络故障排查</h1>
              <p className="text-gray-400 text-sm">OSI七层排查法 · 典型故障案例 · 诊断工具实战</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Case List */}
          <div className="space-y-3">
            {/* Filter */}
            <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterLayer('all')}
                  className={`px-2 py-1 rounded text-xs ${filterLayer === 'all' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >全部</button>
                {(['physical', 'datalink', 'network', 'transport', 'application'] as Layer[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setFilterLayer(l)}
                    className={`px-2 py-1 rounded text-xs ${filterLayer === l ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    style={{ background: filterLayer === l ? LAYER_COLOR[l] : undefined }}
                  >
                    {LAYER_NAMES[l]}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">📋 典型故障案例 ({filteredCases.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredCases.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedCase.id === c.id ? 'border-red-600 bg-gray-800' : 'border-gray-800 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLOR[c.layer] }}></span>
                      <span className="text-sm font-medium text-gray-200 flex-1">{c.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${SEVERITY_CONFIG[c.severity].bg}`} style={{ color: SEVERITY_CONFIG[c.severity].color }}>
                        {SEVERITY_CONFIG[c.severity].label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{c.symptom.slice(0, 25)}...</div>
                  </button>
                ))}
              </div>
            </div>

            {/* OSI Model */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">🔄 OSI七层排查法</h3>
              <div className="space-y-1">
                {(['physical', 'datalink', 'network', 'transport', 'application'] as Layer[]).map((l, i) => (
                  <div key={l} className={`flex items-center gap-2 p-2 rounded ${selectedCase.layer === l ? 'bg-gray-800' : ''}`}>
                    <span className="text-xs text-gray-600 w-6">L{7 - i}</span>
                    <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLOR[l] }}></span>
                    <span className="text-xs text-gray-300 flex-1">{LAYER_NAMES[l]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500 bg-gray-800/50 p-2 rounded">
                <strong>排查原则：</strong>自下而上，从物理层开始逐层验证
              </div>
            </div>

            {/* Troubleshooting Flowchart */}
            <TroubleshootingFlowchart layer={selectedCase.layer} />
          </div>

          {/* Middle: Diagnosis */}
          <div className="lg:col-span-2 space-y-4">
            {/* Case Detail */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{selectedCase.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_CONFIG[selectedCase.severity].bg}`} style={{ color: SEVERITY_CONFIG[selectedCase.severity].color }}>
                    {SEVERITY_CONFIG[selectedCase.severity].label}优先级
                  </span>
                </div>
                <span className="px-2 py-1 rounded text-xs" style={{ background: LAYER_COLOR[selectedCase.layer] + '33', color: LAYER_COLOR[selectedCase.layer] }}>
                  {LAYER_NAMES[selectedCase.layer]}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                  <div className="text-red-400 text-xs font-medium mb-1">🔴 故障现象</div>
                  <div className="text-gray-300 text-sm">{selectedCase.symptom}</div>
                </div>
                <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg p-3">
                  <div className="text-orange-400 text-xs font-medium mb-1">⚠️ 根本原因</div>
                  <div className="text-gray-300 text-sm">{selectedCase.cause}</div>
                </div>
              </div>

              {/* Topology */}
              <TopologyVisualizer topology={selectedCase.topology} />
            </div>

            {/* Diagnosis Steps */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">🔍 诊断步骤</h3>
              <div className="space-y-3">
                {selectedCase.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      currentStep === idx ? 'border-red-600 bg-gray-800' : 'border-gray-800 hover:border-gray-700'
                    }`}
                    onClick={() => setCurrentStep(idx)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        currentStep === idx ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'
                      }`}>{idx + 1}</span>
                      <code className="text-green-400 text-xs font-mono">{step.cmd}</code>
                    </div>
                    {currentStep === idx && (
                      <>
                        <pre className="bg-gray-950 rounded p-2 text-xs text-gray-400 font-mono mb-2 overflow-x-auto">{step.out}</pre>
                        <div className="text-xs text-yellow-400">💡 {step.tip}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="px-3 py-1.5 bg-gray-800 rounded text-xs disabled:opacity-30"
                >上一步</button>
                <button
                  onClick={() => setCurrentStep(Math.min(selectedCase.steps.length - 1, currentStep + 1))}
                  disabled={currentStep >= selectedCase.steps.length - 1}
                  className="px-3 py-1.5 bg-red-700 rounded text-xs disabled:opacity-30"
                >下一步</button>
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="px-3 py-1.5 bg-green-700 rounded text-xs ml-auto"
                >{showSolution ? '隐藏' : '查看'}解决方案</button>
              </div>
            </div>

            {/* Solution */}
            {showSolution && (
              <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">✅ 解决方案</h3>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">{selectedCase.solution}</pre>
              </div>
            )}

            {/* Tools Reference */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">🛠️ 常用诊断工具速查</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { name: 'ping', desc: '测试连通性', layer: 'network', example: 'ping 8.8.8.8' },
                  { name: 'tracert', desc: '追踪路由路径', layer: 'network', example: 'tracert 8.8.8.8' },
                  { name: 'arp', desc: '查看ARP表', layer: 'datalink', example: 'arp -a' },
                  { name: 'netstat', desc: '查看连接状态', layer: 'transport', example: 'netstat -an' },
                  { name: 'nslookup', desc: 'DNS查询', layer: 'application', example: 'nslookup google.com' },
                  { name: 'telnet', desc: '测试端口', layer: 'application', example: 'telnet host 80' },
                  { name: 'show ip route', desc: '查看路由表', layer: 'network', example: 'show ip route' },
                  { name: 'show interfaces', desc: '查看接口状态', layer: 'datalink', example: 'show ip int brief' },
                ].map(t => (
                  <div key={t.name} className="bg-gray-800/50 rounded p-2 text-xs group hover:bg-gray-800 transition-colors">
                    <div className="text-cyan-400 font-mono">{t.name}</div>
                    <div className="text-gray-500">{t.desc}</div>
                    <div className="text-gray-600 font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{t.example}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exam Tips */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <button
                onClick={() => setShowExamTips(!showExamTips)}
                className="flex items-center gap-2 text-sm font-semibold text-yellow-400 mb-2"
              >
                <span>{showExamTips ? '▼' : '▶'}</span>
                📚 考试要点总结（案例分析必考）
              </button>
              {showExamTips && (
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-yellow-400 font-medium mb-2">一、故障排查方法论</div>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li><strong>OSI七层排查法：</strong>自下而上，从物理层开始逐层验证</li>
                      <li><strong>分而治之法：</strong>将网络分段，缩小故障范围</li>
                      <li><strong>替换法：</strong>用已知正常的设备/线缆替换怀疑对象</li>
                      <li><strong>对比法：</strong>对比正常和异常设备的配置/状态</li>
                    </ul>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-yellow-400 font-medium mb-2">二、常见故障现象与原因对应</div>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li><strong>能ping通IP但打不开网页：</strong>DNS故障或HTTP被ACL阻断</li>
                      <li><strong>能ping通网关但不通外网：</strong>路由问题或NAT配置错误</li>
                      <li><strong>网络慢+CRC错误：</strong>双工不匹配或网线质量问题</li>
                      <li><strong>小数据包正常大数据包丢：</strong>MTU不匹配</li>
                      <li><strong>全网瘫痪+广播风暴：</strong>STP环路</li>
                    </ul>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-yellow-400 font-medium mb-2">三、常用诊断命令（考试重点）</div>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li><code className="text-cyan-400">ping -f -l 1472</code> - 测试MTU（-f禁止分片）</li>
                      <li><code className="text-cyan-400">tracert</code> - 追踪路由，定位故障点</li>
                      <li><code className="text-cyan-400">show spanning-tree</code> - 检查STP状态</li>
                      <li><code className="text-cyan-400">show interfaces counters errors</code> - 查看CRC错误</li>
                      <li><code className="text-cyan-400">show access-lists</code> - 检查ACL规则</li>
                    </ul>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-yellow-400 font-medium mb-2">四、案例分析答题技巧</div>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>先根据症状判断故障层次（物理/数据链路/网络/应用）</li>
                      <li>使用排除法，逐一验证可能原因</li>
                      <li>给出具体的诊断命令和预期输出</li>
                      <li>解决方案要具体，包括配置命令</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
