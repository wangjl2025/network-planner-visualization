import { useMemo, useState, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { useAnimation } from '../../../hooks/useAnimation';
import { useParameters } from '../../../hooks/useParameters';

// Scene 类型定义（内联避免模块导入问题）
interface Scene {
  id: string;
  title: string;
  description: string;
  phase: 1 | 2 | 3 | 4;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: string;
  isHot?: boolean;
}

// VRRP路由器状态
type VRRPState = 'Master' | 'Backup' | 'Initialize';

// VRRP路由器类型
interface VRRPRouter {
  id: string;
  name: string;
  x: number;
  y: number;
  priority: number;
  state: VRRPState;
  realIP: string;
  isUplinkActive: boolean;
}

// 链路类型
interface Link {
  id: string;
  from: string;
  to: string;
  type: 'uplink' | 'downlink' | 'vrrp';
  isActive: boolean;
}

// 主机类型
interface Host {
  id: string;
  name: string;
  x: number;
  y: number;
  gateway: string;
}

const sceneData: Scene = {
  id: 'vrrp-ha',
  phase: 1,
  title: 'VRRP高可用：选举与切换机制',
  category: '网络高可用',
  description: '通过可视化演示VRRP虚拟路由冗余协议的工作原理，包括Master选举、抢占模式、上行链路故障联动切换等核心机制。',
  duration: '6-10分钟',
  difficulty: 'medium',
  isHot: true,
};

// 动画步骤
const animationSteps = [
  {
    id: 'init',
    title: '初始化',
    description: '两台路由器R1和R2启动，进入Initialize状态，准备参与VRRP选举',
    duration: 2000,
  },
  {
    id: 'election',
    title: 'Master选举',
    description: '比较优先级，优先级高者成为Master。若优先级相同，则比较IP地址',
    duration: 3000,
  },
  {
    id: 'advertisement',
    title: '通告机制',
    description: 'Master定期发送VRRP通告报文，Backup监听通告',
    duration: 2500,
  },
  {
    id: 'data-flow',
    title: '数据转发',
    description: 'PC的流量通过虚拟网关发送给Master路由器转发',
    duration: 2500,
  },
  {
    id: 'uplink-fail',
    title: '上行链路故障',
    description: 'Master的上行链路故障，触发联动跟踪，优先级降低',
    duration: 3000,
  },
  {
    id: 'failover',
    title: '主备切换',
    description: 'Backup检测到Master优先级降低，触发切换成为新的Master',
    duration: 3000,
  },
  {
    id: 'recovery',
    title: '故障恢复',
    description: '上行链路恢复，根据抢占模式决定是否切回原Master',
    duration: 2500,
  },
];

// 初始参数
const initialParameters = [
  {
    id: 'r1-priority',
    name: 'R1 优先级',
    type: 'range' as const,
    value: 120,
    min: 1,
    max: 254,
    step: 1,
    unit: '',
    description: 'R1的VRRP优先级（默认100，范围1-254）',
  },
  {
    id: 'r2-priority',
    name: 'R2 优先级',
    type: 'range' as const,
    value: 100,
    min: 1,
    max: 254,
    step: 1,
    unit: '',
    description: 'R2的VRRP优先级（默认100，范围1-254）',
  },
  {
    id: 'preempt-mode',
    name: '抢占模式',
    type: 'boolean' as const,
    value: true,
    description: '开启抢占模式：高优先级Backup可抢占成为Master',
  },
  {
    id: 'track-uplink',
    name: '联动跟踪上行链路',
    type: 'boolean' as const,
    value: true,
    description: '跟踪上行链路状态，故障时降低优先级',
  },
  {
    id: 'priority-decrement',
    name: '优先级降低值',
    type: 'range' as const,
    value: 30,
    min: 1,
    max: 100,
    step: 1,
    unit: '',
    description: '上行链路故障时降低的优先级数值',
  },
  {
    id: 'virtual-ip',
    name: '虚拟IP地址',
    type: 'select' as const,
    value: '192.168.1.254',
    options: [
      { label: '192.168.1.254', value: '192.168.1.254' },
      { label: '192.168.1.1', value: '192.168.1.1' },
      { label: '10.0.0.1', value: '10.0.0.1' },
    ],
    description: 'VRRP虚拟IP地址（网关地址）',
  },
  {
    id: 'animation-speed',
    name: '动画速度',
    type: 'select' as const,
    value: '1x',
    options: [
      { label: '0.5x 慢速', value: '0.5x' },
      { label: '1x 正常', value: '1x' },
      { label: '1.5x 快速', value: '1.5x' },
      { label: '2x 极速', value: '2x' },
    ],
    description: '调整动画播放速度',
  },
];

// 计算VRRP状态
function calculateVRRPState(
  r1Priority: number,
  r2Priority: number,
  r1UplinkActive: boolean,
  r2UplinkActive: boolean,
  priorityDecrement: number
): { r1State: VRRPState; r2State: VRRPState; effectiveR1Priority: number; effectiveR2Priority: number } {
  const effectiveR1Priority = r1UplinkActive ? r1Priority : Math.max(1, r1Priority - priorityDecrement);
  const effectiveR2Priority = r2UplinkActive ? r2Priority : Math.max(1, r2Priority - priorityDecrement);

  let r1State: VRRPState = 'Backup';
  let r2State: VRRPState = 'Backup';

  if (effectiveR1Priority > effectiveR2Priority) {
    r1State = 'Master';
    r2State = 'Backup';
  } else if (effectiveR2Priority > effectiveR1Priority) {
    r1State = 'Backup';
    r2State = 'Master';
  } else {
    // 优先级相同，比较IP地址（这里假设R1的IP更大）
    r1State = 'Master';
    r2State = 'Backup';
  }

  return { r1State, r2State, effectiveR1Priority, effectiveR2Priority };
}

export function VRRPHAScene() {
  // 本地状态
  const [r1UplinkActive, setR1UplinkActive] = useState(true);
  const [r2UplinkActive, setR2UplinkActive] = useState(true);
  const [packetAnimation, setPacketAnimation] = useState<{ from: string; to: string; type: 'advertisement' | 'data' } | null>(null);
  
  // 记录切换前的路由器状态（用于步骤5动画）
  const [preFailoverState, setPreFailoverState] = useState<{ r1State: VRRPState; r2State: VRRPState } | null>(null);

  // 动画控制
  const animation = useAnimation({
    steps: animationSteps,
    autoPlay: false,
    loop: false,
  });

  // 参数控制
  const parameters = useParameters({
    initialParameters,
    onChange: (id, value) => {
      console.log('Parameter changed:', id, value);
    },
  });

  // 获取参数值
  const r1Priority = parameters.getValue<number>('r1-priority') || 120;
  const r2Priority = parameters.getValue<number>('r2-priority') || 100;
  const preemptMode = parameters.getValue<boolean>('preempt-mode') ?? true;
  const trackUplink = parameters.getValue<boolean>('track-uplink') ?? true;
  const priorityDecrement = parameters.getValue<number>('priority-decrement') || 30;
  const virtualIP = parameters.getValue<string>('virtual-ip') || '192.168.1.254';

  // 计算当前状态
  const { r1State, r2State, effectiveR1Priority, effectiveR2Priority } = useMemo(() => {
    return calculateVRRPState(
      r1Priority,
      r2Priority,
      r1UplinkActive,
      r2UplinkActive,
      trackUplink ? priorityDecrement : 0
    );
  }, [r1Priority, r2Priority, r1UplinkActive, r2UplinkActive, priorityDecrement, trackUplink]);

  // 路由器数据
  const routers: VRRPRouter[] = useMemo(() => [
    { id: 'R1', name: 'R1', x: 150, y: 150, priority: r1Priority, state: r1State, realIP: '192.168.1.1', isUplinkActive: r1UplinkActive },
    { id: 'R2', name: 'R2', x: 450, y: 150, priority: r2Priority, state: r2State, realIP: '192.168.1.2', isUplinkActive: r2UplinkActive },
  ], [r1Priority, r2Priority, r1State, r2State, r1UplinkActive, r2UplinkActive]);

  // 主机数据
  const hosts: Host[] = useMemo(() => [
    { id: 'PC1', name: 'PC1', x: 300, y: 350, gateway: virtualIP },
  ], [virtualIP]);

  // 链路数据
  const links: Link[] = useMemo(() => [
    { id: 'l1', from: 'PC1', to: 'SW', type: 'downlink', isActive: true },
    { id: 'l2', from: 'SW', to: 'R1', type: 'downlink', isActive: true },
    { id: 'l3', from: 'SW', to: 'R2', type: 'downlink', isActive: true },
    { id: 'l4', from: 'R1', to: 'INTERNET', type: 'uplink', isActive: r1UplinkActive },
    { id: 'l5', from: 'R2', to: 'INTERNET', type: 'uplink', isActive: r2UplinkActive },
    { id: 'l6', from: 'R1', to: 'R2', type: 'vrrp', isActive: true },
  ], [r1UplinkActive, r2UplinkActive]);

  // 根据动画步骤生成描述
  const getStepDescription = useCallback((step: number): string => {
    const masterRouter = r1State === 'Master' ? 'R1' : 'R2';
    const backupRouter = r1State === 'Master' ? 'R2' : 'R1';
    const masterPriority = r1State === 'Master' ? effectiveR1Priority : effectiveR2Priority;
    const backupPriority = r1State === 'Master' ? effectiveR2Priority : effectiveR1Priority;

    switch (step) {
      case 0:
        return 'R1和R2启动，进入Initialize状态。R1优先级=' + r1Priority + '，R2优先级=' + r2Priority;
      case 1:
        return `Master选举：${masterRouter}优先级(${masterPriority}) > ${backupRouter}优先级(${backupPriority})，${masterRouter}成为Master`;
      case 2:
        return `${masterRouter}作为Master，每1秒发送VRRP通告报文（目的IP 224.0.0.18）`;
      case 3:
        return `PC1的网关设置为虚拟IP ${virtualIP}，流量由${masterRouter}转发`;
      case 4:
        if (trackUplink) {
          return `${masterRouter}的上行链路故障！联动跟踪触发，优先级降低${priorityDecrement}，变为${masterPriority - priorityDecrement}`;
        }
        return `${masterRouter}的上行链路故障！但联动跟踪未开启，优先级不变`;
      case 5:
        if (trackUplink) {
          return `${backupRouter}检测到${masterRouter}优先级降低，触发切换成为新的Master`;
        }
        return `联动跟踪未开启，${masterRouter}继续保持Master状态`;
      case 6:
        if (preemptMode) {
          return `上行链路恢复，抢占模式开启，${masterRouter}重新成为Master`;
        }
        return `上行链路恢复，但抢占模式关闭，${backupRouter}继续保持Master状态`;
      default:
        return '';
    }
  }, [r1Priority, r2Priority, r1State, r2State, effectiveR1Priority, effectiveR2Priority, virtualIP, trackUplink, priorityDecrement, preemptMode]);

  // 更新动画步骤描述
  const updatedAnimationSteps = useMemo(() => {
    return animationSteps.map((step, index) => ({
      ...step,
      description: getStepDescription(index),
    }));
  }, [getStepDescription]);

  // 切换上行链路状态（用于演示）
  const toggleUplink = useCallback((router: 'R1' | 'R2') => {
    if (router === 'R1') {
      setR1UplinkActive(prev => !prev);
    } else {
      setR2UplinkActive(prev => !prev);
    }
  }, []);

  // 根据动画步骤自动触发上行链路故障和恢复
  React.useEffect(() => {
    // 步骤4: 上行链路故障 - 断开当前Master的上行链路
    if (animation.currentStep === 4) {
      const masterRouter = r1State === 'Master' ? 'R1' : 'R2';
      // 记录切换前的状态（用于步骤5动画）- 只在进入步骤4时记录一次
      setPreFailoverState(prev => {
        if (prev) return prev; // 已经记录过，不再更新
        return { r1State, r2State };
      });
      if (masterRouter === 'R1' && r1UplinkActive) {
        setR1UplinkActive(false);
      } else if (masterRouter === 'R2' && r2UplinkActive) {
        setR2UplinkActive(false);
      }
    }
    
    // 步骤5: 主备切换发生时，确保状态已记录
    if (animation.currentStep === 5) {
      setPreFailoverState(prev => {
        if (prev) return prev; // 已经记录过，不再更新
        // 如果步骤5被直接跳转，记录当前状态作为切换前状态
        return { r1State: r2State === 'Master' ? 'Backup' : 'Master', r2State: r1State === 'Master' ? 'Backup' : 'Master' };
      });
    }
    
    // 步骤6: 故障恢复 - 恢复上行链路
    if (animation.currentStep === 6) {
      if (!r1UplinkActive) {
        setR1UplinkActive(true);
      }
      if (!r2UplinkActive) {
        setR2UplinkActive(true);
      }
    }
    
    // 重置时恢复所有链路
    if (animation.currentStep === 0 && !animation.isPlaying) {
      setR1UplinkActive(true);
      setR2UplinkActive(true);
      setPreFailoverState(null);
    }
  }, [animation.currentStep, animation.isPlaying, r1State, r2State, r1UplinkActive, r2UplinkActive]);

  return (
    <SceneLayout
      scene={sceneData}
      animationProps={{
        steps: updatedAnimationSteps,
        currentStep: animation.currentStep,
        isPlaying: animation.isPlaying,
        progress: animation.progress,
        onPlay: animation.play,
        onPause: animation.pause,
        onStepChange: animation.goToStep,
        onReset: animation.reset,
      }}
      parameterProps={{
        parameters: parameters.parameters,
        onChange: parameters.updateParameter,
        onReset: parameters.resetParameters,
      }}
    >
      <VRRPTopology
        routers={routers}
        hosts={hosts}
        links={links}
        virtualIP={virtualIP}
        currentStep={animation.currentStep}
        packetAnimation={packetAnimation}
        onToggleUplink={toggleUplink}
        preemptMode={preemptMode}
        preFailoverState={preFailoverState}
      />
    </SceneLayout>
  );
}

// VRRP拓扑组件
interface VRRPTopologyProps {
  routers: VRRPRouter[];
  hosts: Host[];
  links: Link[];
  virtualIP: string;
  currentStep: number;
  packetAnimation: { from: string; to: string; type: 'advertisement' | 'data' } | null;
  onToggleUplink: (router: 'R1' | 'R2') => void;
  preemptMode: boolean;
  preFailoverState: { r1State: VRRPState; r2State: VRRPState } | null;
}

function VRRPTopology({
  routers,
  hosts,
  links,
  virtualIP,
  currentStep,
  packetAnimation,
  onToggleUplink,
  preemptMode,
  preFailoverState,
}: VRRPTopologyProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationRef = React.useRef<number | undefined>(undefined);
  const currentStepRef = React.useRef(currentStep);
  
  // 使用ref跟踪currentStep，确保动画循环中获取最新值
  React.useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isActive = true;

    const draw = () => {
      if (!isActive) return;

    // 设置画布大小
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // 清空画布
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格背景
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 计算位置（相对于画布中心）
    const scaleX = width / 600;
    const scaleY = height / 400;
    const offsetX = 50;
    const offsetY = 30;

    const getPos = (x: number, y: number) => ({
      x: x * scaleX + offsetX,
      y: y * scaleY + offsetY,
    });

    // 交换机位置
    const switchPos = getPos(300, 250);

    // 互联网位置
    const internetPos = getPos(300, 50);

    // 绘制互联网云
    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath();
    ctx.ellipse(internetPos.x, internetPos.y, 60, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Internet', internetPos.x, internetPos.y);

    // 绘制交换机
    ctx.fillStyle = '#374151';
    ctx.fillRect(switchPos.x - 40, switchPos.y - 20, 80, 40);
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.strokeRect(switchPos.x - 40, switchPos.y - 20, 80, 40);
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Switch', switchPos.x, switchPos.y);

    // 绘制链路
    links.forEach((link) => {
      let fromPos, toPos;

      if (link.from === 'INTERNET') {
        fromPos = internetPos;
      } else if (link.from === 'SW') {
        fromPos = switchPos;
      } else {
        const router = routers.find(r => r.id === link.from);
        if (router) {
          fromPos = getPos(router.x, router.y);
        }
      }

      if (link.to === 'INTERNET') {
        toPos = internetPos;
      } else if (link.to === 'SW') {
        toPos = switchPos;
      } else {
        const router = routers.find(r => r.id === link.to);
        if (router) {
          toPos = getPos(router.x, router.y);
        }
      }

      if (!fromPos || !toPos) return;

      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);
      ctx.lineTo(toPos.x, toPos.y);

      if (link.type === 'uplink') {
        ctx.strokeStyle = link.isActive ? '#22c55e' : '#ef4444';
        ctx.lineWidth = link.isActive ? 3 : 2;
        ctx.setLineDash(link.isActive ? [] : [5, 5]);
      } else if (link.type === 'vrrp') {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
      } else {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 绘制路由器
    routers.forEach((router) => {
      const pos = getPos(router.x, router.y);
      const isMaster = router.state === 'Master';

      // 路由器外框（Master有发光效果）
      if (isMaster) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 38, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.fill();
      }

      // 路由器主体
      ctx.fillStyle = isMaster ? '#166534' : '#1e3a5f';
      ctx.beginPath();
      ctx.roundRect(pos.x - 35, pos.y - 25, 70, 50, 8);
      ctx.fill();

      // 路由器边框
      ctx.strokeStyle = isMaster ? '#22c55e' : '#3b82f6';
      ctx.lineWidth = isMaster ? 3 : 2;
      ctx.stroke();

      // 路由器名称
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(router.name, pos.x, pos.y - 5);

      // 状态标签
      ctx.fillStyle = isMaster ? '#86efac' : '#93c5fd';
      ctx.font = '11px sans-serif';
      ctx.fillText(router.state, pos.x, pos.y + 10);

      // 优先级显示
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText(`Pri: ${router.priority}`, pos.x, pos.y + 22);

      // 上行链路状态指示器
      const uplinkStatusColor = router.isUplinkActive ? '#22c55e' : '#ef4444';
      ctx.fillStyle = uplinkStatusColor;
      ctx.beginPath();
      ctx.arc(pos.x + 25, pos.y - 15, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 绘制主机
    hosts.forEach((host) => {
      const pos = getPos(host.x, host.y);

      // 主机主体
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.roundRect(pos.x - 30, pos.y - 20, 60, 40, 6);
      ctx.fill();
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 主机名称
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(host.name, pos.x, pos.y - 2);

      // 网关信息
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.fillText(`GW: ${host.gateway}`, pos.x, pos.y + 12);
    });

    // 根据动画步骤绘制特效
    const masterRouter = routers.find(r => r.state === 'Master');
    const backupRouter = routers.find(r => r.state === 'Backup');
    
    // 获取当前步骤（从ref中读取最新值）
    const step = currentStepRef.current;
    
    // 绘制虚拟路由器标识（步骤5和6有各自的VIP动画，这里不绘制）
    if (masterRouter && step !== 5 && step !== 6) {
      const masterPos = getPos(masterRouter.x, masterRouter.y);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(masterPos.x, masterPos.y - 45);
      ctx.lineTo(masterPos.x - 8, masterPos.y - 60);
      ctx.lineTo(masterPos.x + 8, masterPos.y - 60);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('VIP', masterPos.x, masterPos.y - 65);
    }
    
    // 步骤0: 初始化 - 闪烁效果
    if (step === 0) {
      const time = Date.now() / 500;
      const alpha = (Math.sin(time) + 1) / 2 * 0.5 + 0.2;
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ 初始化中...', width / 2, height - 40);
    }
    
    // 步骤1: Master选举 - 高亮优先级
    if (step === 1 && masterRouter) {
      const masterPos = getPos(masterRouter.x, masterRouter.y);
      // 选举光环动画
      const time = Date.now() / 300;
      const radius = 45 + Math.sin(time) * 5;
      ctx.beginPath();
      ctx.arc(masterPos.x, masterPos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // 显示选举结果
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ Master当选', masterPos.x, masterPos.y - 50);
    }
    
    // 步骤2: 通告机制 - VRRP报文流动
    if (step === 2 && masterRouter && backupRouter) {
      const masterPos = getPos(masterRouter.x, masterRouter.y);
      const backupPos = getPos(backupRouter.x, backupRouter.y);
      
      // 计算报文位置（从Master到Backup的流动）
      const time = (Date.now() % 2000) / 2000; // 2秒一个周期
      const packetX = masterPos.x + (backupPos.x - masterPos.x) * time;
      const packetY = masterPos.y + (backupPos.y - masterPos.y) * time;
      
      // 绘制VRRP报文
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(packetX, packetY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 报文标签
      ctx.fillStyle = '#a78bfa';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VRRP Adv', packetX, packetY - 12);
      
      // 心跳线闪烁
      ctx.beginPath();
      ctx.moveTo(masterPos.x, masterPos.y);
      ctx.lineTo(backupPos.x, backupPos.y);
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.5 + Math.sin(Date.now() / 200) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // 步骤3: 数据转发 - 流量动画
    if (step === 3 && masterRouter) {
      const masterPos = getPos(masterRouter.x, masterRouter.y);
      const switchP = getPos(300, 250);
      const host = hosts[0];
      const hostPos = host ? getPos(host.x, host.y) : null;
      
      // PC到交换机的流量
      if (hostPos) {
        const time = (Date.now() % 1500) / 1500;
        const packetX = hostPos.x + (switchP.x - hostPos.x) * time;
        const packetY = hostPos.y + (switchP.y - hostPos.y) * time;
        
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(packetX, packetY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 交换机到Master的流量
      const time2 = ((Date.now() + 750) % 1500) / 1500;
      const packetX2 = switchP.x + (masterPos.x - switchP.x) * time2;
      const packetY2 = switchP.y + (masterPos.y - switchP.y) * time2;
      
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(packetX2, packetY2, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Master到Internet的流量
      const time3 = ((Date.now() + 375) % 1500) / 1500;
      const packetX3 = masterPos.x + (internetPos.x - masterPos.x) * time3;
      const packetY3 = masterPos.y + (internetPos.y - masterPos.y) * time3;
      
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(packetX3, packetY3, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // 显示转发标签
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↔ 数据转发中', width / 2, height - 40);
    }
    
    // 步骤4: 上行链路故障 - 故障指示
    if (step === 4) {
      const failedRouter = routers.find(r => !r.isUplinkActive);
      if (failedRouter) {
        const pos = getPos(failedRouter.x, failedRouter.y);
        
        // 故障闪烁效果 - 红色警报圈
        const time = Date.now() / 150;
        const pulseRadius = 45 + Math.sin(time) * 5;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 + Math.sin(time * 2) * 0.2})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内部红色填充闪烁
        ctx.fillStyle = `rgba(239, 68, 68, ${0.2 + Math.sin(time * 3) * 0.1})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // 故障标签 - 带背景
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(pos.x - 70, pos.y - 75, 140, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ 上行链路故障!', pos.x, pos.y - 60);
        
        // 优先级降低提示 - 动画数字
        const priorityDecrement = 30;
        const newPriority = Math.max(1, failedRouter.priority - priorityDecrement);
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`优先级: ${failedRouter.priority} → ${newPriority}`, pos.x, pos.y + 55);
        
        // 绘制断开的链路效果
        const internetP = getPos(300, 50);
        const breakX = (pos.x + internetP.x) / 2;
        const breakY = (pos.y + internetP.y) / 2;
        
        // 断点标记
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(breakX - 10, breakY - 10);
        ctx.lineTo(breakX + 10, breakY + 10);
        ctx.moveTo(breakX + 10, breakY - 10);
        ctx.lineTo(breakX - 10, breakY + 10);
        ctx.stroke();
        
        // 断点闪烁
        ctx.fillStyle = `rgba(239, 68, 68, ${0.5 + Math.sin(time * 4) * 0.5})`;
        ctx.beginPath();
        ctx.arc(breakX, breakY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // 步骤5: 主备切换 - 切换动画
    if (step === 5) {
      // 确定切换前后的Master位置
      // 使用preFailoverState来确定原Master，当前routers确定新Master
      const oldMasterId = preFailoverState 
        ? (preFailoverState.r1State === 'Master' ? 'R1' : 'R2')
        : 'R1'; // 默认R1是原Master（因为R1优先级默认更高）
      const newMasterId = preFailoverState
        ? (preFailoverState.r1State === 'Master' ? 'R2' : 'R1') // 原Master的对方就是新Master
        : (routers.find(r => r.id === 'R1')?.state === 'Master' ? 'R1' : 'R2'); // 如果没有preFailoverState，使用当前状态
      
      const oldMasterRouter = routers.find(r => r.id === oldMasterId);
      const newMasterRouter = routers.find(r => r.id === newMasterId);
      
      if (oldMasterRouter && newMasterRouter && oldMasterRouter.id !== newMasterRouter.id) {
        const oldMasterPos = getPos(oldMasterRouter.x, oldMasterRouter.y);
        const newMasterPos = getPos(newMasterRouter.x, newMasterRouter.y);
        
        // VIP漂移效果 - 从旧Master漂移到新Master（只播放一次，然后停留在新Master）
        const elapsed = Date.now() % 2500; // 2.5秒完成漂移
        const duration = 2000; // 2秒漂移时间
        const time = Math.min(elapsed / duration, 1); // 0-1，超过1后保持为1
        const isComplete = elapsed >= duration;
        
        // VIP位置：漂移过程中从旧Master移动到新Master，完成后固定在新Master
        const vipX = oldMasterPos.x + (newMasterPos.x - oldMasterPos.x) * time;
        const vipY = oldMasterPos.y + (newMasterPos.y - oldMasterPos.y) * time - 60;
        
        if (!isComplete) {
          // 漂移过程中：绘制轨迹线
          ctx.strokeStyle = `rgba(251, 191, 36, ${0.3 + time * 0.4})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(oldMasterPos.x, oldMasterPos.y - 60);
          ctx.lineTo(vipX, vipY);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // VIP标签
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('VIP漂移中', vipX, vipY - 20);
        } else {
          // 漂移完成后：固定显示在新Master上
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('VIP', newMasterPos.x, newMasterPos.y - 75);
        }
        
        // 绘制VIP标记
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(vipX, vipY);
        ctx.lineTo(vipX - 10, vipY - 15);
        ctx.lineTo(vipX + 10, vipY - 15);
        ctx.closePath();
        ctx.fill();
        
        // 原Master状态变化提示
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Master → Backup', oldMasterPos.x, oldMasterPos.y + 55);
        
        // 新Master状态变化提示
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Backup → Master', newMasterPos.x, newMasterPos.y + 55);
        
        // 切换完成提示
        if (isComplete) {
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✓ 主备切换完成', width / 2, height - 40);
        }
      }
    }
    
    // 步骤6: 故障恢复 - VIP可能漂移回原Master
    if (step === 6 && masterRouter) {
      // 确定原Master（初始配置中优先级高的）
      const r1Priority = routers.find(r => r.id === 'R1')?.priority || 120;
      const r2Priority = routers.find(r => r.id === 'R2')?.priority || 100;
      const originalMasterRouter = r1Priority > r2Priority ? routers.find(r => r.id === 'R1') : routers.find(r => r.id === 'R2');
      const currentMasterRouter = masterRouter;
      
      if (originalMasterRouter && currentMasterRouter) {
        const originalMasterPos = getPos(originalMasterRouter.x, originalMasterRouter.y);
        const currentMasterPos = getPos(currentMasterRouter.x, currentMasterRouter.y);
        
        if (preemptMode) {
          // 抢占模式：VIP从当前Master漂移回原Master
          const time = (Date.now() % 2500) / 2500;
          
          // 如果原Master已经是当前Master，说明已经恢复完成
          if (originalMasterRouter.id !== currentMasterRouter.id) {
            const vipX = currentMasterPos.x + (originalMasterPos.x - currentMasterPos.x) * time;
            const vipY = currentMasterPos.y + (originalMasterPos.y - currentMasterPos.y) * time - 60;
            
            // 绘制VIP移动轨迹线
            ctx.strokeStyle = `rgba(34, 197, 94, ${0.3 + time * 0.4})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(currentMasterPos.x, currentMasterPos.y - 60);
            ctx.lineTo(vipX, vipY);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // 绘制VIP标记
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.moveTo(vipX, vipY);
            ctx.lineTo(vipX - 10, vipY - 15);
            ctx.lineTo(vipX + 10, vipY - 15);
            ctx.closePath();
            ctx.fill();
            
            // VIP标签
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('VIP抢占中', vipX, vipY - 20);
            
            // 状态变化提示
            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Master → Backup', currentMasterPos.x, currentMasterPos.y + 55);
            
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Backup → Master', originalMasterPos.x, originalMasterPos.y + 55);
            
            // 恢复完成提示
            if (time > 0.8) {
              ctx.fillStyle = '#22c55e';
              ctx.font = 'bold 16px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('✓ 抢占完成：恢复原Master', width / 2, height - 40);
            }
          } else {
            // 已经恢复完成
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✓ 抢占完成：已恢复原Master', width / 2, height - 40);
          }
          
          // 显示上行链路恢复指示
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('↺ 上行链路已恢复', width / 2, 60);
        } else {
          // 非抢占模式：保持当前Master，VIP不漂移
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⏸ 非抢占模式：保持当前Master', width / 2, height - 40);
          
          // 显示上行链路恢复指示
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('↺ 上行链路已恢复', width / 2, 60);
          
          // 显示VIP保持不动
          const vipX = currentMasterPos.x;
          const vipY = currentMasterPos.y - 60;
          
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(vipX, vipY);
          ctx.lineTo(vipX - 10, vipY - 15);
          ctx.lineTo(vipX + 10, vipY - 15);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('VIP保持', vipX, vipY - 20);
          
          // 提示为什么保持
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('(抢占模式关闭)', width / 2, height - 20);
        }
      }
    }

    // 绘制标题
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('VRRP 高可用架构演示', 20, 30);

    // 绘制图例
    const legendY = height - 100;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(20, legendY, 20, 3);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('Master路由器', 45, legendY + 4);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(20, legendY + 18, 20, 3);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Backup路由器', 45, legendY + 22);

    ctx.fillStyle = '#8b5cf6';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(20, legendY + 36);
    ctx.lineTo(40, legendY + 36);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('VRRP心跳', 45, legendY + 40);

    ctx.fillStyle = '#ef4444';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, legendY + 54);
    ctx.lineTo(40, legendY + 54);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('故障链路', 45, legendY + 58);

      // 继续动画循环 - 使用ref获取最新currentStep
      if (currentStepRef.current >= 0 && currentStepRef.current <= 6) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    // 开始绘制
    draw();

    // 清理函数
    return () => {
      isActive = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [routers, hosts, links, virtualIP, currentStep, packetAnimation, preemptMode, preFailoverState]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}

// 导入React
import * as React from 'react';
