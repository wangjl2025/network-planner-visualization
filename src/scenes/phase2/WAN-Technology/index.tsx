import React, { useState } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { motion } from 'framer-motion';
import { Network, Server, Radio, ArrowRight, Info, CheckCircle } from 'lucide-react';

interface Technology {
  id: string;
  name: string;
  icon: React.ReactNode;
  bandwidth: string;
  distance: string;
  cost: string;
  reliability: string;
  useCase: string;
  description: string;
  features: string[];
}

const technologies: Technology[] = [
  {
    id: 'sdh',
    name: 'SDH/MSTP',
    icon: <Network className="w-8 h-8" />,
    bandwidth: '155Mbps - 10Gbps',
    distance: '长距离',
    cost: '高',
    reliability: '99.999%',
    useCase: '运营商骨干网、金融专线',
    description: '同步数字体系SDH是传统的TDM传输技术，提供刚性管道和物理隔离，时延极低，可靠性高',
    features: ['物理层隔离', '刚性带宽保证', '端到端时延<10ms', '自愈保护环网', 'OAM管理完善'],
  },
  {
    id: 'xdsl',
    name: 'xDSL(ADSL/VDSL)',
    icon: <Radio className="w-8 h-8" />,
    bandwidth: '8-100Mbps',
    distance: '3-5km',
    cost: '低',
    reliability: '99.9%',
    useCase: '家庭宽带接入',
    description: '数字用户线路技术利用现有电话线传输数据，ADSL非对称，VDSL对称且速率更高',
    features: ['利用现有电话线', '非对称/对称可选', '即插即用', '成本低廉', '覆盖广泛'],
  },
  {
    id: 'pon',
    name: 'PON(EPON/GPON)',
    icon: <Server className="w-8 h-8" />,
    bandwidth: '1G/2.5Gbps',
    distance: '20km',
    cost: '中',
    reliability: '99.95%',
    useCase: 'FTTH光纤到户',
    description: '无源光网络采用点到多点拓扑，OLT通过分光器连接多个ONU，节省光纤资源',
    features: ['点到多点拓扑', '无源分光器', '节省光纤', '带宽共享', '易于扩展'],
  },
  {
    id: 'mpls',
    name: 'MPLS VPN',
    icon: <Network className="w-8 h-8" />,
    bandwidth: '10Mbps - 10Gbps',
    distance: '跨地域',
    cost: '中高',
    reliability: '99.99%',
    useCase: '企业广域网互联',
    description: '多协议标签交换VPN在IP网络上提供类似专线的服务质量，支持QoS和流量工程',
    features: ['逻辑隔离', 'QoS保障', '流量工程', '多业务承载', '灵活扩展'],
  },
  {
    id: '4g5g',
    name: '4G/5G无线',
    icon: <Radio className="w-8 h-8" />,
    bandwidth: '100Mbps-10Gbps',
    distance: '蜂窝覆盖',
    cost: '按流量计费',
    reliability: '99.9%',
    useCase: '移动接入、物联网、应急通信',
    description: '蜂窝移动通信技术，5G提供eMBB大带宽、uRLLC低时延、mMTC大连接三大能力',
    features: ['无线接入', '移动性支持', '快速部署', '灵活计费', '广域覆盖'],
  },
];

export default function WANTechnology() {
  const [selectedTech, setSelectedTech] = useState<Technology>(technologies[0]);
  const [showComparison, setShowComparison] = useState(false);

  const scene = {
    id: 'wan-technology',
    title: '广域网接入技术对比',
    description: 'SDH/MSTP、xDSL、PON、MPLS VPN、4G/5G等广域网接入技术对比',
    phase: 2 as const,
    category: '广域网',
    difficulty: 'medium' as const,
    duration: '8-10分钟',
  };

  return (
    <SceneLayout scene={scene} showSidebar={false} noHeightLimit={true}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：技术列表 */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            选择接入技术
          </h3>
          {technologies.map((tech) => (
            <motion.button
              key={tech.id}
              onClick={() => setSelectedTech(tech)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedTech.id === tech.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedTech.id === tech.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {tech.icon}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {tech.name}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {tech.bandwidth}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}

          <motion.button
            onClick={() => setShowComparison(!showComparison)}
            className="w-full p-3 mt-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {showComparison ? '隐藏对比表' : '显示全面对比表'}
          </motion.button>
        </div>

        {/* 右侧：技术详情 */}
        <div className="lg:col-span-2">
          <motion.div
            key={selectedTech.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-500 text-white rounded-xl">
                {selectedTech.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {selectedTech.name}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  {selectedTech.useCase}
                </p>
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
              {selectedTech.description}
            </p>

            {/* 关键指标 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">带宽</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedTech.bandwidth}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">传输距离</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedTech.distance}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">成本</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedTech.cost}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">可靠性</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedTech.reliability}</div>
              </div>
            </div>

            {/* 特性列表 */}
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                技术特点
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedTech.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                  >
                    <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    {feature}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 对比表 */}
          {showComparison && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg overflow-x-auto"
            >
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                技术参数对比表
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400">技术</th>
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400">带宽</th>
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400">距离</th>
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400">成本</th>
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400">可靠性</th>
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400">典型应用</th>
                  </tr>
                </thead>
                <tbody>
                  {technologies.map((tech) => (
                    <tr
                      key={tech.id}
                      className={`border-b border-slate-100 dark:border-slate-700/50 ${
                        selectedTech.id === tech.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="py-3 px-2 font-medium text-slate-800 dark:text-slate-200">{tech.name}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{tech.bandwidth}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{tech.distance}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{tech.cost}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{tech.reliability}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{tech.useCase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <strong>选型建议：</strong>
          企业总部互联首选MPLS VPN或SDH专线；分支机构可考虑xDSL或PON；移动办公和物联网场景适合4G/5G无线接入。
          实际选型需综合考虑带宽需求、预算、可靠性要求和部署周期。
        </div>
      </div>
    </SceneLayout>
  );
}
