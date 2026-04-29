'use client';

import React from 'react';
import { ToggleSwitch } from './ToggleSwitch';

interface SettingItemProps {
  id: string;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
  onInAppChange: (val: boolean) => void;
  onEmailChange: (val: boolean) => void;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  id,
  label,
  description,
  inApp,
  email,
  onInAppChange,
  onEmailChange,
}) => {
  return (
    <div className="setting-item">
      <div className="setting-item__info">
        <h3 className="setting-item__label">{label}</h3>
        <p className="setting-item__description">{description}</p>
      </div>
      <div className="setting-item__actions">
        <div className="channel-toggle">
          <span className="channel-toggle__label">In-App</span>
          <ToggleSwitch
            id={`${id}-in-app`}
            label={`In-app notifications for ${label}`}
            checked={inApp}
            onChange={onInAppChange}
          />
        </div>
        <div className="channel-toggle">
          <span className="channel-toggle__label">Email</span>
          <ToggleSwitch
            id={`${id}-email`}
            label={`Email notifications for ${label}`}
            checked={email}
            onChange={onEmailChange}
          />
        </div>
      </div>
    </div>
  );
};
