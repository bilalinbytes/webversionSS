"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Quote, Award, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./TestimonialCarousel.module.css";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  institution: string;
  initials: string;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "mallikarjun",
    name: "Dr. Mallikarjun",
    role: "Senior Consultant Pulmonologist & Interventional Specialist",
    institution: "HCG Hospital, Bangalore",
    initials: "DM",
    quote:
      "O2Plus has fundamentally transformed how we monitor high-risk chronic respiratory patients between clinic visits. The ability to detect desaturation trends and symptom flares allows our pulmonology team to intervene days before acute hospital admissions.",
  },
  {
    id: "manu-madan",
    name: "Dr. Manu Madan",
    role: "Associate Director & Senior Consultant, Respiratory Medicine",
    institution: "Medanta Hospital, Noida",
    initials: "MM",
    quote:
      "The intelligent triage and longitudinal symptom tracking bridge the critical gap between OPD consultations. It empowers patients with actionable daily guidance while providing our department with high-precision clinical escalation flags.",
  },
  {
    id: "arun-raja",
    name: "Dr. Arun Raja",
    role: "Consultant Pulmonologist & Chest Specialist",
    institution: "Tirupati, Andhra Pradesh",
    initials: "AR",
    quote:
      "Remote respiratory monitoring has never been this intuitive for both clinicians and patients. The automated guideline-based symptom tracking and rapid vitals analysis ensure proactive, gold-standard pulmonary care.",
  },
];

export function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  // 3-second auto-slide timer
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, nextSlide]);

  return (
    <div
      className={styles.carouselContainer}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="Clinical Reviews & Testimonials"
    >
      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={t.id}
              className={styles.slide}
              aria-hidden={currentIndex !== idx}
            >
              <div className={styles.card}>
                <div>
                  <Quote size={36} className={styles.quoteIcon} />
                  <p className={styles.quote}>&ldquo;{t.quote}&rdquo;</p>
                </div>

                <div className={styles.doctorBioRow}>
                  <div className={styles.doctorAvatarCircle}>
                    <span>{t.initials}</span>
                  </div>
                  <div className={styles.doctorDetails}>
                    <div className={styles.doctorName}>
                      {t.name}
                      <Award size={16} className={styles.verifiedIcon} />
                    </div>
                    <div className={styles.doctorRole}>{t.role}</div>
                    <div className={styles.doctorInstitution}>
                      {t.institution}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className={styles.controlsRow}>
        <button
          type="button"
          onClick={prevSlide}
          className={styles.arrowBtn}
          aria-label="Previous clinical review"
        >
          <ChevronLeft size={18} />
        </button>

        <div className={styles.dots}>
          {TESTIMONIALS.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`${styles.dot} ${currentIndex === idx ? styles.dotActive : ""}`}
              aria-label={`Go to slide ${idx + 1}: ${t.name}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={nextSlide}
          className={styles.arrowBtn}
          aria-label="Next clinical review"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
