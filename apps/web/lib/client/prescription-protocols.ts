/**
 * Pre-defined Clinical Protocols & Custom Template Store for Pulmonology Prescriptions
 */

export interface ProtocolMedication {
  drug_name: string;
  route: string;
  dose: string;
  dose_unit: string;
  frequency: string;
  durationDays?: string;
  ongoing?: boolean;
}

export interface PrescriptionProtocol {
  id: string;
  title: string;
  category: "Asthma" | "COPD" | "Acute Flare" | "Bronchiectasis" | "Post-ICU" | "Custom";
  description: string;
  medications: ProtocolMedication[];
  instruction: string;
}

export const BUILT_IN_PROTOCOLS: PrescriptionProtocol[] = [
  {
    id: "asthma-step2",
    title: "Asthma Step 2 (Mild–Moderate)",
    category: "Asthma",
    description: "Low dose ICS-LABA maintainer with anti-leukotriene support.",
    medications: [
      {
        drug_name: "Budesonide + Formoterol (Budate-F / Foracort)",
        route: "Inhaler",
        dose: "200/6",
        dose_unit: "mcg",
        frequency: "BD",
        ongoing: true,
      },
      {
        drug_name: "Montelukast",
        route: "Tablet",
        dose: "10",
        dose_unit: "mg",
        frequency: "HS",
        ongoing: true,
      },
      {
        drug_name: "Levosalbutamol (Levolin)",
        route: "Inhaler",
        dose: "50",
        dose_unit: "mcg",
        frequency: "SOS",
        ongoing: true,
      },
    ],
    instruction: "Rinse mouth thoroughly with water after inhaler use. Always use a spacer device. Take Montelukast at bedtime.",
  },
  {
    id: "asthma-step4",
    title: "Asthma Step 4 (Severe Persistent)",
    category: "Asthma",
    description: "High dose ICS-LABA + LAMA combination with airway relaxant.",
    medications: [
      {
        drug_name: "Budesonide + Formoterol (Budate-F / Foracort)",
        route: "Inhaler",
        dose: "400/6",
        dose_unit: "mcg",
        frequency: "BD",
        ongoing: true,
      },
      {
        drug_name: "Tiotropium (Tiovair / Tiova)",
        route: "Inhaler",
        dose: "18",
        dose_unit: "mcg",
        frequency: "OD",
        ongoing: true,
      },
      {
        drug_name: "Acebrophylline",
        route: "Capsule",
        dose: "100",
        dose_unit: "mg",
        frequency: "BD",
        durationDays: "14",
        ongoing: false,
      },
      {
        drug_name: "Levosalbutamol (Levolin)",
        route: "Inhaler",
        dose: "50",
        dose_unit: "mcg",
        frequency: "SOS",
        ongoing: true,
      },
    ],
    instruction: "Strict twice-daily inhaler adherence. Record daily morning and evening Peak Flow (PEFR). Seek review if rescue inhaler needed >2 times/week.",
  },
  {
    id: "copd-gold-e",
    title: "COPD GOLD Group E (Frequent Exacerbator)",
    category: "COPD",
    description: "Dual bronchodilation (LABA+LAMA) + Mucolytic + SOS bronchodilator.",
    medications: [
      {
        drug_name: "Glycopyrronium + Formoterol (Airtec-G / Duoresp)",
        route: "Inhaler",
        dose: "50/12",
        dose_unit: "mcg",
        frequency: "BD",
        ongoing: true,
      },
      {
        drug_name: "N-Acetylcysteine (NAC)",
        route: "Tablet",
        dose: "600",
        dose_unit: "mg",
        frequency: "OD",
        durationDays: "30",
        ongoing: false,
      },
      {
        drug_name: "Ipratropium + Levosalbutamol (Duolin)",
        route: "Inhaler",
        dose: "Standard",
        dose_unit: "mcg",
        frequency: "SOS",
        ongoing: true,
      },
    ],
    instruction: "Practice pursed-lip breathing twice daily. Dissolve NAC tablet in half glass water. Stay hydrated and avoid cold air exposure.",
  },
  {
    id: "acute-bronchospasm-rescue",
    title: "Acute Flare-Up / Bronchospasm Rescue",
    category: "Acute Flare",
    description: "5-day rescue protocol: Nebulization + Short-course steroid + Antibiotic cover.",
    medications: [
      {
        drug_name: "Duolin (Ipratropium + Levosalbutamol) Respules",
        route: "Nebulizer",
        dose: "2.5",
        dose_unit: "ml",
        frequency: "BD",
        durationDays: "5",
        ongoing: false,
      },
      {
        drug_name: "Prednisolone (Wysolone)",
        route: "Tablet",
        dose: "20",
        dose_unit: "mg",
        frequency: "OD",
        durationDays: "5",
        ongoing: false,
      },
      {
        drug_name: "Cefuroxime Axetil",
        route: "Tablet",
        dose: "500",
        dose_unit: "mg",
        frequency: "BD",
        durationDays: "5",
        ongoing: false,
      },
    ],
    instruction: "Take Prednisolone strictly after breakfast. Check SpO2 every 6 hours. Visit the hospital immediately if resting SpO2 drops below 90%.",
  },
  {
    id: "bronchiectasis-clearance",
    title: "Bronchiectasis Airway Clearance Protocol",
    category: "Bronchiectasis",
    description: "Mucus thinning + targeted prophylactic macrolide + bronchodilator pre-physio.",
    medications: [
      {
        drug_name: "N-Acetylcysteine (NAC)",
        route: "Tablet",
        dose: "600",
        dose_unit: "mg",
        frequency: "OD",
        durationDays: "30",
        ongoing: false,
      },
      {
        drug_name: "Levosalbutamol (Levolin)",
        route: "Inhaler",
        dose: "100",
        dose_unit: "mcg",
        frequency: "BD",
        ongoing: true,
      },
      {
        drug_name: "Azithromycin",
        route: "Tablet",
        dose: "500",
        dose_unit: "mg",
        frequency: "OD",
        durationDays: "14",
        ongoing: false,
      },
    ],
    instruction: "Take 1 puff of Levosalbutamol 15 minutes before daily chest physiotherapy/postural drainage. Perform active cycle of breathing exercises.",
  },
];

const CUSTOM_STORAGE_KEY = "o2plus_custom_rx_templates";

export function loadCustomProtocols(): PrescriptionProtocol[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomProtocol(protocol: Omit<PrescriptionProtocol, "id">): PrescriptionProtocol {
  const customList = loadCustomProtocols();
  const newProtocol: PrescriptionProtocol = {
    ...protocol,
    id: `custom_${Date.now()}`,
    category: "Custom",
  };
  const updated = [newProtocol, ...customList];
  try {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to persist custom protocol:", e);
  }
  return newProtocol;
}

export function deleteCustomProtocol(id: string): void {
  const customList = loadCustomProtocols();
  const updated = customList.filter((p) => p.id !== id);
  try {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to delete custom protocol:", e);
  }
}
