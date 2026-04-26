import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { Layers, Package, Server, Globe, ArrowRight, Network, Shield } from 'lucide-react';

// 内联类型定义
interface PacketLayer {
  name: string;
  color: string;
  fields: { name: string; value: string }[];
}

interface VTEP {
  id: string;
  name: string;
  ip: string;
  vnis: number[];
}

const vteps: VTEP[] = [
  { id: 'vtep1', name: 'VTEP-1', ip: '10.1.1.1', vnis: [100, 200] },
  { id: 'vtep2', name: 'VTEP-2', ip: '10.1.1.2', vnis: [100] },
  { id: 'vtep3', name: 'VTEP-3', ip: '10.1.1.3', vnis: [200] },
];

const packetLayers: PacketLayer[] = [
  {
    name: '外层以太网头',
    color: '#3B82F6',
    fields: [
      { name: '目的MAC', value: 'VTEP MAC' },
      { name: '源MAC', value: '源VTEP MAC' },
      { name: '类型', value: '0x0800 (IPv4)' },
    ],
  },
  {
    name: '外层IP头 (UDP)',
    color: '#10B981',
    fields: [
      { name: '目的IP', value: '目的VTEP IP' },
      { name: '源IP', value: '源VTEP IP' },
      { name: '协议', value: 'UDP (17)' },
      { name: '目的端口', value: '4789 (VXLAN)' },
    ],
  },
  {
    name: 'VXLAN头',
    color: '#F59E0B',
    fields: [
      { name: '标志', value: 'I=1 (VNI有效)' },
      { name: '保留', value: '0' },
      { name: 'VNI', value: '24位网络标识' },
      { name: '保留', value: '0' },
    ],
  },
  {
    name: '内层以太网头',
    color: '#8B5CF6',
    fields: [
      { name: '目的MAC', value: '目的VM MAC' },
      { name: '源MAC', value: '源VM MAC' },
      { name: 'VLAN', value: '原始VLAN Tag' },
    ],
  },
  {
    name: '内层IP头',
    color: '#EC4899',
    fields: [
      { name: '目的IP', value: '目的VM IP' },
      { name: '源IP', value: '源VM IP' },
      { name: 'TTL', value: '原始TTL' },
    ],
  },
];

export function VXLANScene() {
  const [selectedVNI, setSelectedVNI] = useState<number | null>(100);
  const [showEncapsulation, setShowEncapsulation] = useState(false);
  const [packetAnimation, setPacketAnimation] = useState(false);
  const [activeTab, setActiveTab] = useState<'topology' | 'packet' | 'comparison'>('topology');

  const sceneData = {
    id: 'vxlan',
    title: 'VXLAN技术',
    description: 'VXLAN报文封装、VTEP隧道、VNI隔离、Overlay网络可视化',
    phase: 1 as const,
    category: '数据中心网络',
    duration: '8-10分钟',
    difficulty: 'hard' as const,
  };

  const startPacketAnimation = useCallback(() => {
    if (!selectedVNI) return;
    setPacketAnimation(true);
    console.log('Animation started for VNI:', selectedVNI);
    setTimeout(() => {
      setPacketAnimation(false);
      console.log('Animation ended');
    }, 3000);
  }, [selectedVNI]);

  const getVNIConnections = (vni: number) => {
    return vteps.filter(v => v.vnis.includes(vni));
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false} noHeightLimit={true}>
      <div className="space-y-6 h-full overflow-y-auto">
        {/* 标签页切换 */}
        <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
          {[
            { id: 'topology', name: 'VXLAN拓扑', icon: Network },
            { id: 'packet', name: '报文封装', icon: Package },
            { id: 'comparison', name: '对比传统VLAN', icon: Layers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* 拓扑视图 */}
        {activeTab === 'topology' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-blue-400" />
                VXLAN Overlay拓扑
              </h3>
              <div className="flex gap-2">
                {[100, 200].map((vni) => (
                  <button
                    key={vni}
                    onClick={() => setSelectedVNI(vni)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedVNI === vni
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    VNI {vni}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative h-80">
              {/* Underlay网络 */}
              <div className="absolute inset-x-4 bottom-4 h-20 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600">
                <span className="text-gray-300">Underlay IP网络 (Spine-Leaf)</span>
              </div>

              {/* VTEP节点 */}
              {vteps.map((vtep, index) => {
                const isConnected = selectedVNI && vtep.vnis.includes(selectedVNI);
                const xPos = 15 + index * 35;
                
                return (
                  <motion.div
                    key={vtep.id}
                    className={`absolute w-24 h-24 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                      isConnected
                        ? packetAnimation 
                          ? 'bg-blue-500/60 border-blue-300 shadow-lg shadow-blue-400/50'
                          : 'bg-blue-600/40 border-blue-400'
                        : 'bg-gray-700 border-gray-500'
                    }`}
                    style={{ left: `${xPos}%`, top: '20%' }}
                    animate={packetAnimation && isConnected ? { 
                      scale: [1, 1.08, 1],
                      borderColor: ['#60A5FA', '#93C5FD', '#60A5FA']
                    } : {}}
                    transition={{ duration: 0.6, repeat: packetAnimation ? 2 : 0 }}
                  >
                    <Server className={`w-8 h-8 ${isConnected ? 'text-blue-200' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold mt-1 text-white">{vtep.name}</span>
                    <span className="text-xs text-gray-300">{vtep.ip}</span>
                    
                    {/* 数据包接收/发送指示器 */}
                    {packetAnimation && isConnected && (
                      <motion.div
                        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-green-400"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 0.5, repeat: 3 }}
                      />
                    )}
                  </motion.div>
                );
              })}

              {/* 隧道连接 - VTEP之间的虚线 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {selectedVNI &&
                  getVNIConnections(selectedVNI).map((vtep, i, arr) =>
                    arr.slice(i + 1).map((targetVtep) => {
                      const vtepIndex = vteps.findIndex((v) => v.id === vtep.id);
                      const targetIndex = vteps.findIndex((v) => v.id === targetVtep.id);
                      // VTEP节点中心位置: left = 15 + index * 35 + 12 (节点宽度的一半约6%)
                      const x1 = 15 + vtepIndex * 35 + 6;
                      const x2 = 15 + targetIndex * 35 + 6;
                      // VTEP节点垂直中心: top 20% + 高度一半 (约12%) = 32%
                      
                      return (
                        <motion.line
                          key={`tunnel-${vtep.id}-${targetVtep.id}`}
                          x1={`${x1}%`}
                          y1="32%"
                          x2={`${x2}%`}
                          y2="32%"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.8 }}
                        />
                      );
                    })
                  )}
              </svg>

              {/* 数据包流动动画 - 使用绝对定位的 div */}
              {packetAnimation && selectedVNI &&
                getVNIConnections(selectedVNI).map((vtep, i, arr) =>
                  arr.slice(i + 1).map((targetVtep, connIndex) => {
                    const vtepIndex = vteps.findIndex((v) => v.id === vtep.id);
                    const targetIndex = vteps.findIndex((v) => v.id === targetVtep.id);
                    // 与隧道连接线保持一致的位置计算
                    const left1 = 15 + vtepIndex * 35 + 6;
                    const left2 = 15 + targetIndex * 35 + 6;
                    
                    return (
                      <React.Fragment key={`packet-group-${vtep.id}-${targetVtep.id}`}>
                        {/* 正向数据包 */}
                        <motion.div
                          key={`packet-${vtep.id}-${targetVtep.id}`}
                          className="absolute flex items-center justify-center z-20"
                          style={{ 
                            top: '32%', 
                            marginTop: '-12px',
                            marginLeft: '-12px'
                          }}
                          initial={{ left: `${left1}%`, opacity: 0, scale: 0.5 }}
                          animate={{ 
                            left: [`${left1}%`, `${left2}%`],
                            opacity: [0, 1, 1, 0],
                            scale: [0.5, 1, 1, 0.5]
                          }}
                          transition={{ 
                            duration: 1.2, 
                            repeat: 2, 
                            ease: "easeInOut",
                            delay: connIndex * 0.2
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg shadow-blue-400/60 flex items-center justify-center">
                            <ArrowRight className="w-3 h-3 text-white" />
                          </div>
                          {/* 拖尾效果 */}
                          <motion.div
                            className="absolute w-6 h-6 rounded-full bg-blue-400/30"
                            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          />
                        </motion.div>
                        
                        {/* 反向数据包 */}
                        <motion.div
                          key={`packet-reverse-${vtep.id}-${targetVtep.id}`}
                          className="absolute flex items-center justify-center z-20"
                          style={{ 
                            top: '32%', 
                            marginTop: '-12px',
                            marginLeft: '-12px'
                          }}
                          initial={{ left: `${left2}%`, opacity: 0, scale: 0.5 }}
                          animate={{ 
                            left: [`${left2}%`, `${left1}%`],
                            opacity: [0, 1, 1, 0],
                            scale: [0.5, 1, 1, 0.5]
                          }}
                          transition={{ 
                            duration: 1.2, 
                            repeat: 2, 
                            ease: "easeInOut",
                            delay: connIndex * 0.2 + 0.3
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 shadow-lg shadow-cyan-400/60 flex items-center justify-center">
                            <ArrowRight className="w-3 h-3 text-white rotate-180" />
                          </div>
                        </motion.div>

                        {/* 传输路径高亮 */}
                        <motion.div
                          className="absolute h-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 z-10"
                          style={{ 
                            top: '32%',
                            left: `${Math.min(left1, left2)}%`,
                            width: `${Math.abs(left2 - left1)}%`
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.6, 0] }}
                          transition={{ duration: 1.2, repeat: 2 }}
                        />
                      </React.Fragment>
                    );
                  })
                )}

              {/* VM节点 */}
              {vteps.map((vtep, vtepIndex) =>
                vtep.vnis.map((vni, vmIndex) => (
                  <motion.div
                    key={`${vtep.id}-vm-${vni}`}
                    className={`absolute w-16 h-16 rounded-lg flex flex-col items-center justify-center border-2 ${
                      selectedVNI === vni
                        ? 'bg-purple-600/50 border-purple-400 shadow-lg shadow-purple-500/30'
                        : 'bg-gray-700 border-gray-500'
                    }`}
                    style={{
                      left: `${15 + vtepIndex * 35 - 8 + vmIndex * 16}%`,
                      top: '5%',
                      zIndex: 5,
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white font-medium">
                      VM
                    </div>
                    <span className="text-xs text-gray-300 mt-1">VNI {vni}</span>
                  </motion.div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-center">
              <button
                onClick={startPacketAnimation}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-white transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                模拟数据包传输
              </button>
            </div>
          </div>
        )}

        {/* 报文封装视图 */}
        {activeTab === 'packet' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-400" />
              VXLAN报文封装结构
            </h3>

            <div className="space-y-2">
              {packetLayers.map((layer, index) => (
                <motion.div
                  key={layer.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-lg overflow-hidden"
                  style={{ backgroundColor: `${layer.color}20` }}
                >
                  <div
                    className="px-4 py-2 font-semibold text-white"
                    style={{ backgroundColor: layer.color }}
                  >
                    {layer.name}
                  </div>
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {layer.fields.map((field) => (
                      <div key={field.name} className="text-sm">
                        <div className="text-gray-400">{field.name}</div>
                        <div className="font-mono text-white">{field.value}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Shield className="w-5 h-5" />
                <span className="font-semibold">VXLAN封装要点</span>
              </div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 原始以太网帧被完整封装在UDP报文中</li>
                <li>• VNI (24位) 提供1600万个隔离网络，远超VLAN的4094个</li>
                <li>• 外层IP头实现跨三层网络的二层互通</li>
                <li>• 支持MAC-in-UDP封装，Overlay与Underlay解耦</li>
              </ul>
            </div>
          </div>
        )}

        {/* 对比视图 */}
        {activeTab === 'comparison' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              VXLAN vs 传统VLAN
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 传统VLAN */}
              <div className="space-y-4">
                <div className="text-center font-semibold text-yellow-400">传统VLAN</div>
                <div className="p-4 bg-gray-700 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">网络数量</span>
                    <span className="font-mono text-white">4094 (12位)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">广播域</span>
                    <span className="text-red-400">大 (泛洪问题)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">跨三层</span>
                    <span className="text-red-400">不支持</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">MAC表规模</span>
                    <span className="text-yellow-400">受限于交换机</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">多租户</span>
                    <span className="text-red-400">难以隔离</span>
                  </div>
                </div>
              </div>

              {/* VXLAN */}
              <div className="space-y-4">
                <div className="text-center font-semibold text-green-400">VXLAN</div>
                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">网络数量</span>
                    <span className="font-mono text-green-400">1600万 (24位)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">广播域</span>
                    <span className="text-green-400">可控 (抑制泛洪)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">跨三层</span>
                    <span className="text-green-400">原生支持</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">MAC表规模</span>
                    <span className="text-green-400">分布式学习</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">多租户</span>
                    <span className="text-green-400">天然隔离</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="font-semibold text-blue-400 mb-2">云计算</div>
                <div className="text-sm text-gray-300">
                  支持大规模虚拟机迁移，打破二层边界限制
                </div>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="font-semibold text-purple-400 mb-2">多租户</div>
                <div className="text-sm text-gray-300">
                  每个租户独立VNI，地址空间完全隔离
                </div>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="font-semibold text-green-400 mb-2">网络虚拟化</div>
                <div className="text-sm text-gray-300">
                  Overlay与Underlay分离，灵活部署
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SceneLayout>
  );
}
