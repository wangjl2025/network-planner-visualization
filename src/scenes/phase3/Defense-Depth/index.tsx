import { useState, useEffect, useCallback, useRef } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, Shield, AlertTriangle, CheckCircle, Server, Globe, Lock, Target, Zap, Eye, ShieldCheck, Ban } from 'lucide-react';

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
  const [attackType, setAttackType] = useState<'normal' | 'sql-injection' | 'ddos' | 'xss' | 'malware'>('normal');
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'running' | 'blocked' | 'passed'>('idle');
  const [currentLayer, setCurrentLayer] = useState(0);
  const [blockReason, setBlockReason] = useState<string>('');
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 防御层定义 - 重新组织使每层职责更清晰
  const defenseLayers = [
    {
      id: 'cdn-waf',
      name: 'CDN/WAF',
      shortName: 'CDN/WAF',
      icon: Globe,
      color: '#3b82f6',
      layerName: '第一层：CDN/WAF防护',
      description: '内容分发网络 + Web应用防火墙，边缘节点进行初步清洗和Web攻击检测',
      attacks: ['DDoS攻击', 'SQL注入', 'XSS攻击', 'CC攻击', '恶意爬虫'],
      defenses: ['流量清洗', '边缘节点拦截', '特征规则库', '机器学习检测'],
      position: '网络边缘（Internet侧）',
    },
    {
      id: 'firewall',
      name: '下一代防火墙',
      shortName: 'NGFW',
      icon: Shield,
      color: '#06b6d4',
      layerName: '第二层：边界防火墙',
      description: '下一代防火墙，进行深度包检测、状态检测、应用层过滤',
      attacks: ['未授权访问', 'IP欺骗', '端口扫描', '协议异常', '暴力破解'],
      defenses: ['状态检测', '应用识别', '用户认证', '威胁情报联动'],
      position: '网络边界',
    },
    {
      id: 'ips',
      name: '入侵防御系统',
      shortName: 'IPS',
      icon: AlertTriangle,
      color: '#f59e0b',
      layerName: '第三层：入侵防御',
      description: '深度检测网络流量，识别已知攻击特征和异常行为',
      attacks: ['漏洞利用', '0day攻击', '横向移动', '数据外泄', '隐蔽通道'],
      defenses: ['特征匹配', '行为分析', '异常检测', '自动响应'],
      position: '内网入口',
    },
    {
      id: 'endpoint',
      name: '终端安全',
      shortName: 'EDR',
      icon: Server,
      color: '#8b5cf6',
      layerName: '第四层：终端防护',
      description: '主机安全代理，检测终端上的恶意行为和文件',
      attacks: ['恶意软件', '勒索病毒', '无文件攻击', '权限提升', '持久化控制'],
      defenses: ['行为监控', '文件检测', '进程保护', '漏洞修复'],
      position: '服务器/终端',
    },
    {
      id: 'data',
      name: '数据安全层',
      shortName: '数据层',
      icon: Lock,
      color: '#ec4899',
      layerName: '第五层：数据保护',
      description: '最后一道防线，保护核心数据资产的机密性和完整性',
      attacks: ['数据窃取', '数据篡改', '数据删除', '拖库攻击'],
      defenses: ['加密存储', '访问审计', '脱敏处理', '数据分类'],
      position: '数据库/存储',
    },
  ];

  // 攻击类型定义 - 每种攻击的拦截点和拦截理由
  const attackConfigs = {
    'normal': {
      name: '正常访问',
      desc: '合法用户请求，正常通过各层',
      color: '#10b981',
      blockedAt: -1, // -1 表示不拦截，全部通过
      flow: ['cdn-waf', 'firewall', 'ips', 'endpoint', 'data'],
      blockedReason: '',
    },
    'sql-injection': {
      name: 'SQL注入攻击',
      desc: '恶意SQL代码注入数据库',
      color: '#ef4444',
      blockedAt: 0, // CDN/WAF层
      flow: ['cdn-waf', 'firewall', 'ips', 'endpoint', 'data'],
      blockedReason: 'WAF检测到SQL注入特征（\' OR \'1\'=\'1），已拦截',
    },
    'xss': {
      name: 'XSS跨站脚本攻击',
      desc: '注入恶意脚本代码',
      color: '#f97316',
      blockedAt: 0, // CDN/WAF层
      flow: ['cdn-waf', 'firewall', 'ips', 'endpoint', 'data'],
      blockedReason: 'WAF检测到XSS攻击特征（<script>标签），已拦截',
    },
    'ddos': {
      name: 'DDoS攻击',
      desc: '分布式拒绝服务攻击',
      color: '#dc2626',
      blockedAt: 0, // CDN层
      flow: ['cdn-waf', 'firewall', 'ips', 'endpoint', 'data'],
      blockedReason: 'CDN节点识别异常流量特征，触发流量清洗，已拦截',
    },
    'malware': {
      name: '恶意软件',
      desc: '病毒/木马/勒索软件',
      color: '#7c3aed',
      blockedAt: 3, // 终端安全层
      flow: ['cdn-waf', 'firewall', 'ips', 'endpoint', 'data'],
      blockedReason: 'EDR检测到恶意文件行为，已隔离并清除',
    },
  };

  // 步骤定义
  const steps = [
    { id: 'intro', title: '纵深防御简介', description: '纵深防御（Defense in Depth）：用多层安全措施保护信息资产，每层都有独特的防护职责' },
    { id: 'attack', title: '选择攻击类型', description: '点击下方按钮选择不同的攻击类型，观察各层安全设备的拦截作用' },
    { id: 'layer-info', title: '查看防护详情', description: '点击架构图中的各层设备，查看该层的具体防护职责' },
  ];

  // 运行动画
  const runAnimation = useCallback(() => {
    if (animationPhase !== 'idle') return;

    const config = attackConfigs[attackType];
    setAnimationPhase('running');
    setCurrentLayer(0);

    let layerIndex = 0;
    const maxLayer = config.blockedAt === -1 ? defenseLayers.length : config.blockedAt + 1;

    const animate = () => {
      if (layerIndex >= maxLayer) {
        if (config.blockedAt === -1) {
          setAnimationPhase('passed');
        } else {
          setAnimationPhase('blocked');
          setBlockReason(config.blockedReason);
        }
        return;
      }

      setCurrentLayer(layerIndex);
      layerIndex++;

      animationRef.current = setTimeout(animate, 1200);
    };

    animate();
  }, [attackType, animationPhase, defenseLayers.length]);

  // 攻击类型改变时重置动画
  useEffect(() => {
    setAnimationPhase('idle');
    setCurrentLayer(0);
    setBlockReason('');
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
  }, [attackType]);

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
    }, 5000);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // 重置
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    setSelectedLayer(null);
    setAttackType('normal');
    setAnimationPhase('idle');
    setCurrentLayer(0);
    setBlockReason('');
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
  }, []);

  // 渲染防御架构图
  const renderDefenseArchitecture = () => {
    const config = attackConfigs[attackType];

    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 mb-6 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        {/* 标题 */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <h4 className="text-white font-semibold text-lg flex items-center gap-2">
            <Shield className="text-blue-400" />
            分层安全防护架构
          </h4>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              config.blockedAt === -1
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {config.blockedAt === -1 ? '✓ 正常流量' : '⚠ 攻击演示'}
            </span>
          </div>
        </div>

        {/* 流量动画指示器 */}
        <div className="mb-4 relative">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-4 h-4 rounded-full ${animationPhase === 'running' ? 'animate-ping bg-red-500' : ''}`}></div>
            <span className="text-gray-400 text-sm">
              {animationPhase === 'idle' && '点击"运行演示"开始动画'}
              {animationPhase === 'running' && `正在第 ${currentLayer + 1} 层检测...`}
              {animationPhase === 'blocked' && '攻击已被拦截！'}
              {animationPhase === 'passed' && '流量正常通过所有层'}
            </span>
          </div>

          {/* 进度条 */}
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                animationPhase === 'passed' ? 'bg-green-500' :
                animationPhase === 'blocked' ? 'bg-red-500' :
                'bg-blue-500'
              }`}
              style={{
                width: animationPhase === 'idle' ? '0%' :
                  `${((animationPhase === 'passed' ? defenseLayers.length : currentLayer + 1) / defenseLayers.length) * 100}%`
              }}
            ></div>
          </div>
        </div>

        {/* 攻击类型指示 */}
        <div className="mb-6 bg-gray-900/50 rounded-lg p-3 flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.color }}
          ></div>
          <div>
            <div className="text-white text-sm font-medium">{config.name}</div>
            <div className="text-gray-400 text-xs">{config.desc}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-gray-400 text-xs">攻击类型</div>
            <div className="text-white text-xs">{config.blockedAt === -1 ? '无拦截' : `在第${config.blockedAt + 1}层拦截`}</div>
          </div>
        </div>

        {/* 防御层 - 垂直布局 */}
        <div className="relative">
          {defenseLayers.map((layer, index) => {
            const Icon = layer.icon;
            const isSelected = selectedLayer === index;
            const isProcessed = animationPhase !== 'idle' && index <= currentLayer;
            const isBlocked = animationPhase === 'blocked' && index === config.blockedAt;
            const isPassed = animationPhase !== 'idle' && (animationPhase === 'passed' || index < config.blockedAt);

            return (
              <div
                key={layer.id}
                onClick={() => setSelectedLayer(index)}
                className={`relative p-4 rounded-lg mb-2 cursor-pointer transition-all duration-300 ${
                  isSelected ? 'ring-2 ring-white shadow-lg' : 'hover:ring-1 hover:ring-gray-500'
                }`}
                style={{
                  backgroundColor: isBlocked ? 'rgba(239, 68, 68, 0.2)' :
                    isPassed ? 'rgba(16, 185, 129, 0.1)' :
                    isProcessed ? 'rgba(59, 130, 246, 0.1)' :
                    'rgba(55, 65, 81, 0.5)',
                  border: `1px solid ${isBlocked ? '#ef4444' :
                    isPassed ? '#10b981' :
                    isProcessed ? '#3b82f6' :
                    layer.color + '40'}`,
                  marginLeft: `${index * 20}px`,
                  width: `calc(100% - ${index * 20}px)`,
                }}
              >
                {/* 流量指示器 */}
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex items-center">
                  {isProcessed && !isBlocked && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isPassed ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                    }`}>
                      {isPassed ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <Eye className="w-4 h-4 text-white" />
                      )}
                    </div>
                  )}
                  {isBlocked && (
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                      <Ban className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: layer.color + '30' }}
                    >
                      <Icon
                        className="w-6 h-6"
                        style={{ color: isBlocked ? '#ef4444' : layer.color }}
                      />
                    </div>
                    <div>
                      <div className="text-white font-medium">{layer.name}</div>
                      <div className="text-gray-400 text-xs">{layer.position}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isBlocked ? (
                      <div className="flex items-center gap-1 text-red-400">
                        <Ban className="w-4 h-4" />
                        <span className="text-xs">已拦截</span>
                      </div>
                    ) : isPassed ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs">通过</span>
                      </div>
                    ) : isProcessed ? (
                      <div className="flex items-center gap-1 text-blue-400">
                        <Zap className="w-4 h-4 animate-pulse" />
                        <span className="text-xs">检测中</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-xs">等待中</div>
                    )}
                  </div>
                </div>

                {/* 拦截信息 */}
                {isBlocked && (
                  <div className="mt-3 p-2 bg-red-500/20 rounded border border-red-500/30">
                    <div className="text-red-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {blockReason}
                    </div>
                  </div>
                )}

                {/* 成功信息 */}
                {isPassed && (
                  <div className="mt-2 text-xs text-gray-400">
                    防护机制：{layer.defenses.slice(0, 2).join('、')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 图例 */}
        <div className="mt-6 pt-4 border-t border-gray-700 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
            <span className="text-gray-400">等待检测</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-400">检测中</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-400">检测通过</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-400">攻击拦截</span>
          </div>
        </div>
      </div>
    );
  };

  // 渲染攻击演示选择器
  const renderAttackDemo = () => {
    return (
      <div className="bg-gray-800 rounded-xl p-5 mb-6">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Target className="text-red-400" />
          攻击类型演示
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {Object.entries(attackConfigs).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setAttackType(key as any)}
              className={`p-3 rounded-lg text-left transition-all ${
                attackType === key
                  ? 'ring-2 ring-white shadow-lg'
                  : 'hover:bg-gray-700'
              }`}
              style={{
                backgroundColor: attackType === key ? config.color + '30' : '#374151',
                border: `1px solid ${attackType === key ? config.color : 'transparent'}`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full mb-2"
                style={{ backgroundColor: config.color }}
              ></div>
              <div className="text-white text-sm font-medium">{config.name}</div>
              <div className="text-gray-400 text-xs mt-1">{config.desc}</div>
            </button>
          ))}
        </div>

        {/* 运行演示按钮 */}
        <button
          onClick={runAnimation}
          disabled={animationPhase === 'running'}
          className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            animationPhase === 'running'
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
          }`}
        >
          {animationPhase === 'running' ? (
            <>
              <Zap className="w-5 h-5 animate-pulse" />
              动画运行中...
            </>
          ) : animationPhase === 'idle' ? (
            <>
              <Play className="w-5 h-5" />
              运行演示
            </>
          ) : (
            <>
              <RotateCcw className="w-5 h-5" />
              重新演示
            </>
          )}
        </button>

        {/* 当前攻击说明 */}
        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
          <div className="text-gray-400 text-xs mb-2">攻击特性说明</div>
          {attackType === 'normal' && (
            <p className="text-gray-300 text-sm">
              正常用户访问会经过所有安全层验证，每层都会记录审计日志，确保请求来源可信后才会放行到下一层或到达目标服务器。
            </p>
          )}
          {attackType === 'sql-injection' && (
            <p className="text-gray-300 text-sm">
              SQL注入利用应用程序对用户输入的不当处理，尝试在SQL查询中注入恶意代码。WAF通过规则匹配（如检测 <code className="bg-gray-700 px-1 rounded">OR</code>、<code className="bg-gray-700 px-1 rounded">'</code> 等关键字）来识别并阻断这类攻击。
            </p>
          )}
          {attackType === 'xss' && (
            <p className="text-gray-300 text-sm">
              跨站脚本攻击（XSS）通过在网页中注入恶意JavaScript代码来窃取用户会话或执行未授权操作。WAF会检测HTML标签和脚本特征（如 <code className="bg-gray-700 px-1 rounded">&lt;script&gt;</code>）并实施过滤。
            </p>
          )}
          {attackType === 'ddos' && (
            <p className="text-gray-300 text-sm">
              分布式拒绝服务攻击通过大量请求耗尽目标资源。CDN/WAF在边缘节点识别异常流量模式（如突发的SYN flood、HTTP flood），触发流量清洗机制，在攻击到达数据中心前将其化解。
            </p>
          )}
          {attackType === 'malware' && (
            <p className="text-gray-300 text-sm">
              恶意软件（如病毒、木马、勒索软件）可能在文件传输或下载时入侵系统。EDR终端安全通过行为分析检测异常进程行为、沙箱检测、病毒特征库匹配等多重机制来发现并隔离威胁。
            </p>
          )}
        </div>
      </div>
    );
  };

  // 渲染选中的层详情
  const renderLayerDetail = () => {
    if (selectedLayer === null) {
      return (
        <div className="bg-gray-800 rounded-xl p-5 mb-6 text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">点击上方架构图中的任意一层，了解该安全设备的具体防护职责</p>
        </div>
      );
    }

    const layer = defenseLayers[selectedLayer];
    const Icon = layer.icon;

    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 mb-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: layer.color + '30' }}
          >
            <Icon className="w-8 h-8" style={{ color: layer.color }} />
          </div>
          <div>
            <h4 className="text-white font-semibold text-lg">{layer.name}</h4>
            <p className="text-gray-400 text-sm">{layer.position}</p>
          </div>
        </div>

        <p className="text-gray-300 text-sm mb-4">{layer.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-medium">防护的攻击类型</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {layer.attacks.map((attack, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs"
                >
                  {attack}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">核心防护机制</span>
            </div>
            <ul className="space-y-1">
              {layer.defenses.map((defense, i) => (
                <li key={i} className="text-gray-300 text-sm flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  {defense}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SceneLayout scene={sceneData} fluid={false} showSidebar={false}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：控制面板 */}
        <div className="lg:col-span-4 space-y-4">
          {/* 学习目标 */}
          <div className="bg-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="text-blue-400" size={20} />
              <h3 className="text-white font-semibold">学习目标</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {sceneData.description}
            </p>
          </div>

          {/* 步骤进度 */}
          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">学习步骤</h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    index === currentStep
                      ? 'bg-blue-600 text-white'
                      : index < currentStep
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
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
                    <p className="text-sm mt-3 opacity-90 leading-relaxed">{step.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 播放控制 */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isPlaying ? '暂停' : '播放'}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                重置
              </button>
            </div>
          </div>

          {/* 纵深防御原则 */}
          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Shield className="text-green-400" />
              纵深防御核心原则
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong className="text-white">分层防护：</strong>网络边界、应用边界、终端、数据等多层设防</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong className="text-white">职责分离：</strong>每层安全设备有独特的防护重点，协同作战</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong className="text-white">纵深检测：</strong>检测、防护、响应相结合，形成完整闭环</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong className="text-white">冗余安全：</strong>单点失效不会导致整体沦陷，层层递进</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 右侧：可视化区域 */}
        <div className="lg:col-span-8 space-y-4">
          {renderAttackDemo()}
          {renderDefenseArchitecture()}
          {renderLayerDetail()}

          {/* 知识总结 */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-5 border border-blue-500/30">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="text-green-400" />
              知识点总结
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-blue-400 font-medium mb-1">CDN/WAF层</div>
                <div className="text-gray-400">边缘防护，拦截Web攻击（DDoS、SQL注入、XSS）</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-cyan-400 font-medium mb-1">防火墙层</div>
                <div className="text-gray-400">基于IP/端口/协议过滤，状态检测，应用识别</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-yellow-400 font-medium mb-1">IPS层</div>
                <div className="text-gray-400">深度包检测，入侵特征库，异常行为分析</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-purple-400 font-medium mb-1">终端安全层</div>
                <div className="text-gray-400">文件检测，行为监控，恶意软件防护</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
