import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import { SceneNavigation } from '../../../components/SceneNavigation';
import { 
  Building2, 
  Server, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Clock,
  Globe,
  Zap,
  Wifi,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  User
} from 'lucide-react';

// ============================================================
// 架构常量
// ============================================================
const DATA_CENTERS = [
  {
    id: 'production',
    name: '生产中心',
    sub: '北京',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.15)',
    borderColor: '#3b82f6',
    rtt: 5,       // 用户到该中心的基准延迟(ms)
    services: [
      { name: '核心业务', status: 'running' },
      { name: '数据库', status: 'running' },
      { name: 'Web服务', status: 'running' }
    ]
  },
  {
    id: 'sameCity',
    name: '同城灾备',
    sub: '北京',
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.15)',
    borderColor: '#22c55e',
    rtt: 12,
    services: [
      { name: '核心业务', status: 'standby' },
      { name: '数据库', status: 'standby' },
      { name: 'Web服务', status: 'standby' }
    ]
  },
  {
    id: 'remote',
    name: '异地灾备',
    sub: '上海',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.15)',
    borderColor: '#f59e0b',
    rtt: 45,
    services: [
      { name: '核心业务', status: 'standby' },
      { name: '数据库', status: 'standby' },
      { name: 'Web服务', status: 'standby' }
    ]
  }
];

// 用户节点
const USERS = [
  { id: 'u1', name: '北京用户', city: '北京', x: 5, y: 15, color: '#06b6d4' },
  { id: 'u2', name: '上海用户', city: '上海', x: 5, y: 40, color: '#8b5cf6' },
  { id: 'u3', name: '广州用户', city: '广州', x: 5, y: 65, color: '#ec4899' },
  { id: 'u4', name: '成都用户', city: '成都', x: 5, y: 90, color: '#f97316' },
];

// 故障场景
type FailureScenario = 'production' | 'sameCity' | 'remote' | 'region' | null;
type FailoverPhase = 'normal' | 'detecting' | 'switching' | 'recovering' | null;
type DCStatus = 'active' | 'standby' | 'failed' | 'switching';

interface DCState {
  id: string;
  status: DCStatus;
  currentRTT: number;
}

interface Request {
  id: number;
  userId: string;
  status: 'pending' | 'success' | 'failed' | 'redirecting';
  responseTime: number;
  timestamp: number;
  targetDC: string;
}

interface FailoverStep {
  id: string;
  title: string;
  desc: string;
}

// ============================================================
// 核心组件
// ============================================================

// 用户节点
function UserNode({ user, activeDC, responseTimes }: {
  user: typeof USERS[0];
  activeDC: string;
  responseTimes: Record<string, number>;
}) {
  const rtt = responseTimes[activeDC] ?? 0;
  const isConnected = activeDC !== null;
  return (
    <motion.div
      className="absolute"
      style={{ left: `${user.x}%`, top: `${user.y}%` }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: user.color }}>
          {user.city[0]}
        </div>
        <div className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1">
          <div className="text-xs font-medium text-slate-200">{user.city}用户</div>
          <div className="flex items-center gap-1 text-[10px]">
            {isConnected ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-slate-400">RTT: <span className="text-green-400 font-mono">{rtt}ms</span></span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-red-400">断开</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// DNS/GSLB 调度器
function GSLBNode({ activeDC, failoverPhase, onSwitching }: {
  activeDC: string;
  failoverPhase: FailoverPhase;
  onSwitching: boolean;
}) {
  return (
    <motion.div
      className="absolute"
      style={{ left: '33%', top: '50%', transform: 'translate(-50%, -50%)' }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className={`
        relative p-4 rounded-2xl border-2 backdrop-blur-sm
        ${onSwitching ? 'bg-yellow-500/20 border-yellow-500 animate-pulse'
          : failoverPhase === 'detecting' ? 'bg-orange-500/20 border-orange-500 animate-pulse'
          : 'bg-cyan-500/20 border-cyan-500'}
      `}>
        {/* 外圈呼吸动画 */}
        {onSwitching && (
          <>
            <motion.div
              className="absolute inset-[-8px] rounded-2xl border border-yellow-400/50"
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </>
        )}

        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/30">
            <Globe className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="font-semibold text-cyan-300 text-sm">DNS/GSLB</div>
            <div className="text-[10px] text-cyan-400/70">全局负载均衡</div>
          </div>
        </div>

        {/* 指向当前活跃DC的指示 */}
        <div className="mt-2 flex items-center gap-1 text-[10px]">
          {onSwitching || failoverPhase === 'detecting' ? (
            <>
              <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />
              <span className="text-yellow-400">
                {failoverPhase === 'detecting' ? '健康检查中...' : '路由切换中...'}
              </span>
            </>
          ) : (
            <>
              <Zap className="w-3 h-3 text-green-400" />
              <span className="text-green-400">活跃节点: {activeDC || '—'}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// 数据中心节点
function DCNode({ dc, status, currentRTT, highlight }: {
  dc: typeof DATA_CENTERS[0];
  status: DCStatus;
  currentRTT: number;
  highlight: boolean;
}) {
  const statusConfig = {
    active: { label: '主节点', color: '#22c55e', bg: 'bg-green-500/20', border: 'border-green-500', glow: true },
    standby: { label: '待机', color: '#94a3b8', bg: 'bg-slate-700/50', border: 'border-slate-600', glow: false },
    failed: { label: '故障', color: '#ef4444', bg: 'bg-red-500/20', border: 'border-red-500', glow: false },
    switching: { label: '切换中', color: '#f59e0b', bg: 'bg-yellow-500/20', border: 'border-yellow-500', glow: false },
  }[status];

  return (
    <motion.div
      className="absolute"
      style={{
        // 布局: 左侧用户 → 中间GSLB → 右侧数据中心
        // 生产中心: 66%, 15% | 同城灾备: 85%, 40% | 异地灾备: 85%, 75%
        left: dc.id === 'production' ? '66%' : dc.id === 'sameCity' ? '85%' : '85%',
        top: dc.id === 'production' ? '15%' : dc.id === 'sameCity' ? '40%' : '75%',
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <motion.div
        className={`
          relative p-4 rounded-xl border-2 backdrop-blur-sm w-44
          ${statusConfig.bg} ${statusConfig.border}
          ${highlight ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-slate-900' : ''}
        `}
        animate={status === 'active' ? {
          boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 20px rgba(34,197,94,0.4)', '0 0 0px rgba(34,197,94,0)']
        } : status === 'switching' ? {
          boxShadow: ['0 0 0px rgba(245,158,11,0)', '0 0 20px rgba(245,158,11,0.4)', '0 0 0px rgba(245,158,11,0)']
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {/* 故障遮罩 */}
        <AnimatePresence>
          {status === 'failed' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-900/70 rounded-xl z-10 flex flex-col items-center justify-center gap-1"
            >
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <span className="text-red-200 font-bold text-xs">故障离线</span>
            </motion.div>
          )}
          {status === 'switching' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-yellow-900/50 rounded-xl z-10 flex flex-col items-center justify-center gap-1"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-5 h-5 text-yellow-400" />
              </motion.div>
              <span className="text-yellow-200 font-bold text-xs">启动接管</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 标题 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${dc.color}30` }}>
            <Building2 className="w-4 h-4" style={{ color: dc.color }} />
          </div>
          <div>
            <div className="font-semibold text-slate-200 text-sm">{dc.name}</div>
            <div className="text-[10px]" style={{ color: `${dc.color}80` }}>{dc.sub}</div>
          </div>
        </div>

        {/* 状态标签 */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusConfig.color }}
          />
          <span className="text-xs" style={{ color: statusConfig.color }}>{statusConfig.label}</span>
          {status === 'active' && (
            <span className="ml-auto text-[10px] text-green-400 font-mono">
              {currentRTT}ms
            </span>
          )}
        </div>

        {/* 服务 */}
        <div className="space-y-1">
          {dc.services.map((svc, idx) => (
            <div key={idx} className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded bg-black/20">
              <span className="text-slate-400">{svc.name}</span>
              <span className={
                status === 'active' ? 'text-green-400' :
                status === 'failed' ? 'text-red-400' :
                status === 'switching' ? 'text-yellow-400' : 'text-slate-600'
              }>
                {status === 'active' ? '● 运行' :
                 status === 'failed' ? '× 停止' :
                 status === 'switching' ? '◐ 启动' : '○ 待机'}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// 实时请求指示器
function RequestDot({ request }: { request: Request }) {
  const dc = DATA_CENTERS.find(d => d.id === request.targetDC);
  if (!dc) return null;

  // 定位到用户 → GSLB → DC 的位置插值
  const user = USERS.find(u => u.id === request.userId)!;
  // GSLB 中心位置 (与 SVG 一致)
  const gsx = 33;
  const gsy = 50;
  // DC 位置 (与 SVG positions 一致)
  const dcx = dc.id === 'production' ? 66 : 85;
  const dcy = dc.id === 'production' ? 15 : dc.id === 'sameCity' ? 40 : 75;
  const ux = user.x;
  const uy = user.y;

  const phase = request.status === 'pending' ? 0 : request.status === 'success' ? 1 : -1;

  return (
    <>
      {/* U→GSLB 段 */}
      <motion.circle
        r="1"
        fill={request.status === 'success' ? '#22c55e' : request.status === 'failed' ? '#ef4444' : '#06b6d4'}
        initial={{ cx: ux, cy: uy }}
        animate={{ cx: [ux, gsx], cy: [uy, gsy] }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* GSLB→DC 段 */}
      {request.status !== 'failed' && (
        <motion.circle
          r="1"
          fill={request.status === 'success' ? '#22c55e' : '#06b6d4'}
          initial={{ cx: gsx, cy: gsy }}
          animate={{ cx: [gsx, dcx], cy: [gsy, dcy] }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.5 }}
        />
      )}
    </>
  );
}

// RTT 仪表盘
function RTTDashboard({ dcStates, activeDC, failoverPhase }: {
  dcStates: DCState[];
  activeDC: string | null;
  failoverPhase: FailoverPhase;
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-600 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-slate-200">用户感知延迟 (RTT)</span>
        {failoverPhase === 'switching' && (
          <motion.span
            className="ml-auto px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            切换中 {failoverPhase}
          </motion.span>
        )}
      </div>

      {/* 活跃连接的 RTT 大表 */}
      {activeDC && (
        <div className="mb-3 p-3 rounded-lg bg-black/30 border border-slate-600">
          <div className="text-[10px] text-slate-500 mb-1">当前活跃连接 → {DATA_CENTERS.find(d => d.id === activeDC)?.name}</div>
          <div className="flex items-end gap-2">
            <motion.div
              className="text-3xl font-mono font-bold"
              style={{ color: dcStates.find(d => d.id === activeDC)?.currentRTT! < 20 ? '#22c55e' : '#f59e0b' }}
              key={dcStates.find(d => d.id === activeDC)?.currentRTT}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {dcStates.find(d => d.id === activeDC)?.currentRTT ?? '—'}
            </motion.div>
            <span className="text-slate-400 text-sm mb-1">ms</span>
            <div className="ml-auto text-[10px] text-slate-500">
              {dcStates.find(d => d.id === activeDC)?.currentRTT! < 20 ? '✓ 正常' : '⚠ 偏高'}
            </div>
          </div>
        </div>
      )}

      {/* 各节点 RTT 对比条 */}
      <div className="space-y-2">
        {DATA_CENTERS.map(dc => {
          const state = dcStates.find(s => s.id === dc.id);
          const isActive = dc.id === activeDC;
          const barWidth = Math.min(100, (state?.currentRTT ?? dc.rtt) / 1.2);
          return (
            <div key={dc.id} className="flex items-center gap-2">
              <div className="w-20 text-[10px] text-slate-400 truncate">{dc.name}</div>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: dc.color,
                    width: `${barWidth}%`
                  }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="w-10 text-right text-[10px] font-mono text-slate-300">
                {state?.currentRTT ?? dc.rtt}ms
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
              {state?.status === 'failed' && (
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* 切换提示 */}
      {failoverPhase === 'switching' && (
        <motion.div
          className="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div className="text-[10px] text-yellow-400">
            ⚡ 故障切换中，{activeDC ? `→ 路由更新到 ${DATA_CENTERS.find(d => d.id === activeDC)?.name}` : '等待DNS响应'}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// 用户请求日志
function RequestLog({ requests }: { requests: Request[] }) {
  const recent = requests.slice(-8).reverse();
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-600 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Wifi className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-slate-200">实时请求</span>
        <span className="ml-auto text-[10px] text-slate-500">{requests.length} 条</span>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        <AnimatePresence>
          {recent.map((req) => {
            const user = USERS.find(u => u.id === req.userId);
            const dc = DATA_CENTERS.find(d => d.id === req.targetDC);
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-black/20"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: user?.color }} />
                <span className="text-slate-400 w-14">{user?.city}</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                <span className="text-slate-400 w-14">{dc?.name}</span>
                <span className={`ml-auto font-mono ${
                  req.status === 'success' ? 'text-green-400' :
                  req.status === 'failed' ? 'text-red-400' :
                  req.status === 'redirecting' ? 'text-yellow-400' : 'text-slate-500'
                }`}>
                  {req.status === 'success' ? `${req.responseTime}ms` :
                   req.status === 'failed' ? '失败' :
                   req.status === 'redirecting' ? '重定向' : '...'}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {recent.length === 0 && (
          <div className="text-[10px] text-slate-600 text-center py-2">等待请求...</div>
        )}
      </div>
    </div>
  );
}

// 复制链路 SVG
function ReplicationLinks({ dcStates, showDataFlow, effectiveActiveDC, isSwitching }: {
  dcStates: DCState[];
  showDataFlow: boolean;
  effectiveActiveDC: string | null;
  isSwitching: boolean;
}) {
  // 数据中心在SVG viewBox中的位置(百分比)
  // 生产: 66%,15% | 同城灾备: 85%,40% | 异地灾备: 85%,75%
  const positions: Record<string, { x: number; y: number }> = {
    production: { x: 66, y: 15 },
    sameCity: { x: 85, y: 40 },
    remote: { x: 85, y: 75 },
  };

  const links = [
    { from: 'production', to: 'sameCity', mode: 'sync' as const, bandwidth: '10Gbps' },
    { from: 'production', to: 'remote', mode: 'async' as const, bandwidth: '1Gbps' },
  ];

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <filter id="flowGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {links.map((link, idx) => {
        const from = positions[link.from];
        const to = positions[link.to];
        const fromState = dcStates.find(s => s.id === link.from);
        const toState = dcStates.find(s => s.id === link.to);
        const failed = fromState?.status === 'failed' || toState?.status === 'failed';
        const color = link.mode === 'sync' ? '#3b82f6' : '#f59e0b';
        const brightColor = link.mode === 'sync' ? '#60a5fa' : '#fbbf24';

        return (
          <g key={idx}>
            {/* 底色链路 */}
            <line
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={failed ? '#475569' : color}
              strokeWidth="0.6"
              strokeDasharray={link.mode === 'async' ? '1.5,1.5' : '0'}
              opacity={failed ? 0.3 : 0.5}
            />
            {/* 中点标签 */}
            {!failed && (
              <g>
                <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r="1.2" fill={color} opacity="0.9" />
                <text
                  x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 2}
                  textAnchor="middle" fontSize="2" fill={color} opacity="0.8"
                >
                  {link.mode === 'sync' ? '同步' : '异步'} {link.bandwidth}
                </text>
              </g>
            )}
            {/* 数据流光点 */}
            {showDataFlow && !failed && (
              <motion.circle
                r="1"
                fill={brightColor}
                filter="url(#flowGlow)"
                initial={{ cx: from.x, cy: from.y }}
                animate={{ cx: [from.x, to.x], cy: [from.y, to.y] }}
                transition={{
                  duration: link.mode === 'sync' ? 1.5 : 3,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            )}
            {/* 失败划线 */}
            {failed && (
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="#ef4444"
                strokeWidth="1"
                opacity={0.6}
              />
            )}
          </g>
        );
      })}

      {/* 用户→GSLB 连接线 (静态背景) */}
      {USERS.map(user => (
        <line
          key={user.id}
          x1={user.x} y1={user.y}
          x2={33} y2={50}
          stroke="#06b6d4"
          strokeWidth="0.3"
          strokeDasharray="0.5,1"
          opacity="0.2"
        />
      ))}

      {/* GSLB→活跃DC 连接线 — 活跃连接有脉冲高亮 */}
      {DATA_CENTERS.map(dc => {
        const state = dcStates.find(s => s.id === dc.id);
        if (!state) return null;

        // 故障的不显示连接线
        if (state.status === 'failed') return null;

        const isActive = dc.id === effectiveActiveDC && !isSwitching;
        const isTarget = dc.id === effectiveActiveDC && isSwitching;

        return (
          <motion.line
            key={dc.id}
            x1={33} y1={50}
            x2={positions[dc.id].x} y2={positions[dc.id].y}
            stroke={isTarget ? '#f59e0b' : isActive ? '#22c55e' : '#475569'}
            strokeWidth={isActive || isTarget ? '0.8' : '0.3'}
            animate={isTarget ? {
              opacity: [0.4, 1, 0.4],
              strokeWidth: [0.5, 1.2, 0.5]
            } : isActive ? {
              opacity: [0.6, 1, 0.6],
              strokeWidth: [0.6, 1.0, 0.6]
            } : { opacity: 0.2 }}
            transition={isTarget ? { duration: 0.6, repeat: Infinity } : { duration: 2, repeat: Infinity }}
          />
        );
      })}

      {/* GSLB→活跃DC 数据流光点 (动画) */}
      {showDataFlow && effectiveActiveDC && dcStates.find(s => s.id === effectiveActiveDC)?.status !== 'failed' && (
        <motion.circle
          r="1.2"
          fill="#22c55e"
          filter="url(#flowGlow)"
          initial={{ cx: 33, cy: 50 }}
          animate={{
            cx: [33, positions[effectiveActiveDC].x],
            cy: [50, positions[effectiveActiveDC].y]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}

      {/* 用户→GSLB 数据流光点 (每个用户随机发流) */}
      {showDataFlow && USERS.map(user => (
        <motion.circle
          key={user.id}
          r="0.8"
          fill="#06b6d4"
          filter="url(#flowGlow)"
          initial={{ cx: user.x, cy: user.y }}
          animate={{
            cx: [user.x, 33],
            cy: [user.y, 50]
          }}
          transition={{
            duration: 1.5 + Math.random() * 0.5,
            repeat: Infinity,
            ease: 'easeOut',
            delay: USERS.findIndex(u => u.id === user.id) * 0.4
          }}
        />
      ))}
    </svg>
  );
}

// ============================================================
// 主场景组件
// ============================================================
export function DisasterRecoveryScene() {
  // 核心状态
  const [failureScenario, setFailureScenario] = useState<FailureScenario>(null);
  const [failoverPhase, setFailoverPhase] = useState<FailoverPhase>(null);
  const [activeDC, setActiveDC] = useState<string>('production');
  const [dcStates, setDCStates] = useState<DCState[]>([
    { id: 'production', status: 'active', currentRTT: 5 },
    { id: 'sameCity', status: 'standby', currentRTT: 12 },
    { id: 'remote', status: 'standby', currentRTT: 45 },
  ]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [failoverStrategy, setFailoverStrategy] = useState<'sameCity' | 'remote'>('sameCity');
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const requestIdRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 计算当前活跃节点（考虑故障）
  const effectiveActiveDC = useMemo(() => {
    if (failureScenario === 'production') {
      return failoverStrategy === 'sameCity' ? 'sameCity' : 'remote';
    }
    if (failureScenario === 'region') return 'remote';
    return activeDC;
  }, [failureScenario, failoverStrategy, activeDC]);

  // 活跃连接指示
  const isSwitching = failoverPhase === 'switching';

  // 启动请求模拟器
  const startRequestSimulator = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRequests(prev => {
        const newReq: Request = {
          id: ++requestIdRef.current,
          userId: USERS[Math.floor(Math.random() * USERS.length)].id,
          status: 'pending',
          responseTime: 0,
          timestamp: Date.now(),
          targetDC: effectiveActiveDC,
        };
        return [...prev.slice(-50), newReq];
      });
    }, 600);
  }, [effectiveActiveDC]);

  useEffect(() => {
    startRequestSimulator();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startRequestSimulator]);

  // 模拟请求完成
  useEffect(() => {
    const timer = setTimeout(() => {
      setRequests(prev => prev.map(r => {
        if (r.status !== 'pending') return r;
        const dc = DATA_CENTERS.find(d => d.id === r.targetDC);
        const state = dcStates.find(s => s.id === r.targetDC);
        if (!dc || !state) return { ...r, status: 'failed' as const, responseTime: 0 };
        if (state.status === 'failed') return { ...r, status: 'failed' as const, responseTime: 0 };
        if (isSwitching) return { ...r, status: 'redirecting' as const, responseTime: state.currentRTT };
        return {
          ...r,
          status: 'success' as const,
          responseTime: state.currentRTT + Math.floor(Math.random() * 5)
        };
      }));
    }, 200);
    return () => clearTimeout(timer);
  }, [requests, dcStates, isSwitching, effectiveActiveDC]);

  // 故障注入
  const injectFailure = (scenario: FailureScenario) => {
    if (failoverPhase) return;

    setFailureScenario(scenario);
    setFailoverPhase('detecting');

    // 阶段1: 健康检查 (1.5s)
    setTimeout(() => {
      setFailoverPhase('switching');

      if (scenario === 'production') {
        // 阶段2a: 生产中心立即标记故障
        const targetId = failoverStrategy === 'sameCity' ? 'sameCity' : 'remote';
        const standbyId = failoverStrategy === 'sameCity' ? 'remote' : 'sameCity';

        setDCStates([
          { id: 'production', status: 'failed', currentRTT: 0 },
          { id: 'sameCity', status: targetId === 'sameCity' ? 'switching' : 'standby', currentRTT: targetId === 'sameCity' ? 12 : 12 },
          { id: 'remote', status: targetId === 'remote' ? 'switching' : 'standby', currentRTT: targetId === 'remote' ? 45 : 45 },
        ]);

        // 阶段2b: 灾备中心启动完成 (1.5s)
        setTimeout(() => {
          setDCStates([
            { id: 'production', status: 'failed', currentRTT: 0 },
            { id: 'sameCity', status: targetId === 'sameCity' ? 'active' : 'standby', currentRTT: 12 },
            { id: 'remote', status: targetId === 'remote' ? 'active' : 'standby', currentRTT: 45 },
          ]);
          setActiveDC(targetId);
          // 阶段3: 切换完成 (0.5s)
          setTimeout(() => setFailoverPhase(null), 500);
        }, 1500);
      } else if (scenario === 'region') {
        // 区域灾难：生产+同城同时故障，切换到异地
        setTimeout(() => {
          setDCStates([
            { id: 'production', status: 'failed', currentRTT: 0 },
            { id: 'sameCity', status: 'failed', currentRTT: 0 },
            { id: 'remote', status: 'switching', currentRTT: 45 },
          ]);
        }, 300);
        setTimeout(() => {
          setDCStates([
            { id: 'production', status: 'failed', currentRTT: 0 },
            { id: 'sameCity', status: 'failed', currentRTT: 0 },
            { id: 'remote', status: 'active', currentRTT: 45 },
          ]);
          setActiveDC('remote');
          setTimeout(() => setFailoverPhase(null), 500);
        }, 1800);
      } else if (scenario === 'sameCity') {
        // 同城故障：生产继续
        setDCStates(prev => prev.map(dc => {
          if (dc.id === 'sameCity') return { ...dc, status: 'failed', currentRTT: 0 };
          return dc;
        }));
        setTimeout(() => setFailoverPhase(null), 1500);
      } else if (scenario === 'remote') {
        // 异地故障：生产继续
        setDCStates(prev => prev.map(dc => {
          if (dc.id === 'remote') return { ...dc, status: 'failed', currentRTT: 0 };
          return dc;
        }));
        setTimeout(() => setFailoverPhase(null), 1500);
      }
    }, 1500);
  };

  // 系统恢复
  const handleRecovery = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFailureScenario(null);
    setFailoverPhase(null);
    setActiveDC('production');
    setDCStates([
      { id: 'production', status: 'active', currentRTT: 5 },
      { id: 'sameCity', status: 'standby', currentRTT: 12 },
      { id: 'remote', status: 'standby', currentRTT: 45 },
    ]);
    setRequests([]);
    setCurrentStep(0);
    setTimeout(() => startRequestSimulator(), 500);
  };

  // 动画步骤
  const steps: FailoverStep[] = useMemo(() => {
    if (!failureScenario) {
      return [
        { id: 'normal', title: '正常运行', desc: '所有用户请求经DNS/GSLB调度至生产中心，RTT约5ms；同城灾备实时同步，异地灾备异步接收' },
        { id: 'sync', title: '数据复制', desc: `同城: 同步复制(RPO≈0, RTT 12ms) | 异地: 异步复制(RPO>0, RTT 45ms)` },
      ];
    }
    const ret = [
      { id: 'detect', title: '故障检测', desc: 'DNS/GSLB 持续健康检查(TCP探测/HTTP探测)，发现异常触发切换流程' },
      { id: 'switch', title: 'DNS 切换', desc: `GSLB 更新路由策略，将用户请求重定向至${failoverStrategy === 'sameCity' ? '同城灾备中心' : '异地灾备中心'}` },
      { id: 'redirect', title: '用户重连', desc: 'DNS TTL 过期后，客户端重新解析域名，建立到灾备中心的连接' },
      { id: 'service', title: '业务恢复', desc: '灾备中心接管业务，最新数据来自同步/异步复制通道' },
    ];
    if (failureScenario === 'region') {
      ret.splice(1, 0, { id: 'disaster', title: '区域灾难', desc: '同城区域级灾难，生产+同城同时故障，仅异地灾备可用' });
    }
    return ret;
  }, [failureScenario, failoverStrategy]);

  // 参数
  const parameters = [
    {
      id: 'failoverStrategy',
      name: '灾备切换策略',
      type: 'select' as const,
      value: failoverStrategy,
      options: [
        { value: 'sameCity', label: '同城优先 (RPO≈0)' },
        { value: 'remote', label: '异地优先 (防区域灾难)' },
      ],
      description: '生产中心故障时的首选灾备节点'
    },
    {
      id: 'showDataFlow',
      name: '显示数据流',
      type: 'boolean' as const,
      value: showDataFlow
    }
  ];

  const handleParameterChange = (id: string, value: string | number | boolean) => {
    if (id === 'failoverStrategy') setFailoverStrategy(value as 'sameCity' | 'remote');
    if (id === 'showDataFlow') setShowDataFlow(value as boolean);
  };

  const sceneData = {
    id: 'disaster-recovery',
    title: '两地三中心灾备架构',
    description: '生产中心 + 同城灾备 + 异地灾备，故障自动切换可视化',
    phase: 2 as const,
    category: '数据中心',
    duration: '8-10分钟',
    difficulty: 'hard' as const,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SceneNavigation currentSceneId="disaster-recovery" currentPhase={2} />

      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link to="/phase/2" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <h1 className="text-base font-semibold text-gray-900 dark:text-white">{sceneData.title}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{sceneData.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {failureScenario && (
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  failoverPhase ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 animate-pulse'
                    : 'bg-red-500/20 text-red-400 border-red-500/50'
                }`}>
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {failoverPhase === 'detecting' ? '健康检测中...' :
                   failoverPhase === 'switching' ? '路由切换中...' :
                   failureScenario === 'region' ? '区域灾难' :
                   `${DATA_CENTERS.find(d => d.id === failureScenario)?.name}故障`}
                </div>
              )}
              <div className="text-xs text-gray-400">{sceneData.duration}</div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:ml-64">
        <div className="grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 120px)' }}>

          {/* 左侧: 参数+控制 */}
          <div className="col-span-3 space-y-4">
            <ParameterPanel
              title="灾备配置"
              parameters={parameters}
              onChange={handleParameterChange}
            />

            {/* 故障模拟按钮 */}
            <div className="p-4 bg-slate-800 rounded-xl border border-slate-600">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">🎯 故障注入</h3>
              <div className="space-y-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">单点故障</div>
                <button
                  onClick={() => injectFailure('production')}
                  disabled={!!failoverPhase || !!failureScenario}
                  className="w-full py-2 px-3 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
                >
                  生产中心故障
                </button>
                <button
                  onClick={() => injectFailure('sameCity')}
                  disabled={!!failoverPhase || !!failureScenario}
                  className="w-full py-1.5 px-3 bg-orange-600/80 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs transition-all"
                >
                  同城灾备故障
                </button>
                <button
                  onClick={() => injectFailure('remote')}
                  disabled={!!failoverPhase || !!failureScenario}
                  className="w-full py-1.5 px-3 bg-amber-600/80 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs transition-all"
                >
                  异地灾备故障
                </button>

                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-3 mb-1">区域级灾难</div>
                <button
                  onClick={() => injectFailure('region')}
                  disabled={!!failoverPhase || !!failureScenario}
                  className="w-full py-2 px-3 bg-purple-600/80 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-all"
                >
                  区域灾难（生产+同城全挂）
                </button>

                {failureScenario && (
                  <button
                    onClick={handleRecovery}
                    className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <RefreshCw className="w-4 h-4" /> 恢复系统
                  </button>
                )}
              </div>
            </div>

            {/* RTT 仪表盘 */}
            <RTTDashboard dcStates={dcStates} activeDC={effectiveActiveDC} failoverPhase={failoverPhase} />

            {/* 请求日志 */}
            <RequestLog requests={requests} />
          </div>

          {/* 中间: 可视化主区域 (更大的拓扑空间) */}
          <div className="col-span-7 flex flex-col gap-4">
            {/* 拓扑画布 (加宽卡片) */}
            <div className="flex-1 bg-slate-900/80 rounded-xl border border-slate-700 p-6 relative overflow-hidden">
              {/* 背景网格 (40px 更疏朗) */}
              <div className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }} />

              {/* 复制链路（SVG层） */}
              <ReplicationLinks dcStates={dcStates} showDataFlow={showDataFlow} effectiveActiveDC={effectiveActiveDC} isSwitching={isSwitching} />

              {/* 用户节点 */}
              {USERS.map(user => (
                <UserNode
                  key={user.id}
                  user={user}
                  activeDC={effectiveActiveDC}
                  responseTimes={Object.fromEntries(dcStates.map(s => [s.id, s.currentRTT]))}
                />
              ))}

              {/* GSLB 调度器 */}
              <GSLBNode
                activeDC={effectiveActiveDC}
                failoverPhase={failoverPhase}
                onSwitching={isSwitching}
              />

              {/* 数据中心 */}
              {DATA_CENTERS.map(dc => {
                const state = dcStates.find(s => s.id === dc.id);
                return (
                  <DCNode
                    key={dc.id}
                    dc={dc}
                    status={state?.status ?? 'standby'}
                    currentRTT={state?.currentRTT ?? dc.rtt}
                    highlight={dc.id === effectiveActiveDC}
                  />
                );
              })}

              {/* 实时请求动画点 — 渲染每条 pending/success/failed 请求 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 50 }}>
                <defs>
                  <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%">
                    <feGaussianBlur stdDeviation="1.5" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                {requests.slice(-6).map(req => (
                  <RequestDot key={req.id} request={req} />
                ))}
              </svg>

              {/* 流向标签 */}
              <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-0.5 bg-cyan-400 rounded" />
                  <span className="text-cyan-400">用户→GSLB</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-0.5 bg-green-400 rounded" />
                  <span className="text-green-400">GSLB→活跃DC</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-0.5 bg-blue-400 rounded border-t border-dashed border-blue-400" />
                  <span className="text-blue-400">同步复制</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-0.5 bg-yellow-400 rounded border-t border-dashed border-yellow-400" />
                  <span className="text-yellow-400">异步复制</span>
                </div>
              </div>
            </div>

            {/* 动画播放器 */}
            <AnimationPlayer
              steps={steps}
              currentStep={currentStep}
              isPlaying={isAnimating}
              onPlay={() => setIsAnimating(true)}
              onPause={() => setIsAnimating(false)}
              onReset={handleRecovery}
              onStepChange={setCurrentStep}
            />
          </div>

          {/* 右侧: 信息面板 */}
          <div className="col-span-2 space-y-3">
            <InfoPanel
              title="两地三中心架构"
              content={
                <div className="space-y-2 text-sm">
                  {DATA_CENTERS.map(dc => (
                    <div key={dc.id} className="p-2 rounded-lg border" style={{ backgroundColor: dc.bgColor, borderColor: `${dc.color}50` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-3 h-3" style={{ color: dc.color }} />
                        <span className="font-medium" style={{ color: dc.color }}>{dc.name} <span className="text-xs text-slate-400">({dc.sub})</span></span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        基准延迟: {dc.rtt}ms | {dc.id === 'production' ? '承载所有业务' : dc.id === 'sameCity' ? '同步复制(RPO≈0)' : '异步复制(RPO>0)'}
                      </div>
                    </div>
                  ))}
                </div>
              }
            />

            <InfoPanel
              title="故障切换流程"
              content={
                <div className="space-y-2 text-xs">
                  {[
                    { step: '1', title: '健康检测', desc: 'DNS/GSLB 每5s发送TCP探测，3次失败触发切换', color: '#06b6d4' },
                    { step: '2', title: '路由更新', desc: 'GSLB 修改权重/优先级，DNS 响应指向灾备IP', color: '#f59e0b' },
                    { step: '3', title: 'DNS传播', desc: '客户端DNS缓存TTL过期，重新解析域名(通常<60s)', color: '#8b5cf6' },
                    { step: '4', title: '服务接管', desc: '灾备中心启动应用服务，数据库切换为可写', color: '#22c55e' },
                  ].map(item => (
                    <div key={item.step} className="flex gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${item.color}30`, color: item.color }}>
                        {item.step}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{item.title}</div>
                        <div className="text-slate-400">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            />

            <InfoPanel
              title="RPO/RTO 对比"
              content={
                <div className="space-y-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <div className="text-xs text-blue-400 font-medium">同城灾备</div>
                    <div className="grid grid-cols-2 gap-1 mt-1 text-[10px]">
                      <span className="text-slate-300">RPO: <span className="text-blue-300 font-mono">≈0</span></span>
                      <span className="text-slate-300">RTO: <span className="text-blue-300 font-mono">分钟级</span></span>
                    </div>
                  </div>
                  <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                    <div className="text-xs text-yellow-400 font-medium">异地灾备</div>
                    <div className="grid grid-cols-2 gap-1 mt-1 text-[10px]">
                      <span className="text-slate-300">RPO: <span className="text-yellow-300 font-mono">分钟~小时</span></span>
                      <span className="text-slate-300">RTO: <span className="text-yellow-300 font-mono">小时级</span></span>
                    </div>
                  </div>
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <div className="text-xs text-purple-400 font-medium">区域灾难</div>
                    <div className="grid grid-cols-2 gap-1 mt-1 text-[10px]">
                      <span className="text-slate-300">RPO: <span className="text-purple-300 font-mono">异步延迟</span></span>
                      <span className="text-slate-300">RTO: <span className="text-purple-300 font-mono">数小时</span></span>
                    </div>
                  </div>
                </div>
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
