// Dev-only mock of the Telegram Mini App environment.
// In a regular browser (outside Telegram) the telegram-web-app.js script
// provides `window.Telegram.WebApp`, but `initDataUnsafe.user` is undefined,
// which crashes the app. This mock installs a fake user so the UI can run locally.

const mockUser = {
	id: 777000,
	first_name: "Dev",
	last_name: "User",
	username: "dev_user",
		language_code: "ru",
		is_premium: false,
};

export function installTelegramMock() {
	const webapp = window.Telegram?.WebApp;

	if (webapp?.initDataUnsafe?.user) {
		// Running inside Telegram with real data - keep it untouched
		return;
	}

  window.Telegram = {
    WebApp: {
			// The local backend's Telegram auth mock supplies the development ID.
			initData: "",
			initDataUnsafe: { user: mockUser },
			close: () => {},
			sendData: () => {},
			expand: () => {},
			isExpanded: true,
			onEvent: () => {},
			offEvent: () => {},
			setHeaderColor: () => {},
			MainButton: {
				setText: () => {},
				show: () => {},
				hide: () => {},
				onClick: () => {},
				offClick: () => {},
			},
			BackButton: {
				show: () => {},
				hide: () => {},
				onClick: () => {},
				offClick: () => {},
			},
		},
	};

}
