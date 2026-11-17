// HeyTribe colors and type, the same tokens as the web app (spa/app.css) and the approved page mockup:
// calm off-white ground, slate ink, one sage accent, soft rounded cards, one typeface.
import { useColorScheme } from "react-native";

const light = {
  bg: "#FBFCFA", surface: "#FFFFFF", ink: "#2F3B45", muted: "#555E67", faint: "#8A9399", line: "#E1E6E1", hairline: "#EEF1EE",
  sage: "#5E8C7A", sageBtn: "#527F6D", sageInk: "#46705F", sageSoft: "#E6EEE9", pillOn: "#DCE8E1", pill: "#F0F3F0",
  onSage: "#FFFFFF", danger: "#A4463A", star: "#76592A", toast: "#2F3B45",
};
const dark: typeof light = {
  bg: "#151B1F", surface: "#1E262C", ink: "#E6EBE8", muted: "#A3ADB2", faint: "#7D878D", line: "#2D373E", hairline: "#26303A",
  sage: "#6E9F8B", sageBtn: "#4C7766", sageInk: "#93C2AD", sageSoft: "#22332D", pillOn: "#2A3E36", pill: "#242E35",
  onSage: "#FFFFFF", danger: "#E07A6C", star: "#D9B36E", toast: "#E6EBE8",
};
export type Colors = typeof light;
export const useColors = () => (useColorScheme() === "dark" ? dark : light);

// Family member colors, keyed by the `color` names the web app stores (COLORS in spa/app.js, --m-* in app.css).
export const MEMBER_COLORS = ["sage", "blue", "rose", "olive", "sand"] as const;
export const MEMBER = {
  light: { sage: "#D7E5DC", blue: "#D9E3EB", rose: "#EFE0DC", olive: "#E6E8D7", sand: "#F1E7D3" } as Record<string, string>,
  dark: { sage: "#23352E", blue: "#223040", rose: "#3A2A28", olive: "#2E3226", sand: "#3A3224" } as Record<string, string>,
  dot: { sage: "#5E8C7A", blue: "#6B8BA4", rose: "#B08A84", olive: "#8A8F6B", sand: "#C9A66B" } as Record<string, string>,
};

export const font = {
  regular: "AtkinsonHyperlegibleNext_400Regular",
  medium: "AtkinsonHyperlegibleNext_500Medium",
  semibold: "AtkinsonHyperlegibleNext_600SemiBold",
  bold: "AtkinsonHyperlegibleNext_700Bold",
};
export const space = { gutter: 20, card: 18, gap: 10, section: 22 };
export const radius = { card: 18, pill: 999, sheet: 24, input: 14 };
