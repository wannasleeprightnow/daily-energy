import { useNavigate } from "react-router-dom";
import { m } from "framer-motion";

import { AppShell, Button, Text } from "@/ui";
import { durations, easings, springs } from "@/ui/motion";
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
        <m.img
          alt="Daily Energy"
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
          decoding="async"
          height={168}
          initial={{ opacity: 0, scale: 0.85 }}
          src={logo}
          transition={springs.soft}
          width={168}
        />

        <m.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 16 }}
          transition={{ delay: 0.08, duration: durations.normal, ease: easings.out }}
        >
          <Text className="mb-2" kind="title">
            Привет! Мы — Daily Energy
          </Text>
        </m.div>
        <m.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 16 }}
          transition={{ delay: 0.16, duration: durations.normal, ease: easings.out }}
        >
          <Text className="max-w-[260px] leading-relaxed text-on/80" kind="subtitle">
            Твой персональный гид в мире здоровья.
          </Text>
        </m.div>

        {showGo && (
          <m.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 16 }}
            transition={{ delay: 0.24, duration: durations.normal, ease: easings.out }}
          >
            <Button
              className="mt-10 px-12 py-4 text-h2"
              onClick={() => navigate("/onboarding")}
            >
              Go
            </Button>
          </m.div>
        )}
      </div>
    </AppShell>
  );
}
