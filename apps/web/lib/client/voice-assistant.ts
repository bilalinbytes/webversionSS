"use client";

/**
 * Voice Assistant helpers using browser native Web Speech API:
 * 1. Text-to-Speech (TTS): Read aloud doctor instructions to patients.
 * 2. Speech-to-Text (STT): Voice dictation for doctors to speak clinical notes.
 */

class VoiceAssistant {
  private isSpeaking = false;
  private activeRecognizer: { start: () => void; stop: () => void } | null = null;

  public speak(text: string, onEnd?: () => void, lang = "en-IN") {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("Speech Synthesis is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    if (!text || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = lang;
    utterance.rate = 0.95; // Slightly slower for clear medical instructions
    utterance.pitch = 1.0;

    // Pick appropriate voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith("en-IN") || v.lang.startsWith("en-GB") || v.lang.startsWith("en-US")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.isSpeaking = true;

    utterance.onend = () => {
      this.isSpeaking = false;
      onEnd?.();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking && typeof window !== "undefined" && window.speechSynthesis.speaking;
  }

  public startListening(options: {
    onResult: (transcript: string) => void;
    onError?: (err: string) => void;
    onEnd?: () => void;
    lang?: string;
  }) {
    if (this.activeRecognizer) {
      this.activeRecognizer.stop();
      this.activeRecognizer = null;
    }
    const rec = this.createSpeechRecognizer(
      options.onResult,
      (isListening) => {
        if (!isListening) options.onEnd?.();
      },
      options.onError,
      options.lang ?? "en-IN"
    );
    if (!rec.isSupported) {
      options.onError?.("Voice speech recognition is not supported in this browser.");
      return;
    }
    this.activeRecognizer = rec;
    rec.start();
  }

  public stopListening() {
    if (this.activeRecognizer) {
      this.activeRecognizer.stop();
      this.activeRecognizer = null;
    }
  }

  public createSpeechRecognizer(
    onResult: (transcript: string) => void,
    onStateChange?: (isListening: boolean) => void,
    onError?: (err: string) => void,
    lang = "en-IN"
  ): { start: () => void; stop: () => void; isSupported: boolean } {
    if (typeof window === "undefined") {
      return { start: () => {}, stop: () => {}, isSupported: false };
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return { start: () => {}, stop: () => {}, isSupported: false };
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    let isListening = false;

    recognition.onstart = () => {
      isListening = true;
      onStateChange?.(true);
    };

    recognition.onend = () => {
      isListening = false;
      onStateChange?.(false);
    };

    recognition.onerror = (event: any) => {
      isListening = false;
      onStateChange?.(false);
      onError?.(event.error || "Speech recognition error");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onResult(finalTranscript.trim());
      }
    };

    return {
      start: () => {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Recognition start error:", e);
        }
      },
      stop: () => {
        try {
          recognition.stop();
        } catch (e) {
          console.warn("Recognition stop error:", e);
        }
      },
      isSupported: true,
    };
  }
}

export const voiceAssistant = new VoiceAssistant();
