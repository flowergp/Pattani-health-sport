export function getDisplayMatchNum(id: string, sport: string): string {
  const suffix = id.split("_").pop();
  if (!suffix || isNaN(Number(suffix))) return suffix || "-";
  const num = Number(suffix);

  // Volleyball
  if (sport === "volleyball") {
    // If it's a group stage match (num <= 15)
    if (num <= 15) {
      const isMale = id.includes("men");
      if (isMale) {
        if (num >= 8 && num <= 14) return String(num - 7);
        if (num === 15) return "8";
        return String(num);
      } else {
        if (num >= 9 && num <= 15) return String(num - 8);
        return String(num);
      }
    }
  }

  // Football
  if (sport === "football") {
    if (num <= 15) {
      if (num >= 9 && num <= 15) return String(num - 8);
      return String(num);
    }
  }

  // Petanque
  if (sport === "petanque") {
    if (num <= 24) {
      return String(((num - 1) % 6) + 1);
    }
  }

  return String(num);
}
