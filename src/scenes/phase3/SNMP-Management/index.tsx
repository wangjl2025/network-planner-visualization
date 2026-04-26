import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Play, Pause, ChevronRight, ChevronLeft, RotateCcw,
  Network, Radio, Database, Shield, AlertTriangle,
  CheckCircle, FileText, ChevronDown, ChevronUp, Info,
  Server, Router, Monitor
} from 'lucide-react';

// ============================================================
// 类型定义
// ============================================================
type SnmpVersion = 'v1' | 'v2c' | 'v3';
type SnmpOperation = 'Get' | 'GetNext' | 'GetBulk' | 'Set' | 'Trap' | 'Inform' | 'Walk';

interface MibNode {
  oid: string;
  name: string;
  type: string;
  value: string | number;
  children?: MibNode[];
  description?: string;
}

interface SnmpDevice {
  id: string;
  name: string;
  ip: string;
  type: 'router' | 'switch' | 'server' | 'manager';
  community?: string;
  status: 'up' | 'down' | 'warning';
  metrics: { cpu: number; mem: number; bw: number };
}

// ============================================================
// MIB树数据
// ============================================================
const MIB_TREE: MibNode = {
  oid: '1', name: 'iso', type: 'node', value: '',
  children: [{
    oid: '1.3', name: 'org', type: 'node', value: '',
    children: [{
      oid: '1.3.6', name: 'dod', type: 'node', value: '',
      children: [{
        oid: '1.3.6.1', name: 'internet', type: 'node', value: '',
        children: [
          {
            oid: '1.3.6.1.2', name: 'mgmt', type: 'node', value: '',
            children: [{
              oid: '1.3.6.1.2.1', name: 'mib-2', type: 'node', value: '',
              children: [
                {
                  oid: '1.3.6.1.2.1.1', name: 'system', type: 'node', value: '',
                  children: [
                    { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', type: 'DisplayString', value: 'Cisco IOS 15.2', description: '设备描述' },
                    { oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', type: 'TimeTicks', value: '142573200', description: '系统运行时间（厘秒）' },
                    { oid: '1.3.6.1.2.1.1.5.0', name: 'sysName', type: 'DisplayString', value: 'CORE-SW-01', description: '设备名称' },
                    { oid: '1.3.6.1.2.1.1.6.0', name: 'sysLocation', type: 'DisplayString', value: 'IDC机房A区', description: '设备位置' },
                  ]
                },
                {
                  oid: '1.3.6.1.2.1.2', name: 'interfaces', type: 'node', value: '',
                  children: [
                    { oid: '1.3.6.1.2.1.2.2.1.10', name: 'ifInOctets', type: 'Counter32', value: '4582941', description: '接口入方向字节数' },
                    { oid: '1.3.6.1.2.1.2.2.1.16', name: 'ifOutOctets', type: 'Counter32', value: '2841023', description: '接口出方向字节数' },
                    { oid: '1.3.6.1.2.1.2.2.1.8', name: 'ifOperStatus', type: 'INTEGER', value: '1(up)', description: '接口运行状态' },
                  ]
                },
              ]
            }]
          },
          {
            oid: '1.3.6.1.4', name: 'private', type: 'node', value: '',
            children: [{
              oid: '1.3.6.1.4.1', name: 'enterprises', type: 'node', value: '',
              children: [
                { oid: '1.3.6.1.4.1.9', name: 'cisco', type: 'node', value: '厂商私有MIB（Cisco企业号=9）', description: '思科私有扩展MIB' },
                { oid: '1.3.6.1.4.1.2636', name: 'juniper', type: 'node', value: '厂商私有MIB（Juniper企业号=2636）', description: '瞻博私有扩展MIB' },
              ]
            }]
          }
        ]
      }]
    }]
  }]
};

const DEVICES: SnmpDevice[] = [
  { id: 'manager', name: 'NMS管理站', ip: '10.0.0.100', type: 'manager', status: 'up', metrics: { cpu: 15, mem: 40, bw: 20 } },
  { id: 'core-sw', name: 'CORE-SW-01', ip: '10.0.0.1', type: 'switch', community: 'public', status: 'up', metrics: { cpu: 45, mem: 60, bw: 75 } },
  { id: 'router', name: 'EDGE-R-01', ip: '10.0.0.2', type: 'router', community: 'public', status: 'warning', metrics: { cpu: 85, mem: 72, bw: 90 } },
  { id: 'server', name: 'WEB-SRV-01', ip: '10.0.0.10', type: 'server', community: 'public', status: 'down', metrics: { cpu: 0, mem: 0, bw: 0 } },
];

const examPoints = [
  {
    title: 'SNMP架构组件',
    points: [
      'Manager（管理站）：发送请求、接收Trap',
      'Agent（代理）：运行在被管设备上，维护MIB',
      'MIB（管理信息库）：树形结构存储管理对象',
      'OID（对象标识符）：唯一标识MIB节点，如1.3.6.1.2.1.1.1.0'
    ]
  },
  {
    title: 'SNMP版本对比',
    points: [
      'SNMPv1：Community String认证，明文传输，已淘汰',
      'SNMPv2c：新增GetBulk/Inform，64位计数器',
      'SNMPv3：USM认证（MD5/SHA），加密（AES/DES），VACM访问控制',
      '端口：UDP 161（Get/Set），UDP 162（Trap/Inform）'
    ]
  },
  {
    title: 'SNMP操作类型',
    points: [
      'Get：读取单个OID值',
      'GetNext：读取下一个OID（用于遍历）',
      'GetBulk：批量获取（v2c+）',
      'Set：设置OID值（需写权限）',
      'Trap：Agent主动告警（无应答）',
      'Inform：带确认的Trap（需应答）'
    ]
  },
  {
    title: 'MIB-II标准组',
    points: [
      'System组：sysDescr/sysName/sysLocation/sysUpTime',
      'Interfaces组：ifInOctets/ifOutOctets/ifOperStatus',
      'IP组：ipInReceives/ipOutRequests',
      'ICMP组：icmpInMsgs/icmpOutMsgs',
      'TCP组：tcpActiveOpens/tcpPassiveOpens'
    ]
  }
];

// ============================================================
// MIB树节点渲染
// ============================================================
function MibNodeComp({ node, depth = 0, selected, onSelect }: {
  node: MibNode; depth?: number; selected: string; onSelect: (n: MibNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 3);
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren;
  const isSelected = selected === node.oid;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-colors text-sm ${isSelected ? 'bg-cyan-100' : 'hover:bg-gray-100'}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => { if (hasChildren) setExpanded(!expanded); onSelect(node); }}
      >
        <span className="text-gray-400 w-4 text-xs">{hasChildren ? (expanded ? '▼' : '▶') : '•'}</span>
        <span className={isLeaf ? 'text-emerald-600 font-medium' : 'text-blue-600 font-medium'}>{node.name}</span>
        <span className="text-gray-400 font-mono text-xs">({node.oid.split('.').slice(-1)[0]})</span>
        {isLeaf && <span className="text-gray-400 text-xs ml-1">{node.type}</span>}
      </div>
      {expanded && hasChildren && node.children!.map(child => (
        <MibNodeComp key={child.oid} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================
export default function SNMPScene() {
  const [version, setVersion] = useState<SnmpVersion>('v2c');
  const [operation, setOperation] = useState<SnmpOperation>('Get');
  const [selectedMib, setSelectedMib] = useState<MibNode | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<SnmpDevice>(DEVICES[1]);
  const [animStep, setAnimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showExamPoints, setShowExamPoints] = useState(false);
  const [showWalkDemo, setShowWalkDemo] = useState(false);
  const [trapLog, setTrapLog] = useState<string[]>([
    '[10:23:14] TRAP from 10.0.0.2: linkDown ifIndex=3',
    '[10:23:16] TRAP from 10.0.0.2: cpuHighLoad cpu=92%',
    '[10:24:01] TRAP from 10.0.0.10: coldStart',
  ]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animSteps = [
    { title: '① SNMP架构：Manager / Agent / MIB', desc: 'SNMP（Simple Network Management Protocol）采用Manager-Agent模型。网络管理站（NMS）是Manager，向网络设备上的Agent发送请求，设备将监控数据以MIB格式存储，Agent负责读取/设置MIB对象值。' },
    { title: '② MIB（管理信息库）：OID树形结构', desc: 'MIB是分层树形数据库，每个节点用OID（对象标识符）唯一标识。如1.3.6.1.2.1.1.1.0是sysDescr，表示设备描述。标准MIB-II（RFC 1213）定义公共对象，厂商可在private(1.3.6.1.4.1)下扩展私有MIB。' },
    { title: '③ SNMPv1 基本操作', desc: 'SNMPv1有Get（读单个对象）、GetNext（读下一个对象，用于遍历表格）、Set（写对象值）、Trap（Agent主动通知Manager）四种操作。使用社区字符串（Community String）作为简单认证，明文传输不安全。' },
    { title: '④ SNMPv2c 增强：GetBulk + Inform', desc: 'v2c新增GetBulk操作（批量获取，比多次GetNext更高效）和Inform（有确认的Trap，Manager需应答）。64位计数器解决32位Counter32溢出问题（高速链路30分钟可能溢出）。' },
    { title: '⑤ SNMPv3 安全增强', desc: 'v3新增用户安全模型（USM）：AuthNoPriv（MD5/SHA认证）、AuthPriv（认证+AES/DES加密）、noAuthNoPriv（兼容旧版）。视图访问控制（VACM）精细化控制用户可访问哪些MIB对象。企业网推荐使用v3。' },
    { title: '⑥ RMON：远程监控', desc: 'RMON（Remote Monitoring）是SNMP扩展，在设备（探针）本地统计流量数据后汇报，减少管理流量。RMON1监控二层（以太网帧统计），RMON2监控三层（协议分析）。现代网络倾向用NetFlow/sFlow替代。' },
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

  useEffect(() => {
    trapTimerRef.current = setInterval(() => {
      const device = DEVICES[Math.floor(Math.random() * (DEVICES.length - 1)) + 1];
      const traps = [
        `linkDown ifIndex=${Math.floor(Math.random() * 4) + 1}`,
        `cpuHighLoad cpu=${Math.floor(Math.random() * 30) + 70}%`,
        `temperatureAlert temp=${Math.floor(Math.random() * 10) + 75}°C`,
        `authFailure community=wrong`,
      ];
      const now = new Date();
      const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setTrapLog(prev => [`[${time}] TRAP from ${device.ip}: ${traps[Math.floor(Math.random() * traps.length)]}`, ...prev.slice(0, 9)]);
    }, 5000);
    return () => { if (trapTimerRef.current) clearInterval(trapTimerRef.current); };
  }, []);

  const opDescriptions: Record<SnmpOperation, string> = {
    Get: 'Manager → Agent：请求读取指定OID的值。Agent返回当前值。',
    GetNext: 'Manager → Agent：请求读取下一个OID的值。用于遍历MIB树或表格行。',
    GetBulk: 'Manager → Agent（v2c+）：批量请求多个OID，比多次GetNext效率高数倍。',
    Set: 'Manager → Agent：写入MIB对象值（如关闭接口、修改配置）。需要有写权限的Community。',
    Trap: 'Agent → Manager：Agent主动发送告警（无需Manager轮询）。UDP 162端口。不需要应答。',
    Inform: 'Agent → Manager（v2c+）：改进的Trap，Manager需要发送应答确认，确保告警不丢失。',
    Walk: 'Manager：循环发送GetNext，遍历子树下所有OID，获取完整数据。',
  };

  const versionFeatures: Record<SnmpVersion, { port: string; auth: string; privacy: string; newFeatures: string; recommend: string }> = {
    v1: { port: 'UDP 161/162', auth: 'Community String（明文）', privacy: '❌ 无加密', newFeatures: 'Get/GetNext/Set/Trap', recommend: '❌ 已淘汰，不建议使用' },
    v2c: { port: 'UDP 161/162', auth: 'Community String（明文）', privacy: '❌ 无加密', newFeatures: 'GetBulk/Inform/64位计数器', recommend: '⚠️ 内网可用，互联网不推荐' },
    v3: { port: 'UDP 161/162', auth: 'USM用户+MD5/SHA认证', privacy: '✅ AES/DES加密', newFeatures: 'AuthPriv安全模式/VACM访问控制', recommend: '✅ 企业首选，安全性最高' },
  };

  const vf = versionFeatures[version];

  const configTemplates: Record<SnmpVersion, string> = {
    v1: `! SNMPv1配置（不推荐生产使用）
snmp-server community public RO       ! 只读社区字符串
snmp-server community private RW      ! 读写社区字符串
snmp-server host 10.0.0.100 public    ! Trap目标`,

    v2c: `! SNMPv2c配置
snmp-server community public RO
snmp-server community private RW
snmp-server host 10.0.0.100 version 2c public
snmp-server enable traps

! 查看MIB信息
snmp-server location "IDC机房A区"
snmp-server contact "admin@corp.com"`,

    v3: `! SNMPv3安全配置（推荐）

! 创建视图（可访问的MIB范围）
snmp-server view ALL_MIB iso included

! 创建用户组
snmp-server group ADMIN-GROUP v3 priv \\
  read ALL_MIB write ALL_MIB

! 创建用户（认证+加密）
snmp-server user admin ADMIN-GROUP v3 \\
  auth sha MyAuthPass123 \\
  priv aes 128 MyPrivPass456

! 配置Trap目标
snmp-server host 10.0.0.100 version 3 priv admin

! 验证
show snmp user
show snmp group`,
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'manager': return <Monitor className="w-4 h-4" />;
      case 'router': return <Router className="w-4 h-4" />;
      case 'switch': return <Network className="w-4 h-4" />;
      case 'server': return <Server className="w-4 h-4" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  const scene = {
    id: 'snmp-management',
    title: 'SNMP网络管理',
    description: 'SNMPv1/v2c/v3、MIB树、OID、Trap告警、RMON',
    phase: 3 as const,
    category: '网络管理',
    difficulty: 'medium' as const,
    duration: '12-15分钟',
  };

  return (
    <SceneLayout scene={scene} showSidebar={false} noHeightLimit={true}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 顶部版本切换 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">SNMP 网络管理协议</h1>
                <p className="text-gray-500 text-sm">SNMPv1/v2c/v3 · MIB树 · OID · Trap告警 · RMON</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(['v1', 'v2c', 'v3'] as SnmpVersion[]).map(v => (
                <button 
                  key={v} 
                  onClick={() => setVersion(v)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${version === v ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  SNMP{v}{v === 'v3' ? ' ✅' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 设备拓扑 + Trap日志 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 设备状态 */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-500" />
                  被管设备
                </h3>
                <div className="space-y-3">
                  {DEVICES.map(dev => (
                    <div
                      key={dev.id}
                      onClick={() => dev.type !== 'manager' && setSelectedDevice(dev)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedDevice.id === dev.id && dev.type !== 'manager' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${dev.status === 'up' ? 'bg-green-500' : dev.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                          <span className="font-medium text-gray-800">{dev.name}</span>
                          {dev.type === 'manager' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">NMS</span>}
                        </div>
                        <span className="text-xs text-gray-500 font-mono">{dev.ip}</span>
                      </div>
                      {dev.type !== 'manager' && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          {[
                            { label: 'CPU', value: dev.metrics.cpu, color: dev.metrics.cpu > 80 ? '#ef4444' : '#22c55e' },
                            { label: 'MEM', value: dev.metrics.mem, color: dev.metrics.mem > 80 ? '#ef4444' : '#22c55e' },
                            { label: 'BW', value: dev.metrics.bw, color: dev.metrics.bw > 80 ? '#f59e0b' : '#22c55e' },
                          ].map(m => (
                            <div key={m.label} className="flex items-center gap-1">
                              <span className="text-gray-500">{m.label}</span>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                                <div className="h-1.5 rounded-full" style={{ width: `${m.value}%`, background: m.color }}></div>
                              </div>
                              <span style={{ color: m.color }} className="font-medium">{m.value}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Trap日志 */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Trap告警日志（实时）
                </h3>
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 200 }}>
                  {trapLog.map((log, i) => (
                    <div key={i} className={`text-xs font-mono p-2 rounded-lg ${i === 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'text-gray-500 bg-gray-50'}`}>
                      {log}
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <Info className="w-3 h-3 inline mr-1" />
                    Trap：Agent→Manager，UDP 162端口，无需应答
                  </p>
                </div>
              </div>
            </div>

            {/* SNMP操作 + 版本特性 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-500" />
                SNMP操作类型
              </h3>
              <div className="flex gap-2 mb-4 flex-wrap">
                {(['Get', 'GetNext', 'GetBulk', 'Set', 'Trap', 'Inform', 'Walk'] as SnmpOperation[]).map(op => {
                  const available = !(op === 'GetBulk' && version === 'v1') && !(op === 'Inform' && version === 'v1');
                  return (
                    <button 
                      key={op} 
                      onClick={() => available && setOperation(op)} 
                      disabled={!available}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${operation === op ? 'bg-purple-600 text-white' : available ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                    >
                      {op}{!available ? ' (v2+)' : ''}
                    </button>
                  );
                })}
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-purple-700 font-bold mb-2">操作流程：</div>
                <div className="text-gray-700">{opDescriptions[operation]}</div>
                {selectedMib && (
                  <div className="mt-3 p-3 bg-gray-900 rounded-lg">
                    <div className="text-gray-400 text-xs mb-1"># {operation} 操作示例</div>
                    <div className="text-green-400 font-mono text-xs">snmpget -v{version} -c {selectedDevice.community || 'public'} {selectedDevice.ip} {selectedMib.oid}</div>
                    {operation === 'Set' && <div className="text-green-400 font-mono text-xs mt-1">snmpset -v{version} -c private {selectedDevice.ip} {selectedMib.oid} s "new_value"</div>}
                  </div>
                )}
              </div>
            </div>

            {/* 版本对比 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">SNMP{version} 特性</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: '传输端口', value: vf.port },
                  { label: '认证方式', value: vf.auth },
                  { label: '加密支持', value: vf.privacy },
                  { label: '新增功能', value: vf.newFeatures },
                  { label: '建议使用', value: vf.recommend, span: true },
                ].map(item => (
                  <div key={item.label} className={`bg-gray-50 rounded-xl p-4 ${item.span ? 'col-span-2' : ''}`}>
                    <div className="text-gray-500 text-sm mb-1">{item.label}</div>
                    <div className="text-gray-800 font-medium">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：MIB树 + 动画 + 配置 */}
          <div className="space-y-6">
            {/* 动画步骤 */}
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
                    className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
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
              <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                <div className="text-cyan-700 font-bold mb-2">{animSteps[animStep].title}</div>
                <div className="text-gray-700 text-sm leading-relaxed">{animSteps[animStep].desc}</div>
              </div>
              <div className="flex gap-2 mt-4 justify-center">
                {animSteps.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setAnimStep(i)} 
                    className={`h-2 rounded-full transition-all ${i === animStep ? 'bg-cyan-600 w-6' : 'bg-gray-300 w-2'}`} 
                  />
                ))}
              </div>
            </div>

            {/* MIB树 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" />
                MIB树（点击查看OID）
              </h3>
              <div className="overflow-y-auto bg-gray-50 rounded-xl p-3" style={{ maxHeight: 280 }}>
                <MibNodeComp node={MIB_TREE} selected={selectedMib?.oid || ''} onSelect={setSelectedMib} />
              </div>
              {selectedMib && (
                <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-emerald-700 font-mono text-sm mb-1">{selectedMib.oid}</div>
                  <div className="text-gray-800 font-medium">{selectedMib.name}</div>
                  {selectedMib.type && selectedMib.type !== 'node' && (
                    <div className="text-gray-500 text-sm">类型: {selectedMib.type} | 值: {selectedMib.value}</div>
                  )}
                  {selectedMib.description && <div className="text-gray-500 text-sm mt-1">{selectedMib.description}</div>}
                </div>
              )}
            </div>

            {/* 配置代码 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">SNMP{version} 配置</h3>
              <pre className="bg-gray-900 rounded-xl p-4 text-xs text-green-400 overflow-x-auto font-mono leading-relaxed whitespace-pre" style={{ maxHeight: 240 }}>
                {configTemplates[version]}
              </pre>
            </div>
          </div>
        </div>

        {/* 考试要点折叠面板 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => setShowExamPoints(!showExamPoints)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-800">考试要点总结</h4>
                <p className="text-sm text-gray-600">SNMP高频考点与易错点</p>
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
                        <span className="w-6 h-6 bg-cyan-600 text-white rounded-full flex items-center justify-center text-sm">
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
