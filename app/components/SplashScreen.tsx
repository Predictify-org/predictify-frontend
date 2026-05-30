"use client";

import { useEffect, useState } from "react";

/**
 * SplashScreen — branded loading overlay shown on initial app mount.
 *
 * Displays the StreamPay logo with a pulsing glow, animated tagline,
 * and a smooth fade-out transition once the page is ready.
 *
 * The splash auto-dismisses after a minimum display duration (2.4 s)
 * so the brand impression registers before yielding to the dashboard.
 */
export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      // Allow the CSS fade-out transition to finish before unmounting
      setTimeout(() => setVisible(false), 600);
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`splash-screen ${fadeOut ? "splash-screen--exit" : ""}`}
      role="status"
      aria-label="Loading StreamPay"
      id="splash-screen"
    >
      {/* Animated background orbs */}
      <div className="splash-orb splash-orb--1" aria-hidden="true" />
      <div className="splash-orb splash-orb--2" aria-hidden="true" />
      <div className="splash-orb splash-orb--3" aria-hidden="true" />

      <div className="splash-content">
        {/* Logo with glow ring */}
        <div className="splash-logo-wrap">
          <div className="splash-logo-glow" aria-hidden="true" />
          <img
            src="/assets/splash-icon.png"
            alt="StreamPay logo"
            className="splash-logo"
            width={120}
            height={120}
          />
        </div>

        {/* Brand name */}
        <h1 className="splash-title">
          <span className="splash-title__stream">Stream</span>
          <span className="splash-title__pay">Pay</span>
        </h1>

        {/* Tagline */}
        <p className="splash-tagline">Real-time payments on Stellar</p>

        {/* Loading indicator */}
        <div className="splash-loader" aria-hidden="true">
          <div className="splash-loader__bar" />
        </div>
      </div>
    </div>
  );
}
