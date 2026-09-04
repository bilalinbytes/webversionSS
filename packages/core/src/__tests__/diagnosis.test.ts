import { describe, it, expect } from "vitest";
import {
  normalizeDashboard,
  formatDiagnosisDisplay,
  buildStructuredDiagnosis,
  parseDiagnosisLabel,
} from "../diagnosis";

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
    expect(formatDiagnosisDisplay("OAD / Asthma")).toBe("OAD / Asthma");
    expect(formatDiagnosisDisplay("OAD / COPD")).toBe("OAD / COPD");
    expect(formatDiagnosisDisplay("asthma")).toBe("OAD / Asthma");
    expect(formatDiagnosisDisplay("copd")).toBe("OAD / COPD");
    expect(formatDiagnosisDisplay("ILD / IPF / Fibrotic")).toBe("ILD / IPF / Fibrotic");
    expect(formatDiagnosisDisplay("Bronchiectasis / Idiopathic")).toBe("Bronchiectasis / Idiopathic");
    expect(formatDiagnosisDisplay("Bronchiectasis / Post-infectious")).toBe("Bronchiectasis / Post-infectious");
    expect(formatDiagnosisDisplay("bronchiectasis")).toBe("Bronchiectasis");
    expect(formatDiagnosisDisplay("ild")).toBe("ILD");
    expect(formatDiagnosisDisplay("post_icu")).toBe("Post ICU Recovery");
    expect(formatDiagnosisDisplay("oad")).toBe("OAD");
    expect(formatDiagnosisDisplay(null)).toBeNull();
    expect(formatDiagnosisDisplay(undefined)).toBeNull();
  });
});

describe("buildStructuredDiagnosis", () => {
  it("builds Bronchiectasis diagnosis correctly", () => {
    expect(
      buildStructuredDiagnosis({
        disease_category: "Bronchiectasis",
        bronchiectasis_cause: "Post-infectious",
      })
    ).toBe("Bronchiectasis / Post-infectious");

    expect(
      buildStructuredDiagnosis({
        disease_category: "Bronchiectasis",
        bronchiectasis_cause: "Other",
        bronchiectasis_other_text: "Post-infectious Bronchiectasis",
      })
    ).toBe("Bronchiectasis / Post-infectious Bronchiectasis");

    expect(
      buildStructuredDiagnosis({
        disease_category: "Bronchiectasis",
      })
    ).toBe("Bronchiectasis");
  });

  it("builds ILD diagnosis correctly", () => {
    expect(
      buildStructuredDiagnosis({
        disease_category: "ILD",
        ild_subtype: "Idiopathic pulmonary fibrosis",
        is_fibrotic: true,
      })
    ).toBe("ILD / Idiopathic pulmonary fibrosis / Fibrotic");

    expect(
      buildStructuredDiagnosis({
        disease_category: "ILD",
        ild_subtype: "Hypersensitivity pneumonitis",
        is_fibrotic: false,
      })
    ).toBe("ILD / Hypersensitivity pneumonitis / Non-Fibrotic");

    expect(
      buildStructuredDiagnosis({
        disease_category: "ILD",
        ild_subtype: "Others",
        ild_other_text: "Chronic Berylliosis",
        is_fibrotic: true,
      })
    ).toBe("ILD / Chronic Berylliosis / Fibrotic");
  });

  it("builds OAD diagnosis correctly", () => {
    expect(
      buildStructuredDiagnosis({
        disease_category: "OAD",
        oad_diagnosis: "Asthma",
      })
    ).toBe("OAD / Asthma");

    expect(
      buildStructuredDiagnosis({
        disease_category: "OAD",
        oad_diagnosis: "Asthma-COPD Overlap (ACO)",
      })
    ).toBe("OAD / Asthma-COPD Overlap (ACO)");

    expect(
      buildStructuredDiagnosis({
        disease_category: "OAD",
        oad_diagnosis: "Other OAD",
        oad_other_text: "Chronic Bronchitis",
      })
    ).toBe("OAD / Chronic Bronchitis");
  });

  it("builds Post ICU Recovery diagnosis correctly", () => {
    expect(
      buildStructuredDiagnosis({
        disease_category: "Post ICU Recovery",
        posticu_cause: "Bronchiectasis",
      })
    ).toBe("Post ICU Recovery / Bronchiectasis");

    expect(
      buildStructuredDiagnosis({
        disease_category: "Post ICU Recovery",
        posticu_cause: "Other cause",
        posticu_other_text: "ARDS Sequelae",
      })
    ).toBe("Post ICU Recovery / ARDS Sequelae");
  });
});

describe("parseDiagnosisLabel & Round-trip", () => {
  it("parses custom Bronchiectasis diagnosis into Other cause and other_text", () => {
    const parsed = parseDiagnosisLabel("Bronchiectasis / Post-infectious Bronchiectasis");
    expect(parsed.disease_category).toBe("Bronchiectasis");
    expect(parsed.primary_diagnosis).toBe("bronchiectasis");
    expect(parsed.bronchiectasis_cause).toBe("Other");
    expect(parsed.bronchiectasis_other_text).toBe("Post-infectious Bronchiectasis");

    // Re-building preserves the exact label
    const rebuilt = buildStructuredDiagnosis(parsed);
    expect(rebuilt).toBe("Bronchiectasis / Post-infectious Bronchiectasis");
  });

  it("parses standard Bronchiectasis diagnosis", () => {
    const parsed = parseDiagnosisLabel("Bronchiectasis / Post-infectious");
    expect(parsed.disease_category).toBe("Bronchiectasis");
    expect(parsed.bronchiectasis_cause).toBe("Post-infectious");
    expect(parsed.bronchiectasis_other_text).toBe("");

    const rebuilt = buildStructuredDiagnosis(parsed);
    expect(rebuilt).toBe("Bronchiectasis / Post-infectious");
  });

  it("parses custom ILD diagnosis into Others and other_text", () => {
    const parsed = parseDiagnosisLabel("ILD / Chronic Berylliosis / Fibrotic");
    expect(parsed.disease_category).toBe("ILD");
    expect(parsed.primary_diagnosis).toBe("ild");
    expect(parsed.ild_subtype).toBe("Others");
    expect(parsed.ild_other_text).toBe("Chronic Berylliosis");
    expect(parsed.is_fibrotic).toBe(true);

    const rebuilt = buildStructuredDiagnosis(parsed);
    expect(rebuilt).toBe("ILD / Chronic Berylliosis / Fibrotic");
  });

  it("parses standard ILD diagnosis with fibrotic status", () => {
    const parsed = parseDiagnosisLabel("ILD / Idiopathic pulmonary fibrosis / Non-Fibrotic");
    expect(parsed.disease_category).toBe("ILD");
    expect(parsed.ild_subtype).toBe("Idiopathic pulmonary fibrosis");
    expect(parsed.is_fibrotic).toBe(false);

    const rebuilt = buildStructuredDiagnosis(parsed);
    expect(rebuilt).toBe("ILD / Idiopathic pulmonary fibrosis / Non-Fibrotic");
  });

  it("parses standard OAD and custom OAD", () => {
    const asthmaParsed = parseDiagnosisLabel("OAD / Asthma");
    expect(asthmaParsed.disease_category).toBe("OAD");
    expect(asthmaParsed.primary_diagnosis).toBe("asthma");
    expect(asthmaParsed.oad_diagnosis).toBe("Asthma");

    const customOadParsed = parseDiagnosisLabel("OAD / Chronic Bronchitis");
    expect(customOadParsed.disease_category).toBe("OAD");
    expect(customOadParsed.oad_diagnosis).toBe("Other OAD");
    expect(customOadParsed.oad_other_text).toBe("Chronic Bronchitis");

    const rebuilt = buildStructuredDiagnosis(customOadParsed);
    expect(rebuilt).toBe("OAD / Chronic Bronchitis");
  });

  it("parses standard and custom Post ICU Recovery", () => {
    const postIcuParsed = parseDiagnosisLabel("Post ICU Recovery / Bronchiectasis");
    expect(postIcuParsed.disease_category).toBe("Post ICU Recovery");
    expect(postIcuParsed.posticu_cause).toBe("Bronchiectasis");

    const customPostIcu = parseDiagnosisLabel("Post ICU Recovery / ARDS Sequelae");
    expect(customPostIcu.disease_category).toBe("Post ICU Recovery");
    expect(customPostIcu.posticu_cause).toBe("Other cause");
    expect(customPostIcu.posticu_other_text).toBe("ARDS Sequelae");

    const rebuilt = buildStructuredDiagnosis(customPostIcu);
    expect(rebuilt).toBe("Post ICU Recovery / ARDS Sequelae");
  });
});
