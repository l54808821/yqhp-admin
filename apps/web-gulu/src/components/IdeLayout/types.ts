export interface TabItem {
  /** 唯一标识 */
  id: string | number;
  /** 显示名称 */
  title: string;
  /** 图标 */
  icon?: string;
  /** 是否已修改 */
  modified?: boolean;
  /** 是否固定（非预览模式） */
  pinned?: boolean;
  /** 额外数据 */
  data?: Record<string, any>;
}

export interface IdeLayoutProps {
  /** 左侧面板默认宽度 */
  sidebarWidth?: number;
  /** 左侧面板最小宽度 */
  sidebarMinWidth?: number;
  /** 左侧面板最大宽度 */
  sidebarMaxWidth?: number;
  /** localStorage 存储 key */
  storageKey?: string;
}
