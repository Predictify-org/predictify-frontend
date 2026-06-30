/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
const { screen, fireEvent, within } = require("@testing-library/react") as typeof import("@testing-library/react");

import ContactsPage, { type Contact } from "./page";
import * as federation from "../utils/federation";

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("../utils/federation", () => ({
  isFederationAddress: jest.fn(() => false),
  resolveFederationAddress: jest.fn(),
  FederationError: class FederationError extends Error {
    constructor(
      message: string,
      public readonly code: string,
    ) {
      super(message);
      this.name = "FederationError";
    }
  },
}));

jest.mock("../hooks/useToast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    toast: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
  }),
}));

// The real Modal works but animates; intercept to avoid jsdom animation issues.
jest.mock("../components/Modal", () => ({
  Modal: ({
    isOpen,
    children,
    title,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

// ─── localStorage stub ────────────────────────────────────────────────────────

let store: Record<string, string> = {};

const localStorageMock = {
  getItem: jest.fn((key: string) => store[key] ?? null),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
  }),
  clear: jest.fn(() => {
    store = {};
  }),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Stable UUID for assertions
Object.defineProperty(global.crypto, "randomUUID", {
  value: jest.fn(() => "test-uuid-1"),
  configurable: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seedContacts(contacts: Contact[]) {
  store["streampay_contacts"] = JSON.stringify(contacts);
}

const ALICE: Contact = {
  id: "id-alice",
  label: "Alice Design",
  address: "GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const BOB: Contact = {
  id: "id-bob",
  label: "Bob Builder",
  address: "GBBB1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678",
  memo: "Contractor Q3",
  createdAt: "2026-01-02T00:00:00.000Z",
};

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  store = {};
  jest.clearAllMocks();
  (federation.isFederationAddress as jest.Mock).mockReturnValue(false);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ContactsPage — page shell", () => {
  it("renders the page heading", () => {
    render(<ContactsPage />);
    expect(
      screen.getByRole("heading", { name: /address book/i }),
    ).toBeInTheDocument();
  });

  it("renders the eyebrow label", () => {
    render(<ContactsPage />);
    expect(screen.getByText(/contacts/i)).toBeInTheDocument();
  });
});

describe("ContactsPage — empty state", () => {
  it("shows the empty state when there are no saved contacts", () => {
    render(<ContactsPage />);
    expect(
      screen.getByRole("heading", { name: /no contacts yet/i }),
    ).toBeInTheDocument();
  });

  it("does not show a count when the list is empty", () => {
    render(<ContactsPage />);
    expect(screen.queryByText(/contact(s)?/i)).not.toBeInTheDocument();
  });
});

describe("ContactsPage — rendering saved contacts", () => {
  it("displays a contact loaded from localStorage", () => {
    seedContacts([ALICE]);
    render(<ContactsPage />);
    expect(screen.getByText("Alice Design")).toBeInTheDocument();
  });

  it("shows the memo when present", () => {
    seedContacts([BOB]);
    render(<ContactsPage />);
    expect(screen.getByText("Contractor Q3")).toBeInTheDocument();
  });

  it("shows the federation address badge when a contact has one", () => {
    const fedContact: Contact = {
      ...ALICE,
      federationAddress: "alice*example.com",
    };
    seedContacts([fedContact]);
    render(<ContactsPage />);
    expect(screen.getByText("alice*example.com")).toBeInTheDocument();
  });

  it("displays the singular count for one contact", () => {
    seedContacts([ALICE]);
    render(<ContactsPage />);
    expect(screen.getByText("1 contact")).toBeInTheDocument();
  });

  it("displays the plural count for multiple contacts", () => {
    seedContacts([ALICE, BOB]);
    render(<ContactsPage />);
    expect(screen.getByText("2 contacts")).toBeInTheDocument();
  });
});

describe("ContactsPage — search / filter", () => {
  beforeEach(() => seedContacts([ALICE, BOB]));

  it("filters contacts by label", () => {
    render(<ContactsPage />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "alice" },
    });
    expect(screen.getByText("Alice Design")).toBeInTheDocument();
    expect(screen.queryByText("Bob Builder")).not.toBeInTheDocument();
  });

  it("filters contacts by memo", () => {
    render(<ContactsPage />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "contractor" },
    });
    expect(screen.getByText("Bob Builder")).toBeInTheDocument();
    expect(screen.queryByText("Alice Design")).not.toBeInTheDocument();
  });

  it("shows a no-match status message when nothing matches", () => {
    render(<ContactsPage />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(/no contacts match/i);
  });

  it("shows filtered count vs total when a search is active", () => {
    render(<ContactsPage />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "alice" },
    });
    expect(screen.getByText(/1 of 2 contacts/i)).toBeInTheDocument();
  });
});

describe("ContactsPage — add contact modal", () => {
  it("opens the add modal when the + Add contact button is clicked", () => {
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add contact/i }));
    expect(
      screen.getByRole("dialog", { name: /add contact/i }),
    ).toBeInTheDocument();
  });

  it("closes the modal when Cancel is clicked", () => {
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add contact/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows validation errors for an empty form submission", async () => {
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add contact/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /add contact/i }),
    );
    expect(await screen.findByText(/label is required/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/address is required/i),
    ).toBeInTheDocument();
  });

  it("rejects a label longer than 64 characters", async () => {
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add contact/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^label$/i), {
      target: { value: "a".repeat(65) },
    });
    fireEvent.change(
      within(dialog).getByLabelText(/stellar address or federation address/i),
      {
        target: {
          value: "GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678",
        },
      },
    );
    fireEvent.blur(
      within(dialog).getByLabelText(/stellar address or federation address/i),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /add contact/i }),
    );
    expect(
      await screen.findByText(/label must be 64 characters/i),
    ).toBeInTheDocument();
  });

  it("rejects an invalid address format", async () => {
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add contact/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^label$/i), {
      target: { value: "Test" },
    });
    fireEvent.change(
      within(dialog).getByLabelText(/stellar address or federation address/i),
      { target: { value: "not-an-address" } },
    );
    fireEvent.blur(
      within(dialog).getByLabelText(/stellar address or federation address/i),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /add contact/i }),
    );
    expect(
      await screen.findByText(/enter a valid stellar address/i),
    ).toBeInTheDocument();
  });

  it("saves a contact with a valid Stellar address to localStorage", async () => {
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add contact/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^label$/i), {
      target: { value: "Carol" },
    });
    fireEvent.change(
      within(dialog).getByLabelText(/stellar address or federation address/i),
      {
        target: {
          value: "GCCC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678",
        },
      },
    );
    fireEvent.blur(
      within(dialog).getByLabelText(/stellar address or federation address/i),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /add contact/i }),
    );
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "streampay_contacts",
        expect.stringContaining("Carol"),
      );
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ContactsPage — federation address resolution", () => {
  it("calls resolveFederationAddress on address blur when format matches", async () => {
    (federation.isFederationAddress as jest.Mock).mockReturnValue(true);
    (federation.resolveFederationAddress as jest.Mock).mockResolvedValue({
      stellar_address: "alice*example.com",
      account_id: "GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678",
    });

    render(<ContactsPage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add contact/i }));
    const dialog = screen.getByRole("dialog");
    const addressInput = within(dialog).getByLabelText(
      /stellar address or federation address/i,
    );

    fireEvent.change(addressInput, { target: { value: "alice*example.com" } });
    fireEvent.blur(addressInput);

    await waitFor(() => {
      expect(federation.resolveFederationAddress).toHaveBeenCalledWith(
        "alice*example.com",
      );
    });

    expect(await screen.findByText(/resolved:/i)).toBeInTheDocument();
  });

  it("shows an error message when federation resolution fails", async () => {
    (federation.isFederationAddress as jest.Mock).mockReturnValue(true);
    const { FederationError } = jest.requireMock("../utils/federation") as {
      FederationError: new (msg: string, code: string) => Error;
    };
    (federation.resolveFederationAddress as jest.Mock).mockRejectedValue(
      new FederationError("Federation address not found", "NOT_FOUND"),
    );

    render(<ContactsPage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add contact/i }));
    const dialog = screen.getByRole("dialog");
    const addressInput = within(dialog).getByLabelText(
      /stellar address or federation address/i,
    );

    fireEvent.change(addressInput, {
      target: { value: "unknown*example.com" },
    });
    fireEvent.blur(addressInput);

    await waitFor(() => {
      expect(federation.resolveFederationAddress).toHaveBeenCalled();
    });

    expect(
      await screen.findByText(/federation address not found/i),
    ).toBeInTheDocument();
  });
});

describe("ContactsPage — edit contact", () => {
  it("opens the edit modal when the Edit button is clicked", () => {
    seedContacts([ALICE]);
    render(<ContactsPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit contact alice design/i }),
    );
    expect(
      screen.getByRole("dialog", { name: /edit contact/i }),
    ).toBeInTheDocument();
  });

  it("pre-fills the form with the existing contact's label", () => {
    seedContacts([ALICE]);
    render(<ContactsPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit contact alice design/i }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText(/^label$/i)).toHaveValue(
      "Alice Design",
    );
  });

  it("closes the edit modal when Cancel is clicked", () => {
    seedContacts([ALICE]);
    render(<ContactsPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit contact alice design/i }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ContactsPage — delete contact", () => {
  it("opens a confirmation modal when Delete is clicked", () => {
    seedContacts([ALICE]);
    render(<ContactsPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /delete contact alice design/i }),
    );
    expect(
      screen.getByRole("dialog", { name: /delete contact/i }),
    ).toBeInTheDocument();
  });

  it("mentions the contact name in the confirmation modal", () => {
    seedContacts([ALICE]);
    render(<ContactsPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /delete contact alice design/i }),
    );
    expect(screen.getByText(/alice design/i)).toBeInTheDocument();
  });

  it("removes the contact after confirming deletion", async () => {
    seedContacts([ALICE]);
    render(<ContactsPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /delete contact alice design/i }),
    );
    const dialog = screen.getByRole("dialog", { name: /delete contact/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText("Alice Design")).not.toBeInTheDocument();
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "streampay_contacts",
      "[]",
    );
  });

  it("cancels the delete when Cancel is clicked", () => {
    seedContacts([ALICE]);
    render(<ContactsPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /delete contact alice design/i }),
    );
    const dialog = screen.getByRole("dialog", { name: /delete contact/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Alice Design")).toBeInTheDocument();
  });
});
