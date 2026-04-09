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

export const scenes: Scene[] = [
  // Phase 1: 核心基础
  {
    id: 'ospf-spf',
    title: 'OSPF SPF算法：最短路径计算',
    description: '通过Dijkstra算法计算最短路径，理解LSDB如何构建最短路径树(SPT)。可以调节链路Cost观察路径变化。',
    phase: 1,
    category: 'OSPF路由协议',
    difficulty: 'medium',
    duration: '5-8分钟',
    isHot: true,
  },
  {
    id: 'ospf-lsa',
    title: 'OSPF LSA类型详解',
    description: '深入理解OSPF六种LSA类型（Type1-7）的生成者、泛洪范围和作用，包含多区域拓扑可视化和LSA报文格式解析',
    phase: 1,
    category: 'OSPF路由协议',
    difficulty: 'medium',
    duration: '8-10分钟',
    isHot: true,
  },
  {
    id: 'ospf-neighbor',
    title: 'OSPF邻居状态机',
    description: 'OSPF邻居建立的7个状态详解（Down→Init→2-Way→ExStart→Exchange→Loading→Full），包含状态转换动画和报文交互演示',
    phase: 1,
    category: 'OSPF路由协议',
    difficulty: 'easy',
    duration: '6-8分钟',
  },
  {
    id: 'bgp-decision',
    title: 'BGP选路原则决策树',
    description: '13条选路原则的优先级决策流程可视化，逐步比较路径属性',
    phase: 1,
    category: 'BGP',
    difficulty: 'hard',
    duration: '10-12分钟',
    isHot: true,
  },
  {
    id: 'bgp-rr',
    title: 'BGP路由反射器',
    description: 'IBGP水平分割问题与路由反射器解决方案，展示RR的工作原理和Cluster-ID防环机制',
    phase: 1,
    category: 'BGP路由协议',
    difficulty: 'medium',
    duration: '5-7分钟',
  },
  {
    id: 'mpls-l3vpn',
    title: 'MPLS L3VPN',
    description: 'MPLS三层VPN原理与数据转发流程，展示RD/RT、VPNv4路由、标签栈封装',
    phase: 1,
    category: 'MPLS技术',
    difficulty: 'hard',
    duration: '8-10分钟',
  },
  {
    id: 'srv6-overview',
    title: 'SRv6概览',
    description: 'Segment Routing over IPv6原理与优势，展示Segment List、SRH扩展头、源路由编程',
    phase: 1,
    category: 'SRv6技术',
    difficulty: 'hard',
    duration: '8-10分钟',
  },
  {
    id: 'vxlan-detail',
    title: 'VXLAN详解',
    description: 'VXLAN报文封装与解封装过程，展示VNI隔离、VTEP隧道、Underlay/Overlay架构',
    phase: 1,
    category: '网络虚拟化',
    difficulty: 'medium',
    duration: '6-8分钟',
  },
  {
    id: 'lacp',
    title: '链路聚合LACP',
    description: 'LACP动态协商、负载均衡算法、链路故障切换可视化',
    phase: 1,
    category: '交换技术',
    difficulty: 'medium',
    duration: '8-10分钟',
  },
  {
    id: 'vxlan',
    title: 'VXLAN技术',
    description: 'VXLAN报文封装、VTEP隧道、VNI隔离、Overlay网络可视化',
    phase: 1,
    category: '数据中心网络',
    difficulty: 'hard',
    duration: '8-10分钟',
  },
  {
    id: 'bgp-fsm',
    title: 'BGP有限状态机',
    description: 'BGP邻居建立的6个状态详解（Idle→Connect→Active→OpenSent→OpenConfirm→Established），包含TCP连接过程和故障转移路径',
    phase: 1,
    category: 'BGP路由协议',
    difficulty: 'medium',
    duration: '6-8分钟',
  },
  {
    id: 'vrrp-ha',
    title: 'VRRP高可用：选举与切换机制',
    description: '通过可视化演示VRRP虚拟路由冗余协议的工作原理，包括Master选举、抢占模式、上行链路故障联动切换等核心机制。',
    phase: 1,
    category: '网络高可用',
    difficulty: 'medium',
    duration: '6-10分钟',
    isHot: true,
  },
  {
    id: 'spine-leaf',
    title: 'Spine-Leaf架构',
    description: '现代数据中心网络架构',
    phase: 1,
    category: '数据中心',
    difficulty: 'medium',
    duration: '5-7分钟',
  },
  {
    id: 'isis-overview',
    title: 'IS-IS协议概览',
    description: 'IS-IS与OSPF对比，区域边界在链路、路由器类型（L1/L2/L1-2）、报文类型详解',
    phase: 1,
    category: 'IS-IS路由协议',
    difficulty: 'medium',
    duration: '6-8分钟',
  },

  // Phase 2: 数据中心
  {
    id: 'tier-standard',
    title: '机房等级标准',
    description: 'TIA-942 Tier I~IV对比',
    phase: 2,
    category: '数据中心',
    difficulty: 'easy',
    duration: '3-5分钟',
  },
  {
    id: 'datacenter-infra',
    title: '2N冗余供电与机房基础设施',
    description: '双路市电+UPS+发电机，PUE计算，制冷系统对比',
    phase: 2,
    category: '数据中心',
    difficulty: 'medium',
    duration: '5-7分钟',
  },
  {
    id: 'raid',
    title: 'RAID技术对比',
    description: 'RAID 0/1/5/6/10原理对比',
    phase: 2,
    category: '存储',
    difficulty: 'medium',
    duration: '5-7分钟',
  },
  {
    id: 'disaster-recovery',
    title: '两地三中心',
    description: '同城灾备+异地灾备架构',
    phase: 2,
    category: '容灾',
    difficulty: 'hard',
    duration: '8-10分钟',
    isHot: true,
  },
  {
    id: 'storage-protocol',
    title: '存储协议对比',
    description: 'FC-SAN、IP-SAN、NVMe-oF延迟与性能对比',
    phase: 2,
    category: '存储',
    difficulty: 'medium',
    duration: '5-7分钟',
  },

  // Phase 3: 扩展整合
  {
    id: 'ipsec-vpn',
    title: 'IPsec VPN：隧道建立与加密',
    description: '通过可视化演示IKE阶段、SA协商、隧道模式与传输模式的区别，以及ESP/AH报文封装过程。',
    phase: 3,
    category: '安全',
    difficulty: 'medium',
    duration: '5-7分钟',
    isHot: true,
  },
  {
    id: 'defense-depth',
    title: '纵深防御模型',
    description: '分层防御架构演示，展示从互联网到内部网络的多层安全防护机制',
    phase: 3,
    category: '网络安全',
    difficulty: 'medium',
    duration: '5-7分钟',
  },
  {
    id: 'wifi6-ofdma',
    title: 'Wi-Fi 6 OFDMA技术',
    description: '直观理解正交频分多址技术如何让多个设备同时通信，对比Wi-Fi 5的OFDM，展示信道利用率提升原理。',
    phase: 3,
    category: '无线',
    difficulty: 'hard',
    duration: '6-8分钟',
  },
  {
    id: 'network-lifecycle',
    title: '网络生命周期规划方法论',
    description: '五阶段生命周期（规划、设计、实施、运营、优化）的详细流程，关键交付物和检查点。',
    phase: 3,
    category: '规划',
    difficulty: 'medium',
    duration: '5-7分钟',
    isHot: true,
  },
  {
    id: 'security-compliance',
    title: '等保2.0三级要求',
    description: '网络安全等级保护2.0标准三级要求详解，安全物理环境、通信网络、区域边界、管理中心',
    phase: 3,
    category: '网络安全',
    difficulty: 'medium',
    duration: '8-10分钟',
  },

  // Phase 4: 高级前沿
  {
    id: 'sdn-architecture',
    title: 'SDN架构：控制与转发分离',
    description: '可视化SDN三层架构（应用层、控制层、基础设施层），OpenFlow协议交互，流表下发与数据包转发过程。',
    phase: 4,
    category: 'SDN',
    difficulty: 'hard',
    duration: '8-10分钟',
    isHot: true,
  },
  {
    id: 'roce-rdma',
    title: 'RoCE与RDMA高性能网络',
    description: '理解RDMA远程直接内存访问原理，RoCE在以太网上的实现，与传统TCP/IP对比，无损网络配置要点。',
    phase: 4,
    category: '高性能网络',
    difficulty: 'hard',
    duration: '8-10分钟',
  },
];

// 按阶段分组
export const scenesByPhase = {
  1: scenes.filter(s => s.phase === 1),
  2: scenes.filter(s => s.phase === 2),
  3: scenes.filter(s => s.phase === 3),
  4: scenes.filter(s => s.phase === 4),
};

// 按分类分组
export const scenesByCategory = scenes.reduce((acc, scene) => {
  if (!acc[scene.category]) {
    acc[scene.category] = [];
  }
  acc[scene.category].push(scene);
  return acc;
}, {} as Record<string, Scene[]>);
