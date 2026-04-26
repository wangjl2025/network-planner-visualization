import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { 
  Database, FolderOpen, Cloud, Server, HardDrive, 
  ArrowRight, ArrowDown, CheckCircle, Cpu, Network,
  Globe, Box, FileText, Shield, Zap, Clock,
  ChevronRight, Layers, Monitor, Laptop, Tablet,
  RefreshCw, Download, Upload, Trash2, Search
} from 'lucide-react';

// 场景数据
const sceneData = {
  id: 'storage-types',
  title: '存储类型对比：块存储、文件存储、对象存储',
  description: '深入理解三种存储架构的原理、协议、性能特点和应用场景，掌握企业存储选型决策',
  phase: 2 as const,
  category: '存储',
  difficulty: 'medium' as const,
  duration: '10-15分钟',
  isHot: true,
};

// 存储类型定义
type StorageType = 'block' | 'file' | 'object';

interface ComparisonItem {
  aspect: string;
  block: string;
  file: string;
  object: string;
}

// 对比数据
const comparisonData: ComparisonItem[] = [
  { 
    aspect: '数据结构', 
    block: '固定大小数据块(512B/4KB)', 
    file: '层级目录树(Folder/File)', 
    object: '键值对(Bucket/Object)' 
  },
  { 
    aspect: '访问协议', 
    block: 'FC、iSCSI、SCSI', 
    file: 'NFS、SMB/CIFS、FTP', 
    object: 'S3、Swift、Azure Blob' 
  },
  { 
    aspect: '访问方式', 
    block: '块设备(裸盘映射)', 
    file: '文件系统挂载(挂载点)', 
    object: 'REST API(HTTP/HTTPS)' 
  },
  { 
    aspect: '延迟', 
    block: '极低(10-100μs)', 
    file: '低(100-500μs)', 
    object: '中等(10-100ms)' 
  },
  { 
    aspect: '吞吐量', 
    block: '极高(GB/s级)', 
    file: '高(100MB/s-GB/s)', 
    object: '可扩展(PB级聚合)' 
  },
  { 
    aspect: '共享访问', 
    block: '不支持(独占)', 
    file: '支持(多客户端)', 
    object: '支持(原生并发)' 
  },
  { 
    aspect: '元数据', 
    block: '无(仅存储数据块)', 
    file: '基本(文件名/权限)', 
    object: '丰富(自定义标签)' 
  },
  { 
    aspect: '扩展性', 
    block: '受限于LUN大小', 
    file: '受限于文件系统', 
    object: '近乎无限' 
  },
  { 
    aspect: '成本', 
    block: '高(专用硬件)', 
    file: '中(NAS设备)', 
    object: '低(软件定义)' 
  },
];

// 块存储数据
const blockStorageSteps = [
  { id: 1, title: 'Initiator初始化', desc: 'HBA卡(FC)或iSCSI initiator建立连接', icon: Monitor, color: '#3b82f6' },
  { id: 2, title: 'Target发现', desc: '发现存储阵列上的LUN(逻辑单元号)', icon: Search, color: '#8b5cf6' },
  { id: 3, title: 'SCSI命令封装', desc: '封装READ/WRITE命令到SCSI帧', icon: Cpu, color: '#10b981' },
  { id: 4, title: '块设备映射', desc: '主机识别为本地磁盘(/dev/sdb)', icon: HardDrive, color: '#f59e0b' },
  { id: 5, title: '文件系统格式化', desc: '创建EXT4/XFS文件系统', icon: FileText, color: '#ef4444' },
  { id: 6, title: '读写IO操作', desc: '直接块地址访问，无协议转换', icon: Zap, color: '#06b6d4' },
];

// 文件存储数据
const fileStorageSteps = [
  { id: 1, title: '客户端挂载', desc: 'NFS/SMB挂载到本地挂载点', icon: Monitor, color: '#3b82f6' },
  { id: 2, title: '路径解析', desc: '解析/home/user/docs/file.pdf路径', icon: FolderOpen, color: '#8b5cf6' },
  { id: 3, title: 'POSIX请求', desc: '生成POSIX文件系统调用(open/read/write)', icon: Cpu, color: '#10b981' },
  { id: 4, title: 'NAS协议封装', desc: 'NFSv4/SMB3协议封装请求', icon: Network, color: '#f59e0b' },
  { id: 5, title: '元数据查询', desc: '查询inode、权限、ACL信息', icon: FileText, color: '#ef4444' },
  { id: 6, title: '数据读写', desc: '通过NAS网关访问后端存储', icon: Database, color: '#06b6d4' },
];

// 对象存储数据
const objectStorageSteps = [
  { id: 1, title: '应用发起请求', desc: 'SDK/API调用PUT/GET请求', icon: Monitor, color: '#3b82f6' },
  { id: 2, title: '认证鉴权', desc: 'AK/SK签名验证，IAM策略检查', icon: Shield, color: '#8b5cf6' },
  { id: 3, title: '元数据服务', desc: '定位Object所在Data Node', icon: Database, color: '#10b981' },
  { id: 4, title: '数据分片', desc: '大文件自动分片(4MB-5GB)', icon: Layers, color: '#f59e0b' },
  { id: 5, title: '多副本写入', desc: '纠删码或多副本策略写入', icon: HardDrive, color: '#ef4444' },
  { id: 6, title: '返回ETag', desc: '返回对象标识和访问URL', icon: CheckCircle, color: '#06b6d4' },
];

// 块存储拓扑节点
const blockNodes = [
  { id: 'host', name: '应用服务器', type: 'host', x: 15, y: 50, icon: Server, color: '#3b82f6' },
  { id: 'hba', name: 'HBA卡', type: 'device', x: 30, y: 50, icon: Cpu, color: '#8b5cf6' },
  { id: 'switch', name: 'FC交换机', type: 'switch', x: 45, y: 50, icon: Network, color: '#10b981' },
  { id: 'array', name: '存储阵列', type: 'storage', x: 65, y: 50, icon: Database, color: '#f59e0b' },
  { id: 'lun', name: 'LUN卷', type: 'lun', x: 80, y: 50, icon: HardDrive, color: '#ef4444' },
];

// 文件存储拓扑节点
const fileNodes = [
  { id: 'client1', name: '客户端A', type: 'host', x: 15, y: 35, icon: Laptop, color: '#3b82f6' },
  { id: 'client2', name: '客户端B', type: 'host', x: 15, y: 65, icon: Tablet, color: '#06b6d4' },
  { id: 'nas', name: 'NAS网关', type: 'nas', x: 50, y: 50, icon: Server, color: '#f59e0b' },
  { id: 'meta', name: '元数据节点', type: 'meta', x: 75, y: 30, icon: Database, color: '#8b5cf6' },
  { id: 'data', name: '数据节点', type: 'data', x: 75, y: 70, icon: HardDrive, color: '#10b981' },
];

// 对象存储拓扑节点
const objectNodes = [
  { id: 'app', name: '应用程序', type: 'app', x: 10, y: 50, icon: Monitor, color: '#3b82f6' },
  { id: 'gw', name: 'API网关', type: 'gateway', x: 28, y: 50, icon: Globe, color: '#8b5cf6' },
  { id: 'auth', name: '认证服务', type: 'auth', x: 42, y: 30, icon: Shield, color: '#ef4444' },
  { id: 'meta', name: '元数据服务', type: 'meta', x: 42, y: 70, icon: Database, color: '#10b981' },
  { id: 'dn1', name: 'DataNode 1', type: 'datanode', x: 65, y: 25, icon: HardDrive, color: '#f59e0b' },
  { id: 'dn2', name: 'DataNode 2', type: 'datanode', x: 65, y: 50, icon: HardDrive, color: '#f59e0b' },
  { id: 'dn3', name: 'DataNode 3', type: 'datanode', x: 65, y: 75, icon: HardDrive, color: '#f59e0b' },
  { id: 'bucket', name: 'Bucket', type: 'bucket', x: 85, y: 50, icon: Box, color: '#06b6d4' },
];

// 应用场景
const useCases = {
  block: [
    { name: '数据库(MySQL/Oracle)', reason: '需要极低延迟和极高IOPS' },
    { name: '虚拟机磁盘', reason: '裸设备映射，无需文件系统' },
    { name: '企业应用', reason: 'SAP/ERP等关键业务系统' },
  ],
  file: [
    { name: '企业文件共享', reason: '团队协作，目录权限管理' },
    { name: '办公文档存储', reason: 'NFS/SMB协议原生支持' },
    { name: '视频编辑素材', reason: '大文件顺序读写' },
  ],
  object: [
    { name: '云原生应用', reason: 'S3 API广泛支持' },
    { name: '备份与归档', reason: '冷数据低成本长期存储' },
    { name: 'CDN源站', reason: '静态资源分发' },
  ],
};

export default function StorageTypesScene() {
  const [activeTab, setActiveTab] = useState<StorageType>('block');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTopology, setShowTopology] = useState(true);

  const steps = activeTab === 'block' ? blockStorageSteps : 
                activeTab === 'file' ? fileStorageSteps : objectStorageSteps;

  // 播放动画
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  // 重置步骤
  const handleTabChange = (tab: StorageType) => {
    setActiveTab(tab);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  // 获取拓扑节点
  const getTopologyNodes = () => {
    switch (activeTab) {
      case 'block': return blockNodes;
      case 'file': return fileNodes;
      case 'object': return objectNodes;
    }
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false} noHeightLimit={true}>
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* 左侧参数面板 */}
        <div className="col-span-3 space-y-3 h-full overflow-y-auto">
          {/* Tab切换 */}
          <div className="flex flex-col gap-2 bg-slate-800/50 p-2 rounded-xl">
            {[
              { key: 'block' as const, label: '块存储', icon: HardDrive, color: '#3b82f6' },
              { key: 'file' as const, label: '文件存储', icon: FolderOpen, color: '#f59e0b' },
              { key: 'object' as const, label: '对象存储', icon: Cloud, color: '#06b6d4' },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                    activeTab === tab.key 
                      ? 'bg-slate-700 shadow-lg border border-slate-600' 
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5" style={{ color: tab.color }} />
                  <span className={`text-sm font-medium ${activeTab === tab.key ? 'text-white' : 'text-gray-400'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 当前类型信息 */}
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 className="text-sm font-semibold mb-2" style={{ color: activeTab === 'block' ? '#3b82f6' : activeTab === 'file' ? '#f59e0b' : '#06b6d4' }}>
              {activeTab === 'block' ? '块存储 Block Storage' : activeTab === 'file' ? '文件存储 File Storage' : '对象存储 Object Storage'}
            </h4>
            <p className="text-xs text-slate-400">
              {activeTab === 'block' ? '固定大小数据块访问，适合高性能数据库' :
               activeTab === 'file' ? '层级目录树访问，适合文件共享协作' :
               '键值对访问，适合海量非结构化数据'}
            </p>
          </div>

          {/* 核心要点 */}
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">💡 核心要点</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="text-green-500">●</span>
                {activeTab === 'block' ? '极低延迟 (10-100μs)' :
                 activeTab === 'file' ? '多客户端共享访问' :
                 '近乎无限扩展能力'}
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-green-500">●</span>
                {activeTab === 'block' ? '极高IOPS (GB/s级)' :
                 activeTab === 'file' ? 'NFS/SMB协议标准' :
                 'S3 API广泛支持'}
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500">●</span>
                {activeTab === 'block' ? '成本较高' :
                 activeTab === 'file' ? '协议开销较大' :
                 '延迟较高 (10-100ms)'}
              </li>
            </ul>
          </div>

          {/* 典型应用 */}
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">📦 典型应用</h4>
            <div className="space-y-1.5">
              {useCases[activeTab].map((uc, idx) => (
                <div key={idx} className="text-xs">
                  <span className="text-slate-300">{uc.name}</span>
                  <p className="text-slate-500 text-[10px]">{uc.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中间可视化区域 */}
        <div className="col-span-6 space-y-4 h-full overflow-y-auto">
          {/* 拓扑可视化 */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                {activeTab === 'block' && <HardDrive className="w-5 h-5 text-blue-400" />}
                {activeTab === 'file' && <FolderOpen className="w-5 h-5 text-amber-400" />}
                {activeTab === 'object' && <Cloud className="w-5 h-5 text-cyan-400" />}
                {activeTab === 'block' ? '块存储架构' : activeTab === 'file' ? '文件存储架构' : '对象存储架构'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { setCurrentStep(0); setIsPlaying(true); }}
                  className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30"
                >▶ 播放</button>
                <button
                  onClick={() => { setIsPlaying(false); setCurrentStep(0); }}
                  className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs hover:bg-gray-500/30"
                >↺ 重置</button>
              </div>
            </div>

            {/* 拓扑图 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative h-48 bg-slate-800/50 rounded-lg overflow-hidden"
              >
                {/* 连接线 */}
                <svg className="absolute inset-0 w-full h-full">
                  {activeTab === 'block' && (
                    <>
                      <line x1="18%" y1="50%" x2="28%" y2="50%" stroke="#475569" strokeWidth="2" />
                      <line x1="32%" y1="50%" x2="43%" y2="50%" stroke="#475569" strokeWidth="2" />
                      <line x1="47%" y1="50%" x2="63%" y2="50%" stroke="#475569" strokeWidth="2" />
                      <line x1="67%" y1="50%" x2="80%" y2="50%" stroke="#475569" strokeWidth="2" />
                      <motion.line
                        key="block-flow"
                        x1="15%" y1="50%" x2="78%" y2="50%"
                        stroke="#3b82f6" strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: [0, 1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </>
                  )}
                  {activeTab === 'file' && (
                    <>
                      <line x1="15%" y1="35%" x2="45%" y2="50%" stroke="#475569" strokeWidth="2" />
                      <line x1="15%" y1="65%" x2="45%" y2="50%" stroke="#475569" strokeWidth="2" />
                      <line x1="55%" y1="50%" x2="70%" y2="35%" stroke="#475569" strokeWidth="2" />
                      <line x1="55%" y1="50%" x2="70%" y2="65%" stroke="#475569" strokeWidth="2" />
                      <motion.line
                        key="file-flow"
                        x1="18%" y1="40%" x2="68%" y2="40%"
                        stroke="#f59e0b" strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: [0, 1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </>
                  )}
                  {activeTab === 'object' && (
                    <>
                      <line x1="12%" y1="50%" x2="22%" y2="50%" stroke="#475569" strokeWidth="2" />
                      <line x1="26%" y1="50%" x2="36%" y2="35%" stroke="#475569" strokeWidth="2" />
                      <line x1="26%" y1="50%" x2="36%" y2="65%" stroke="#475569" strokeWidth="2" />
                      <line x1="40%" y1="35%" x2="58%" y2="30%" stroke="#475569" strokeWidth="2" />
                      <line x1="40%" y1="65%" x2="58%" y2="70%" stroke="#475569" strokeWidth="2" />
                      <line x1="40%" y1="35%" x2="58%" y2="45%" stroke="#475569" strokeWidth="2" />
                      <line x1="62%" y1="50%" x2="85%" y2="50%" stroke="#475569" strokeWidth="2" />
                      <motion.line
                        key="object-flow"
                        x1="10%" y1="50%" x2="65%" y2="50%"
                        stroke="#06b6d4" strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: [0, 1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </>
                  )}
                </svg>

                {/* 节点 */}
                {getTopologyNodes().map((node, idx) => {
                  const Icon = node.icon;
                  const isActive = idx <= currentStep;
                  
                  return (
                    <motion.div
                      key={node.id}
                      className="absolute flex flex-col items-center"
                      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300"
                        style={{ 
                          backgroundColor: `${node.color}20`,
                          border: `2px solid ${isActive ? node.color : '#475569'}`,
                          boxShadow: isActive ? `0 0 15px ${node.color}40` : 'none'
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: node.color }} />
                      </div>
                      <span className="mt-1.5 text-[10px] text-slate-300 font-medium whitespace-nowrap">
                        {node.name}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* 协议标签 */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeTab === 'block' && (
                <>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">FC</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">iSCSI</span>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">SCSI</span>
                </>
              )}
              {activeTab === 'file' && (
                <>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">NFSv4</span>
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">SMB3</span>
                  <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs">FTP</span>
                </>
              )}
              {activeTab === 'object' && (
                <>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">S3 API</span>
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs">Swift</span>
                  <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs">Azure Blob</span>
                </>
              )}
            </div>
          </div>

          {/* 流程步骤 */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">数据读写流程</h3>
            <div className="space-y-2">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                
                return (
                  <motion.div
                    key={step.id}
                    className={`relative p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-blue-500/10 border-blue-500' 
                        : isCompleted 
                          ? 'bg-green-500/5 border-green-500/30' 
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => setCurrentStep(idx)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                          isActive 
                            ? 'bg-blue-500 text-white' 
                            : isCompleted 
                              ? 'bg-green-500 text-white' 
                              : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-slate-300'}`}>
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-500">{step.desc}</p>
                      </div>
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: step.color }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 性能对比 */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">性能特征对比</h3>
            <div className="grid grid-cols-3 gap-3">
              {/* 延迟 */}
              <div className="bg-slate-800/50 rounded p-2.5">
                <div className="text-xs text-slate-400 mb-2">访问延迟</div>
                <div className="space-y-1.5">
                  {[
                    { name: '块', value: 95, color: '#3b82f6' },
                    { name: '文件', value: 60, color: '#f59e0b' },
                    { name: '对象', value: 20, color: '#06b6d4' },
                  ].map(item => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 w-5">{item.name}</span>
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color, width: `${item.value}%` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* 扩展性 */}
              <div className="bg-slate-800/50 rounded p-2.5">
                <div className="text-xs text-slate-400 mb-2">扩展能力</div>
                <div className="space-y-1.5">
                  {[
                    { name: '块', value: 40, color: '#3b82f6' },
                    { name: '文件', value: 60, color: '#f59e0b' },
                    { name: '对象', value: 100, color: '#06b6d4' },
                  ].map(item => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 w-5">{item.name}</span>
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color, width: `${item.value}%` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* 成本效率 */}
              <div className="bg-slate-800/50 rounded p-2.5">
                <div className="text-xs text-slate-400 mb-2">成本效率</div>
                <div className="space-y-1.5">
                  {[
                    { name: '块', value: 30, color: '#3b82f6' },
                    { name: '文件', value: 55, color: '#f59e0b' },
                    { name: '对象', value: 90, color: '#06b6d4' },
                  ].map(item => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 w-5">{item.name}</span>
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color, width: `${item.value}%` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧对比面板 */}
        <div className="col-span-3 space-y-3 h-full overflow-y-auto">
          {/* 详细对比表 */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">9维度详细对比</h3>
            <div className="space-y-1 text-[11px]">
              {comparisonData.map((row, idx) => (
                <div key={idx} className="border-b border-slate-800 pb-1.5 last:border-0">
                  <div className="text-slate-500 mb-0.5">{row.aspect}</div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-blue-300 truncate" title={row.block}>{row.block.split('(')[0]}</div>
                    <div className="text-amber-300 truncate" title={row.file}>{row.file.split('(')[0]}</div>
                    <div className="text-cyan-300 truncate" title={row.object}>{row.object.split('(')[0]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 核心要点速记 */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">💡 核心要点</h3>
            <div className="space-y-2">
              <div className="bg-blue-500/10 rounded p-2">
                <h4 className="text-xs font-medium text-blue-400">块存储 = 极致性能</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">直接块地址访问，无协议开销</p>
              </div>
              <div className="bg-amber-500/10 rounded p-2">
                <h4 className="text-xs font-medium text-amber-400">文件存储 = 共享协作</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">目录树组织，多客户端并发</p>
              </div>
              <div className="bg-cyan-500/10 rounded p-2">
                <h4 className="text-xs font-medium text-cyan-400">对象存储 = 海量弹性</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">RESTful API，几乎无限扩展</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
