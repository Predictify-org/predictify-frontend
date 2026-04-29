"use client";

import React, { useState, useId, type ChangeEvent } from "react";
import {
  CHECKLIST_SECTIONS,
  TOTAL_ITEMS,
  type ChecklistAnswer,
} from "./checklist-data";

type Answers = Record<string, ChecklistAnswer>;

function AnswerButton({
  value,
  current,
  label,
  itemId,
  onChange,
}: {
  value: ChecklistAnswer;
  current: ChecklistAnswer;
  label: string;
  itemId: string;
  onChange: (v: ChecklistAnswer) => void;
}) {
  const isActive = current === value;
  return (
    <button
      aria-pressed={isActive}
      className={`checklist-answer-btn checklist-answer-btn--${value} ${isActive ? "checklist-answer-btn--active" : ""}`}
      onClick={() => onChange(isActive ? null : value)}
      type="button"
    >
      {label}
    </button>
  );
}

function ProgressBar({ answered, total }: { answered: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  return (
    <div className="checklist-progress" aria-label={`${answered} of ${total} items answered`}>
      <div className="checklist-progress__labels">
        <span>{answered} / {total} answered</span>
        <span>{pct}%</span>
      </div>
      <div className="checklist-progress__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="checklist-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionSummary({ answers, itemIds }: { answers: Answers; itemIds: string[] }) {
  const yes = itemIds.filter((id) => answers[id] === "yes").length;
  const no = itemIds.filter((id) => answers[id] === "no").length;
  const na = itemIds.filter((id) => answers[id] === "na").length;
  const total = itemIds.length;
  const done = yes + no + na;
  return (
    <p className="checklist-section__summary" aria-live="polite">
      {done}/{total} answered
      {no > 0 && <span className="checklist-section__summary--no"> · {no} No</span>}
      {na > 0 && <span className="checklist-section__summary--na"> · {na} N/A</span>}
    </p>
  );
}

export function DesignChecklist({ screen }: { screen?: string }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const headingId = useId();

  const answered = Object.values(answers).filter(Boolean).length;
  const noCount = Object.values(answers).filter((v) => v === "no").length;

  function setAnswer(id: string, value: ChecklistAnswer) {
    setAnswers((prev: Answers) => ({ ...prev, [id]: value }));
  }

  function setNote(id: string, value: string) {
    setNotes((prev: Record<string, string>) => ({ ...prev, [id]: value }));
  }

  function handleReset() {
    setAnswers({});
    setNotes({});
  }

  return (
    <div className="checklist-shell">
      <header className="checklist-header">
        <div>
          <p className="checklist-header__eyebrow">Design QA</p>
          <h1 className="checklist-header__title" id={headingId}>
            StreamPay Design Checklist
          </h1>
          {screen && (
            <p className="checklist-header__screen">
              Screen: <strong>{screen}</strong>
            </p>
          )}
          <p className="checklist-header__meta">
            {TOTAL_ITEMS} items · a11y, interactive states, 8px grid, empty/loading/error, money actions, Stellar/Soroban
          </p>
        </div>
        <button className="button button--secondary checklist-reset-btn" onClick={handleReset} type="button">
          Reset
        </button>
      </header>

      <ProgressBar answered={answered} total={TOTAL_ITEMS} />

      {noCount > 0 && (
        <div className="checklist-warning" role="alert">
          {noCount} item{noCount > 1 ? "s" : ""} marked No — add notes and a ticket reference before handoff.
        </div>
      )}

      <ol className="checklist-sections" aria-labelledby={headingId}>
        {CHECKLIST_SECTIONS.map((section) => (
          <li key={section.id} className="checklist-section">
            <div className="checklist-section__header">
              <div>
                <h2 className="checklist-section__title">{section.title}</h2>
                {section.description && (
                  <p className="checklist-section__description">{section.description}</p>
                )}
              </div>
              <SectionSummary
                answers={answers}
                itemIds={section.items.map((i) => i.id)}
              />
            </div>

            <ol className="checklist-items">
              {section.items.map((item, idx) => {
                const answer = answers[item.id] ?? null;
                const noteId = `note-${item.id}`;
                return (
                  <li
                    key={item.id}
                    className={`checklist-item ${answer ? `checklist-item--${answer}` : ""}`}
                  >
                    <div className="checklist-item__row">
                      <span className="checklist-item__number" aria-hidden="true">
                        {idx + 1}
                      </span>
                      <p className="checklist-item__text">{item.item}</p>
                      <div className="checklist-item__actions" role="group" aria-label={`Answer for item ${idx + 1}`}>
                        <AnswerButton value="yes" current={answer} label="Yes" itemId={item.id} onChange={(v) => setAnswer(item.id, v)} />
                        <AnswerButton value="no" current={answer} label="No" itemId={item.id} onChange={(v) => setAnswer(item.id, v)} />
                        <AnswerButton value="na" current={answer} label="N/A" itemId={item.id} onChange={(v) => setAnswer(item.id, v)} />
                      </div>
                    </div>

                    {(answer === "no" || notes[item.id]) && (
                      <div className="checklist-item__note">
                        <label className="checklist-item__note-label" htmlFor={noteId}>
                          Note / ticket reference
                        </label>
                        <textarea
                          className="checklist-item__note-input"
                          id={noteId}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNote(item.id, e.target.value)}
                          placeholder="Add rationale and phase-2 ticket number…"
                          rows={2}
                          value={notes[item.id] ?? ""}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>

      <footer className="checklist-footer">
        <p className="checklist-footer__text">
          Run this checklist before any stream or money screen moves to dev handoff.
          Link from every major Figma file cover page.
        </p>
        <p className="checklist-footer__commit">
          <code>design(figma): design QA checklist for Stellar/StreamPay money and stream screens</code>
        </p>
      </footer>
    </div>
  );
}
