import React from 'react';
import { X } from 'lucide-react';

type AiBadgeProps = {
  onDismiss?: () => void;
};

export function AiBadge({ onDismiss }: AiBadgeProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 8,
        paddingRight: 4,
        paddingTop: 4,
        paddingBottom: 4,
        backgroundColor: 'var(--accent)22',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 'bold',
        color: 'var(--accent)',
        marginLeft: 8,
        whiteSpace: 'nowrap',
      }}
    >
      <span>← AI Recommended</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--accent)',
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
