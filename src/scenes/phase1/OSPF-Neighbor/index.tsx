import { useState, useEffect, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, Server, Activity, Info, AlertTriangle } from 'lucide-react';

// OSPF邻居状态
const NEIGHBOR_STATES = [
  { id: 'down', name: 'Down', description: '初始状态，未收到Hello报文', color: '#ef4444', packet: 'Hello (寻找邻居)' },
  { id: 'init', name: 'Init', description: '收到Hello报文，但邻居列表中没有自己', color: '#f97316', packet: 'Hello (包含邻居ID)' },
  { id: '2way', name: '2-Way', description: '双向通信建立，邻居列表中包含自己', color: '#eab308', packet: 'Hello (双向确认)' },
  { id: 'exstart', name: 'ExStart', description: '确定主从关系，准备交换DD报文', color: '#3b82f6', packet: 'DD (序列号协商)' },
  { id: 'exchange', name: 'Exchange', description: '交换DD报文，描述LSDB摘要', color: '#6366f1', packet: 'DD (LSA摘要)' },
  { id: 'loading', name: 'Loading', description: '请求特定LSA，同步数据库', color: '#8b5cf6', packet: 'LSR/LSU/LSAck' },
  { id: 'full', name: 'Full', description: 'LSDB同步完成，完全邻接关系', color: '#22c55e', packet: 'LSU/LSAck (更新)' },
];

// 报文类型说明
const PACKET_TYPES = {
  hello: { name: 'Hello', description: '发现和维护邻居关系', color: '#3b82f6' },
  dd: { name: 'DD (Database Description)', description: '描述LSDB摘要信息', color: '#8b5cf6' },
  lsr: { name: 'LSR (Link-State Request)', description: '请求特定LSA', color: '#f59e0b' },
  lsu: { name: 'LSU (Link-State Update)', description: '发送完整LSA信息', color: '#10b981' },
  lsack: { name: 'LSAck (Link-State Ack)', description: '确认收到LSA', color: '#6366f6' },
};

// 动画步骤
const ANIMATION_STEPS = [
  { state: 'down', from: null, to: 'R1', packet: 'hello', description: 'R1发送Hello报文寻找邻居' },
  { state: 'init', from: 'R2', to: 'R1', packet: 'hello', description: 'R2收到Hello，进入Init状态' },
  { state: '2way', from: 'R1', to: 'R2', packet: 'hello', description: 'R1收到R2的Hello，进入2-Way状态' },
  { state: 'exstart', from: 'R1', to: 'R2', packet: 'dd', description: '开始交换DD报文，确定主从' },
  { state: 'exchange', from: 'R2', to: 'R1', packet: 'dd', description: '交换DD报文，描述LSDB摘要' },
  { state: 'loading', from: 'R1', to: 'R2', packet: 'lsr', description: '请求需要的LSA' },
  { state: 'full', from: 'R2', to: 'R1', packet: 'lsu', description: 'LSDB同步完成，进入Full状态' },
];

export function OSPFNeighborScene() {
  const [currentState, setCurrentState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showPacket, setShowPacket] = useState(false);
  const [packetPosition, setPacketPosition] = useState({ x: 0, y: 0 });
  const [currentPacket, setCurrentPacket] = useState<string>('');

  // 动画控制
  const playAnimation = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pauseAnimation = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsPlaying(false);
    setCurrentState(0);
    setShowPacket(false);
  }, []);

  // 自动播放动画
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentState((prev) => {
        if (prev >= NEIGHBOR_STATES.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        
        // 显示报文动画
        const step = ANIMATION_STEPS[prev];
        if (step) {
          setCurrentPacket(step.packet);
          setShowPacket(true);
          
          // 计算报文位置 - 使用百分比，避免小屏下错位
          if (step.from && step.to) {
            const isFromR1 = step.from === 'R1';
            setPacketPosition({
              x: isFromR1 ? 15 : 85,  // 百分比
              y: 50,
            });
          }
          
          // 1秒后隐藏报文
          setTimeout(() => setShowPacket(false), 1000);
        }
        
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentStateInfo = NEIGHBOR_STATES[currentState];

  // 场景数据
  const scene = {
    id: 'ospf-neighbor',
    title: 'OSPF邻居状态机',
    description: 'OSPF邻居建立经历7个状态，从Down到Full，每个状态都有特定的报文交互',
    phase: 1 as const,
    category: 'OSPF路由协议',
    difficulty: 'easy' as const,
    duration: '6-8分钟',
  };

  return (
    <SceneLayout
      scene={scene}
      showSidebar={false}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* 左侧：拓扑图 */}
        <div className="lg:col-span-7 h-full overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                邻居建立过程
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={isPlaying ? pauseAnimation : playAnimation}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? '暂停' : '播放'}
                </button>
                <button
                  onClick={resetAnimation}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw size={16} />
                  重置
                </button>
              </div>
            </div>

            {/* 路由器拓扑 */}
            <div className="relative h-80 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-visible">
              {/* R1 */}
              <div className="absolute left-16 top-1/2 -translate-y-1/2">
                <div className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                  currentState >= 0 ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400' : 'bg-gray-100 border-gray-300'
                }`}>
                  <Server size={48} className={currentState >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                  <div className="text-center mt-2 font-semibold text-gray-900 dark:text-white">R1</div>
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">192.168.1.1</div>
                  <div className={`text-center text-xs font-bold mt-1 ${
                    currentState >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  }`}>
                    {NEIGHBOR_STATES[currentState]?.name || 'Down'}
                  </div>
                </div>
              </div>

              {/* R2 */}
              <div className="absolute right-16 top-1/2 -translate-y-1/2">
                <div className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                  currentState >= 1 ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400' : 'bg-gray-100 border-gray-300'
                }`}>
                  <Server size={48} className={currentState >= 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                  <div className="text-center mt-2 font-semibold text-gray-900 dark:text-white">R2</div>
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">192.168.1.2</div>
                  <div className={`text-center text-xs font-bold mt-1 ${
                    currentState >= 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                  }`}>
                    {currentState >= 1 ? NEIGHBOR_STATES[Math.min(currentState, NEIGHBOR_STATES.length - 1)]?.name : 'Down'}
                  </div>
                </div>
              </div>

              {/* 连接线 */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-0.5 bg-gray-300 dark:bg-gray-600" />

              {/* 报文动画 - 使用CSS动画从一侧移动到另一侧 */}
              {showPacket && currentPacket && (
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    packetPosition.x < 50 ? 'left-[15%] animate-packet-to-right' : 'right-[15%] animate-packet-to-left'
                  }`}
                >
                  <div 
                    className="px-3 py-2 rounded-lg text-white text-xs font-bold shadow-lg whitespace-nowrap"
                    style={{ backgroundColor: PACKET_TYPES[currentPacket as keyof typeof PACKET_TYPES]?.color || '#6b7280' }}
                  >
                    {PACKET_TYPES[currentPacket as keyof typeof PACKET_TYPES]?.name || currentPacket}
                  </div>
                </div>
              )}

              {/* 当前步骤说明 */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {ANIMATION_STEPS[currentState]?.description || '准备建立邻居关系'}
                </div>
              </div>
            </div>

            {/* 状态进度条 */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">建立进度</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{currentState + 1} / {NEIGHBOR_STATES.length}</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{ width: `${((currentState + 1) / NEIGHBOR_STATES.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：状态列表 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              OSPF邻居状态
            </h3>
            <div className="space-y-2">
              {NEIGHBOR_STATES.map((state, index) => (
                <button
                  key={state.id}
                  onClick={() => setSelectedState(selectedState === state.id ? null : state.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    currentState === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : selectedState === state.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: state.color }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">{state.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{state.description}</div>
                    </div>
                    {currentState === index && (
                      <Activity size={20} className="text-blue-500 animate-pulse" />
                    )}
                  </div>
                  
                  {selectedState === state.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">发送报文：</span>
                        <span className="text-blue-600 dark:text-blue-400">{state.packet}</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 报文类型说明 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              OSPF报文类型
            </h3>
            <div className="space-y-2">
              {Object.entries(PACKET_TYPES).map(([key, packet]) => (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: packet.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{packet.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">- {packet.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部：关键知识点 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-3">
            <Info size={20} className="text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">邻居 vs 邻接</h4>
          </div>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• <strong>邻居关系</strong>：2-Way状态，双向Hello交互</li>
            <li>• <strong>邻接关系</strong>：Full状态，LSDB完全同步</li>
            <li>• 广播网络中，DR/BDR与所有路由器建立邻接</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={20} className="text-green-600 dark:text-green-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">状态转换条件</h4>
          </div>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• Down → Init：收到Hello报文</li>
            <li>• Init → 2-Way：Hello中看到自己的ID</li>
            <li>• 2-Way → ExStart：决定交换DD报文</li>
            <li>• Loading → Full：LSDB同步完成</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">故障排查</h4>
          </div>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• 卡在Init：检查Hello/Dead时间</li>
            <li>• 卡在ExStart：MTU不匹配</li>
            <li>• 卡在Loading：LSA请求失败</li>
            <li>• 检查区域ID、认证、网络类型</li>
          </ul>
        </div>
      </div>
    </SceneLayout>
  );
}
