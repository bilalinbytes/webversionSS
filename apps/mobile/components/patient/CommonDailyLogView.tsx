import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { colors } from '@o2plus/theme';
import { submitDailyLog, getPatientDiagnosis, getPatientMedications } from '@o2plus/api-client/patient';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';

// Reusable UI components
export const BooleanToggle = ({ label, value, onChange }: any) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.toggleGroup}>
      <TouchableOpacity style={[styles.toggleBtn, value === true && styles.toggleBtnActive]} onPress={() => onChange(true)}>
        <Text style={[styles.toggleText, value === true && styles.toggleTextActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.toggleBtn, value === false && styles.toggleBtnActive]} onPress={() => onChange(false)}>
        <Text style={[styles.toggleText, value === false && styles.toggleTextActive]}>No</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export const NumberScale = ({ label, min, max, value, onChange }: any) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label} ({min}-{max})</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scaleContainer}>
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(num => (
        <TouchableOpacity 
          key={num} 
          style={[styles.scaleBtn, value === num.toString() && styles.scaleBtnActive]}
          onPress={() => onChange(num.toString())}
        >
          <Text style={[styles.scaleText, value === num.toString() && styles.scaleTextActive]}>{num}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

export const PickerGroup = ({ label, options, value, onChange }: any) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.pickerContainer}>
      {options.map((opt: string) => (
        <TouchableOpacity 
          key={opt}
          style={[styles.pickerBtn, value === opt && styles.pickerBtnActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.pickerText, value === opt && styles.pickerTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export const DiseaseSpecificDailyLog = ({ dashboard, form, updateForm }: any) => {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeader}>Disease Specific Symptoms · रोग विशिष्ट लक्षण</Text>
      
      {dashboard === 'asthma' && (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Rescue Inhaler Puffs</Text>
            <TextInput style={styles.input} placeholder="0" keyboardType="number-pad" value={form.rescue_inhaler_puffs} onChangeText={v => updateForm('rescue_inhaler_puffs', v)} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PEFR Reading (L/min)</Text>
            <TextInput style={styles.input} placeholder="e.g. 350" keyboardType="number-pad" value={form.pefr_reading} onChangeText={v => updateForm('pefr_reading', v)} />
          </View>
          <BooleanToggle label="Woke up at night due to asthma?" value={form.night_waking} onChange={(v: boolean) => updateForm('night_waking', v)} />
          <BooleanToggle label="Controller Inhaler Taken?" value={form.controller_taken} onChange={(v: boolean) => updateForm('controller_taken', v)} />
        </>
      )}

      {dashboard === 'copd' && (
        <>
          <NumberScale label="Energy Level" min={0} max={10} value={form.energy_level} onChange={(v: string) => updateForm('energy_level', v)} />
          <NumberScale label="Chest Heaviness" min={0} max={10} value={form.chest_heaviness} onChange={(v: string) => updateForm('chest_heaviness', v)} />
          <PickerGroup label="Sputum Colour" options={["clear", "white", "yellow", "green", "brown"]} value={form.sputum_colour} onChange={(v: string) => updateForm('sputum_colour', v)} />
          <PickerGroup label="Sputum Volume" options={["none", "teaspoon", "tablespoon", "cup"]} value={form.sputum_volume} onChange={(v: string) => updateForm('sputum_volume', v)} />
          <BooleanToggle label="Sleep Disturbed?" value={form.sleep_disturbed} onChange={(v: boolean) => updateForm('sleep_disturbed', v)} />
          <BooleanToggle label="Decreased Exercise Tolerance?" value={form.exercise_tolerance} onChange={(v: boolean) => updateForm('exercise_tolerance', v)} />
          <BooleanToggle label="Wheezing?" value={form.wheezing} onChange={(v: boolean) => updateForm('wheezing', v)} />
        </>
      )}

      {dashboard === 'bronchiectasis' && (
        <>
          <NumberScale label="Ease of Clearance" min={1} max={5} value={form.ease_of_clearance} onChange={(v: string) => updateForm('ease_of_clearance', v)} />
          <PickerGroup label="Sputum Colour" options={["clear", "white", "yellow", "green", "brown"]} value={form.sputum_colour} onChange={(v: string) => updateForm('sputum_colour', v)} />
          <PickerGroup label="Sputum Volume" options={["none", "teaspoon", "tablespoon", "cup", "massive"]} value={form.sputum_volume} onChange={(v: string) => updateForm('sputum_volume', v)} />
          <BooleanToggle label="Feverish (>102°F)?" value={form.feverish_or_temp_gt_102} onChange={(v: boolean) => updateForm('feverish_or_temp_gt_102', v)} />
          <BooleanToggle label="Malaise / Fatigue?" value={form.malaise} onChange={(v: boolean) => updateForm('malaise', v)} />
          <BooleanToggle label="Pedal Edema (Swelling)?" value={form.pedal_edema} onChange={(v: boolean) => updateForm('pedal_edema', v)} />
          <BooleanToggle label="Wheezing?" value={form.wheezing} onChange={(v: boolean) => updateForm('wheezing', v)} />
        </>
      )}

      {dashboard === 'ild' && (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>K-BILD Score (if known)</Text>
            <TextInput style={styles.input} placeholder="0-100" keyboardType="number-pad" value={form.kbild_score} onChangeText={v => updateForm('kbild_score', v)} />
          </View>
          <BooleanToggle label="Any Rash?" value={form.rash} onChange={(v: boolean) => updateForm('rash', v)} />
          <BooleanToggle label="Any Diarrhoea?" value={form.diarrhoea} onChange={(v: boolean) => updateForm('diarrhoea', v)} />
          <BooleanToggle label="Antifibrotic Medication Taken?" value={form.antifibrotic_taken} onChange={(v: boolean) => updateForm('antifibrotic_taken', v)} />
        </>
      )}

      {dashboard === 'post_icu' && (
        <>
          <NumberScale label="Energy Level" min={0} max={10} value={form.energy_level} onChange={(v: string) => updateForm('energy_level', v)} />
          <NumberScale label="Sleep Quality" min={0} max={10} value={form.sleep_quality} onChange={(v: string) => updateForm('sleep_quality', v)} />
          <NumberScale label="Anxiety Level" min={0} max={10} value={form.anxiety} onChange={(v: string) => updateForm('anxiety', v)} />
          <BooleanToggle label="Feverish (>102°F)?" value={form.feverish_or_temp_gt_102} onChange={(v: boolean) => updateForm('feverish_or_temp_gt_102', v)} />
          <BooleanToggle label="Any Confusion?" value={form.confusion} onChange={(v: boolean) => updateForm('confusion', v)} />
        </>
      )}
    </View>
  );
};

export function CommonDailyLogView({ dashboard, patientId }: { dashboard: string, patientId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [meds, setMeds] = useState<any[]>([]);
  const [medsTaken, setMedsTaken] = useState<Record<string, boolean>>({});
  
  // Missing Feature 1: Side Effects
  const [sideEffects, setSideEffects] = useState<Set<string>>(new Set());

  // Missing Feature 2: VAS Symptoms & Oxygen
  const [form, setForm] = useState<any>({
    spo2_rest: '',
    spo2_exertion: '',
    heart_rate: '',
    mmrc_today: '',
    
    // Oxygen
    oxygen_litres: '',

    // VAS Symptoms
    vas_cough: '',
    vas_phlegm: '',
    
    // Disease specific
    rescue_inhaler_puffs: '',
    night_waking: null,
    pefr_reading: '',
    controller_taken: null,
    
    sputum_colour: null,
    sputum_volume: null,
    energy_level: '',
    sleep_disturbed: null,
    wheezing: null,
    step_count_today: '',
    exercise_tolerance: null,
    chest_heaviness: '',
    haemoptysis_volume: null,
    ease_of_clearance: '',
    feverish_or_temp_gt_102: null,
    malaise: null,
    pedal_edema: null,
    
    kbild_score: '',
    antifibrotic_taken: null,
    rash: null,
    diarrhoea: null,
    
    anxiety: '',
    confusion: null,
    sleep_quality: '',
  });

  const updateForm = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  useEffect(() => {
    fetchMeds();
  }, [patientId]);

  const fetchMeds = async () => {
    const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
    const { data } = await getPatientMedications(config, patientId);
    if (data) {
      setMeds(data);
    }
  };

  const toggleMed = (id: string) => {
    setMedsTaken(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSideEffect = (effect: string) => {
    setSideEffects(prev => {
      const next = new Set(prev);
      if (next.has(effect)) next.delete(effect);
      else next.add(effect);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.spo2_rest || !form.mmrc_today) {
      Alert.alert('Missing fields', 'Please enter your SpO2 and mMRC score at minimum.');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const vas_symptoms: any = {};
      if (form.vas_cough) vas_symptoms.cough = { vas: parseInt(form.vas_cough) };
      if (form.vas_phlegm) vas_symptoms.phlegm = { vas: parseInt(form.vas_phlegm) };

      const payload: any = {
        patient_id: patientId,
        log_date: today,
        effective_dashboard: dashboard,
        spo2_rest: parseInt(form.spo2_rest),
        spo2_exertion: form.spo2_exertion ? parseInt(form.spo2_exertion) : null,
        heart_rate: form.heart_rate ? parseInt(form.heart_rate) : null,
        mmrc_today: parseInt(form.mmrc_today),
        oxygen_requirement_litres: form.oxygen_litres ? parseInt(form.oxygen_litres) : null,
        vas_symptoms: vas_symptoms,
        side_effects: Array.from(sideEffects),
        medication_compliance: medsTaken,
      };

      // Add fields based on dashboard
      if (dashboard === 'asthma') {
        if (form.rescue_inhaler_puffs) payload.rescue_inhaler_puffs = parseInt(form.rescue_inhaler_puffs);
        if (form.night_waking !== null) payload.night_waking = form.night_waking;
        if (form.pefr_reading) payload.pefr_reading = parseFloat(form.pefr_reading);
        if (form.controller_taken !== null) payload.controller_taken = form.controller_taken;
      }
      if (dashboard === 'copd') {
        if (form.sputum_colour) payload.sputum_colour = form.sputum_colour;
        if (form.sputum_volume) payload.sputum_volume = form.sputum_volume;
        if (form.energy_level) payload.energy_level = parseInt(form.energy_level);
        if (form.sleep_disturbed !== null) payload.sleep_disturbed = form.sleep_disturbed;
        if (form.wheezing !== null) payload.wheezing = form.wheezing;
        if (form.exercise_tolerance !== null) payload.exercise_tolerance = form.exercise_tolerance;
        if (form.chest_heaviness) payload.chest_heaviness = parseInt(form.chest_heaviness);
      }
      if (dashboard === 'bronchiectasis') {
        if (form.sputum_colour) payload.sputum_colour = form.sputum_colour;
        if (form.sputum_volume) payload.sputum_volume = form.sputum_volume;
        if (form.ease_of_clearance) payload.ease_of_clearance = parseInt(form.ease_of_clearance);
        if (form.feverish_or_temp_gt_102 !== null) payload.feverish_or_temp_gt_102 = form.feverish_or_temp_gt_102;
        if (form.malaise !== null) payload.malaise = form.malaise;
        if (form.pedal_edema !== null) payload.pedal_edema = form.pedal_edema;
        if (form.wheezing !== null) payload.wheezing = form.wheezing;
      }
      if (dashboard === 'ild') {
        if (form.kbild_score) payload.kbild_score = parseInt(form.kbild_score);
        if (form.antifibrotic_taken !== null) payload.antifibrotic_taken = form.antifibrotic_taken;
        if (form.rash !== null) payload.rash = form.rash;
        if (form.diarrhoea !== null) payload.diarrhoea = form.diarrhoea;
      }
      if (dashboard === 'post_icu') {
        if (form.energy_level) payload.energy_level = parseInt(form.energy_level);
        if (form.sleep_quality) payload.sleep_quality = parseInt(form.sleep_quality);
        if (form.anxiety) payload.anxiety = parseInt(form.anxiety);
        if (form.confusion !== null) payload.confusion = form.confusion;
        if (form.feverish_or_temp_gt_102 !== null) payload.feverish_or_temp_gt_102 = form.feverish_or_temp_gt_102;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      
      const res = await submitDailyLog(config, payload, session?.access_token);
      
      if (res.success) {
        Alert.alert('Success', 'Your daily log has been recorded successfully.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        if (res.error?.includes('2 logs')) {
           Alert.alert('Limit Reached', 'You have already submitted 2 logs today. If this is an emergency, please contact your doctor directly.');
        } else {
           Alert.alert('Error', res.error || 'Failed to submit log');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Daily Check-in · दैनिक लॉग</Text>
        <Text style={styles.subtitle}>Log your vitals for {dashboard.toUpperCase()}</Text>

        {/* SECTION 1: VITALS */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Common Vitals · सामान्य स्वास्थ्य जांच</Text>
          
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SpO₂ at Rest · आराम के समय ऑक्सीजन (%) *</Text>
            <TextInput style={styles.input} placeholder="e.g. 96" keyboardType="number-pad" value={form.spo2_rest} onChangeText={v => updateForm('spo2_rest', v)} maxLength={3} />
          </View>
          
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SpO₂ After Walking (Optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. 92" keyboardType="number-pad" value={form.spo2_exertion} onChangeText={v => updateForm('spo2_exertion', v)} maxLength={3} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Heart Rate (Optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. 85" keyboardType="number-pad" value={form.heart_rate} onChangeText={v => updateForm('heart_rate', v)} maxLength={3} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Breathlessness (mMRC Grade) · सांस फूलना *</Text>
          <NumberScale label="Grade" min={0} max={4} value={form.mmrc_today} onChange={(v: string) => updateForm('mmrc_today', v)} />
          
          <View style={{marginTop: 16}}>
            <Text style={styles.fieldLabel}>Extra Oxygen Requirement (L/min) (Optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. 2" keyboardType="number-pad" value={form.oxygen_litres} onChangeText={v => updateForm('oxygen_litres', v)} maxLength={2} />
          </View>
        </View>

        {/* SECTION 2: SYMPTOMS (VAS) */}
        <View style={styles.card}>
           <Text style={styles.sectionHeader}>Symptoms Severity (0-10) · लक्षणों की तीव्रता</Text>
           <NumberScale label="Cough · खांसी" min={0} max={10} value={form.vas_cough} onChange={(v: string) => updateForm('vas_cough', v)} />
           <NumberScale label="Phlegm · बलगम" min={0} max={10} value={form.vas_phlegm} onChange={(v: string) => updateForm('vas_phlegm', v)} />
        </View>

        {/* SECTION 3: MEDICATION */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Medicines Taken · दवाएं</Text>
          {meds.length > 0 ? (
            meds.map(med => (
              <TouchableOpacity key={med.id} style={styles.medCheckboxRow} onPress={() => toggleMed(med.id)}>
                <View style={[styles.medCheckbox, medsTaken[med.id] && styles.medCheckboxActive]}>
                  {medsTaken[med.id] && <CheckCircle2 size={16} color="#fff" />}
                </View>
                <Text style={styles.medName}>{med.name} {med.dose || ''}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.helper}>No active meds for this date.</Text>
          )}

          <Text style={[styles.sectionHeader, {marginTop: 24}]}>Side Effects · दुष्प्रभाव</Text>
          <View style={styles.pickerContainer}>
            {['nausea', 'headache', 'dizziness', 'palpitations', 'insomnia'].map(effect => (
              <TouchableOpacity key={effect} style={[styles.pickerBtn, sideEffects.has(effect) && styles.pickerBtnActive]} onPress={() => toggleSideEffect(effect)}>
                <Text style={[styles.pickerText, sideEffects.has(effect) && styles.pickerTextActive]}>{effect}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <DiseaseSpecificDailyLog dashboard={dashboard} form={form} updateForm={updateForm} />

      </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity 
          style={[styles.submitBtn, (!form.spo2_rest || !form.mmrc_today) && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={submitting || !form.spo2_rest || !form.mmrc_today}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Daily Log</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  
  fieldGroup: { marginBottom: 20 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, flex: 1 },
  helper: { fontSize: 14, color: '#64748b' },
  
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },

  scaleContainer: { paddingVertical: 4 },
  scaleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  scaleBtnActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  scaleText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  scaleTextActive: { color: '#ffffff' },

  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerBtnActive: {
    backgroundColor: colors.brand.primaryLight,
    borderColor: colors.brand.primary,
  },
  pickerText: { fontSize: 14, fontWeight: '600', color: '#64748b', textTransform: 'capitalize' },
  pickerTextActive: { color: colors.brand.primaryDark },

  toggleGroup: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleBtnActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#ffffff' },

  medCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  medCheckbox: {
    width: 24, height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medCheckboxActive: {
    backgroundColor: '#0f6e56',
    borderColor: '#0f6e56',
  },
  medName: { fontSize: 15, color: '#0f172a', fontWeight: '500' },

  stickyFooter: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtn: {
    backgroundColor: '#0f6e56', // Teal
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});
