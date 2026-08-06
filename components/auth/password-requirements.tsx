import { PASSWORD_REQUIREMENTS } from "@/lib/password-policy";

export function PasswordRequirements({
  password,
  id,
}: {
  password: string;
  id?: string;
}) {
  return (
    <div id={id} aria-live="polite" className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const met = requirement.test(password);
        return (
          <span
            key={requirement.label}
            className={`font-mono text-[9px] tracking-[0.04em] ${
              met ? "text-success" : password ? "text-danger" : "text-muted"
            }`}
          >
            <span aria-hidden="true">{met ? "✓" : "○"}</span> {requirement.label}
          </span>
        );
      })}
    </div>
  );
}
