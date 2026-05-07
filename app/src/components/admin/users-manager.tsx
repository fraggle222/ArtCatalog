"use client";

import { FormEvent, useState } from "react";
import type { AppUser, UserRole } from "@/types/contracts";

type UsersManagerProps = {
  initialUsers: AppUser[];
};

type CreateUserForm = {
  email: string;
  password: string;
  role: UserRole;
};

const emptyCreateForm: CreateUserForm = {
  email: "",
  password: "",
  role: "viewer",
};

export function UsersManager({ initialUsers }: UsersManagerProps) {
  const [users, setUsers] = useState(initialUsers);
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreateForm);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [copiedCreatePassword, setCopiedCreatePassword] = useState(false);

  async function copyCreatePassword() {
    if (!createForm.password) {
      return;
    }
    try {
      await navigator.clipboard.writeText(createForm.password);
      setCopiedCreatePassword(true);
      setTimeout(() => setCopiedCreatePassword(false), 1500);
    } catch {
      setError("Unable to copy password from browser.");
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to create user.");
      return;
    }

    const created = (await response.json()) as AppUser;
    setUsers((current) =>
      [...current, created].sort((a, b) => a.email.localeCompare(b.email))
    );
    setCreateForm(emptyCreateForm);
    setCopiedCreatePassword(false);
  }

  async function updateUser(user: AppUser) {
    setError(null);
    const password = passwordDrafts[user.id]?.trim();

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: user.role,
        ...(password ? { password } : {}),
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to update user.");
      return;
    }

    const updated = (await response.json()) as AppUser;
    setUsers((current) =>
      current
        .map((item) => (item.id === updated.id ? updated : item))
        .sort((a, b) => a.email.localeCompare(b.email))
    );
    setPasswordDrafts((current) => ({ ...current, [user.id]: "" }));
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={createUser}
        autoComplete="off"
        className="space-y-3 rounded-lg border p-4"
      >
        <h2 className="text-lg font-medium">Create User</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded border px-3 py-2"
            type="email"
            autoComplete="off"
            placeholder="Email"
            value={createForm.email}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, email: event.target.value }))
            }
            required
          />
          <div className="space-y-2">
            <input
              className="w-full rounded border px-3 py-2"
              type={showCreatePassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Temporary password"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              minLength={8}
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs"
                onClick={() => setShowCreatePassword((current) => !current)}
              >
                {showCreatePassword ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs"
                onClick={copyCreatePassword}
                disabled={!createForm.password}
              >
                {copiedCreatePassword ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <select
            className="rounded border px-3 py-2"
            value={createForm.role}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                role: event.target.value as UserRole,
              }))
            }
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Create User
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Users</h2>
        {users.map((user) => (
          <div
            key={user.id}
            className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.5fr_0.8fr_1fr_auto]"
          >
            <div>
              <p className="font-medium">{user.email}</p>
              <p className="text-xs text-zinc-500">
                Added {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            <select
              className="rounded border px-3 py-2"
              value={user.role}
              onChange={(event) => {
                const role = event.target.value as UserRole;
                setUsers((current) =>
                  current.map((item) =>
                    item.id === user.id ? { ...item, role } : item
                  )
                );
              }}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <input
              className="rounded border px-3 py-2"
              type="password"
              autoComplete="new-password"
              placeholder="New password (optional)"
              value={passwordDrafts[user.id] ?? ""}
              onChange={(event) =>
                setPasswordDrafts((current) => ({
                  ...current,
                  [user.id]: event.target.value,
                }))
              }
              minLength={8}
            />
            <button
              type="button"
              className="rounded border px-3 py-2"
              onClick={() => updateUser(user)}
            >
              Save
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
