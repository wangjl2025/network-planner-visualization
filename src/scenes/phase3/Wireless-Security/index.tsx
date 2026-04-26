import React, { useState } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { motion } from 'framer-motion';
import { Wifi, Lock, Shield, AlertTriangle, CheckCircle, XCircle, Smartphone } from 'lucide-react';

interface SecurityProtocol {
  id: string;
  name: string;
  year: string;
  encryption: string;
  authentication: string;
  keyLength: string;
  vulnerabilities: string[];
  status: 'deprecated' | 'legacy' | 'current' | 'recommended';
}

const protocols: SecurityProtocol[] = [
  {
    id: 'wep',
    name: 'WEP',
    year: '1997',
    encryption: 'RC4',
    authentication: '开放/共享密钥',
    keyLength: '64/128 bit',
    vulnerabilities: [
      'IV向量太短(24位)易重复',
      '弱密钥漏洞',
      'CRC32完整性校验不可靠',
      '可在数分钟内破解',
    ],
    status: 'deprecated',
  },
  {
    id: 'wpa',
    name: 'WPA',
    year: '2003',
    encryption: 'TKIP/RC4',
    authentication: '802.1X/PSK',
    keyLength: '128 bit',
    vulnerabilities: [
      'TKIP存在安全漏洞',
      '可注入数据包',
      '已被WPA2取代',
    ],
    status: 'legacy',
  },
  {
    id: 'wpa2',
    name: 'WPA2',
    year: '2004',
    encryption: 'AES-CCMP',
    authentication: '802.1X/PSK',
    keyLength: '128 bit',
    vulnerabilities: [
      'KRACK攻击(密钥重装)',
      '弱密码可被暴力破解',
      '企业版更安全',
    ],
    status: 'current',
  },
  {
    id: 'wpa3',
    name: 'WPA3',
    year: '2018',
    encryption: 'AES-GCMP-256',
    authentication: 'SAE/802.1X',
    keyLength: '192 bit',
    vulnerabilities: [
      'Dragonblood漏洞(已修复)',
      '目前最安全的Wi-Fi安全标准',
    ],
    status: 'recommended',
  },
];

const statusColors = {
  deprecated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  legacy: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  current: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  recommended: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const statusLabels = {
  deprecated: '已淘汰',
  legacy: ' legacy',
  current: '主流使用',
  recommended: '推荐使用',
};

export default function WirelessSecurity() {
  const [selectedProtocol, setSelectedProtocol] = useState<SecurityProtocol>(protocols[2]);
  const [showHandshake, setShowHandshake] = useState(false);

  const scene = {
    id: 'wireless-security',
    title: '无线网络安全：WPA/WPA2/WPA3',
    description: 'Wi-Fi安全协议演进：WEP→WPA→WPA2→WPA3，加密算法对比与安全漏洞分析',
    phase: 3 as const,
    category: '无线安全',
    difficulty: 'medium' as const,
    duration: '8-10分钟',
  };

  return (
    <SceneLayout scene={scene} noHeightLimit>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* 左侧：协议时间线 */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            安全协议演进
          </h3>
          <div className="relative">
            {/* 时间线 */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
            
            {protocols.map((protocol, index) => (
              <motion.button
                key={protocol.id}
                onClick={() => {
                  setSelectedProtocol(protocol);
                  setShowHandshake(false);
                }}
                className={`relative w-full text-left mb-4 pl-12 pr-4 py-3 rounded-lg transition-all ${
                  selectedProtocol.id === protocol.id
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* 时间点 */}
                <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                  selectedProtocol.id === protocol.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-300 bg-white dark:bg-slate-800'
                }`}></div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {protocol.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {protocol.year}年发布
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${statusColors[protocol.status]}`}>
                    {statusLabels[protocol.status]}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* 安全建议 */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800 dark:text-green-300">安全建议</span>
            </div>
            <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
              <li>• 使用WPA3或WPA2-AES</li>
              <li>• 设置强密码(12位以上)</li>
              <li>• 定期更新固件</li>
              <li>• 禁用WPS功能</li>
              <li>• 启用访客网络隔离</li>
            </ul>
          </div>
        </div>

        {/* 右侧：协议详情 */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            key={selectedProtocol.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  selectedProtocol.status === 'deprecated' ? 'bg-red-100 dark:bg-red-900/30' :
                  selectedProtocol.status === 'legacy' ? 'bg-orange-100 dark:bg-orange-900/30' :
                  selectedProtocol.status === 'current' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  'bg-green-100 dark:bg-green-900/30'
                }`}>
                  <Wifi className={`w-8 h-8 ${
                    selectedProtocol.status === 'deprecated' ? 'text-red-600' :
                    selectedProtocol.status === 'legacy' ? 'text-orange-600' :
                    selectedProtocol.status === 'current' ? 'text-blue-600' :
                    'text-green-600'
                  }`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {selectedProtocol.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[selectedProtocol.status]}`}>
                      {statusLabels[selectedProtocol.status]}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedProtocol.year}年发布
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 技术参数 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                <Lock className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <div className="text-xs text-slate-500 dark:text-slate-400">加密算法</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedProtocol.encryption}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                <Shield className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <div className="text-xs text-slate-500 dark:text-slate-400">认证方式</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedProtocol.authentication}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                <Smartphone className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <div className="text-xs text-slate-500 dark:text-slate-400">密钥长度</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedProtocol.keyLength}
                </div>
              </div>
            </div>

            {/* 漏洞分析 */}
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                已知漏洞与风险
              </h4>
              <div className="space-y-2">
                {selectedProtocol.vulnerabilities.map((vuln, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-2 text-slate-700 dark:text-slate-300"
                  >
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    {vuln}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 四步握手演示按钮 */}
            {(selectedProtocol.id === 'wpa2' || selectedProtocol.id === 'wpa3') && (
              <motion.button
                onClick={() => setShowHandshake(!showHandshake)}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {showHandshake ? '隐藏四步握手过程' : '查看四步握手过程'}
              </motion.button>
            )}
          </motion.div>

          {/* 四步握手可视化 */}
          {showHandshake && (selectedProtocol.id === 'wpa2' || selectedProtocol.id === 'wpa3') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
            >
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                {selectedProtocol.id === 'wpa3' ? 'WPA3 SAE握手过程' : 'WPA2 四步握手过程'}
              </h3>
              
              <div className="relative">
                {/* 握手步骤 */}
                <div className="flex justify-around mb-8">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                      <Smartphone className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">客户端</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                      <Wifi className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">AP</div>
                  </div>
                </div>

                {/* 步骤 */}
                <div className="space-y-4">
                  {selectedProtocol.id === 'wpa2' ? (
                    <>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">1</div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">AP → Client</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">发送ANonce(随机数)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">2</div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">Client → AP</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">发送SNonce + MIC</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">3</div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">AP → Client</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">发送GTK + MIC</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">4</div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">Client → AP</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">确认ACK</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold">1</div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">Commit阶段</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">交换Commit消息，进行密码学承诺</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold">2</div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">Confirm阶段</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">确认密钥交换完成</div>
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-sm text-green-700 dark:text-green-400">
                          <strong>SAE优势：</strong>即使密码较弱也能抵御离线字典攻击，提供前向保密
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* 对比表 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              协议对比表
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 text-slate-600 dark:text-slate-400">特性</th>
                    <th className="text-left py-3 text-slate-600 dark:text-slate-400">WEP</th>
                    <th className="text-left py-3 text-slate-600 dark:text-slate-400">WPA</th>
                    <th className="text-left py-3 text-slate-600 dark:text-slate-400">WPA2</th>
                    <th className="text-left py-3 text-slate-600 dark:text-slate-400">WPA3</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-300">
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-3">加密算法</td>
                    <td>RC4</td>
                    <td>TKIP/RC4</td>
                    <td>AES-CCMP</td>
                    <td>AES-GCMP-256</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-3">密钥长度</td>
                    <td>64/128bit</td>
                    <td>128bit</td>
                    <td>128bit</td>
                    <td>192bit</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-3">认证方式</td>
                    <td>PSK</td>
                    <td>802.1X/PSK</td>
                    <td>802.1X/PSK</td>
                    <td>SAE/802.1X</td>
                  </tr>
                  <tr>
                    <td className="py-3">安全等级</td>
                    <td><span className="text-red-600">极低</span></td>
                    <td><span className="text-orange-600">中等</span></td>
                    <td><span className="text-blue-600">高</span></td>
                    <td><span className="text-green-600">最高</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
