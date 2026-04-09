import { useState, useEffect, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, Server, Activity, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

// BGP状态
const BGP_STATES = [
  { 
    id: 'idle', 
    name: 'Idle', 
    description: '初始状态，等待启动事件', 
    color: '#ef4444',
    conditions: '等待管理员启动或配置',
    failures: 'BGP未启动、配置错误'
  },
  { 
    id: 'connect', 
    name: 'Connect', 
    description: '等待TCP连接完成', 
    color: '#f97316',
    conditions: 'TCP三次握手进行中',
    failures: 'TCP 179端口不可达、ACL阻断'
  },
  { 
    id: 'active', 
    name: 'Active', 
    description: 'TCP连接失败，持续尝试重连', 
    color: '#eab308',
    conditions: '反复尝试建立TCP连接',
    failures: '网络不通、对端未响应'
  },
  { 
    id: 'opensent', 
    name: 'OpenSent', 
    description: '已发送OPEN报文，等待对端OPEN', 
    color: '#3b82f6',
    conditions: 'TCP连接成功，发送OPEN',
    failures: 'AS号不匹配、版本不兼容'
  },
  { 
    id: 'openconfirm', 
    name: 'OpenConfirm', 
    description: '收到对端OPEN，发送Keepalive', 
    color: '#8b5cf6',
    conditions: 'OPEN参数协商成功',
    failures: 'Hold Time不匹配、认证失败'
  },
  { 
    id: 'established', 
    name: 'Established', 
    description: '邻居关系建立，可交换UPDATE', 
    color: '#22c55e',
    conditions: '收到Keepalive确认',
    failures: '正常运行状态'
  },
];

// 动画步骤
const ANIMATION_STEPS = [
  { from: 'idle', to: 'connect', action: '启动BGP，发起TCP连接', success: true },
  { from: 'connect', to: 'opensent', action: 'TCP连接成功，发送OPEN报文', success: true },
  { from: 'opensent', to: 'openconfirm', action: '收到对端OPEN，发送Keepalive', success: true },
  { from: 'openconfirm', to: 'established', action: '收到Keepalive，邻居建立', success: true },
];

// 失败场景
const FAILURE_SCENARIOS = [
  { from: 'connect', to: 'active', reason: 'TCP连接失败，进入Active重试' },
  { from: 'active', to: 'connect', reason: '重试TCP连接' },
  { from: 'opensent', to: 'idle', reason: 'OPEN报文错误，回到Idle' },
  { from: 'openconfirm', to: 'idle', reason: 'Keepalive超时，回到Idle' },
];

export function BGPFSMScene() {
  const [currentState, setCurrentState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showFailurePath, setShowFailurePath] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'success' | 'failure'>('pending');

  // 动画控制
  const playAnimation = useCallback(() => {
    setIsPlaying(true);
    setConnectionStatus('pending');
  }, []);

  const pauseAnimation = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsPlaying(false);
    setCurrentState(0);
    setConnectionStatus('pending');
  }, []);

  // 自动播放动画
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentState((prev) => {
        if (prev >= BGP_STATES.length - 1) {
          setIsPlaying(false);
          setConnectionStatus('success');
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentStateInfo = BGP_STATES[currentState];

  // 场景数据
  const scene = {
    id: 'bgp-fsm',
    title: 'BGP有限状态机',
    description: 'BGP使用TCP作为传输协议，状态机确保邻居关系可靠建立。Established表示可以交换UPDATE路由。',
    phase: 1 as const,
    category: 'BGP路由协议',
    difficulty: 'medium' as const,
    duration: '6-8分钟',
  };

  return (
    <SceneLayout scene={scene} showSidebar={false}>
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* 左侧：状态机可视化 */}
        <div className="col-span-7 h-full overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                BGP邻居建立过程
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
                <button
                  onClick={() => setShowFailurePath(!showFailurePath)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                    showFailurePath 
                      ? 'bg-red-600 text-white' 
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  <AlertCircle size={16} />
                  故障路径
                </button>
              </div>
            </div>

            {/* BGP路由器拓扑 */}
            <div className="relative h-80 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden mb-6">
              {/* AS100 */}
              <div className="absolute left-12 top-1/2 -translate-y-1/2">
                <div className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                  currentState >= 0 ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400' : 'bg-gray-100 border-gray-300'
                }`}>
                  <Server size={40} className={currentState >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                  <div className="text-center mt-2 font-semibold text-gray-900 dark:text-white">R1</div>
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">AS 100</div>
                  <div className="text-center text-xs font-mono text-blue-600 dark:text-blue-400 mt-1">:179</div>
                </div>
              </div>

              {/* AS200 */}
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <div className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                  currentState >= 0 ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400' : 'bg-gray-100 border-gray-300'
                }`}>
                  <Server size={40} className={currentState >= 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                  <div className="text-center mt-2 font-semibold text-gray-900 dark:text-white">R2</div>
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">AS 200</div>
                  <div className="text-center text-xs font-mono text-green-600 dark:text-green-400 mt-1">:179</div>
                </div>
              </div>

              {/* TCP连接状态 */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {currentState === 0 && (
                  <div className="text-gray-400 text-sm">等待启动...</div>
                )}
                {currentState === 1 && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Clock size={16} className="animate-spin" />
                    <span className="text-sm font-medium">TCP三次握手...</span>
                  </div>
                )}
                {currentState === 2 && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <XCircle size={16} />
                    <span className="text-sm font-medium">连接失败，重试中...</span>
                  </div>
                )}
                {currentState >= 3 && currentState < 5 && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Activity size={16} className="animate-pulse" />
                    <span className="text-sm font-medium">OPEN协商中...</span>
                  </div>
                )}
                {currentState === 5 && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Established!</span>
                  </div>
                )}
              </div>

              {/* 连接线 */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-0.5 bg-gray-300 dark:bg-gray-600" />
              
              {/* TCP连接指示 */}
              {currentState >= 1 && currentState !== 2 && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                </div>
              )}
            </div>

            {/* 状态进度 */}
            <div className="flex items-center justify-between">
              {BGP_STATES.map((state, index) => (
                <div key={state.id} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-300 ${
                      index <= currentState ? 'scale-110' : 'opacity-50'
                    }`}
                    style={{ backgroundColor: index <= currentState ? state.color : '#9ca3af' }}
                  >
                    {index + 1}
                  </div>
                  {index < BGP_STATES.length - 1 && (
                    <div 
                      className={`w-8 h-0.5 transition-all duration-300 ${
                        index < currentState ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {BGP_STATES.map((state, index) => (
                <div key={state.id} className={`text-xs text-center w-10 ${
                  index === currentState ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {state.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：状态详情 */}
        <div className="col-span-5 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              BGP状态详情
            </h3>
            <div className="space-y-2">
              {BGP_STATES.map((state, index) => (
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
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">停留条件：</span>
                        <span className="text-blue-600 dark:text-blue-400">{state.conditions}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">典型故障：</span>
                        <span className="text-red-600 dark:text-red-400">{state.failures}</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 故障场景 */}
          {showFailurePath && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                故障转移路径
              </h3>
              <div className="space-y-2">
                {FAILURE_SCENARIOS.map((scenario, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <XCircle size={16} className="text-red-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {scenario.from} → {scenario.to}
                    </span>
                    <span className="text-red-600 dark:text-red-400">: {scenario.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部：关键知识点 */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 shadow">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">TCP传输</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• BGP使用TCP端口179</li>
            <li>• 由传输层保证可靠性</li>
            <li>• 无需周期性发送整个路由表</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 shadow">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">状态转换</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• Idle → Connect：启动BGP</li>
            <li>• Connect失败 → Active重试</li>
            <li>• OpenConfirm → Established</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 shadow">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">故障排查</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• Idle：检查BGP是否启动</li>
            <li>• Active：检查网络连通性</li>
            <li>• OpenSent：检查AS号配置</li>
          </ul>
        </div>
      </div>
    </SceneLayout>
  );
}
