import clsx from 'clsx';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PiUserCircle, PiUserCircleCheck, PiGear } from 'react-icons/pi';
import { PiSun, PiMoon } from 'react-icons/pi';
import { TbSunMoon } from 'react-icons/tb';
import { MdCloudSync, MdSync, MdSyncProblem } from 'react-icons/md';

import { invoke, PermissionState } from '@tauri-apps/api/core';
import { isTauriAppPlatform } from '@/services/environment';
import { useAuth } from '@/context/AuthContext';
import { useEnv } from '@/context/EnvContext';
import { useThemeStore } from '@/store/themeStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import { useTransferQueue } from '@/hooks/useTransferQueue';
import { navigateToLogin, navigateToProfile } from '@/utils/nav';
import { tauriHandleSetAlwaysOnTop, tauriHandleToggleFullScreen } from '@/utils/window';
import { setAboutDialogVisible } from '@/components/AboutWindow';
import { saveSysSettings } from '@/helpers/settings';
import { formatLocaleDateTime } from '@/utils/book';
import UserAvatar from '@/components/UserAvatar';
import MenuItem from '@/components/MenuItem';
import Menu from '@/components/Menu';

interface SettingsMenuProps {
  onPullLibrary: (fullRefresh?: boolean, verbose?: boolean) => void;
  setIsDropdownOpen?: (isOpen: boolean) => void;
}

interface Permissions {
  postNotification: PermissionState;
  manageStorage: PermissionState;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onPullLibrary, setIsDropdownOpen }) => {
  const _ = useTranslation();
  const router = useRouter();
  const { envConfig, appService } = useEnv();
  const { user, isAdmin } = useAuth();
  const { themeMode, setThemeMode } = useThemeStore();
  const { settings, setSettingsDialogOpen } = useSettingsStore();
  const [isAutoUpload, setIsAutoUpload] = useState(settings.autoUpload);
  const [isAutoCheckUpdates, setIsAutoCheckUpdates] = useState(settings.autoCheckUpdates);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(settings.alwaysOnTop);
  const [isAlwaysShowStatusBar, setIsAlwaysShowStatusBar] = useState(settings.alwaysShowStatusBar);
  const [isScreenWakeLock, setIsScreenWakeLock] = useState(settings.screenWakeLock);
  const [isOpenLastBooks, setIsOpenLastBooks] = useState(settings.openLastBooks);
  const [isAutoImportBooksOnOpen, setIsAutoImportBooksOnOpen] = useState(
    settings.autoImportBooksOnOpen,
  );
  const [alwaysInForeground, setAlwaysInForeground] = useState(settings.alwaysInForeground);
  const iconSize = useResponsiveSize(16);

  const { isSyncing } = useLibraryStore();
  const { stats, hasActiveTransfers, setIsTransferQueueOpen } = useTransferQueue();

  const openTransferQueue = () => {
    setIsTransferQueueOpen(true);
    setIsDropdownOpen?.(false);
  };

  const showAboutReadest = () => {
    setAboutDialogVisible(true);
    setIsDropdownOpen?.(false);
  };

  const handleUserLogin = () => {
    navigateToLogin(router);
    setIsDropdownOpen?.(false);
  };

  const handleUserProfile = () => {
    navigateToProfile(router);
    setIsDropdownOpen?.(false);
  };

  const cycleThemeMode = () => {
    const nextMode = themeMode === 'auto' ? 'light' : themeMode === 'light' ? 'dark' : 'auto';
    setThemeMode(nextMode);
  };

  const handleFullScreen = () => {
    tauriHandleToggleFullScreen();
    setIsDropdownOpen?.(false);
  };

  const toggleOpenInNewWindow = () => {
    saveSysSettings(envConfig, 'openBookInNewWindow', !settings.openBookInNewWindow);
    setIsDropdownOpen?.(false);
  };

  const toggleAlwaysOnTop = () => {
    const newValue = !settings.alwaysOnTop;
    saveSysSettings(envConfig, 'alwaysOnTop', newValue);
    setIsAlwaysOnTop(newValue);
    tauriHandleSetAlwaysOnTop(newValue);
    setIsDropdownOpen?.(false);
  };

  const toggleAlwaysShowStatusBar = () => {
    const newValue = !settings.alwaysShowStatusBar;
    saveSysSettings(envConfig, 'alwaysShowStatusBar', newValue);
    setIsAlwaysShowStatusBar(newValue);
  };

  const toggleAutoUploadBooks = () => {
    const newValue = !settings.autoUpload;
    saveSysSettings(envConfig, 'autoUpload', newValue);
    setIsAutoUpload(newValue);
    if (newValue && !user) {
      navigateToLogin(router);
    }
  };

  const toggleAutoImportBooksOnOpen = () => {
    const newValue = !settings.autoImportBooksOnOpen;
    saveSysSettings(envConfig, 'autoImportBooksOnOpen', newValue);
    setIsAutoImportBooksOnOpen(newValue);
  };

  const toggleAutoCheckUpdates = () => {
    const newValue = !settings.autoCheckUpdates;
    saveSysSettings(envConfig, 'autoCheckUpdates', newValue);
    setIsAutoCheckUpdates(newValue);
  };

  const toggleScreenWakeLock = () => {
    const newValue = !settings.screenWakeLock;
    saveSysSettings(envConfig, 'screenWakeLock', newValue);
    setIsScreenWakeLock(newValue);
  };

  const toggleOpenLastBooks = () => {
    const newValue = !settings.openLastBooks;
    saveSysSettings(envConfig, 'openLastBooks', newValue);
    setIsOpenLastBooks(newValue);
  };

  const openSettingsDialog = () => {
    setIsDropdownOpen?.(false);
    setSettingsDialogOpen(true);
  };

  const toggleAlwaysInForeground = async () => {
    const requestAlwaysInForeground = !settings.alwaysInForeground;
    if (requestAlwaysInForeground) {
      let permission = await invoke<Permissions>('plugin:native-tts|checkPermissions');
      if (permission.postNotification !== 'granted') {
        permission = await invoke<Permissions>('plugin:native-tts|requestPermissions', {
          permissions: ['postNotification'],
        });
      }
      if (permission.postNotification !== 'granted') return;
    }
    saveSysSettings(envConfig, 'alwaysInForeground', requestAlwaysInForeground);
    setAlwaysInForeground(requestAlwaysInForeground);
  };

  const avatarUrl = user?.user_metadata?.['picture'] || user?.user_metadata?.['avatar_url'];
  const userFullName = user?.user_metadata?.['full_name'];
  const userDisplayName = userFullName ? userFullName.split(' ')[0] : null;
  const themeModeLabel =
    themeMode === 'dark'
      ? _('Dark Mode')
      : themeMode === 'light'
        ? _('Light Mode')
        : _('Auto Mode');

  return (
    <Menu
      className={clsx(
        'settings-menu dropdown-content no-triangle',
        'z-20 mt-2 max-w-[90vw] shadow-2xl',
      )}
      onCancel={() => setIsDropdownOpen?.(false)}
    >
      {user ? (
        <>
          <MenuItem
            label={
              userDisplayName
                ? _('Logged in as {{userDisplayName}}', { userDisplayName })
                : _('Logged in')
            }
            labelClass='!max-w-40'
            aria-label={_('View account details and quota')}
            Icon={
              avatarUrl ? (
                <UserAvatar url={avatarUrl} size={iconSize} DefaultIcon={PiUserCircleCheck} />
              ) : (
                PiUserCircleCheck
              )
            }
          />
          <MenuItem
            label={_('Cloud File Transfers')}
            Icon={MdCloudSync}
            description={
              hasActiveTransfers
                ? _('{{activeCount}} active, {{pendingCount}} pending', {
                    activeCount: stats.active,
                    pendingCount: stats.pending,
                  })
                : stats.failed > 0
                  ? _('{{failedCount}} failed', { failedCount: stats.failed })
                  : ''
            }
            onClick={openTransferQueue}
          />
          <MenuItem
            label={
              settings.lastSyncedAtBooks
                ? _('Synced at {{time}}', {
                    time: formatLocaleDateTime(settings.lastSyncedAtBooks),
                  })
                : _('Never synced')
            }
            Icon={user ? MdSync : MdSyncProblem}
            labelClass='ps-2 pe-1 !mx-0'
            iconClassName={user && isSyncing ? 'animate-reverse-spin' : ''}
            onClick={onPullLibrary.bind(null, true, true)}
          />
          <MenuItem label={_('Account')} onClick={handleUserProfile} />
          {isAdmin && (
            <>
              <hr aria-hidden='true' className='border-base-200 my-1' />
              <MenuItem
                label='公共书架管理'
                onClick={() => {
                  setIsDropdownOpen?.(false);
                  router.push('/admin/public-books');
                }}
              />
              <MenuItem
                label='成员管理'
                onClick={() => {
                  setIsDropdownOpen?.(false);
                  router.push('/admin/members');
                }}
              />
            </>
          )}
        </>
      ) : (
        <MenuItem label={_('Sign In')} Icon={PiUserCircle} onClick={handleUserLogin} />
      )}
      <MenuItem
        label={_('Auto Upload Books to Cloud')}
        toggled={isAutoUpload}
        onClick={toggleAutoUploadBooks}
      />
      {isTauriAppPlatform() && !appService?.isMobile && (
        <MenuItem
          label={_('Auto Import on File Open')}
          toggled={isAutoImportBooksOnOpen}
          onClick={toggleAutoImportBooksOnOpen}
        />
      )}
      {isTauriAppPlatform() && (
        <MenuItem
          label={_('Open Last Book on Start')}
          toggled={isOpenLastBooks}
          onClick={toggleOpenLastBooks}
        />
      )}
      {appService?.hasUpdater && (
        <MenuItem
          label={_('Check Updates on Start')}
          toggled={isAutoCheckUpdates}
          onClick={toggleAutoCheckUpdates}
        />
      )}
      <hr aria-hidden='true' className='border-base-200 my-1' />
      {appService?.hasWindow && (
        <MenuItem
          label={_('Open Book in New Window')}
          toggled={settings.openBookInNewWindow}
          onClick={toggleOpenInNewWindow}
        />
      )}
      {appService?.hasWindow && <MenuItem label={_('Fullscreen')} onClick={handleFullScreen} />}
      {appService?.hasWindow && (
        <MenuItem label={_('Always on Top')} toggled={isAlwaysOnTop} onClick={toggleAlwaysOnTop} />
      )}
      {appService?.isMobileApp && (
        <MenuItem
          label={_('Always Show Status Bar')}
          toggled={isAlwaysShowStatusBar}
          onClick={toggleAlwaysShowStatusBar}
        />
      )}
      <MenuItem
        label={_('Keep Screen Awake')}
        toggled={isScreenWakeLock}
        onClick={toggleScreenWakeLock}
      />
      {appService?.isAndroidApp && (
        <MenuItem
          label={_('Background Read Aloud')}
          toggled={alwaysInForeground}
          onClick={toggleAlwaysInForeground}
        />
      )}
      <MenuItem
        label={themeModeLabel}
        Icon={themeMode === 'dark' ? PiMoon : themeMode === 'light' ? PiSun : TbSunMoon}
        onClick={cycleThemeMode}
      />
      <MenuItem label={_('Settings')} Icon={PiGear} onClick={openSettingsDialog} />
      <hr aria-hidden='true' className='border-base-200 my-1' />
      <MenuItem label={_('关于莲花书院')} onClick={showAboutReadest} />
    </Menu>
  );
};

export default SettingsMenu;
