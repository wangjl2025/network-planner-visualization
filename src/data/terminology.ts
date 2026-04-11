// 网络术语中英文对照表
// 统一全站术语翻译，确保一致性

export type Terminology = {
  en: string;
  cn: string;
  abbreviation?: string;
  description?: string;
}

// 按类别组织的术语表
export const terminologyCategories = {
  // 路由协议
  routing: [
    { en: 'Open Shortest Path First', cn: '开放式最短路径优先', abbreviation: 'OSPF' },
    { en: 'Border Gateway Protocol', cn: '边界网关协议', abbreviation: 'BGP' },
    { en: 'Intermediate System to Intermediate System', cn: '中间系统到中间系统', abbreviation: 'IS-IS' },
    { en: 'Routing Information Protocol', cn: '路由信息协议', abbreviation: 'RIP' },
    { en: 'Enhanced Interior Gateway Routing Protocol', cn: '增强型内部网关路由协议', abbreviation: 'EIGRP' },
    { en: 'Link State Advertisement', cn: '链路状态通告', abbreviation: 'LSA' },
    { en: 'Link State Database', cn: '链路状态数据库', abbreviation: 'LSDB' },
    { en: 'Shortest Path First', cn: '最短路径优先', abbreviation: 'SPF' },
    { en: 'Shortest Path Tree', cn: '最短路径树', abbreviation: 'SPT' },
    { en: 'Designated Router', cn: '指定路由器', abbreviation: 'DR' },
    { en: 'Backup Designated Router', cn: '备份指定路由器', abbreviation: 'BDR' },
    { en: 'Area Border Router', cn: '区域边界路由器', abbreviation: 'ABR' },
    { en: 'Autonomous System Boundary Router', cn: '自治系统边界路由器', abbreviation: 'ASBR' },
    { en: 'Not-So-Stubby Area', cn: '非完全末梢区域', abbreviation: 'NSSA' },
    { en: 'Totally Stubby Area', cn: '完全末梢区域', abbreviation: 'TSA' },
    { en: 'Route Reflector', cn: '路由反射器', abbreviation: 'RR' },
    { en: 'Route Reflector Client', cn: '路由反射器客户端', abbreviation: 'RRC' },
    { en: 'Confederation', cn: '联盟', abbreviation: '' },
    { en: 'Autonomous System', cn: '自治系统', abbreviation: 'AS' },
    { en: 'Multi-Exit Discriminator', cn: '多出口区分符', abbreviation: 'MED' },
    { en: 'Local Preference', cn: '本地优先级', abbreviation: '' },
    { en: 'Next Hop', cn: '下一跳', abbreviation: '' },
    { en: 'Origin', cn: '起源', abbreviation: '' },
    { en: 'AS Path', cn: 'AS路径', abbreviation: '' },
    { en: 'Community', cn: '团体属性', abbreviation: '' },
    { en: 'Cluster ID', cn: '集群标识符', abbreviation: '' },
    { en: 'Originator ID', cn: '发起者标识符', abbreviation: '' },
  ],

  // 交换技术
  switching: [
    { en: 'Spanning Tree Protocol', cn: '生成树协议', abbreviation: 'STP' },
    { en: 'Rapid Spanning Tree Protocol', cn: '快速生成树协议', abbreviation: 'RSTP' },
    { en: 'Multiple Spanning Tree Protocol', cn: '多生成树协议', abbreviation: 'MSTP' },
    { en: 'Bridge Protocol Data Unit', cn: '桥协议数据单元', abbreviation: 'BPDU' },
    { en: 'Root Bridge', cn: '根桥', abbreviation: '' },
    { en: 'Root Port', cn: '根端口', abbreviation: '' },
    { en: 'Designated Port', cn: '指定端口', abbreviation: '' },
    { en: 'Blocking Port', cn: '阻塞端口', abbreviation: '' },
    { en: 'Virtual Local Area Network', cn: '虚拟局域网', abbreviation: 'VLAN' },
    { en: 'Virtual Trunking Protocol', cn: '虚拟干道协议', abbreviation: 'VTP' },
    { en: 'Inter-Switch Link', cn: '交换机间链路', abbreviation: 'ISL' },
    { en: 'IEEE 802.1Q', cn: 'IEEE 802.1Q标签', abbreviation: '' },
    { en: 'Access Port', cn: '接入端口', abbreviation: '' },
    { en: 'Trunk Port', cn: '干道端口', abbreviation: '' },
    { en: 'Hybrid Port', cn: '混合端口', abbreviation: '' },
    { en: 'Native VLAN', cn: '本征VLAN', abbreviation: '' },
    { en: 'Link Aggregation Control Protocol', cn: '链路聚合控制协议', abbreviation: 'LACP' },
    { en: 'Port Channel', cn: '端口通道', abbreviation: '' },
    { en: 'EtherChannel', cn: '以太通道', abbreviation: '' },
  ],

  // 网络虚拟化
  virtualization: [
    { en: 'Virtual Extensible LAN', cn: '虚拟扩展局域网', abbreviation: 'VXLAN' },
    { en: 'Virtual Tunnel End Point', cn: '虚拟隧道端点', abbreviation: 'VTEP' },
    { en: 'Virtual Network Identifier', cn: '虚拟网络标识符', abbreviation: 'VNI' },
    { en: 'Network Virtualization Overlays', cn: '网络虚拟化覆盖', abbreviation: 'NVO3' },
    { en: 'Generic Protocol Extension', cn: '通用协议扩展', abbreviation: 'GPE' },
    { en: 'Network Service Header', cn: '网络服务头', abbreviation: 'NSH' },
    { en: 'Overlay Network', cn: '覆盖网络', abbreviation: '' },
    { en: 'Underlay Network', cn: '底层网络', abbreviation: '' },
    { en: 'Software-Defined Networking', cn: '软件定义网络', abbreviation: 'SDN' },
    { en: 'Network Functions Virtualization', cn: '网络功能虚拟化', abbreviation: 'NFV' },
    { en: 'OpenFlow', cn: '开放流', abbreviation: '' },
    { en: 'Control Plane', cn: '控制平面', abbreviation: '' },
    { en: 'Data Plane', cn: '数据平面', abbreviation: '' },
    { en: 'Management Plane', cn: '管理平面', abbreviation: '' },
  ],

  // MPLS与Segment Routing
  mpls: [
    { en: 'Multiprotocol Label Switching', cn: '多协议标签交换', abbreviation: 'MPLS' },
    { en: 'Label Switched Path', cn: '标签交换路径', abbreviation: 'LSP' },
    { en: 'Label Edge Router', cn: '标签边缘路由器', abbreviation: 'LER' },
    { en: 'Label Switching Router', cn: '标签交换路由器', abbreviation: 'LSR' },
    { en: 'Forwarding Equivalence Class', cn: '转发等价类', abbreviation: 'FEC' },
    { en: 'Label Distribution Protocol', cn: '标签分发协议', abbreviation: 'LDP' },
    { en: 'Resource Reservation Protocol', cn: '资源预留协议', abbreviation: 'RSVP' },
    { en: 'Constraint-Based LSP', cn: '基于约束的LSP', abbreviation: 'CR-LSP' },
    { en: 'Provider Edge', cn: '运营商边缘', abbreviation: 'PE' },
    { en: 'Customer Edge', cn: '用户边缘', abbreviation: 'CE' },
    { en: 'Provider', cn: '运营商', abbreviation: 'P' },
    { en: 'Route Distinguisher', cn: '路由区分符', abbreviation: 'RD' },
    { en: 'Route Target', cn: '路由目标', abbreviation: 'RT' },
    { en: 'Virtual Routing and Forwarding', cn: '虚拟路由转发', abbreviation: 'VRF' },
    { en: 'Segment Routing', cn: '段路由', abbreviation: 'SR' },
    { en: 'Segment Routing over IPv6', cn: 'IPv6段路由', abbreviation: 'SRv6' },
    { en: 'Segment Routing Header', cn: '段路由头', abbreviation: 'SRH' },
    { en: 'Segment ID', cn: '段标识符', abbreviation: 'SID' },
    { en: 'Prefix Segment', cn: '前缀段', abbreviation: '' },
    { en: 'Adjacency Segment', cn: '邻接段', abbreviation: '' },
    { en: 'Binding Segment', cn: '绑定段', abbreviation: '' },
  ],

  // 网络安全
  security: [
    { en: 'Access Control List', cn: '访问控制列表', abbreviation: 'ACL' },
    { en: 'Firewall', cn: '防火墙', abbreviation: '' },
    { en: 'Packet Filter', cn: '包过滤', abbreviation: '' },
    { en: 'Stateful Inspection', cn: '状态检测', abbreviation: '' },
    { en: 'Intrusion Detection System', cn: '入侵检测系统', abbreviation: 'IDS' },
    { en: 'Intrusion Prevention System', cn: '入侵防御系统', abbreviation: 'IPS' },
    { en: 'Network Address Translation', cn: '网络地址转换', abbreviation: 'NAT' },
    { en: 'Port Address Translation', cn: '端口地址转换', abbreviation: 'PAT' },
    { en: 'Demilitarized Zone', cn: '非军事区', abbreviation: 'DMZ' },
    { en: 'Virtual Private Network', cn: '虚拟专用网', abbreviation: 'VPN' },
    { en: 'IP Security', cn: 'IP安全', abbreviation: 'IPsec' },
    { en: 'Internet Key Exchange', cn: '互联网密钥交换', abbreviation: 'IKE' },
    { en: 'Security Association', cn: '安全关联', abbreviation: 'SA' },
    { en: 'Encapsulating Security Payload', cn: '封装安全载荷', abbreviation: 'ESP' },
    { en: 'Authentication Header', cn: '认证头', abbreviation: 'AH' },
    { en: 'Transport Layer Security', cn: '传输层安全', abbreviation: 'TLS' },
    { en: 'Secure Sockets Layer', cn: '安全套接层', abbreviation: 'SSL' },
    { en: 'Public Key Infrastructure', cn: '公钥基础设施', abbreviation: 'PKI' },
    { en: 'Certificate Authority', cn: '证书颁发机构', abbreviation: 'CA' },
    { en: 'Digital Certificate', cn: '数字证书', abbreviation: '' },
    { en: 'Denial of Service', cn: '拒绝服务', abbreviation: 'DoS' },
    { en: 'Distributed Denial of Service', cn: '分布式拒绝服务', abbreviation: 'DDoS' },
    { en: 'Deep Packet Inspection', cn: '深度包检测', abbreviation: 'DPI' },
  ],

  // 网络管理
  management: [
    { en: 'Simple Network Management Protocol', cn: '简单网络管理协议', abbreviation: 'SNMP' },
    { en: 'Management Information Base', cn: '管理信息库', abbreviation: 'MIB' },
    { en: 'Object Identifier', cn: '对象标识符', abbreviation: 'OID' },
    { en: 'Trap', cn: '陷阱', abbreviation: '' },
    { en: 'Inform', cn: '通知', abbreviation: '' },
    { en: 'Get', cn: '获取', abbreviation: '' },
    { en: 'Set', cn: '设置', abbreviation: '' },
    { en: 'Walk', cn: '遍历', abbreviation: '' },
    { en: 'Syslog', cn: '系统日志', abbreviation: '' },
    { en: 'Network Configuration Protocol', cn: '网络配置协议', abbreviation: 'NETCONF' },
    { en: 'Representational State Transfer', cn: '表述性状态转移', abbreviation: 'REST' },
    { en: 'RESTCONF', cn: 'REST配置', abbreviation: '' },
    { en: 'Yet Another Next Generation', cn: '下一代', abbreviation: 'YANG' },
  ],

  // QoS
  qos: [
    { en: 'Quality of Service', cn: '服务质量', abbreviation: 'QoS' },
    { en: 'Differentiated Services', cn: '区分服务', abbreviation: 'DiffServ' },
    { en: 'Integrated Services', cn: '综合服务', abbreviation: 'IntServ' },
    { en: 'Differentiated Services Code Point', cn: '区分服务代码点', abbreviation: 'DSCP' },
    { en: 'Class of Service', cn: '服务类别', abbreviation: 'CoS' },
    { en: 'Type of Service', cn: '服务类型', abbreviation: 'ToS' },
    { en: 'Expedited Forwarding', cn: '加速转发', abbreviation: 'EF' },
    { en: 'Assured Forwarding', cn: '确保转发', abbreviation: 'AF' },
    { en: 'Best Effort', cn: '尽力而为', abbreviation: '' },
    { en: 'Traffic Policing', cn: '流量监管', abbreviation: '' },
    { en: 'Traffic Shaping', cn: '流量整形', abbreviation: '' },
    { en: 'Committed Access Rate', cn: '承诺访问速率', abbreviation: 'CAR' },
    { en: 'Committed Information Rate', cn: '承诺信息速率', abbreviation: 'CIR' },
    { en: 'Peak Information Rate', cn: '峰值信息速率', abbreviation: 'PIR' },
    { en: 'Token Bucket', cn: '令牌桶', abbreviation: '' },
  ],

  // 无线网络
  wireless: [
    { en: 'Wireless Local Area Network', cn: '无线局域网', abbreviation: 'WLAN' },
    { en: 'Wireless Fidelity', cn: '无线保真', abbreviation: 'Wi-Fi' },
    { en: 'Service Set Identifier', cn: '服务集标识符', abbreviation: 'SSID' },
    { en: 'Basic Service Set', cn: '基本服务集', abbreviation: 'BSS' },
    { en: 'Extended Service Set', cn: '扩展服务集', abbreviation: 'ESS' },
    { en: 'Access Point', cn: '接入点', abbreviation: 'AP' },
    { en: 'Station', cn: '站点', abbreviation: 'STA' },
    { en: 'Wireless Distribution System', cn: '无线分布式系统', abbreviation: 'WDS' },
    { en: 'Wired Equivalent Privacy', cn: '有线等效保密', abbreviation: 'WEP' },
    { en: 'Wi-Fi Protected Access', cn: 'Wi-Fi保护访问', abbreviation: 'WPA' },
    { en: 'Temporal Key Integrity Protocol', cn: '临时密钥完整性协议', abbreviation: 'TKIP' },
    { en: 'Advanced Encryption Standard', cn: '高级加密标准', abbreviation: 'AES' },
    { en: 'Counter Mode with Cipher Block Chaining Message Authentication Code Protocol', cn: '计数器模式密码块链消息认证码协议', abbreviation: 'CCMP' },
    { en: 'Galois/Counter Mode Protocol', cn: '伽罗瓦/计数器模式协议', abbreviation: 'GCMP' },
    { en: 'Extensible Authentication Protocol', cn: '可扩展认证协议', abbreviation: 'EAP' },
    { en: 'Orthogonal Frequency Division Multiple Access', cn: '正交频分多址', abbreviation: 'OFDMA' },
    { en: 'Multi-User Multiple-Input Multiple-Output', cn: '多用户多输入多输出', abbreviation: 'MU-MIMO' },
    { en: 'Target Wake Time', cn: '目标唤醒时间', abbreviation: 'TWT' },
    { en: 'Received Signal Strength Indicator', cn: '接收信号强度指示', abbreviation: 'RSSI' },
    { en: 'Signal-to-Noise Ratio', cn: '信噪比', abbreviation: 'SNR' },
  ],

  // 存储
  storage: [
    { en: 'Redundant Array of Independent Disks', cn: '独立磁盘冗余阵列', abbreviation: 'RAID' },
    { en: 'Storage Area Network', cn: '存储区域网络', abbreviation: 'SAN' },
    { en: 'Network Attached Storage', cn: '网络附加存储', abbreviation: 'NAS' },
    { en: 'Fibre Channel', cn: '光纤通道', abbreviation: 'FC' },
    { en: 'Fibre Channel over Ethernet', cn: '以太网光纤通道', abbreviation: 'FCoE' },
    { en: 'Internet Small Computer Systems Interface', cn: '互联网小型计算机系统接口', abbreviation: 'iSCSI' },
    { en: 'Network File System', cn: '网络文件系统', abbreviation: 'NFS' },
    { en: 'Common Internet File System', cn: '通用互联网文件系统', abbreviation: 'CIFS' },
    { en: 'Non-Volatile Memory Express', cn: '非易失性内存主机控制器接口', abbreviation: 'NVMe' },
    { en: 'NVMe over Fabrics', cn: '基于网络的NVMe', abbreviation: 'NVMe-oF' },
    { en: 'Remote Direct Memory Access', cn: '远程直接内存访问', abbreviation: 'RDMA' },
    { en: 'RDMA over Converged Ethernet', cn: '融合以太网上的RDMA', abbreviation: 'RoCE' },
    { en: 'InfiniBand', cn: '无限带宽', abbreviation: 'IB' },
    { en: 'Host Bus Adapter', cn: '主机总线适配器', abbreviation: 'HBA' },
    { en: 'Logical Unit Number', cn: '逻辑单元号', abbreviation: 'LUN' },
    { en: 'World Wide Name', cn: '全球名称', abbreviation: 'WWN' },
    { en: 'World Wide Port Name', cn: '全球端口名称', abbreviation: 'WWPN' },
    { en: 'World Wide Node Name', cn: '全球节点名称', abbreviation: 'WWNN' },
    { en: 'Zone', cn: '分区', abbreviation: '' },
    { en: 'Masking', cn: '掩码', abbreviation: '' },
  ],

  // 数据中心
  datacenter: [
    { en: 'Data Center', cn: '数据中心', abbreviation: 'DC' },
    { en: 'Cloud Data Center', cn: '云数据中心', abbreviation: '' },
    { en: 'Hyperscale Data Center', cn: '超大规模数据中心', abbreviation: '' },
    { en: 'Colocation', cn: '主机托管', abbreviation: '' },
    { en: 'Power Usage Effectiveness', cn: '电能使用效率', abbreviation: 'PUE' },
    { en: 'Uninterruptible Power Supply', cn: '不间断电源', abbreviation: 'UPS' },
    { en: 'Generator', cn: '发电机', abbreviation: '' },
    { en: 'Precision Air Conditioning', cn: '精密空调', abbreviation: 'PAC' },
    { en: 'Hot Aisle/Cold Aisle', cn: '热通道/冷通道', abbreviation: '' },
    { en: 'Spine-Leaf Architecture', cn: '脊叶架构', abbreviation: '' },
    { en: 'Top of Rack', cn: '架顶式', abbreviation: 'ToR' },
    { en: 'End of Row', cn: '行尾式', abbreviation: 'EoR' },
    { en: 'Middle of Row', cn: '行中式', abbreviation: 'MoR' },
    { en: 'Disaster Recovery', cn: '灾难恢复', abbreviation: 'DR' },
    { en: 'Recovery Point Objective', cn: '恢复点目标', abbreviation: 'RPO' },
    { en: 'Recovery Time Objective', cn: '恢复时间目标', abbreviation: 'RTO' },
    { en: 'Mean Time Between Failures', cn: '平均故障间隔时间', abbreviation: 'MTBF' },
    { en: 'Mean Time To Repair', cn: '平均修复时间', abbreviation: 'MTTR' },
    { en: 'Hyper-Converged Infrastructure', cn: '超融合基础设施', abbreviation: 'HCI' },
  ],

  // 广域网
  wan: [
    { en: 'Wide Area Network', cn: '广域网', abbreviation: 'WAN' },
    { en: 'Metropolitan Area Network', cn: '城域网', abbreviation: 'MAN' },
    { en: 'Synchronous Digital Hierarchy', cn: '同步数字体系', abbreviation: 'SDH' },
    { en: 'Synchronous Optical Network', cn: '同步光网络', abbreviation: 'SONET' },
    { en: 'Multi-Service Transport Platform', cn: '多业务传送平台', abbreviation: 'MSTP' },
    { en: 'Dense Wavelength Division Multiplexing', cn: '密集波分复用', abbreviation: 'DWDM' },
    { en: 'Coarse Wavelength Division Multiplexing', cn: '粗波分复用', abbreviation: 'CWDM' },
    { en: 'Digital Subscriber Line', cn: '数字用户线路', abbreviation: 'DSL' },
    { en: 'Asymmetric Digital Subscriber Line', cn: '非对称数字用户线路', abbreviation: 'ADSL' },
    { en: 'Very-high-bit-rate Digital Subscriber Line', cn: '超高速数字用户线路', abbreviation: 'VDSL' },
    { en: 'Passive Optical Network', cn: '无源光网络', abbreviation: 'PON' },
    { en: 'Gigabit-capable Passive Optical Network', cn: '吉比特无源光网络', abbreviation: 'GPON' },
    { en: 'Ethernet Passive Optical Network', cn: '以太网无源光网络', abbreviation: 'EPON' },
    { en: 'Optical Line Terminal', cn: '光线路终端', abbreviation: 'OLT' },
    { en: 'Optical Network Unit', cn: '光网络单元', abbreviation: 'ONU' },
    { en: 'Optical Network Terminal', cn: '光网络终端', abbreviation: 'ONT' },
    { en: 'Software-Defined WAN', cn: '软件定义广域网', abbreviation: 'SD-WAN' },
  ],

  // 5G
  '5g': [
    { en: '5th Generation Mobile Networks', cn: '第五代移动通信技术', abbreviation: '5G' },
    { en: 'New Radio', cn: '新空口', abbreviation: 'NR' },
    { en: 'Network Slice', cn: '网络切片', abbreviation: '' },
    { en: 'Enhanced Mobile Broadband', cn: '增强移动宽带', abbreviation: 'eMBB' },
    { en: 'Ultra-Reliable Low-Latency Communications', cn: '超可靠低时延通信', abbreviation: 'uRLLC' },
    { en: 'Massive Machine Type Communications', cn: '海量机器类通信', abbreviation: 'mMTC' },
    { en: 'Next Generation Core', cn: '下一代核心网', abbreviation: 'NGC' },
    { en: 'Access and Mobility Management Function', cn: '接入和移动性管理功能', abbreviation: 'AMF' },
    { en: 'Session Management Function', cn: '会话管理功能', abbreviation: 'SMF' },
    { en: 'User Plane Function', cn: '用户面功能', abbreviation: 'UPF' },
  ],

  // 基础协议
  basic: [
    { en: 'Internet Protocol', cn: '互联网协议', abbreviation: 'IP' },
    { en: 'Transmission Control Protocol', cn: '传输控制协议', abbreviation: 'TCP' },
    { en: 'User Datagram Protocol', cn: '用户数据报协议', abbreviation: 'UDP' },
    { en: 'Internet Control Message Protocol', cn: '互联网控制消息协议', abbreviation: 'ICMP' },
    { en: 'Address Resolution Protocol', cn: '地址解析协议', abbreviation: 'ARP' },
    { en: 'Reverse Address Resolution Protocol', cn: '反向地址解析协议', abbreviation: 'RARP' },
    { en: 'Dynamic Host Configuration Protocol', cn: '动态主机配置协议', abbreviation: 'DHCP' },
    { en: 'Domain Name System', cn: '域名系统', abbreviation: 'DNS' },
    { en: 'Hypertext Transfer Protocol', cn: '超文本传输协议', abbreviation: 'HTTP' },
    { en: 'Hypertext Transfer Protocol Secure', cn: '超文本传输安全协议', abbreviation: 'HTTPS' },
    { en: 'File Transfer Protocol', cn: '文件传输协议', abbreviation: 'FTP' },
    { en: 'Secure Shell', cn: '安全外壳', abbreviation: 'SSH' },
    { en: 'Telnet', cn: '远程登录', abbreviation: '' },
    { en: 'Maximum Transmission Unit', cn: '最大传输单元', abbreviation: 'MTU' },
    { en: 'Maximum Segment Size', cn: '最大段大小', abbreviation: 'MSS' },
    { en: 'Time To Live', cn: '生存时间', abbreviation: 'TTL' },
    { en: 'Classless Inter-Domain Routing', cn: '无类别域间路由', abbreviation: 'CIDR' },
    { en: 'Variable Length Subnet Mask', cn: '可变长子网掩码', abbreviation: 'VLSM' },
    { en: 'Port', cn: '端口', abbreviation: '' },
    { en: 'Socket', cn: '套接字', abbreviation: '' },
    { en: 'Sequence Number', cn: '序列号', abbreviation: '' },
    { en: 'Acknowledgment Number', cn: '确认号', abbreviation: '' },
    { en: 'Window Size', cn: '窗口大小', abbreviation: '' },
    { en: 'Checksum', cn: '校验和', abbreviation: '' },
  ],

  // IPv6
  ipv6: [
    { en: 'Internet Protocol Version 6', cn: '互联网协议第6版', abbreviation: 'IPv6' },
    { en: 'Internet Protocol Version 4', cn: '互联网协议第4版', abbreviation: 'IPv4' },
    { en: 'Global Unicast Address', cn: '全球单播地址', abbreviation: 'GUA' },
    { en: 'Unique Local Address', cn: '唯一本地地址', abbreviation: 'ULA' },
    { en: 'Link-Local Address', cn: '链路本地地址', abbreviation: 'LLA' },
    { en: 'Multicast Address', cn: '组播地址', abbreviation: '' },
    { en: 'Anycast Address', cn: '任播地址', abbreviation: '' },
    { en: 'Loopback Address', cn: '环回地址', abbreviation: '' },
    { en: 'Unspecified Address', cn: '未指定地址', abbreviation: '' },
    { en: 'Extended Unique Identifier', cn: '扩展唯一标识符', abbreviation: 'EUI-64' },
    { en: 'Neighbor Discovery Protocol', cn: '邻居发现协议', abbreviation: 'NDP' },
    { en: 'Stateless Address Autoconfiguration', cn: '无状态地址自动配置', abbreviation: 'SLAAC' },
    { en: 'Dual Stack', cn: '双栈', abbreviation: '' },
    { en: 'Tunnel', cn: '隧道', abbreviation: '' },
    { en: '6to4', cn: '6to4隧道', abbreviation: '' },
    { en: 'Teredo', cn: 'Teredo隧道', abbreviation: '' },
    { en: 'ISATAP', cn: 'ISATAP隧道', abbreviation: '' },
    { en: 'NAT64', cn: '网络地址转换64', abbreviation: '' },
    { en: 'DS-Lite', cn: '轻量级双栈', abbreviation: '' },
  ],
};

// 将所有术语合并为一个数组
export const allTerminology: Terminology[] = Object.values(terminologyCategories).flat();

// 根据英文查找中文
export function getChineseTerm(en: string): string | undefined {
  const term = allTerminology.find(t => t.en.toLowerCase() === en.toLowerCase());
  return term?.cn;
}

// 根据中文查找英文
export function getEnglishTerm(cn: string): string | undefined {
  const term = allTerminology.find(t => t.cn === cn);
  return term?.en;
}

// 根据缩写查找完整术语
export function getTermByAbbreviation(abbr: string): Terminology | undefined {
  return allTerminology.find(t => 
    t.abbreviation?.toLowerCase() === abbr.toLowerCase()
  );
}

// 搜索术语（支持中英文模糊搜索）
export function searchTerminology(query: string): Terminology[] {
  const lowerQuery = query.toLowerCase();
  return allTerminology.filter(t => 
    t.en.toLowerCase().includes(lowerQuery) ||
    t.cn.includes(query) ||
    t.abbreviation?.toLowerCase().includes(lowerQuery)
  );
}
