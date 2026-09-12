/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Fix-9: Design Tokens 集中定义
 *
 * 全 ETL designer 模块统一色板/圆角/字号/阴影,避免散落硬编码 #2080f0 / #c0c4cc / #f0a020
 *
 * 使用方式:
 *   import { Colors, Radius, Spacing, FontSize, Shadow } from './design-tokens'
 *   <div style={{ color: Colors.textPrimary, borderRadius: Radius.md }} />
 */

// ===== 色板 =====
// 中性色
export const Colors = {
  // 文字
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#6B7280',
  textDisabled: '#94A3B8',
  textOnDark: '#F8FAFC',

  // 背景
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  bgTertiary: '#F1F5F9',
  bgDark: '#1E1E1E',
  bgDarkSubtle: '#18181B',
  bgHover: '#F5F7FA',

  // 边框
  borderPrimary: '#D0D5DD',
  borderSecondary: '#E2E8F0',
  borderTertiary: '#F1F5F9',
  borderDark: '#27272A',

  // 主题色(品牌蓝)
  primary: '#2080F0',
  primaryHover: '#4096FC',
  primaryActive: '#1060D9',
  primarySubtle: '#E6F1FF',
  primaryOn: '#FFFFFF',

  // 状态
  success: '#10B981',
  successSubtle: '#D1FAE5',
  warning: '#F59E0B',
  warningSubtle: '#FEF3C7',
  error: '#EF4444',
  errorSubtle: '#FEE2E2',
  info: '#3B82F6',
  infoSubtle: '#DBEAFE',

  // 节点分类色(Fix-2 落地)
  category: {
    source: '#3B82F6',     // 蓝
    transform: '#F59E0B',  // 橙
    filter: '#14B8A6',     // 青
    compare: '#F97316',    // 深橙
    join: '#A855F7',       // 紫
    sql: '#EC4899',        // 粉
    cdc: '#10B981',        // 绿
    sink: '#0EA5E9',       // 天蓝
    preview: '#6366F1'     // 靛
  } as Record<string, string>,

  // 状态指示灯(Fix-3 落地)
  status: {
    empty: '#94A3B8',     // 灰
    partial: '#F59E0B',   // 橙
    ready: '#10B981',     // 绿
    error: '#EF4444'      // 红
  } as Record<string, string>,

  // 节点默认/hover
  nodeDefault: '#7A8599',
  nodeHover: '#288FFF',

  // 旧 token 兼容 (把 #2080f0 #c0c4cc #f0a020 #fafafa #f5f7fa 全映射过来)
  legacy: {
    blue2080: '#2080F0',
    grayC0C4: '#C0C4CC',
    orangeF0A: '#F0A020',
    grayFAFA: '#FAFAFA',
    grayF5F7: '#F5F7FA'
  }
} as const

// ===== 圆角 =====
export const Radius = {
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px'
} as const

// ===== 间距 =====
export const Spacing = {
  xxs: '2px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '24px',
  xxxl: '32px'
} as const

// ===== 字号 =====
export const FontSize = {
  xs: '11px',
  sm: '12px',
  md: '13px',
  base: '14px',
  lg: '16px',
  xl: '18px',
  xxl: '20px',
  xxxl: '24px'
} as const

// ===== 字重 =====
export const FontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
} as const

// ===== 阴影 =====
export const Shadow = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.06)',
  md: '0 4px 8px rgba(0, 0, 0, 0.08)',
  lg: '0 6px 16px rgba(0, 0, 0, 0.12)',
  xl: '0 8px 24px rgba(0, 0, 0, 0.16)',
  innerInset: 'inset 0 1px 2px rgba(0, 0, 0, 0.06)'
} as const

// ===== 节点尺寸 =====
export const NodeSize = {
  width: 220,
  height: 48,
  portRadius: 5,
  borderRadius: 6,
  categoryBarWidth: 4,
  statusDotRadius: 4
} as const

// ===== 抽屉/弹窗 =====
export const Overlay = {
  drawerWidth: 520,           // Fix-5: 抽屉宽度
  drawerMaxWidth: '90vw',
  modalWidthSm: 600,
  modalWidthMd: 900,
  modalWidthLg: 980,          // 测试运行日志弹窗
  modalMaxWidth: '95vw'
} as const
