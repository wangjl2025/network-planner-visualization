import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Phase } from './pages/Phase';
import { Scene } from './pages/Scene';
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
import { IPsecVPNScene } from './scenes/phase3/IPsec-VPN';
import { DefenseDepthScene } from './scenes/phase3/Defense-Depth';
import { WiFi6OFDMAScene } from './scenes/phase3/WiFi6-OFDMA';
import { NetworkLifecycleScene } from './scenes/phase3/Network-Lifecycle';
import { SDNArchitectureScene } from './scenes/phase4/SDN-Architecture';
import { RoCERDMAScene } from './scenes/phase4/RoCE-RDMA';
import { SecurityComplianceScene } from './scenes/phase3/Security-Compliance';
import { BGPDecisionScene } from './scenes/phase1/BGP-Decision';
import { LACPScene } from './scenes/phase1/LACP';
import { VXLANScene } from './scenes/phase1/VXLAN';

function App() {
  return (
    <GlobalErrorBoundary>
      <Router>
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
        <Route path="/scene/ipsec-vpn" element={<SceneErrorBoundary sceneName="IPsec VPN"><IPsecVPNScene /></SceneErrorBoundary>} />
        <Route path="/scene/defense-depth" element={<SceneErrorBoundary sceneName="纵深防御"><DefenseDepthScene /></SceneErrorBoundary>} />
        <Route path="/scene/wifi6-ofdma" element={<SceneErrorBoundary sceneName="Wi-Fi 6 OFDMA"><WiFi6OFDMAScene /></SceneErrorBoundary>} />
        <Route path="/scene/network-lifecycle" element={<SceneErrorBoundary sceneName="网络生命周期"><NetworkLifecycleScene /></SceneErrorBoundary>} />
        <Route path="/scene/security-compliance" element={<SceneErrorBoundary sceneName="等保2.0"><SecurityComplianceScene /></SceneErrorBoundary>} />
        <Route path="/scene/sdn-architecture" element={<SceneErrorBoundary sceneName="SDN架构"><SDNArchitectureScene /></SceneErrorBoundary>} />
        <Route path="/scene/roce-rdma" element={<SceneErrorBoundary sceneName="RoCE/RDMA"><RoCERDMAScene /></SceneErrorBoundary>} />
        <Route path="/scene/bgp-decision" element={<SceneErrorBoundary sceneName="BGP选路决策"><BGPDecisionScene /></SceneErrorBoundary>} />
        <Route path="/scene/lacp" element={<SceneErrorBoundary sceneName="LACP链路聚合"><LACPScene /></SceneErrorBoundary>} />
        <Route path="/scene/vxlan" element={<SceneErrorBoundary sceneName="VXLAN"><VXLANScene /></SceneErrorBoundary>} />
        <Route path="/scene/mpls-l3vpn" element={<SceneErrorBoundary sceneName="MPLS L3VPN"><MPLSL3VPNScene /></SceneErrorBoundary>} />
        <Route path="/scene/srv6-overview" element={<SceneErrorBoundary sceneName="SRv6概览"><SRv6OverviewScene /></SceneErrorBoundary>} />
        <Route path="/scene/isis-overview" element={<SceneErrorBoundary sceneName="IS-IS概览"><ISISOverviewScene /></SceneErrorBoundary>} />
      </Routes>
    </Router>
    </GlobalErrorBoundary>
  );
}

export default App;
