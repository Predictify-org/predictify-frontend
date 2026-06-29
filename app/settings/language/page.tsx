"use client";

/**
 * Settings > Language page
 *
 * Lets users choose their preferred UI language.  The selection is persisted to
 * localStorage via `useLanguage` and takes effect immediately (the document's
 * `lang` attribute is updated so screen readers and browser translate tools
 * reflect the change without a full reload).
 *
 * Accessibility:
 *  - Uses a <fieldset>/<legend> + radio pattern so keyboard and SR users can
 *    navigate the list without JavaScript-specific widget roles.
 *  - Focus ring and ARIA-checked are handled natively by <input type="radio">.
 *  - Colour contrast meets WCAG 2.1 AA via design-token classes.
 */

import { useLanguage } from "@/hooks/useLanguage";

export default function LanguageSettingsPage() {
  const { languageCode, setLanguage, isReady, languages } = useLanguage();

  return (
    <main className="min-h-screen bg-[#060e20] text-[#dee5ff] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-xl">
        {/* Page heading */}
        <h1 className="text-2xl font-semibold mb-1">Language</h1>
        <p className="text-sm text-[#8892b0] mb-8">
          Choose the language used throughout the Predictify interface.
        </p>

        {/* Language selector */}
        <fieldset aria-label="Select UI language" disabled={!isReady}>
          <legend className="sr-only">UI language preference</legend>
          <ul className="space-y-2" role="list">
            {languages.map((lang) => {
              const isSelected = lang.code === languageCode;
              return (
                <li key={lang.code}>
                  <label
                    className={[
                      "flex items-center gap-4 rounded-xl border px-4 py-3 cursor-pointer transition-colors",
                      "hover:border-cyan-400/50 focus-within:ring-2 focus-within:ring-cyan-400/70",
                      isSelected
                        ? "border-cyan-400/70 bg-cyan-400/10"
                        : "border-white/10 bg-white/5",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={lang.code}
                      checked={isSelected}
                      onChange={() => setLanguage(lang.code)}
                      className="sr-only"
                      aria-label={lang.label}
                    />
                    {/* Custom radio indicator */}
                    <span
                      aria-hidden="true"
                      className={[
                        "h-4 w-4 rounded-full border-2 flex-shrink-0",
                        isSelected
                          ? "border-cyan-400 bg-cyan-400"
                          : "border-white/30",
                      ].join(" ")}
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{lang.label}</span>
                      {lang.nativeLabel !== lang.label && (
                        <span className="block text-xs text-[#8892b0]" lang={lang.code}>
                          {lang.nativeLabel}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <span className="text-xs text-cyan-400 font-medium">Active</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {/* Helper note */}
        <p className="mt-6 text-xs text-[#8892b0]">
          Your preference is saved locally and applied immediately. A full
          translation rollout will follow in a future release.
        </p>
      </div>
    </main>
  );
}
