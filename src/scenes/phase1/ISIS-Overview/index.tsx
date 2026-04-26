import { useState } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Server, Layers, Globe, ArrowRight, CheckCircle, XCircle, Info } from 'lucide-react';

// IS-IS vs OSPF 对比数据
const COMPARISON_DATA = [
  {
    aspect: '协议层次',
    ospf: '网络层（IP协议号89）',
    isis: '数据链路层（直接封装在帧中）',
    winner: 'isis',
    reason: 'IS-IS不依赖IP，更具扩展性'
  },
  {
    aspect: '区域边界',
    ospf: '在路由器（ABR）',
    isis: '在链路上',
    winner: 'isis',
    reason: 'IS-IS区域划分更灵活'
  },
  {
    aspect: '路由器类型',
    ospf: 'Internal Router / ABR / ASBR',
    isis: 'Level-1 / Level-2 / Level-1-2',
    winner: 'tie',
    reason: '各有特点，适应不同场景'
  },
  {
    aspect: '骨干区域',
    ospf: 'Area 0，所有区域必须直连',
    isis: 'Level-2，形成骨干网',
    winner: 'isis',
    reason: 'IS-IS骨干网更灵活'
  },
  {
    aspect: '报文类型',
    ospf: 'Hello / DD / LSR / LSU / LSAck',
    isis: 'IIH / LSP / CSNP / PSNP',
    winner: 'tie',
    reason: '功能类似，命名不同'
  },
  {
    aspect: '扩展性',
    ospf: '区域数量有限',
    isis: '支持大规模网络（如运营商）',
    winner: 'isis',
    reason: 'IS-IS更适合大型网络'
  },
  {
    aspect: '收敛速度',
    ospf: '较快',
    isis: '更快（增量SPF）',
    winner: 'isis',
    reason: 'IS-IS增量SPF优化'
  },
  {
    aspect: '应用场景',
    ospf: '企业网主流',
    isis: '运营商/大型ISP主流',
    winner: 'tie',
    reason: '根据场景选择'
  },
];

// IS-IS路由器类型
const ROUTER_TYPES = [
  {
    type: 'Level-1',
    name: 'L1路由器',
    description: '只维护区域内路由',
    characteristics: ['同一区域内通信', '通过L1-2路由器访问外部', '类似OSPF非骨干路由器'],
    color: '#3b82f6'
  },
  {
    type: 'Level-2',
    name: 'L2路由器',
    description: '只维护区域间路由（骨干）',
    characteristics: ['构成IS-IS骨干网', '负责区域间路由', '类似OSPF骨干路由器'],
    color: '#22c55e'
  },
  {
    type: 'Level-1-2',
    name: 'L1-2路由器',
    description: '同时维护区域内和区域间路由',
    characteristics: ['连接L1区域和L2骨干', '类似OSPF的ABR', '最灵活的路由器类型'],
    color: '#8b5cf6'
  },
];

export function ISISOverviewScene() {
  const [selectedComparison, setSelectedComparison] = useState<number | null>(null);
  const [selectedRouterType, setSelectedRouterType] = useState<string | null>(null);
  const [showOSPF, setShowOSPF] = useState(true);
  const [showISIS, setShowISIS] = useState(true);

  // 场景数据
  const scene = {
    id: 'isis-overview',
    title: 'IS-IS协议概览',
    description: 'IS-IS与OSPF类似，都是链路状态协议，但IS-IS直接运行在链路层，区域划分更灵活，扩展性更强。',
    phase: 1 as const,
    category: 'IS-IS路由协议',
    difficulty: 'medium' as const,
    duration: '6-8分钟',
  };

  return (
    <SceneLayout scene={scene} showSidebar={false} noHeightLimit={true}>
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* 左侧：拓扑对比 */}
        <div className="col-span-7 h-full overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                区域边界对比
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOSPF(!showOSPF)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    showOSPF 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  OSPF
                </button>
                <button
                  onClick={() => setShowISIS(!showISIS)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    showISIS 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  IS-IS
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* OSPF拓扑 */}
              {showOSPF && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="text-center font-semibold text-blue-700 dark:text-blue-400 mb-4">OSPF区域边界</h4>
                  <div className="relative h-64">
                    {/* Area 0 */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-lg p-2">
                      <div className="text-xs text-center text-green-700 dark:text-green-400 font-medium">Area 0</div>
                      <div className="flex justify-center gap-2 mt-1">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Server size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">R2 (ABR)</div>
                    </div>

                    {/* Area 1 */}
                    <div className="absolute bottom-4 left-4 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 rounded-lg p-2">
                      <div className="text-xs text-center text-blue-700 dark:text-blue-400 font-medium">Area 1</div>
                      <div className="flex justify-center gap-2 mt-1">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Server size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">R1</div>
                    </div>

                    {/* Area 2 */}
                    <div className="absolute bottom-4 right-4 bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 rounded-lg p-2">
                      <div className="text-xs text-center text-purple-700 dark:text-purple-400 font-medium">Area 2</div>
                      <div className="flex justify-center gap-2 mt-1">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <Server size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">R3</div>
                    </div>

                    {/* 连接线 - 使用百分比坐标 */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* R1 (左下, ~16% 80%) 到 R2 (上中, ~50% 15%) */}
                      <line x1="16" y1="80" x2="50" y2="15" stroke="#3b82f6" strokeWidth="0.6" strokeDasharray="2" />
                      {/* R3 (右下, ~84% 80%) 到 R2 (上中, ~50% 15%) */}
                      <line x1="84" y1="80" x2="50" y2="15" stroke="#3b82f6" strokeWidth="0.6" strokeDasharray="2" />
                    </svg>

                    {/* 区域边界说明 */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 text-center">
                      区域边界在路由器（ABR）
                    </div>
                  </div>
                </div>
              )}

              {/* IS-IS拓扑 */}
              {showISIS && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="text-center font-semibold text-green-700 dark:text-green-400 mb-4">IS-IS区域边界</h4>
                  <div className="relative h-64">
                    {/* Level-2骨干 */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-lg p-2">
                      <div className="text-xs text-center text-green-700 dark:text-green-400 font-medium">Level-2 (骨干)</div>
                      <div className="flex justify-center gap-2 mt-1">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Layers size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">R2 (L1-2)</div>
                    </div>

                    {/* Level-1 Area 49.0001 */}
                    <div className="absolute bottom-4 left-4 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 rounded-lg p-2">
                      <div className="text-xs text-center text-blue-700 dark:text-blue-400 font-medium">Area 49.0001</div>
                      <div className="flex justify-center gap-2 mt-1">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Layers size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">R1 (L1)</div>
                    </div>

                    {/* Level-1 Area 49.0002 */}
                    <div className="absolute bottom-4 right-4 bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 rounded-lg p-2">
                      <div className="text-xs text-center text-purple-700 dark:text-purple-400 font-medium">Area 49.0002</div>
                      <div className="flex justify-center gap-2 mt-1">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <Layers size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">R3 (L1)</div>
                    </div>

                    {/* 连接线 - 区域边界在链路上 - 使用百分比坐标 */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* R1 (左下, ~16% 80%) 到 R2 (上中, ~50% 15%) */}
                      <line x1="16" y1="80" x2="50" y2="15" stroke="#ef4444" strokeWidth="0.8" />
                      {/* R3 (右下, ~84% 80%) 到 R2 (上中, ~50% 15%) */}
                      <line x1="84" y1="80" x2="50" y2="15" stroke="#ef4444" strokeWidth="0.8" />
                      {/* 区域边界红点 - 在线路中间 */}
                      <circle cx="33" cy="47" r="1.5" fill="#ef4444" />
                      <circle cx="67" cy="47" r="1.5" fill="#ef4444" />
                    </svg>

                    {/* 区域边界说明 */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-red-500 dark:text-red-400 text-center font-medium">
                      区域边界在链路上（红点）
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 协议对比表 */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              OSPF vs IS-IS 详细对比
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">对比项</th>
                    <th className="text-left py-2 px-3 text-blue-600 dark:text-blue-400">OSPF</th>
                    <th className="text-left py-2 px-3 text-green-600 dark:text-green-400">IS-IS</th>
                    <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">优势</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_DATA.map((item, index) => (
                    <tr 
                      key={index}
                      className={`border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        selectedComparison === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => setSelectedComparison(selectedComparison === index ? null : index)}
                    >
                      <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{item.aspect}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{item.ospf}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{item.isis}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.winner === 'isis' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : item.winner === 'ospf'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {item.winner === 'isis' ? 'IS-IS' : item.winner === 'ospf' ? 'OSPF' : '相当'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedComparison !== null && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>{COMPARISON_DATA[selectedComparison].aspect}：</strong>
                    {COMPARISON_DATA[selectedComparison].reason}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：IS-IS路由器类型 */}
        <div className="col-span-5 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              IS-IS路由器类型
            </h3>
            <div className="space-y-3">
              {ROUTER_TYPES.map((router) => (
                <button
                  key={router.type}
                  onClick={() => setSelectedRouterType(selectedRouterType === router.type ? null : router.type)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedRouterType === router.type
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: router.color }}
                    >
                      <Layers size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">{router.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{router.description}</div>
                    </div>
                  </div>
                  
                  {selectedRouterType === router.type && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <ul className="space-y-1">
                        {router.characteristics.map((char, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <ArrowRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: router.color }} />
                            {char}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* IS-IS报文类型 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              IS-IS报文类型
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">IIH</div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">IS-IS Hello</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">发现和维护邻居关系</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">LSP</div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Link-State PDU</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">链路状态信息（类似OSPF LSA）</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">CSNP</div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Complete SNP</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">完整序列号报文（类似OSPF DD）</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">PSNP</div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Partial SNP</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">部分序列号报文（请求/确认）</div>
                </div>
              </div>
            </div>
          </div>

          {/* 应用场景 */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              应用场景建议
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>选择OSPF：</strong>企业网、中小型网络、与Cisco设备兼容性要求高
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>选择IS-IS：</strong>运营商网络、大型ISP、需要高扩展性、多协议支持（IPv4/IPv6）
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
