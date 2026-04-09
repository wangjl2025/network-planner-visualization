import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import { Wifi, Radio, Zap, BarChart2, Users, ArrowUpDown } from 'lucide-react';

// 用户颜色
const USER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const USER_NAMES = ['用户A', '用户B', '用户C', '用户D', '用户E', '用户F'];

// OFDMA资源单元 (RU) 分配
const RU_SIZES = {
  26: { tones: 26, label: '26-tone', bw: '2 MHz', maxUsers: 9 },
  52: { tones: 52, label: '52-tone', bw: '4 MHz', maxUsers: 4 },
  106: { tones: 106, label: '106-tone', bw: '8 MHz', maxUsers: 2 },
  242: { tones: 242, label: '242-tone', bw: '20 MHz', maxUsers: 1 },
};

interface UserDevice {
  id: number;
  name: string;
  color: string;
  dataSize: 'small' | 'medium' | 'large';
  active: boolean;
}

// OFDM时隙可视化（一次一个用户）
const OFDMTimeline = ({ users, currentSlot }: { users: UserDevice[]; currentSlot: number }) => {
  const slots = users.filter(u => u.active).flatMap(u => 
    Array(u.dataSize === 'large' ? 3 : u.dataSize === 'medium' ? 2 : 1).fill(u)
  );
  
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
        <span className="font-semibold text-slate-300">OFDM</span>
        <span>（时分，一次服务一个用户）</span>
      </div>
      <div className="relative h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
        <div className="absolute inset-0 flex">
          {slots.map((user, i) => (
            <motion.div
              key={i}
              className="flex-1 flex items-center justify-center text-xs font-bold text-white border-r border-slate-800"
              style={{ backgroundColor: user.color }}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: i === currentSlot % slots.length ? 1 : 0.4 }}
              transition={{ duration: 0.3 }}
            >
              {user.name.slice(-1)}
            </motion.div>
          ))}
        </div>
        {/* 时间光标 */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
          animate={{ left: `${((currentSlot % Math.max(slots.length, 1)) / Math.max(slots.length, 1)) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="text-xs text-slate-500">
        共 {slots.length} 个时隙，用户排队等待
      </div>
    </div>
  );
};

// OFDMA频谱可视化（同时多用户）
const OFDMASpectrum = ({ users, ruSize }: { users: UserDevice[]; ruSize: keyof typeof RU_SIZES }) => {
  const activeUsers = users.filter(u => u.active);
  const totalSubcarriers = 256;
  const ruConfig = RU_SIZES[ruSize];
  
  // 根据RU大小分配频谱
  const allocations: { user: UserDevice; startCarrier: number; endCarrier: number }[] = [];
  let currentCarrier = 0;
  const carriersPerRU = Math.floor(totalSubcarriers / ruConfig.maxUsers);
  
  activeUsers.forEach((user, i) => {
    if (currentCarrier < totalSubcarriers) {
      allocations.push({
        user,
        startCarrier: currentCarrier,
        endCarrier: Math.min(currentCarrier + carriersPerRU - 1, totalSubcarriers - 1),
      });
      currentCarrier += carriersPerRU;
    }
  });
  
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
        <span className="font-semibold text-slate-300">OFDMA</span>
        <span>（频分+时分，同时服务多用户）</span>
      </div>
      <div className="relative h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
        <div className="absolute inset-0 flex">
          {allocations.map(({ user, startCarrier, endCarrier }, i) => {
            const width = ((endCarrier - startCarrier + 1) / totalSubcarriers) * 100;
            return (
              <motion.div
                key={user.id}
                className="relative flex items-center justify-center text-xs font-bold text-white"
                style={{ width: `${width}%`, backgroundColor: user.color, borderRight: '1px solid rgba(0,0,0,0.3)' }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
              >
                <motion.div
                  className="absolute inset-0 opacity-30"
                  style={{ backgroundColor: user.color }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
                <span className="relative z-10">{user.name.slice(-1)}</span>
              </motion.div>
            );
          })}
          {/* 空闲频谱 */}
          {currentCarrier < totalSubcarriers && (
            <div
              className="flex items-center justify-center text-xs text-slate-600 bg-slate-800"
              style={{ flex: 1 }}
            >
              空闲
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {allocations.map(({ user }) => (
          <div key={user.id} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }} />
            <span className="text-slate-400">{user.name}: RU {ruSize}-tone</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 吞吐量对比图
const ThroughputChart = ({ userCount, mode }: { userCount: number; mode: 'ofdm' | 'ofdma' }) => {
  const ofdmThroughput = Math.max(100, 600 / userCount); // OFDM下用户越多越慢
  const ofdmaThroughput = Math.min(500, 200 + userCount * 50); // OFDMA下用户越多效率越高
  
  const maxTp = 600;
  
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400">总吞吐量对比（{userCount}个用户）</div>
      <div className="space-y-2">
        {[
          { label: 'OFDM', value: ofdmThroughput, color: '#f59e0b', active: mode === 'ofdm' },
          { label: 'OFDMA', value: ofdmaThroughput, color: '#22c55e', active: mode === 'ofdma' },
        ].map(item => (
          <div key={item.label} className={`transition-all ${item.active ? 'opacity-100' : 'opacity-50'}`}>
            <div className="flex justify-between text-xs mb-1">
              <span className={`font-medium`} style={{ color: item.color }}>{item.label}</span>
              <span className="text-slate-300">{item.value.toFixed(0)} Mbps</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxTp) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ANIMATION_STEPS = [
  { id: 'intro', label: '技术对比概述', desc: 'Wi-Fi 5（802.11ac）使用OFDM，一次只能为一个用户服务。Wi-Fi 6（802.11ax）引入OFDMA，可同时为多个用户服务。' },
  { id: 'ofdm-single', label: 'OFDM：单用户传输', desc: 'AP将整个信道（如20MHz/80MHz）分配给单个用户，其他用户等待。适合大数据量传输，但多用户场景效率低。' },
  { id: 'ofdm-queue', label: 'OFDM：多用户排队', desc: '多个用户依次占用信道。小数据包（如IoT设备心跳）浪费大量信道资源，延迟增加。' },
  { id: 'ofdma-intro', label: 'OFDMA：资源单元（RU）', desc: 'OFDMA将信道划分为多个资源单元（RU），每个RU由若干子载波组成。不同用户同时使用不同RU。' },
  { id: 'ofdma-alloc', label: 'OFDMA：同时服务多用户', desc: 'AP调度器将不同RU分配给不同用户，用户在同一时间槽内并行发送。小包用户效率大幅提升。' },
  { id: 'ul-ofdma', label: '上行OFDMA（UL-OFDMA）', desc: 'Wi-Fi 6支持上行方向的OFDMA。AP发送触发帧（Trigger Frame），多个终端同时在分配的RU上上传数据。' },
  { id: 'bsr', label: '缓冲状态报告（BSR）', desc: '终端向AP汇报自身缓冲区数据量，AP据此进行资源调度分配，避免资源浪费。' },
  { id: 'mu-mimo', label: 'MU-MIMO + OFDMA', desc: 'Wi-Fi 6结合OFDMA和MU-MIMO，同时支持多用户×多流，最大化频谱利用率。' },
  { id: 'comparison', label: '综合对比', desc: '高并发场景下，OFDMA比OFDM延迟降低75%，吞吐量提升4倍以上。' },
];

export function WiFi6OFDMAScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userCount, setUserCount] = useState(4);
  const [ruSize, setRuSize] = useState<keyof typeof RU_SIZES>(26);
  const [ofdmSlot, setOfdmSlot] = useState(0);
  const [activeMode, setActiveMode] = useState<'ofdm' | 'ofdma'>('ofdm');

  const users: UserDevice[] = Array.from({ length: userCount }, (_, i) => ({
    id: i,
    name: USER_NAMES[i],
    color: USER_COLORS[i],
    dataSize: i % 3 === 0 ? 'large' : i % 3 === 1 ? 'medium' : 'small',
    active: true,
  }));

  const parameters = [
    {
      id: 'userCount',
      label: '用户数量',
      type: 'slider' as const,
      value: userCount,
      min: 1,
      max: 6,
      step: 1,
      unit: '个',
    },
    {
      id: 'ruSize',
      label: 'RU大小',
      type: 'select' as const,
      value: String(ruSize),
      options: Object.entries(RU_SIZES).map(([k, v]) => ({
        value: k,
        label: `${v.label} (${v.bw})`,
      })),
    },
  ];

  // OFDM时隙动画
  useEffect(() => {
    const timer = setInterval(() => {
      setOfdmSlot(prev => prev + 1);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  // 根据步骤设置模式
  useEffect(() => {
    const step = ANIMATION_STEPS[currentStep]?.id;
    if (['ofdm-single', 'ofdm-queue'].includes(step)) {
      setActiveMode('ofdm');
    } else if (['ofdma-intro', 'ofdma-alloc', 'ul-ofdma', 'bsr', 'mu-mimo', 'comparison'].includes(step)) {
      setActiveMode('ofdma');
    }
  }, [currentStep]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < ANIMATION_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 2500);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setActiveMode('ofdm');
  }, []);

  const handleParamChange = (id: string, value: string | number) => {
    if (id === 'userCount') setUserCount(Number(value));
    if (id === 'ruSize') setRuSize(Number(value) as keyof typeof RU_SIZES);
  };

  const currentStepId = ANIMATION_STEPS[currentStep]?.id;
  const showOFDM = ['intro', 'ofdm-single', 'ofdm-queue', 'comparison'].includes(currentStepId);
  const showOFDMA = ['ofdma-intro', 'ofdma-alloc', 'ul-ofdma', 'bsr', 'mu-mimo', 'comparison'].includes(currentStepId);

  // Scene 数据
  const sceneData = {
    id: 'wifi6-ofdma',
    title: 'Wi-Fi 6 OFDMA技术',
    description: 'OFDMA资源单元分配、多用户并行传输、上行OFDMA对比',
    phase: 3 as const,
    category: '无线网络',
    duration: '6-8分钟',
    difficulty: 'medium' as const,
    isHot: true,
  };

  return (
    <SceneLayout
      scene={sceneData}
      showSidebar={false}
    >
      <div className="grid grid-cols-12 gap-4 h-full overflow-auto p-4">
        {/* 参数面板 */}
        <div className="col-span-3">
          <ParameterPanel
            title="场景配置"
            parameters={parameters}
            onChange={handleParamChange}
            onReset={() => {}}
          />

          {/* 技术标准对比 */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Wi-Fi标准对比</h3>
            {[
              { std: 'Wi-Fi 5', ieee: '802.11ac', tech: 'OFDM + DL-MU-MIMO', color: '#f59e0b', maxRate: '3.5 Gbps' },
              { std: 'Wi-Fi 6', ieee: '802.11ax', tech: 'OFDMA + UL/DL-MU-MIMO', color: '#22c55e', maxRate: '9.6 Gbps' },
              { std: 'Wi-Fi 7', ieee: '802.11be', tech: 'OFDMA + MLO + 4096-QAM', color: '#3b82f6', maxRate: '46 Gbps' },
            ].map(item => (
              <div key={item.std} className="p-2 rounded bg-slate-900/50 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-bold" style={{ color: item.color }}>{item.std}</span>
                  <span className="text-slate-500">{item.ieee}</span>
                </div>
                <div className="text-slate-400">{item.tech}</div>
                <div className="text-slate-500">理论峰值：{item.maxRate}</div>
              </div>
            ))}
          </div>

          {/* RU说明 */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">RU大小对比</h3>
            <div className="space-y-1 text-xs">
              {Object.entries(RU_SIZES).map(([size, info]) => (
                <div
                  key={size}
                  className={`flex justify-between p-1.5 rounded cursor-pointer transition-all ${
                    ruSize === Number(size) ? 'bg-blue-900/50 border border-blue-600' : 'bg-slate-900/30 hover:bg-slate-700/50'
                  }`}
                  onClick={() => setRuSize(Number(size) as keyof typeof RU_SIZES)}
                >
                  <span className="text-slate-300">{info.label}</span>
                  <span className="text-slate-500">{info.bw}，最多{info.maxUsers}用户</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 主可视化区域 */}
        <div className="col-span-6">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-5 space-y-5" style={{ minHeight: 460 }}>
            {/* 模式切换标签 */}
            <div className="flex gap-3 justify-center">
              {[
                { id: 'ofdm', label: 'OFDM (Wi-Fi 5)', color: '#f59e0b', icon: <Radio className="w-4 h-4" /> },
                { id: 'ofdma', label: 'OFDMA (Wi-Fi 6)', color: '#22c55e', icon: <Wifi className="w-4 h-4" /> },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id as 'ofdm' | 'ofdma')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeMode === mode.id
                      ? 'text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                  style={activeMode === mode.id ? { backgroundColor: mode.color + '99', borderColor: mode.color, border: '1px solid' } : {}}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>

            {/* AP 图示 */}
            <div className="flex justify-center">
              <motion.div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border-2 border-slate-500 flex flex-col items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wifi className="w-6 h-6 text-blue-400" />
                <span className="text-xs text-slate-300 mt-0.5">AP</span>
              </motion.div>
            </div>

            {/* 频谱可视化 */}
            <div className="space-y-4">
              {/* 20MHz信道示意 */}
              <div>
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" />
                  <span>20MHz信道频谱分配</span>
                </div>
                
                <AnimatePresence mode="wait">
                  {activeMode === 'ofdm' ? (
                    <motion.div
                      key="ofdm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-3"
                    >
                      {/* OFDM：一次服务一个用户 */}
                      <div className="h-14 bg-slate-800 rounded-lg overflow-hidden border border-yellow-700/50 flex items-stretch">
                        <motion.div
                          className="flex-1 flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: users[ofdmSlot % userCount]?.color || '#f59e0b' }}
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          整个信道 → {users[ofdmSlot % userCount]?.name}（其余等待）
                        </motion.div>
                      </div>
                      <OFDMTimeline users={users} currentSlot={ofdmSlot} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ofdma"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <OFDMASpectrum users={users} ruSize={ruSize} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 用户终端行 */}
              <div>
                <div className="text-xs text-slate-400 mb-2">终端设备</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {users.map((user, i) => (
                    <motion.div
                      key={user.id}
                      className="flex flex-col items-center gap-1"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: user.color + 'cc', border: `2px solid ${user.color}` }}
                      >
                        {user.name.slice(-1)}
                      </div>
                      <div className="text-xs text-slate-500 text-center">
                        <div>{user.name}</div>
                        <div className="text-slate-600">{user.dataSize === 'small' ? '小包' : user.dataSize === 'medium' ? '中包' : '大包'}</div>
                      </div>
                      {/* 传输状态指示 */}
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: user.color }}
                        animate={
                          activeMode === 'ofdma'
                            ? { opacity: [0.3, 1, 0.3] }
                            : { opacity: i === ofdmSlot % userCount ? [0.3, 1, 0.3] : 0.2 }
                        }
                        transition={{ duration: 0.8, repeat: Infinity, delay: activeMode === 'ofdma' ? i * 0.1 : 0 }}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 效率对比 */}
              <div className="pt-2 border-t border-slate-700">
                <ThroughputChart userCount={userCount} mode={activeMode} />
              </div>
            </div>

            {/* 上行OFDMA说明（特定步骤显示） */}
            <AnimatePresence>
              {currentStepId === 'ul-ofdma' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpDown className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-blue-400">上行OFDMA (UL-OFDMA) 触发帧机制</span>
                  </div>
                  <div className="text-slate-300">
                    AP → 终端：<span className="text-yellow-400">Trigger Frame（分配RU，指定发送时间）</span><br/>
                    终端 → AP：<span className="text-green-400">所有用户在同一时间槽内，在各自RU上同时上传</span>
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
            title="当前步骤"
            content={
              <div className="text-xs">
                <div className="font-semibold text-blue-400 mb-2">{ANIMATION_STEPS[currentStep]?.label}</div>
                <p className="text-slate-400">{ANIMATION_STEPS[currentStep]?.desc}</p>
              </div>
            }
          />

          <InfoPanel
            title="OFDMA核心优势"
            content={
              <div className="space-y-2 text-xs">
                {[
                  { icon: '⚡', title: '低延迟', desc: '小包不必等待大包完成，显著降低平均延迟' },
                  { icon: '📊', title: '高效率', desc: 'RU可灵活配置，小数据包不浪费整个信道' },
                  { icon: '↕️', title: '上行改善', desc: 'UL-OFDMA通过Trigger Frame协调多用户上传' },
                  { icon: '🎯', title: '精准调度', desc: 'BSR机制让AP了解用户需求，智能分配资源' },
                ].map(item => (
                  <div key={item.title} className="flex gap-2 p-2 bg-slate-800 rounded">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <div className="font-semibold text-slate-200">{item.title}</div>
                      <div className="text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            }
          />

          <InfoPanel
            title="关键参数"
            content={
              <div className="space-y-2 text-xs">
                {[
                  { label: '子载波间隔', wifi5: '312.5 kHz', wifi6: '78.125 kHz' },
                  { label: 'OFDM符号长度', wifi5: '3.2 μs', wifi6: '12.8 μs' },
                  { label: '最大RU数', wifi5: 'N/A', wifi6: '9个(20MHz)' },
                  { label: '空间流数', wifi5: '8流', wifi6: '8流' },
                  { label: 'QAM阶数', wifi5: '256-QAM', wifi6: '1024-QAM' },
                ].map(item => (
                  <div key={item.label} className="grid grid-cols-3 gap-1 p-1.5 bg-slate-800 rounded">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-yellow-400 text-center">{item.wifi5}</span>
                    <span className="text-green-400 text-center">{item.wifi6}</span>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-1 text-xs text-center mt-1">
                  <span className="text-slate-600" />
                  <span className="text-yellow-600">Wi-Fi 5</span>
                  <span className="text-green-600">Wi-Fi 6</span>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </SceneLayout>
  );
}
