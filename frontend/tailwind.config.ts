import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slds: {
          blue: {
            DEFAULT: "#0176D3",
            hover: "#005FB2",
            light: "#EBF5FF",
            dark: "#014486",
          },
          border: "#DDDBDA",
          bg: "#F3F3F3",
          card: "#FFFFFF",
          text: {
            primary: "#181818",
            secondary: "#706E6B",
            heading: "#080707",
          },
          green: {
            DEFAULT: "#2E844A",
            light: "#EBF7EE",
          },
          amber: {
            DEFAULT: "#FE9339",
            light: "#FFF1E5",
          },
          red: {
            DEFAULT: "#EA001E",
            light: "#FEEDEC",
          },
        },
      },
      boxShadow: {
        slds: "0 2px 4px rgba(0, 0, 0, 0.07)",
        "slds-hover": "0 4px 12px rgba(0, 0, 0, 0.12)",
        "slds-header": "0 2px 4px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
