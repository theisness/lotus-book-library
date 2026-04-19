'use client';

import clsx from 'clsx';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEnv } from '@/context/EnvContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/store/themeStore';
import { useQuotaStats } from '@/hooks/useQuotaStats';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserActions } from '@/hooks/useUserActions';
import { navigateToLibrary } from '@/utils/nav';
import { Toast } from '@/components/Toast';
import Spinner from '@/components/Spinner';
import ProfileHeader from './components/Header';
import UserInfo from './components/UserInfo';
import UsageStats from './components/UsageStats';
import AccountActions from './components/AccountActions';
import StorageManager from './components/StorageManager';

const ProfilePage = () => {
  const _ = useTranslation();
  const router = useRouter();
  const { appService } = useEnv();
  const { token, user, refresh } = useAuth();
  const { safeAreaInsets, isRoundedWindow } = useThemeStore();

  const [loading] = useState(false);
  const [showStorageManager, setShowStorageManager] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const isAuthenticated = user && token && appService;
    if (isAuthenticated) return;
    const timer = setTimeout(() => {
      router.push('/auth?redirect=/library');
    }, 1000);
    return () => clearTimeout(timer);
  }, [mounted, user, token, appService, router]);

  useTheme({ systemUIVisible: false });

  const { quotas } = useQuotaStats();
  const { handleLogout, handleResetPassword, handleUpdateEmail, handleConfirmDelete } =
    useUserActions();

  const handleGoBack = () => {
    if (showStorageManager) {
      setShowStorageManager(false);
      refresh();
    } else {
      navigateToLibrary(router);
    }
  };

  const handleDeleteWithMessage = () => {
    handleConfirmDelete(_('Failed to delete user. Please try again later.'));
  };

  if (!mounted) return null;

  if (!user || !token || !appService) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-8'>
        <div className='overflow-hidden rounded-lg shadow-md'>
          <div className='flex min-h-[300px] items-center justify-center p-6'>
            <div className='text-base-content animate-pulse'>{_('Loading profile...')}</div>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = user?.user_metadata?.['picture'] || user?.user_metadata?.['avatar_url'];
  const userFullName = user?.user_metadata?.['full_name'] || '-';
  const userEmail = user?.email || '';

  return (
    <div
      className={clsx(
        'bg-base-100 full-height inset-0 select-none overflow-hidden',
        appService?.hasRoundedWindow && isRoundedWindow && 'window-border rounded-window',
      )}
    >
      <div
        className={clsx('flex h-full w-full flex-col items-center overflow-y-auto')}
        style={{ paddingTop: `${safeAreaInsets?.top || 0}px` }}
      >
        <ProfileHeader onGoBack={handleGoBack} />
        <div className='w-full min-w-60 max-w-4xl py-10'>
          {loading && (
            <div className='fixed inset-0 z-50 flex items-center justify-center'>
              <Spinner loading className='text-gray-900' />
            </div>
          )}
          {showStorageManager ? (
            <StorageManager />
          ) : (
            <div className='flex flex-col gap-y-8 px-6'>
              <UserInfo avatarUrl={avatarUrl} userFullName={userFullName} userEmail={userEmail} />
              <UsageStats quotas={quotas} />
              <AccountActions
                onLogout={handleLogout}
                onResetPassword={handleResetPassword}
                onUpdateEmail={handleUpdateEmail}
                onConfirmDelete={handleDeleteWithMessage}
                onManageStorage={() => setShowStorageManager(true)}
              />
            </div>
          )}
        </div>
        <Toast />
      </div>
    </div>
  );
};

export default ProfilePage;
