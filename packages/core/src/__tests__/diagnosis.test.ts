import { describe, it, expect } from "vitest";
import { normalizeDashboard, formatDiagnosisDisplay } from "../diagnosis";

describe("normalizeDashboard", () => {
  it("maps OAD / Asthma-COPD overlap to copd dashboard", () => {
    expect(normalizeDashboard("OAD / Asthma-COPD overlap", null)).toBe("copd");
    expect(normalizeDashboard("OAD / Asthma-COPD Overlap", null)).toBe("copd");
    expect(normalizeDashboard("OAD / Asthma-COPD Overlap (ACO)", null)).toBe("copd");
    expect(normalizeDashboard("Asthma-COPD overlap", null)).toBe("copd");
    expect(normalizeDashboard("OAD / Asthma-COPD overlap", "copd")).toBe("copd");
  });

  it("maps OAD / Bronchiolitis to asthma dashboard even if storedDashboard has copd", () => {
    expect(normalizeDashboard("OAD / Bronchiolitis", null)).toBe("asthma");
    expect(normalizeDashboard("OAD / Bronchiolitis", "copd")).toBe("asthma");
    expect(normalizeDashboard("OAD / Bronchiolitis Obliterans", null)).toBe("asthma");
    expect(normalizeDashboard("OAD / Bronchiolitis Obliterans", "copd")).toBe("asthma");
    expect(normalizeDashboard("Bronchiolitis", null)).toBe("asthma");
  });

  it("maps other standard diagnoses correctly", () => {
    expect(normalizeDashboard("OAD / Asthma", "asthma")).toBe("asthma");
    expect(normalizeDashboard("OAD / COPD", "copd")).toBe("copd");
    expect(normalizeDashboard("ILD / IPF", "ild")).toBe("ild");
    expect(normalizeDashboard("Bronchiectasis / Idiopathic", "bronchiectasis")).toBe("bronchiectasis");
    expect(normalizeDashboard("Post ICU Recovery / Bronchiectasis", "bronchiectasis")).toBe("bronchiectasis");
  });
});

describe("formatDiagnosisDisplay", () => {
  it("formats Asthma-COPD overlap variations to exact 'OAD / Asthma COPD overlap'", () => {
    expect(formatDiagnosisDisplay("OAD / Asthma-COPD overlap")).toBe("OAD / Asthma COPD overlap");
    expect(formatDiagnosisDisplay("OAD / Asthma-COPD Overlap")).toBe("OAD / Asthma COPD overlap");
    expect(formatDiagnosisDisplay("OAD / asthma-copd overlap")).toBe("OAD / Asthma COPD overlap");
    expect(formatDiagnosisDisplay("OAD / Asthma-COPD Overlap (ACO)")).toBe("OAD / Asthma COPD overlap");
    expect(formatDiagnosisDisplay("Asthma-COPD overlap")).toBe("OAD / Asthma COPD overlap");
    expect(formatDiagnosisDisplay("Asthma-COPD Overlap (ACO)")).toBe("OAD / Asthma COPD overlap");
  });

  it("formats Bronchiolitis variations to exact 'OAD / Bronchiolitis Obliterans'", () => {
    expect(formatDiagnosisDisplay("OAD / Bronchiolitis")).toBe("OAD / Bronchiolitis Obliterans");
    expect(formatDiagnosisDisplay("OAD / Bronchiolitis Obliterans")).toBe("OAD / Bronchiolitis Obliterans");
    expect(formatDiagnosisDisplay("OAD / bronchiolitis")).toBe("OAD / Bronchiolitis Obliterans");
    expect(formatDiagnosisDisplay("Bronchiolitis")).toBe("OAD / Bronchiolitis Obliterans");
    expect(formatDiagnosisDisplay("Bronchiolitis Obliterans")).toBe("OAD / Bronchiolitis Obliterans");
  });

  it("formats other diagnoses appropriately", () => {
    expect(formatDiagnosisDisplay("OAD / Asthma")).toBe("Asthma");
    expect(formatDiagnosisDisplay("OAD / COPD")).toBe("COPD");
    expect(formatDiagnosisDisplay("ILD / IPF / Fibrotic")).toBe("ILD / IPF / Fibrotic");
    expect(formatDiagnosisDisplay("Bronchiectasis / Idiopathic")).toBe("Bronchiectasis / Idiopathic");
    expect(formatDiagnosisDisplay(null)).toBeNull();
    expect(formatDiagnosisDisplay(undefined)).toBeNull();
  });
});
