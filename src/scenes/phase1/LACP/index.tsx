import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { Link2, Activity, Settings, RefreshCw, CheckCircle, AlertCircle, Zap, Server } from 'lucide-react';

// 内联类型定义
interface PhysicalLink {
  id: string;
  port: string;
  status: 'down' | 'negotiating' | 'up';
  partnerPort: string;
  actorPriority: number;
  partnerPriority: number;
  actorMac: string;
  partnerMac: string;
  speed: string;
}

interface TrafficFlow {
  id: string;
  srcMac: string;
  dstMac: string;
  srcIp: string;
  dstIp: string;
  linkId: string;
  color: string;
  linkIndex: number; // 用于在链路上显示顺序
}

type LoadBalanceMode = 'src-mac' | 'dst-mac' | 'src-dst-mac' | 'src-ip' | 'dst-ip' | 'src-dst-ip';

const loadBalanceModes: { id: LoadBalanceMode; name: string; description: string; formula: string }[] = [
  { id: 'src-mac', name: '源MAC', description: '基于源MAC地址负载均衡', formula: 'Hash = MAC源地址' },
  { id: 'dst-mac', name: '目的MAC', description: '基于目的MAC地址负载均衡', formula: 'Hash = MAC目的地址' },
  { id: 'src-dst-mac', name: '源目MAC', description: '基于源目MAC地址组合负载均衡', formula: 'Hash = MAC源⊕MAC目' },
  { id: 'src-ip', name: '源IP', description: '基于源IP地址负载均衡', formula: 'Hash = IP源地址' },
  { id: 'dst-ip', name: '目的IP', description: '基于目的IP地址负载均衡', formula: 'Hash = IP目的地址' },
  { id: 'src-dst-ip', name: '源目IP', description: '基于源目IP地址组合负载均衡（推荐）', formula: 'Hash = IP源⊕IP目' },
];

// 模拟终端设备
const hosts = [
  { mac: '00:0A:0A:00:00:01', ip: '192.168.1.10', name: 'PC-1' },
  { mac: '00:0A:0A:00:00:02', ip: '192.168.1.11', name: 'PC-2' },
  { mac: '00:0A:0A:00:00:03', ip: '192.168.1.12', name: 'PC-3' },
  { mac: '00:0A:0A:00:00:04', ip: '192.168.1.13', name: 'PC-4' },
  { mac: '00:0A:0A:00:00:05', ip: '192.168.1.14', name: 'Server-1' },
  { mac: '00:0A:0A:00:00:06', ip: '192.168.1.15', name: 'Server-2' },
  { mac: '00:0A:0A:00:00:07', ip: '192.168.1.16', name: 'Server-3' },
  { mac: '00:0A:0A:00:00:08', ip: '192.168.1.17', name: 'Server-4' },
  { mac: '00:0A:0A:00:00:09', ip: '192.168.1.18', name: 'PC-5' },
  { mac: '00:0A:0A:00:00:0A', ip: '192.168.1.19', name: 'PC-6' },
  { mac: '00:0A:0A:00:00:0B', ip: '192.168.1.20', name: 'PC-7' },
  { mac: '00:0A:0A:00:00:0C', ip: '192.168.1.21', name: 'PC-8' },
];

const initialLinks: PhysicalLink[] = [
  { id: 'link1', port: 'Eth1/0/1', status: 'down', partnerPort: 'Eth1/0/1', actorPriority: 32768, partnerPriority: 32768, actorMac: '00:11:22:33:44:01', partnerMac: '00:11:22:33:44:A1', speed: '10G' },
  { id: 'link2', port: 'Eth1/0/2', status: 'down', partnerPort: 'Eth1/0/2', actorPriority: 32768, partnerPriority: 32768, actorMac: '00:11:22:33:44:02', partnerMac: '00:11:22:33:44:A2', speed: '10G' },
  { id: 'link3', port: 'Eth1/0/3', status: 'down', partnerPort: 'Eth1/0/3', actorPriority: 32768, partnerPriority: 32768, actorMac: '00:11:22:33:44:03', partnerMac: '00:11:22:33:44:A3', speed: '10G' },
  { id: 'link4', port: 'Eth1/0/4', status: 'down', partnerPort: 'Eth1/0/4', actorPriority: 32768, partnerPriority: 32768, actorMac: '00:11:22:33:44:04', partnerMac: '00:11:22:33:44:A4', speed: '10G' },
];

export function LACPScene() {
  const [links, setLinks] = useState<PhysicalLink[]>(initialLinks);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LoadBalanceMode>('src-dst-ip');
  const [showTraffic, setShowTraffic] = useState(false);
  const [trafficFlows, setTrafficFlows] = useState<TrafficFlow[]>([]);
  const [trafficVersion, setTrafficVersion] = useState(0); // 用于强制刷新流量分配
  const linksRef = useRef(links);
  
  // 保持 linksRef 同步
  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  const sceneData = {
    id: 'lacp',
    title: '链路聚合LACP',
    description: 'LACP动态协商、负载均衡算法、链路故障切换可视化',
    phase: 1 as const,
    category: '交换技术',
    duration: '8-10分钟',
    difficulty: 'medium' as const,
  };

  const startNegotiation = useCallback(() => {
    setIsNegotiating(true);
    setLinks(prev => prev.map(link => ({ ...link, status: 'negotiating' })));

    // 模拟协商过程
    setTimeout(() => {
      setLinks(prev => prev.map(link => ({ ...link, status: 'up' })));
      setIsNegotiating(false);
    }, 2000);
  }, []);

  const resetLinks = useCallback(() => {
    setLinks(initialLinks);
    setIsNegotiating(false);
    setShowTraffic(false);
    setTrafficFlows([]);
    setTrafficVersion(0);
  }, []);

  // 根据负载均衡算法计算流应该走哪条链路
  const calculateLinkForFlow = useCallback((flow: { srcMac: string; dstMac: string; srcIp: string; dstIp: string }, activeLinks: PhysicalLink[], mode: LoadBalanceMode): string => {
    if (activeLinks.length === 0) return '';
    if (activeLinks.length === 1) return activeLinks[0].id;
    
    let hash: number;
    
    switch (mode) {
      case 'src-mac':
        hash = flow.srcMac.split(':').reduce((acc, val) => acc + parseInt(val, 16), 0);
        break;
      case 'dst-mac':
        hash = flow.dstMac.split(':').reduce((acc, val) => acc + parseInt(val, 16), 0);
        break;
      case 'src-dst-mac': {
        const srcSum = flow.srcMac.split(':').reduce((acc, val) => acc + parseInt(val, 16), 0);
        const dstSum = flow.dstMac.split(':').reduce((acc, val) => acc + parseInt(val, 16), 0);
        hash = srcSum ^ dstSum;
        break;
      }
      case 'src-ip':
        hash = flow.srcIp.split('.').reduce((acc, val) => acc + parseInt(val, 10), 0);
        break;
      case 'dst-ip':
        hash = flow.dstIp.split('.').reduce((acc, val) => acc + parseInt(val, 10), 0);
        break;
      case 'src-dst-ip': {
        const srcSum = flow.srcIp.split('.').reduce((acc, val) => acc + parseInt(val, 10), 0);
        const dstSum = flow.dstIp.split('.').reduce((acc, val) => acc + parseInt(val, 10), 0);
        hash = srcSum ^ dstSum;
        break;
      }
      default:
        hash = 0;
    }
    
    // 取模分配到活动链路
    const linkIndex = hash % activeLinks.length;
    return activeLinks[linkIndex].id;
  }, []);

  const simulateTraffic = useCallback(() => {
    setShowTraffic(true);
    const activeLinks = linksRef.current.filter(l => l.status === 'up');
    
    if (activeLinks.length === 0) {
      setTrafficFlows([]);
      return;
    }
    
    const colors = ['#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA', '#FB923C', '#2DD4BF', '#F87171'];
    
    // 生成12条真实流量流
    const flows: TrafficFlow[] = [];
    for (let i = 0; i < 12; i++) {
      const srcHost = hosts[i];
      const dstHost = hosts[(i + 4) % hosts.length]; // 随机目标
      
      const linkId = calculateLinkForFlow(
        { srcMac: srcHost.mac, dstMac: dstHost.mac, srcIp: srcHost.ip, dstIp: dstHost.ip },
        activeLinks,
        selectedMode
      );
      
      // 计算该链路上的第几个流（用于显示序号）
      const linkIndex = flows.filter(f => f.linkId === linkId).length;
      
      flows.push({
        id: `flow-${i}`,
        srcMac: srcHost.mac,
        dstMac: dstHost.mac,
        srcIp: srcHost.ip,
        dstIp: dstHost.ip,
        linkId,
        color: colors[linkIndex % colors.length],
        linkIndex,
      });
    }
    
    setTrafficFlows(flows);
    setTrafficVersion(v => v + 1);
  }, [selectedMode, calculateLinkForFlow]);

  const failLink = useCallback((linkId: string) => {
    const currentLinks = linksRef.current;
    const wasUp = currentLinks.find(l => l.id === linkId)?.status === 'up';
    
    if (!wasUp) return;
    
    setLinks(prev => prev.map(link => 
      link.id === linkId ? { ...link, status: 'down' } : link
    ));
    
    // 链路故障后重新计算流量分配
    if (showTraffic) {
      setTimeout(() => {
        const activeLinks = linksRef.current.filter(l => l.status === 'up');
        
        if (activeLinks.length === 0) {
          setTrafficFlows([]);
          return;
        }
        
        const colors = ['#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA', '#FB923C', '#2DD4BF', '#F87171'];
        
        // 重新计算所有流量的链路分配
        const flows: TrafficFlow[] = [];
        for (let i = 0; i < 12; i++) {
          const srcHost = hosts[i];
          const dstHost = hosts[(i + 4) % hosts.length];
          
          const newLinkId = calculateLinkForFlow(
            { srcMac: srcHost.mac, dstMac: dstHost.mac, srcIp: srcHost.ip, dstIp: dstHost.ip },
            activeLinks,
            selectedMode
          );
          
          const linkIndex = flows.filter(f => f.linkId === newLinkId).length;
          
          flows.push({
            id: `flow-${i}-v${Date.now()}`,
            srcMac: srcHost.mac,
            dstMac: dstHost.mac,
            srcIp: srcHost.ip,
            dstIp: dstHost.ip,
            linkId: newLinkId,
            color: colors[linkIndex % colors.length],
            linkIndex,
          });
        }
        
        setTrafficFlows(flows);
        setTrafficVersion(v => v + 1);
      }, 100);
    }
  }, [showTraffic, selectedMode, calculateLinkForFlow]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-400';
      case 'negotiating': return 'text-yellow-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'up': return 'bg-green-500/20 border-green-500/50';
      case 'negotiating': return 'bg-yellow-500/20 border-yellow-500/50';
      case 'down': return 'bg-red-500/20 border-red-500/50';
      default: return 'bg-gray-700/50 border-gray-600';
    }
  };

  // 计算每个链路的流量统计
  const getLinkStats = (linkId: string) => {
    const flows = trafficFlows.filter(f => f.linkId === linkId);
    return {
      count: flows.length,
      total: trafficFlows.length,
      percentage: trafficFlows.length > 0 ? Math.round((flows.length / trafficFlows.length) * 100) : 0,
      flows,
    };
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false} noHeightLimit={true}>
      <div className="space-y-6 h-full overflow-y-auto">
        {/* 控制按钮 */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={startNegotiation}
            disabled={isNegotiating || links.every(l => l.status === 'up')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold text-white transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isNegotiating ? 'animate-spin' : ''}`} />
            <span className="text-white font-bold">{isNegotiating ? '协商中...' : '启动LACP协商'}</span>
          </button>
          <button
            onClick={simulateTraffic}
            disabled={!links.some(l => l.status === 'up')}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold text-white transition-colors flex items-center gap-2"
          >
            <Activity className="w-5 h-5" />
            <span className="text-white font-bold">模拟流量</span>
          </button>
          <button
            onClick={resetLinks}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white transition-colors"
          >
            <span className="text-white font-bold">重置</span>
          </button>
        </div>

        {/* 拓扑图 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
            <Link2 className="w-5 h-5 text-blue-400" />
            LACP链路聚合拓扑
          </h3>
          
          <div className="flex items-center justify-center gap-16">
            {/* 交换机A */}
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-blue-600/20 border-2 border-blue-500 rounded-xl flex flex-col items-center justify-center mb-4">
                <Server className="w-12 h-12 text-blue-400 mb-2" />
                <span className="font-bold text-white text-lg">交换机A</span>
                <span className="text-sm text-blue-300 font-medium">Actor</span>
              </div>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={link.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${getStatusBg(link.status)}`} />
                    <span className="text-sm font-mono text-white font-medium">{link.port}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 链路 */}
            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <div key={link.id} className="relative">
                  <motion.button
                    onClick={() => link.status === 'up' && failLink(link.id)}
                    disabled={link.status !== 'up'}
                    className={`w-48 h-8 rounded-lg border-2 transition-all ${getStatusBg(link.status)} ${
                      link.status === 'up' ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'
                    }`}
                    whileHover={link.status === 'up' ? { scale: 1.02 } : {}}
                    whileTap={link.status === 'up' ? { scale: 0.98 } : {}}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {link.status === 'up' && <CheckCircle className="w-4 h-4" />}
                      {link.status === 'negotiating' && <RefreshCw className="w-4 h-4 animate-spin" />}
                      {link.status === 'down' && <AlertCircle className="w-4 h-4" />}
                      <span className="text-xs font-mono uppercase font-bold text-white">{link.status}</span>
                    </div>
                  </motion.button>
                  
                  {/* 流量动画 */}
                  <AnimatePresence>
                    {showTraffic && link.status === 'up' && trafficFlows
                      .filter(f => f.linkId === link.id)
                      .map((flow, i) => (
                        <motion.div
                          key={flow.id}
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                          style={{ backgroundColor: flow.color }}
                          initial={{ left: '0%' }}
                          animate={{ left: '100%' }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: 'linear',
                          }}
                        />
                      ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* 交换机B */}
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-purple-600/20 border-2 border-purple-500 rounded-xl flex flex-col items-center justify-center mb-4">
                <Server className="w-12 h-12 text-purple-400 mb-2" />
                <span className="font-bold text-white text-lg">交换机B</span>
                <span className="text-sm text-purple-300 font-medium">Partner</span>
              </div>
              <div className="space-y-2">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${getStatusBg(link.status)}`} />
                    <span className="text-sm font-mono text-white font-medium">{link.partnerPort}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showTraffic && (
            <div className="mt-6 space-y-4">
              {/* 流量分配统计 */}
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400 mb-3">
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold">流量负载均衡中</span>
                  <span className="ml-auto text-sm text-gray-300">
                    当前算法: <span className="text-white font-bold">{loadBalanceModes.find(m => m.id === selectedMode)?.name}</span>
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  公式: <code className="bg-gray-700 px-2 py-1 rounded">{loadBalanceModes.find(m => m.id === selectedMode)?.formula}</code>
                </div>
                
                {/* 链路流量分配条 */}
                <div className="space-y-2">
                  {links.filter(l => l.status === 'up').map((link, idx) => {
                    const stats = getLinkStats(link.id);
                    return (
                      <div key={link.id} className="flex items-center gap-3">
                        <div className={`w-20 text-xs font-mono ${link.status === 'up' ? 'text-green-400' : 'text-gray-500'}`}>
                          {link.port}
                        </div>
                        <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                          <motion.div
                            key={`${link.id}-${trafficVersion}`}
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full flex items-center justify-end pr-2"
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.percentage}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          >
                            {stats.count > 0 && (
                              <span className="text-xs font-bold text-white">{stats.count}条</span>
                            )}
                          </motion.div>
                        </div>
                        <div className="w-12 text-xs text-right text-gray-400">
                          {stats.percentage}%
                        </div>
                      </div>
                    );
                  })}
                  {links.filter(l => l.status === 'down').map(link => (
                    <div key={link.id} className="flex items-center gap-3 opacity-50">
                      <div className="w-20 text-xs font-mono text-red-400 line-through">
                        {link.port}
                      </div>
                      <div className="flex-1 bg-gray-700 rounded-full h-4">
                        <div className="h-full bg-red-500/50 rounded-full w-full" />
                      </div>
                      <div className="w-12 text-xs text-right text-red-400">
                        故障
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-sm text-gray-300 mt-3">
                  点击任意绿色链路可模拟链路故障，观察流量自动切换到其他链路。
                </p>
              </div>
              
              {/* 当前活跃流量详情 */}
              <div className="bg-gray-800/80 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-white mb-3">当前流量分配详情</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {trafficFlows.map((flow, idx) => (
                    <div 
                      key={flow.id}
                      className="text-xs p-2 rounded bg-gray-700/50 border border-gray-600"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: flow.color }} />
                        <span className="text-gray-400">流{idx + 1}</span>
                      </div>
                      <div className="text-gray-300 truncate font-mono">
                        {flow.srcIp}
                      </div>
                      <div className="text-gray-500 text-center">↓</div>
                      <div className="text-gray-300 truncate font-mono">
                        {flow.dstIp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 负载均衡模式选择 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
            <Settings className="w-5 h-5 text-purple-400" />
            负载均衡算法
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {loadBalanceModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setSelectedMode(mode.id);
                  // 如果已有流量，重新计算
                  if (showTraffic && links.some(l => l.status === 'up')) {
                    simulateTraffic();
                  }
                }}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedMode === mode.id
                    ? 'bg-purple-600/30 border-purple-500'
                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className={`font-bold ${selectedMode === mode.id ? 'text-white' : 'text-gray-200'}`}>{mode.name}</div>
                <div className={`text-xs ${selectedMode === mode.id ? 'text-purple-200' : 'text-gray-300'}`}>{mode.description}</div>
                <div className={`text-xs font-mono mt-1 ${selectedMode === mode.id ? 'text-green-400' : 'text-gray-500'}`}>
                  {mode.formula}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <span className="font-semibold text-yellow-400">实战建议：</span>
                生产环境中通常使用<span className="text-white font-semibold">源目IP</span>或<span className="text-white font-semibold">源目MAC</span>组合模式，
                可以避免单一终端流量集中到同一条链路，实现更均衡的负载分配。
              </div>
            </div>
          </div>
        </div>

        {/* LACP知识点 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4 text-white">LACP协商过程</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">1</div>
                <div>
                  <div className="font-bold text-white">发送LACPDU</div>
                  <div className="text-gray-300">双方周期性发送LACP数据单元</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">2</div>
                <div>
                  <div className="font-bold text-white">比较系统优先级</div>
                  <div className="text-gray-300">优先级+MAC地址决定主动端</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">3</div>
                <div>
                  <div className="font-bold text-white">选择活动接口</div>
                  <div className="text-gray-300">根据端口优先级选择活动/非活动接口</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white">4</div>
                <div>
                  <div className="font-bold text-white">聚合成功</div>
                  <div className="text-gray-300">形成Eth-Trunk，开始负载均衡</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4 text-white">LACP关键参数</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-200 font-medium">系统优先级</span>
                <span className="font-mono text-white font-bold">32768（默认）</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-200 font-medium">端口优先级</span>
                <span className="font-mono text-white font-bold">32768（默认）</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-200 font-medium">LACPDU周期</span>
                <span className="font-mono text-white font-bold">1秒（Fast）/30秒（Slow）</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-200 font-medium">超时时间</span>
                <span className="font-mono text-white font-bold">3×周期</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-200 font-medium">最大活动接口</span>
                <span className="font-mono text-white font-bold">8个（默认）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
