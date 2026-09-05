"use client";

import { CheckCircle2, AlertTriangle, AlertOctagon, Printer, PhoneCall, X } from "lucide-react";
import styles from "./ActionPlanModal.module.css";

interface ActionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  diagnosis?: string;
  emergencyDoctorPhone?: string;
}

export function ActionPlanModal({
  isOpen,
  onClose,
  patientName = "Patient",
  diagnosis = "Asthma / COPD",
  emergencyDoctorPhone = "+919916893982",
}: ActionPlanModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="actionPlanTitle">
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 id="actionPlanTitle" className={styles.modalTitle}>
              Personalized Respiratory Action Plan
            </h2>
            <div className={styles.modalSub}>
              {patientName} · {diagnosis} · GINA &amp; GOLD Clinical Guide
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body (Green, Yellow, Red Zones) */}
        <div className={styles.modalBody}>
          {/* 🟢 Green Zone */}
          <div className={`${styles.zoneCard} ${styles.greenZone}`}>
            <div className={styles.zoneHeader}>
              <div className={`${styles.zoneTitle} ${styles.greenTitle}`}>
                <CheckCircle2 size={18} />
                <span>Green Zone — Controlled (All Clear)</span>
              </div>
              <span className={`${styles.zoneBadge} ${styles.greenBadge}`}>PEFR &gt; 80% Baseline</span>
            </div>
            <div className={styles.zoneContent}>
              <strong>Signs:</strong> Breathing is easy, no night waking, no cough/wheeze, normal walking and physical activity.
              <ul className={styles.actionList}>
                <li>Continue taking your daily regular controller inhaler / medication as prescribed.</li>
                <li>Rinse mouth after steroid inhalers. Record daily baseline log.</li>
              </ul>
            </div>
          </div>

          {/* 🟡 Yellow Zone */}
          <div className={`${styles.zoneCard} ${styles.yellowZone}`}>
            <div className={styles.zoneHeader}>
              <div className={`${styles.zoneTitle} ${styles.yellowTitle}`}>
                <AlertTriangle size={18} />
                <span>Yellow Zone — Caution (Flare-Up Warning)</span>
              </div>
              <span className={`${styles.zoneBadge} ${styles.yellowBadge}`}>PEFR 50% – 80% Baseline</span>
            </div>
            <div className={styles.zoneContent}>
              <strong>Signs:</strong> Increased coughing, mild wheezing, breathlessness during activity, waking up at night with tightness.
              <ul className={styles.actionList}>
                <li>Take <strong>2 to 4 puffs of your rescue inhaler</strong> (e.g., Levolin / Duolin) with spacer.</li>
                <li>Rest quietly and re-check your symptoms and Peak Flow after 20 minutes.</li>
                <li>If not returning to Green zone within 24 hours, contact your doctor for medicine adjustment.</li>
              </ul>
            </div>
          </div>

          {/* 🔴 Red Zone */}
          <div className={`${styles.zoneCard} ${styles.redZone}`}>
            <div className={styles.zoneHeader}>
              <div className={`${styles.zoneTitle} ${styles.redTitle}`}>
                <AlertOctagon size={18} />
                <span>Red Zone — Medical Emergency (Danger)</span>
              </div>
              <span className={`${styles.zoneBadge} ${styles.redBadge}`}>PEFR &lt; 50% or SpO2 &lt; 88%</span>
            </div>
            <div className={styles.zoneContent}>
              <strong>Signs:</strong> Severe breathlessness, difficulty speaking full sentences, chest sucking in, blue lips/fingertips, rescue inhaler not helping.
              <ul className={styles.actionList}>
                <li>Take <strong>4 to 6 puffs of rescue inhaler immediately</strong>.</li>
                <li>Call your doctor or emergency helpline straight away. Do not wait.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.printBtn} onClick={handlePrint}>
            <Printer size={15} />
            <span>Print 1-Page Action Card</span>
          </button>

          <a href={`tel:${emergencyDoctorPhone}`} className={styles.sosBtn}>
            <PhoneCall size={15} />
            <span>Emergency Clinic SOS: {emergencyDoctorPhone}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
