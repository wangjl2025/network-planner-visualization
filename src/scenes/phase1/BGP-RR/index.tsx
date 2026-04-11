import { useState, useEffect, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, Server, ArrowRight, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

// BGP路由反射器场景
export function BGPRRScene() {
  // 场景数据
  const scene = {
    id: 'bgp-rr',
    title: 'BGP路由反射器',
    description: 'IBGP水平分割问题与路由反射器解决方案，展示RR的工作原理和Cluster-ID防环机制',
    phase: 1 as const,
    category: 'BGP路由协议',
    difficulty: 'medium' as const,
    duration: '5-7分钟',
  };

  // 状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [rrEnabled, setRrEnabled] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');

  // 步骤定义 - 动画阶段
  const steps = [
    { id: 'intro', title: 'IBGP全互联问题', description: 'AS内部需要建立n(n-1)/2条IBGP连接以避免路由环路' },
    { id: 'split', title: 'R1向R2通告路由', description: 'R1通过eBGP学到10.0.0.0/8，通告给IBGP邻居R2' },
    { id: 'problem', title: 'IBGP水平分割规则阻断', description: 'R2从IBGP学到路由，但IBGP水平分割规则阻止转发给R3（从IBGP邻居学到的路由不能再传给其他IBGP邻居）' },
    { id: 'rr', title: '启用路由反射器', description: 'R2配置为RR，豁免水平分割规则，将路由反射给Client R3' },
    { id: 'cluster', title: 'Cluster防环机制', description: 'RR添加Cluster_List和Originator_ID，防止同一路由在多个RR间循环反射' },
  ];

  // 动画阶段类型
  type AnimationPhase = 'idle' | 'r1-advertise' | 'blocked' | 'reflected';

  // 自动播放
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // 根据步骤更新动画阶段
  useEffect(() => {
    const phaseMap: Record<number, AnimationPhase> = {
      0: 'idle',           // IBGP全互联问题
      1: 'r1-advertise',   // R1通告路由给R2
      2: 'blocked',        // 水平分割阻断
      3: 'reflected',      // RR反射路由
      4: 'reflected',      // 防环机制
    };
    setAnimationPhase(phaseMap[currentStep] || 'idle');
    if (currentStep >= 3) {
      setRrEnabled(true);
    } else if (currentStep < 3) {
      setRrEnabled(false);
    }
  }, [currentStep]);

  // 重置
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    setRrEnabled(false);
    setAnimationPhase('idle');
  }, []);

  // 手动切换RR
  const toggleRR = useCallback(() => {
    setRrEnabled(prev => !prev);
    if (!rrEnabled) {
      setCurrentStep(3);
      setAnimationPhase('reflected');
    } else {
      setCurrentStep(2);
      setAnimationPhase('blocked');
    }
  }, [rrEnabled]);

  return (
    <SceneLayout
      scene={scene}
      showSidebar={false}
    >
      <div className="h-full overflow-y-auto">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <RotateCcw size={18} />
            重置
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">路由反射器:</span>
          <button
            onClick={toggleRR}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              rrEnabled ? 'bg-blue-600' : 'bg-gray-400'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                rrEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${rrEnabled ? 'text-blue-600' : 'text-gray-500'}`}>
            {rrEnabled ? '启用' : '禁用'}
          </span>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          步骤: {currentStep + 1} / {steps.length}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：网络拓扑 */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Server size={20} />
            IBGP拓扑与路由传播
          </h3>

          {/* 网络拓扑图 - 使用SVG实现响应式布局 */}
          <div className="relative h-80 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {/* 外部AS - 左侧 */}
              <g transform="translate(5, 50)">
                <rect x="-8" y="-8" width="16" height="16" rx="2" fill="#fed7aa" stroke="#fb923c" strokeWidth="1"/>
                <text x="0" y="2" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#ea580c">AS2</text>
              </g>

              {/* AS1标识 - 顶部 */}
              <g transform="translate(50, 10)">
                <rect x="-15" y="-4" width="30" height="8" rx="4" fill="#e5e7eb"/>
                <text x="0" y="2" textAnchor="middle" fontSize="4" fill="#374151">AS1 (IBGP)</text>
              </g>

              {/* 连接线 - R1到R2 */}
              <line x1="20" y1="50" x2="50" y2="50" stroke="#d1d5db" strokeWidth="0.5"/>
              
              {/* 连接线 - R2到R3 */}
              <line x1="50" y1="50" x2="80" y2="50" stroke="#d1d5db" strokeWidth="0.5"/>
              
              {/* 全互联虚线 - R1到R3直接连接 */}
              <path d="M 20 50 Q 50 20 80 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2,1"/>
              <text x="50" y="32" textAnchor="middle" fontSize="3" fill="#9ca3af">需要直接IBGP连接</text>

              {/* 路由传播动画 - R1→R2 (蓝色) */}
              {(animationPhase === 'r1-advertise' || animationPhase === 'reflected') && (
                <g transform="translate(35, 50)">
                  <circle r="4" fill="#3b82f6" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1s" repeatCount="indefinite"/>
                  </circle>
                  <text x="0" y="1.5" textAnchor="middle" fontSize="2.5" fill="white">10.0.0.0/8</text>
                </g>
              )}

              {/* 路由传播动画 - R2→R3 (绿色) - RR反射 */}
              {animationPhase === 'reflected' && (
                <g transform="translate(65, 50)">
                  <circle r="4" fill="#22c55e" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1s" repeatCount="indefinite"/>
                  </circle>
                  <text x="0" y="1.5" textAnchor="middle" fontSize="2.5" fill="white">10.0.0.0/8</text>
                </g>
              )}

              {/* 阻断标识 - R2到R3 */}
              {animationPhase === 'blocked' && (
                <g transform="translate(65, 50)">
                  <circle r="5" fill="#ef4444"/>
                  <text x="0" y="1.5" textAnchor="middle" fontSize="2.5" fill="white">×</text>
                  <text x="0" y="10" textAnchor="middle" fontSize="3" fill="#ef4444">水平分割</text>
                </g>
              )}

              {/* R2已收到路由标识 */}
              {animationPhase === 'blocked' && (
                <g transform="translate(50, 58)">
                  <text x="0" y="0" textAnchor="middle" fontSize="3" fill="#6b7280">R2已收到路由</text>
                  <text x="0" y="4" textAnchor="middle" fontSize="2.5" fill="#6b7280">但无法转发</text>
                </g>
              )}
            </svg>

            {/* R1 - eBGP边界路由器 - 百分比定位 */}
            <div className="absolute" style={{ left: '20%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
                animationPhase === 'r1-advertise' || animationPhase === 'reflected'
                  ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400'
                  : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600'
              }`}>
                <Server size={24} className={animationPhase === 'r1-advertise' || animationPhase === 'reflected' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} />
                <span className="text-xs font-medium mt-1">R1</span>
                <span className="text-[10px] text-gray-500">eBGP</span>
              </div>
            </div>

            {/* R2 - 路由反射器 - 百分比定位 */}
            <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
                rrEnabled
                  ? 'bg-purple-100 border-purple-500 dark:bg-purple-900/30 dark:border-purple-400 shadow-lg shadow-purple-200 dark:shadow-purple-900/30'
                  : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600'
              }`}>
                <Server size={28} className={rrEnabled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'} />
                <span className="text-sm font-medium mt-1">R2</span>
                <span className="text-[10px] text-gray-500">{rrEnabled ? 'RR' : 'IBGP'}</span>
              </div>
              {/* RR标识 */}
              {rrEnabled && (
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  RR
                </div>
              )}
            </div>

            {/* R3 - IBGP邻居 - 百分比定位 */}
            <div className="absolute" style={{ left: '80%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
                animationPhase === 'reflected'
                  ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400'
                  : animationPhase === 'blocked'
                  ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-600'
                  : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600'
              }`}>
                <Server size={24} className={
                  animationPhase === 'reflected'
                    ? 'text-green-600 dark:text-green-400'
                    : animationPhase === 'blocked'
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                } />
                <span className="text-xs font-medium mt-1">R3</span>
                <span className="text-[10px] text-gray-500">IBGP</span>
              </div>
              {/* Client标识 */}
              {rrEnabled && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  Client
                </div>
              )}
            </div>

            {/* 外部AS - 百分比定位 */}
            <div className="absolute" style={{ left: '5%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className="w-12 h-12 rounded-lg bg-orange-100 border-2 border-orange-400 flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600">AS2</span>
              </div>
            </div>

            {/* AS1标识 - 百分比定位 */}
            <div className="absolute" style={{ left: '50%', top: '10%', transform: 'translate(-50%, -50%)' }}>
              <div className="px-4 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                AS1 (IBGP)
              </div>
            </div>
          </div>

          {/* 步骤说明 */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              {steps[currentStep].title}
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* 右侧：信息面板 */}
        <div className="space-y-4">
          {/* RR规则 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500" />
              路由反射规则
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">1.</span>
                <span>从EBGP学到的路由：反射给所有Client和非Client</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">2.</span>
                <span>从Client学到的路由：反射给所有非Client和Client（除发送者）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">3.</span>
                <span>从非Client学到的路由：反射给所有Client</span>
              </li>
            </ul>
          </div>

          {/* 防环机制 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              防环机制
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded">
                <div className="font-medium text-amber-900 dark:text-amber-300 text-sm">Originator_ID</div>
                <div className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  RR创建，值为发起者的Router ID，用于识别路由源头
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded">
                <div className="font-medium text-amber-900 dark:text-amber-300 text-sm">Cluster_List</div>
                <div className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  记录经过的Cluster ID，防止Cluster间环路
                </div>
              </div>
            </div>
          </div>

          {/* 配置示例 */}
          <div className="bg-gray-900 rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-100 mb-3">配置示例</h4>
            <pre className="text-xs text-green-400 overflow-x-auto">
{`! R2作为RR
router bgp 100
 neighbor 10.1.1.1 remote-as 100
 neighbor 10.1.1.1 route-reflector-client
 neighbor 10.3.3.3 remote-as 100
 neighbor 10.3.3.3 route-reflector-client
!
! 可选：配置Cluster ID
bgp cluster-id 1.1.1.1`}
            </pre>
          </div>
        </div>
      </div>

      {/* 底部：对比说明 */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
            <XCircle size={18} />
            无RR时的问题
          </h4>
          <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
            <li>• n台路由器需要 n(n-1)/2 条IBGP连接</li>
            <li>• 10台路由器需要 45 条IBGP会话</li>
            <li>• 配置复杂，维护困难</li>
            <li>• 水平分割导致路由传播受限</li>
          </ul>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
            <CheckCircle size={18} />
            使用RR后的优势
          </h4>
          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
            <li>• n台路由器只需要 (n-1) 条IBGP连接</li>
            <li>• 10台路由器仅需 9 条IBGP会话</li>
            <li>• 配置简单，易于扩展</li>
            <li>• 减少TCP连接数，降低设备负担</li>
          </ul>
        </div>
      </div>
      </div>
    </SceneLayout>
  );
}
