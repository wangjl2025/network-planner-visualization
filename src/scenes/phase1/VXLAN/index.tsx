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
    setPacketAnimation(true);
    setTimeout(() => setPacketAnimation(false), 3000);
  }, []);

  const getVNIConnections = (vni: number) => {
    return vteps.filter(v => v.vnis.includes(vni));
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="space-y-6 h-full overflow-y-auto">
        {/* 标签页切换 */}
        <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg">
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
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
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
              <div className="absolute inset-x-4 bottom-4 h-20 bg-gray-700/30 rounded-lg flex items-center justify-center border border-gray-600">
                <span className="text-gray-500">Underlay IP网络 (Spine-Leaf)</span>
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
                        ? 'bg-blue-600/30 border-blue-500'
                        : 'bg-gray-700/50 border-gray-600'
                    }`}
                    style={{ left: `${xPos}%`, top: '20%' }}
                    animate={packetAnimation && isConnected ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5, repeat: packetAnimation ? Infinity : 0 }}
                  >
                    <Server className={`w-8 h-8 ${isConnected ? 'text-blue-400' : 'text-gray-500'}`} />
                    <span className="text-xs font-bold mt-1">{vtep.name}</span>
                    <span className="text-xs text-gray-400">{vtep.ip}</span>
                  </motion.div>
                );
              })}

              {/* 隧道连接 */}
              <svg className="absolute inset-0 pointer-events-none">
                {selectedVNI &&
                  getVNIConnections(selectedVNI).map((vtep, i, arr) =>
                    arr.slice(i + 1).map((targetVtep) => {
                      const vtepIndex = vteps.findIndex((v) => v.id === vtep.id);
                      const targetIndex = vteps.findIndex((v) => v.id === targetVtep.id);
                      const x1 = 15 + vtepIndex * 35 + 12;
                      const x2 = 15 + targetIndex * 35 + 12;
                      
                      return (
                        <motion.line
                          key={`${vtep.id}-${targetVtep.id}`}
                          x1={`${x1}%`}
                          y1="35%"
                          x2={`${x2}%`}
                          y2="35%"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1 }}
                        />
                      );
                    })
                  )}
              </svg>

              {/* VM节点 */}
              {vteps.map((vtep, vtepIndex) =>
                vtep.vnis.map((vni, vmIndex) => (
                  <motion.div
                    key={`${vtep.id}-vm-${vni}`}
                    className={`absolute w-16 h-16 rounded-lg flex flex-col items-center justify-center border ${
                      selectedVNI === vni
                        ? 'bg-purple-600/30 border-purple-500'
                        : 'bg-gray-700/30 border-gray-600'
                    }`}
                    style={{
                      left: `${15 + vtepIndex * 35 - 8 + vmIndex * 16}%`,
                      top: '5%',
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-500/50 flex items-center justify-center text-xs">
                      VM
                    </div>
                    <span className="text-xs text-gray-400">VNI {vni}</span>
                  </motion.div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-center">
              <button
                onClick={startPacketAnimation}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                模拟数据包传输
              </button>
            </div>
          </div>
        )}

        {/* 报文封装视图 */}
        {activeTab === 'packet' && (
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
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
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              VXLAN vs 传统VLAN
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 传统VLAN */}
              <div className="space-y-4">
                <div className="text-center font-semibold text-yellow-400">传统VLAN</div>
                <div className="p-4 bg-gray-700/50 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">网络数量</span>
                    <span className="font-mono">4094 (12位)</span>
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
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="font-semibold text-blue-400 mb-2">云计算</div>
                <div className="text-sm text-gray-400">
                  支持大规模虚拟机迁移，打破二层边界限制
                </div>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="font-semibold text-purple-400 mb-2">多租户</div>
                <div className="text-sm text-gray-400">
                  每个租户独立VNI，地址空间完全隔离
                </div>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="font-semibold text-green-400 mb-2">网络虚拟化</div>
                <div className="text-sm text-gray-400">
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
