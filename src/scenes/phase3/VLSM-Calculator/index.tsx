import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Plus, 
  Trash2, 
  Calculator,
  Copy,
  CheckCircle,
  Network,
  AlertCircle
} from 'lucide-react';

// 部门需求
interface Department {
  id: string;
  name: string;
  hosts: number;
  color: string;
}

// 子网分配结果
interface Subnet {
  deptId: string;
  deptName: string;
  network: string;
  prefix: number;
  mask: string;
  usable: number;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  color: string;
}

// IP字符串转数字
function ipToNum(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

// 数字转IP字符串
function numToIp(num: number): string {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff,
  ].join('.');
}

// 前缀转掩码
function prefixToMask(prefix: number): string {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return numToIp(mask);
}

// VLSM分配算法
function vlsmAllocate(baseNetwork: string, basePrefix: number, departments: Department[]): Subnet[] {
  // 按需求从大到小排序
  const sorted = [...departments].sort((a, b) => b.hosts - a.hosts);
  const results: Subnet[] = [];
  let currentAddr = ipToNum(baseNetwork) & (~0 << (32 - basePrefix)) >>> 0;
  const maxAddr = (currentAddr + (1 << (32 - basePrefix))) >>> 0;

  for (const dept of sorted) {
    // 计算所需前缀长度: 2^hostBits - 2 >= hosts
    let hostBits = 1;
    while ((1 << hostBits) - 2 < dept.hosts) hostBits++;
    if (hostBits < 2) hostBits = 2; // 最小 /30
    const prefix = 32 - hostBits;
    const blockSize = 1 << hostBits;

    // 地址对齐
    if (currentAddr % blockSize !== 0) {
      currentAddr = Math.ceil(currentAddr / blockSize) * blockSize;
    }

    if ((currentAddr + blockSize) >>> 0 > maxAddr) break; // 地址空间不足

    const network = currentAddr >>> 0;
    const broadcast = (currentAddr + blockSize - 1) >>> 0;
    const firstHost = (currentAddr + 1) >>> 0;
    const lastHost = (currentAddr + blockSize - 2) >>> 0;

    results.push({
      deptId: dept.id,
      deptName: dept.name,
      network: numToIp(network),
      prefix,
      mask: prefixToMask(prefix),
      usable: blockSize - 2,
      broadcast: numToIp(broadcast),
      firstHost: numToIp(firstHost),
      lastHost: numToIp(lastHost),
      color: dept.color,
    });

    currentAddr = (broadcast + 1) >>> 0;
  }

  return results;
}

// 解析网络地址（如 192.168.1.0/24）
function parseNetwork(cidr: string): { network: string; prefix: number } | null {
  const parts = cidr.split('/');
  if (parts.length !== 2) return null;
  const prefix = parseInt(parts[1]);
  if (isNaN(prefix) || prefix < 8 || prefix > 30) return null;
  const ipParts = parts[0].split('.').map(Number);
  if (ipParts.length !== 4 || ipParts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
  // 归一化到网络地址
  const ipNum = ipToNum(parts[0]);
  const netNum = (ipNum & (~0 << (32 - prefix))) >>> 0;
  return { network: numToIp(netNum), prefix };
}

// 预置颜色
const DEPT_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#a78bfa', '#fb7185',
];

const DEFAULT_DEPTS: Department[] = [
  { id: 'd1', name: '研发部', hosts: 100, color: DEPT_COLORS[0] },
  { id: 'd2', name: '市场部', hosts: 50, color: DEPT_COLORS[1] },
  { id: 'd3', name: '财务部', hosts: 25, color: DEPT_COLORS[2] },
  { id: 'd4', name: '人事部', hosts: 10, color: DEPT_COLORS[3] },
];

const SCENE_DATA = {
  id: 'vlsm-calculator',
  title: 'VLSM子网划分计算器',
  description: '可变长子网掩码(VLSM)自动划分计算器，直观可视化地址块分配，理解CIDR无类别域间路由和IP地址利用率优化',
  phase: 3 as const,
  category: '网络规划',
  difficulty: 'medium' as const,
  duration: '5-8分钟',
};

export function VLSMCalculatorScene() {
  const [networkCIDR, setNetworkCIDR] = useState('192.168.1.0/24');
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPTS);
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // 计算VLSM
  const calculate = useCallback(() => {
    setError('');
    const parsed = parseNetwork(networkCIDR);
    if (!parsed) {
      setError('网络地址格式错误，请输入如 192.168.1.0/24');
      return;
    }
    if (departments.length === 0) {
      setError('请至少添加一个部门');
      return;
    }
    const depts = departments.filter(d => d.hosts > 0);
    const result = vlsmAllocate(parsed.network, parsed.prefix, depts);
    setSubnets(result);
    setCalculated(true);
  }, [networkCIDR, departments]);

  // 添加部门
  const addDept = useCallback(() => {
    const colorIdx = departments.length % DEPT_COLORS.length;
    setDepartments(prev => [...prev, {
      id: `d${Date.now()}`,
      name: `部门${prev.length + 1}`,
      hosts: 20,
      color: DEPT_COLORS[colorIdx],
    }]);
    setCalculated(false);
  }, [departments.length]);

  // 删除部门
  const deleteDept = useCallback((id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    setCalculated(false);
  }, []);

  // 更新部门
  const updateDept = useCallback((id: string, field: 'name' | 'hosts', value: string | number) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    setCalculated(false);
  }, []);

  // 计算地址利用率
  const totalHosts = useCallback(() => {
    const parsed = parseNetwork(networkCIDR);
    if (!parsed) return { total: 0, used: 0, pct: 0 };
    const total = (1 << (32 - parsed.prefix)) - 2;
    const used = subnets.reduce((sum, s) => sum + s.usable, 0);
    return { total, used, pct: total > 0 ? Math.round(used / total * 100) : 0 };
  }, [networkCIDR, subnets]);

  // 生成配置命令
  const generateConfig = useCallback(() => {
    const lines = subnets.map((s, i) => 
      `! ${s.deptName}\nip route ${s.network} ${s.mask} [gateway]\n! 可用IP: ${s.firstHost} - ${s.lastHost} (${s.usable}个)`
    ).join('\n\n');
    return lines;
  }, [subnets]);

  const copyConfig = useCallback(() => {
    navigator.clipboard.writeText(generateConfig());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generateConfig]);

  // 地址块可视化（按比例）
  const renderAddressBar = useCallback(() => {
    if (!calculated || subnets.length === 0) return null;
    const parsed = parseNetwork(networkCIDR);
    if (!parsed) return null;
    const totalSize = 1 << (32 - parsed.prefix);
    const baseNum = ipToNum(parsed.network);

    return (
      <div className="w-full">
        <div className="flex h-10 rounded-lg overflow-hidden border border-slate-600">
          {subnets.map((s, i) => {
            const subnetSize = 1 << (32 - s.prefix);
            const pct = (subnetSize / totalSize) * 100;
            return (
              <motion.div
                key={s.deptId}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex items-center justify-center overflow-hidden text-white text-xs font-bold"
                style={{ backgroundColor: s.color + 'cc', minWidth: pct > 8 ? undefined : '2px' }}
                title={`${s.deptName}: ${s.network}/${s.prefix}`}
              >
                {pct > 8 && <span>{s.deptName}</span>}
              </motion.div>
            );
          })}
          {/* 剩余空间 */}
          {(() => {
            const usedPct = subnets.reduce((sum, s) => {
              const subnetSize = 1 << (32 - s.prefix);
              return sum + (subnetSize / totalSize) * 100;
            }, 0);
            const remaining = 100 - usedPct;
            return remaining > 0 ? (
              <div
                className="flex items-center justify-center text-slate-500 text-xs"
                style={{ width: `${remaining}%`, backgroundColor: 'rgba(71,85,105,0.3)' }}
              >
                {remaining > 5 && '未分配'}
              </div>
            ) : null;
          })()}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
          <span>{parseNetwork(networkCIDR)?.network}</span>
          <span>利用率 {totalHosts().pct}% ({totalHosts().used}/{totalHosts().total + 2})</span>
        </div>
      </div>
    );
  }, [calculated, subnets, networkCIDR, totalHosts]);

  const { pct } = totalHosts();

  const renderScene = () => (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* 左侧：输入区 */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        {/* 网络地址输入 */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">基础网络</span>
          </div>
          <input
            type="text"
            value={networkCIDR}
            onChange={e => { setNetworkCIDR(e.target.value); setCalculated(false); setError(''); }}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
            placeholder="192.168.1.0/24"
          />
          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
        </div>

        {/* 部门需求 */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <span className="text-sm font-semibold text-slate-200">部门需求</span>
            <button
              onClick={addDept}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 rounded text-blue-300 transition-colors"
            >
              <Plus className="w-3 h-3" />
              添加
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {departments.map(dept => (
              <div key={dept.id} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />
                <input
                  value={dept.name}
                  onChange={e => updateDept(dept.id, 'name', e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 min-w-0"
                  placeholder="部门名称"
                />
                <input
                  type="number"
                  value={dept.hosts}
                  onChange={e => updateDept(dept.id, 'hosts', parseInt(e.target.value) || 0)}
                  className="w-14 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 text-center"
                  min={1}
                  max={65534}
                />
                <button
                  onClick={() => deleteDept(dept.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={calculate}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-semibold transition-colors flex-shrink-0"
          >
            <Calculator className="w-4 h-4" />
            自动划分
          </button>
        </div>

        {/* 利用率 */}
        {calculated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/80 border border-slate-700 rounded-xl p-3"
          >
            <div className="text-xs text-slate-400 mb-2">地址利用率</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 bg-slate-700 rounded-full h-2">
                <motion.div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <span className="text-sm font-bold text-cyan-300">{pct}%</span>
            </div>
            <div className="text-xs text-slate-500">
              已分配 {totalHosts().used} / 总可用 {totalHosts().total} 地址
            </div>
          </motion.div>
        )}
      </div>

      {/* 右侧：结果展示 */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* 地址块可视化 */}
        {calculated && subnets.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex-shrink-0"
          >
            <div className="text-xs text-slate-400 mb-3">地址块可视化</div>
            {renderAddressBar()}
          </motion.div>
        )}

        {/* 子网详情表格 */}
        {calculated && subnets.length > 0 ? (
          <div className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <span className="text-sm font-semibold text-slate-200">划分结果</span>
              <button
                onClick={copyConfig}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg text-slate-300 transition-colors"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '导出配置'}
              </button>
            </div>

            {/* 表头 */}
            <div className="grid grid-cols-[100px_110px_50px_100px_80px_80px_80px] gap-2 text-xs text-slate-500 px-2 mb-2 font-mono flex-shrink-0">
              <span>部门</span>
              <span>网络地址</span>
              <span>前缀</span>
              <span>子网掩码</span>
              <span>可用数</span>
              <span>首IP</span>
              <span>末IP</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5">
              <AnimatePresence>
                {subnets.map((s, i) => (
                  <motion.div
                    key={s.deptId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="grid grid-cols-[100px_110px_50px_100px_80px_80px_80px] gap-2 text-xs font-mono px-2 py-2.5 border rounded-lg items-center"
                    style={{ 
                      borderColor: s.color + '50', 
                      backgroundColor: s.color + '15',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-200 truncate">{s.deptName}</span>
                    </div>
                    <span style={{ color: s.color }} className="font-bold">{s.network}</span>
                    <span className="text-slate-300">/{s.prefix}</span>
                    <span className="text-slate-400">{s.mask}</span>
                    <span className="text-cyan-300 font-bold">{s.usable}</span>
                    <span className="text-slate-400">{s.firstHost}</span>
                    <span className="text-slate-400">{s.lastHost}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : !calculated ? (
          <div className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-600 gap-4">
            <Calculator className="w-16 h-16 opacity-30" />
            <div className="text-center">
              <div className="text-slate-500 text-sm mb-2">输入基础网络和部门需求</div>
              <div className="text-slate-600 text-xs">点击"自动划分"开始计算</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
            地址空间不足，请调整网络大小或减少部门
          </div>
        )}

        {/* 知识点 */}
        {calculated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex-shrink-0"
          >
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-slate-500 mb-1">VLSM原则</div>
                <div className="text-slate-300">按需求从大到小排序后分配，避免地址浪费</div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">主机数计算</div>
                <div className="text-slate-300 font-mono">2^n - 2 ≥ 需求主机数</div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">地址对齐</div>
                <div className="text-slate-300">子网起始地址必须是块大小的整数倍</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  return (
    <SceneLayout scene={SCENE_DATA} showSidebar={false}>
      {renderScene()}
    </SceneLayout>
  );
}
