export interface NavigationItem {
  label: string;
  children?: NavigationItem[];
}

export const NAV_TREE: NavigationItem[] = [
  {
    label: "数学工具",
    children: [
      {
        label: "微积分",
        children: [
          { label: "极限与连续" },
          { label: "导数与微分" },
          { label: "积分" },
          { label: "常微分方程" },
          { label: "变分法" }
        ]
      },
      { label: "线性代数", children: [{ label: "向量与矩阵" }, { label: "线性空间" }] },
      { label: "矢量分析" },
      { label: "复数与复变函数" },
      { label: "概率与统计" },
      { label: "常用特殊函数" }
    ]
  },
  {
    label: "经典力学",
    children: [
      { label: "质点运动学" },
      { label: "质点动力学" },
      { label: "刚体力学" },
      { label: "流体力学" },
      { label: "振动与波" },
      { label: "万有引力与天体物理" },
      { label: "分析力学" }
    ]
  },
  {
    label: "热学与统计物理",
    children: [{ label: "热学基本概念和物质聚集态" }, { label: "热平衡态的统计分布律" }, { label: "热力学第一定律" }]
  },
  { label: "电磁学" },
  { label: "光学" },
  { label: "近代物理" },
  { label: "实验物理" },
  { label: "计算物理与工具" },
  { label: "竞赛相关" }
];
