import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Play, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  CheckCircle,
  XCircle,
  Package,
  Filter,
  AlertCircle
} from 'lucide-react';

// ACL规则类型
interface ACLRule {
  id: string;
  seq: number;
  action: 'permit' | 'deny';
  protocol: 'ip' | 'tcp' | 'udp' | 'icmp';
  srcIp: string;
  srcWildcard: string;
  dstIp: string;
  dstWildcard: string;
  dstPort: string; // '' 表示任意
}

// 数据包
interface Packet {
  srcIp: string;
  dstIp: string;
  protocol: 'tcp' | 'udp' | 'icmp' | 'ip';
  dstPort: string;
}

// 匹配结果
interface MatchResult {
  ruleId: string | 'implicit-deny';
  action: 'permit' | 'deny';
  matchedAt: number; // 规则索引，-1 表示隐含deny
}

// 默认ACL规则
const DEFAULT_RULES: ACLRule[] = [
  { id: 'r1', seq: 10, action: 'permit', protocol: 'tcp', srcIp: '10.1.0.0', srcWildcard: '0.0.0.255', dstIp: 'any', dstWildcard: '', dstPort: '80' },
  { id: 'r2', seq: 20, action: 'deny', protocol: 'tcp', srcIp: '10.2.0.0', srcWildcard: '0.0.0.255', dstIp: 'any', dstWildcard: '', dstPort: '80' },
  { id: 'r3', seq: 30, action: 'permit', protocol: 'icmp', srcIp: '192.168.0.0', srcWildcard: '0.0.255.255', dstIp: 'any', dstWildcard: '', dstPort: '' },
  { id: 'r4', seq: 40, action: 'permit', protocol: 'ip', srcIp: '10.0.0.0', srcWildcard: '0.255.255.255', dstIp: '172.16.0.0', dstWildcard: '0.0.255.255', dstPort: '' },
];

// IP匹配函数（通配符掩码）
function ipMatchesWithWildcard(ip: string, ruleIp: string, wildcard: string): boolean {
  if (ruleIp === 'any') return true;
  if (ruleIp === 'host') return ip === wildcard; // host x.x.x.x 格式
  
  const ipParts = ip.split('.').map(Number);
  const ruleParts = ruleIp.split('.').map(Number);
  const wildcardParts = wildcard.split('.').map(Number);
  
  if (ipParts.length !== 4 || ruleParts.length !== 4 || wildcardParts.length !== 4) return false;
  
  for (let i = 0; i < 4; i++) {
    // 通配符掩码：0表示必须匹配，1表示任意
    if ((ipParts[i] & ~wildcardParts[i]) !== (ruleParts[i] & ~wildcardParts[i])) {
      return false;
    }
  }
  return true;
}

// 匹配单条规则
function matchRule(packet: Packet, rule: ACLRule): boolean {
  // 协议检查
  if (rule.protocol !== 'ip' && rule.protocol !== packet.protocol) return false;
  
  // 源IP检查
  if (!ipMatchesWithWildcard(packet.srcIp, rule.srcIp, rule.srcWildcard)) return false;
  
  // 目的IP检查
  if (rule.dstIp !== 'any') {
    if (!ipMatchesWithWildcard(packet.dstIp, rule.dstIp, rule.dstWildcard)) return false;
  }
  
  // 端口检查
  if (rule.dstPort && rule.dstPort !== '' && rule.dstPort !== 'any') {
    if (packet.dstPort !== rule.dstPort) return false;
  }
  
  return true;
}

const SCENE_DATA = {
  id: 'acl-simulator',
  title: 'ACL规则匹配模拟器',
  description: '模拟访问控制列表(ACL)对数据包的逐条匹配过程，理解标准ACL、扩展ACL的工作原理和末尾隐含deny规则',
  phase: 3 as const,
  category: '网络安全',
  difficulty: 'medium' as const,
  duration: '5-8分钟',
};

export function ACLSimulatorScene() {
  const [rules, setRules] = useState<ACLRule[]>(DEFAULT_RULES);
  const [packet, setPacket] = useState<Packet>({
    srcIp: '10.1.0.5',
    dstIp: '8.8.8.8',
    protocol: 'tcp',
    dstPort: '80',
  });
  const [matchingStep, setMatchingStep] = useState<number>(-1); // 当前扫描到的规则索引
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showImplicitDeny, setShowImplicitDeny] = useState(false);
  const [highlightedRule, setHighlightedRule] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  // 执行匹配动画
  const runMatching = useCallback(async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setMatchResult(null);
    setMatchingStep(-1);
    setShowImplicitDeny(false);

    // 逐条扫描
    for (let i = 0; i < rules.length; i++) {
      setMatchingStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const rule = rules[i];
      if (matchRule(packet, rule)) {
        setMatchResult({ ruleId: rule.id, action: rule.action, matchedAt: i });
        setHighlightedRule(rule.id);
        setIsAnimating(false);
        return;
      }
    }

    // 隐含deny
    await new Promise(resolve => setTimeout(resolve, 400));
    setShowImplicitDeny(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    setMatchResult({ ruleId: 'implicit-deny', action: 'deny', matchedAt: -1 });
    setMatchingStep(-1);
    setIsAnimating(false);
  }, [rules, packet, isAnimating]);

  // 重置
  const reset = useCallback(() => {
    setMatchingStep(-1);
    setMatchResult(null);
    setIsAnimating(false);
    setShowImplicitDeny(false);
    setHighlightedRule(null);
  }, []);

  // 添加规则
  const addRule = useCallback(() => {
    const newSeq = rules.length > 0 ? Math.max(...rules.map(r => r.seq)) + 10 : 10;
    const newRule: ACLRule = {
      id: `r${Date.now()}`,
      seq: newSeq,
      action: 'permit',
      protocol: 'ip',
      srcIp: 'any',
      srcWildcard: '',
      dstIp: 'any',
      dstWildcard: '',
      dstPort: '',
    };
    setRules(prev => [...prev, newRule]);
    reset();
  }, [rules, reset]);

  // 删除规则
  const deleteRule = useCallback((id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    reset();
  }, [reset]);

  // 移动规则（改变序号/顺序）
  const moveRule = useCallback((id: string, direction: 'up' | 'down') => {
    setRules(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const newRules = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newRules[idx], newRules[swapIdx]] = [newRules[swapIdx], newRules[idx]];
      return newRules;
    });
    reset();
  }, [reset]);

  // 更新规则字段
  const updateRule = useCallback((id: string, field: keyof ACLRule, value: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    reset();
  }, [reset]);

  // 获取规则状态样式
  const getRuleStyle = (rule: ACLRule, index: number) => {
    if (matchResult && matchResult.ruleId === rule.id) {
      return rule.action === 'permit' 
        ? 'border-green-500 bg-green-500/10 shadow-green-500/20 shadow-lg' 
        : 'border-red-500 bg-red-500/10 shadow-red-500/20 shadow-lg';
    }
    if (matchingStep === index) {
      return 'border-yellow-400 bg-yellow-400/10 shadow-yellow-400/20 shadow-md';
    }
    if (matchingStep > index && matchResult === null) {
      return 'border-slate-600 bg-slate-800/30 opacity-60';
    }
    return 'border-slate-700 bg-slate-800/50 hover:border-slate-500';
  };

  const resultColor = matchResult?.action === 'permit' ? 'text-green-400' : 'text-red-400';
  const resultBg = matchResult?.action === 'permit' ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500';

  const renderScene = () => (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* 左侧：数据包设置 */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        {/* 数据包输入 */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">数据包</span>
          </div>
          
          {/* 数据包可视化 */}
          <motion.div
            className="mb-4 p-3 bg-blue-900/40 border border-blue-500/40 rounded-lg"
            animate={isAnimating ? { x: [0, 5, -5, 0] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            <div className="text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">协议:</span>
                <span className="text-blue-300 font-bold">{packet.protocol.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">源IP:</span>
                <span className="text-cyan-300">{packet.srcIp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">目的IP:</span>
                <span className="text-cyan-300">{packet.dstIp}</span>
              </div>
              {packet.dstPort && (
                <div className="flex justify-between">
                  <span className="text-slate-400">端口:</span>
                  <span className="text-yellow-300">{packet.dstPort}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* 表单 */}
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">协议</label>
              <select
                value={packet.protocol}
                onChange={e => { setPacket(p => ({ ...p, protocol: e.target.value as Packet['protocol'] })); reset(); }}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="icmp">ICMP</option>
                <option value="ip">IP (任意)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">源IP</label>
              <input
                type="text"
                value={packet.srcIp}
                onChange={e => { setPacket(p => ({ ...p, srcIp: e.target.value })); reset(); }}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                placeholder="10.1.0.5"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">目的IP</label>
              <input
                type="text"
                value={packet.dstIp}
                onChange={e => { setPacket(p => ({ ...p, dstIp: e.target.value })); reset(); }}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                placeholder="8.8.8.8"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">目的端口</label>
              <input
                type="text"
                value={packet.dstPort}
                onChange={e => { setPacket(p => ({ ...p, dstPort: e.target.value })); reset(); }}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                placeholder="80 (留空=任意)"
              />
            </div>
          </div>

          {/* 开始匹配按钮 */}
          <button
            onClick={runMatching}
            disabled={isAnimating}
            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-semibold transition-colors"
          >
            <Play className="w-4 h-4" />
            开始匹配
          </button>
        </div>

        {/* 匹配结果 */}
        <AnimatePresence>
          {matchResult && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-4 border rounded-xl ${resultBg}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {matchResult.action === 'permit' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-base font-bold ${resultColor}`}>
                  {matchResult.action === 'permit' ? '✅ PERMIT' : '❌ DENY'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {matchResult.ruleId === 'implicit-deny' 
                  ? '所有规则均未匹配，触发末尾隐含 deny any any' 
                  : `匹配到规则 seq ${rules.find(r => r.id === matchResult.ruleId)?.seq}`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 知识点 */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-slate-300">ACL要点</span>
          </div>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li>• <span className="text-blue-300">顺序匹配</span>：从上到下，首次匹配即停止</li>
            <li>• <span className="text-red-300">隐含拒绝</span>：末尾有 deny any any</li>
            <li>• <span className="text-green-300">通配符掩码</span>：0=精确匹配，1=任意</li>
            <li>• <span className="text-yellow-300">扩展ACL</span>：可匹配协议+端口</li>
          </ul>
        </div>
      </div>

      {/* 右侧：ACL规则列表 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-slate-200">ACL规则列表</span>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{rules.length} 条</span>
          </div>
          <button
            onClick={addRule}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-lg text-purple-300 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加规则
          </button>
        </div>

        {/* 表头 */}
        <div className="grid grid-cols-[40px_80px_70px_130px_130px_70px_64px] gap-1 text-xs text-slate-500 px-3 mb-1 font-mono">
          <span>序号</span>
          <span>动作</span>
          <span>协议</span>
          <span>源IP/通配符</span>
          <span>目的IP/通配符</span>
          <span>端口</span>
          <span>操作</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          <AnimatePresence>
            {rules.map((rule, index) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className={`relative border rounded-lg px-3 py-2.5 transition-all duration-300 ${getRuleStyle(rule, index)}`}
              >
                {/* 扫描指示器 */}
                {matchingStep === index && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-yellow-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                  />
                )}
                {/* 匹配成功指示器 */}
                {matchResult?.ruleId === rule.id && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${rule.action === 'permit' ? 'bg-green-400' : 'bg-red-400'}`} />
                )}

                <div className="grid grid-cols-[40px_80px_70px_130px_130px_70px_64px] gap-1 items-center text-xs font-mono">
                  {/* 序号 */}
                  <span className="text-slate-400">{rule.seq}</span>
                  
                  {/* 动作 */}
                  <span className={`font-bold ${rule.action === 'permit' ? 'text-green-400' : 'text-red-400'}`}>
                    {rule.action.toUpperCase()}
                  </span>
                  
                  {/* 协议 */}
                  <span className="text-purple-300">{rule.protocol.toUpperCase()}</span>
                  
                  {/* 源IP */}
                  <span className="text-cyan-300 truncate">
                    {rule.srcIp}{rule.srcWildcard && rule.srcIp !== 'any' ? ` ${rule.srcWildcard}` : ''}
                  </span>
                  
                  {/* 目的IP */}
                  <span className="text-cyan-300 truncate">
                    {rule.dstIp}{rule.dstWildcard && rule.dstIp !== 'any' ? ` ${rule.dstWildcard}` : ''}
                  </span>
                  
                  {/* 端口 */}
                  <span className="text-yellow-300">{rule.dstPort || 'any'}</span>
                  
                  {/* 操作 */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveRule(rule.id, 'up')}
                      disabled={index === 0}
                      className="p-0.5 hover:text-white text-slate-500 disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveRule(rule.id, 'down')}
                      disabled={index === rules.length - 1}
                      className="p-0.5 hover:text-white text-slate-500 disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-0.5 hover:text-red-400 text-slate-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 展开编辑 */}
                {editingRule === rule.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-2 pt-2 border-t border-slate-600 grid grid-cols-3 gap-2"
                  >
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">动作</label>
                      <select
                        value={rule.action}
                        onChange={e => updateRule(rule.id, 'action', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200"
                      >
                        <option value="permit">permit</option>
                        <option value="deny">deny</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">协议</label>
                      <select
                        value={rule.protocol}
                        onChange={e => updateRule(rule.id, 'protocol', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200"
                      >
                        <option value="ip">ip</option>
                        <option value="tcp">tcp</option>
                        <option value="udp">udp</option>
                        <option value="icmp">icmp</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">目的端口</label>
                      <input
                        value={rule.dstPort}
                        onChange={e => updateRule(rule.id, 'dstPort', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200 font-mono"
                        placeholder="any"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">源IP</label>
                      <input
                        value={rule.srcIp}
                        onChange={e => updateRule(rule.id, 'srcIp', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">源通配符</label>
                      <input
                        value={rule.srcWildcard}
                        onChange={e => updateRule(rule.id, 'srcWildcard', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200 font-mono"
                        placeholder="0.0.0.255"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">目的IP</label>
                      <input
                        value={rule.dstIp}
                        onChange={e => updateRule(rule.id, 'dstIp', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </motion.div>
                )}
                
                {/* 点击规则展开编辑 */}
                <button
                  onClick={() => setEditingRule(editingRule === rule.id ? null : rule.id)}
                  className="absolute inset-0 w-full h-full opacity-0"
                  aria-label="编辑规则"
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 隐含Deny */}
          <motion.div
            animate={showImplicitDeny ? { opacity: 1, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' } : { opacity: 0.4 }}
            className="border border-dashed border-slate-600 rounded-lg px-3 py-2 transition-all duration-500"
          >
            <div className="grid grid-cols-[40px_80px_70px_130px_130px_70px_64px] gap-1 items-center text-xs font-mono">
              <span className="text-slate-500">末尾</span>
              <span className={`font-bold ${showImplicitDeny ? 'text-red-400' : 'text-slate-500'}`}>DENY</span>
              <span className="text-slate-500">ip</span>
              <span className="text-slate-500">any</span>
              <span className="text-slate-500">any</span>
              <span className="text-slate-500">any</span>
              <span className="text-slate-500 text-[10px]">[隐含]</span>
            </div>
          </motion.div>
        </div>

        {/* 扫描进度 */}
        {isAnimating && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-slate-700 rounded-full h-1.5">
              <motion.div
                className="bg-yellow-400 h-1.5 rounded-full"
                animate={{ width: matchingStep >= 0 ? `${((matchingStep + 1) / rules.length) * 100}%` : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {matchingStep >= 0 ? `检查规则 ${matchingStep + 1}/${rules.length}` : '准备中...'}
            </span>
          </div>
        )}

        {/* 预设场景 */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">预设场景：</span>
          {[
            { label: 'Web流量控制', packet: { srcIp: '10.1.0.5', dstIp: '8.8.8.8', protocol: 'tcp' as const, dstPort: '80' } },
            { label: 'ICMP Ping', packet: { srcIp: '192.168.1.1', dstIp: '10.0.0.1', protocol: 'icmp' as const, dstPort: '' } },
            { label: '被拒绝流量', packet: { srcIp: '10.2.0.10', dstIp: '8.8.8.8', protocol: 'tcp' as const, dstPort: '80' } },
            { label: '隐含拒绝', packet: { srcIp: '172.30.0.1', dstIp: '10.5.0.1', protocol: 'udp' as const, dstPort: '53' } },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => { setPacket(preset.packet); reset(); }}
              className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-300 transition-colors"
            >
              {preset.label}
            </button>
          ))}
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
