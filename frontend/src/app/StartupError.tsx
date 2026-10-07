import { m } from "framer-motion";

import { AppShell, Button, Text } from "@/ui";
import { springs } from "@/ui/motion";
import { colors } from "@/design/tokens";

interface StartupErrorProps {
  message: string;
  retry: () => void;
}

export function StartupError({ message, retry }: StartupErrorProps) {
  return (
    <AppShell className="relative px-6">
      <div className="flex min-h-full flex-1 flex-col items-center justify-center text-center" style={{ backgroundColor: colors.bg }}>
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 14 }}
          transition={springs.soft}
        >
          <Text className="mb-2" kind="title">Не удалось открыть приложение</Text>
          <Text className="max-w-[280px]" kind="subtitle">{message}</Text>
          <Button className="mt-8 px-8 py-3" onClick={retry}>Повторить</Button>
        </m.div>
      </div>
    </AppShell>
  );
}
