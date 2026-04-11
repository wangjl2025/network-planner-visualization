// RFC标准引用映射表
// 为每个场景添加相关的RFC标准引用

export type RFCReference = {
  number: string;
  title: string;
  url?: string;
}

export type SceneRFC = {
  sceneId: string;
  rfcs: RFCReference[];
  relatedStandards?: string[];
}

export const sceneRFCMap: SceneRFC[] = [
  // Phase 1: 核心基础
  {
    sceneId: 'ospf-spf',
    rfcs: [
      { number: 'RFC 2328', title: 'OSPF Version 2', url: 'https://tools.ietf.org/html/rfc2328' },
      { number: 'RFC 5340', title: 'OSPF for IPv6 (OSPFv3)', url: 'https://tools.ietf.org/html/rfc5340' },
    ],
    relatedStandards: ['Dijkstra算法', '链路状态路由协议'],
  },
  {
    sceneId: 'ospf-lsa',
    rfcs: [
      { number: 'RFC 2328', title: 'OSPF Version 2', url: 'https://tools.ietf.org/html/rfc2328' },
      { number: 'RFC 3101', title: 'The OSPF Not-So-Stubby Area (NSSA) Option', url: 'https://tools.ietf.org/html/rfc3101' },
    ],
    relatedStandards: ['LSA Type 1-7', 'NSSA区域'],
  },
  {
    sceneId: 'ospf-neighbor',
    rfcs: [
      { number: 'RFC 2328', title: 'OSPF Version 2', url: 'https://tools.ietf.org/html/rfc2328' },
      { number: 'RFC 5709', title: 'OSPFv2 HMAC-SHA Cryptographic Authentication', url: 'https://tools.ietf.org/html/rfc5709' },
    ],
    relatedStandards: ['邻居状态机', 'Hello/DD/LSR/LSU/LSAck报文'],
  },
  {
    sceneId: 'bgp-decision',
    rfcs: [
      { number: 'RFC 4271', title: 'A Border Gateway Protocol 4 (BGP-4)', url: 'https://tools.ietf.org/html/rfc4271' },
      { number: 'RFC 4456', title: 'BGP Route Reflection', url: 'https://tools.ietf.org/html/rfc4456' },
    ],
    relatedStandards: ['BGP选路原则', '路径属性'],
  },
  {
    sceneId: 'bgp-rr',
    rfcs: [
      { number: 'RFC 4456', title: 'BGP Route Reflection', url: 'https://tools.ietf.org/html/rfc4456' },
      { number: 'RFC 5065', title: 'Autonomous System Confederations for BGP', url: 'https://tools.ietf.org/html/rfc5065' },
    ],
    relatedStandards: ['路由反射器', 'Cluster-ID', 'Originator_ID'],
  },
  {
    sceneId: 'bgp-fsm',
    rfcs: [
      { number: 'RFC 4271', title: 'A Border Gateway Protocol 4 (BGP-4)', url: 'https://tools.ietf.org/html/rfc4271' },
      { number: 'RFC 6286', title: 'Autonomous-System-Wide Unique BGP Identifier for BGP-4', url: 'https://tools.ietf.org/html/rfc6286' },
    ],
    relatedStandards: ['BGP状态机', 'TCP 179端口'],
  },
  {
    sceneId: 'mpls-l3vpn',
    rfcs: [
      { number: 'RFC 4364', title: 'BGP/MPLS IP Virtual Private Networks (VPNs)', url: 'https://tools.ietf.org/html/rfc4364' },
      { number: 'RFC 5036', title: 'LDP Specification', url: 'https://tools.ietf.org/html/rfc5036' },
      { number: 'RFC 3031', title: 'Multiprotocol Label Switching Architecture', url: 'https://tools.ietf.org/html/rfc3031' },
    ],
    relatedStandards: ['RD', 'RT', 'VPNv4', '标签栈'],
  },
  {
    sceneId: 'srv6-overview',
    rfcs: [
      { number: 'RFC 8402', title: 'Segment Routing Architecture', url: 'https://tools.ietf.org/html/rfc8402' },
      { number: 'RFC 8986', title: 'Segment Routing over IPv6 (SRv6) Network Programming', url: 'https://tools.ietf.org/html/rfc8986' },
      { number: 'RFC 8754', title: 'IPv6 Segment Routing Header (SRH)', url: 'https://tools.ietf.org/html/rfc8754' },
    ],
    relatedStandards: ['SRH扩展头', 'Segment List', '源路由'],
  },
  {
    sceneId: 'vxlan',
    rfcs: [
      { number: 'RFC 7348', title: 'Virtual eXtensible Local Area Network (VXLAN)', url: 'https://tools.ietf.org/html/rfc7348' },
    ],
    relatedStandards: ['VNI', 'VTEP', 'UDP 4789'],
  },
  {
    sceneId: 'vxlan-detail',
    rfcs: [
      { number: 'RFC 7348', title: 'Virtual eXtensible Local Area Network (VXLAN)', url: 'https://tools.ietf.org/html/rfc7348' },
    ],
    relatedStandards: ['VXLAN-GPE', 'NSH'],
  },
  {
    sceneId: 'lacp',
    rfcs: [
      { number: 'IEEE 802.1AX', title: 'Link Aggregation', url: 'https://ieeexplore.ieee.org/document/9104882' },
    ],
    relatedStandards: ['LACP', 'Eth-Trunk', 'Port-Channel'],
  },
  {
    sceneId: 'vrrp-ha',
    rfcs: [
      { number: 'RFC 3768', title: 'Virtual Router Redundancy Protocol (VRRP)', url: 'https://tools.ietf.org/html/rfc3768' },
      { number: 'RFC 5798', title: 'Virtual Router Redundancy Protocol (VRRP) Version 3', url: 'https://tools.ietf.org/html/rfc5798' },
    ],
    relatedStandards: ['VRRPv2', 'VRRPv3', 'HSRP'],
  },
  {
    sceneId: 'stp-spanning-tree',
    rfcs: [
      { number: 'IEEE 802.1D', title: 'Media Access Control (MAC) Bridges', url: 'https://ieeexplore.ieee.org/document/7160843' },
      { number: 'IEEE 802.1w', title: 'Rapid Reconfiguration of Spanning Tree', url: 'https://ieeexplore.ieee.org/document/699146' },
    ],
    relatedStandards: ['STP', 'RSTP', 'BPDU'],
  },
  {
    sceneId: 'vlan-trunk',
    rfcs: [
      { number: 'IEEE 802.1Q', title: 'Virtual Bridged Local Area Networks', url: 'https://ieeexplore.ieee.org/document/699146' },
    ],
    relatedStandards: ['VLAN', '802.1Q Tag', 'Trunk', 'Access'],
  },
  {
    sceneId: 'isis-overview',
    rfcs: [
      { number: 'RFC 1195', title: 'Use of OSI IS-IS for Routing in TCP/IP and Dual Environments', url: 'https://tools.ietf.org/html/rfc1195' },
      { number: 'RFC 5308', title: 'Routing IPv6 with IS-IS', url: 'https://tools.ietf.org/html/rfc5308' },
    ],
    relatedStandards: ['IS-IS', 'CLNP', 'TLV'],
  },
  {
    sceneId: 'spine-leaf',
    rfcs: [
      { number: 'RFC 7938', title: 'Use of BGP for Routing in Large-Scale Data Centers', url: 'https://tools.ietf.org/html/rfc7938' },
    ],
    relatedStandards: ['Clos网络', 'ECMP'],
  },

  // Phase 2: 数据中心
  {
    sceneId: 'tier-standard',
    rfcs: [],
    relatedStandards: ['TIA-942', 'GB 50174-2017', 'Uptime Institute'],
  },
  {
    sceneId: 'raid',
    rfcs: [],
    relatedStandards: ['RAID 0/1/5/6/10', '条带化', '奇偶校验'],
  },
  {
    sceneId: 'storage-protocol',
    rfcs: [
      { number: 'RFC 3720', title: 'Internet Small Computer Systems Interface (iSCSI)', url: 'https://tools.ietf.org/html/rfc3720' },
      { number: 'RFC 5042', title: 'Direct Data Placement over Reliable Transports', url: 'https://tools.ietf.org/html/rfc5042' },
    ],
    relatedStandards: ['FC', 'iSCSI', 'NFS', 'CIFS', 'NVMe-oF'],
  },

  // Phase 3: 扩展整合
  {
    sceneId: 'ipsec-vpn',
    rfcs: [
      { number: 'RFC 4301', title: 'Security Architecture for the Internet Protocol', url: 'https://tools.ietf.org/html/rfc4301' },
      { number: 'RFC 4302', title: 'IP Authentication Header', url: 'https://tools.ietf.org/html/rfc4302' },
      { number: 'RFC 4303', title: 'IP Encapsulating Security Payload (ESP)', url: 'https://tools.ietf.org/html/rfc4303' },
      { number: 'RFC 7296', title: 'Internet Key Exchange Protocol Version 2 (IKEv2)', url: 'https://tools.ietf.org/html/rfc7296' },
    ],
    relatedStandards: ['IKE', 'SA', 'ESP', 'AH'],
  },
  {
    sceneId: 'acl-simulator',
    rfcs: [],
    relatedStandards: ['ACL', '防火墙', '包过滤'],
  },
  {
    sceneId: 'stateful-firewall',
    rfcs: [],
    relatedStandards: ['状态检测', '连接跟踪', '会话表'],
  },
  {
    sceneId: 'vlsm-calculator',
    rfcs: [
      { number: 'RFC 1519', title: 'Classless Inter-Domain Routing (CIDR)', url: 'https://tools.ietf.org/html/rfc1519' },
    ],
    relatedStandards: ['CIDR', 'VLSM', '子网划分'],
  },
  {
    sceneId: 'snmp-management',
    rfcs: [
      { number: 'RFC 1157', title: 'Simple Network Management Protocol (SNMP)', url: 'https://tools.ietf.org/html/rfc1157' },
      { number: 'RFC 1213', title: 'Management Information Base for Network Management of TCP/IP-based internets: MIB-II', url: 'https://tools.ietf.org/html/rfc1213' },
      { number: 'RFC 3411', title: 'An Architecture for Describing Simple Network Management Protocol (SNMP) Management Frameworks', url: 'https://tools.ietf.org/html/rfc3411' },
    ],
    relatedStandards: ['SNMPv1/v2c/v3', 'MIB', 'OID', 'Trap'],
  },
  {
    sceneId: 'wireless-security',
    rfcs: [
      { number: 'IEEE 802.11i', title: 'Medium Access Control (MAC) Security Enhancements', url: 'https://ieeexplore.ieee.org/document/1323196' },
      { number: 'IEEE 802.1X', title: 'Port-Based Network Access Control', url: 'https://ieeexplore.ieee.org/document/699146' },
    ],
    relatedStandards: ['WPA', 'WPA2', 'WPA3', '802.1X', 'EAP'],
  },
  {
    sceneId: 'wifi6-ofdma',
    rfcs: [],
    relatedStandards: ['IEEE 802.11ax', 'OFDMA', 'MU-MIMO'],
  },
  {
    sceneId: 'ids-ips',
    rfcs: [],
    relatedStandards: ['IDS', 'IPS', 'NIDS', 'HIDS'],
  },
  {
    sceneId: 'qos-quality',
    rfcs: [
      { number: 'RFC 2474', title: 'Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers', url: 'https://tools.ietf.org/html/rfc2474' },
      { number: 'RFC 2475', title: 'An Architecture for Differentiated Services', url: 'https://tools.ietf.org/html/rfc2475' },
      { number: 'RFC 1633', title: 'Integrated Services in the Internet Architecture: an Overview', url: 'https://tools.ietf.org/html/rfc1633' },
    ],
    relatedStandards: ['IntServ', 'DiffServ', 'DSCP', '802.1p'],
  },
  {
    sceneId: 'network-troubleshooting',
    rfcs: [],
    relatedStandards: ['Ping', 'Traceroute', 'SNMP', 'Syslog'],
  },

  // Phase 4: 高级前沿
  {
    sceneId: 'sdn-architecture',
    rfcs: [],
    relatedStandards: ['OpenFlow', 'ONF', 'SDN', 'NFV'],
  },
  {
    sceneId: 'tls-handshake',
    rfcs: [
      { number: 'RFC 8446', title: 'The Transport Layer Security (TLS) Protocol Version 1.3', url: 'https://tools.ietf.org/html/rfc8446' },
      { number: 'RFC 5246', title: 'The Transport Layer Security (TLS) Protocol Version 1.2', url: 'https://tools.ietf.org/html/rfc5246' },
    ],
    relatedStandards: ['TLS 1.2/1.3', 'SSL', 'HTTPS'],
  },
  {
    sceneId: '5g-network-slice',
    rfcs: [],
    relatedStandards: ['3GPP', '5G NR', '网络切片', 'eMBB/uRLLC/mMTC'],
  },
  {
    sceneId: 'roce-rdma',
    rfcs: [],
    relatedStandards: ['RoCEv1/v2', 'RDMA', 'InfiniBand', 'DCB'],
  },
  {
    sceneId: 'campus-architecture',
    rfcs: [],
    relatedStandards: ['三层架构', '核心层', '汇聚层', '接入层'],
  },

  // Phase 5: 网络基础
  {
    sceneId: 'dhcp',
    rfcs: [
      { number: 'RFC 2131', title: 'Dynamic Host Configuration Protocol', url: 'https://tools.ietf.org/html/rfc2131' },
      { number: 'RFC 2132', title: 'DHCP Options and BOOTP Vendor Extensions', url: 'https://tools.ietf.org/html/rfc2132' },
    ],
    relatedStandards: ['DHCP', 'DORA', '租约'],
  },
  {
    sceneId: 'dns',
    rfcs: [
      { number: 'RFC 1034', title: 'Domain Names - Concepts and Facilities', url: 'https://tools.ietf.org/html/rfc1034' },
      { number: 'RFC 1035', title: 'Domain Names - Implementation and Specification', url: 'https://tools.ietf.org/html/rfc1035' },
      { number: 'RFC 3596', title: 'DNS Extensions to Support IP Version 6', url: 'https://tools.ietf.org/html/rfc3596' },
    ],
    relatedStandards: ['DNS', 'A/AAAA记录', '递归查询', '迭代查询'],
  },
  {
    sceneId: 'nat',
    rfcs: [
      { number: 'RFC 1918', title: 'Address Allocation for Private Internets', url: 'https://tools.ietf.org/html/rfc1918' },
      { number: 'RFC 3022', title: 'Traditional IP Network Address Translator (Traditional NAT)', url: 'https://tools.ietf.org/html/rfc3022' },
      { number: 'RFC 5382', title: 'NAT Behavioral Requirements for TCP', url: 'https://tools.ietf.org/html/rfc5382' },
    ],
    relatedStandards: ['NAT', 'PAT', 'NAPT', '静态/动态NAT'],
  },
  {
    sceneId: 'ipv6-address',
    rfcs: [
      { number: 'RFC 4291', title: 'IP Version 6 Addressing Architecture', url: 'https://tools.ietf.org/html/rfc4291' },
      { number: 'RFC 4193', title: 'Unique Local IPv6 Unicast Addresses', url: 'https://tools.ietf.org/html/rfc4193' },
      { number: 'RFC 4862', title: 'IPv6 Stateless Address Autoconfiguration', url: 'https://tools.ietf.org/html/rfc4862' },
    ],
    relatedStandards: ['IPv6', 'GUA', 'ULA', 'LLA', 'EUI-64'],
  },
  {
    sceneId: 'tcp-three-way-handshake',
    rfcs: [
      { number: 'RFC 793', title: 'Transmission Control Protocol', url: 'https://tools.ietf.org/html/rfc793' },
      { number: 'RFC 5681', title: 'TCP Congestion Control', url: 'https://tools.ietf.org/html/rfc5681' },
    ],
    relatedStandards: ['TCP', '三次握手', '四次挥手', 'SYN/ACK'],
  },
  {
    sceneId: 'tcp-congestion',
    rfcs: [
      { number: 'RFC 5681', title: 'TCP Congestion Control', url: 'https://tools.ietf.org/html/rfc5681' },
      { number: 'RFC 8312', title: 'CUBIC for Fast Long-Distance Networks', url: 'https://tools.ietf.org/html/rfc8312' },
    ],
    relatedStandards: ['慢启动', '拥塞避免', '快重传', '快恢复'],
  },
  {
    sceneId: 'arp-protocol',
    rfcs: [
      { number: 'RFC 826', title: 'An Ethernet Address Resolution Protocol', url: 'https://tools.ietf.org/html/rfc826' },
    ],
    relatedStandards: ['ARP', 'RARP', '代理ARP', '免费ARP'],
  },
  {
    sceneId: 'ddos-defense',
    rfcs: [],
    relatedStandards: ['DDoS', 'SYN Flood', '流量清洗', '黑洞路由'],
  },
  {
    sceneId: 'pki-certificate',
    rfcs: [
      { number: 'RFC 5280', title: 'Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile', url: 'https://tools.ietf.org/html/rfc5280' },
    ],
    relatedStandards: ['PKI', 'CA', '数字证书', 'X.509'],
  },
  {
    sceneId: 'ipv6-transition',
    rfcs: [
      { number: 'RFC 6144', title: 'Framework for IPv4/IPv6 Translation', url: 'https://tools.ietf.org/html/rfc6144' },
      { number: 'RFC 6146', title: 'Stateful NAT64: Network Address and Protocol Translation from IPv6 Clients to IPv4 Servers', url: 'https://tools.ietf.org/html/rfc6146' },
    ],
    relatedStandards: ['双栈', '隧道', 'NAT64', 'DS-Lite'],
  },
];

// 根据场景ID获取RFC引用
export function getRFCsBySceneId(sceneId: string): RFCReference[] {
  const scene = sceneRFCMap.find(s => s.sceneId === sceneId);
  return scene?.rfcs || [];
}

// 根据场景ID获取相关标准
export function getRelatedStandardsBySceneId(sceneId: string): string[] {
  const scene = sceneRFCMap.find(s => s.sceneId === sceneId);
  return scene?.relatedStandards || [];
}
