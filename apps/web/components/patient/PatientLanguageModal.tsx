"use client";

import { useState } from "react";
import { Globe, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import styles from "./PatientLanguageModal.module.css";

interface PatientLanguageModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function PatientLanguageModal({ isOpen, onClose }: PatientLanguageModalProps) {
  const {
    language,
    setLanguage,
    languages,
    t,
    showLanguageModal,
    setShowLanguageModal,
    isFirstVisit,
    markLanguageConfigured,
  } = useLanguage();

  const [selected, setSelected] = useState<string>(language);

  const shouldShow = isOpen !== undefined ? isOpen : showLanguageModal;

  if (!shouldShow) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setShowLanguageModal(false);
      markLanguageConfigured();
    }
  };

  const handleSelectLanguage = (code: string) => {
    setSelected(code);
  };

  const handleConfirm = () => {
    setLanguage(selected);
    handleClose();
  };

  const handleContinueEnglish = () => {
    setLanguage("en");
    handleClose();
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Language selection">
        <div className={styles.header}>
          <div className={styles.headerIconRow}>
            <div className={styles.globeBadge}>
              <Globe size={14} />
              <span>Languages / भाषाएं</span>
            </div>
            {!isFirstVisit && (
              <button
                type="button"
                className={styles.closeBtn}
                onClick={handleClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <h2 className={styles.title}>{t("choose_language", "Choose Your Preferred Language")}</h2>
          <p className={styles.subtitle}>
            {t(
              "choose_language_sub",
              "Select your language for daily health logging and care instructions. You can change this anytime."
            )}
          </p>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            {languages.map((lang) => {
              const isCurrent = selected === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  className={`${styles.langCard} ${isCurrent ? styles.langCardSelected : ""}`}
                  onClick={() => handleSelectLanguage(lang.code)}
                >
                  <span className={styles.nativeName}>{lang.nativeName}</span>
                  <span className={styles.englishName}>{lang.name}</span>
                  {isCurrent && <Check size={16} className={styles.checkIndicator} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.footer}>
          {isFirstVisit ? (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleContinueEnglish}
            >
              {t("continue_english", "Continue in English")}
            </button>
          ) : (
            <button type="button" className={styles.btnSecondary} onClick={handleClose}>
              {t("cancel", "Cancel")}
            </button>
          )}

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleConfirm}
          >
            {t("confirm_language", "Confirm & Continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
