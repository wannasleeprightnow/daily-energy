import { useNavigate } from "react-router-dom";
import { AppShell, Button, Text } from "@/ui";
import { colors } from "@/design/tokens";
import logo from "@/assets/logo.png";

/**
 * Greeting / landing screen (Figma `25:3` "старт").
 *
 * Logo, headline fs32, subtitle fs20, and an orange "Go" pill → onboarding.
 */
export function GreetPage({ showGo = true }: { showGo?: boolean }) {
  const navigate = useNavigate();

  return (
    <AppShell className="relative px-6">
      <div
        className="flex min-h-full flex-1 flex-col items-center justify-center gap-0 text-center"
        style={{ backgroundColor: colors.bg }}
      >
        {/* Logo */}
        <img
          src={logo}
          alt="Daily Energy"
          width={168}
          height={168}
          decoding="async"
          className="mb-8"
        />

        <Text kind="title" className="mb-2">
          Привет! Мы — Daily Energy
        </Text>
        <Text kind="subtitle" className="max-w-[260px] leading-relaxed text-on/80">
          Твой персональный гид в мире здоровья.
        </Text>

        {showGo && (
          <Button
            onClick={() => navigate("/onboarding")}
            className="mt-10 px-12 py-4 text-h2"
          >
            Go
          </Button>
        )}
      </div>
    </AppShell>
  );
}
