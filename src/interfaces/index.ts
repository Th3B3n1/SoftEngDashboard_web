export * from '../engine/types';
export * from '../moodle/types';

export interface NavItem {
  name: string;
  path: string;
  iconName: string;
  badge?: string | number;
}

