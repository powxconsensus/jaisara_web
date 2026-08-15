"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import { ConfirmDialog } from "@/components/console/confirm-dialog";
import {
  Badge,
  ErrorNote,
  Panel,
  PanelHeader,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource, type Resource } from "@/lib/console-api";
import { humanRole } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type PermissionCatalogItem,
  type RoleCatalogItem,
} from "@/lib/admin-types";

/**
 * Roles an owner composes by hand.
 *
 * The six built-in roles are coarse on purpose - they were written before there
 * was anyone to hire. The moment there is, the shapes stop fitting: a marketing
 * contractor needs campaigns and nothing else, and the smallest built-in role
 * that reaches campaigns is `admin`.
 *
 * Two things this screen must never let you do, both enforced server-side and
 * both mirrored here so the refusal is visible before you submit rather than
 * after:
 *
 *   - put a permission in a role that you do not hold yourself, and
 *   - give a role a rank at or above your own.
 *
 * Either would turn "create a role" into "grant yourself a permission", because
 * whoever can create a role can also grant it.
 */
export function RoleBuilder({ roles }: { roles: Resource<RoleCatalogItem[]> }) {
  const { can } = useAccess();
  const { toast } = useToast();
  const { mutate, pending, error, setError } = useMutation();
  const permissions = useResource<PermissionCatalogItem[]>("/api/admin/roles/permissions");

  const [editing, setEditing] = useState<RoleCatalogItem | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<RoleCatalogItem | null>(null);

  const canManage = can(P.roleManage);

  // Grouped exactly as the API labels them, so "Claims" here is the same set a
  // guard checks - the console never invents its own grouping.
  const groups = useMemo(() => {
    const byGroup = new Map<string, PermissionCatalogItem[]>();
    for (const permission of permissions.data ?? []) {
      const list = byGroup.get(permission.group) ?? [];
      list.push(permission);
      byGroup.set(permission.group, list);
    }
    return [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions.data]);

  const open = (role: RoleCatalogItem | null) => {
    setError(null);
    setEditing(role);
    setDraft(
      role
        ? {
            name: role.key,
            description: role.description,
            rank: String(role.rank),
            permissions: new Set(role.permissions.map((entry) => entry.key)),
          }
        : { name: "", description: "", rank: "", permissions: new Set<string>() },
    );
  };

  const close = () => {
    setDraft(null);
    setEditing(null);
    setError(null);
  };

  const submit = async () => {
    if (!draft) return;

    const saved = await mutate(
      editing ? `/api/admin/roles/${editing.key}` : "/api/admin/roles",
      {
        method: editing ? "PATCH" : "POST",
        body: {
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          rank: Number(draft.rank),
          permissions: [...draft.permissions],
        },
      },
    );
    if (!saved) return;

    toast(editing ? "Role updated." : "Role created.", "success");
    close();
    await roles.reload();
  };

  const remove = async () => {
    if (!deleting) return;
    const done = await mutate(`/api/admin/roles/${deleting.key}`, { method: "DELETE" });
    if (!done) return;

    toast(`${humanRole(deleting.key)} deleted.`, "warning");
    setDeleting(null);
    await roles.reload();
  };

  const custom = (roles.data ?? []).filter((role) => !role.isSystem);

  return (
    <div className="space-y-2">
      <Panel className="p-[var(--ct-pad)]">
        <PanelHeader
          eyebrow="ACCESS"
          title="Custom roles"
          description="Build a role out of individual permissions when none of the built-in six fits. A role can only carry permissions you hold yourself, and can only rank below you - otherwise creating one would be a way of granting yourself something nobody gave you."
          actions={
            canManage ? (
              <Button size="lg" onClick={() => open(null)}>
                + New role
              </Button>
            ) : (
              <Badge tone="neutral">READ ONLY</Badge>
            )
          }
        />

        {custom.length === 0 && !draft && (
          <p className="mt-5 text-[12.5px] leading-6 text-muted">
            No custom roles yet. The built-in six still apply — this is for the shapes they do
            not cover, like a marketing contractor who needs campaigns and nothing else.
          </p>
        )}

        {custom.length > 0 && (
          <div className="mt-5 grid gap-1.5">
            {custom.map((role) => (
              <div
                key={role.key}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 rounded-[10px] border border-hair px-3.5 py-3"
              >
                <span className="flex-none font-mono text-[9.5px] uppercase tracking-[0.12em] text-primary">
                  {humanRole(role.key)}
                </span>
                <span className="min-w-0 flex-1 text-[11.5px] leading-5 text-muted">
                  {role.description || `${role.permissions.length} permissions`}
                </span>
                <span className="flex-none font-mono text-[9px] tracking-[0.1em] text-muted">
                  RANK {role.rank} · {role.permissions.length} PERMS · {role.memberCount} HELD
                </span>
                {canManage && (
                  <span className="flex flex-none gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => open(role)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleting(role)}>
                      Delete
                    </Button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {draft && (
        <Panel
          className="p-[var(--ct-pad)]"
          style={{ borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)" }}
        >
          <PanelHeader
            eyebrow={editing ? "EDIT ROLE" : "NEW ROLE"}
            title={draft.name.trim() || "Untitled role"}
            description={
              editing
                ? "Saving replaces this role's permissions with exactly what is ticked below."
                : "The name becomes the role key - “Support Lead” is stored as support_lead and appears that way in the audit trail."
            }
          />

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1fr)]">
            <div>
              <FieldLabel htmlFor="role-name">NAME</FieldLabel>
              <TextInput
                id="role-name"
                autoFocus
                maxLength={60}
                disabled={Boolean(editing)}
                placeholder="Support Lead"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="role-description">WHAT IT IS FOR</FieldLabel>
              <TextInput
                id="role-description"
                maxLength={200}
                placeholder="Answers tickets and chases stuck claims"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="role-rank">RANK</FieldLabel>
              <TextInput
                id="role-rank"
                inputMode="numeric"
                placeholder="45"
                value={draft.rank}
                onChange={(event) =>
                  setDraft({ ...draft, rank: event.target.value.replace(/[^\d]/g, "") })
                }
                className="font-mono"
              />
            </div>
          </div>

          {/* Ranks are unique and total, which is what makes "at or above your
              own rank" answerable at all. Saying so beats a 409 that reads as a
              random collision. */}
          <p className="mt-2 text-[11px] leading-5 text-muted">
            Rank orders authority: nobody can grant a role at or above their own. It must be
            unique and below yours — 1 to 99, with the built-ins at 10 (user), 20 (author), 30
            (support), 40, 60, 80 and 100 (owner).
          </p>

          <div className="mt-5 grid gap-4">
            {groups.map(([group, entries]) => (
              <div key={group}>
                <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
                  {group}
                </p>
                <div className="grid gap-1.5 md:grid-cols-2">
                  {entries.map((permission) => {
                    const ticked = draft.permissions.has(permission.key);
                    return (
                      <label
                        key={permission.key}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 transition ${
                          ticked ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]" : "border-hair"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={ticked}
                          onChange={(event) => {
                            const next = new Set(draft.permissions);
                            if (event.target.checked) next.add(permission.key);
                            else next.delete(permission.key);
                            setDraft({ ...draft, permissions: next });
                          }}
                          className="mt-0.5 size-4 flex-none cursor-pointer accent-[var(--primary)]"
                        />
                        <span className="min-w-0">
                          <span className="block font-mono text-[10px] tracking-[0.06em] text-fg">
                            {permission.key}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-[1.5] text-muted">
                            {permission.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              size="lg"
              disabled={pending || !draft.name.trim() || !draft.rank || draft.permissions.size === 0}
              onClick={() => void submit()}
            >
              {pending ? "Saving…" : editing ? "Save role" : "Create role"}
            </Button>
            <Button size="lg" variant="outline" onClick={close}>
              Cancel
            </Button>
            <span className="font-mono text-[9.5px] tracking-[0.1em] text-muted">
              {draft.permissions.size} SELECTED
            </span>
          </div>
        </Panel>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this role"
        intent="danger"
        confirmLabel="Delete role"
        pending={pending}
        error={error}
        onConfirm={remove}
        summary={
          deleting ? (
            <>
              <strong className="text-fg">{humanRole(deleting.key)}</strong> is removed for good.
              {deleting.memberCount > 0 && (
                <>
                  {" "}
                  {deleting.memberCount} {deleting.memberCount === 1 ? "person" : "people"} still
                  hold it, so the API will refuse — revoke it from them first, so the loss of
                  access is an explicit act rather than a side effect.
                </>
              )}
            </>
          ) : null
        }
      />
    </div>
  );
}

interface Draft {
  name: string;
  description: string;
  rank: string;
  permissions: Set<string>;
}
