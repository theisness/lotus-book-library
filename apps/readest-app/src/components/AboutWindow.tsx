import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import Dialog from './Dialog';

export const setAboutDialogVisible = (visible: boolean) => {
  const dialog = document.getElementById('about_window');
  if (dialog) {
    const event = new CustomEvent('setDialogVisibility', {
      detail: { visible },
    });
    dialog.dispatchEvent(event);
  }
};

export const AboutWindow = () => {
  const _ = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleCustomEvent = (event: CustomEvent) => {
      setIsOpen(event.detail.visible);
    };
    const el = document.getElementById('about_window');
    if (el) {
      el.addEventListener('setDialogVisibility', handleCustomEvent as EventListener);
    }
    return () => {
      if (el) {
        el.removeEventListener('setDialogVisibility', handleCustomEvent as EventListener);
      }
    };
  }, []);

  const handleClose = () => setIsOpen(false);

  return (
    <Dialog
      id='about_window'
      isOpen={isOpen}
      title={_('关于莲花书院')}
      onClose={handleClose}
      boxClassName='sm:!w-[480px] sm:!max-w-screen-sm sm:h-auto'
    >
      {isOpen && (
        <div className='flex flex-col items-center justify-center gap-6 px-8 py-10'>
          <Image src='/icon.png' alt='莲花书院' className='h-24 w-24' width={96} height={96} />
          <h2 className='text-2xl font-bold'>莲花书院</h2>
          <p className='text-neutral-content text-center text-sm leading-relaxed'>
            莲花书院，汇聚经典，启迪智慧。
            <br />
            在这里，每一本书都是一扇通往新世界的门，
            <br />
            每一次阅读都是一场与智者的对话。
          </p>
        </div>
      )}
    </Dialog>
  );
};
