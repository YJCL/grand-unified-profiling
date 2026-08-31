'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { EventName } from '@/lib/analytics';
import { track } from '@/lib/analytics';

export function AnalyticsBeacon({
  event,
  props,
}: {
  event: EventName;
  props?: Record<string, unknown>;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, props);
  }, [event, props]);
  return null;
}

export function TrackedLink({
  href,
  event,
  eventProps,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  event: EventName;
  eventProps?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => track(event, eventProps)}
    >
      {children}
    </Link>
  );
}
