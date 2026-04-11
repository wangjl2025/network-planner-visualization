import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Wifi,
  Server,
  Play,
  RotateCcw,
  ArrowRight,
  Filter,
  Database,
  Clock,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronRight,
  Info,
  BookOpen,
  Target,
  Zap,
  Lock,
  Unlock,
  Cpu,
  Layers
} from 'lucide-react';

// 连接状态（更详细的TCP状态机）
type ConnState = 'LISTEN' | 'SYN_SENT' | 'SYN_RCVD' | 'ESTABLISHED' | 'FIN_WAIT_1' | 'FIN_WAIT_2' | 'TIME_WAIT' | 'CLOSING' | 'CLOSE_WAIT' | 'LAST_ACK' | 'CLOSED';

// 状态表条目（增加序列号等信息）
interface StateEntry {
  id: string;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  protocol: 'TCP' | 'UDP';
  state: ConnState;
  startTime: number;
  lastActivity: number;
  direction: 'outbound' | 'inbound';
  // TCP连接特有信息
  seqNumber?: number;
  ackNumber?: number;
  flags?: string; // SYN, ACK, FIN, RST
  timeout?: number; // 超时时间
}

// 数据包类型细化
type PacketType = 'SYN' | 'SYN-ACK' | 'ACK' | 'DATA' | 'FIN' | 'FIN-ACK' | 'RST' | 'ATTACK-SYN' | 'ATTACK-ACK' | 'ATTACK-DATA';

// 包过滤规则
interface PacketFilterRule {
  id: number;
  action: 'permit' | 'deny';
  srcIp: string;
  dstIp: string;
  srcPort: string;  // any, or specific
  dstPort: string;
  protocol: 'tcp' | 'udp' | 'any';
  direction: 'in' | 'out' | 'both';
  match: boolean | null;
}

// 数据包
interface FWPacket {
  id: string;
  type: 'SYN' | 'SYN-ACK' | 'ACK' | 'DATA' | 'FIN' | 'ATTACK-ACK' | 'RST';
  from: 'client' | 'server' | 'attacker';
  to: 'firewall' | 'server' | 'client';
  color: string;
  label: string;
  x: number;
  allowed: boolean | null;
  // 包过滤决策
  packetFilterDecision: {
    rule: PacketFilterRule | null;
    result: 'permit' | 'deny' | 'pending';
  };
  // 状态防火墙决策
  statefulDecision: {
    result: 'permit' | 'deny' | 'pending';
    reason: string;
  };
}

// 防火墙类型
type FirewallType = 'packet-filter' | 'stateful';

// 场景步骤定义
const STEPS = [
  { 
    id: 'idle', 
    title: '初始状态', 
    desc: '两种防火墙均已就绪。包过滤防火墙仅基于规则表工作；状态检测防火墙维护连接状态表。',
    statefulTable: [],
    packetFilterRules: [
      { id: 1, action: 'permit', srcIp: '192.168.1.0/24', dstIp: 'any', srcPort: 'any', dstPort: 'any', protocol: 'tcp', direction: 'out', match: null },
      { id: 2, action: 'deny', srcIp: 'any', dstIp: '192.168.1.0/24', srcPort: 'any', dstPort: 'any', protocol: 'any', direction: 'in', match: null },
    ],
  },
  { 
    id: 'syn', 
    title: '① 客户端发送 SYN', 
    desc: '内网客户端发起TCP连接请求。包过滤：检查出站规则，匹配permit；状态检测：创建SYN_SENT状态。',
    statefulTable: [{ id: 'conn1', srcIp: '192.168.1.10', srcPort: 54321, dstIp: '10.0.0.80', dstPort: 80, protocol: 'TCP' as const, state: 'SYN_SENT' as ConnState, startTime: 0, lastActivity: 0, direction: 'outbound' as const }],
    packetFilterRules: [
      { id: 1, action: 'permit', srcIp: '192.168.1.0/24', dstIp: 'any', srcPort: 'any', dstPort: 'any', protocol: 'tcp', direction: 'out', match: true },
      { id: 2, action: 'deny', srcIp: 'any', dstIp: '192.168.1.0/24', srcPort: 'any', dstPort: 'any', protocol: 'any', direction: 'in', match: false },
    ],
  },
  { 
    id: 'syn-ack', 
    title: '② 服务器回 SYN-ACK', 
    desc: '服务器响应SYN-ACK。包过滤：检查入站规则，无匹配→隐含deny→但某些实现允许ESTABLISHED连接的回程包；状态检测：查状态表命中，更新为SYN_RCVD。',
    statefulTable: [{ id: 'conn1', srcIp: '192.168.1.10', srcPort: 54321, dstIp: '10.0.0.80', dstPort: 80, protocol: 'TCP' as const, state: 'SYN_RCVD' as ConnState, startTime: 0, lastActivity: 0, direction: 'outbound' as const }],
    packetFilterRules: [
      { id: 1, action: 'permit', srcIp: '192.168.1.0/24', dstIp: 'any', srcPort: 'any', dstPort: 'any', protocol: 'tcp', direction: 'out', match: false },
      { id: 2, action: 'deny', srcIp: 'any', dstIp: '192.168.1.0/24', srcPort: 'any', dstPort: 'any', protocol: 'any', direction: 'in', match: true },
    ],
  },
  { 
    id: 'ack', 
    title: '③ 客户端 ACK，连接建立', 
    desc: '三次握手完成。包过滤：仅检查规则，无法识别这是合法握手的一部分；状态检测：连接状态升级为ESTABLISHED，后续双向流量自动放行。',
    statefulTable: [{ id: 'conn1', srcIp: '192.168.1.10', srcPort: 54321, dstIp: '10.0.0.80', dstPort: 80, protocol: 'TCP' as const, state: 'ESTABLISHED' as ConnState, startTime: 0, lastActivity: 0, direction: 'outbound' as const }],
    packetFilterRules: [
      { id: 1, action: 'permit', srcIp: '192.168.1.0/24', dstIp: 'any', srcPort: 'any', dstPort: 'any', protocol: 'tcp', direction: 'out', match: false },
      { id: 2, action: 'deny', srcIp: 'any', dstIp: '192.168.1.0/24', srcPort: 'any', dstPort: 'any', protocol: 'any', direction: 'in', match: true },
    ],
  },
  { 
    id: 'data', 
    title: '④ 数据双向传输', 
    desc: '连接已建立。包过滤：出站数据允许，但回程数据需规则允许；状态检测：双向流量通过状态表自动放行。',
    statefulTable: [{ id: 'conn1', srcIp: '192.168.1.10', srcPort: 54321, dstIp: '10.0.0.80', dstPort: 80, protocol: 'TCP' as const, state: 'ESTABLISHED' as ConnState, startTime: 0, lastActivity: 0, direction: 'outbound' as const }],
    packetFilterRules: [
      { id: 1, action: 'permit', srcIp: '192.168.1.0/24', dstIp: 'any', srcPort: 'any', dstPort: 'any', protocol: 'tcp', direction: 'out', match: true },
      { id: 2, action: 'deny', srcIp: 'any', dstIp: '192.168.1.0/24', srcPort: 'any', dstPort: 'any', protocol: 'any', direction: 'in', match: false },
    ],
  },
  { 
    id: 'attack', 
    title: '⑤ 攻击者伪造ACK被阻断', 
    desc: '⚠️ 关键差异！攻击者发送伪造ACK（无对应SYN记录）。包过滤：匹配规则"源:any→目的:内网"，可能被允许⚠️；状态检测：状态表无此连接记录→丢弃✅。',
    statefulTable: [{ id: 'conn1', srcIp: '192.168.1.10', srcPort: 54321, dstIp: '10.0.0.80', dstPort: 80, protocol: 'TCP' as const, state: 'ESTABLISHED' as ConnState, startTime: 0, lastActivity: 0, direction: 'outbound' as const }],
    packetFilterRules: [
      { id: 1, action: 'permit', srcIp: '192.168.1.0/24', dstIp: 'any', srcPort: 'any', dstPort: 'any', protocol: 'tcp', direction: 'out', match: false },
      { id: 2, action: 'deny', srcIp: 'any', dstIp: '192.168.1.0/24', srcPort: 'any', dstPort: 'any', protocol: 'any', direction: 'in', match: true },
    ],
    attackPacket: { srcIp: '203.0.113.50', dstIp: '192.168.1.10', srcPort: 8888, dstPort: 80, protocol: 'tcp', flags: 'ACK', seq: 99999 },
  },
  { 
    id: 'timeout', 
    title: '⑥ 连接关闭/超时清理', 
    desc: '连接关闭后，状态检测防火墙将状态表条目从ESTABLISHED→FIN_WAIT→CLOSED并清除。包过滤无状态概念，无法追踪连接生命周期。',
    statefulTable: [{ id: 'conn1', srcIp: '192.168.1.10', srcPort: 54321, dstIp: '10.0.0.80', dstPort: 80, protocol: 'TCP' as const, state: 'CLOSED' as ConnState, startTime: 0, lastActivity: 0, direction: 'outbound' as const }],
    packetFilterRules: [
      { id: 1, action: 'permit', srcIp: '192.168.1.0/24', dstIp: 'any', srcPort: 'any', dstPort: 'any', protocol: 'tcp', direction: 'out', match: null },
      { id: 2, action: 'deny', srcIp: 'any', dstIp: '192.168.1.0/24', srcPort: 'any', dstPort: 'any', protocol: 'any', direction: 'in', match: null },
    ],
  },
];

const STATE_COLORS: Record<ConnState, string> = {
  LISTEN: '#6b7280',
  SYN_SENT: '#f59e0b',
  SYN_RCVD: '#3b82f6',
  ESTABLISHED: '#22c55e',
  FIN_WAIT_1: '#f97316',
  FIN_WAIT_2: '#f97316',
  TIME_WAIT: '#8b5cf6',
  CLOSING: '#ec4899',
  CLOSE_WAIT: '#06b6d4',
  LAST_ACK: '#84cc16',
  CLOSED: '#6b7280',
};

  const SCENE_DATA = {
  id: 'stateful-firewall',
  title: '状态防火墙（Stateful Firewall）',
  description: '学习TCP连接状态跟踪、状态表维护机制，以及如何防御SYN Flood攻击和伪造ACK攻击。基于网络规划师考试大纲重点',
  phase: 3 as const,
  category: '网络安全',
  difficulty: 'medium' as const,
  duration: '15-20分钟',
};

// 考试知识点（网络规划师考点）
const EXAM_POINTS = [
  {
    title: '状态表维护机制',
    points: [
      'TCP三次握手：SYN→SYN-ACK→ACK建立ESTABLISHED连接',
      '状态表超时管理：SYN_RCVD超时30秒，ESTABLISHED超时30分钟',
      '连接状态迁移：LISTEN→SYN_SENT→SYN_RCVD→ESTABLISHED→FIN_WAIT→TIME_WAIT→CLOSED',
      '序列号验证：防止伪造ACK攻击的关键机制'
    ],
    icon: '📋'
  },
  {
    title: '防御攻击类型',
    points: [
      'SYN Flood防御：限制SYN包速率，SYN cookies技术',
      '伪造ACK阻断：检查ACK是否匹配状态表中的序列号',
      '状态劫持防御：实时验证TCP连接状态完整性',
      'DoS攻击缓解：连接数限制和速率控制'
    ],
    icon: '🛡️'
  },
  {
    title: '防火墙对比',
    points: [
      '包过滤防火墙：基于ACL规则，无状态跟踪',
      '状态防火墙：维护连接状态表，上下文感知',
      '应用层防火墙：L7深度检查，内容过滤',
      '下一代防火墙(NGFW)：集成威胁情报，智能防护'
    ],
    icon: '📊'
  },
  {
    title: '配置要点',
    points: [
      '状态表大小配置：根据网络规模调整',
      '超时时间设置：平衡安全与可用性',
      '连接速率限制：防御DDoS攻击',
      '日志记录策略：审计和监控'
    ],
    icon: '⚙️'
  }
];

export function StatefulFirewallScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeFirewall, setActiveFirewall] = useState<'packet-filter' | 'stateful' | 'both'>('both');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [attackBlocked, setAttackBlocked] = useState(false);
  const [packetFilterBlocked, setPacketFilterBlocked] = useState<boolean | null>(null);
  const [attackType, setAttackType] = useState<'SYN-Flood' | 'Spoofed-ACK' | 'Session-Hijacking' | null>(null);
  const [attackPackets, setAttackPackets] = useState<number>(0);
  const [connectionStats, setConnectionStats] = useState({
    established: 1,
    syn_rcvd: 0,
    syn_sent: 0,
    total: 1,
    blocked: 0
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const now = () => Math.floor((Date.now() - startTimeRef.current) / 1000);

  const currentStepData = STEPS[currentStep];

  // 执行步骤
  const executeStep = useCallback((stepIdx: number) => {
    setCurrentStep(stepIdx);
    
    // 根据步骤类型设置攻击模拟
    if (stepIdx === 5) {
      // 攻击步骤：伪造ACK攻击
      setAttackType('Spoofed-ACK');
      setAttackPackets(5);
      
      // 模拟包过滤可能放行（取决于配置），状态检测必定阻断
      const configIssue = Math.random() > 0.5;
      setPacketFilterBlocked(configIssue);
      setAttackBlocked(true);
      setConnectionStats({
        established: 1,
        syn_rcvd: 0,
        syn_sent: 0,
        total: 1,
        blocked: 1
      });
    } else if (stepIdx === 4) {
      // 数据传输步骤：模拟SYN Flood防御
      setAttackType('SYN-Flood');
      setAttackPackets(0);
      setConnectionStats({
        established: 1,
        syn_rcvd: 0,
        syn_sent: 0,
        total: 1,
        blocked: 0
      });
    } else {
      setAttackType(null);
      setAttackPackets(0);
      setAttackBlocked(false);
      setPacketFilterBlocked(null);
      
      // 更新连接状态统计
      const stats = {
        established: stepIdx >= 3 ? 1 : 0,
        syn_rcvd: stepIdx === 2 ? 1 : 0,
        syn_sent: stepIdx === 1 ? 1 : 0,
        total: 1,
        blocked: 0
      };
      setConnectionStats(stats);
    }
  }, []);

  // 下一步
  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      executeStep(currentStep + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentStep, executeStep]);

  // 自动播放
  useEffect(() => {
    if (isPlaying) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (currentStep < STEPS.length - 1) {
          nextStep();
        } else {
          setIsPlaying(false);
        }
      }, 2500);
    }
    return clearTimer;
  }, [isPlaying, currentStep, nextStep, clearTimer]);

  // 重置
  const handleReset = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    executeStep(0);
  }, [clearTimer, executeStep]);

  // 开始/暂停
  const handlePlayPause = useCallback(() => {
    if (!isPlaying && currentStep === STEPS.length - 1) {
      handleReset();
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(p => !p);
    }
  }, [isPlaying, currentStep, handleReset]);

  const renderPacketFilterPanel = () => (
    <div className="flex-1 bg-slate-900/60 border border-amber-700/40 rounded-xl p-4 flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Filter className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-200">包过滤防火墙 (Packet Filter)</span>
      </div>
      
      {/* 防火墙特点说明 */}
      <div className="text-xs text-slate-400 mb-3 p-2 bg-slate-800/50 rounded-lg">
        <span className="text-amber-300 font-medium">工作原理：</span>
        仅检查每个数据包的头部字段（源IP、目的IP、源端口、目的端口、协议类型），<span className="text-slate-500">无法识别连接上下文</span>
      </div>

      {/* 规则表 */}
      <div className="flex-shrink-0">
        <div className="text-xs text-slate-500 mb-2">ACL规则表</div>
        <div className="space-y-1.5">
          {currentStepData.packetFilterRules.map(rule => (
            <div 
              key={rule.id}
              className={`text-xs font-mono p-2 rounded-lg border transition-all ${
                rule.match === true 
                  ? 'bg-green-900/30 border-green-600/50' 
                  : rule.match === false 
                    ? 'bg-slate-800/50 border-slate-700/50' 
                    : 'bg-slate-800/30 border-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-bold ${
                  rule.action === 'permit' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {rule.action.toUpperCase()}
                </span>
                <span className="text-slate-500">#{rule.id}</span>
                {rule.match === true && (
                  <span className="ml-auto text-[10px] bg-green-600/50 px-1.5 py-0.5 rounded text-green-300">匹配</span>
                )}
              </div>
              <div className="text-slate-400 mt-1">
                {rule.srcIp} → {rule.dstIp} | {rule.protocol.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 决策结果 */}
      <div className="mt-auto pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-500 mb-2">当前决策</div>
        {currentStep === 5 ? (
          // 攻击场景：包过滤的决策
          <div className={`p-3 rounded-lg ${
            packetFilterBlocked 
              ? 'bg-red-900/30 border border-red-600/50' 
              : 'bg-yellow-900/30 border border-yellow-600/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {packetFilterBlocked ? (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-bold text-red-300">已阻断 ⚠️</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-300">已放行 ⚠️</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {packetFilterBlocked 
                ? '规则2匹配：外部→内部流量被拒绝'
                : '包过滤检查ACK标志，但无法识别这是伪造数据包！'
              }
            </p>
            {!packetFilterBlocked && (
              <div className="mt-2 p-2 bg-red-900/40 rounded text-[10px] text-red-300">
                ⚠️ 安全风险：若入站规则配置不当，伪造ACK可能穿透防火墙
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">逐包检查中...</span>
            </div>
            <p className="text-xs text-slate-500">
              无状态追踪，无法识别这是完整TCP握手的一部分
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStatefulPanel = () => (
    <div className="flex-1 bg-slate-900/60 border border-purple-700/40 rounded-xl p-4 flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Database className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-semibold text-purple-200">状态检测防火墙 (Stateful)</span>
      </div>
      
      {/* 防火墙特点说明 */}
      <div className="text-xs text-slate-400 mb-3 p-2 bg-slate-800/50 rounded-lg">
        <span className="text-purple-300 font-medium">工作原理：</span>
        维护连接状态表，跟踪完整会话上下文，<span className="text-green-400">状态表命中则放行</span>
      </div>

      {/* 状态表 */}
      <div className="flex-shrink-0">
        <div className="text-xs text-slate-500 mb-2">连接状态表</div>
        <div className="space-y-1.5">
          {currentStepData.statefulTable.length > 0 ? (
            currentStepData.statefulTable.map(entry => (
              <div 
                key={entry.id}
                className="text-xs font-mono p-2 rounded-lg border"
                style={{ 
                  borderColor: STATE_COLORS[entry.state] + '60', 
                  backgroundColor: STATE_COLORS[entry.state] + '15' 
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold" style={{ color: STATE_COLORS[entry.state] }}>
                    {entry.state}
                  </span>
                  <span className="text-slate-500">→ {entry.id}</span>
                </div>
                <div className="text-slate-400">
                  {entry.srcIp}:{entry.srcPort} → {entry.dstIp}:{entry.dstPort}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-600 p-3 text-center bg-slate-800/30 rounded-lg">
              状态表为空
            </div>
          )}
        </div>
      </div>

      {/* 决策结果 */}
      <div className="mt-auto pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-500 mb-2">当前决策</div>
        {currentStep === 5 ? (
          <div className="p-3 bg-green-900/30 border border-green-600/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-bold text-green-300">已阻断 ✅</span>
            </div>
            <p className="text-xs text-slate-400">
              状态表中未找到攻击者(203.0.113.50:8888)的连接记录
            </p>
            <div className="mt-2 p-2 bg-green-900/40 rounded text-[10px] text-green-300">
              ✅ 安全：伪造ACK因无对应SYN记录被正确阻断
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">状态表命中</span>
            </div>
            <p className="text-xs text-slate-400">
              {currentStep >= 1 && currentStep < 5 
                ? `连接 ${currentStepData.statefulTable[0]?.state || ''}，数据包放行`
                : '等待连接建立...'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderScene = () => (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* 顶部：网络拓扑可视化 */}
      <div className="flex-shrink-0 bg-slate-800/80 border border-slate-700 rounded-xl p-5 relative overflow-hidden">
        {/* 拓扑节点 */}
        <div className="flex items-center justify-between relative h-28">
          
          {/* 客户端 */}
          <div className="flex flex-col items-center gap-2 z-10">
            <motion.div
              className="w-16 h-16 rounded-xl bg-blue-900/60 border-2 border-blue-500 flex items-center justify-center"
              animate={currentStep === 1 || currentStep === 3 || currentStep === 4 ? { borderColor: ['#3b82f6', '#93c5fd', '#3b82f6'] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Wifi className="w-8 h-8 text-blue-400" />
            </motion.div>
            <span className="text-xs text-slate-300 font-mono">内网客户端<br/><span className="text-slate-500">192.168.1.10</span></span>
          </div>

          {/* 防火墙组 */}
          <div className="flex flex-col items-center gap-3 z-10">
            <div className="flex gap-4">
              {/* 包过滤防火墙 */}
              <motion.div
                className="flex flex-col items-center gap-1"
                animate={currentStep === 5 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="w-16 h-16 rounded-xl bg-amber-900/40 border-2 border-amber-600 flex flex-col items-center justify-center gap-1"
                  animate={
                    currentStep === 5 
                      ? packetFilterBlocked
                        ? { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.2)' }
                        : { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.2)' }
                      : { borderColor: '#f59e0b' }
                  }
                >
                  <Filter className="w-6 h-6 text-amber-400" />
                  <span className="text-[8px] text-amber-300">包过滤</span>
                </motion.div>
                <span className="text-[10px] text-amber-400 font-medium">ACL</span>
              </motion.div>

              {/* 状态检测防火墙 */}
              <motion.div
                className="flex flex-col items-center gap-1"
                animate={currentStep === 5 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="w-16 h-16 rounded-xl bg-purple-900/40 border-2 border-purple-500 flex flex-col items-center justify-center gap-1"
                  animate={
                    currentStep === 5 
                      ? { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.2)' }
                      : { borderColor: '#a855f7' }
                  }
                >
                  <Shield className="w-6 h-6 text-purple-400" />
                  <span className="text-[8px] text-purple-300">状态检测</span>
                </motion.div>
                <span className="text-[10px] text-purple-400 font-medium">Stateful</span>
              </motion.div>
            </div>
          </div>

          {/* 服务器 */}
          <div className="flex flex-col items-center gap-2 z-10">
            <motion.div
              className="w-16 h-16 rounded-xl bg-green-900/60 border-2 border-green-500 flex items-center justify-center"
              animate={currentStep === 2 || currentStep === 4 ? { borderColor: ['#22c55e', '#86efac', '#22c55e'] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Server className="w-8 h-8 text-green-400" />
            </motion.div>
            <span className="text-xs text-slate-300 font-mono">Web服务器<br/><span className="text-slate-500">10.0.0.80</span></span>
          </div>

          {/* 攻击者 */}
          <div className="flex flex-col items-center gap-2 z-10">
            <motion.div
              className="w-16 h-16 rounded-xl bg-red-900/60 border-2 border-red-700 flex items-center justify-center"
              animate={currentStep === 5 ? { borderColor: ['#ef4444', '#fca5a5', '#ef4444'] } : { borderColor: '#7f1d1d' }}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </motion.div>
            <span className="text-xs text-slate-300 font-mono">攻击者<br/><span className="text-slate-500">203.0.113.50</span></span>
          </div>

          {/* 连线 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {/* 客户端到防火墙组 */}
            <line x1="12%" y1="50%" x2="40%" y2="50%" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
            {/* 防火墙组到服务器 */}
            <line x1="60%" y1="50%" x2="72%" y2="50%" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
            {/* 攻击者到防火墙（虚线红色） */}
            <line x1="88%" y1="50%" x2="55%" y2="50%" stroke="#7f1d1d" strokeWidth="1.5" strokeDasharray="6 3" />

            {/* 数据包动画（增强版） */}
            {currentStep === 1 && (
              <>
                <motion.circle cx="25%" cy="50%" r="6" fill="#f59e0b"
                  animate={{ cx: ['12%', '45%'], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <motion.text x="28%" y="48%" fill="#f59e0b" fontSize="8" fontWeight="bold"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  SYN
                </motion.text>
              </>
            )}
            {currentStep === 2 && (
              <>
                <motion.circle cx="55%" cy="50%" r="6" fill="#3b82f6"
                  animate={{ cx: ['55%', '12%'], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <motion.text x="52%" y="48%" fill="#3b82f6" fontSize="8" fontWeight="bold"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  SYN-ACK
                </motion.text>
              </>
            )}
            {currentStep === 3 && (
              <>
                <motion.circle cx="12%" cy="50%" r="6" fill="#22c55e"
                  animate={{ cx: ['12%', '55%'], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <motion.text x="15%" y="48%" fill="#22c55e" fontSize="8" fontWeight="bold"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  ACK
                </motion.text>
              </>
            )}
            {currentStep === 4 && (
              <>
                <motion.circle cx="12%" cy="45%" r="5" fill="#22c55e"
                  animate={{ cx: ['12%', '72%'], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0 }}
                />
                <motion.text x="15%" y="43%" fill="#22c55e" fontSize="8" fontWeight="bold"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0 }}
                >
                  DATA
                </motion.text>
                <motion.circle cx="72%" cy="55%" r="5" fill="#6366f1"
                  animate={{ cx: ['72%', '12%'], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.75 }}
                />
                <motion.text x="69%" y="53%" fill="#6366f1" fontSize="8" fontWeight="bold"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.75 }}
                >
                  RESPONSE
                </motion.text>
              </>
            )}
            {currentStep === 5 && (
              <>
                <motion.circle cx="88%" cy="50%" r="6" fill="#ef4444"
                  animate={{ cx: ['88%', '50%'], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <motion.text x="85%" y="48%" fill="#ef4444" fontSize="8" fontWeight="bold"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  ATTACK
                </motion.text>
                
                {/* 状态防火墙阻断效果 */}
                {attackBlocked && (
                  <motion.path
                    d="M50% 45% L48% 55% L52% 55% L50% 45%"
                    fill="#22c55e"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                )}
              </>
            )}
          </svg>

          {/* 攻击阻断标志 */}
          <AnimatePresence>
            {attackBlocked && currentStep === 5 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-2 right-4 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold z-20"
              >
                🛡️ 攻击已处理
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 事件说明 */}
        {currentStepData && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-xs text-center font-mono px-3 py-1.5 bg-slate-900/60 rounded-lg text-slate-300 border border-slate-600"
          >
            {currentStepData.title}
          </motion.div>
        )}
      </div>

      {/* 中部：两种防火墙对比 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：包过滤防火墙 */}
        {renderPacketFilterPanel()}

        {/* 中间对比区 */}
        <div className="w-44 flex-shrink-0 flex flex-col gap-3">
          {/* 步骤说明 */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex-shrink-0">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">步骤 {currentStep + 1}/{STEPS.length}</h3>
            <div className="text-sm font-bold text-white mb-1">{currentStepData.title.split(' ')[0]} {currentStepData.title.split(' ').slice(1).join(' ')}</div>
            <p className="text-xs text-slate-400 leading-relaxed">{currentStepData.desc}</p>
          </div>

          {/* 步骤导航 */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => { clearTimer(); setIsPlaying(false); executeStep(idx); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  idx === currentStep 
                    ? 'bg-purple-600/40 border border-purple-500 text-purple-200 font-semibold' 
                    : idx < currentStep 
                      ? 'bg-slate-800/60 border border-slate-600 text-slate-400'
                      : 'bg-slate-900/40 border border-slate-700/50 text-slate-600'
                }`}
              >
                <span className={`mr-2 ${idx < currentStep ? 'text-green-400' : idx === currentStep ? 'text-purple-300' : 'text-slate-600'}`}>
                  {idx < currentStep ? '✓' : `${idx + 1}`}
                </span>
                {step.title.split('①').join('').split('②').join('').split('③').join('').split('④').join('').split('⑤').join('').split('⑥').join('').split(' ').slice(1).join(' ')}
              </button>
            ))}
          </div>

          {/* 控制按钮 */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handlePlayPause}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-xs font-semibold transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {isPlaying ? '暂停' : currentStep === STEPS.length - 1 ? '重播' : '播放'}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (currentStep === 5) {
                  setAttackPackets(attackPackets + 1);
                  setConnectionStats({
                    ...connectionStats,
                    blocked: connectionStats.blocked + 1
                  });
                }
              }}
              className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-xs transition-colors"
              disabled={currentStep !== 5}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 核心差异提示 */}
          <div className="bg-gradient-to-br from-amber-900/30 to-purple-900/30 border border-amber-700/30 rounded-xl p-3">
            <div className="text-xs font-semibold text-amber-300 mb-2">🔑 核心差异（考试重点）</div>
            <ul className="text-[10px] text-slate-400 space-y-1">
              <li className="flex items-start gap-1">
                <span className="text-amber-400">|</span>
                <span><b className="text-slate-300">包过滤防火墙</b>：基于ACL规则，无状态跟踪</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-purple-400">|</span>
                <span><b className="text-slate-300">状态防火墙</b>：维护连接状态表，上下文感知</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-red-400">|</span>
                <span><b className="text-slate-300">防御伪造ACK</b>：包过滤可能放行，状态防火墙必阻断</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-green-400">|</span>
                <span><b className="text-slate-300">SYN Flood防御</b>：状态防火墙支持SYN cookies、限速</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-blue-400">|</span>
                <span><b className="text-slate-300">性能对比</b>：包过滤性能高，状态防火墙消耗内存</span>
              </li>
            </ul>
            
            {/* 考试要点 */}
            <div className="mt-3 pt-2 border-t border-slate-700/50">
              <div className="text-[10px] text-slate-500 mb-1">📝 考试要点</div>
              <div className="text-[9px] text-slate-400">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-yellow-400">✓</span>
                  <span>TCP三次握手状态跟踪</span>
                </div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-yellow-400">✓</span>
                  <span>状态表超时管理机制</span>
                </div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-yellow-400">✓</span>
                  <span>SYN Flood防御技术</span>
                </div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-yellow-400">✓</span>
                  <span>包过滤vs状态防火墙对比</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：状态检测防火墙 */}
        {renderStatefulPanel()}
      </div>

      {/* 底部：攻击模拟演示区域 */}
      <div className="flex gap-4">
        {/* 左侧：攻击模拟控制 */}
        <div className="w-2/3 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-400">🚨 攻击模拟演示</div>
            <div className="flex gap-2">
              <button 
                onClick={() => setAttackType('SYN-Flood')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  attackType === 'SYN-Flood' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                }`}
              >
                SYN Flood攻击
              </button>
              <button 
                onClick={() => setAttackType('Spoofed-ACK')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  attackType === 'Spoofed-ACK' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-orange-900/40 text-orange-300 hover:bg-orange-900/60'
                }`}
              >
                伪造ACK攻击
              </button>
              <button 
                onClick={() => setAttackType('Session-Hijacking')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  attackType === 'Session-Hijacking' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/60'
                }`}
              >
                会话劫持攻击
              </button>
            </div>
          </div>
          
          {/* 攻击详情显示 */}
          {attackType && (
            <div className="mb-4 p-3 rounded-lg bg-slate-900/60 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-bold text-slate-300">
                  {attackType === 'SYN-Flood' ? 'SYN Flood攻击' : 
                   attackType === 'Spoofed-ACK' ? '伪造ACK攻击' : 
                   '会话劫持攻击'}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-2">
                {attackType === 'SYN-Flood' && (
                  <>
                    <p>攻击方式：攻击者发送大量SYN包但不完成握手，耗尽服务器半连接队列。</p>
                    <p>包过滤防火墙：<span className="text-red-300">无法识别恶意SYN，无法防御</span></p>
                    <p>状态防火墙：<span className="text-green-300">通过SYN cookies、SYN限速等机制防御</span></p>
                  </>
                )}
                {attackType === 'Spoofed-ACK' && (
                  <>
                    <p>攻击方式：攻击者发送伪造的ACK包，尝试绕过防火墙规则。</p>
                    <p>包过滤防火墙：<span className="text-red-300">可能放行伪造ACK包</span></p>
                    <p>状态防火墙：<span className="text-green-300">检查状态表和序列号，阻断非法ACK</span></p>
                  </>
                )}
                {attackType === 'Session-Hijacking' && (
                  <>
                    <p>攻击方式：截获合法TCP连接，插入伪造数据包。</p>
                    <p>包过滤防火墙：<span className="text-red-300">无法检测会话劫持</span></p>
                    <p>状态防火墙：<span className="text-green-300">检测异常序列号变化，阻止劫持</span></p>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* 攻击统计信息 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg">
              <div className="text-[10px] text-slate-500 mb-1">攻击数据包</div>
              <div className="text-xl font-bold text-red-400">{attackPackets}</div>
              <div className="text-[10px] text-slate-600">发送数量</div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg">
              <div className="text-[10px] text-slate-500 mb-1">状态表连接</div>
              <div className="text-xl font-bold text-green-400">{connectionStats.established}</div>
              <div className="text-[10px] text-slate-600">活跃连接数</div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg">
              <div className="text-[10px] text-slate-500 mb-1">阻断攻击</div>
              <div className="text-xl font-bold text-purple-400">{connectionStats.blocked}</div>
              <div className="text-[10px] text-slate-600">成功防御</div>
            </div>
          </div>
        </div>
        
        {/* 右侧：考试知识点 */}
        <div className="w-1/3 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
          <div className="text-xs font-semibold text-slate-400 mb-3">📚 网络规划师考点</div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {EXAM_POINTS.map((point, idx) => (
              <div key={idx} className="bg-slate-900/50 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{point.icon}</span>
                  <span className="text-xs font-bold text-slate-300">{point.title}</span>
                </div>
                <ul className="text-[10px] text-slate-400 space-y-1">
                  {point.points.map((item, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SceneLayout scene={SCENE_DATA} showSidebar={false}>
      {renderScene()}
    </SceneLayout>
  );
}
