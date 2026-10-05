import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/ui";
import { useUser } from "@/hooks/useUser";
import { getInitData, getTgUser } from "@/lib/telegram";
import { API_URL } from "@/constants";
import logo from "@/assets/logo.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";
interface ServerErrorMessage {
  type?: string;
  message?: string;
}
interface ChatProfileContext {
  age: number;
  gender: "Male" | "Female";
  height: number;
  weight: number;
  goal: "LoseWeight" | "Maintain" | "GainMuscleMass";
  physical_activity: "Low" | "Medium" | "High";
}

const CHAT_ERROR = "Не удалось получить ответ от Рафика. Попробуй ещё раз.";

export function ChatPage() {
  const tgUser = getTgUser();
  const { data, isError: profileLoadFailed } = useUser(tgUser?.id ?? -1);
  const userName = data?.name?.split(" ")[0] ?? tgUser?.first_name ?? "друг";

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(1);
  const socketRef = useRef<WebSocket | null>(null);
  const inFlightTextRef = useRef<string | null>(null);
  const retryTextRef = useRef<string | null>(null);
  const profileContextSentRef = useRef(false);

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
      // Each websocket connection starts a fresh conversation on the server.
      profileContextSentRef.current = false;
      setConnectionState(retryAttempt === 0 ? "connecting" : "reconnecting");
      const socket = protocols
        ? new WebSocket(endpoint, protocols)
        : new WebSocket(endpoint);
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed || socketRef.current !== socket) return;
        retryAttempt = 0;
        setConnectionState("connected");
        if (!inFlightTextRef.current && !retryTextRef.current) setError(null);
      };
      socket.onmessage = (event) => {
        if (disposed || socketRef.current !== socket) return;
        const raw = String(event.data);
        let response: ServerErrorMessage | null = null;
        try {
          const parsed = JSON.parse(raw) as ServerErrorMessage;
          if (parsed?.type === "error") response = parsed;
        } catch {
          // Successful assistant messages are plain text.
        }

        if (response) {
          setBusy(false);
          retryTextRef.current = inFlightTextRef.current;
          setRetryText(retryTextRef.current);
          inFlightTextRef.current = null;
          setError(response.message || CHAT_ERROR);
          return;
        }

        setMessages((current) => [
          ...current,
          { id: idRef.current++, role: "assistant", text: raw },
        ]);
        setBusy(false);
        retryTextRef.current = null;
        setRetryText(null);
        setError(null);
        inFlightTextRef.current = null;
      };
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (disposed) return;
        setBusy(false);
        setConnectionState("reconnecting");
        const pendingRetry = retryTextRef.current ?? inFlightTextRef.current;
        retryTextRef.current = pendingRetry;
        setRetryText((current) => current ?? pendingRetry);
        setError("Соединение прервалось. Переподключаюсь…");
        const delay = Math.min(1000 * 2 ** retryAttempt, 10000);
        retryAttempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    retryTimer = window.setTimeout(connect, 0);
    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close(1000, "component unmounted");
    };
  }, [connectionAttempt]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages, retryText]);

  const sendText = useCallback(
    (value: string, isRetry = false) => {
      const text = value.trim();
      const socket = socketRef.current;
      if (!text || busy) return;
      if (data === undefined && !profileLoadFailed && tgUser?.id) {
        setError("Загружаю твой профиль. Попробуй отправить сообщение ещё раз через пару секунд.");
        return;
      }
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setError("Подключение восстанавливается. Сообщение можно будет отправить ещё раз.");
        return;
      }

      setError(null);
      if (!isRetry) {
        setMessages((current) => [
          ...current,
          { id: idRef.current++, role: "user", text },
        ]);
      }
      setDraft("");
      retryTextRef.current = null;
      setRetryText(null);
      setBusy(true);
      inFlightTextRef.current = text;
      try {
        const profile = !profileContextSentRef.current && data
          ? getChatProfileContext(data)
          : undefined;
        socket.send(JSON.stringify({
          type: "chat_message",
          message: text,
          ...(profile ? { profile } : {}),
        }));
        if (profile) profileContextSentRef.current = true;
      } catch {
        setBusy(false);
        retryTextRef.current = text;
        setRetryText(text);
        setError(CHAT_ERROR);
      }
    },
    [busy, data, profileLoadFailed, tgUser?.id],
  );

  const send = useCallback(() => sendText(draft), [draft, sendText]);
  const retry = useCallback(() => {
    if (retryText) sendText(retryText, true);
  }, [retryText, sendText]);
  const hasMessages = messages.length > 0;

  return (
    <div
      className="relative flex h-[calc(100dvh-76px)] min-h-0 flex-col overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 55% 36% at 100% 7%, rgba(240,134,41,.48), transparent 100%), radial-gradient(ellipse 55% 38% at 0% 88%, rgba(240,134,41,.42), transparent 100%), linear-gradient(#242424,#212121)",
      }}
    >
      <header className="flex h-[68px] shrink-0 items-center justify-center gap-2 pt-2">
        <img src={logo} alt="" aria-hidden="true" className="block h-10 w-8 shrink-0 object-contain" />
        <span className="block text-[25px] font-medium leading-none text-on">Daily Energy</span>
      </header>

      {connectionState !== "connected" && (
        <div className="mx-auto mt-3 flex w-[85%] items-center justify-between gap-3 rounded-card bg-[#303030] px-4 py-3">
          <p className="text-[14px] leading-5 text-on" role="status">
            {connectionState === "connecting"
              ? "Подключаю чат…"
              : connectionState === "reconnecting"
                ? "Связь с чатом потеряна. Переподключаюсь…"
                : "Нет соединения с чатом."}
          </p>
          <Button
            onClick={() => setConnectionAttempt((attempt) => attempt + 1)}
            className="min-h-9 shrink-0 rounded-full px-3 text-[13px]"
          >
            Переподключить
          </Button>
        </div>
      )}

      {!hasMessages && (
        <section className="mx-auto flex w-[76%] flex-1 flex-col justify-center">
          <h1 className="text-center text-[24px] font-medium leading-[30px] text-accent">
            Привет, {userName}!
          </h1>
          <p className="mt-2 text-center text-[13px] leading-[17px] text-on">
            Меня зовут Рафик. Сюда ты можешь написать любые вопросы и внести
            изменения в персональный план.
          </p>
        </section>
      )}

      {hasMessages && (
        <div
          ref={listRef}
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-2 py-4"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0px, black 28px, black calc(100% - 28px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 28px, black calc(100% - 28px), transparent 100%)",
          }}
        >
          {messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}
          {busy && (
            <div className="mr-auto flex items-center gap-2 rounded-card bg-[#303030] px-4 py-3 text-[15px] text-on/65" role="status" aria-label="Рафик печатает">
              <span>Рафик печатает</span>
              <span className="flex items-center gap-1" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-current"
                    style={{ animationDelay: `${dot * 140}ms` }}
                  />
                ))}
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mx-auto mt-3 flex w-[85%] items-center justify-between gap-3 rounded-card bg-[#303030] px-4 py-3">
          <p role="alert" className="text-[14px] leading-5 text-on">
            {error}
          </p>
          {retryText && (
            <Button
              onClick={retry}
              disabled={busy || connectionState !== "connected"}
              className="min-h-9 shrink-0 rounded-full px-3 text-[13px]"
            >
              Повторить
            </Button>
          )}
        </div>
      )}

      <div className={hasMessages ? "mt-auto shrink-0 px-[8%] pb-10 pt-6" : "mx-auto mt-8 w-[84%] shrink-0 pb-8"}>
        <ChatInput
          value={draft}
          onChange={setDraft}
          onSend={send}
          disabled={connectionState !== "connected"}
          placeholder="Пиши сюда..."
          expanded={!hasMessages}
        />
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-card px-3 py-3 text-[16px] leading-[21px] ${
        isUser ? "ml-auto bg-black text-on" : "mr-auto bg-[#303030] text-on"
      }`}
    >
      {isUser ? message.text : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            h1: ({ children }) => <h1 className="mb-2 text-lg font-semibold">{children}</h1>,
            h2: ({ children }) => <h2 className="mb-2 text-base font-semibold">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-2 font-semibold">{children}</h3>,
            a: ({ children, href }) => <a className="text-orange-300 underline" href={href} target="_blank" rel="noreferrer">{children}</a>,
            code: ({ children }) => <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
            pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-lg bg-black/35 p-2 last:mb-0">{children}</pre>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-orange-400/70 pl-3 text-on/80">{children}</blockquote>,
          }}
        >
          {message.text}
        </ReactMarkdown>
      )}
    </div>
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
  expanded,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  expanded: boolean;
}) {
  const handleKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKey}
      placeholder={placeholder}
      aria-label="Сообщение для Рафика"
      disabled={disabled}
      rows={expanded ? 3 : 2}
      className={`block w-full resize-none rounded-[17px] bg-black px-4 py-3 text-[16px] leading-[21px] text-on placeholder:text-on/35 focus:outline-none disabled:opacity-80 ${expanded ? "h-[80px]" : "min-h-[58px] max-h-28"}`}
    />
  );
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getChatProfileContext(user: NonNullable<ReturnType<typeof useUser>["data"]>): ChatProfileContext {
  const birthDate = new Date(user.date_of_birth * 1000);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
  if (!birthdayHasPassed) age -= 1;

  return {
    age,
    gender: user.gender,
    height: user.height,
    weight: user.weight,
    goal: user.goal,
    physical_activity: user.physical_activity,
  };
}
