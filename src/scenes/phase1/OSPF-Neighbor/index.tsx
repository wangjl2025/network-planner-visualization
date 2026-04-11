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

// 动画步骤 - 完整的邻居建立流程
const ANIMATION_STEPS = [
  { state: 'down', from: null, to: 'R1', packet: 'hello', description: 'R1发送Hello报文寻找邻居' },
  { state: 'init', from: 'R2', to: null, packet: 'hello', description: 'R2收到Hello，进入Init状态（Hello中有R1的Router ID）' },
  { state: 'init', from: null, to: 'R2', packet: 'hello', description: 'R2回复Hello，Hello中包含自己的Router ID' },
  { state: '2way', from: 'R1', to: 'R2', packet: 'hello', description: 'R1收到R2的Hello，进入2-Way状态（Hello中看到自己的ID）' },
  { state: 'exstart', from: 'R1', to: 'R2', packet: 'dd', description: '开始ExStart阶段，R1发送DD报文（空的、带有序列号）' },
  { state: 'exstart', from: 'R2', to: 'R1', packet: 'dd', description: 'R2成为Master，DD报文序列号更高' },
  { state: 'exchange', from: 'R1', to: 'R2', packet: 'dd', description: '进入Exchange阶段，交换LSA摘要' },
  { state: 'exchange', from: 'R2', to: 'R1', packet: 'dd', description: '双方互相确认收到的摘要' },
  { state: 'loading', from: 'R1', to: 'R2', packet: 'lsr', description: 'Loading阶段：R1发送LSR请求缺少的LSA' },
  { state: 'loading', from: 'R2', to: 'R1', packet: 'lsu', description: 'R2发送LSU携带完整的LSA' },
  { state: 'full', from: 'R1', to: 'R2', packet: 'lsack', description: 'R1发送LSAck确认，LSDB同步完成' },
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
        if (prev >= ANIMATION_STEPS.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        
        // 显示报文动画
        const step = ANIMATION_STEPS[prev];
        if (step) {
          setCurrentPacket(step.packet);
          setShowPacket(true);
          
          // 计算报文位置 - 使用百分比，避免小屏下错位
          if (step.from === 'R1') {
            setPacketPosition({ x: 15, y: 50 });
          } else if (step.from === 'R2') {
            setPacketPosition({ x: 85, y: 50 });
          }
          
          // 1秒后隐藏报文
          setTimeout(() => setShowPacket(false), 1200);
        }
        
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentStateInfo = NEIGHBOR_STATES[currentState];
  
  // 获取当前动画步骤的状态ID，用于同步高亮右侧状态列表
  const currentStepStateId = ANIMATION_STEPS[currentState]?.state;
  
  // R1的状态映射：根据动画步骤确定R1当前状态
  const getR1State = (): string => {
    switch (currentState) {
      case 0: return 'Down';
      case 1: return 'Down';  // R1还在等待
      case 2: return 'Down';  // R1还在等待
      case 3: return '2-Way';
      case 4: return 'ExStart';
      case 5: return 'ExStart';
      case 6: return 'Exchange';
      case 7: return 'Exchange';
      case 8: return 'Loading';
      case 9: return 'Loading';
      case 10: return 'Full';
      default: return 'Down';
    }
  };
  
  // R2的状态映射：根据动画步骤确定R2当前状态
  const getR2State = (): string => {
    switch (currentState) {
      case 0: return 'Down';
      case 1: return 'Init';  // 收到R1的Hello
      case 2: return 'Init';   // 回复Hello
      case 3: return '2-Way'; // R1收到R2的Hello后进入2-Way
      case 4: return '2-Way'; // 等待ExStart开始
      case 5: return 'ExStart'; // R2成为Master
      case 6: return 'ExStart';
      case 7: return 'Exchange';
      case 8: return 'Exchange';
      case 9: return 'Loading';
      case 10: return 'Full';
      default: return 'Down';
    }
  };

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
      <div className="flex flex-col gap-6 h-full overflow-y-auto">
        {/* 上方：拓扑图 (p-6) */}
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

          {/* 路由器拓扑 - SVG响应式布局 */}
          <div className="relative h-80 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
            {/* SVG层 - 连线和动画 */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {/* 连接线 */}
              <line x1="20" y1="50" x2="80" y2="50" stroke="#d1d5db" strokeWidth="1"/>
              
              {/* 报文动画 - 使用SVG动画 */}
              {showPacket && currentPacket && (
                <g>
                  {/* 动画圆点 */}
                  <circle r="3" fill={PACKET_TYPES[currentPacket as keyof typeof PACKET_TYPES]?.color || '#6b7280'}>
                    <animate 
                      attributeName="cx" 
                      from={packetPosition.x < 50 ? "20" : "80"} 
                      to={packetPosition.x < 50 ? "80" : "20"} 
                      dur="1s" 
                      fill="freeze"
                    />
                    <animate attributeName="cy" values="50" dur="1s" fill="freeze"/>
                  </circle>
                  {/* 报文标签背景 */}
                  <rect 
                    x={packetPosition.x < 50 ? "25" : "55"} 
                    y="42" 
                    width="20" 
                    height="8" 
                    rx="2" 
                    fill={PACKET_TYPES[currentPacket as keyof typeof PACKET_TYPES]?.color || '#6b7280'}
                    opacity="0.9"
                  >
                    <animate 
                      attributeName="x" 
                      from={packetPosition.x < 50 ? "25" : "55"} 
                      to={packetPosition.x < 50 ? "55" : "25"} 
                      dur="1s" 
                      fill="freeze"
                    />
                  </rect>
                  {/* 报文标签文字 */}
                  <text 
                    x={packetPosition.x < 50 ? "35" : "65"} 
                    y="47.5" 
                    textAnchor="middle" 
                    fontSize="3" 
                    fill="white" 
                    fontWeight="bold"
                  >
                    {PACKET_TYPES[currentPacket as keyof typeof PACKET_TYPES]?.name || currentPacket}
                    <animate 
                      attributeName="x" 
                      from={packetPosition.x < 50 ? "35" : "65"} 
                      to={packetPosition.x < 50 ? "65" : "35"} 
                      dur="1s" 
                      fill="freeze"
                    />
                  </text>
                </g>
              )}
            </svg>

            {/* R1 - 百分比定位 */}
            <div className="absolute" style={{ left: '20%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                currentState >= 0 ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400' : 'bg-gray-100 border-gray-300'
              }`}>
                <Server size={48} className={currentState >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                <div className="text-center mt-2 font-semibold text-gray-900 dark:text-white">R1</div>
                <div className="text-center text-xs text-gray-500 dark:text-gray-400">192.168.1.1</div>
                <div className={`text-center text-xs font-bold mt-1 ${
                  currentState >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                }`}>
                  {getR1State()}
                </div>
              </div>
            </div>

            {/* R2 - 百分比定位 */}
            <div className="absolute" style={{ left: '80%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                currentState >= 1 ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400' : 'bg-gray-100 border-gray-300'
              }`}>
                <Server size={48} className={currentState >= 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                <div className="text-center mt-2 font-semibold text-gray-900 dark:text-white">R2</div>
                <div className="text-center text-xs text-gray-500 dark:text-gray-400">192.168.1.2</div>
                <div className={`text-center text-xs font-bold mt-1 ${
                  currentState >= 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                }`}>
                  {getR2State()}
                </div>
              </div>
            </div>

            {/* 当前步骤说明 - 百分比定位 */}
            <div className="absolute" style={{ left: '50%', bottom: '5%', transform: 'translateX(-50%)' }}>
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center whitespace-nowrap">
                {ANIMATION_STEPS[currentState]?.description || '准备建立邻居关系'}
              </div>
            </div>
          </div>

          {/* 状态进度条 */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">建立进度</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{currentState + 1} / {ANIMATION_STEPS.length}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${((currentState + 1) / ANIMATION_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 下方：邻居状态和报文类型 (p-4) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 邻居建立过程卡片 */}
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
                    currentStepStateId === state.id
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
                    {currentStepStateId === state.id && (
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

          {/* 报文类型和知识点卡片 */}
          <div className="space-y-3">
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

            {/* 三个知识点小卡片 */}
            <div className="grid grid-cols-1 gap-3">
              {/* 邻居 vs 邻接 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={16} className="text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">邻居 vs 邻接</h4>
                </div>
                <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5">
                  <li>• <strong>邻居</strong>：2-Way状态，Hello交互</li>
                  <li>• <strong>邻接</strong>：Full状态，LSDB同步</li>
                </ul>
              </div>

              {/* 状态转换条件 */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">状态转换条件</h4>
                </div>
                <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5">
                  <li>• Down → Init：收到Hello</li>
                  <li>• Init → 2-Way：看到自己的ID</li>
                  <li>• Loading → Full：LSDB同步完成</li>
                </ul>
              </div>

              {/* 故障排查 */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-3 shadow">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">故障排查</h4>
                </div>
                <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5">
                  <li>• 卡在Init：检查Hello/Dead时间</li>
                  <li>• 卡在ExStart：MTU不匹配</li>
                  <li>• 检查区域ID、认证、网络类型</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
