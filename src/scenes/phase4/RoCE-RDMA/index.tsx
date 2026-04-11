import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import {
  Zap,
  Server,
  ArrowRight,
  Activity,
  Clock,
  Cpu,
  MemoryStick,
  Network,
  BarChart2,
} from 'lucide-react';

// 传输路径定义
interface TransferPath {
  id: string;
  name: string;
  steps: PathStep[];
  latency: number; // 微秒
  cpuCopy: number; // 次数
  color: string;
}

interface PathStep {
  id: string;
  label: string;
  type: 'cpu' | 'mem' | 'kernel' | 'nic' | 'network' | 'rdma';
  desc: string;
}

const TCP_PATH: TransferPath = {
  id: 'tcp',
  name: 'TCP/IP（传统）',
  color: '#f59e0b',
  latency: 50,
  cpuCopy: 4,
  steps: [
    { id: 'app-copy1', label: '应用→内核缓冲区', type: 'cpu', desc: '发送端：用户态→内核态，第1次内存拷贝，CPU参与' },
    { id: 'proto-proc', label: 'TCP/IP协议栈处理', type: 'kernel', desc: '封装TCP/IP头部，内核态处理，多次CPU中断' },
    { id: 'nic-copy', label: '内核缓冲区→NIC', type: 'nic', desc: '第2次拷贝，sk_buff→网卡DMA缓冲区' },
    { id: 'network-tx', label: '以太网传输', type: 'network', desc: '物理层传输，延迟取决于网络跳数和带宽' },
    { id: 'nic-recv', label: 'NIC→内核缓冲区', type: 'nic', desc: '接收端：DMA→sk_buff，第3次内存拷贝' },
    { id: 'proto-proc2', label: 'TCP/IP协议栈解包', type: 'kernel', desc: '内核解封装，校验和验证，CPU中断处理' },
    { id: 'app-copy2', label: '内核缓冲区→应用', type: 'cpu', desc: '内核态→用户态，第4次内存拷贝，CPU参与' },
  ],
};

const RDMA_PATH: TransferPath = {
  id: 'rdma',
  name: 'RDMA/RoCE（高性能）',
  color: '#22c55e',
  latency: 2,
  cpuCopy: 0,
  steps: [
    { id: 'post-wr', label: '发布工作请求(WR)', type: 'cpu', desc: '发送端：应用注册内存区域(MR)，创建队列对(QP)，发布发送WR' },
    { id: 'rdma-send', label: '本地RNIC DMA读取', type: 'rdma', desc: '发送端RNIC绕过CPU和内核，直接从应用内存DMA读取数据，零拷贝' },
    { id: 'network-tx', label: 'RoCE v2网络传输', type: 'network', desc: 'UDP/IP封装(目的端口4791)，以太网传输到远端' },
    { id: 'rdma-write', label: '远端RNIC DMA写入', type: 'rdma', desc: '接收端RNIC直接将数据写入远端应用内存，全程无CPU干预' },
    { id: 'cq-notify', label: '完成队列(CQ)通知', type: 'cpu', desc: '两端RNIC更新CQ，应用轮询或等待通知，CPU开销极小' },
  ],
};

const ANIMATION_STEPS = [
  { id: 'overview', label: 'RDMA技术概述', desc: 'RDMA（远程直接内存访问）允许直接访问远端服务器内存，无需经过CPU和操作系统内核，实现微秒级延迟和极低CPU占用。' },
  { id: 'tcp-path', label: 'TCP/IP传统路径', desc: '传统TCP/IP需要4次内存拷贝和多次上下文切换，延迟50-100微秒，CPU开销大，成为高性能计算的瓶颈。' },
  { id: 'rdma-path', label: 'RDMA零拷贝路径', desc: 'RDMA绕过内核协议栈，直接从应用内存到远端内存，零拷贝、零CPU干预，延迟降至1-5微秒。' },
  { id: 'roce-v2', label: 'RoCE v2：以太网上的RDMA', desc: 'RoCE v2（RDMA over Converged Ethernet）将RDMA封装在UDP/IP上，运行在标准以太网，但需要无损以太网支持（PFC+ECN）。' },
  { id: 'lossless', label: '无损以太网配置', desc: '无损网络是RoCE的基础。需配置PFC（基于优先级的流量控制）防止丢包，ECN（显式拥塞通知）提前感知拥塞。' },
  { id: 'verbs', label: 'RDMA Verbs编程模型', desc: '应用通过Verbs API与RDMA硬件交互：注册内存（MR）→ 创建队列对（QP）→ 发布工作请求（WR）→ 轮询完成队列（CQ）。' },
  { id: 'comparison', label: '性能对比', desc: 'RDMA vs TCP/IP：延迟从50μs→2μs（25倍↓），带宽利用率从70%→95%，CPU使用率从30%→5%，适用于AI训练、高频交易、分布式存储。' },
];

// 延迟对比图
const LatencyBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-slate-300">{label}</span>
      <span className="font-bold" style={{ color }}>{value}μs</span>
    </div>
    <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${(value / max) * 100}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  </div>
);

// 传输路径动画
const PathAnimation = ({ path, isActive }: { path: TransferPath; isActive: boolean }) => {
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!isActive) { setActiveStep(-1); return; }
    let i = 0;
    const timer = setInterval(() => {
      setActiveStep(i);
      i++;
      if (i >= path.steps.length) {
        setTimeout(() => setActiveStep(-1), 800);
        clearInterval(timer);
      }
    }, 600);
    return () => clearInterval(timer);
  }, [isActive, path]);

  const getStepColor = (type: string) => {
    switch (type) {
      case 'cpu': return '#ef4444';
      case 'mem': return '#8b5cf6';
      case 'kernel': return '#f59e0b';
      case 'nic': return '#3b82f6';
      case 'network': return '#06b6d4';
      case 'rdma': return '#22c55e';
      default: return '#6b7280';
    }
  };

  return (
    <div className="p-3 rounded-lg border" style={{ borderColor: path.color + '60', backgroundColor: path.color + '08' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ color: path.color }}>{path.name}</h3>
        <div className="flex gap-3 text-xs">
          <span className="text-slate-400">延迟: <span className="font-bold" style={{ color: path.color }}>{path.latency}μs</span></span>
          <span className="text-slate-400">拷贝: <span className="font-bold" style={{ color: path.color }}>{path.cpuCopy}次</span></span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {path.steps.map((step, i) => {
          const stepColor = getStepColor(step.type);
          const isStepActive = activeStep === i;
          return (
            <div key={step.id} className="flex items-center gap-1">
              <motion.div
                className="px-2 py-1 rounded text-xs font-medium text-white transition-all"
                style={{
                  backgroundColor: stepColor + (isStepActive ? 'ff' : '40'),
                  border: `1px solid ${stepColor}${isStepActive ? 'ff' : '60'}`,
                  boxShadow: isStepActive ? `0 0 10px ${stepColor}80` : 'none',
                }}
                animate={isStepActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              >
                {step.label}
              </motion.div>
              {i < path.steps.length - 1 && (
                <motion.div
                  animate={activeStep > i ? { opacity: 1 } : { opacity: 0.3 }}
                >
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
      {activeStep >= 0 && activeStep < path.steps.length && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 p-2 bg-slate-900/50 rounded text-xs text-slate-400"
        >
          📍 {path.steps[activeStep]?.desc}
        </motion.div>
      )}
    </div>
  );
};

export function RoCERDMAScene() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeDemo, setActiveDemo] = useState<'tcp' | 'rdma' | 'both' | null>(null);

  const parameters = [
    {
      id: 'protocol',
      label: 'RDMA协议',
      type: 'select' as const,
      value: 'rocev2',
      options: [
        { value: 'rocev2', label: 'RoCE v2（推荐）' },
        { value: 'rocev1', label: 'RoCE v1' },
        { value: 'infiniband', label: 'InfiniBand' },
        { value: 'iwarp', label: 'iWARP' },
      ],
    },
    {
      id: 'bandwidth',
      label: '网络带宽',
      type: 'select' as const,
      value: '100g',
      options: [
        { value: '25g', label: '25GbE' },
        { value: '100g', label: '100GbE' },
        { value: '200g', label: '200GbE' },
        { value: '400g', label: '400GbE' },
      ],
    },
  ];

  const currentStepId = ANIMATION_STEPS[currentStep]?.id;

  useEffect(() => {
    if (currentStepId === 'tcp-path') setActiveDemo('tcp');
    else if (currentStepId === 'rdma-path') setActiveDemo('rdma');
    else if (currentStepId === 'comparison') setActiveDemo(null);
  }, [currentStepId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < ANIMATION_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setActiveDemo(null);
  }, []);

  // Scene 数据
  const sceneData = {
    id: 'roce-rdma',
    title: 'RoCE与RDMA高性能网络',
    description: 'RDMA零拷贝原理、RoCE v2封装、无损以太网配置、与传统TCP/IP对比',
    phase: 4 as const,
    category: '前沿技术',
    duration: '8-10分钟',
    difficulty: 'hard' as const,
    isHot: false,
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
            title="网络配置"
            parameters={parameters}
            onChange={() => {}}
            onReset={() => {}}
          />

          {/* 演示控制 */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">传输路径演示</h3>
            <div className="space-y-2">
              {[
                { id: 'tcp', label: 'TCP/IP传输', color: '#f59e0b', desc: '看看多少次拷贝' },
                { id: 'rdma', label: 'RDMA传输', color: '#22c55e', desc: '零拷贝高性能' },
                { id: 'both', label: '同时对比', color: '#8b5cf6', desc: '并排对比两种路径' },
              ].map(demo => (
                <button
                  key={demo.id}
                  onClick={() => setActiveDemo(activeDemo === demo.id ? null : demo.id as 'tcp' | 'rdma' | 'both')}
                  className="w-full flex items-start gap-2 p-2 rounded text-sm transition-all text-left"
                  style={{
                    backgroundColor: activeDemo === demo.id ? demo.color + '30' : '#1e293b',
                    border: `1px solid ${activeDemo === demo.id ? demo.color : '#475569'}`,
                    color: activeDemo === demo.id ? demo.color : '#94a3b8',
                  }}
                >
                  <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{demo.label}</div>
                    <div className="text-xs opacity-70">{demo.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 无损网络要求 */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">无损以太网要求</h3>
            <div className="space-y-2 text-xs">
              {[
                { name: 'PFC', full: '基于优先级的流控', desc: '按优先级暂停流量，防止丢包', color: '#3b82f6' },
                { name: 'ECN', full: '显式拥塞通知', desc: '提前感知拥塞，主动降速', color: '#22c55e' },
                { name: 'DCQCN', full: '数据中心拥塞控制', desc: '结合PFC+ECN的RDMA拥塞控制算法', color: '#8b5cf6' },
              ].map(item => (
                <div key={item.name} className="p-2 rounded" style={{ backgroundColor: item.color + '15', border: `1px solid ${item.color}30` }}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="font-bold" style={{ color: item.color }}>{item.name}</span>
                    <span className="text-slate-500">({item.full})</span>
                  </div>
                  <div className="text-slate-400">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 主可视化区域 */}
        <div className="col-span-6">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-5 min-h-[460px] space-y-5">
            <AnimatePresence mode="wait">
              {currentStepId === 'comparison' ? (
                /* 性能对比视图 */
                <motion.div
                  key="comparison"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-center font-bold text-slate-200">RDMA vs TCP/IP 性能对比</h3>
                  
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 mb-2">延迟对比（微秒）</div>
                    <LatencyBar label="TCP/IP Socket" value={50} max={55} color="#f59e0b" />
                    <LatencyBar label="TCP + Zero-Copy" value={20} max={55} color="#f97316" />
                    <LatencyBar label="RoCE v1" value={3} max={55} color="#86efac" />
                    <LatencyBar label="RoCE v2" value={2} max={55} color="#22c55e" />
                    <LatencyBar label="InfiniBand" value={1} max={55} color="#3b82f6" />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[
                      { label: '延迟降低', tcp: '50μs', rdma: '2μs', improvement: '25x↓', color: '#22c55e' },
                      { label: 'CPU使用率', tcp: '30%', rdma: '5%', improvement: '6x↓', color: '#3b82f6' },
                      { label: '内存拷贝', tcp: '4次', rdma: '0次', improvement: '零拷贝', color: '#8b5cf6' },
                    ].map(item => (
                      <div key={item.label} className="p-3 bg-slate-800 rounded-lg text-center">
                        <div className="text-xs text-slate-500 mb-2">{item.label}</div>
                        <div className="text-sm text-yellow-400 line-through mb-1">{item.tcp}</div>
                        <div className="text-lg font-bold" style={{ color: item.color }}>{item.rdma}</div>
                        <div className="text-xs font-semibold mt-1" style={{ color: item.color }}>{item.improvement}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-xs">
                    <div className="font-semibold text-blue-400 mb-1">主要应用场景</div>
                    <div className="flex flex-wrap gap-2 text-slate-300">
                      {['AI/ML大模型训练（GPU集群互联）', '高频交易（微秒级交易）', '分布式存储（Ceph、NFS-RDMA）', '高性能计算（MPI over RDMA）', '数据库集群（共享内存）'].map(use => (
                        <span key={use} className="px-2 py-0.5 bg-slate-800 rounded">{use}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* 传输路径图 */
                <motion.div
                  key="paths"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* 内存架构图 */}
                  <div className="grid grid-cols-2 gap-4">
                    {['发送端', '接收端'].map(side => (
                      <div key={side} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          {side}
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: '应用内存', color: '#22c55e', icon: <MemoryStick className="w-3 h-3" /> },
                            { label: '内核空间', color: '#f59e0b', icon: <Cpu className="w-3 h-3" /> },
                            { label: 'RDMA网卡(RNIC)', color: '#3b82f6', icon: <Network className="w-3 h-3" /> },
                          ].map(layer => (
                            <div
                              key={layer.label}
                              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                              style={{ backgroundColor: layer.color + '20', border: `1px solid ${layer.color}40` }}
                            >
                              <span style={{ color: layer.color }}>{layer.icon}</span>
                              <span className="text-slate-300">{layer.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 传输路径动画 - 支持同时对比 */}
                  <PathAnimation path={TCP_PATH} isActive={activeDemo === 'tcp' || activeDemo === 'both'} />
                  <PathAnimation path={RDMA_PATH} isActive={activeDemo === 'rdma' || activeDemo === 'both'} />

                  {/* RoCE v2帧结构 */}
                  {currentStepId === 'roce-v2' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-slate-800 rounded-lg"
                    >
                      <div className="text-xs font-semibold text-slate-400 mb-2">RoCE v2 帧封装格式</div>
                      <div className="flex gap-0.5 text-xs font-mono">
                        {[
                          { label: '以太网头\n(14B)', color: '#3b82f6' },
                          { label: 'IP头\n(20B)', color: '#8b5cf6' },
                          { label: 'UDP\n(8B)', color: '#22c55e' },
                          { label: 'BTH\n(12B)', color: '#f59e0b' },
                          { label: 'RDMA\nPayload', color: '#ef4444' },
                          { label: 'ICRC\n(4B)', color: '#06b6d4' },
                          { label: 'FCS\n(4B)', color: '#64748b' },
                        ].map(item => (
                          <div
                            key={item.label}
                            className="flex-1 text-center py-2 text-white rounded text-xs leading-tight"
                            style={{ backgroundColor: item.color + 'cc' }}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 flex justify-between">
                        <span>目的端口4791用于识别RoCE v2</span>
                        <span>ICRC= infiniband CRC校验</span>
                        <span>FCS= Frame Check Sequence</span>
                      </div>
                    </motion.div>
                  )}
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
            title="RDMA技术对比"
            content={
              <div className="space-y-2 text-xs">
                {[
                  { name: 'InfiniBand', pros: '最低延迟（<1μs）、最高带宽（400Gbps）', cons: '专用网络，成本高，生态封闭', color: '#3b82f6' },
                  { name: 'RoCE v2', pros: '以太网兼容，成本低，数据中心主流', cons: '需要无损网络（PFC+ECN）', color: '#22c55e' },
                  { name: 'iWARP', pros: '基于TCP，穿越路由器，部署简单', cons: '延迟最高，CPU开销较大', color: '#8b5cf6' },
                ].map(item => (
                  <div key={item.name} className="p-2 rounded" style={{ backgroundColor: item.color + '10', border: `1px solid ${item.color}30` }}>
                    <div className="font-bold mb-1" style={{ color: item.color }}>{item.name}</div>
                    <div className="text-green-400 text-xs mb-0.5">✓ {item.pros}</div>
                    <div className="text-red-400 text-xs">✗ {item.cons}</div>
                  </div>
                ))}
              </div>
            }
          />

          <InfoPanel
            title="RDMA Verbs编程"
            content={
              <div className="space-y-1 text-xs font-mono">
                {[
                  { step: '1. ibv_reg_mr()', desc: '注册内存区域（MR）', color: '#3b82f6' },
                  { step: '2. ibv_create_qp()', desc: '创建队列对（QP）', color: '#8b5cf6' },
                  { step: '3. ibv_post_send()', desc: '发布发送工作请求（WR）', color: '#22c55e' },
                  { step: '4. ibv_poll_cq()', desc: '轮询完成队列（CQ）', color: '#f59e0b' },
                ].map(item => (
                  <div key={item.step} className="p-1.5 rounded bg-slate-800">
                    <span style={{ color: item.color }}>{item.step}</span>
                    <div className="text-slate-500 text-xs mt-0.5">{item.desc}</div>
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
