import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Shield, Server, Key, FileCheck, RefreshCw, 
  ArrowRight, CheckCircle, XCircle, Lock, Unlock
} from 'lucide-react';

interface Scene {
  id: string;
  title: string;
  description: string;
  phase: 1 | 2 | 3 | 4 | 5;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: string;
  isHot?: boolean;
}

const sceneData: Scene = {
  id: 'pki-certificate',
  title: 'PKI与数字证书：信任链验证',
  description: '公钥基础设施PKI体系、证书颁发机构CA、数字证书结构（X.509）、证书申请流程、证书链验证',
  phase: 5,
  category: '基础协议',
  difficulty: 'hard',
  duration: '10-15分钟',
  isHot: true,
};

const animationSteps = [
  { id: '1', label: '证书申请', desc: '申请者生成密钥对，将公钥和身份信息发送给CA机构' },
  { id: '2', label: 'CA签发证书', desc: 'CA验证申请者身份后，使用自己的私钥对申请信息进行数字签名' },
  { id: '3', label: '证书分发', desc: 'CA将签发好的证书返还给申请者，部署在Web服务器上' },
  { id: '4', label: '证书验证', desc: '客户端验证证书链：从终端证书到中间CA到根CA，逐级验证' },
  { id: '5', label: '证书吊销', desc: '当证书私钥泄露时，CA将其加入吊销列表(CRL)' },
];

// 证书链可视化
function CertificateChain({ 
  currentLevel, 
  onLevelClick 
}: { 
  currentLevel: number; 
  onLevelClick: (level: number) => void;
}) {
  const levels = [
    { name: '根证书 (Root CA)', desc: '自签名证书，操作系统内置', color: 'yellow', icon: Shield },
    { name: '中间证书 (Intermediate)', desc: '由根CA签发，可有多个中间层', color: 'blue', icon: Server },
    { name: '服务器证书 (Server)', desc: '由中间CA签发，用于网站身份验证', color: 'green', icon: Lock },
  ];

  return (
    <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700">
      <div className="text-center mb-4">
        <h4 className="text-lg font-semibold text-white">PKI证书信任链</h4>
        <p className="text-xs text-gray-400 mt-1">点击每个证书查看验证详情</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        {levels.map((level, idx) => {
          const Icon = level.icon;
          const isActive = currentLevel === idx;
          const isCompleted = currentLevel > idx;
          
          return (
            <motion.div
              key={level.name}
              className={`w-full max-w-md p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isActive 
                  ? `bg-${level.color}-600/30 border-${level.color}-500` 
                  : isCompleted
                  ? 'bg-green-900/30 border-green-500'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => onLevelClick(idx)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-${level.color}-600/50 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${level.color}-400`} />
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${isActive || isCompleted ? 'text-white' : 'text-gray-300'}`}>
                    {level.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{level.desc}</div>
                </div>
                {isCompleted && (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
              </div>
              
              {/* 验证详情 */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-700"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {idx === 0 && (
                        <>
                          <div className="bg-yellow-900/30 rounded p-2">
                            <div className="text-yellow-400">签名算法</div>
                            <div className="text-white font-mono">SHA256withRSA</div>
                          </div>
                          <div className="bg-yellow-900/30 rounded p-2">
                            <div className="text-yellow-400">有效期</div>
                            <div className="text-white font-mono">20年</div>
                          </div>
                          <div className="col-span-2 bg-yellow-900/30 rounded p-2">
                            <div className="text-yellow-400">信任锚点</div>
                            <div className="text-white">操作系统/浏览器内置根证书库</div>
                          </div>
                        </>
                      )}
                      {idx === 1 && (
                        <>
                          <div className="bg-blue-900/30 rounded p-2">
                            <div className="text-blue-400">颁发者</div>
                            <div className="text-white font-mono">Root CA</div>
                          </div>
                          <div className="bg-blue-900/30 rounded p-2">
                            <div className="text-blue-400">签名算法</div>
                            <div className="text-white font-mono">SHA256withRSA</div>
                          </div>
                          <div className="col-span-2 bg-blue-900/30 rounded p-2">
                            <div className="text-blue-400">验证签名</div>
                            <div className="text-green-400">✓ 使用Root CA公钥验证通过</div>
                          </div>
                        </>
                      )}
                      {idx === 2 && (
                        <>
                          <div className="bg-green-900/30 rounded p-2">
                            <div className="text-green-400">域名</div>
                            <div className="text-white font-mono">www.example.com</div>
                          </div>
                          <div className="bg-green-900/30 rounded p-2">
                            <div className="text-green-400">颁发者</div>
                            <div className="text-white font-mono">Intermediate CA</div>
                          </div>
                          <div className="col-span-2 bg-green-900/30 rounded p-2">
                            <div className="text-green-400">证书状态</div>
                            <div className="text-green-400">✓ 验证通过 - 证书链完整</div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// 数字签名过程可视化
function SignatureVisualizer({ phase }: { phase: 'idle' | 'hash' | 'encrypt' | 'verify' }) {
  return (
    <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700">
      <div className="text-center mb-4">
        <h4 className="text-lg font-semibold text-purple-400">数字签名原理（非对称加密）</h4>
        <p className="text-xs text-gray-500 mt-1">发送方用私钥签名，接收方用发送方公钥验证</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* 发送方 */}
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center ${
            phase !== 'idle' && phase !== 'verify' ? 'animate-pulse' : ''
          }`}>
            <FileCheck className="w-8 h-8 text-white" />
          </div>
          <div className="mt-2 text-sm text-white">发送方</div>
          <div className="text-[10px] text-gray-500">持有私钥</div>
        </div>

        {/* 流程箭头 */}
        <div className="flex-1 flex flex-col gap-2">
          <AnimatePresence>
            {phase === 'hash' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded" />
                <span className="text-xs text-purple-400">Hash运算</span>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {phase === 'encrypt' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 h-2 bg-gradient-to-r from-purple-500 to-orange-500 rounded" />
                <span className="text-xs text-orange-400">私钥签名</span>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {phase === 'verify' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded" />
                <span className="text-xs text-green-400">公钥验证</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 接收方 */}
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-xl bg-green-600 flex items-center justify-center ${
            phase === 'verify' ? 'animate-pulse' : ''
          }`}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="mt-2 text-sm text-white">接收方</div>
          <div className="text-[10px] text-gray-500">获取公钥</div>
        </div>
      </div>

      {/* 步骤说明 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg border ${phase === 'hash' || phase === 'encrypt' ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800/50 border-gray-700'}`}>
          <div className="text-xs text-blue-400 font-medium">签名过程</div>
          <div className="text-xs text-gray-400 mt-1">
            1. 对原文进行Hash运算（如SHA-256）<br/>
            2. 使用发送方<strong className="text-yellow-400">私钥</strong>加密Hash值<br/>
            3. 生成数字签名，附加在原文后
          </div>
        </div>
        <div className={`p-3 rounded-lg border ${phase === 'verify' ? 'bg-green-900/30 border-green-500' : 'bg-gray-800/50 border-gray-700'}`}>
          <div className="text-xs text-green-400 font-medium">验证过程</div>
          <div className="text-xs text-gray-400 mt-1">
            1. 用发送方<strong className="text-cyan-400">公钥</strong>解密签名<br/>
            2. 对原文同样进行Hash运算<br/>
            3. 比较解密结果与Hash值是否一致
          </div>
        </div>
      </div>
    </div>
  );
}

// 证书申请流程
function CertificateRequestFlow({ phase }: { phase: number }) {
  const steps = [
    { icon: Key, name: '生成密钥对', desc: '使用OpenSSL生成RSA 2048位密钥' },
    { icon: FileCheck, name: '创建CSR', desc: '生成证书签名请求文件' },
    { icon: Shield, name: '提交CA审核', desc: '将CSR发送给CA机构验证身份' },
    { icon: CheckCircle, name: 'CA签发证书', desc: 'CA使用私钥签发X.509证书' },
    { icon: Server, name: '部署证书', desc: '将证书和私钥部署到服务器' },
    { icon: Lock, name: '启用HTTPS', desc: '配置TLS/SSL安全访问' },
  ];

  return (
    <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">证书申请流程</h4>
      <div className="grid grid-cols-3 gap-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = phase === idx;
          const isCompleted = phase > idx;
          
          return (
            <motion.div
              key={idx}
              className={`p-3 rounded-lg border transition-all ${
                isActive ? 'bg-blue-900/30 border-blue-500' :
                isCompleted ? 'bg-green-900/20 border-green-500/50' :
                'bg-gray-800/50 border-gray-700'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-blue-600' :
                  isCompleted ? 'bg-green-600' :
                  'bg-gray-700'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <Icon className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <span className={`text-sm font-medium ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}`}>
                  {step.name}
                </span>
              </div>
              <p className="text-xs text-gray-500">{step.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// 证书验证步骤
function CertificateValidation() {
  const checks = [
    { name: '检查证书有效期', status: 'pass', desc: '当前时间在NotBefore和NotAfter之间' },
    { name: '验证数字签名', status: 'pass', desc: '使用颁发者公钥验证签名成功' },
    { name: '检查吊销状态', status: 'pass', desc: 'CRL/OCSP检查通过，证书未被吊销' },
    { name: '确认域名匹配', status: 'pass', desc: '证书CN/SAN与访问域名匹配' },
  ];

  return (
    <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">证书验证步骤</h4>
      <div className="space-y-3">
        {checks.map((check, idx) => (
          <motion.div
            key={idx}
            className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              check.status === 'pass' ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {check.status === 'pass' ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : (
                <XCircle className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{check.name}</div>
              <div className="text-xs text-gray-400">{check.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function PKICertificateScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'chain' | 'signature' | 'request'>('chain');
  const [chainLevel, setChainLevel] = useState(-1);
  const [signaturePhase, setSignaturePhase] = useState<'idle' | 'hash' | 'encrypt' | 'verify'>('idle');
  const [requestPhase, setRequestPhase] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= animationSteps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlay = useCallback(() => {
    if (currentStep >= animationSteps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  }, [currentStep, isPlaying]);

  const handleStep = useCallback((step: number) => {
    setCurrentStep(step);
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setChainLevel(-1);
    setSignaturePhase('idle');
    setRequestPhase(0);
  }, []);

  const handleTabChange = (tab: 'chain' | 'signature' | 'request') => {
    setActiveTab(tab);
    if (tab === 'signature') {
      setSignaturePhase('hash');
      setTimeout(() => setSignaturePhase('encrypt'), 1500);
      setTimeout(() => setSignaturePhase('verify'), 3000);
      setTimeout(() => setSignaturePhase('idle'), 4500);
    }
  };

  return (
    <SceneLayout
      scene={sceneData}
      showSidebar={false}
      animationProps={{
        steps: animationSteps,
        currentStep,
        isPlaying,
        onPlay: handlePlay,
        onPause: () => setIsPlaying(false),
        onStepChange: handleStep,
        onReset: handleReset,
      }}
    >
      <div className="space-y-6">
        {/* 标签切换 */}
        <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg max-w-md">
          {[
            { key: 'chain', label: '证书链', icon: Shield },
            { key: 'signature', label: '数字签名', icon: Lock },
            { key: 'request', label: '申请流程', icon: FileCheck },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key as 'chain' | 'signature' | 'request')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-yellow-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeTab === 'chain' && (
            <>
              <CertificateChain currentLevel={chainLevel} onLevelClick={setChainLevel} />
              <CertificateValidation />
            </>
          )}
          
          {activeTab === 'signature' && (
            <>
              <SignatureVisualizer phase={signaturePhase} />
              <div className="space-y-4">
                <div className="bg-purple-900/20 rounded-xl p-5 border border-purple-500/30">
                  <h4 className="text-lg font-semibold text-purple-400 mb-3">非对称加密原理</h4>
                  <div className="space-y-3 text-sm text-gray-300">
                    <div className="p-3 bg-gray-900/50 rounded-lg">
                      <div className="text-purple-400 font-medium mb-2">加密过程</div>
                      <div className="font-mono text-xs">
                        原文 + 接收方公钥 → 加密密文
                      </div>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded-lg">
                      <div className="text-green-400 font-medium mb-2">解密过程</div>
                      <div className="font-mono text-xs">
                        密文 + 接收方私钥 → 原文
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">密钥 vs 签名</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-blue-900/30 rounded-lg">
                      <div className="text-blue-400 font-medium">加密 (Encryption)</div>
                      <div className="text-gray-400 mt-1">用<strong>接收方公钥</strong>加密</div>
                      <div className="text-gray-400">保证<strong>机密性</strong></div>
                    </div>
                    <div className="p-3 bg-green-900/30 rounded-lg">
                      <div className="text-green-400 font-medium">签名 (Signature)</div>
                      <div className="text-gray-400 mt-1">用<strong>发送方私钥</strong>签名</div>
                      <div className="text-gray-400">保证<strong>身份认证</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'request' && (
            <>
              <CertificateRequestFlow phase={requestPhase} />
              <div className="space-y-4">
                <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-300 mb-4">证书类型对比</h4>
                  <div className="space-y-3">
                    {[
                      { level: 'DV', name: '域名验证', desc: '仅验证域名所有权', time: '几分钟', color: 'gray' },
                      { level: 'OV', name: '组织验证', desc: '验证组织身份真实性', time: '1-5天', color: 'blue' },
                      { level: 'EV', name: '扩展验证', desc: '严格验证+法律存在', time: '1-7天', color: 'green' },
                    ].map((cert) => (
                      <div key={cert.level} className={`p-3 bg-${cert.color}-900/20 rounded-lg border border-${cert.color}-500/30`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-white">{cert.level}</span>
                          <span className={`text-xs text-${cert.color}-400`}>{cert.name}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">{cert.desc}</p>
                        <div className="text-xs">
                          <span className="text-gray-500">签发时间:</span>
                          <span className={`text-${cert.color}-400 ml-1`}>{cert.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-5 border border-yellow-500/30">
                  <h4 className="text-sm font-semibold text-yellow-400 mb-3">证书格式</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-gray-900/50 rounded">
                      <div className="text-yellow-400 font-mono">.cer/.crt</div>
                      <div className="text-gray-400">DER/Base64编码</div>
                    </div>
                    <div className="p-2 bg-gray-900/50 rounded">
                      <div className="text-yellow-400 font-mono">.pem</div>
                      <div className="text-gray-400">Base64文本格式</div>
                    </div>
                    <div className="p-2 bg-gray-900/50 rounded">
                      <div className="text-yellow-400 font-mono">.pfx/.p12</div>
                      <div className="text-gray-400">含私钥格式</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 技术要点 */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-purple-500/10 rounded-xl p-5 border border-yellow-500/20">
          <h4 className="text-sm font-semibold text-yellow-400 mb-3">技术要点</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-yellow-400 font-medium mb-2">X.509证书结构</div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 版本号 + 序列号</li>
                <li>• 签名算法 + 颁发者</li>
                <li>• 有效期 + 主体</li>
                <li>• 公钥信息 + 扩展</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-purple-400 font-medium mb-2">证书链验证</div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 从服务器证书到根CA</li>
                <li>• 逐级验证数字签名</li>
                <li>• 检查吊销状态CRL/OCSP</li>
                <li>• 域名匹配SAN/CN</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-green-400 font-medium mb-2">常见算法</div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 签名: RSA/ECDSA</li>
                <li>• Hash: SHA-256/SHA-384</li>
                <li>• 密钥长度: RSA 2048+/EC 256+</li>
                <li>• TLS 1.3禁用旧算法</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
