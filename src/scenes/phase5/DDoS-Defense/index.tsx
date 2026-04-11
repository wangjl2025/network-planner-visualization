import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Shield, Server, Monitor, Zap, AlertTriangle, 
  CheckCircle, XCircle, RefreshCw, Activity
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
  id: 'ddos-defense',
  title: 'DDoS攻击与防御：流量清洗',
  description: '分布式拒绝服务攻击DDoS原理、三类攻击详解（容量型/协议型/应用型）、流量清洗中心、常见攻击类型（SYN Flood/UDP Flood/HTTP Flood/DNS Amplification）',
  phase: 5,
  category: '基础协议',
  difficulty: 'medium',
  duration: '10-15分钟',
  isHot: true,
};

const animationSteps = [
  { id: '1', label: '正常流量', desc: '正常用户请求通过防火墙到达服务器，系统正常运行' },
  { id: '2', label: 'DDoS攻击', desc: '攻击者控制大量僵尸主机，同时向目标发送海量请求' },
  { id: '3', label: '流量清洗', desc: '清洗中心通过行为分析、特征识别过滤恶意流量' },
  { id: '4', label: '攻击缓解', desc: '正常业务逐渐恢复，攻击流量被丢弃，服务器恢复健康' },
];

// 攻击流量模拟器
function TrafficSimulator({ 
  attackLevel, 
  defenseLevel,
  onAttack,
  onDefense,
  onReset 
}: { 
  attackLevel: number; 
  defenseLevel: number;
  onAttack: () => void;
  onDefense: () => void;
  onReset: () => void;
}) {
  const bots = Array.from({ length: 12 }, (_, i) => i);
  
  return (
    <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700">
      <div className="text-center mb-4">
        <h4 className="text-lg font-semibold text-white">网络拓扑与流量可视化</h4>
        <p className="text-xs text-gray-400 mt-1">实时展示攻击流量和防御效果</p>
      </div>
      
      {/* 状态指示器 */}
      <div className="flex justify-center gap-4 mb-4">
        {[
          { label: '正常用户', count: attackLevel > 0 ? 3 : 6, color: 'green' },
          { label: '攻击流量', count: Math.min(attackLevel, 12), color: 'red' },
          { label: '清洗掉', count: defenseLevel > 0 ? defenseLevel : 0, color: 'yellow' },
        ].map((stat, idx) => (
          <div key={idx} className={`px-4 py-2 rounded-lg bg-${stat.color}-900/30 border border-${stat.color}-500/50`}>
            <div className="text-xs text-gray-400">{stat.label}</div>
            <div className={`text-lg font-bold text-${stat.color}-400`}>{stat.count}</div>
          </div>
        ))}
      </div>
      
      {/* 拓扑图 */}
      <div className="relative h-48 bg-gray-800/50 rounded-lg overflow-hidden">
        {/* 攻击源 */}
        <div className="absolute left-4 top-4">
          <div className="text-xs text-red-400 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            攻击源
          </div>
          <div className="flex flex-wrap gap-1 max-w-[100px]">
            {bots.slice(0, Math.min(attackLevel, 12)).map((i) => (
              <motion.div
                key={i}
                className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center"
                animate={attackLevel > 0 ? { 
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                } : {}}
                transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
              >
                <Shield className="w-3 h-3 text-white" />
              </motion.div>
            ))}
            {attackLevel === 0 && (
              <div className="text-xs text-gray-500">无攻击</div>
            )}
          </div>
        </div>
        
        {/* 防火墙/清洗中心 */}
        <motion.div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          animate={defenseLevel > 0 ? { scale: [1, 1.05, 1] } : {}}
        >
          <div className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center border-4 shadow-lg ${
            defenseLevel > 0 
              ? 'bg-green-600 border-green-400' 
              : attackLevel > 0 
              ? 'bg-orange-600 border-orange-400' 
              : 'bg-blue-600 border-blue-400'
          }`}>
            <Shield className="w-8 h-8 text-white" />
            <div className="text-[10px] text-white mt-1">
              {defenseLevel > 0 ? '清洗中' : attackLevel > 0 ? '检测攻击' : '正常'}
            </div>
          </div>
        </motion.div>
        
        {/* 流量箭头 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {attackLevel > 0 && (
            <motion.path
              d="M 80 60 Q 150 150 250 150"
              stroke="#ef4444"
              strokeWidth={Math.min(attackLevel, 12) * 0.5}
              fill="none"
              strokeDasharray="5,5"
              animate={{ 
                strokeDashoffset: [0, -20],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
          
          {defenseLevel > 0 && (
            <motion.path
              d="M 300 150 Q 350 100 380 60"
              stroke="#eab308"
              strokeWidth={defenseLevel * 0.3}
              fill="none"
              strokeDasharray="5,5"
              animate={{ strokeDashoffset: [0, -15] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          )}
        </svg>
        
        {/* 目标服务器 */}
        <motion.div 
          className={`absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-xl flex flex-col items-center justify-center border-2 ${
            attackLevel > 0 && defenseLevel === 0
              ? 'bg-red-600/50 border-red-400 animate-pulse'
              : defenseLevel > 0
              ? 'bg-green-600 border-green-400'
              : 'bg-purple-600 border-purple-400'
          }`}
        >
          <Server className="w-7 h-7 text-white" />
          <div className="text-[10px] text-white mt-1">服务器</div>
        </motion.div>
      </div>
      
      {/* 健康度条 */}
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">服务器健康度</span>
          <span className={attackLevel > 0 && defenseLevel === 0 ? 'text-red-400' : defenseLevel > 0 ? 'text-green-400' : 'text-gray-400'}>
            {attackLevel > 0 && defenseLevel === 0 ? `${Math.max(10, 100 - attackLevel * 8)}%` : defenseLevel > 0 ? '恢复中...' : '100%'}
          </span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${attackLevel > 0 && defenseLevel === 0 ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: attackLevel > 0 && defenseLevel === 0 ? `${Math.max(10, 100 - attackLevel * 8)}%` : '100%' }}
          />
        </div>
      </div>
      
      {/* 控制按钮 */}
      <div className="flex justify-center gap-3 mt-4">
        <button
          onClick={onAttack}
          disabled={attackLevel > 0}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            attackLevel > 0 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {attackLevel > 0 ? '攻击进行中...' : '🚨 模拟DDoS攻击'}
        </button>
        <button
          onClick={onDefense}
          disabled={defenseLevel > 0 || attackLevel === 0}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            defenseLevel > 0 || attackLevel === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {defenseLevel > 0 ? '清洗进行中...' : '🛡️ 启动流量清洗'}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
        >
          🔄 重置
        </button>
      </div>
    </div>
  );
}

// 攻击类型对比
function AttackTypes() {
  const attacks = [
    { name: 'SYN Flood', layer: 'L4', severity: '高危', desc: '发送大量SYN包但不完成三次握手', mitigation: '启用SYN Cookie' },
    { name: 'UDP Flood', layer: 'L4', severity: '高危', desc: '发送大量UDP数据包，耗尽带宽', mitigation: '流量阈值限制' },
    { name: 'HTTP Flood', layer: 'L7', severity: '严重', desc: '模拟正常HTTP请求，耗尽服务器', mitigation: '验证码+速率限制' },
    { name: 'DNS Amplification', layer: 'L7', severity: '严重', desc: '利用DNS响应放大攻击流量', mitigation: '限制响应大小' },
    { name: 'ICMP Flood', layer: 'L3', severity: '中危', desc: '发送大量ICMP echo请求', mitigation: '禁用ICMP或限速' },
    { name: 'Slowloris', layer: 'L7', severity: '高危', desc: '缓慢发送HTTP头部保持连接', mitigation: '限制连接时间' },
  ];
  
  return (
    <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
      <h4 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        常见DDoS攻击类型
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {attacks.map((attack) => (
          <div key={attack.name} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-red-500/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-white">{attack.name}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${
                attack.severity === '严重' ? 'bg-red-900/50 text-red-300' :
                attack.severity === '高危' ? 'bg-orange-900/50 text-orange-300' :
                'bg-yellow-900/50 text-yellow-300'
              }`}>
                {attack.layer} · {attack.severity}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{attack.desc}</p>
            <div className="text-[10px] text-green-400 bg-green-900/30 rounded px-2 py-1">
              防御: {attack.mitigation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 防御机制
function DefenseMechanisms() {
  const defenses = [
    { name: '流量清洗中心', desc: '云端大带宽清洗，识别过滤恶意流量', capacity: 'T级防护', color: 'blue' },
    { name: '黑洞路由', desc: '将攻击流量导向空路由', capacity: '即时生效', color: 'gray' },
    { name: '速率限制', desc: '限制单IP每秒请求数', capacity: '应用层', color: 'yellow' },
    { name: 'AI行为分析', desc: '机器学习识别异常访问模式', capacity: '智能识别', color: 'purple' },
    { name: 'Anycast分散', desc: '利用CDN将流量分散到多节点', capacity: '全球节点', color: 'green' },
    { name: '弹性扩容', desc: '自动扩展服务器资源', capacity: '自动响应', color: 'cyan' },
  ];
  
  return (
    <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
      <h4 className="text-sm font-semibold text-green-400 mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        DDoS防御方案
      </h4>
      <div className="grid grid-cols-3 gap-3">
        {defenses.map((defense) => (
          <div key={defense.name} className={`bg-${defense.color}-900/20 rounded-lg p-3 border border-${defense.color}-500/30`}>
            <div className="font-medium text-white text-sm">{defense.name}</div>
            <p className="text-xs text-gray-400 mt-1">{defense.desc}</p>
            <div className={`text-[10px] text-${defense.color}-400 mt-2 px-2 py-0.5 bg-${defense.color}-900/50 rounded inline-block`}>
              {defense.capacity}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DDoSDefenseScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [attackLevel, setAttackLevel] = useState(0);
  const [defenseLevel, setDefenseLevel] = useState(0);
  
  useEffect(() => {
    if (attackLevel > 0 && defenseLevel === 0) {
      const interval = setInterval(() => {
        setAttackLevel(prev => Math.min(prev + 1, 12));
      }, 300);
      return () => clearInterval(interval);
    }
  }, [attackLevel, defenseLevel]);
  
  useEffect(() => {
    if (defenseLevel > 0 && defenseLevel < 12) {
      const interval = setInterval(() => {
        setDefenseLevel(prev => {
          if (prev >= attackLevel) {
            setAttackLevel(0);
            return 0;
          }
          return prev + 1;
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [defenseLevel, attackLevel]);
  
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
    setAttackLevel(0);
    setDefenseLevel(0);
  }, []);
  
  const handleAttack = () => {
    setAttackLevel(1);
    setCurrentStep(2);
  };
  
  const handleDefense = () => {
    setDefenseLevel(1);
    setCurrentStep(3);
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
        {/* 主可视化区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrafficSimulator
            attackLevel={attackLevel}
            defenseLevel={defenseLevel}
            onAttack={handleAttack}
            onDefense={handleDefense}
            onReset={handleReset}
          />
          
          {/* 攻击阶段说明 */}
          <div className="space-y-4">
            <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700">
              <h4 className="text-sm font-semibold text-gray-300 mb-4">DDoS攻击阶段</h4>
              <div className="space-y-3">
                {animationSteps.map((step, idx) => {
                  const isActive = currentStep === idx;
                  const isCompleted = currentStep > idx;
                  return (
                    <div 
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                        isActive ? 'bg-blue-900/30 border border-blue-500/50' :
                        isCompleted ? 'bg-green-900/20 border border-green-500/30' :
                        'bg-gray-800/50 border border-gray-700'
                      }`}
                      onClick={() => handleStep(idx)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isActive ? 'bg-blue-500 text-white' :
                        isCompleted ? 'bg-green-500 text-white' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}`}>
                          {step.label}
                        </div>
                        <div className="text-xs text-gray-500">{step.desc}</div>
                      </div>
                      {isActive && (
                        <motion.div
                          className="w-2 h-2 bg-blue-500 rounded-full"
                          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 攻击规模指标 */}
            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-5 border border-red-500/30">
              <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                DDoS攻击规模趋势
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-400">2.9 Tbps</div>
                  <div className="text-xs text-gray-400">2023年最大攻击峰值</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-orange-400">800+ Gbps</div>
                  <div className="text-xs text-gray-400">平均攻击带宽增长</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 攻击类型和防御机制 */}
        <AttackTypes />
        <DefenseMechanisms />
        
        {/* 技术要点 */}
        <div className="bg-gradient-to-r from-red-500/10 to-yellow-500/10 rounded-xl p-5 border border-red-500/20">
          <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            技术要点
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-red-400 font-medium mb-2">Volumetric Attack</div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 消耗带宽资源 (Gbps/Tbps级)</li>
                <li>• UDP Flood, ICMP Flood</li>
                <li>• 依靠清洗中心缓解</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-orange-400 font-medium mb-2">Protocol Attack</div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 消耗服务器资源</li>
                <li>• SYN Flood, Ping of Death</li>
                <li>• 启用SYN Cookie</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-yellow-400 font-medium mb-2">Application Attack</div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 模拟正常用户行为</li>
                <li>• HTTP Flood, DNS Query</li>
                <li>• WAF + 行为分析</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
