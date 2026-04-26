import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Phase } from './pages/Phase';
import { Scene } from './pages/Scene';
import { LayoutEditorPage } from './pages/LayoutEditorPage';
import { GlobalErrorBoundary, SceneErrorBoundary } from './components/ErrorBoundary';
import { OSPFSPFScene } from './scenes/phase1/OSPF-SPF';
import { OSPFLSAScene } from './scenes/phase1/OSPF-LSA';
import { OSPFNeighborScene } from './scenes/phase1/OSPF-Neighbor';
import { BGPFSMScene } from './scenes/phase1/BGP-FSM';
import { ISISOverviewScene } from './scenes/phase1/ISIS-Overview';
import { BGPRRScene } from './scenes/phase1/BGP-RR';
import { MPLSL3VPNScene } from './scenes/phase1/MPLS-L3VPN';
import { SRv6OverviewScene } from './scenes/phase1/SRv6-Overview';
import { VXLANDetailScene } from './scenes/phase1/VXLAN-Detail';
import { VRRPHAScene } from './scenes/phase1/VRRP-HA';
import { SpineLeafScene } from './scenes/phase1/Spine-Leaf';
import { TierStandardScene } from './scenes/phase2/TierStandard';
import { RAIDScene } from './scenes/phase2/RAID';
import { DisasterRecoveryScene } from './scenes/phase2/DisasterRecovery';
import { DataCenterInfraScene } from './scenes/phase2/DataCenterInfra';
import { StorageProtocolScene } from './scenes/phase2/StorageProtocol';
import { StorageArchitectureScene } from './scenes/phase2/StorageArchitecture';
import StorageTypesScene from './scenes/phase2/Storage-Types';
import { IPsecVPNScene } from './scenes/phase3/IPsec-VPN';
import { DefenseDepthScene } from './scenes/phase3/Defense-Depth';
import { WiFi6OFDMAScene } from './scenes/phase3/WiFi6-OFDMA';
import { NetworkLifecycleScene } from './scenes/phase3/Network-Lifecycle';
import { SDNArchitectureScene } from './scenes/phase4/SDN-Architecture';
import { RoCERDMAScene } from './scenes/phase4/RoCE-RDMA';
import { SecurityComplianceScene } from './scenes/phase3/Security-Compliance';
import { ACLSimulatorScene } from './scenes/phase3/ACL-Simulator';
import { StatefulFirewallScene } from './scenes/phase3/Stateful-Firewall';
import { VLSMCalculatorScene } from './scenes/phase3/VLSM-Calculator';
import { BGPDecisionScene } from './scenes/phase1/BGP-Decision';
import { LACPScene } from './scenes/phase1/LACP';
import { VXLANScene } from './scenes/phase1/VXLAN';
import { TLSHandshakeScene } from './scenes/phase4/TLS-Handshake';
import { FiveGNetworkSliceScene } from './scenes/phase4/5G-Network-Slice';
import STPSpanningTreeScene from './scenes/phase1/STP-SpanningTree';
import VLANTrunkScene from './scenes/phase1/VLAN-Trunk';
import QoSQualityScene from './scenes/phase3/QoS-Quality';
import TCPThreeWayHandshakeScene from './scenes/phase5/TCP-ThreeWayHandshake';
import ARPProtocolScene from './scenes/phase5/ARP-Protocol';
import SNMPManagementScene from './scenes/phase3/SNMP-Management';
import NetworkTroubleshootingScene from './scenes/phase3/Network-Troubleshooting';
import DHCPScene from './scenes/phase5/DHCP';
import DNSScene from './scenes/phase5/DNS';
import NATScene from './scenes/phase5/NAT';
import IPv6AddressScene from './scenes/phase5/IPv6-Address';
import IPv6TransitionScene from './scenes/phase5/IPv6-Transition';
import DDoSDefenseScene from './scenes/phase5/DDoS-Defense';
import PKICertificateScene from './scenes/phase5/PKI-Certificate';
import PONAccessScene from './scenes/phase5/PON-Access';
import TCPCongestionScene from './scenes/phase5/TCP-Congestion';
import IDSIPSScene from './scenes/phase3/IDS-IPS';
import WirelessSecurityScene from './scenes/phase3/Wireless-Security';
import CampusArchitectureScene from './scenes/phase4/Campus-Architecture';
import WANTechnologyScene from './scenes/phase2/WAN-Technology';

function App() {
  return (
    <GlobalErrorBoundary>
      <Router basename={import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL.replace(/\/$/, '') : undefined}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/phase/:id" element={<Phase />} />
          <Route path="/scene/:id" element={<Scene />} />
          <Route path="/scene/ospf-spf" element={<SceneErrorBoundary sceneName="OSPF SPF算法"><OSPFSPFScene /></SceneErrorBoundary>} />
        <Route path="/scene/ospf-lsa" element={<SceneErrorBoundary sceneName="OSPF LSA类型"><OSPFLSAScene /></SceneErrorBoundary>} />
        <Route path="/scene/ospf-neighbor" element={<SceneErrorBoundary sceneName="OSPF邻居状态机"><OSPFNeighborScene /></SceneErrorBoundary>} />
        <Route path="/scene/bgp-fsm" element={<SceneErrorBoundary sceneName="BGP状态机"><BGPFSMScene /></SceneErrorBoundary>} />
        <Route path="/scene/isis-overview" element={<SceneErrorBoundary sceneName="IS-IS概览"><ISISOverviewScene /></SceneErrorBoundary>} />
        <Route path="/scene/bgp-rr" element={<SceneErrorBoundary sceneName="BGP路由反射器"><BGPRRScene /></SceneErrorBoundary>} />
        <Route path="/scene/mpls-l3vpn" element={<SceneErrorBoundary sceneName="MPLS L3VPN"><MPLSL3VPNScene /></SceneErrorBoundary>} />
        <Route path="/scene/srv6-overview" element={<SceneErrorBoundary sceneName="SRv6概览"><SRv6OverviewScene /></SceneErrorBoundary>} />
        <Route path="/scene/vxlan-detail" element={<SceneErrorBoundary sceneName="VXLAN详解"><VXLANDetailScene /></SceneErrorBoundary>} />
        <Route path="/scene/vrrp-ha" element={<SceneErrorBoundary sceneName="VRRP高可用"><VRRPHAScene /></SceneErrorBoundary>} />
        <Route path="/scene/spine-leaf" element={<SceneErrorBoundary sceneName="Spine-Leaf架构"><SpineLeafScene /></SceneErrorBoundary>} />
        <Route path="/scene/tier-standard" element={<SceneErrorBoundary sceneName="机房等级标准"><TierStandardScene /></SceneErrorBoundary>} />
        <Route path="/scene/raid" element={<SceneErrorBoundary sceneName="RAID技术"><RAIDScene /></SceneErrorBoundary>} />
        <Route path="/scene/disaster-recovery" element={<SceneErrorBoundary sceneName="两地三中心"><DisasterRecoveryScene /></SceneErrorBoundary>} />
        <Route path="/scene/datacenter-infra" element={<SceneErrorBoundary sceneName="机房基础设施"><DataCenterInfraScene /></SceneErrorBoundary>} />
        <Route path="/scene/storage-protocol" element={<SceneErrorBoundary sceneName="存储协议对比"><StorageProtocolScene /></SceneErrorBoundary>} />
        <Route path="/scene/storage-architecture" element={<SceneErrorBoundary sceneName="企业存储架构拓扑"><StorageArchitectureScene /></SceneErrorBoundary>} />
        <Route path="/scene/storage-types" element={<SceneErrorBoundary sceneName="存储类型对比"><StorageTypesScene /></SceneErrorBoundary>} />
        <Route path="/scene/ipsec-vpn" element={<SceneErrorBoundary sceneName="IPsec VPN"><IPsecVPNScene /></SceneErrorBoundary>} />
        <Route path="/scene/defense-depth" element={<SceneErrorBoundary sceneName="纵深防御"><DefenseDepthScene /></SceneErrorBoundary>} />
        <Route path="/scene/wifi6-ofdma" element={<SceneErrorBoundary sceneName="Wi-Fi 6 OFDMA"><WiFi6OFDMAScene /></SceneErrorBoundary>} />
        <Route path="/scene/network-lifecycle" element={<SceneErrorBoundary sceneName="网络生命周期"><NetworkLifecycleScene /></SceneErrorBoundary>} />
        <Route path="/scene/security-compliance" element={<SceneErrorBoundary sceneName="等保2.0"><SecurityComplianceScene /></SceneErrorBoundary>} />
        <Route path="/scene/sdn-architecture" element={<SceneErrorBoundary sceneName="SDN架构"><SDNArchitectureScene /></SceneErrorBoundary>} />
        <Route path="/scene/roce-rdma" element={<SceneErrorBoundary sceneName="RoCE/RDMA"><RoCERDMAScene /></SceneErrorBoundary>} />
        <Route path="/scene/acl-simulator" element={<SceneErrorBoundary sceneName="ACL规则匹配"><ACLSimulatorScene /></SceneErrorBoundary>} />
        <Route path="/scene/stateful-firewall" element={<SceneErrorBoundary sceneName="状态检测防火墙"><StatefulFirewallScene /></SceneErrorBoundary>} />
        <Route path="/scene/vlsm-calculator" element={<SceneErrorBoundary sceneName="VLSM子网划分"><VLSMCalculatorScene /></SceneErrorBoundary>} />
        <Route path="/scene/tls-handshake" element={<SceneErrorBoundary sceneName="TLS握手过程"><TLSHandshakeScene /></SceneErrorBoundary>} />
        <Route path="/scene/5g-network-slice" element={<SceneErrorBoundary sceneName="5G网络切片"><FiveGNetworkSliceScene /></SceneErrorBoundary>} />
        <Route path="/scene/bgp-decision" element={<SceneErrorBoundary sceneName="BGP选路决策"><BGPDecisionScene /></SceneErrorBoundary>} />
        <Route path="/scene/lacp" element={<SceneErrorBoundary sceneName="LACP链路聚合"><LACPScene /></SceneErrorBoundary>} />
        <Route path="/scene/vxlan" element={<SceneErrorBoundary sceneName="VXLAN"><VXLANScene /></SceneErrorBoundary>} />
        <Route path="/scene/dhcp" element={<SceneErrorBoundary sceneName="DHCP协议"><DHCPScene /></SceneErrorBoundary>} />
        <Route path="/scene/dns" element={<SceneErrorBoundary sceneName="DNS递归解析"><DNSScene /></SceneErrorBoundary>} />
        <Route path="/scene/nat" element={<SceneErrorBoundary sceneName="NAT地址转换"><NATScene /></SceneErrorBoundary>} />
        <Route path="/scene/ipv6-address" element={<SceneErrorBoundary sceneName="IPv6地址详解"><IPv6AddressScene /></SceneErrorBoundary>} />
        <Route path="/scene/ipv6-transition" element={<SceneErrorBoundary sceneName="IPv6过渡技术"><IPv6TransitionScene /></SceneErrorBoundary>} />
        <Route path="/scene/ddos-defense" element={<SceneErrorBoundary sceneName="DDoS攻击与防御"><DDoSDefenseScene /></SceneErrorBoundary>} />
        <Route path="/scene/pki-certificate" element={<SceneErrorBoundary sceneName="PKI与数字证书"><PKICertificateScene /></SceneErrorBoundary>} />
        <Route path="/scene/pon-access" element={<SceneErrorBoundary sceneName="PON接入技术"><PONAccessScene /></SceneErrorBoundary>} />
        <Route path="/scene/tcp-three-way-handshake" element={<SceneErrorBoundary sceneName="TCP三次握手"><TCPThreeWayHandshakeScene /></SceneErrorBoundary>} />
        <Route path="/scene/arp-protocol" element={<SceneErrorBoundary sceneName="ARP协议"><ARPProtocolScene /></SceneErrorBoundary>} />
        <Route path="/scene/stp-spanning-tree" element={<SceneErrorBoundary sceneName="STP生成树协议"><STPSpanningTreeScene /></SceneErrorBoundary>} />
        <Route path="/scene/vlan-trunk" element={<SceneErrorBoundary sceneName="VLAN与Trunk配置"><VLANTrunkScene /></SceneErrorBoundary>} />
        <Route path="/scene/qos-quality" element={<SceneErrorBoundary sceneName="QoS服务质量"><QoSQualityScene /></SceneErrorBoundary>} />
        <Route path="/scene/snmp-management" element={<SceneErrorBoundary sceneName="SNMP网络管理"><SNMPManagementScene /></SceneErrorBoundary>} />
        <Route path="/scene/network-troubleshooting" element={<SceneErrorBoundary sceneName="网络故障排查"><NetworkTroubleshootingScene /></SceneErrorBoundary>} />
        <Route path="/scene/tcp-congestion" element={<SceneErrorBoundary sceneName="TCP拥塞控制"><TCPCongestionScene /></SceneErrorBoundary>} />
        <Route path="/scene/ids-ips" element={<SceneErrorBoundary sceneName="IDS/IPS入侵检测"><IDSIPSScene /></SceneErrorBoundary>} />
        <Route path="/scene/wireless-security" element={<SceneErrorBoundary sceneName="无线安全"><WirelessSecurityScene /></SceneErrorBoundary>} />
        <Route path="/scene/campus-architecture" element={<SceneErrorBoundary sceneName="园区网架构"><CampusArchitectureScene /></SceneErrorBoundary>} />
        <Route path="/scene/wan-technology" element={<SceneErrorBoundary sceneName="广域网技术"><WANTechnologyScene /></SceneErrorBoundary>} />
        <Route path="/scene/storage-architecture" element={<SceneErrorBoundary sceneName="存储架构"><StorageArchitectureScene /></SceneErrorBoundary>} />
        <Route path="/layout-editor" element={<LayoutEditorPage />} />
      </Routes>
    </Router>
    </GlobalErrorBoundary>
  );
}

export default App;
