export function getProfileNameTextSize(name: string): string {
  const length = Array.from(name.trim()).length;

  if (length >= 28) {
    return "text-[1.35rem] sm:text-4xl";
  }

  if (length >= 18) {
    return "text-[1.625rem] sm:text-5xl";
  }

  return "text-3xl sm:text-5xl";
}
