/**
 * pact-helpers.ts
 *
 * Shared utilities for loading and validating Pact fixture files.
 * Each fixture is a standard Pact JSON document with one or more
 * interactions, each representing a single state transition.
 */

import fs from "fs";
import path from "path";

export interface PactInteraction {
  description: string;
  providerState: string;
  request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export interface PactFixture {
  consumer: { name: string };
  provider: { name: string };
  interactions: PactInteraction[];
}

const FIXTURES_DIR = path.join(__dirname, "fixtures");

/** Load and parse a Pact fixture file by name (without .json extension). */
export function loadFixture(name: string): PactFixture {
  const filePath = path.join(FIXTURES_DIR, `${name}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as PactFixture;
}

/** Load all fixture files in the fixtures directory. */
export function loadAllFixtures(): PactFixture[] {
  const files = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => loadFixture(f.replace(".json", "")));
}

/** Build a NextRequest-compatible init object from a Pact interaction. */
export function buildRequest(interaction: PactInteraction): Request {
  const baseUrl = "http://localhost:3000";
  const url = `${baseUrl}${interaction.request.path}`;
  const init: RequestInit = {
    method: interaction.request.method,
    headers: interaction.request.headers ?? {},
  };
  if (interaction.request.body) {
    init.body = JSON.stringify(interaction.request.body);
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  return new Request(url, init);
}
