import { useState, useEffect, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, Server, Activity, AlertCircle, CheckCircle, XCircle, Clock, BookOpen } from 'lucide-react';

// BGP状态 - 根据RFC 4271
const BGP_STATES = [
  { 
    id: 'idle', 
    name: 'Idle', 
    description: '初始状态，等待启动事件', 
    color: '#ef4444',
    conditions: '等待管理员启动BGP进程',
    failures: 'BGP未启动、配置错误、邻居未配置'
  },
  { 
    id: 'connect', 
    name: 'Connect', 
    description: '等待TCP连接完成（端口179）', 
    color: '#f97316',
    conditions: 'BGP启动，开始TCP三次握手',
    failures: 'TCP 179端口不可达、ACL阻断、网络不通'
  },
  { 
    id: 'active', 
    name: 'Active', 
    description: 'TCP连接失败，持续尝试重连', 
    color: '#eab308',
    conditions: 'Connect状态TCP连接失败',
    failures: '对端未响应、路由不可达、防火墙阻断'
  },
  { 
    id: 'opensent', 
    name: 'OpenSent', 
    description: 'TCP连接成功，已发送OPEN报文', 
    color: '#3b82f6',
    conditions: 'TCP三次握手成功，发送OPEN',
    failures: 'AS号不匹配、BGP版本不兼容、BGP ID冲突'
  },
  { 
    id: 'openconfirm', 
    name: 'OpenConfirm', 
    description: '收到对端OPEN，已发送Keepalive', 
    color: '#8b5cf6',
    conditions: 'OPEN参数协商成功，等待Keepalive',
    failures: 'Hold Time不匹配、认证失败、参数不一致'
  },
  { 
    id: 'established', 
    name: 'Established', 
    description: '邻居关系建立，可交换UPDATE', 
    color: '#22c55e',
    conditions: '收到Keepalive确认',
    failures: '正常运行状态，可交换路由更新'
  },
];

// 正常路径动画步骤
// RFC 4271规定：Idle → Connect → OpenSent → OpenConfirm → Established
// Active是Connect失败后的回退状态，不是必经路径
const NORMAL_PATH_STEPS = [
  { 
    stateIndex: 0, 
    action: '管理员配置BGP邻居，启动BGP进程',
    detail: 'router bgp <AS> \n neighbor <IP> remote-as <AS>'
  },
  { 
    stateIndex: 1, 
    action: '进入Connect状态，发起TCP连接（目标端口179）',
    detail: 'TCP三次握手进行中... SYN → SYN-ACK → ACK'
  },
  { 
    stateIndex: 3, 
    action: 'TCP连接成功，发送OPEN报文',
    detail: 'OPEN报文包含：本地AS号、Hold Time、BGP Identifier、可选参数'
  },
  { 
    stateIndex: 4, 
    action: '收到对端OPEN，参数协商成功，发送Keepalive',
    detail: 'Keepalive报文用于维持邻居关系，间隔通常为Hold Time/3'
  },
  { 
    stateIndex: 5, 
    action: '收到对端Keepalive，BGP邻居关系正式建立',
    detail: 'Established状态可以交换UPDATE、NOTIFICATION、KEEPALIVE报文'
  },
];

// 故障场景路径
const FAILURE_SCENARIOS = [
  { from: 'Connect', to: 'Active', reason: 'TCP连接失败（超时或对端拒绝）', solution: '检查网络连通性、ACL配置、对端BGP配置' },
  { from: 'Active', to: 'Connect', reason: '重试TCP连接', solution: '持续尝试建立连接' },
  { from: 'Active', to: 'Idle', reason: '重试次数超过限制', solution: '检查对端是否启动BGP、网络路由是否正确' },
  { from: 'OpenSent', to: 'Idle', reason: 'OPEN报文错误（AS号不匹配等）', solution: '检查neighbor remote-as配置是否正确' },
  { from: 'OpenConfirm', to: 'Idle', reason: 'Keepalive超时或收到NOTIFICATION', solution: '检查Hold Time配置、认证配置' },
  { from: 'Established', to: 'Idle', reason: '收到NOTIFICATION或Keepalive超时', solution: '检查路由策略、内存资源、CPU负载' },
];

// 考试要点
const EXAM_POINTS = [
  {
    title: 'BGP使用TCP',
    points: [
      'BGP使用TCP端口179（由IANA分配）',
      'TCP提供可靠传输，BGP无需自己实现确认机制',
      '不同于OSPF/IS-IS直接使用IP协议'
    ]
  },
  {
    title: '状态机必考',
    points: [
      '正常路径：Idle → Connect → OpenSent → OpenConfirm → Established',
      'Active是故障回退状态，不是必经路径',
      '任何状态收到NOTIFICATION都会回到Idle'
    ]
  },
  {
    title: '故障排查',
    points: [
      'Idle：检查BGP进程是否启动、邻居是否配置',
      'Active：检查网络层连通性（ping）、TCP 179端口',
      'OpenSent：检查AS号配置、BGP版本兼容性'
    ]
  }
];

export function BGPFSMScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showFailurePath, setShowFailurePath] = useState(false);
  const [showExamPoints, setShowExamPoints] = useState(false);
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
    setCurrentStep(0);
    setConnectionStatus('pending');
  }, []);

  // 自动播放动画 - 优化动画时机，使用更合理的间隔
  useEffect(() => {
    if (!isPlaying) return;

    // 根据当前步骤动态调整动画间隔
    const getInterval = (step: number): number => {
      switch (step) {
        case 0: return 1500; // Idle -> Connect: 快速
        case 1: return 2500; // Connect -> OpenSent: TCP握手需要更多时间
        case 2: return 2000; // OpenSent -> OpenConfirm: OPEN交换
        case 3: return 2000; // OpenConfirm -> Established: Keepalive确认
        default: return 2000;
      }
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    
    const scheduleNextStep = () => {
      const interval = getInterval(currentStep);
      timeoutId = setTimeout(() => {
        setCurrentStep((prev) => {
          if (prev >= NORMAL_PATH_STEPS.length - 1) {
            setIsPlaying(false);
            setConnectionStatus('success');
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    };

    scheduleNextStep();

    return () => clearTimeout(timeoutId);
  }, [isPlaying, currentStep]);

  const currentStepInfo = NORMAL_PATH_STEPS[currentStep];
  const currentStateInfo = BGP_STATES[currentStepInfo.stateIndex];

  // 场景数据
  const scene = {
    id: 'bgp-fsm',
    title: 'BGP有限状态机 (RFC 4271)',
    description: 'BGP使用TCP端口179作为传输协议，状态机确保邻居关系可靠建立。正常路径：Idle→Connect→OpenSent→OpenConfirm→Established',
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
                <span className="ml-2 text-xs font-normal text-gray-500">(RFC 4271)</span>
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

            {/* 当前步骤详情 */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <span 
                  className="px-2 py-1 rounded text-white text-sm font-bold"
                  style={{ backgroundColor: currentStateInfo.color }}
                >
                  {currentStateInfo.name}
                </span>
                <span className="text-gray-600 dark:text-gray-400">{currentStepInfo.action}</span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded">
                {currentStepInfo.detail}
              </div>
            </div>

            {/* BGP路由器拓扑 */}
            <div className="relative h-64 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden mb-6">
              {/* AS100 */}
              <div className="absolute left-12 top-1/2 -translate-y-1/2">
                <div className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                  currentStep >= 0 ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400' : 'bg-gray-100 border-gray-300'
                }`}>
                  <Server size={40} className={currentStep >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                  <div className="text-center mt-2 font-semibold text-gray-900 dark:text-white">R1</div>
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">AS 100</div>
                  <div className="text-center text-xs font-mono text-blue-600 dark:text-blue-400 mt-1">:179</div>
                </div>
              </div>

              {/* AS200 */}
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <div className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                  currentStep >= 0 ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400' : 'bg-gray-100 border-gray-300'
                }`}>
                  <Server size={40} className={currentStep >= 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                  <div className="text-center mt-2 font-semibold text-gray-900 dark:text-white">R2</div>
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">AS 200</div>
                  <div className="text-center text-xs font-mono text-green-600 dark:text-green-400 mt-1">:179</div>
                </div>
              </div>

              {/* TCP连接状态 */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {currentStep === 0 && (
                  <div className="text-gray-400 text-sm">等待启动...</div>
                )}
                {currentStep === 1 && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Clock size={16} className="animate-spin" />
                    <span className="text-sm font-medium">TCP三次握手...</span>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Activity size={16} className="animate-pulse" />
                    <span className="text-sm font-medium">发送OPEN...</span>
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <Activity size={16} className="animate-pulse" />
                    <span className="text-sm font-medium">OPEN协商...</span>
                  </div>
                )}
                {currentStep === 4 && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Established!</span>
                  </div>
                )}
              </div>

              {/* 连接线 */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-0.5 bg-gray-300 dark:bg-gray-600" />
              
              {/* TCP连接指示 */}
              {currentStep >= 1 && currentStep < 4 && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                </div>
              )}
            </div>

            {/* 状态进度 - 正常路径 */}
            <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">正常路径（实线）</div>
            <div className="flex items-center justify-between mb-4">
              {[0, 1, 3, 4, 5].map((stateIndex, index) => {
                const state = BGP_STATES[stateIndex];
                const isActive = currentStepInfo.stateIndex === stateIndex;
                const isCompleted = currentStep > index;
                return (
                  <div key={state.id} className="flex items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-300 ${
                        isActive ? 'scale-125 ring-4 ring-blue-300' : ''
                      }`}
                      style={{ backgroundColor: isCompleted || isActive ? state.color : '#9ca3af' }}
                    >
                      {index + 1}
                    </div>
                    {index < 4 && (
                      <div 
                        className={`w-8 h-0.5 transition-all duration-300 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mb-6">
              {['Idle', 'Connect', 'OpenSent', 'OpenConfirm', 'Established'].map((name, index) => (
                <div key={name} className={`text-xs text-center w-10 ${
                  currentStep === index ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {name}
                </div>
              ))}
            </div>

            {/* Active状态（故障路径） */}
            <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">故障回退路径（虚线）</div>
            <div className="flex items-center gap-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: BGP_STATES[2].color }}
              >
                3
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{BGP_STATES[2].name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{BGP_STATES[2].description}</div>
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ 注意：Active不是必经路径，是Connect失败后的回退状态
                </div>
              </div>
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
                    currentStateInfo.id === state.id
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
                    {currentStateInfo.id === state.id && (
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
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {FAILURE_SCENARIOS.map((scenario, index) => (
                  <div key={index} className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle size={14} className="text-red-500" />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        {scenario.from} → {scenario.to}
                      </span>
                    </div>
                    <div className="text-red-600 dark:text-red-400 text-xs mb-1">{scenario.reason}</div>
                    <div className="text-green-600 dark:text-green-400 text-xs">✓ {scenario.solution}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 考试要点 */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg shadow-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <button
              onClick={() => setShowExamPoints(!showExamPoints)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-400">考试要点</h3>
              </div>
              <span className="text-yellow-600">{showExamPoints ? '▼' : '▶'}</span>
            </button>
            
            {showExamPoints && (
              <div className="mt-3 space-y-3">
                {EXAM_POINTS.map((section, index) => (
                  <div key={index} className="bg-white/50 dark:bg-gray-800/50 rounded p-3">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{section.title}</div>
                    <ul className="space-y-1">
                      {section.points.map((point, pIndex) => (
                        <li key={pIndex} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                          <span className="text-yellow-500">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部：关键知识点 */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 shadow">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">TCP传输</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• BGP使用TCP端口179</li>
            <li>• 由传输层保证可靠性</li>
            <li>• 不同于OSPF直接使用IP</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 shadow">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">状态转换</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• 正常：Idle→Connect→OpenSent→OpenConfirm→Established</li>
            <li>• Active是故障回退状态</li>
            <li>• 任何错误都回到Idle</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 shadow">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">故障排查</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• Idle：检查BGP配置</li>
            <li>• Active：检查网络连通性</li>
            <li>• OpenSent：检查AS号</li>
          </ul>
        </div>
      </div>
    </SceneLayout>
  );
}
