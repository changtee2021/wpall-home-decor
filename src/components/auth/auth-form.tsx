import { useState, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

import logo from "@/assets/wp-logo.png";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const inputClass = "h-11 rounded-xl text-sm";
const inputErrorClass = "border-destructive focus-visible:ring-destructive/40";

export function AuthCardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F1F1] px-4 py-8">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-sm relative overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-2 opacity-90"
          style={{
            background:
              "repeating-linear-gradient(90deg, #1F847E 0 12px, #F48F33 12px 24px, transparent 24px 28px)",
          }}
          aria-hidden
        />
        <div className="flex items-center gap-3 mb-6 pt-2">
          <div className="size-12 rounded-xl bg-[#1F847E] p-2">
            <img src={logo} alt="WP ALL Home & Decor" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#211F20]">{title}</h1>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthDivider({ label = "หรือ" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function AuthFormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className="mb-4 rounded-xl">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function AuthTextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium text-foreground/80">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, error && inputErrorClass)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function AuthPasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete = "current-password",
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: "current-password" | "new-password";
  required?: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium text-foreground/80">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "pr-10", error && inputErrorClass)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function RememberMeRow({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="remember-me"
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
      />
      <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
        จำฉัน
      </Label>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285f4"
        d="M16.5 9.2c0-.6 0-1.2-.2-1.7H9v3.3h4.2c-.2 1-.7 1.8-1.6 2.4v2h2.6c1.5-1.4 2.3-3.4 2.3-6z"
      />
      <path
        fill="#34a853"
        d="M9 17c2.2 0 4-.7 5.3-2l-2.6-2c-.7.5-1.6.8-2.7.8-2.1 0-3.9-1.4-4.5-3.3H1.8v2.1A8 8 0 0 0 9 17z"
      />
      <path fill="#fbbc04" d="M4.5 10.5a4.8 4.8 0 0 1 0-3.1V5.3H1.8a8 8 0 0 0 0 7.2l2.7-2z" />
      <path
        fill="#ea4335"
        d="M9 3.6c1.2 0 2.3.4 3.1 1.2L14.5 2.5A8 8 0 0 0 1.8 5.3l2.7 2.1C5.1 5.6 6.9 4 9 4z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  label,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled || busy}
      className="w-full h-11 rounded-xl text-sm font-semibold mb-4"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
      {label}
    </Button>
  );
}

export function AuthSubmitButton({
  label,
  loadingLabel,
  busy,
  disabled,
}: {
  label: string;
  loadingLabel: string;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={disabled || busy}
      className="w-full h-11 rounded-xl text-sm font-semibold"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {busy ? loadingLabel : label}
    </Button>
  );
}

export function AuthFooterLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-5 text-center text-sm text-muted-foreground", className)}>
      {children}
    </div>
  );
}
