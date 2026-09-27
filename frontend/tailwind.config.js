/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Figma tokens (Daily Energy — Copy)
        bg: "#212121",
        surface: "#303030",
        surface2: "#4a4a4a",
        accent: "#f08629",
        "accent-soft": "#f0a15c",
        on: "#ffffff",
        muted: "#9a9a9a",
        success: "#4caf50",
        danger: "#e5484d",
      },
      fontFamily: {
        firs: ["TT Firs Neue Trial Var", "TT Firs Neue", "Arial", "sans-serif"],
      },
      fontSize: {
        // pixel-accurate type scale from Figma
        h1: ["32px", { lineHeight: "41px", fontWeight: "500" }],
        h2: ["30px", { lineHeight: "39px", fontWeight: "400" }],
        h3: ["27px", { lineHeight: "35px", fontWeight: "400" }],
        body: ["25px", { lineHeight: "32px", fontWeight: "400" }],
        bodySm: ["17px", { lineHeight: "22px", fontWeight: "400" }],
        caption: ["14px", { lineHeight: "18px", fontWeight: "400" }],
      },
      borderRadius: {
        card: "15px",
        pill: "20px",
      },
      maxWidth: {
        app: "430px",
      },
    },
  },
  plugins: [],
};
