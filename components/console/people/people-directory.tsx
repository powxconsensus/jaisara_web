"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/ui/field";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  PageHeader,
  Panel,
  PanelHeader,
  RecordButton,
  RecordList,
  Select,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useResource } from "@/lib/console-api";
import { humanRole, shortDate } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type AdminUser,
  type RoleCatalogItem,
  type UserStatus,
} from "@/lib/admin-types";
import { MemberPanel } from "./member-panel";

/**
 * The member directory.
 *
 * Search-first, and deliberately so. The previous version pulled a hundred
 * accounts on mount and filtered them in the browser, which is both a wasted
 * round trip on every visit and the wrong shape for granting a role: scrolling
 * a list of strangers to find "the" Sarah is how the wrong Sarah becomes an
 * admin. Here you type the address you were given, and act on the one row that
 * comes back.
 */

const STATUSES: { value: "" | UserStatus; label: string }[] = [
  { value: "", label: "Any status" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "PENDING_DELETION", label: "Pending deletion" },
  { value: "ANONYMIZED", label: "Anonymised" },
];

export function PeopleDirectory() {
  const { can } = useAccess();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<"" | UserStatus>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Debounced so a typed address is one request, not one per keystroke.
  const search = useDebounced(term.trim(), 350);
  const searching = search.length >= 2;

  const results = useResource<AdminUser[]>("/api/admin/users", {
    query: { search, status: status || undefined, take: 25 },
    enabled: searching,
  });
  const catalog = useResource<RoleCatalogItem[]>("/api/admin/users/roles/catalog");

  const rows = results.data ?? [];
  const selected = selectedId && rows.some((row) => row.id === selectedId) ? selectedId : null;

  return (
    <div>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="People & roles"
        description="Find one member, then act on them. Granting a role is owner-only, and the API additionally refuses to grant at or above your own rank or to remove the last owner."
      />

      <Panel className="mb-4 p-[clamp(16px,2.5vw,22px)]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label
              htmlFor="people-search"
              className="mb-2 block font-mono text-[9.5px] tracking-[0.16em] text-muted"
            >
              SEARCH BY EMAIL, NAME OR REFERRAL CODE
            </label>
            <TextInput
              id="people-search"
              type="search"
              autoComplete="off"
              placeholder="sara@example.com"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setSelectedId(null);
              }}
            />
          </div>
          <div className="w-[190px]">
            <label
              htmlFor="people-status"
              className="mb-2 block font-mono text-[9.5px] tracking-[0.16em] text-muted"
            >
              STATUS
            </label>
            <Select
              id="people-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as "" | UserStatus)}
            >
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="mt-3 text-[11.5px] leading-5 text-muted">
          Matching happens on the server — nothing loads until you search, and the member list is
          never pulled down in bulk.
        </p>
      </Panel>

      {results.error && (
        <div className="mb-4">
          <ErrorNote>{results.error}</ErrorNote>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)] xl:items-start">
        <RecordList className="max-h-[70vh] xl:sticky xl:top-[86px]">
          {!searching ? (
            <EmptyState
              title="Search for a member"
              message="Type at least two characters of an email address, display name or referral code."
            />
          ) : results.loading && rows.length === 0 ? (
            <LoadingRows rows={4} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No match"
              message={`Nothing found for "${search}". Check the spelling, or try the referral code instead.`}
            />
          ) : (
            rows.map((member) => (
              <RecordButton
                key={member.id}
                active={selected === member.id}
                onClick={() => setSelectedId(member.id)}
              >
                <strong className="block truncate text-[12.5px]">
                  {member.displayName ?? "Unnamed member"}
                </strong>
                <span className="mt-1 block truncate font-mono text-[10.5px] text-muted">
                  {member.email}
                </span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {member.status !== "ACTIVE" && (
                    <Badge tone="danger">{member.status.replaceAll("_", " ")}</Badge>
                  )}
                  {member.roles
                    .filter((role) => role.roleKey !== "user")
                    .map((role) => (
                      <Badge key={role.roleKey} tone="primary">
                        {humanRole(role.roleKey)}
                      </Badge>
                    ))}
                  {!member.emailVerifiedAt && <Badge tone="warning">UNVERIFIED</Badge>}
                </span>
                <span className="mt-2 block font-mono text-[9px] tracking-[0.1em] text-muted">
                  JOINED {shortDate(member.createdAt).toUpperCase()}
                </span>
              </RecordButton>
            ))
          )}
        </RecordList>

        {selected ? (
          <MemberPanel
            key={selected}
            userId={selected}
            onChanged={() => void results.reload()}
          />
        ) : (
          <div className="space-y-4">
            <Panel>
              <EmptyState
                title="No member selected"
                message="Search above and pick a result to see their account, wallet and role assignments."
              />
            </Panel>
            {can(P.userView) && catalog.data && (
              <Panel className="p-[clamp(18px,3vw,26px)]">
                <PanelHeader
                  eyebrow="REFERENCE"
                  title="What each role can do"
                  description="Guards test permissions, never role names, so these lists are the real access model rather than a description of it."
                />
                <div className="mt-5 grid gap-2.5 md:grid-cols-2">
                  {catalog.data.map((role) => (
                    <details
                      key={role.key}
                      className="rounded-[13px] border border-hair p-4 [&[open]>summary_.marker]:rotate-90"
                    >
                      <summary className="cursor-pointer list-none">
                        <span className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-primary">
                          <span className="marker inline-block transition-transform">›</span>
                          {humanRole(role.key)} · rank {role.rank}
                        </span>
                        <p className="mt-2 pl-4 text-[12px] leading-5 text-muted">
                          {role.description}
                        </p>
                      </summary>
                      <ul className="mt-4 space-y-2 border-t border-hair-soft pt-3">
                        {role.permissions.map((permission) => (
                          <li key={permission.key} className="text-[11px] leading-5 text-muted">
                            <span className="font-mono text-[10.5px] text-fg">
                              {permission.key}
                            </span>
                            <br />
                            {permission.description}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
