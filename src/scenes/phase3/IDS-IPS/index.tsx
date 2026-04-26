import React, { useState } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, Zap, AlertTriangle, CheckCircle, XCircle, Activity, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface Attack {
  id: string;
  name: string;
  type: 'signature' | 'anomaly';
  description: string;
  signature?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const attacks: Attack[] = [
  {
    id: 'portscan',
    name: '端口扫描',
    type: 'signature',
    description: '攻击者扫描目标主机的开放端口，寻找服务漏洞',
    signature: '短时间内对多个端口发起连接请求',
    severity: 'low',
  },
  {
    id: 'synflood',
    name: 'SYN Flood攻击',
    type: 'signature',
    description: '发送大量SYN包但不完成三次握手，耗尽服务器连接资源',
    signature: 'SYN包数量异常，SYN-ACK响应率低',
    severity: 'high',
  },
  {
    id: 'sqlinjection',
    name: 'SQL注入',
    type: 'signature',
    description: '在输入中嵌入SQL语句，试图非法访问数据库',
    signature: 'HTTP请求中包含SQL关键字(SELECT, DROP, UNION)',
    severity: 'critical',
  },
  {
    id: 'ddos',
    name: 'DDoS攻击',
    type: 'anomaly',
    description: '分布式拒绝服务攻击，海量请求导致服务不可用',
    signature: '流量突增超过基线300%以上',
    severity: 'critical',
  },
  {
    id: 'bruteforce',
    name: '暴力破解',
    type: 'signature',
    description: '尝试大量用户名密码组合进行认证',
    signature: '同一账户短时间内大量登录失败',
    severity: 'medium',
  },
  {
    id: 'dataexfil',
    name: '数据外泄',
    type: 'anomaly',
    description: '异常大量数据从内网向外传输',
    signature: '出站流量显著高于历史基线',
    severity: 'high',
  },
];

const severityColors = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const examPoints = [
  {
    title: 'IDS与IPS核心区别',
    points: [
      'IDS旁路部署：交换机镜像端口/SPAN分光器，不影响网络路径，不阻断流量',
      'IPS串联部署：串接在网络路径中（Inline模式），实时检测并阻断恶意流量',
      'IDS优势：对业务无影响，误报不影响正常流量，适合审计合规场景',
      'IPS风险：误报会阻断正常业务，需谨慎配置规则库'
    ]
  },
  {
    title: '检测方法对比',
    points: [
      '签名检测（特征库匹配）：基于已知攻击特征库，准确率高但无法检测0day漏洞',
      '异常检测（行为分析）：建立正常流量基线，可发现未知攻击但误报率高',
      '混合检测：结合签名和异常检测，平衡准确性与覆盖率',
      '现代IDS/IPS通常集成机器学习，提升异常检测准确率'
    ]
  },
  {
    title: '部署位置选择',
    points: [
      '边界防火墙后：保护数据中心入口，检测外部攻击流量',
      '核心交换机旁路：监控全网流量，检测内部威胁',
      '服务器区（DMZ）：保护关键业务服务器',
      '云环境：虚拟IDS/IPS（vIDS/vIPS）或云原生安全服务'
    ]
  },
  {
    title: '典型攻击识别',
    points: [
      '端口扫描：短时间内对多个端口发起连接，IDS通过流量模式识别',
      'DDoS攻击：流量突增超过基线300%，需配合流量清洗设备',
      'SQL注入：HTTP请求包含SQL关键字（SELECT/UNION/DROP）',
      'APT攻击：长期潜伏，低慢攻击，需结合威胁情报和沙箱检测'
    ]
  }
];

export default function IDSIPS() {
  const [mode, setMode] = useState<'ids' | 'ips'>('ids');
  const [selectedAttack, setSelectedAttack] = useState<Attack>(attacks[0]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<'detected' | 'blocked' | null>(null);
  const [showExamPoints, setShowExamPoints] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleDetect = () => {
    setIsDetecting(true);
    setDetectionResult(null);
    setTimeout(() => {
      setIsDetecting(false);
      setDetectionResult(mode === 'ids' ? 'detected' : 'blocked');
    }, 1500);
  };

  const scene = {
    id: 'ids-ips',
    title: 'IDS/IPS入侵检测与防御',
    description: '入侵检测系统IDS与入侵防御系统IPS的工作原理、检测方法和部署模式',
    phase: 3 as const,
    category: '网络安全',
    difficulty: 'medium' as const,
    duration: '8-10分钟',
  };

  return (
    <SceneLayout scene={scene} showSidebar={false} noHeightLimit={true}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：IDS vs IPS 对比 */}
        <div className="space-y-6">
          {/* 模式切换 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              选择工作模式
            </h3>
            <div className="flex gap-4">
              <motion.button
                onClick={() => setMode('ids')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  mode === 'ids'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Eye className="w-6 h-6 text-blue-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">IDS</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">入侵检测系统</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">旁路部署 · 检测告警</div>
              </motion.button>

              <motion.button
                onClick={() => setMode('ips')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  mode === 'ips'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="w-6 h-6 text-green-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">IPS</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">入侵防御系统</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">串联部署 · 实时阻断</div>
              </motion.button>
            </div>
          </div>

          {/* 架构图 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              {mode === 'ids' ? 'IDS旁路部署架构' : 'IPS串联部署架构'}
            </h3>
            <div className="relative h-48 flex items-center justify-center">
              {/* 网络拓扑可视化 */}
              <div className="flex items-center gap-4">
                {/* 互联网 */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="text-xs mt-2 text-slate-600 dark:text-slate-400">互联网</div>
                </div>

                {/* 防火墙 */}
                <div className="text-center">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-xs mt-2 text-slate-600 dark:text-slate-400">防火墙</div>
                </div>

                {/* IDS/IPS */}
                <motion.div
                  className="text-center"
                  animate={isDetecting ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: isDetecting ? Infinity : 0, duration: 0.5 }}
                >
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                    mode === 'ids' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {mode === 'ids' ? (
                      <Eye className="w-7 h-7 text-blue-600" />
                    ) : (
                      <Zap className="w-7 h-7 text-green-600" />
                    )}
                  </div>
                  <div className="text-xs mt-2 text-slate-600 dark:text-slate-400">
                    {mode === 'ids' ? 'IDS(旁路)' : 'IPS(串联)'}
                  </div>
                </motion.div>

                {/* 内网 */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-1">
                      <div className="w-3 h-3 bg-slate-400 rounded"></div>
                      <div className="w-3 h-3 bg-slate-400 rounded"></div>
                      <div className="w-3 h-3 bg-slate-400 rounded"></div>
                      <div className="w-3 h-3 bg-slate-400 rounded"></div>
                    </div>
                  </div>
                  <div className="text-xs mt-2 text-slate-600 dark:text-slate-400">内网</div>
                </div>
              </div>

              {/* 流量箭头 */}
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                animate={isDetecting ? { opacity: [0.3, 1, 0.3] } : {}}
                transition={{ repeat: isDetecting ? Infinity : 0, duration: 0.5 }}
              >
                <div className="flex gap-8">
                  <div className="w-8 h-0.5 bg-red-500"></div>
                  <div className="w-8 h-0.5 bg-red-500"></div>
                </div>
              </motion.div>
            </div>

            <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              {mode === 'ids' ? (
                <p>IDS通过交换机镜像端口或分光器旁路部署，只检测不阻断，发现攻击后记录日志并告警</p>
              ) : (
                <p>IPS串联在网络路径中，实时检测并阻断恶意流量，对正常业务流量进行深度包检测(DPI)</p>
              )}
            </div>
          </div>

          {/* 检测方法 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              检测方法对比
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">签名检测(特征检测)</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  基于已知攻击特征库匹配，准确率高但无法检测未知攻击。类似杀毒软件的特征码查杀。
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">异常检测(行为分析)</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  建立正常流量基线，检测偏离基线的异常行为。可发现未知攻击但误报率较高。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：攻击模拟 */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              选择攻击类型进行模拟
            </h3>
            <div className="space-y-2 mb-6">
              {attacks.map((attack) => (
                <motion.button
                  key={attack.id}
                  onClick={() => {
                    setSelectedAttack(attack);
                    setDetectionResult(null);
                  }}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedAttack.id === attack.id
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-red-300'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-5 h-5 ${
                        selectedAttack.id === attack.id ? 'text-red-500' : 'text-slate-400'
                      }`} />
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {attack.name}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${severityColors[attack.severity]}`}>
                      {attack.severity === 'critical' ? '严重' : 
                       attack.severity === 'high' ? '高危' : 
                       attack.severity === 'medium' ? '中危' : '低危'}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* 攻击详情 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedAttack.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    selectedAttack.type === 'signature' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30' 
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30'
                  }`}>
                    {selectedAttack.type === 'signature' ? '签名检测' : '异常检测'}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  {selectedAttack.description}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <strong>检测特征：</strong>{selectedAttack.signature}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 检测按钮 */}
            <motion.button
              onClick={handleDetect}
              disabled={isDetecting}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                mode === 'ids'
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } disabled:opacity-50`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isDetecting ? '检测中...' : mode === 'ids' ? '开始检测' : '检测并阻断'}
            </motion.button>

            {/* 检测结果 */}
            <AnimatePresence>
              {detectionResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`mt-4 p-4 rounded-lg ${
                    detectionResult === 'detected'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200'
                      : 'bg-green-50 dark:bg-green-900/20 border border-green-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {detectionResult === 'detected' ? (
                      <>
                        <Eye className="w-6 h-6 text-yellow-600" />
                        <div>
                          <div className="font-semibold text-yellow-800 dark:text-yellow-300">
                            攻击已检测！
                          </div>
                          <div className="text-sm text-yellow-700 dark:text-yellow-400">
                            IDS发现 {selectedAttack.name}，已记录日志并发送告警
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Shield className="w-6 h-6 text-green-600" />
                        <div>
                          <div className="font-semibold text-green-800 dark:text-green-300">
                            攻击已阻断！
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-400">
                            IPS检测到 {selectedAttack.name}，已实时阻断恶意流量
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 关键区别 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              IDS vs IPS 关键区别
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 text-slate-600 dark:text-slate-400">特性</th>
                    <th className="text-left py-2 text-blue-600">IDS</th>
                    <th className="text-left py-2 text-green-600">IPS</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-300">
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2">部署方式</td>
                    <td>旁路(镜像/分光)</td>
                    <td>串联(直路)</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2">对业务影响</td>
                    <td>无影响</td>
                    <td>可能引入时延</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2">响应方式</td>
                    <td>告警记录</td>
                    <td>实时阻断</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2">误报风险</td>
                    <td>低(仅告警)</td>
                    <td>高(可能阻断正常流量)</td>
                  </tr>
                  <tr>
                    <td className="py-2">适用场景</td>
                    <td>监控审计</td>
                    <td>主动防护</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 考试要点折叠面板 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => setShowExamPoints(!showExamPoints)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-800">考试要点总结</h4>
                <p className="text-sm text-gray-600">IDS/IPS高频考点与易错点</p>
              </div>
            </div>
            {showExamPoints ? <ChevronUp className="w-6 h-6 text-gray-600" /> : <ChevronDown className="w-6 h-6 text-gray-600" />}
          </button>

          <AnimatePresence>
            {showExamPoints && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {examPoints.map((section, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-5">
                      <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm">
                          {index + 1}
                        </span>
                        {section.title}
                      </h5>
                      <ul className="space-y-2">
                        {section.points.map((point, pIndex) => (
                          <li key={pIndex} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SceneLayout>
  );
}
