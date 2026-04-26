import React, { useState } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { motion } from 'framer-motion';
import { Network, Server, Wifi, Shield, ArrowRight, CheckCircle, Info } from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  devices: string[];
  functions: string[];
  characteristics: string[];
}

const layers: Layer[] = [
  {
    id: 'core',
    name: '核心层',
    icon: <Network className="w-8 h-8" />,
    color: 'bg-red-500',
    devices: ['高端核心交换机', '路由器', '防火墙'],
    functions: [
      '高速数据转发',
      '路由聚合',
      '冗余设计',
      '策略控制',
    ],
    characteristics: [
      '高带宽(10G/40G/100G)',
      '高可靠性(99.999%)',
      '低时延(<1ms)',
      '双机热备',
    ],
  },
  {
    id: 'distribution',
    name: '汇聚层',
    icon: <Server className="w-8 h-8" />,
    color: 'bg-blue-500',
    devices: ['汇聚交换机', '三层交换机', 'AC控制器'],
    functions: [
      '区域汇聚',
      '访问控制',
      '路由汇总',
      'QoS策略',
    ],
    characteristics: [
      '中等带宽(1G/10G)',
      '区域隔离',
      '策略执行点',
      '冗余链路',
    ],
  },
  {
    id: 'access',
    name: '接入层',
    icon: <Wifi className="w-8 h-8" />,
    color: 'bg-green-500',
    devices: ['接入交换机', 'AP无线接入点', 'IP电话'],
    functions: [
      '终端接入',
      'VLAN划分',
      'PoE供电',
      '端口安全',
    ],
    characteristics: [
      '接入带宽(100M/1G)',
      '高密度端口',
      'PoE支持',
      '边缘安全',
    ],
  },
];

const redundancyStrategies = [
  {
    name: '链路冗余',
    description: '核心-汇聚、汇聚-接入之间部署多条物理链路',
    technologies: ['链路聚合(LACP)', '生成树(STP/RSTP)', '智能堆叠'],
  },
  {
    name: '设备冗余',
    description: '关键节点部署双机热备',
    technologies: ['VRRP/HSRP', '双核心交换机', '双链路上行'],
  },
  {
    name: '路由冗余',
    description: '多路径路由实现故障自动切换',
    technologies: ['OSPF/ECMP', 'BGP多出口', '快速收敛'],
  },
];

export default function CampusArchitecture() {
  const [selectedLayer, setSelectedLayer] = useState<Layer>(layers[0]);
  const [showTraffic, setShowTraffic] = useState(false);

  const sceneData = {
    id: 'campus-architecture',
    phase: 4 as const,
    title: '园区网三层架构设计',
    category: '网络架构',
    description: '核心层、汇聚层、接入层三层架构设计，各层功能定位与设备选型',
    duration: '5-8分钟',
    difficulty: 'medium' as const,
  };

  return (
    <SceneLayout
      scene={sceneData}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：架构图 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 三层架构可视化 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              园区网三层架构拓扑
            </h3>
            
            <div className="relative py-8">
              {/* 核心层 */}
              <motion.div
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedLayer.id === 'core'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-red-200 dark:border-red-800 hover:border-red-400'
                }`}
                onClick={() => setSelectedLayer(layers[0])}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500 text-white rounded-lg">
                      {layers[0].icon}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {layers[0].name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Core Layer
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Server className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Server className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
                
                {/* 流量动画 */}
                {showTraffic && (
                  <motion.div
                    className="absolute left-1/4 bottom-0 w-2 h-2 bg-red-500 rounded-full"
                    animate={{ y: [0, 50] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                )}
              </motion.div>

              {/* 连接线 */}
              <div className="flex justify-center py-2">
                <div className="flex gap-16">
                  <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600"></div>
                  <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600"></div>
                </div>
              </div>

              {/* 汇聚层 */}
              <motion.div
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedLayer.id === 'distribution'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-blue-200 dark:border-blue-800 hover:border-blue-400'
                }`}
                onClick={() => setSelectedLayer(layers[1])}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 text-white rounded-lg">
                      {layers[1].icon}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {layers[1].name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Distribution Layer
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Network className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Network className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 连接线 */}
              <div className="flex justify-center py-2">
                <div className="flex gap-8">
                  <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600"></div>
                  <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600"></div>
                  <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600"></div>
                  <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600"></div>
                </div>
              </div>

              {/* 接入层 */}
              <motion.div
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedLayer.id === 'access'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-green-200 dark:border-green-800 hover:border-green-400'
                }`}
                onClick={() => setSelectedLayer(layers[2])}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500 text-white rounded-lg">
                      {layers[2].icon}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {layers[2].name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Access Layer
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 终端设备 */}
              <div className="flex justify-around mt-4">
                <div className="text-center">
                  <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 mx-auto"></div>
                  <div className="text-xs text-slate-500 mt-1">PC</div>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 mx-auto"></div>
                  <div className="text-xs text-slate-500 mt-1">PC</div>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 mx-auto"></div>
                  <div className="text-xs text-slate-500 mt-1">Printer</div>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 mx-auto"></div>
                  <div className="text-xs text-slate-500 mt-1">Phone</div>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 mx-auto"></div>
                  <div className="text-xs text-slate-500 mt-1">AP</div>
                </div>
              </div>
            </div>

            <motion.button
              onClick={() => setShowTraffic(!showTraffic)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {showTraffic ? '隐藏流量示意' : '显示流量示意'}
            </motion.button>
          </div>

          {/* 冗余设计 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              冗余设计策略
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {redundancyStrategies.map((strategy, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    {strategy.name}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {strategy.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.technologies.map((tech, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：层级详情 */}
        <div className="space-y-6">
          <motion.div
            key={selectedLayer.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 ${selectedLayer.color} text-white rounded-lg`}>
                {selectedLayer.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {selectedLayer.name}
                </h2>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedLayer.id === 'core' ? 'Core Layer' : 
                   selectedLayer.id === 'distribution' ? 'Distribution Layer' : 'Access Layer'}
                </div>
              </div>
            </div>

            {/* 典型设备 */}
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                典型设备
              </h4>
              <div className="space-y-2">
                {selectedLayer.devices.map((device, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                  >
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    {device}
                  </div>
                ))}
              </div>
            </div>

            {/* 核心功能 */}
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                核心功能
              </h4>
              <div className="space-y-2">
                {selectedLayer.functions.map((func, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {func}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 技术特征 */}
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                技术特征
              </h4>
              <div className="space-y-2">
                {selectedLayer.characteristics.map((char, index) => (
                  <div
                    key={index}
                    className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded text-sm text-slate-700 dark:text-slate-300"
                  >
                    {char}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 设计原则 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              设计原则
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>层次清晰：</strong>各层职责明确，避免功能混杂
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>冗余设计：</strong>关键链路双上行，设备双机热备
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>模块化：</strong>按功能区域划分，便于扩展维护
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>安全性：</strong>分层部署安全策略，纵深防御
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
