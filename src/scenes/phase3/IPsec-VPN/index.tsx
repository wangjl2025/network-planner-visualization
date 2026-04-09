import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import { 
  Shield, 
  Lock, 
  Key, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Network,
  Cpu
} from 'lucide-react';

// IKE阶段状态
type IKEPhase = 'idle' | 'phase1-start' | 'phase1-msg1' | 'phase1-msg2' | 'phase1-msg3' | 'phase1-msg4' | 'phase1-msg5' | 'phase1-msg6' | 'phase1-done' | 'phase2-start' | 'phase2-msg1' | 'phase2-msg2' | 'phase2-msg3' | 'phase2-done' | 'tunnel-active';

// 报文定义
const IKE_MESSAGES = {
  'phase1-msg1': { from: 'siteA', label: 'SA Proposal', desc: '提议加密算法（AES-256）、哈希（SHA-256）、DH组（Group14）、身份认证方式（预共享密钥）', color: '#3b82f6' },
  'phase1-msg2': { from: 'siteB', label: 'SA Accepted', desc: '接受提议，确认算法套件', color: '#3b82f6' },
  'phase1-msg3': { from: 'siteA', label: 'DH Public Key + Nonce', desc: '发送DH公钥和随机数，用于生成共享密钥', color: '#8b5cf6' },
  'phase1-msg4': { from: 'siteB', label: 'DH Public Key + Nonce', desc: '发送DH公钥和随机数，双方可独立计算相同的会话密钥', color: '#8b5cf6' },
  'phase1-msg5': { from: 'siteA', label: 'Identity + Auth (encrypted)', desc: '加密发送身份信息和认证哈希，使用前4条消息协商的密钥加密', color: '#22c55e' },
  'phase1-msg6': { from: 'siteB', label: 'Identity + Auth (encrypted)', desc: '加密回应，IKE阶段1完成，建立ISAKMP SA', color: '#22c55e' },
  'phase2-msg1': { from: 'siteA', label: 'Quick Mode Proposal', desc: '提议IPsec SA参数（ESP、AES-128、HMAC-SHA1）、流量选择器', color: '#f59e0b' },
  'phase2-msg2': { from: 'siteB', label: 'Quick Mode Accept', desc: '接受IPsec SA参数，提供随机数', color: '#f59e0b' },
  'phase2-msg3': { from: 'siteA', label: 'Quick Mode Confirm', desc: '确认，IPsec SA建立完成（进出向各一条）', color: '#f59e0b' },
};

const ANIMATION_STEPS = [
  { id: 'idle', label: '初始状态', desc: '两端网关尚未建立VPN隧道，内网流量不可互通' },
  { id: 'phase1-start', label: 'IKE Phase 1 开始', desc: '启动IKE协商，建立安全通道。主模式交换6条消息' },
  { id: 'phase1-msg1', label: '消息1：SA提议', desc: IKE_MESSAGES['phase1-msg1'].desc },
  { id: 'phase1-msg2', label: '消息2：SA接受', desc: IKE_MESSAGES['phase1-msg2'].desc },
  { id: 'phase1-msg3', label: '消息3：DH交换', desc: IKE_MESSAGES['phase1-msg3'].desc },
  { id: 'phase1-msg4', label: '消息4：DH响应', desc: IKE_MESSAGES['phase1-msg4'].desc },
  { id: 'phase1-msg5', label: '消息5：身份认证（加密）', desc: IKE_MESSAGES['phase1-msg5'].desc },
  { id: 'phase1-msg6', label: '消息6：身份认证（加密）', desc: IKE_MESSAGES['phase1-msg6'].desc },
  { id: 'phase1-done', label: 'ISAKMP SA 已建立', desc: '阶段1完成！建立了安全的ISAKMP SA，用于保护阶段2的协商过程' },
  { id: 'phase2-start', label: 'IKE Phase 2 开始', desc: '在受保护的通道内协商IPsec SA，快速模式只需3条消息' },
  { id: 'phase2-msg1', label: 'Quick Mode 消息1', desc: IKE_MESSAGES['phase2-msg1'].desc },
  { id: 'phase2-msg2', label: 'Quick Mode 消息2', desc: IKE_MESSAGES['phase2-msg2'].desc },
  { id: 'phase2-msg3', label: 'Quick Mode 消息3', desc: IKE_MESSAGES['phase2-msg3'].desc },
  { id: 'phase2-done', label: 'IPsec SA 已建立', desc: '阶段2完成！建立了双向IPsec SA，数据可以加密传输' },
  { id: 'tunnel-active', label: '隧道激活', desc: '数据通过ESP加密隧道安全传输，原始IP包被完全封装' },
];

// 数据包封装示意
const PacketDiagram = ({ mode }: { mode: 'tunnel' | 'transport' }) => {
  if (mode === 'tunnel') {
    return (
      <div className="flex items-center gap-1 text-xs font-mono">
        <div className="px-2 py-1 bg-blue-700 text-white rounded text-center whitespace-nowrap">新IP头</div>
        <div className="px-2 py-1 bg-purple-700 text-white rounded text-center whitespace-nowrap">ESP头</div>
        <div className="px-2 py-1 bg-slate-600 text-white rounded text-center whitespace-nowrap border border-purple-500">[原IP头]</div>
        <div className="px-2 py-1 bg-slate-600 text-white rounded text-center whitespace-nowrap border border-purple-500">[原数据]</div>
        <div className="px-2 py-1 bg-purple-700 text-white rounded text-center whitespace-nowrap">ESP尾+认证</div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs font-mono">
      <div className="px-2 py-1 bg-slate-600 text-white rounded text-center whitespace-nowrap">原IP头</div>
      <div className="px-2 py-1 bg-purple-700 text-white rounded text-center whitespace-nowrap">ESP头</div>
      <div className="px-2 py-1 bg-slate-600 text-white rounded text-center whitespace-nowrap border border-purple-500">[原数据]</div>
      <div className="px-2 py-1 bg-purple-700 text-white rounded text-center whitespace-nowrap">ESP尾+认证</div>
    </div>
  );
};

export function IPsecVPNScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePhase, setActivePhase] = useState<IKEPhase>('idle');
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [animatingMsg, setAnimatingMsg] = useState<{ key: string; from: string } | null>(null);
  const [tunnelMode, setTunnelMode] = useState<'tunnel' | 'transport'>('tunnel');
  const [dataFlowing, setDataFlowing] = useState(false);

  const parameters = [
    {
      id: 'encAlgo',
      label: '加密算法',
      type: 'select' as const,
      value: 'aes256',
      options: [
        { value: 'aes256', label: 'AES-256' },
        { value: 'aes128', label: 'AES-128' },
        { value: '3des', label: '3DES' },
      ],
    },
    {
      id: 'hashAlgo',
      label: '哈希算法',
      type: 'select' as const,
      value: 'sha256',
      options: [
        { value: 'sha256', label: 'SHA-256' },
        { value: 'sha1', label: 'SHA-1' },
        { value: 'md5', label: 'MD5' },
      ],
    },
    {
      id: 'dhGroup',
      label: 'DH组',
      type: 'select' as const,
      value: 'group14',
      options: [
        { value: 'group14', label: 'Group 14 (2048-bit)' },
        { value: 'group5', label: 'Group 5 (1536-bit)' },
        { value: 'group2', label: 'Group 2 (1024-bit)' },
      ],
    },
  ];

  const currentPhase = ANIMATION_STEPS[currentStep]?.id as IKEPhase;

  useEffect(() => {
    setActivePhase(currentPhase || 'idle');
    
    if (currentPhase && IKE_MESSAGES[currentPhase as keyof typeof IKE_MESSAGES]) {
      const msg = IKE_MESSAGES[currentPhase as keyof typeof IKE_MESSAGES];
      setAnimatingMsg({ key: currentPhase, from: msg.from });
      setSentMessages(prev => [...prev, currentPhase]);
      const timer = setTimeout(() => setAnimatingMsg(null), 1200);
      return () => clearTimeout(timer);
    }
    
    if (currentPhase === 'tunnel-active') {
      setDataFlowing(true);
    } else {
      setDataFlowing(false);
    }
    
    if (currentPhase === 'idle') {
      setSentMessages([]);
    }
  }, [currentStep, currentPhase]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < ANIMATION_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1800);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setActivePhase('idle');
    setSentMessages([]);
    setAnimatingMsg(null);
    setDataFlowing(false);
  }, []);

  const getPhaseStatus = (phase: string) => {
    const step = currentStep;
    if (phase === '1') {
      if (step >= 8) return 'done';
      if (step >= 1) return 'active';
      return 'pending';
    }
    if (phase === '2') {
      if (step >= 13) return 'done';
      if (step >= 9) return 'active';
      return 'pending';
    }
    return 'pending';
  };

  // Scene 数据
  const sceneData = {
    id: 'ipsec-vpn',
    title: 'IPsec VPN：隧道建立与加密',
    description: 'IKE两阶段协商、ESP封装、隧道模式与传输模式对比',
    phase: 3 as const,
    category: '网络安全',
    duration: '8-10分钟',
    difficulty: 'hard' as const,
    isHot: true,
  };

  return (
    <SceneLayout
      scene={sceneData}
      showSidebar={false}
    >
      <div className="grid grid-cols-12 gap-4 h-full overflow-auto">
        {/* 参数面板 */}
        <div className="col-span-3">
          <ParameterPanel
            title="VPN配置参数"
            parameters={parameters}
            onChange={() => {}}
            onReset={() => {}}
          />

          {/* 模式切换 */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">封装模式</h3>
            <div className="space-y-2">
              {(['tunnel', 'transport'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setTunnelMode(mode)}
                  className={`w-full py-2 px-3 rounded text-sm transition-all text-left ${
                    tunnelMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {mode === 'tunnel' ? '🔒 隧道模式（推荐）' : '🔓 传输模式'}
                </button>
              ))}
            </div>
            <div className="mt-3 p-3 bg-slate-900/50 rounded text-xs text-slate-400">
              {tunnelMode === 'tunnel'
                ? '隧道模式：加密整个原始IP包，添加新IP头。用于站点到站点VPN。'
                : '传输模式：只加密传输层数据，保留原始IP头。用于端到端VPN。'}
            </div>
          </div>

          {/* 报文封装示意 */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              ESP报文封装（{tunnelMode === 'tunnel' ? '隧道模式' : '传输模式'}）
            </h3>
            <PacketDiagram mode={tunnelMode} />
            <div className="mt-2 space-y-1 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-700" />
                <span>加密保护范围</span>
              </div>
              {tunnelMode === 'tunnel' && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-700" />
                  <span>新添加的外层IP头</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 主可视化区域 */}
        <div className="col-span-6">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-6 relative overflow-hidden" style={{ minHeight: 460 }}>
            {/* 阶段状态指示 */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {[1, 2].map(ph => {
                const status = getPhaseStatus(String(ph));
                return (
                  <div key={ph} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    status === 'done' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                    status === 'active' ? 'bg-blue-900/50 text-blue-400 border border-blue-500 animate-pulse' :
                    'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}>
                    {status === 'done' ? <CheckCircle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    IKE Phase {ph}
                    {status === 'done' && <span className="text-xs">✓</span>}
                  </div>
                );
              })}
              {currentStep >= 14 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-900/50 text-green-400 border border-green-500">
                  <Lock className="w-4 h-4" />
                  隧道已建立
                </div>
              )}
            </div>

            {/* 网络拓扑图 */}
            <div className="relative flex items-center justify-between px-6" style={{ height: 220 }}>
              {/* Site A */}
              <div className="flex flex-col items-center gap-3 w-32">
                <motion.div
                  className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-blue-500 flex flex-col items-center justify-center shadow-lg shadow-blue-900/50"
                  animate={currentStep > 0 ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <Shield className="w-7 h-7 text-blue-200" />
                  <span className="text-xs font-bold text-white mt-1">网关 A</span>
                </motion.div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-300">Site A</div>
                  <div className="text-xs text-slate-500">10.1.0.0/24</div>
                  <div className="text-xs text-blue-400">公网IP: 1.2.3.4</div>
                </div>
                {/* 内网设备 */}
                <div className="flex flex-col items-center gap-1">
                  {[1, 2].map(n => (
                    <div key={n} className="flex items-center gap-1 text-xs text-slate-500">
                      <Cpu className="w-3 h-3" />
                      <span>PC-A{n} 10.1.0.{n}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 中间网络 + 消息动画 */}
              <div className="flex-1 mx-4 relative">
                {/* 互联网背景 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-16 bg-gradient-to-r from-blue-900/20 via-slate-700/40 to-blue-900/20 rounded-lg border border-slate-600 flex items-center justify-center">
                    <Network className="w-5 h-5 text-slate-500 mr-2" />
                    <span className="text-sm text-slate-500">互联网</span>
                  </div>
                </div>

                {/* 飞行中的消息 */}
                <AnimatePresence>
                  {animatingMsg && (
                    <motion.div
                      key={animatingMsg.key}
                      className="absolute z-10 flex items-center gap-1"
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                      initial={{
                        left: animatingMsg.from === 'siteA' ? '5%' : '90%',
                        opacity: 0
                      }}
                      animate={{
                        left: animatingMsg.from === 'siteA' ? '85%' : '10%',
                        opacity: [0, 1, 1, 0]
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.1, ease: 'easeInOut' }}
                    >
                      <div className={`px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg whitespace-nowrap`}
                        style={{ backgroundColor: IKE_MESSAGES[animatingMsg.key as keyof typeof IKE_MESSAGES]?.color || '#6b7280' }}
                      >
                        {IKE_MESSAGES[animatingMsg.key as keyof typeof IKE_MESSAGES]?.label}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 数据流动画 */}
                {dataFlowing && (
                  <>
                    {[0, 1, 2, 3, 4].map(i => (
                      <motion.div
                        key={i}
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-400"
                        initial={{ left: '5%', opacity: 0 }}
                        animate={{ left: '90%', opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, ease: 'linear' }}
                      />
                    ))}
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={`back-${i}`}
                        className="absolute top-[55%] -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400"
                        initial={{ left: '90%', opacity: 0 }}
                        animate={{ left: '5%', opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.5, delay: i * 0.5 + 0.2, repeat: Infinity, ease: 'linear' }}
                      />
                    ))}
                  </>
                )}

                {/* 已完成的消息记录线 */}
                {sentMessages.length > 0 && currentStep < 14 && (
                  <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-1 justify-center p-1">
                    {sentMessages.map(msgKey => {
                      const msg = IKE_MESSAGES[msgKey as keyof typeof IKE_MESSAGES];
                      if (!msg) return null;
                      return (
                        <div
                          key={msgKey}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: msg.color }}
                          title={msg.label}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Site B */}
              <div className="flex flex-col items-center gap-3 w-32">
                <motion.div
                  className="w-20 h-20 rounded-xl bg-gradient-to-br from-green-700 to-green-900 border-2 border-green-500 flex flex-col items-center justify-center shadow-lg shadow-green-900/50"
                >
                  <Shield className="w-7 h-7 text-green-200" />
                  <span className="text-xs font-bold text-white mt-1">网关 B</span>
                </motion.div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-300">Site B</div>
                  <div className="text-xs text-slate-500">10.2.0.0/24</div>
                  <div className="text-xs text-green-400">公网IP: 5.6.7.8</div>
                </div>
                {/* 内网设备 */}
                <div className="flex flex-col items-center gap-1">
                  {[1, 2].map(n => (
                    <div key={n} className="flex items-center gap-1 text-xs text-slate-500">
                      <Cpu className="w-3 h-3" />
                      <span>Server-B{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 隧道建立完成状态 */}
            <AnimatePresence>
              {currentStep >= 14 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-green-900/30 border border-green-600 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-semibold">IPsec SA 建立成功</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-slate-400 mb-1">出向 SA（A→B）</div>
                      <div className="text-green-300">SPI: 0xAB12CD34</div>
                      <div className="text-slate-300">ESP + AES-256 + SHA-256</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-slate-400 mb-1">入向 SA（B→A）</div>
                      <div className="text-green-300">SPI: 0xEF56AB78</div>
                      <div className="text-slate-300">ESP + AES-256 + SHA-256</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 动画播放器 */}
          <div className="mt-4">
            <AnimationPlayer
              steps={ANIMATION_STEPS}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onReset={handleReset}
              onStepChange={setCurrentStep}
            />
          </div>
        </div>

        {/* 信息面板 */}
        <div className="col-span-3 space-y-4">
          <InfoPanel
            title="当前步骤说明"
            content={
              <div className="text-sm text-slate-300 leading-relaxed">
                <div className="font-semibold text-blue-400 mb-2">{ANIMATION_STEPS[currentStep]?.label}</div>
                <p className="text-slate-400 text-xs">{ANIMATION_STEPS[currentStep]?.desc}</p>
              </div>
            }
          />

          <InfoPanel
            title="IKE协议说明"
            content={
              <div className="space-y-3 text-xs">
                <div className="p-2 bg-blue-900/30 rounded border border-blue-700">
                  <div className="font-semibold text-blue-400 mb-1">IKE Phase 1（主模式）</div>
                  <div className="text-slate-400">6条消息，建立ISAKMP SA，加密保护Phase 2协商过程。验证对端身份，协商加密/哈希算法，进行DH密钥交换。</div>
                </div>
                <div className="p-2 bg-yellow-900/30 rounded border border-yellow-700">
                  <div className="font-semibold text-yellow-400 mb-1">IKE Phase 2（快速模式）</div>
                  <div className="text-slate-400">3条消息，建立IPsec SA。协商ESP/AH参数，每对流量方向各建立一条SA（双向共2条）。</div>
                </div>
                <div className="p-2 bg-green-900/30 rounded border border-green-700">
                  <div className="font-semibold text-green-400 mb-1">IPsec SA</div>
                  <div className="text-slate-400">单向的，用SPI（安全参数索引）区分。实际数据加密使用ESP协议，提供机密性+完整性保护。</div>
                </div>
              </div>
            }
          />

          <InfoPanel
            title="隧道 vs 传输模式"
            content={
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-slate-800 rounded">
                  <div className="font-semibold text-slate-300 mb-1">🔒 隧道模式</div>
                  <ul className="text-slate-400 space-y-1">
                    <li>• 加密整个原始IP包</li>
                    <li>• 添加新外层IP头</li>
                    <li>• 适用：网关对网关（站点到站点）</li>
                    <li>• 隐藏内网地址</li>
                  </ul>
                </div>
                <div className="p-2 bg-slate-800 rounded">
                  <div className="font-semibold text-slate-300 mb-1">🔓 传输模式</div>
                  <ul className="text-slate-400 space-y-1">
                    <li>• 只加密传输层及以上</li>
                    <li>• 保留原始IP头</li>
                    <li>• 适用：端到端（主机对主机）</li>
                    <li>• 开销更小</li>
                  </ul>
                </div>
              </div>
            }
          />

          <InfoPanel
            title="密钥算法对比"
            content={
              <div className="space-y-1 text-xs">
                {[
                  { name: 'AES-256', strength: '极强', color: 'text-green-400' },
                  { name: 'AES-128', strength: '强', color: 'text-blue-400' },
                  { name: '3DES', strength: '中', color: 'text-yellow-400' },
                  { name: 'DES', strength: '弱（已废弃）', color: 'text-red-400' },
                ].map(algo => (
                  <div key={algo.name} className="flex justify-between items-center p-1.5 bg-slate-800 rounded">
                    <span className="text-slate-300">{algo.name}</span>
                    <span className={algo.color}>{algo.strength}</span>
                  </div>
                ))}
              </div>
            }
          />
        </div>
      </div>
    </SceneLayout>
  );
}
