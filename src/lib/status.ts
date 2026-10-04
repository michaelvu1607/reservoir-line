export function statusLabel(status: number): string {
  switch (status) {
    case 1:
      return "Far below normal";
    case 2:
      return "Well below normal";
    case 3:
      return "Below normal";
    case 4:
      return "Slightly below normal";
    case 5:
      return "Slightly above normal";
    case 6:
      return "Above normal";
    case 7:
      return "Well above normal";
    case 8:
      return "Far above normal";
    default:
      return "Not scored";
  }
}

export function statusSigma(status: number): string {
  switch (status) {
    case 1:
      return "≤ −4σ";
    case 2:
      return "−3σ";
    case 3:
      return "−2σ";
    case 4:
      return "−1σ";
    case 5:
      return "+1σ";
    case 6:
      return "+2σ";
    case 7:
      return "+3σ";
    case 8:
      return "≥ +4σ";
    default:
      return "n/a";
  }
}
