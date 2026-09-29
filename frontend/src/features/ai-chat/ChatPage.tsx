import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell, Button } from "@/ui";
import { useUser } from "@/hooks/useUser";
import { getInitData, getTgUser } from "@/lib/telegram";
import { API_URL } from "@/constants";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

/**
 * AI Chat screen (Figma `ИИ-аgent старт` 28:8 / `ИИ-агент чат` 122:703).
 *
 * Greeting names the user and introduces "Рафик". Bubbles: assistant `#1c1c1c`,
 * user `#303030`; input r17 `#000`. Messages are exchanged with the backend
 * over WebSocket.
 */
export function ChatPage() {
  const tgUser = getTgUser();
  const { data } = useUser(tgUser?.id ?? -1);
  const userName =
    data?.name?.split(" ")[0] ?? tgUser?.first_name ?? "друг";

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const listRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(1);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const endpoint = new URL("/api/ws/chat", API_URL);
    endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
    const initData = getInitData();
    const protocols = initData
      ? [`daily-energy-initdata.${toBase64Url(initData)}`, "daily-energy-chat"]
      : undefined;

    let disposed = false;
    let retryTimer: number | undefined;
    let retryAttempt = 0;

    const connect = () => {
      if (disposed) return;
      setConnectionState(retryAttempt === 0 ? "connecting" : "reconnecting");

      const socket = protocols
        ? new WebSocket(endpoint, protocols)
        : new WebSocket(endpoint);
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed || socketRef.current !== socket) return;
        retryAttempt = 0;
        setConnectionState("connected");
        setError(null);
      };
      socket.onmessage = (event) => {
        if (disposed || socketRef.current !== socket) return;
        setMessages((current) => [
          ...current,
          { id: idRef.current++, role: "assistant", text: String(event.data) },
        ]);
        setBusy(false);
      };
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (disposed) return;
        setBusy(false);
        setConnectionState("reconnecting");
        setError("Связь с чатом прервалась. Переподключаюсь…");
        const delay = Math.min(1000 * 2 ** retryAttempt, 10000);
        retryAttempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    // React StrictMode runs effect setup, cleanup, then setup again in dev.
    // Delay the first handshake so the throwaway setup is cancelled before it
    // can open a socket that the backend would observe as an abnormal close.
    retryTimer = window.setTimeout(connect, 0);

    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      // Don't trigger a reconnect for React StrictMode's dev-only cleanup.
      socket?.close(1000, "component unmounted");
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(() => {
    const text = draft.trim();
    const socket = socketRef.current;
    if (!text || busy) return;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Соединение с чатом ещё не установлено. Подожди переподключения и отправь сообщение снова.");
      return;
    }

    setError(null);
    setMessages((m) => [...m, { id: idRef.current++, role: "user", text }]);
    setDraft("");
    setBusy(true);
    try {
      socket.send(text);
    } catch {
      setBusy(false);
      setError("Не удалось отправить сообщение. Попробуй ещё раз.");
    }
  }, [busy, draft]);

  return (
    <AppShell className="flex-col">
      <div className="flex flex-1 flex-col px-5 pt-6">
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/logo.png"
            alt="Daily Energy"
            width={32}
            height={40}
            className="object-contain"
          />
          <span className="text-[26px] font-medium text-on">Daily Energy</span>
        </div>

        <h1 className="mt-8 text-center text-[25px] font-medium text-on">
          Привет, {userName}!
        </h1>
        <p className="mx-8 mt-3 text-center text-[13px] leading-[17px] text-on/70">
          Меня зовут Рафик. Сюда ты можешь написать любые вопросы и внести
          изменения в персональный план.
        </p>

        <p className="mt-2 text-center text-xs text-on/50" role="status">
          {connectionState === "connected" && "Чат подключён"}
          {connectionState === "connecting" && "Подключаюсь к чату…"}
          {connectionState === "reconnecting" && "Переподключаюсь к чату…"}
          {connectionState === "disconnected" && "Чат не подключён"}
        </p>

        {error && (
          <p role="alert" className="mt-3 text-center text-bodySm text-danger">
            {error}
          </p>
        )}

        <div
          ref={listRef}
          className="mt-5 flex flex-1 flex-col gap-3 overflow-y-auto pb-3"
        >
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
          <ChatInput
            value={draft}
            onChange={setDraft}
            onSend={send}
            disabled={busy || connectionState !== "connected"}
            placeholder="Пиши сюда..."
          />
        </div>
      </div>
    </AppShell>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`max-w-[85%] rounded-card px-4 py-3 text-[16px] leading-[21px] ${
        isUser ? "ml-auto bg-[#303030] text-on" : "mr-auto bg-[#1c1c1c] text-on"
      }`}
    >
      {message.text}
    </div>
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  return (
    <div className="mt-2 flex items-center gap-2 rounded-card bg-black px-4 py-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={1}
        className="max-h-24 flex-1 resize-none bg-transparent text-[16px] leading-[21px] text-on placeholder:text-on/40 focus:outline-none"
      />
      <Button
        onClick={onSend}
        disabled={!value.trim() || disabled}
        aria-label="Отправить"
        className="h-11 w-11 shrink-0 rounded-full px-0 text-h2"
      >
        ➤
      </Button>
    </div>
  );
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
