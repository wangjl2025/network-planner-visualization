import React, { useState, useCallback } from 'react';
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
}

type LoadBalanceMode = 'src-mac' | 'dst-mac' | 'src-dst-mac' | 'src-ip' | 'dst-ip' | 'src-dst-ip';

const loadBalanceModes: { id: LoadBalanceMode; name: string; description: string }[] = [
  { id: 'src-mac', name: '源MAC', description: '基于源MAC地址负载均衡' },
  { id: 'dst-mac', name: '目的MAC', description: '基于目的MAC地址负载均衡' },
  { id: 'src-dst-mac', name: '源目MAC', description: '基于源目MAC地址组合负载均衡' },
  { id: 'src-ip', name: '源IP', description: '基于源IP地址负载均衡' },
  { id: 'dst-ip', name: '目的IP', description: '基于目的IP地址负载均衡' },
  { id: 'src-dst-ip', name: '源目IP', description: '基于源目IP地址组合负载均衡（推荐）' },
];

const initialLinks: PhysicalLink[] = [
  { id: 'link1', port: 'Eth1/0/1', status: 'down', partnerPort: 'Eth1/0/1', actorPriority: 32768, partnerPriority: 32768, actorMac: '00:11:22:33:44:01', partnerMac: '00:11:22:33:44:A1' },
  { id: 'link2', port: 'Eth1/0/2', status: 'down', partnerPort: 'Eth1/0/2', actorPriority: 32768, partnerPriority: 32768, actorMac: '00:11:22:33:44:02', partnerMac: '00:11:22:33:44:A2' },
  { id: 'link3', port: 'Eth1/0/3', status: 'down', partnerPort: 'Eth1/0/3', actorPriority: 32768, partnerPriority: 32768, actorMac: '00:11:22:33:44:03', partnerMac: '00:11:22:33:44:A3' },
  { id: 'link4', port: 'Eth1/0/4', status: 'down', partnerPort: 'Eth1/0/4', actorPriority: 32768, partnerPriority: 32768, actorMac: '00:11:22:33:44:04', partnerMac: '00:11:22:33:44:A4' },
];

export function LACPScene() {
  const [links, setLinks] = useState<PhysicalLink[]>(initialLinks);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LoadBalanceMode>('src-dst-ip');
  const [showTraffic, setShowTraffic] = useState(false);
  const [trafficFlows, setTrafficFlows] = useState<{ id: string; linkId: string; color: string }[]>([]);

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
  }, []);

  const simulateTraffic = useCallback(() => {
    setShowTraffic(true);
    const activeLinks = links.filter(l => l.status === 'up');
    const colors = ['#60A5FA', '#34D399', '#F472B6', '#FBBF24'];
    
    const flows = Array.from({ length: 12 }, (_, i) => ({
      id: `flow-${i}`,
      linkId: activeLinks[i % activeLinks.length]?.id || 'link1',
      color: colors[i % colors.length],
    }));
    
    setTrafficFlows(flows);
  }, [links]);

  const failLink = useCallback((linkId: string) => {
    setLinks(prev => prev.map(link => 
      link.id === linkId ? { ...link, status: 'down' } : link
    ));
    if (showTraffic) {
      setTimeout(() => simulateTraffic(), 500);
    }
  }, [showTraffic, simulateTraffic]);

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

  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="space-y-6 h-full overflow-y-auto">
        {/* 控制按钮 */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={startNegotiation}
            disabled={isNegotiating || links.every(l => l.status === 'up')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isNegotiating ? 'animate-spin' : ''}`} />
            {isNegotiating ? '协商中...' : '启动LACP协商'}
          </button>
          <button
            onClick={simulateTraffic}
            disabled={!links.some(l => l.status === 'up')}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Activity className="w-5 h-5" />
            模拟流量
          </button>
          <button
            onClick={resetLinks}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            重置
          </button>
        </div>

        {/* 拓扑图 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-400" />
            LACP链路聚合拓扑
          </h3>
          
          <div className="flex items-center justify-center gap-16">
            {/* 交换机A */}
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-blue-600/20 border-2 border-blue-500 rounded-xl flex flex-col items-center justify-center mb-4">
                <Server className="w-12 h-12 text-blue-400 mb-2" />
                <span className="font-bold">交换机A</span>
                <span className="text-xs text-gray-400">Actor</span>
              </div>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={link.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${getStatusBg(link.status)}`} />
                    <span className="text-sm font-mono">{link.port}</span>
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
                      <span className="text-xs font-mono uppercase">{link.status}</span>
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
                <span className="font-bold">交换机B</span>
                <span className="text-xs text-gray-400">Partner</span>
              </div>
              <div className="space-y-2">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${getStatusBg(link.status)}`} />
                    <span className="text-sm font-mono">{link.partnerPort}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showTraffic && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">流量负载均衡中</span>
              </div>
              <p className="text-sm text-gray-400">
                流量根据{loadBalanceModes.find(m => m.id === selectedMode)?.name}模式分散到各条活跃链路上。
                点击任意绿色链路可模拟链路故障，观察流量自动切换到其他链路。
              </p>
            </div>
          )}
        </div>

        {/* 负载均衡模式选择 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            负载均衡算法
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {loadBalanceModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedMode === mode.id
                    ? 'bg-purple-600/30 border-purple-500'
                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">{mode.name}</div>
                <div className="text-xs text-gray-400">{mode.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* LACP知识点 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">LACP协商过程</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <div className="font-medium">发送LACPDU</div>
                  <div className="text-gray-400">双方周期性发送LACP数据单元</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <div className="font-medium">比较系统优先级</div>
                  <div className="text-gray-400">优先级+MAC地址决定主动端</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <div className="font-medium">选择活动接口</div>
                  <div className="text-gray-400">根据端口优先级选择活动/非活动接口</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold">4</div>
                <div>
                  <div className="font-medium">聚合成功</div>
                  <div className="text-gray-400">形成Eth-Trunk，开始负载均衡</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">LACP关键参数</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-400">系统优先级</span>
                <span className="font-mono">32768（默认）</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-400">端口优先级</span>
                <span className="font-mono">32768（默认）</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-400">LACPDU周期</span>
                <span className="font-mono">1秒（Fast）/30秒（Slow）</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-400">超时时间</span>
                <span className="font-mono">3×周期</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                <span className="text-gray-400">最大活动接口</span>
                <span className="font-mono">8个（默认）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
