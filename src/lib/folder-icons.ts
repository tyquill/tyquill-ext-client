import {
  IoFolder,
  IoBookOutline,
  IoBriefcaseOutline,
  IoCodeSlashOutline,
  IoServerOutline,
  IoHeartOutline,
  IoBulbOutline,
  IoRocketOutline,
  IoStarOutline,
  IoNavigateOutline,
  IoArchiveOutline,
  IoCubeOutline,
  IoShieldCheckmarkOutline,
  IoTrophyOutline,
  IoRibbonOutline,
  IoFlagOutline,
  IoGiftOutline,
  IoMailOutline,
} from 'react-icons/io5';

export interface FolderIconOption {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
}

export const FOLDER_ICON_OPTIONS: FolderIconOption[] = [
  { id: 'folder', name: 'Folder', icon: IoFolder },
  { id: 'book-open', name: 'Book', icon: IoBookOutline },
  { id: 'briefcase', name: 'Briefcase', icon: IoBriefcaseOutline },
  { id: 'code', name: 'Code', icon: IoCodeSlashOutline },
  { id: 'database', name: 'Database', icon: IoServerOutline },
  { id: 'heart', name: 'Heart', icon: IoHeartOutline },
  { id: 'lightbulb', name: 'Idea', icon: IoBulbOutline },
  { id: 'rocket', name: 'Rocket', icon: IoRocketOutline },
  { id: 'star', name: 'Star', icon: IoStarOutline },
  { id: 'target', name: 'Target', icon: IoNavigateOutline },
  { id: 'archive', name: 'Archive', icon: IoArchiveOutline },
  { id: 'package', name: 'Package', icon: IoCubeOutline },
  { id: 'shield', name: 'Shield', icon: IoShieldCheckmarkOutline },
  { id: 'award', name: 'Award', icon: IoTrophyOutline },
  { id: 'crown', name: 'Crown', icon: IoRibbonOutline },
  { id: 'flag', name: 'Flag', icon: IoFlagOutline },
  { id: 'gift', name: 'Gift', icon: IoGiftOutline },
  { id: 'inbox', name: 'Inbox', icon: IoMailOutline },
];

export const FOLDER_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>
> = FOLDER_ICON_OPTIONS.reduce(
  (acc, option) => {
    acc[option.id] = option.icon;
    return acc;
  },
  {} as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>>
);

export function getFolderIcon(
  iconId?: string
): React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }> {
  return (iconId && FOLDER_ICONS[iconId]) || IoFolder;
}
