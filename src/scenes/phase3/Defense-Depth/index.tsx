import { useState, useEffect, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, Shield, AlertTriangle, CheckCircle, Server, Globe, Lock } from 'lucide-react';

// 纵深防御模型场景
export function DefenseDepthScene() {
  // 场景数据
  const sceneData = {
    id: 'defense-depth',
    title: '纵深防御模型',
    description: '分层防御架构演示，展示从互联网到内部网络的多层安全防护机制',
    phase: 3 as const,
    category: '网络安全',
    difficulty: 'medium' as const,
    duration: '5-7分钟',
  };

  // 状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
  const [attackType, setAttackType] = useState<'normal' | 'sql-injection' | 'ddos' | 'malware'>('normal');

  // 防御层定义
  const defenseLayers = [
    {
      id: 'internet',
      name: '互联网',
      icon: Globe,
      color: '#6b7280',
      description: '不可信的外部网络',
      attacks: ['DDoS攻击', '端口扫描', '暴力破解'],
      defenses: ['流量清洗', '黑洞路由'],
    },
    {
      id: 'firewall',
      name: '边界防火墙',
      icon: Shield,
      color: '#3b82f6',
      description: '网络边界第一道防线',
      attacks: ['未授权访问', 'IP欺骗', '非法端口'],
      defenses: ['ACL过滤', '状态检测', 'NAT转换'],
    },
    {
      id: 'waf',
      name: 'WAF',
      icon: Shield,
      color: '#10b981',
      description: 'Web应用防火墙',
      attacks: ['SQL注入', 'XSS攻击', 'CSRF攻击'],
      defenses: ['特征匹配', '行为分析', '虚拟补丁'],
    },
    {
      id: 'ips',
      name: 'IPS/IDS',
      icon: AlertTriangle,
      color: '#f59e0b',
      description: '入侵防御/检测系统',
      attacks: ['漏洞利用', '恶意代码', '异常流量'],
      defenses: ['特征检测', '异常检测', '自动阻断'],
    },
    {
      id: 'internal',
      name: '内部网络',
      icon: Server,
      color: '#8b5cf6',
      description: '受保护的内部区域',
      attacks: ['横向移动', '权限提升', '数据窃取'],
      defenses: ['网络分段', '访问控制', '流量监控'],
    },
    {
      id: 'host',
      name: '主机安全',
      icon: Lock,
      color: '#ec4899',
      description: '终端最后一道防线',
      attacks: ['恶意软件', '勒索病毒', '后门程序'],
      defenses: ['杀毒软件', 'EDR', '补丁管理'],
    },
  ];

  // 步骤定义
  const steps = [
    { id: 'intro', title: '纵深防御简介', description: '多层安全防护，单点失效不会导致整体沦陷' },
    { id: 'normal', title: '正常流量通过', description: '合法请求逐层通过，最终到达服务器' },
    { id: 'attack', title: '攻击拦截演示', description: '恶意请求在各层被检测并拦截' },
    { id: 'layer-info', title: '分层防护详情', description: '点击各层查看防护的攻击类型' },
  ];

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
    }, 4000);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // 重置
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    setSelectedLayer(null);
    setAttackType('normal');
  }, []);

  // 渲染防御架构图
  const renderDefenseArchitecture = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h4 className="text-white font-medium mb-4">分层防御架构</h4>
        
        <div className="relative">
          {/* 攻击流量动画 */}
          {(currentStep === 1 || currentStep === 2) && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10">
              <div 
                className={`w-6 h-6 rounded-full animate-pulse ${
                  attackType === 'normal' ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  animation: 'slideRight 3s linear infinite',
                }}
              />
            </div>
          )}

          {/* 防御层 */}
          <div className="flex items-center justify-between gap-2">
            {defenseLayers.map((layer, index) => {
              const Icon = layer.icon;
              const isSelected = selectedLayer === index;
              const isBlocked = currentStep === 2 && (layer.id === 'waf' || layer.id === 'ips');
              
              return (
                <div key={layer.id} className="flex-1">
                  <div
                    onClick={() => setSelectedLayer(index)}
                    className={`relative p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'ring-2 ring-white' 
                        : 'hover:opacity-80'
                    } ${isBlocked ? 'animate-pulse' : ''}`}
                    style={{ 
                      backgroundColor: isBlocked ? '#ef4444' : layer.color + '30',
                      border: `2px solid ${isBlocked ? '#ef4444' : layer.color}`,
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <Icon 
                        className="w-8 h-8 mb-2" 
                        style={{ color: isBlocked ? '#fff' : layer.color }} 
                      />
                      <div className="text-white text-xs font-medium text-center">
                        {layer.name}
                      </div>
                      {isBlocked && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✕</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 箭头 */}
                  {index < defenseLayers.length - 1 && (
                    <div className="absolute top-1/2 transform -translate-y-1/2" style={{ left: `${(index + 1) * 16.5}%` }}>
                      <div className="w-4 h-0.5 bg-gray-600" />
                      <div className="w-2 h-2 border-t-2 border-r-2 border-gray-600 transform rotate-45 absolute -top-0.5 left-2" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 图例 */}
          <div className="mt-4 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-400">正常流量</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-400">恶意攻击</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600" />
              <span className="text-gray-400">被拦截</span>
            </div>
          </div>
        </div>

        {/* 选中的层详情 */}
        {selectedLayer !== null && (
          <div className="mt-4 bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              {(() => {
                const Icon = defenseLayers[selectedLayer].icon;
                return <Icon className="w-6 h-6" style={{ color: defenseLayers[selectedLayer].color }} />;
              })()}
              <h5 className="text-white font-medium">{defenseLayers[selectedLayer].name}</h5>
            </div>
            <p className="text-gray-400 text-sm mb-3">{defenseLayers[selectedLayer].description}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-red-400 text-xs font-medium mb-1">防御的攻击类型</div>
                <ul className="space-y-1">
                  {defenseLayers[selectedLayer].attacks.map((attack, i) => (
                    <li key={i} className="text-gray-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      {attack}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-green-400 text-xs font-medium mb-1">安全机制</div>
                <ul className="space-y-1">
                  {defenseLayers[selectedLayer].defenses.map((defense, i) => (
                    <li key={i} className="text-gray-400 text-xs flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {defense}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染攻击演示
  const renderAttackDemo = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h4 className="text-white font-medium mb-3">攻击类型演示</h4>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { type: 'normal', name: '正常请求', desc: '合法用户访问', color: '#10b981' },
            { type: 'sql-injection', name: 'SQL注入', desc: 'WAF层拦截', color: '#ef4444' },
            { type: 'ddos', name: 'DDoS攻击', desc: '防火墙层拦截', color: '#f59e0b' },
            { type: 'malware', name: '恶意软件', desc: '主机层拦截', color: '#8b5cf6' },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => setAttackType(item.type as any)}
              className={`p-3 rounded-lg text-left transition-all ${
                attackType === item.type
                  ? 'ring-2 ring-white'
                  : 'hover:bg-gray-700'
              }`}
              style={{ 
                backgroundColor: attackType === item.type ? item.color + '30' : '#374151',
                border: `1px solid ${attackType === item.type ? item.color : 'transparent'}`,
              }}
            >
              <div className="text-white text-sm font-medium">{item.name}</div>
              <div className="text-gray-400 text-xs">{item.desc}</div>
            </button>
          ))}
        </div>

        {/* 攻击流程 */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-gray-400 text-xs mb-2">攻击流程</div>
          {attackType === 'sql-injection' && (
            <div className="font-mono text-xs">
              <div className="text-red-400">GET /login?id=1' OR '1'='1</div>
              <div className="text-gray-500">↓ 经过防火墙（放行）</div>
              <div className="text-red-500 font-bold">↓ WAF检测到SQL注入特征，拦截！</div>
            </div>
          )}
          {attackType === 'ddos' && (
            <div className="font-mono text-xs">
              <div className="text-red-400">大量SYN请求 → 目标: 10.0.0.1:80</div>
              <div className="text-red-500 font-bold">↓ 防火墙检测到异常流量，触发清洗！</div>
            </div>
          )}
          {attackType === 'malware' && (
            <div className="font-mono text-xs">
              <div className="text-red-400">恶意文件下载请求</div>
              <div className="text-gray-500">↓ 经过防火墙（放行）</div>
              <div className="text-gray-500">↓ 经过WAF（放行）</div>
              <div className="text-red-500 font-bold">↓ 主机杀毒软件检测到病毒，隔离！</div>
            </div>
          )}
          {attackType === 'normal' && (
            <div className="font-mono text-xs">
              <div className="text-green-400">GET /api/data</div>
              <div className="text-gray-500">↓ 防火墙检查通过</div>
              <div className="text-gray-500">↓ WAF检查通过</div>
              <div className="text-gray-500">↓ IPS检查通过</div>
              <div className="text-green-500 font-bold">↓ 成功到达服务器</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <SceneLayout scene={sceneData}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto">
        {/* 左侧：控制面板 */}
        <div className="space-y-4">
          {/* 步骤进度 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">学习步骤</h3>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    index === currentStep
                      ? 'bg-blue-600 text-white'
                      : index < currentStep
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      index === currentStep
                        ? 'bg-white text-blue-600'
                        : index < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-400'
                    }`}>
                      {index < currentStep ? '✓' : index + 1}
                    </div>
                    <span className="font-medium">{step.title}</span>
                  </div>
                  {index === currentStep && (
                    <p className="text-sm mt-2 opacity-90">{step.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 播放控制 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? '暂停' : '播放'}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重置
              </button>
            </div>
          </div>

          {/* 纵深防御原则 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">纵深防御原则</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>多层防护，层层设防</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>单点失效不导致整体沦陷</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>不同层次使用不同技术</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>检测、防护、响应相结合</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 右侧：可视化区域 */}
        <div className="lg:col-span-2 space-y-4">
          {renderDefenseArchitecture()}
          {renderAttackDemo()}

          {/* 关键知识点 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">安全设备对比</h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-700 rounded p-3">
                <div className="text-blue-400 font-medium mb-1">防火墙</div>
                <div className="text-gray-400">基于IP/端口/协议过滤，状态检测</div>
              </div>
              <div className="bg-gray-700 rounded p-3">
                <div className="text-green-400 font-medium mb-1">WAF</div>
                <div className="text-gray-400">专注Web攻击防护，应用层检测</div>
              </div>
              <div className="bg-gray-700 rounded p-3">
                <div className="text-orange-400 font-medium mb-1">IPS/IDS</div>
                <div className="text-gray-400">深度包检测，入侵行为分析</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
