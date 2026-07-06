/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

export interface DialogConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function useCustomModal() {
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null);

  const showCustomAlert = useCallback((message: string, title = 'Bilgi') => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type: 'alert'
    });
  }, []);

  const showCustomConfirm = useCallback((message: string, onConfirm: () => void, title = 'Onay Gerekli') => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogConfig(null);
  }, []);

  return {
    dialogConfig,
    setDialogConfig,
    showCustomAlert,
    showCustomConfirm,
    closeDialog
  };
}
