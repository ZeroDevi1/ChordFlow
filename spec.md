# ChordFlow - MVP PRD

## 项目概述

面向键盘（钢琴/电钢琴）初学者的练习辅助 PWA 工具，通过随机化练习和节拍器编排提升练习效率。

## MVP 范围

### 核心功能（按优先级）

1. **节拍器（Metronome）**
   - 可视化节拍显示
   - BPM 调节（40-208）
   - 拍号选择（4/4, 3/4, 6/8）
   - 基础拍/半拍细分/三连音细分
   - 混合编排支持
   - 音频反馈（可开关）

2. **音阶练习（Scale Practice）**
   - 自然大调/自然小调
   - 两个八度上下行
   - 五度圈下行顺序
   - Random 音阶练习（连续 N 调）
   - 练习进度记录

3. **和弦琶音练习（Chord Arpeggio）**
   - 大三和弦/小三和弦
   - 两个八度琶音（2 小节）
   - 五度圈下行顺序
   - 就近连接琶音（Voice Leading）
   - 练习进度记录

4. **MIDI 输入检测**
   - Web MIDI API 集成
   - 实时音符检测
   - 练习正确性验证
   - 连接状态显示

### 技术架构

- **前端**: Vite + React + TypeScript
- **后端**: Fastify + TypeScript
- **数据库**: SQLite
- **认证**: JWT
- **项目结构**: pnpm workspace monorepo
- **PWA**: Service Worker + Cache API

### 项目结构

```
ChordFlow/
├── packages/
│   ├── shared/          # 共享类型定义
│   ├── frontend/        # React 前端
│   └── backend/         # Fastify 后端
├── docs/
│   └── adr/             # 架构决策记录
├── spec.md              # 本文件
├── CONTEXT.md           # 领域上下文
├── pnpm-workspace.yaml  # pnpm workspace 配置
└── package.json         # 根 package.json
```

## 验收标准

### 节拍器

- [ ] 用户可以调节 BPM（40-208）
- [ ] 用户可以选择拍号（4/4, 3/4, 6/8）
- [ ] 用户可以选择细分类型（基础拍/半拍/三连音/混合）
- [ ] 混合模式下用户可以为每拍指定细分类型
- [ ] 节拍器可以播放/暂停/停止
- [ ] 可视化显示当前拍位
- [ ] 音频反馈可开关

### 项目脚手架

- [ ] pnpm workspace monorepo 结构
- [ ] 前端 Vite + React + TypeScript 项目可启动
- [ ] 后端 Fastify + TypeScript 项目可启动
- [ ] 共享类型包可被前后端引用
- [ ] 基础开发环境配置（ESLint, Prettier）

## 非目标（MVP 不包含）

- 五线谱显示
- 用户认证系统
- 练习数据云同步
- 社交功能
- 移动端适配（专注 iPad Pro 11 英寸横屏）

## 风险与依赖

- Web MIDI API 需要用户授权，部分浏览器可能不支持
- Web Audio API 需要用户交互后才能播放音频
- iPad Safari 对 PWA 支持有限，优先测试 Chrome

## 开发顺序

1. 项目脚手架搭建
2. 节拍器核心功能
3. 音阶练习基础
4. 和弦琶音练习
5. MIDI 输入集成
6. PWA 配置
