import { useEffect, useRef, useState } from "react";
import { AppShell, Button } from "@/ui";
import { useUser } from "@/hooks/useUser";
import { getTgUser } from "@/lib/telegram";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

/**
 * AI Chat screen (Figma `ИИ-аgent старт` 28:8 / `ИИ-агент чат` 122:703).
 *
 * Greeting names the user and introduces "Рафик". Bubbles: assistant `#1c1c1c`,
 * user `#303030`; input r17 `#000`. Replies are local for now (no chat
 * contract in openapi.yml) — swap in the real endpoint when it lands.
 */
export function ChatPage() {
  const tgUser = getTgUser();
  const { data } = useUser(tgUser?.id ?? -1);
  const userName =
    data?.name?.split(" ")[0] ?? tgUser?.first_name ?? "друг";

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(1);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: idRef.current++, role: "user", text }]);
    setDraft("");
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: idRef.current++,
          role: "assistant",
          text:
            "Принял! Я обновил информацию по потреблённым калориям и внёс это в твой план. Ты молодец! ✨",
        },
      ]);
    }, 500);
  };

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
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
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
        disabled={!value.trim()}
        aria-label="Отправить"
        className="h-11 w-11 shrink-0 rounded-full px-0 text-h2"
      >
        ➤
      </Button>
    </div>
  );
}