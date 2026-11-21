import { useWindowDimensions } from "react-native";

// Mesmo breakpoint já usado no tocando.tsx (width >= 768 = desktop)
export function useEhDesktop(breakpoint: number = 768) {
  const { width } = useWindowDimensions();
  return width >= breakpoint;
}
