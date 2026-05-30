'use client';

import React, { PropsWithChildren } from 'react';

interface NotificationGroupProps {
  title: string;
  description?: string;
}

export const NotificationGroup: React.FC<PropsWithChildren<NotificationGroupProps>> = ({
  title,
  description,
  children,
}) => {
  return (
    <section className="settings-group">
      <div className="settings-group__header">
        <h2 className="settings-group__title">{title}</h2>
        {description && <p className="settings-group__description">{description}</p>}
      </div>
      <div className="settings-group__content">
        {children}
      </div>
    </section>
  );
};
