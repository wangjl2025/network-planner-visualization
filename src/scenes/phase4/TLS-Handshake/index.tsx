import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Lock, 
  Shield, 
  Key, 
  CheckCircle, 
  Globe,
  Server,
  ArrowRight,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// TLS版本
type TLSVersion = '1.2' | '1.3';

// 握手消息定义
interface HandshakeMessage {
  id: string;
  from: 'client' | 'server';
  label: string;
  color: string;
  detail: string;
  fields?: { name: string; value: string; }[];
}

// TLS 1.2消息
const TLS12_MESSAGES: HandshakeMessage[] = [
  {
    id: 'client-hello',
    from: 'client',
    label: 'Client Hello',
    color: '#3b82f6',
    detail: '客户端发送支持的TLS版本、加密套件列表和随机数',
    fields: [
      { name: 'Version', value: 'TLS 1.2' },
      { name: 'Random', value: '32字节随机数（含4字节时间戳+28字节随机）' },
      { name: 'Cipher Suites', value: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384, ...' },
      { name: 'Extensions', value: 'SNI, ALPN, session_ticket' },
    ],
  },
  {
    id: 'server-hello',
    from: 'server',
    label: 'Server Hello',
    color: '#22c55e',
    detail: '服务器选择加密套件和协议版本，发送服务器随机数',
    fields: [
      { name: 'Version', value: 'TLS 1.2' },
      { name: 'Random', value: '服务器32字节随机数' },
      { name: 'Cipher Suite', value: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384' },
      { name: 'Compression', value: 'null' },
    ],
  },
  {
    id: 'certificate',
    from: 'server',
    label: 'Certificate',
    color: '#f59e0b',
    detail: '服务器发送证书链（Root CA → 中间CA → 叶子证书）',
    fields: [
      { name: '证书类型', value: 'X.509 v3' },
      { name: '公钥算法', value: 'RSA-2048' },
      { name: '签名算法', value: 'SHA-256withRSA' },
      { name: '有效期', value: '2024-01-01 ~ 2025-01-01' },
    ],
  },
  {
    id: 'server-key-exchange',
    from: 'server',
    label: 'Server Key Exchange',
    color: '#8b5cf6',
    detail: '发送ECDHE密钥交换参数（椭圆曲线公钥）',
    fields: [
      { name: '曲线', value: 'secp256r1 (P-256)' },
      { name: '服务器公钥', value: '04 5a 3b... (65字节)' },
      { name: '签名', value: 'RSA签名验证参数真实性' },
    ],
  },
  {
    id: 'server-hello-done',
    from: 'server',
    label: 'Server Hello Done',
    color: '#22c55e',
    detail: '服务器握手消息发送完毕，等待客户端响应',
    fields: [{ name: '内容', value: '空消息，信号结束' }],
  },
  {
    id: 'client-key-exchange',
    from: 'client',
    label: 'Client Key Exchange',
    color: '#3b82f6',
    detail: '客户端发送ECDHE公钥，双方各自计算PreMasterSecret',
    fields: [
      { name: '客户端公钥', value: '04 7f 2a... (65字节)' },
      { name: '生成', value: '基于ECDHE + 双方随机数生成MasterSecret' },
    ],
  },
  {
    id: 'change-cipher-client',
    from: 'client',
    label: 'Change Cipher Spec',
    color: '#06b6d4',
    detail: '通知服务器：此后消息将使用协商的密钥加密',
    fields: [{ name: '内容', value: '0x01（切换到加密通信）' }],
  },
  {
    id: 'finished-client',
    from: 'client',
    label: 'Finished (加密)',
    color: '#06b6d4',
    detail: '发送握手摘要（PRF计算），验证握手完整性',
    fields: [
      { name: 'verify_data', value: 'PRF(MasterSecret, label, hash)' },
      { name: '加密', value: '已使用协商密钥加密' },
    ],
  },
  {
    id: 'change-cipher-server',
    from: 'server',
    label: 'Change Cipher Spec',
    color: '#22c55e',
    detail: '服务器也切换到加密通信模式',
    fields: [{ name: '内容', value: '0x01（切换到加密通信）' }],
  },
  {
    id: 'finished-server',
    from: 'server',
    label: 'Finished (加密)',
    color: '#22c55e',
    detail: '服务器发送握手摘要，握手完成！加密通道建立',
    fields: [
      { name: 'verify_data', value: 'PRF(MasterSecret, label, hash)' },
      { name: '加密', value: '已使用协商密钥加密' },
    ],
  },
];

// TLS 1.3消息（更简洁，1-RTT）
const TLS13_MESSAGES: HandshakeMessage[] = [
  {
    id: 'client-hello',
    from: 'client',
    label: 'Client Hello',
    color: '#3b82f6',
    detail: 'TLS 1.3 Client Hello包含key_share扩展，直接发送ECDHE公钥，减少往返',
    fields: [
      { name: 'Version', value: 'TLS 1.3 (0x0304)' },
      { name: 'key_share', value: 'ECDHE公钥（secp256r1）直接包含' },
      { name: 'Cipher Suites', value: 'TLS_AES_256_GCM_SHA384' },
      { name: '不再支持', value: 'RSA密钥交换、RC4、3DES等弱算法' },
    ],
  },
  {
    id: 'server-hello',
    from: 'server',
    label: 'Server Hello + Key',
    color: '#22c55e',
    detail: 'TLS 1.3中Server Hello包含服务器key_share，双方可立即计算密钥',
    fields: [
      { name: 'key_share', value: '服务器ECDHE公钥' },
      { name: '选定套件', value: 'TLS_AES_256_GCM_SHA384' },
      { name: '特点', value: '此后消息立即加密传输' },
    ],
  },
  {
    id: 'encrypted-extensions',
    from: 'server',
    label: 'Encrypted Extensions',
    color: '#f59e0b',
    detail: '（加密）发送额外扩展参数，如ALPN协商结果',
    fields: [{ name: '加密', value: '使用握手密钥加密，前向保密' }],
  },
  {
    id: 'certificate13',
    from: 'server',
    label: 'Certificate',
    color: '#f59e0b',
    detail: '（加密）发送证书链',
    fields: [
      { name: '与1.2不同', value: '已加密传输，不可被中间人看到' },
      { name: '证书链', value: 'Leaf → Intermediate → Root CA' },
    ],
  },
  {
    id: 'cert-verify',
    from: 'server',
    label: 'Certificate Verify',
    color: '#8b5cf6',
    detail: '（加密）用私钥签名握手摘要，证明证书所有权',
    fields: [
      { name: '签名算法', value: 'ECDSA-P256-SHA256' },
      { name: '签名内容', value: '握手消息哈希' },
    ],
  },
  {
    id: 'finished13-server',
    from: 'server',
    label: 'Finished',
    color: '#22c55e',
    detail: '（加密）服务器握手完成，1-RTT结束',
    fields: [{ name: '特点', value: 'TLS 1.3只需1个RTT，比1.2快1个来回' }],
  },
  {
    id: 'finished13-client',
    from: 'client',
    label: 'Finished',
    color: '#3b82f6',
    detail: '（加密）客户端确认握手完成，加密通道建立！',
    fields: [
      { name: '0-RTT', value: '可选：Session Ticket允许0-RTT恢复' },
      { name: '结果', value: '完整的1-RTT握手完成' },
    ],
  },
];

const SCENE_DATA = {
  id: 'tls-handshake',
  title: 'TLS/SSL握手过程',
  description: '可视化TLS 1.2和TLS 1.3握手协议的完整流程，理解证书链验证、ECDHE密钥交换、加密通道建立的工作原理',
  phase: 4 as const,
  category: '网络安全',
  difficulty: 'hard' as const,
  duration: '8-10分钟',
};

export function TLSHandshakeScene() {
  const [tlsVersion, setTLSVersion] = useState<TLSVersion>('1.2');
  const [currentMsgIdx, setCurrentMsgIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [tunnelEstablished, setTunnelEstablished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = tlsVersion === '1.2' ? TLS12_MESSAGES : TLS13_MESSAGES;

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const advance = useCallback(() => {
    setCurrentMsgIdx(prev => {
      const next = prev + 1;
      if (next >= messages.length) {
        setIsPlaying(false);
        setTunnelEstablished(true);
        return prev;
      }
      return next;
    });
  }, [messages.length]);

  useEffect(() => {
    if (isPlaying && currentMsgIdx < messages.length - 1) {
      clearTimer();
      timerRef.current = setTimeout(advance, 1600);
    } else if (currentMsgIdx >= messages.length - 1) {
      setIsPlaying(false);
      setTunnelEstablished(true);
    }
    return clearTimer;
  }, [isPlaying, currentMsgIdx, messages.length, advance, clearTimer]);

  const handleReset = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setCurrentMsgIdx(-1);
    setTunnelEstablished(false);
    setExpandedMsg(null);
  }, [clearTimer]);

  const switchVersion = useCallback((v: TLSVersion) => {
    handleReset();
    setTLSVersion(v);
  }, [handleReset]);

  const visibleMessages = messages.slice(0, currentMsgIdx + 1);

  const renderScene = () => (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* 左侧：控制面板 */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-3">
        {/* TLS版本切换 */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
          <div className="text-xs font-semibold text-slate-400 mb-2">TLS 版本</div>
          <div className="flex gap-2">
            {(['1.2', '1.3'] as TLSVersion[]).map(v => (
              <button
                key={v}
                onClick={() => switchVersion(v)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  tlsVersion === v 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                TLS {v}
              </button>
            ))}
          </div>
          {tlsVersion === '1.3' && (
            <div className="mt-2 text-xs text-green-300 bg-green-900/20 border border-green-800 rounded p-2">
              ⚡ 1-RTT握手，比1.2快1个往返！
            </div>
          )}
        </div>

        {/* 状态 */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
          <div className="text-xs font-semibold text-slate-400 mb-2">握手状态</div>
          <div className="space-y-2">
            {[
              { label: '握手消息', status: currentMsgIdx >= 0, value: `${Math.min(currentMsgIdx + 1, messages.length)}/${messages.length}` },
              { label: '证书验证', status: currentMsgIdx >= (tlsVersion === '1.2' ? 2 : 3) },
              { label: '密钥交换', status: currentMsgIdx >= (tlsVersion === '1.2' ? 5 : 1) },
              { label: '加密通道', status: tunnelEstablished },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{item.label}</span>
                <div className="flex items-center gap-1">
                  {item.value && <span className="text-xs text-slate-500">{item.value}</span>}
                  {item.status ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RTT对比 */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
          <div className="text-xs font-semibold text-slate-400 mb-2">握手RTT对比</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">TLS 1.2</span>
              <div className="flex gap-1">
                {[1,2].map(i => <div key={i} className="w-8 h-3 bg-orange-500/70 rounded" />)}
                <span className="text-orange-300 ml-1">2-RTT</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">TLS 1.3</span>
              <div className="flex gap-1">
                <div className="w-8 h-3 bg-green-500/70 rounded" />
                <span className="text-green-300 ml-1">1-RTT</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">0-RTT恢复</span>
              <span className="text-cyan-300">TLS 1.3 会话恢复</span>
            </div>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (currentMsgIdx >= messages.length - 1) {
                handleReset();
                setTimeout(() => setIsPlaying(true), 100);
              } else {
                setIsPlaying(p => !p);
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            {isPlaying ? '暂停' : currentMsgIdx >= messages.length - 1 ? '重播' : '播放'}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 中部：握手时序图 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 两端节点 */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex flex-col items-center gap-1.5">
            <motion.div
              className="w-14 h-14 rounded-xl bg-blue-900/60 border-2 border-blue-500 flex items-center justify-center"
              animate={tunnelEstablished ? { borderColor: ['#3b82f6', '#93c5fd', '#3b82f6'] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Globe className="w-7 h-7 text-blue-400" />
            </motion.div>
            <span className="text-xs text-slate-300">客户端</span>
            <span className="text-xs text-slate-500 font-mono">浏览器</span>
          </div>

          <div className="flex-1 mx-6 flex items-center gap-2">
            {tunnelEstablished && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-green-900/30 border border-green-500/50 rounded-lg text-xs text-green-300"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="font-semibold">🔒 加密通道已建立</span>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <motion.div
              className="w-14 h-14 rounded-xl bg-green-900/60 border-2 border-green-500 flex items-center justify-center"
              animate={tunnelEstablished ? { borderColor: ['#22c55e', '#86efac', '#22c55e'] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Server className="w-7 h-7 text-green-400" />
            </motion.div>
            <span className="text-xs text-slate-300">服务器</span>
            <span className="text-xs text-slate-500 font-mono">HTTPS</span>
          </div>
        </div>

        {/* 时序消息流 */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          <AnimatePresence>
            {visibleMessages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                {/* 消息行 */}
                <div
                  className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-all ${
                    expandedMsg === msg.id
                      ? 'border-slate-500 bg-slate-800/80'
                      : 'border-slate-700/60 hover:border-slate-600 bg-slate-800/40'
                  }`}
                  onClick={() => setExpandedMsg(expandedMsg === msg.id ? null : msg.id)}
                >
                  {msg.from === 'client' ? (
                    <>
                      <div className="w-16 text-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-300">客户端</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <motion.div
                          className="h-1 rounded flex-1"
                          style={{ backgroundColor: msg.color }}
                          initial={{ scaleX: 0, originX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.4 }}
                        />
                        <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: msg.color }} />
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded text-white" style={{ backgroundColor: msg.color + '90' }}>
                          {msg.label}
                        </span>
                      </div>
                      <div className="w-16 text-center flex-shrink-0">
                        <span className="text-xs text-slate-500">→服务器</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 text-center flex-shrink-0">
                        <span className="text-xs text-slate-500">客户端←</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded text-white" style={{ backgroundColor: msg.color + '90' }}>
                          {msg.label}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <motion.div
                          className="h-1 rounded flex-1"
                          style={{ backgroundColor: msg.color }}
                          initial={{ scaleX: 0, originX: 1 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.4 }}
                        />
                        <ArrowRight className="w-4 h-4 flex-shrink-0 rotate-180" style={{ color: msg.color }} />
                      </div>
                      <div className="w-16 text-center flex-shrink-0">
                        <span className="text-xs font-bold text-green-300">服务器</span>
                      </div>
                    </>
                  )}
                  
                  {expandedMsg === msg.id 
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-500 ml-1" />
                  }
                </div>

                {/* 展开详情 */}
                <AnimatePresence>
                  {expandedMsg === msg.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-3 mb-1 p-3 bg-slate-900/60 border border-slate-700 rounded-b-lg text-xs">
                        <p className="text-slate-300 mb-2">{msg.detail}</p>
                        {msg.fields && (
                          <div className="grid grid-cols-2 gap-1">
                            {msg.fields.map(f => (
                              <div key={f.name} className="flex gap-2">
                                <span className="text-slate-500 font-mono flex-shrink-0">{f.name}:</span>
                                <span className="text-cyan-300 font-mono text-[11px] break-all">{f.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {currentMsgIdx < 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-slate-600 gap-3">
              <Lock className="w-10 h-10 opacity-30" />
              <span className="text-sm">点击"播放"开始TLS握手演示</span>
            </div>
          )}
        </div>

        {/* 进度条 */}
        {currentMsgIdx >= 0 && (
          <div className="mt-3 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {messages.map((msg, idx) => (
                <button
                  key={msg.id}
                  onClick={() => { clearTimer(); setIsPlaying(false); setCurrentMsgIdx(idx); if (idx === messages.length - 1) setTunnelEstablished(true); }}
                  className="flex-shrink-0 flex flex-col items-center gap-0.5"
                  title={msg.label}
                >
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full border"
                    animate={
                      idx === currentMsgIdx
                        ? { scale: [1, 1.4, 1], borderColor: msg.color }
                        : {}
                    }
                    transition={{ repeat: isPlaying ? Infinity : 0, duration: 0.8 }}
                    style={{
                      backgroundColor: idx <= currentMsgIdx ? msg.color : 'transparent',
                      borderColor: idx <= currentMsgIdx ? msg.color : '#475569',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 右侧：证书链 */}
      <div className="w-48 flex-shrink-0 space-y-3">
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-slate-300">证书链</span>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Root CA', desc: '根证书（自签名）', color: '#ef4444', icon: '🏛️' },
              { label: 'Intermediate CA', desc: '中间CA证书', color: '#f59e0b', icon: '📋' },
              { label: 'Leaf Cert', desc: '服务器叶子证书', color: '#22c55e', icon: '📄' },
            ].map((cert, i) => (
              <div key={cert.label}>
                <div
                  className="px-2 py-2 border rounded-lg text-xs"
                  style={{ borderColor: cert.color + '60', backgroundColor: cert.color + '15' }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span>{cert.icon}</span>
                    <span className="font-semibold" style={{ color: cert.color }}>{cert.label}</span>
                  </div>
                  <span className="text-slate-500">{cert.desc}</span>
                </div>
                {i < 2 && (
                  <div className="flex justify-center my-0.5">
                    <span className="text-slate-600 text-xs">↓ 签发</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            客户端验证：叶子证书 → 中间CA → Root CA（内置信任库）
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-slate-300">密钥材料</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">算法</span>
              <span className="text-purple-300">ECDHE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">曲线</span>
              <span className="text-cyan-300">P-256</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">加密</span>
              <span className="text-green-300">AES-256-GCM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MAC</span>
              <span className="text-yellow-300">SHA-384</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SceneLayout scene={SCENE_DATA} showSidebar={false}>
      {renderScene()}
    </SceneLayout>
  );
}
