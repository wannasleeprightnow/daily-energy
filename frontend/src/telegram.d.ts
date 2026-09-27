export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        close: () => void;
        sendData: (data: string) => void;
        expand: () => void;
        isExpanded: boolean;
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: (event: unknown) => void) => void;
        setHeaderColor: (color: string) => void;
        themeParams?: Record<string, string>;
        MainButton: {
          setText: (text: string) => void;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        BackButton?: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
      };
    };
  }
}
