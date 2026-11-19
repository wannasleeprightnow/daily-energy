import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/AuthProvider";
import { apiErrorMessage } from "@/api/client";
import { AppShell, Button, Input, Text } from "@/ui";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const registering = mode === "register";

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await signIn(mode, username, password); }
    catch (reason) { setError(apiErrorMessage(reason)); }
    finally { setBusy(false); }
  }
  return (
    <AppShell className="justify-center px-6 py-10">
      <form className="mx-auto flex w-full max-w-md flex-col gap-4" onSubmit={submit}>
        <Text kind="title">{registering ? "Создать аккаунт" : "Вход"}</Text>
        <Text kind="subtitle">Daily Energy — твой персональный гид в мире здоровья.</Text>
        <Input
          autoComplete="username"
          autoCapitalize="none"
          maxLength={32}
          minLength={3}
          placeholder="Юзернейм"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <Input
          autoComplete={registering ? "new-password" : "current-password"}
          maxLength={72}
          minLength={registering ? 10 : undefined}
          placeholder="Пароль"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <p className="text-danger" role="alert">{error}</p>}
        <Button disabled={busy} type="submit">
          {busy ? "Подожди…" : registering ? "Зарегистрироваться" : "Войти"}
        </Button>
        <p className="text-center text-on/70">
          {registering ? "Уже есть аккаунт? " : "Впервые здесь? "}
          <Link className="text-[#ff7700] underline" to={registering ? "/login" : "/register"}>
            {registering ? "Войти" : "Создать аккаунт"}
          </Link>
        </p>
      </form>
    </AppShell>
  );
}
