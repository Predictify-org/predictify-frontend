import React from "react"
import { render } from "@testing-library/react"
import path from "path"
import fs from "fs"

/**
 * Tests for ProfileHeader high-contrast mode overrides.
 *
 * These tests verify that:
 * 1. The contrast.css stylesheet is imported by the profile page
 * 2. The profile-header wrapper class is present in the page source
 * 3. The contrast.css file contains the expected high-contrast rules
 */

describe("ProfilePage high-contrast mode", () => {
  const pagePath = path.join(process.cwd(), "app/(dashboard)/profile/page.tsx")
  const pageSource = fs.readFileSync(pagePath, "utf-8")
  const cssPath = path.join(process.cwd(), "src/styles/contrast.css")
  const cssSource = fs.readFileSync(cssPath, "utf-8")

  it("imports the contrast stylesheet", () => {
    expect(pageSource).toContain("@/src/styles/contrast.css")
  })

  it("applies the profile-header wrapper class", () => {
    expect(pageSource).toContain('className="profile-header')
  })

  it("defines contrast rules for @media (prefers-contrast: more)", () => {
    expect(cssSource).toContain("@media (prefers-contrast: more)")
  })

  it("scopes rules under the .profile-header selector", () => {
    expect(cssSource).toContain(".profile-header")
  })

  it("overrides the profile-header h1 text color", () => {
    expect(cssSource).toContain(".profile-header h1")
  })

  it("overrides follower/following link colors", () => {
    expect(cssSource).toContain('a[href*="follower"]')
  })

  it("overrides the separator color", () => {
    expect(cssSource).toContain('[role="separator"]')
  })

  it("overrides the avatar border", () => {
    expect(cssSource).toContain('rounded-full')
  })

  it("overrides the outline button border and text", () => {
    expect(cssSource).toContain('button[class*="outline"]')
  })
})