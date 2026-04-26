import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { Network, Router, Globe, Server, ArrowRight, Info, Radio } from 'lucide-react';

// LSA类型定义
interface LSAType {
  id: number;
  name: string;
  description: string;
  scope: string;
  generatedBy: string;
  color: string;
  icon: React.ElementType;
  details: string[];
}

const lsaTypes: LSAType[] = [
  {
    id: 1,
    name: 'Type 1 - Router LSA',
    description: '每台路由器生成，描述直连链路状态',
    scope: '区域内泛洪',
    generatedBy: '所有路由器',
    color: '#3B82F6',
    icon: Router,
    details: [
      '每个路由器为每个区域生成一个Type 1 LSA',
      '包含路由器ID、链路数量、链路类型',
      '链路类型：P2P、Transit、Stub、Virtual',
      '仅在所属区域内泛洪，不会跨越ABR'
    ]
  },
  {
    id: 2,
    name: 'Type 2 - Network LSA',
    description: 'DR生成，描述广播/NBMA网络',
    scope: '区域内泛洪',
    generatedBy: 'DR路由器',
    color: '#10B981',
    icon: Network,
    details: [
      '仅由广播或NBMA网络的DR生成',
      '描述网络掩码和连接到该网络的所有路由器',
      '与Type 1 LSA一起构建区域内拓扑',
      'DR失效后，新DR会重新生成'
    ]
  },
  {
    id: 3,
    name: 'Type 3 - Summary LSA',
    description: 'ABR生成，描述区域间路由',
    scope: '区域间泛洪',
    generatedBy: 'ABR',
    color: '#F59E0B',
    icon: ArrowRight,
    details: [
      '由ABR生成，用于在区域间传递路由信息',
      '描述到达其他区域的网络前缀和开销',
      '每个区域间网络对应一个Type 3 LSA',
      '可以汇总多个路由，减少LSA数量'
    ]
  },
  {
    id: 4,
    name: 'Type 4 - ASBR-Summary',
    description: 'ABR生成，描述ASBR位置',
    scope: '区域间泛洪',
    generatedBy: 'ABR',
    color: '#8B5CF6',
    icon: Globe,
    details: [
      '由ABR生成，描述ASBR的位置',
      '告诉其他区域如何到达ASBR',
      '与Type 5 LSA配合使用',
      '不包含具体路由，只包含到达ASBR的路径'
    ]
  },
  {
    id: 5,
    name: 'Type 5 - External LSA',
    description: 'ASBR生成，描述外部AS路由',
    scope: '整个OSPF域',
    generatedBy: 'ASBR',
    color: '#EF4444',
    icon: Server,
    details: [
      '由ASBR生成，描述到达OSPF域外的路由',
      '可以携带外部路由的Metric类型（E1/E2）',
      '在整个OSPF域内泛洪（除Stub区域）',
      '用于引入RIP、静态路由、BGP等外部路由'
    ]
  },
  {
    id: 7,
    name: 'Type 7 - NSSA External',
    description: 'NSSA ASBR生成，描述NSSA外部路由',
    scope: 'NSSA区域内',
    generatedBy: 'NSSA ASBR',
    color: '#EC4899',
    icon: Radio,
    details: [
      '仅由NSSA区域的ASBR生成',
      '描述NSSA区域的外部路由',
      '在NSSA区域内泛洪，不会直接进入其他区域',
      'ABR会将Type 7转换为Type 5进入骨干区域'
    ]
  }
];

// 区域拓扑数据 - 使用百分比坐标（0-100），避免在小屏下溢出
// 容器参考尺寸 800×420，x%=x/800*100，y%=y/420*100
// 区域框中心点根据路由器位置计算：取区域内路由器坐标的中心
// 拓扑说明：R1连接Area 0和Area 1（ABR），R2连接Area 0和Area 2（ABR+ASBR）
const areas = [
  { id: 'area0', name: 'Area 0 (骨干)', xPct: 50,   yPct: 38,   color: '#3B82F6' },  // R1,R2中心
  { id: 'area1', name: 'Area 1 (Stub)', xPct: 25,   yPct: 68,   color: '#10B981' },  // R3,R4中心
  { id: 'area2', name: 'Area 2 (NSSA)', xPct: 73.75, yPct: 68,  color: '#F59E0B' },  // R5,R6中心
];

const routers = [
  { id: 'R1', name: 'R1 (ABR)',  area: 'area0', xPct: 43.75, yPct: 38.1,  type: 'ABR'      }, // x=350, y=160
  { id: 'R2', name: 'R2 (ABR)',  area: 'area0', xPct: 56.25, yPct: 38.1,  type: 'ABR'      }, // x=450, y=160
  { id: 'R3', name: 'R3',        area: 'area1', xPct: 18.75, yPct: 61.9,  type: 'Internal' }, // x=150, y=260
  { id: 'R4', name: 'R4 (DR)',   area: 'area1', xPct: 31.25, yPct: 73.8,  type: 'DR'       }, // x=250, y=310
  { id: 'R5', name: 'R5',        area: 'area2', xPct: 68.75, yPct: 61.9,  type: 'Internal' }, // x=550, y=260
  { id: 'R6', name: 'R6 (ASBR)', area: 'area2', xPct: 78.75, yPct: 73.8,  type: 'ASBR'    }, // x=630, y=310
];

const links = [
  { from: 'R1', to: 'R2', area: 'area0' },  // 骨干区域内部
  { from: 'R1', to: 'R3', area: 'area0-area1' },  // R1-R3跨区域
  { from: 'R3', to: 'R4', area: 'area1' },  // Area 1内部
  { from: 'R2', to: 'R5', area: 'area0-area2' },  // R2-R5跨区域
  { from: 'R5', to: 'R6', area: 'area2' },  // Area 2内部
];

export function OSPFLSAScene() {
  const [selectedLSA, setSelectedLSA] = useState<LSAType>(lsaTypes[0]);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animatedRouters, setAnimatedRouters] = useState<string[]>([]);

  const sceneData = {
    id: 'ospf-lsa',
    title: 'OSPF LSA类型详解',
    description: '理解OSPF六种LSA类型的生成者、传播范围和作用',
    phase: 1 as const,
    category: 'OSPF',
    duration: '8-10分钟',
    difficulty: 'medium' as const,
  };

  // 根据LSA类型定义泛洪路径
  const getFloodingSequence = (): { routerId: string; description: string }[] => {
    const sequence: { routerId: string; description: string }[] = [];
    
    switch (selectedLSA.id) {
      case 1: // Type 1 Router LSA - 由每台路由器生成，只在所属区域内泛洪
        // 假设R3生成Type 1 LSA，在Area 1内泛洪到R4
        sequence.push({ routerId: 'R3', description: 'R3生成Router LSA' });
        sequence.push({ routerId: 'R4', description: 'LSA在Area 1内泛洪到R4' });
        break;
        
      case 2: // Type 2 Network LSA - 由DR生成，只在区域内泛洪
        // R4是Area 1的DR，生成Network LSA
        sequence.push({ routerId: 'R4', description: 'R4(DR)生成Network LSA' });
        sequence.push({ routerId: 'R3', description: 'LSA在Area 1内泛洪到R3' });
        break;
        
      case 3: // Type 3 Summary LSA - 由ABR生成，在区域间泛洪
        // 场景：R3在Area 1产生新路由，ABR R1将其汇总后发布到Area 0
        sequence.push({ routerId: 'R3', description: 'R3在Area 1产生新路由' });
        sequence.push({ routerId: 'R1', description: 'ABR R1将Area 1路由汇总为Summary LSA' });
        sequence.push({ routerId: 'R2', description: 'LSA泛洪到Area 0其他路由器' });
        sequence.push({ routerId: 'R5', description: 'LSA通过ABR R2进入Area 2' });
        break;
        
      case 4: // Type 4 ASBR-Summary LSA - 由ABR生成，描述ASBR位置
        // 场景：R6是ASBR，ABR R2生成Type 4描述如何到达R6
        sequence.push({ routerId: 'R6', description: 'ASBR R6引入外部路由' });
        sequence.push({ routerId: 'R2', description: 'ABR R2生成ASBR-Summary LSA' });
        sequence.push({ routerId: 'R1', description: 'LSA在Area 0内泛洪到R1' });
        sequence.push({ routerId: 'R3', description: 'LSA通过ABR R1进入Area 1' });
        break;
        
      case 5: // Type 5 External LSA - 由ASBR生成，在整个OSPF域内泛洪（除Stub）
        // 场景：R6是ASBR，生成External LSA泛洪到整个OSPF域
        sequence.push({ routerId: 'R6', description: 'R6(ASBR)生成External LSA' });
        sequence.push({ routerId: 'R5', description: 'LSA在Area 2内泛洪到R5' });
        sequence.push({ routerId: 'R2', description: 'LSA通过骨干区域泛洪到R2' });
        sequence.push({ routerId: 'R1', description: 'LSA在Area 0内泛洪到R1' });
        sequence.push({ routerId: 'R3', description: 'LSA通过ABR泛洪到Area 1' });
        // 注意：Type 5不会进入Stub区域（Area 1是Stub，这里为演示才进入）
        break;
        
      case 7: // Type 7 NSSA External LSA - 由NSSA ASBR生成，只在NSSA区域内泛洪
        // 场景：Area 2是NSSA，R6是NSSA ASBR，生成Type 7 LSA
        sequence.push({ routerId: 'R6', description: 'R6(NSSA ASBR)生成Type 7 LSA' });
        sequence.push({ routerId: 'R5', description: 'LSA在NSSA(Area 2)内泛洪到R5' });
        sequence.push({ routerId: 'R2', description: 'ABR R2将Type 7转换为Type 5' });
        break;
    }
    
    return sequence;
  };

  const playAnimation = () => {
    const sequence = getFloodingSequence();
    if (sequence.length === 0) return;
    
    setShowAnimation(true);
    setAnimatedRouters([]);
    
    // 逐步执行泛洪动画
    sequence.forEach((step, index) => {
      setTimeout(() => {
        setAnimatedRouters(prev => [...prev, step.routerId]);
      }, index * 600);
    });

    // 动画结束后重置
    setTimeout(() => {
      setShowAnimation(false);
      setAnimatedRouters([]);
    }, sequence.length * 600 + 1500);
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false} noHeightLimit={true}>
      <div className="space-y-6 h-full overflow-y-auto">
        {/* LSA类型选择 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Info className="w-5 h-5 text-blue-400" />
            选择LSA类型
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {lsaTypes.map((lsa) => {
              const Icon = lsa.icon;
              const isSelected = selectedLSA.id === lsa.id;
              return (
                <button
                  key={lsa.id}
                  onClick={() => setSelectedLSA(lsa)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-current'
                      : 'border-gray-500 hover:border-gray-400'
                  }`}
                  style={{
                    borderColor: isSelected ? lsa.color : undefined,
                    backgroundColor: isSelected ? `${lsa.color}20` : 'rgba(55, 65, 81, 0.8)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 flex-shrink-0" style={{ color: lsa.color }} />
                    <span className="font-semibold text-sm" style={{ color: isSelected ? lsa.color : '#e5e7eb' }}>
                      Type {lsa.id}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{lsa.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 拓扑图和LSA详情 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 网络拓扑 */}
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">OSPF多区域拓扑</h3>
              <button
                onClick={playAnimation}
                disabled={showAnimation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white"
              >
                {showAnimation ? '泛洪中...' : '播放泛洪动画'}
              </button>
            </div>
            
            <div className="relative w-full" style={{ paddingBottom: '52.5%' /* 420/800 */ }}>
              <div className="absolute inset-0 bg-gray-900/50 rounded-lg overflow-visible">
              {/* 区域背景 - 使用百分比定位，区域框中心对齐到area坐标 */}
              {areas.map((area) => (
                <div
                  key={area.id}
                  className="absolute rounded-lg border-2 border-dashed transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${area.xPct}%`,
                    top: `${area.yPct}%`,
                    width: '22%',
                    height: '35%',
                    borderColor: area.color,
                    backgroundColor: `${area.color}10`,
                  }}
                >
                  <span
                    className="absolute -top-3 left-4 px-2 text-xs font-medium whitespace-nowrap"
                    style={{ backgroundColor: '#1f2937', color: area.color }}
                  >
                    {area.name}
                  </span>
                </div>
              ))}

              {/* 链路 - 百分比坐标的SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 420" preserveAspectRatio="none">
                {links.map((link, index) => {
                  const fromRouter = routers.find(r => r.id === link.from);
                  const toRouter = routers.find(r => r.id === link.to);
                  if (!fromRouter || !toRouter) return null;
                  return (
                    <line
                      key={index}
                      x1={fromRouter.xPct * 8}
                      y1={fromRouter.yPct * 4.2}
                      x2={toRouter.xPct * 8}
                      y2={toRouter.yPct * 4.2}
                      stroke="#4B5563"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>

              {/* 路由器 */}
              {routers.map((router) => {
                const isAnimated = animatedRouters.includes(router.id);
                return (
                  <motion.div
                    key={router.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${router.xPct}%`, top: `${router.yPct}%` }}
                    animate={isAnimated ? {
                      scale: [1, 1.3, 1],
                      boxShadow: [
                        '0 0 0 0 rgba(59, 130, 246, 0)',
                        '0 0 20px 10px rgba(59, 130, 246, 0.5)',
                        '0 0 0 0 rgba(59, 130, 246, 0)'
                      ]
                    } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: router.type === 'ABR' ? '#F59E0B' :
                                        router.type === 'ASBR' ? '#EF4444' :
                                        router.type === 'DR' ? '#10B981' : '#3B82F6',
                      }}
                    >
                      {router.id}
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 whitespace-nowrap text-xs text-gray-400">
                      {router.type}
                    </div>
                  </motion.div>
                );
              })}

              {/* 外部网络 - 右侧边缘保留5%内边距 */}
              <div className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: '92%', top: '78%' }}>
                <Globe className="w-8 h-8 text-red-400 mx-auto" />
                <span className="text-xs text-gray-400 mt-1 block text-center whitespace-nowrap">External AS</span>
              </div>
              </div>
            </div>

            {/* 图例 */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Internal</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>ABR</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>ASBR</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>DR</span>
              </div>
            </div>

            {/* 泛洪动画步骤描述 */}
            <AnimatePresence mode="wait">
              {showAnimation && animatedRouters.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/50"
                >
                  <div className="text-xs text-blue-300 mb-1">当前步骤</div>
                  <div className="text-sm text-white font-medium">
                    {getFloodingSequence()[animatedRouters.length - 1]?.description || ''}
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ width: '0%' }}
                      animate={{ width: `${(animatedRouters.length / getFloodingSequence().length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {animatedRouters.length} / {getFloodingSequence().length} 步
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* LSA详情 */}
          <div className="bg-gray-800/50 rounded-xl p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedLSA.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <selectedLSA.icon className="w-8 h-8" style={{ color: selectedLSA.color }} />
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: selectedLSA.color }}>
                      {selectedLSA.name}
                    </h3>
                    <p className="text-sm text-gray-400">{selectedLSA.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">泛洪范围</div>
                      <div className="font-medium">{selectedLSA.scope}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">生成者</div>
                      <div className="font-medium">{selectedLSA.generatedBy}</div>
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-sm font-medium mb-3">详细信息</div>
                    <ul className="space-y-2">
                      {selectedLSA.details.map((detail, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-2 text-sm text-gray-300"
                        >
                          <span className="text-blue-400 mt-1">•</span>
                          {detail}
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {/* LSA报文格式示意 */}
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm font-medium mb-3">LSA报文头部格式</div>
                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex">
                        <span className="w-24 text-gray-500">LS Age:</span>
                        <span className="text-yellow-400">16 bits</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-gray-500">Options:</span>
                        <span className="text-green-400">8 bits</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-gray-500">LS Type:</span>
                        <span className="text-blue-400">8 bits (Type {selectedLSA.id})</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-gray-500">Link State ID:</span>
                        <span className="text-purple-400">32 bits</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-gray-500">Adv Router:</span>
                        <span className="text-pink-400">32 bits</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-gray-500">LS Seq Num:</span>
                        <span className="text-orange-400">32 bits</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-gray-500">Checksum:</span>
                        <span className="text-cyan-400">16 bits</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-gray-500">Length:</span>
                        <span className="text-red-400">16 bits</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* LSA类型对比表 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">LSA类型对比表</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3">类型</th>
                  <th className="text-left py-2 px-3">名称</th>
                  <th className="text-left py-2 px-3">生成者</th>
                  <th className="text-left py-2 px-3">泛洪范围</th>
                  <th className="text-left py-2 px-3">作用</th>
                </tr>
              </thead>
              <tbody>
                {lsaTypes.map((lsa) => (
                  <tr
                    key={lsa.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors ${
                      selectedLSA.id === lsa.id ? 'bg-gray-700/50' : ''
                    }`}
                    onClick={() => setSelectedLSA(lsa)}
                  >
                    <td className="py-2 px-3">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold"
                        style={{ backgroundColor: lsa.color, color: '#fff' }}
                      >
                        {lsa.id}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium">{lsa.name}</td>
                    <td className="py-2 px-3 text-gray-400">{lsa.generatedBy}</td>
                    <td className="py-2 px-3 text-gray-400">{lsa.scope}</td>
                    <td className="py-2 px-3 text-gray-400">{lsa.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
