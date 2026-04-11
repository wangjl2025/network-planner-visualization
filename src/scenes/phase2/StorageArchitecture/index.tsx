import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { AnimationPlayer } from '../../../components/AnimationPlayer';
import { ParameterPanel } from '../../../components/ParameterPanel';
import { InfoPanel } from '../../../components/InfoPanel';
import {
  Server,
  Database,
  HardDrive,
  Network,
  Share2,
  Layers,
  Cpu,
  Cable,
  Wifi,
  Globe,
  Box,
  ArrowRight,
  Activity,
  Zap,
  Shield,
  Cloud
} from 'lucide-react';

// ============================================
// 存储架构定义 - 真实生产环境拓扑
// ============================================

interface StorageNode {
  id: string;
  type: 'server' | 'switch' | 'storage' | 'disk' | 'controller' | 'network' | 'gateway';
  name: string;
  x: number;
  y: number;
  icon: React.ElementType;
  details?: {
    model?: string;
    ports?: string;
    capacity?: string;
    protocol?: string;
    speed?: string;
    type?: string;
    clients?: string;
    role?: string;
    daemon?: string;
    cpu?: string;
    memory?: string;
  };
}

interface Connection {
  from: string;
  to: string;
  type: 'fc' | 'eth' | 'sas' | 'nvme' | 'iscsi' | 'nfs';
  speed: string;
  bandwidth: string;
}

interface StorageArchitecture {
  id: string;
  name: string;
  fullName: string;
  description: string;
  useCases: string[];
  pros: string[];
  cons: string[];
  nodes: StorageNode[];
  connections: Connection[];
  dataFlow: {
    path: string[];
    description: string;
  }[];
}

// 节点尺寸常量
const NODE_WIDTH = 80;
const NODE_HEIGHT = 80;
const NODE_SPACING_X = 100; // 水平间距
const NODE_SPACING_Y = 110; // 垂直间距

// FC-SAN 架构定义 - 重新设计布局
const FC_SAN_ARCHITECTURE: StorageArchitecture = {
  id: 'fc-san',
  name: 'FC-SAN',
  fullName: 'Fibre Channel Storage Area Network',
  description: '基于光纤通道协议的企业级块存储网络，提供低延迟、高可靠的存储访问',
  useCases: ['核心数据库', 'ERP系统', '虚拟化集群', '关键业务应用'],
  pros: ['延迟极低(<1ms)', '带宽高(32Gbps+)', '协议成熟稳定', '安全性高'],
  cons: ['成本高昂', '需要专用FC交换机', '距离受限(10km)', '技术门槛高'],
  nodes: [
    // 应用服务器层 - 第1行
    { id: 'app-server-1', type: 'server', name: '应用服务器-1', x: 50, y: 30, icon: Server, details: { model: 'Dell R750', ports: '2x FC HBA', protocol: 'FCP' } },
    { id: 'app-server-2', type: 'server', name: '应用服务器-2', x: 170, y: 30, icon: Server, details: { model: 'Dell R750', ports: '2x FC HBA', protocol: 'FCP' } },
    { id: 'app-server-3', type: 'server', name: '应用服务器-3', x: 290, y: 30, icon: Server, details: { model: 'Dell R750', ports: '2x FC HBA', protocol: 'FCP' } },
    { id: 'db-server-1', type: 'server', name: '数据库-1', x: 410, y: 30, icon: Database, details: { model: 'Oracle Exadata', ports: '4x FC HBA', protocol: 'FCP' } },
    { id: 'db-server-2', type: 'server', name: '数据库-2', x: 530, y: 30, icon: Database, details: { model: 'Oracle Exadata', ports: '4x FC HBA', protocol: 'FCP' } },
    
    // FC交换机层 - 第2行
    { id: 'fc-sw-core-1', type: 'switch', name: 'FC核心-A', x: 170, y: 150, icon: Network, details: { model: 'Brocade G720', ports: '48x 32G FC', speed: '32Gbps' } },
    { id: 'fc-sw-core-2', type: 'switch', name: 'FC核心-B', x: 410, y: 150, icon: Network, details: { model: 'Brocade G720', ports: '48x 32G FC', speed: '32Gbps' } },
    
    // 存储控制器层 - 第3行
    { id: 'ctrl-1a', type: 'controller', name: '控制器-A1', x: 110, y: 270, icon: Cpu, details: { model: 'Active', ports: '8x 32G FC' } },
    { id: 'ctrl-1b', type: 'controller', name: '控制器-A2', x: 230, y: 270, icon: Cpu, details: { model: 'Standby', ports: '8x 32G FC' } },
    { id: 'ctrl-2a', type: 'controller', name: '控制器-B1', x: 350, y: 270, icon: Cpu, details: { model: 'Active', ports: '8x 32G FC' } },
    { id: 'ctrl-2b', type: 'controller', name: '控制器-B2', x: 470, y: 270, icon: Cpu, details: { model: 'Standby', ports: '8x 32G FC' } },
    
    // 磁盘柜层 - 第4行
    { id: 'disk-shelf-1', type: 'disk', name: '磁盘柜-1', x: 50, y: 390, icon: HardDrive, details: { type: 'SSD', capacity: '800TB' } },
    { id: 'disk-shelf-2', type: 'disk', name: '磁盘柜-2', x: 170, y: 390, icon: HardDrive, details: { type: 'SSD', capacity: '800TB' } },
    { id: 'disk-shelf-3', type: 'disk', name: '磁盘柜-3', x: 290, y: 390, icon: HardDrive, details: { type: 'SSD', capacity: '800TB' } },
    { id: 'disk-shelf-4', type: 'disk', name: '磁盘柜-4', x: 410, y: 390, icon: HardDrive, details: { type: 'SSD', capacity: '800TB' } },
    { id: 'disk-shelf-5', type: 'disk', name: '磁盘柜-5', x: 530, y: 390, icon: HardDrive, details: { type: 'SSD', capacity: '800TB' } },
  ],
  connections: [
    // 服务器到核心交换机
    { from: 'app-server-1', to: 'fc-sw-core-1', type: 'fc', speed: '32Gbps', bandwidth: '32G FC' },
    { from: 'app-server-2', to: 'fc-sw-core-1', type: 'fc', speed: '32Gbps', bandwidth: '32G FC' },
    { from: 'app-server-3', to: 'fc-sw-core-1', type: 'fc', speed: '32Gbps', bandwidth: '32G FC' },
    { from: 'db-server-1', to: 'fc-sw-core-2', type: 'fc', speed: '32Gbps', bandwidth: '32G FC' },
    { from: 'db-server-2', to: 'fc-sw-core-2', type: 'fc', speed: '32Gbps', bandwidth: '32G FC' },
    
    // 核心交换机互联
    { from: 'fc-sw-core-1', to: 'fc-sw-core-2', type: 'fc', speed: '32Gbps', bandwidth: 'ISL Trunk' },
    
    // 交换机到存储控制器
    { from: 'fc-sw-core-1', to: 'ctrl-1a', type: 'fc', speed: '32Gbps', bandwidth: '32G FC' },
    { from: 'fc-sw-core-1', to: 'ctrl-1b', type: 'fc', speed: '32Gbps', bandwidth: '32G FC' },
    { from: 'fc-sw-core-2', to: 'ctrl-2a', type: 'fc', speed: '32Gbps', bandwidth: '32G FC' },
    { from: 'fc-sw-core-2', to: 'ctrl-2b', type: 'fc', speed: '32Gbps', bandwidth: '32G FC' },
    
    // 控制器到磁盘柜
    { from: 'ctrl-1a', to: 'disk-shelf-1', type: 'sas', speed: '12Gbps', bandwidth: 'SAS 12G' },
    { from: 'ctrl-1a', to: 'disk-shelf-2', type: 'sas', speed: '12Gbps', bandwidth: 'SAS 12G' },
    { from: 'ctrl-1b', to: 'disk-shelf-2', type: 'sas', speed: '12Gbps', bandwidth: 'SAS 12G' },
    { from: 'ctrl-2a', to: 'disk-shelf-3', type: 'sas', speed: '12Gbps', bandwidth: 'SAS 12G' },
    { from: 'ctrl-2a', to: 'disk-shelf-4', type: 'sas', speed: '12Gbps', bandwidth: 'SAS 12G' },
    { from: 'ctrl-2b', to: 'disk-shelf-4', type: 'sas', speed: '12Gbps', bandwidth: 'SAS 12G' },
    { from: 'ctrl-2b', to: 'disk-shelf-5', type: 'sas', speed: '12Gbps', bandwidth: 'SAS 12G' },
  ],
  dataFlow: [
    {
      path: ['app-server-1', 'fc-sw-core-1', 'ctrl-1a', 'disk-shelf-1'],
      description: '写IO路径: 应用服务器 → FC交换机 → 存储控制器 → 磁盘'
    },
    {
      path: ['db-server-1', 'fc-sw-core-2', 'ctrl-2a', 'disk-shelf-3'],
      description: '数据库读路径: 数据库服务器 → FC交换机 → 存储控制器 → 磁盘'
    }
  ]
};

// IP-SAN (iSCSI) 架构定义 - 重新设计布局
const IP_SAN_ARCHITECTURE: StorageArchitecture = {
  id: 'ip-san',
  name: 'IP-SAN',
  fullName: 'iSCSI Storage over IP Network',
  description: '基于IP网络的iSCSI块存储，利用现有以太网交换机实现存储网络',
  useCases: ['中小型企业', '虚拟化环境', '备份恢复', '开发测试'],
  pros: ['成本较低', '利用现有IP网络', '距离不受限', '易于管理'],
  cons: ['延迟较高(5-10ms)', '带宽受限', '与业务流量争用', '安全性需额外配置'],
  nodes: [
    // 应用服务器层 - 第1行
    { id: 'vm-host-1', type: 'server', name: 'ESXi-1', x: 50, y: 30, icon: Server, details: { model: 'HPE DL380', ports: '4x 10GbE', protocol: 'iSCSI' } },
    { id: 'vm-host-2', type: 'server', name: 'ESXi-2', x: 170, y: 30, icon: Server, details: { model: 'HPE DL380', ports: '4x 10GbE', protocol: 'iSCSI' } },
    { id: 'vm-host-3', type: 'server', name: 'ESXi-3', x: 290, y: 30, icon: Server, details: { model: 'HPE DL380', ports: '4x 10GbE', protocol: 'iSCSI' } },
    { id: 'backup-server', type: 'server', name: '备份服务器', x: 410, y: 30, icon: Database, details: { model: 'Veeam', ports: '2x 10GbE', protocol: 'iSCSI' } },
    
    // 以太网交换机层 - 第2行
    { id: 'eth-sw-core-1', type: 'switch', name: '核心交换机-A', x: 170, y: 150, icon: Network, details: { model: 'Cisco Nexus', ports: '48x 10GbE', speed: '10GbE' } },
    { id: 'eth-sw-core-2', type: 'switch', name: '核心交换机-B', x: 350, y: 150, icon: Network, details: { model: 'Cisco Nexus', ports: '48x 10GbE', speed: '10GbE' } },
    
    // 存储控制器层 - 第3行
    { id: 'iscsi-ctrl-1', type: 'controller', name: '控制器-A', x: 110, y: 270, icon: Cpu, details: { model: 'Active', ports: '4x 10GbE' } },
    { id: 'iscsi-ctrl-2', type: 'controller', name: '控制器-B', x: 230, y: 270, icon: Cpu, details: { model: 'Active', ports: '4x 10GbE' } },
    { id: 'iscsi-ctrl-3', type: 'controller', name: '控制器-C', x: 350, y: 270, icon: Cpu, details: { model: 'Active', ports: '4x 10GbE' } },
    { id: 'iscsi-ctrl-4', type: 'controller', name: '控制器-D', x: 470, y: 270, icon: Cpu, details: { model: 'Active', ports: '4x 10GbE' } },
    
    // 磁盘层 - 第4行
    { id: 'iscsi-disk-1', type: 'disk', name: '磁盘组-1', x: 170, y: 390, icon: HardDrive, details: { type: 'SAS', capacity: '200TB' } },
    { id: 'iscsi-disk-2', type: 'disk', name: '磁盘组-2', x: 350, y: 390, icon: HardDrive, details: { type: 'SAS', capacity: '200TB' } },
  ],
  connections: [
    // 服务器到交换机
    { from: 'vm-host-1', to: 'eth-sw-core-1', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    { from: 'vm-host-2', to: 'eth-sw-core-1', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    { from: 'vm-host-3', to: 'eth-sw-core-2', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    { from: 'backup-server', to: 'eth-sw-core-2', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    
    // 交换机互联
    { from: 'eth-sw-core-1', to: 'eth-sw-core-2', type: 'eth', speed: '40Gbps', bandwidth: 'vPC' },
    
    // 交换机到存储控制器
    { from: 'eth-sw-core-1', to: 'iscsi-ctrl-1', type: 'iscsi', speed: '10Gbps', bandwidth: 'iSCSI 10G' },
    { from: 'eth-sw-core-1', to: 'iscsi-ctrl-2', type: 'iscsi', speed: '10Gbps', bandwidth: 'iSCSI 10G' },
    { from: 'eth-sw-core-2', to: 'iscsi-ctrl-3', type: 'iscsi', speed: '10Gbps', bandwidth: 'iSCSI 10G' },
    { from: 'eth-sw-core-2', to: 'iscsi-ctrl-4', type: 'iscsi', speed: '10Gbps', bandwidth: 'iSCSI 10G' },
    
    // 控制器到磁盘
    { from: 'iscsi-ctrl-1', to: 'iscsi-disk-1', type: 'sas', speed: '12Gbps', bandwidth: 'SAS' },
    { from: 'iscsi-ctrl-2', to: 'iscsi-disk-1', type: 'sas', speed: '12Gbps', bandwidth: 'SAS' },
    { from: 'iscsi-ctrl-3', to: 'iscsi-disk-2', type: 'sas', speed: '12Gbps', bandwidth: 'SAS' },
    { from: 'iscsi-ctrl-4', to: 'iscsi-disk-2', type: 'sas', speed: '12Gbps', bandwidth: 'SAS' },
  ],
  dataFlow: [
    {
      path: ['vm-host-1', 'eth-sw-core-1', 'iscsi-ctrl-1', 'iscsi-disk-1'],
      description: 'iSCSI写IO: 封装SCSI为IP包 → 以太网传输 → 解封装 → 写入磁盘'
    }
  ]
};

// NAS 架构定义 - 重新设计布局
const NAS_ARCHITECTURE: StorageArchitecture = {
  id: 'nas',
  name: 'NAS',
  fullName: 'Network Attached Storage',
  description: '文件级存储，通过NFS/SMB协议提供共享文件服务',
  useCases: ['文件共享', '媒体处理', '用户目录', '日志存储'],
  pros: ['文件级访问', '多客户端共享', '协议标准化', '易于部署'],
  cons: ['不适合数据库', '协议开销大', '并发性能受限', '文件锁问题'],
  nodes: [
    // 客户端层 - 第1行
    { id: 'workstation-1', type: 'server', name: '工作站-1', x: 50, y: 30, icon: Server, details: { protocol: 'NFS/SMB' } },
    { id: 'workstation-2', type: 'server', name: '工作站-2', x: 170, y: 30, icon: Server, details: { protocol: 'NFS/SMB' } },
    { id: 'workstation-3', type: 'server', name: '工作站-3', x: 290, y: 30, icon: Server, details: { protocol: 'NFS/SMB' } },
    { id: 'render-farm', type: 'server', name: '渲染农场', x: 410, y: 30, icon: Cpu, details: { protocol: 'NFS', clients: '100+' } },
    
    // 交换机层 - 第2行
    { id: 'nas-sw-1', type: 'switch', name: '接入交换机-1', x: 170, y: 150, icon: Network, details: { speed: '10GbE' } },
    { id: 'nas-sw-2', type: 'switch', name: '接入交换机-2', x: 350, y: 150, icon: Network, details: { speed: '10GbE' } },
    
    // NAS网关层 - 第3行
    { id: 'nas-head-1', type: 'storage', name: 'NAS网关-A', x: 170, y: 270, icon: Share2, details: { model: 'NetApp FAS', protocol: 'NFSv4/SMB3' } },
    { id: 'nas-head-2', type: 'storage', name: 'NAS网关-B', x: 350, y: 270, icon: Share2, details: { model: 'NetApp FAS', protocol: 'NFSv4/SMB3' } },
    
    // 磁盘层 - 第4行
    { id: 'shelf-1', type: 'disk', name: 'SATA磁盘柜', x: 110, y: 390, icon: HardDrive, details: { type: 'SATA', capacity: '1PB' } },
    { id: 'shelf-2', type: 'disk', name: 'NL-SAS磁盘柜', x: 230, y: 390, icon: HardDrive, details: { type: 'NL-SAS', capacity: '800TB' } },
    { id: 'shelf-3', type: 'disk', name: 'SSD缓存层', x: 410, y: 390, icon: Zap, details: { type: 'SSD', capacity: '50TB' } },
  ],
  connections: [
    { from: 'workstation-1', to: 'nas-sw-1', type: 'eth', speed: '1Gbps', bandwidth: '1GbE' },
    { from: 'workstation-2', to: 'nas-sw-1', type: 'eth', speed: '1Gbps', bandwidth: '1GbE' },
    { from: 'workstation-3', to: 'nas-sw-2', type: 'eth', speed: '1Gbps', bandwidth: '1GbE' },
    { from: 'render-farm', to: 'nas-sw-2', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    { from: 'nas-sw-1', to: 'nas-head-1', type: 'nfs', speed: '10Gbps', bandwidth: 'NFS' },
    { from: 'nas-sw-2', to: 'nas-head-2', type: 'nfs', speed: '10Gbps', bandwidth: 'NFS' },
    { from: 'nas-head-1', to: 'shelf-1', type: 'sas', speed: '6Gbps', bandwidth: 'SAS' },
    { from: 'nas-head-1', to: 'shelf-2', type: 'sas', speed: '6Gbps', bandwidth: 'SAS' },
    { from: 'nas-head-2', to: 'shelf-3', type: 'sas', speed: '12Gbps', bandwidth: 'SAS' },
  ],
  dataFlow: [
    {
      path: ['workstation-1', 'nas-sw-1', 'nas-head-1', 'shelf-1'],
      description: '文件访问: 挂载NFS共享 → 文件协议传输 → NAS网关处理 → 磁盘读写'
    }
  ]
};

// 分布式存储架构 (Ceph) - 重新设计布局
const CEPH_ARCHITECTURE: StorageArchitecture = {
  id: 'ceph',
  name: 'Ceph分布式存储',
  fullName: 'Ceph Unified Distributed Storage',
  description: '软件定义的统一分布式存储，提供块、文件、对象三种接口',
  useCases: ['OpenStack后端', '云原生应用', '大规模对象存储', '统一存储平台'],
  pros: ['无单点故障', '水平扩展', '统一存储接口', '开源免费'],
  cons: ['部署复杂', '需要专业知识', '小集群性能差', '网络要求高'],
  nodes: [
    // 客户端层 - 第1行
    { id: 'openstack-ctrl', type: 'server', name: 'OpenStack控制', x: 50, y: 30, icon: Cloud, details: { role: 'Controller', protocol: 'RBD' } },
    { id: 'k8s-cluster', type: 'server', name: 'K8s集群', x: 170, y: 30, icon: Box, details: { role: 'Worker', protocol: 'RBD/CSI' } },
    { id: 's3-client', type: 'server', name: 'S3客户端', x: 290, y: 30, icon: Globe, details: { role: 'App', protocol: 'S3 API' } },
    
    // 网络层 - 第2行 (Public网络在左，Cluster网络在右，并排显示)
    { id: 'ceph-pub-sw', type: 'switch', name: 'Public网络', x: 110, y: 150, icon: Network, details: { role: 'Client', speed: '25GbE' } },
    { id: 'ceph-clu-sw', type: 'switch', name: 'Cluster网络', x: 290, y: 150, icon: Network, details: { role: 'Replication', speed: '25GbE' } },
    
    // MON节点 - 第3行 (只连Public网络)
    { id: 'mon-1', type: 'server', name: 'MON-1', x: 50, y: 270, icon: Activity, details: { role: 'Monitor', daemon: 'ceph-mon' } },
    { id: 'mon-2', type: 'server', name: 'MON-2', x: 170, y: 270, icon: Activity, details: { role: 'Monitor', daemon: 'ceph-mon' } },
    { id: 'mon-3', type: 'server', name: 'MON-3', x: 290, y: 270, icon: Activity, details: { role: 'Monitor', daemon: 'ceph-mon' } },
    
    // MGR节点 - 第4行 (只连Public网络)
    { id: 'mgr-1', type: 'server', name: 'MGR-1', x: 110, y: 390, icon: Cpu, details: { role: 'Manager', daemon: 'ceph-mgr' } },
    { id: 'mgr-2', type: 'server', name: 'MGR-2', x: 230, y: 390, icon: Cpu, details: { role: 'Manager', daemon: 'ceph-mgr' } },
    
    // MDS节点 - 第4行右侧 (只连Public网络)
    { id: 'mds-1', type: 'server', name: 'MDS-1', x: 350, y: 390, icon: Share2, details: { role: 'Metadata', daemon: 'ceph-mds' } },
    { id: 'mds-2', type: 'server', name: 'MDS-2', x: 470, y: 390, icon: Share2, details: { role: 'Metadata', daemon: 'ceph-mds' } },
    
    // RGW节点 - 第5行 (只连Public网络)
    { id: 'rgw-1', type: 'server', name: 'RGW-1', x: 230, y: 510, icon: Globe, details: { role: 'Object GW', daemon: 'radosgw' } },
    { id: 'rgw-2', type: 'server', name: 'RGW-2', x: 350, y: 510, icon: Globe, details: { role: 'Object GW', daemon: 'radosgw' } },
    
    // OSD节点 - 第6行 (双网卡：同时连Public和Cluster)
    { id: 'osd-1', type: 'server', name: 'OSD-1', x: 50, y: 630, icon: Database, details: { role: 'Storage', disks: '12x SSD' } },
    { id: 'osd-2', type: 'server', name: 'OSD-2', x: 170, y: 630, icon: Database, details: { role: 'Storage', disks: '12x SSD' } },
    { id: 'osd-3', type: 'server', name: 'OSD-3', x: 290, y: 630, icon: Database, details: { role: 'Storage', disks: '12x SSD' } },
    { id: 'osd-4', type: 'server', name: 'OSD-4', x: 410, y: 630, icon: Database, details: { role: 'Storage', disks: '12x SSD' } },
    { id: 'osd-5', type: 'server', name: 'OSD-5', x: 530, y: 630, icon: Database, details: { role: 'Storage', disks: '12x SSD' } },
  ],
  connections: [
    // 客户端到Public网络
    { from: 'openstack-ctrl', to: 'ceph-pub-sw', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    { from: 'k8s-cluster', to: 'ceph-pub-sw', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    { from: 's3-client', to: 'ceph-pub-sw', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    
    // Public网络到MON
    { from: 'ceph-pub-sw', to: 'mon-1', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    { from: 'ceph-pub-sw', to: 'mon-2', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    { from: 'ceph-pub-sw', to: 'mon-3', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    
    // Public网络到MGR
    { from: 'ceph-pub-sw', to: 'mgr-1', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    { from: 'ceph-pub-sw', to: 'mgr-2', type: 'eth', speed: '10Gbps', bandwidth: '10GbE' },
    
    // Public网络到MDS
    { from: 'ceph-pub-sw', to: 'mds-1', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    { from: 'ceph-pub-sw', to: 'mds-2', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    
    // Public网络到RGW
    { from: 'ceph-pub-sw', to: 'rgw-1', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    { from: 'ceph-pub-sw', to: 'rgw-2', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    
    // OSD节点双网卡连接：Public网络（客户端通信）
    { from: 'ceph-pub-sw', to: 'osd-1', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    { from: 'ceph-pub-sw', to: 'osd-2', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    { from: 'ceph-pub-sw', to: 'osd-3', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    
    // OSD节点双网卡连接：Cluster网络（副本复制）
    { from: 'ceph-clu-sw', to: 'osd-3', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    { from: 'ceph-clu-sw', to: 'osd-4', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    { from: 'ceph-clu-sw', to: 'osd-5', type: 'eth', speed: '25Gbps', bandwidth: '25GbE' },
    
    // 网络交换机互联（可选，用于管理流量）
    { from: 'ceph-pub-sw', to: 'ceph-clu-sw', type: 'eth', speed: '40Gbps', bandwidth: 'Trunk' },
  ],
  dataFlow: [
    {
      path: ['k8s-cluster', 'ceph-pub-sw', 'mon-1', 'osd-1'],
      description: 'Ceph写IO: 客户端 → MON获取OSDMap → 计算PG位置 → 主OSD写入'
    },
    {
      path: ['osd-1', 'ceph-clu-sw', 'osd-2'],
      description: '数据复制: 主OSD通过Cluster网络复制数据到从OSD'
    }
  ]
};

// 超融合HCI架构 - 重新设计布局
const HCI_ARCHITECTURE: StorageArchitecture = {
  id: 'hci',
  name: '超融合HCI',
  fullName: 'Hyper-Converged Infrastructure',
  description: '计算、存储、网络融合在同一节点，软件定义的数据中心',
  useCases: ['虚拟桌面VDI', '远程办公', '边缘计算', '中小数据中心'],
  pros: ['一体化部署', '线性扩展', '简化管理', '成本可控'],
  cons: ['计算存储绑定', '扩容粒度大', '网络要求严格', '厂商锁定'],
  nodes: [
    // 管理平面 - 第1行
    { id: 'vcenter', type: 'server', name: 'vCenter', x: 290, y: 30, icon: Cloud, details: { role: 'Management', platform: 'VMware' } },
    
    // HCI节点 - 第2行
    { id: 'hci-node-1', type: 'server', name: 'HCI-1', x: 50, y: 150, icon: Layers, details: { cpu: '2x 32C', ram: '512GB', storage: '8x SSD' } },
    { id: 'hci-node-2', type: 'server', name: 'HCI-2', x: 170, y: 150, icon: Layers, details: { cpu: '2x 32C', ram: '512GB', storage: '8x SSD' } },
    { id: 'hci-node-3', type: 'server', name: 'HCI-3', x: 290, y: 150, icon: Layers, details: { cpu: '2x 32C', ram: '512GB', storage: '8x SSD' } },
    { id: 'hci-node-4', type: 'server', name: 'HCI-4', x: 410, y: 150, icon: Layers, details: { cpu: '2x 32C', ram: '512GB', storage: '8x SSD' } },
    
    // 网络层 - 第3行
    { id: 'hci-sw-1', type: 'switch', name: '管理网络', x: 110, y: 270, icon: Network, details: { speed: '1GbE' } },
    { id: 'hci-sw-2', type: 'switch', name: 'vMotion网络', x: 230, y: 270, icon: Network, details: { speed: '10GbE' } },
    { id: 'hci-sw-3', type: 'switch', name: '存储网络', x: 350, y: 270, icon: Network, details: { speed: '25GbE' } },
    
    // 虚拟机和vSAN - 第4行
    { id: 'vm-1', type: 'server', name: 'VM-1', x: 50, y: 390, icon: Box, details: { type: 'Compute' } },
    { id: 'vsan-1', type: 'storage', name: 'vSAN-1', x: 170, y: 390, icon: Database, details: { type: 'Storage' } },
    { id: 'vm-2', type: 'server', name: 'VM-2', x: 290, y: 390, icon: Box, details: { type: 'Compute' } },
    { id: 'vsan-2', type: 'storage', name: 'vSAN-2', x: 410, y: 390, icon: Database, details: { type: 'Storage' } },
    
    // 物理磁盘 - 第5行
    { id: 'cache-1', type: 'disk', name: '缓存-1', x: 110, y: 510, icon: Zap, details: { type: 'NVMe', capacity: '3.2TB' } },
    { id: 'capacity-1', type: 'disk', name: '容量-1', x: 230, y: 510, icon: HardDrive, details: { type: 'SATA', capacity: '15TB' } },
    { id: 'cache-2', type: 'disk', name: '缓存-2', x: 350, y: 510, icon: Zap, details: { type: 'NVMe', capacity: '3.2TB' } },
    { id: 'capacity-2', type: 'disk', name: '容量-2', x: 470, y: 510, icon: HardDrive, details: { type: 'SATA', capacity: '15TB' } },
  ],
  connections: [
    // vCenter到管理网络
    { from: 'vcenter', to: 'hci-sw-1', type: 'eth', speed: '1Gbps', bandwidth: 'Mgmt' },
    
    // 管理网络到HCI节点
    { from: 'hci-sw-1', to: 'hci-node-1', type: 'eth', speed: '1Gbps', bandwidth: 'Mgmt' },
    { from: 'hci-sw-1', to: 'hci-node-2', type: 'eth', speed: '1Gbps', bandwidth: 'Mgmt' },
    { from: 'hci-sw-1', to: 'hci-node-3', type: 'eth', speed: '1Gbps', bandwidth: 'Mgmt' },
    { from: 'hci-sw-1', to: 'hci-node-4', type: 'eth', speed: '1Gbps', bandwidth: 'Mgmt' },
    
    // vMotion网络到HCI节点
    { from: 'hci-sw-2', to: 'hci-node-1', type: 'eth', speed: '10Gbps', bandwidth: 'vMotion' },
    { from: 'hci-sw-2', to: 'hci-node-2', type: 'eth', speed: '10Gbps', bandwidth: 'vMotion' },
    { from: 'hci-sw-2', to: 'hci-node-3', type: 'eth', speed: '10Gbps', bandwidth: 'vMotion' },
    { from: 'hci-sw-2', to: 'hci-node-4', type: 'eth', speed: '10Gbps', bandwidth: 'vMotion' },
    
    // 存储网络到HCI节点
    { from: 'hci-sw-3', to: 'hci-node-1', type: 'eth', speed: '25Gbps', bandwidth: 'vSAN' },
    { from: 'hci-sw-3', to: 'hci-node-2', type: 'eth', speed: '25Gbps', bandwidth: 'vSAN' },
    { from: 'hci-sw-3', to: 'hci-node-3', type: 'eth', speed: '25Gbps', bandwidth: 'vSAN' },
    { from: 'hci-sw-3', to: 'hci-node-4', type: 'eth', speed: '25Gbps', bandwidth: 'vSAN' },
    
    // VM到vSAN
    { from: 'vm-1', to: 'vsan-1', type: 'eth', speed: 'Internal', bandwidth: 'Local' },
    { from: 'vm-2', to: 'vsan-2', type: 'eth', speed: 'Internal', bandwidth: 'Local' },
    
    // vSAN到磁盘
    { from: 'vsan-1', to: 'cache-1', type: 'nvme', speed: 'PCIe', bandwidth: 'NVMe' },
    { from: 'vsan-1', to: 'capacity-1', type: 'sas', speed: '6Gbps', bandwidth: 'SATA' },
    { from: 'vsan-2', to: 'cache-2', type: 'nvme', speed: 'PCIe', bandwidth: 'NVMe' },
    { from: 'vsan-2', to: 'capacity-2', type: 'sas', speed: '6Gbps', bandwidth: 'SATA' },
  ],
  dataFlow: [
    {
      path: ['vm-1', 'vsan-1', 'hci-sw-3', 'hci-node-2'],
      description: 'HCI存储IO: VM写入 → 本地vSAN缓存 → 网络复制到其他节点 → 持久化'
    }
  ]
};

// 架构集合
const ARCHITECTURES: Record<string, StorageArchitecture> = {
  'fc-san': FC_SAN_ARCHITECTURE,
  'ip-san': IP_SAN_ARCHITECTURE,
  'nas': NAS_ARCHITECTURE,
  'ceph': CEPH_ARCHITECTURE,
  'hci': HCI_ARCHITECTURE,
};

// ============================================
// 主组件
// ============================================

export function StorageArchitectureScene() {
  const [selectedArch, setSelectedArch] = useState<string>('fc-san');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showDataFlow, setShowDataFlow] = useState(false);
  const [currentFlowStep, setCurrentFlowStep] = useState(0);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  
  const architecture = ARCHITECTURES[selectedArch];
  const svgRef = useRef<SVGSVGElement>(null);

  // 获取连接线的颜色
  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'fc': return '#3b82f6'; // blue
      case 'eth': return '#22c55e'; // green
      case 'iscsi': return '#f59e0b'; // amber
      case 'nfs': return '#8b5cf6'; // purple
      case 'sas': return '#06b6d4'; // cyan
      case 'nvme': return '#ef4444'; // red
      default: return '#6b7280';
    }
  };

  // 获取连接线的样式
  const getConnectionStyle = (type: string) => {
    switch (type) {
      case 'fc': return { strokeDasharray: '0', strokeWidth: 3 };
      case 'eth': return { strokeDasharray: '0', strokeWidth: 2 };
      case 'iscsi': return { strokeDasharray: '5,3', strokeWidth: 2 };
      case 'nfs': return { strokeDasharray: '5,3', strokeWidth: 2 };
      case 'sas': return { strokeDasharray: '0', strokeWidth: 2 };
      case 'nvme': return { strokeDasharray: '0', strokeWidth: 3 };
      default: return { strokeDasharray: '0', strokeWidth: 1 };
    }
  };

  // 参数定义
  const parameters = [
    {
      id: 'architecture',
      name: '存储架构',
      type: 'select' as const,
      value: selectedArch,
      options: [
        { value: 'fc-san', label: 'FC-SAN (光纤通道)' },
        { value: 'ip-san', label: 'IP-SAN (iSCSI)' },
        { value: 'nas', label: 'NAS (文件存储)' },
        { value: 'ceph', label: 'Ceph (分布式)' },
        { value: 'hci', label: '超融合HCI' },
      ]
    },
    {
      id: 'dataFlow',
      name: '显示数据流',
      type: 'boolean' as const,
      value: showDataFlow,
    }
  ];

  const handleParameterChange = (id: string, value: string | number | boolean) => {
    if (id === 'architecture') {
      setSelectedArch(value as string);
      setSelectedNode(null);
      setCurrentFlowStep(0);
    } else if (id === 'dataFlow') {
      setShowDataFlow(value as boolean);
    }
  };

  const sceneData = {
    id: 'storage-architecture',
    title: '企业存储架构拓扑',
    description: '真实生产环境的存储架构拓扑可视化：FC-SAN、IP-SAN、NAS、Ceph、HCI',
    phase: 2 as const,
    category: '存储',
    duration: '10-15分钟',
    difficulty: 'hard' as const,
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* 参数面板 - 缩小到2列 */}
        <div className="col-span-2 h-full overflow-y-auto">
          <ParameterPanel
            title="架构选择"
            parameters={parameters}
            onChange={handleParameterChange}
          />

          {/* 架构概览 */}
          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">{architecture.name}</h3>
            <p className="text-xs text-slate-400 mb-2">{architecture.fullName}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{architecture.description}</p>
          </div>

          {/* 适用场景 */}
          <InfoPanel
            title="适用场景"
            content={
              <div className="flex flex-wrap gap-1.5">
                {architecture.useCases.map((useCase, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">
                    {useCase}
                  </span>
                ))}
              </div>
            }
          />

          {/* 优缺点 */}
          <InfoPanel
            title="优势"
            content={
              <ul className="space-y-1">
                {architecture.pros.map((pro, idx) => (
                  <li key={idx} className="text-xs text-green-400 flex items-start gap-1.5">
                    <span className="text-green-500">+</span>
                    {pro}
                  </li>
                ))}
              </ul>
            }
          />

          <InfoPanel
            title="劣势"
            content={
              <ul className="space-y-1">
                {architecture.cons.map((con, idx) => (
                  <li key={idx} className="text-xs text-red-400 flex items-start gap-1.5">
                    <span className="text-red-500">-</span>
                    {con}
                  </li>
                ))}
              </ul>
            }
          />
        </div>

        {/* 拓扑可视化区域 - 扩大到8列 */}
        <div className="col-span-8">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 h-[calc(100vh-180px)] relative overflow-hidden">
            {/* SVG 拓扑图 */}
            <svg
              ref={svgRef}
              viewBox="0 0 650 750"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
              style={{ background: 'transparent' }}
            >
              {/* 定义箭头标记 */}
              <defs>
                <marker
                  id="arrowhead-fc"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
                <marker
                  id="arrowhead-eth"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                </marker>
                <marker
                  id="arrowhead-iscsi"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
                </marker>
                <marker
                  id="arrowhead-nfs"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
                </marker>
                <marker
                  id="arrowhead-sas"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#06b6d4" />
                </marker>
                <marker
                  id="arrowhead-nvme"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                </marker>
              </defs>

              {/* 连接线 */}
              {architecture.connections.map((conn, idx) => {
                const fromNode = architecture.nodes.find(n => n.id === conn.from);
                const toNode = architecture.nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;

                const color = getConnectionColor(conn.type);
                const style = getConnectionStyle(conn.type);
                const isHovered = hoveredConnection === `${conn.from}-${conn.to}`;

                return (
                  <g key={idx}>
                    <line
                      x1={fromNode.x + 40}
                      y1={fromNode.y + 40}
                      x2={toNode.x + 40}
                      y2={toNode.y + 40}
                      stroke={color}
                      strokeOpacity={isHovered ? 1 : 0.6}
                      markerEnd={`url(#arrowhead-${conn.type})`}
                      onMouseEnter={() => setHoveredConnection(`${conn.from}-${conn.to}`)}
                      onMouseLeave={() => setHoveredConnection(null)}
                      style={{
                        ...style,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    />
                    {/* 连接标签 */}
                    {isHovered && (
                      <g>
                        <rect
                          x={(fromNode.x + toNode.x) / 2 + 30}
                          y={(fromNode.y + toNode.y) / 2 + 25}
                          width="90"
                          height="24"
                          rx="4"
                          fill="rgba(15, 23, 42, 0.95)"
                          stroke={color}
                          strokeWidth="1"
                        />
                        <text
                          x={(fromNode.x + toNode.x) / 2 + 75}
                          y={(fromNode.y + toNode.y) / 2 + 41}
                          textAnchor="middle"
                          fill={color}
                          fontSize="11"
                          fontWeight="500"
                        >
                          {conn.bandwidth}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 数据流动画 */}
              {showDataFlow && architecture.dataFlow.map((flow, flowIdx) => (
                <g key={`flow-${flowIdx}`}>
                  {flow.path.slice(0, -1).map((nodeId, i) => {
                    const fromNode = architecture.nodes.find(n => n.id === nodeId);
                    const toNode = architecture.nodes.find(n => n.id === flow.path[i + 1]);
                    if (!fromNode || !toNode) return null;

                    return (
                      <motion.circle
                        key={`packet-${flowIdx}-${i}`}
                        r="5"
                        fill="#fbbf24"
                        initial={{ cx: fromNode.x + 40, cy: fromNode.y + 40 }}
                        animate={{
                          cx: [fromNode.x + 40, toNode.x + 40],
                          cy: [fromNode.y + 40, toNode.y + 40],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.5,
                          ease: "linear"
                        }}
                      />
                    );
                  })}
                </g>
              ))}

              {/* 节点 - 80x80尺寸 */}
              {architecture.nodes.map((node) => {
                const Icon = node.icon;
                const isSelected = selectedNode === node.id;
                const nodeColor = isSelected ? '#fbbf24' : '#64748b';

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 节点背景 */}
                    <rect
                      x={node.x}
                      y={node.y}
                      width="80"
                      height="80"
                      rx="10"
                      fill={isSelected ? 'rgba(251, 191, 36, 0.15)' : 'rgba(30, 41, 59, 0.9)'}
                      stroke={nodeColor}
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    {/* 图标 */}
                    <foreignObject x={node.x + 20} y={node.y + 15} width="40" height="40">
                      <div className="flex items-center justify-center w-full h-full">
                        <Icon className="w-8 h-8" style={{ color: nodeColor }} />
                      </div>
                    </foreignObject>
                    {/* 节点名称 */}
                    <text
                      x={node.x + 40}
                      y={node.y + 68}
                      textAnchor="middle"
                      fill={isSelected ? '#fbbf24' : '#94a3b8'}
                      fontSize="10"
                      fontWeight="500"
                    >
                      {node.name.length > 8 ? node.name.slice(0, 8) + '...' : node.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* 图例 */}
            <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-3 border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">连接类型</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-blue-500"></div>
                  <span className="text-xs text-slate-500">FC (光纤通道)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-green-500"></div>
                  <span className="text-xs text-slate-500">Ethernet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-amber-500" style={{ borderTop: '1px dashed' }}></div>
                  <span className="text-xs text-slate-500">iSCSI</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-purple-500" style={{ borderTop: '1px dashed' }}></div>
                  <span className="text-xs text-slate-500">NFS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-cyan-500"></div>
                  <span className="text-xs text-slate-500">SAS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-red-500"></div>
                  <span className="text-xs text-slate-500">NVMe</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 信息面板 - 缩小到2列 */}
        <div className="col-span-2 space-y-3 h-full overflow-y-auto">
          {/* 选中节点详情 */}
          {selectedNode && (
            <InfoPanel
              title="节点详情"
              content={(() => {
                const node = architecture.nodes.find(n => n.id === selectedNode);
                if (!node) return null;
                return (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">名称</div>
                      <div className="text-sm text-slate-200 font-medium">{node.name}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">类型</div>
                      <div className="text-sm text-slate-200">{node.type}</div>
                    </div>
                    {node.details && Object.entries(node.details).map(([key, value]) => (
                      <div key={key} className="p-2 bg-slate-800/50 rounded">
                        <div className="text-xs text-slate-400 capitalize">{key}</div>
                        <div className="text-sm text-slate-300">{value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            />
          )}

          {/* 数据流说明 */}
          {showDataFlow && architecture.dataFlow.length > 0 && (
            <InfoPanel
              title="数据流说明"
              content={
                <div className="space-y-2">
                  {architecture.dataFlow.map((flow, idx) => (
                    <div key={idx} className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-amber-400 mb-1">路径 {idx + 1}</div>
                      <div className="text-xs text-slate-400">{flow.description}</div>
                    </div>
                  ))}
                </div>
              }
            />
          )}

          {/* 架构对比 */}
          <InfoPanel
            title="架构对比"
            content={
              <div className="space-y-2">
                {Object.entries(ARCHITECTURES).map(([key, arch]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedArch === key
                        ? 'bg-slate-700 border-slate-500'
                        : 'bg-slate-800/50 hover:bg-slate-700/50'
                    }`}
                    onClick={() => setSelectedArch(key)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">{arch.name}</span>
                      <span className="text-xs text-slate-500">{arch.useCases[0]}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{arch.nodes.length} 个组件</div>
                  </div>
                ))}
              </div>
            }
          />
        </div>
      </div>
    </SceneLayout>
  );
}

export default StorageArchitectureScene;
