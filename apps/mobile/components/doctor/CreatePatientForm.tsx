import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { colors } from '@o2plus/theme';
import { supabase } from '../../lib/supabase';
import { Check, ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react-native';

export function CreatePatientForm({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Basic
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  
  // Diagnosis
  const [diseaseCategory, setDiseaseCategory] = useState('COPD');
  const [comorbidities, setComorbidities] = useState<string[]>([]);
  
  // Vitals & PFT
  const [spo2, setSpo2] = useState('');
  const [hr, setHr] = useState('');
  const [fev1, setFev1] = useState('');
  const [fvc, setFvc] = useState('');
  
  // Medications
  const [meds, setMeds] = useState<{name: string, dose: string, freq: string}[]>([]);
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medFreq, setMedFreq] = useState('');

  const COMORBIDITIES_LIST = ['Hypertension', 'Diabetes Type 2', 'IHD', 'Obesity', 'Anemia', 'GERD', 'CKD'];

  const toggleComorbidity = (c: string) => {
    if (comorbidities.includes(c)) setComorbidities(comorbidities.filter(x => x !== c));
    else setComorbidities([...comorbidities, c]);
  };

  const addMed = () => {
    if (!medName) return;
    setMeds([...meds, { name: medName, dose: medDose, freq: medFreq || 'OD' }]);
    setMedName(''); setMedDose(''); setMedFreq('');
  };

  const removeMed = (index: number) => {
    setMeds(meds.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name || !mobile || !age || !spo2 || !hr) {
      Alert.alert('Required Fields Missing', 'Please fill in Name, Mobile, Age, Baseline SpO₂ and Baseline Heart Rate.');
      return;
    }
    
    setLoading(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      
      const primaryDiagMap: any = {
        'COPD': 'copd', 'Asthma': 'asthma', 'ILD': 'ild', 
        'Bronchiectasis': 'bronchiectasis', 'Post ICU Recovery': 'post_icu'
      };

      const payload = {
        basicInfo: {
          name,
          age,
          date_of_birth: `${new Date().getFullYear() - Number(age)}-01-01`,
          mobile_number: mobile,
          gender,
          baseline_spo2: parseFloat(spo2),
          baseline_heart_rate: parseFloat(hr),
        },
        diagnosis: {
          primary_diagnosis: primaryDiagMap[diseaseCategory] || 'copd',
          disease_category: diseaseCategory,
          comorbidities,
        },
        respSupport: { hasRespSupport: false },
        pftRows: fev1 && fvc ? [{
          test_date: new Date().toISOString().split('T')[0],
          fev1: parseFloat(fev1),
          fvc: parseFloat(fvc),
          fev1_fvc_ratio: (parseFloat(fev1) / parseFloat(fvc)) * 100,
        }] : [],
        medications: meds.map(m => ({
          drug_name: m.name,
          dose: m.dose,
          frequency: m.freq,
          start_date: new Date().toISOString().split('T')[0],
        })),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${baseUrl}/api/patients`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const resBody = await res.json();
        if (resBody.patientId) {
          await fetch(`${baseUrl}/api/patients/provision-auth`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ patientId: resBody.patientId, mobile_number: mobile }),
          });
        }
        Alert.alert('Success', 'Patient registered successfully!', [{ text: 'OK', onPress: onComplete }]);
      } else {
        const body = await res.json().catch(() => ({}));
        Alert.alert('Error', body.error || 'Failed to add patient.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepper}>
        {[1,2,3,4].map(s => (
          <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} placeholder="Patient Name" value={name} onChangeText={setName} />
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput style={styles.input} placeholder="10-digit number" keyboardType="phone-pad" maxLength={10} value={mobile} onChangeText={t => setMobile(t.replace(/\D/g, ''))} />
            <View style={styles.row}>
              <View style={styles.flex1}><Text style={styles.label}>Age *</Text><TextInput style={styles.input} keyboardType="number-pad" value={age} onChangeText={setAge} /></View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Gender *</Text>
                <View style={styles.genderRow}>
                  {['Male', 'Female'].map(g => (
                    <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderActive]} onPress={() => setGender(g)}>
                      <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Diagnosis</Text>
            <Text style={styles.label}>Disease Category *</Text>
            <View style={styles.categoryGrid}>
              {['COPD', 'Asthma', 'ILD', 'Bronchiectasis', 'Post ICU Recovery'].map(c => (
                <TouchableOpacity key={c} style={[styles.catBtn, diseaseCategory === c && styles.catActive]} onPress={() => setDiseaseCategory(c)}>
                  <Text style={[styles.catText, diseaseCategory === c && styles.catTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, {marginTop: 24}]}>Comorbidities</Text>
            <View style={styles.categoryGrid}>
              {COMORBIDITIES_LIST.map(c => (
                <TouchableOpacity key={c} style={[styles.catBtn, comorbidities.includes(c) && styles.catActive]} onPress={() => toggleComorbidity(c)}>
                  {comorbidities.includes(c) && <Check size={12} color="#fff" style={{marginRight: 4}} />}
                  <Text style={[styles.catText, comorbidities.includes(c) && styles.catTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Baseline Vitals</Text>
            <View style={styles.row}>
              <View style={styles.flex1}><Text style={styles.label}>SpO2 (%) *</Text><TextInput style={styles.input} keyboardType="numeric" value={spo2} onChangeText={setSpo2} /></View>
              <View style={styles.flex1}><Text style={styles.label}>Heart Rate *</Text><TextInput style={styles.input} keyboardType="numeric" value={hr} onChangeText={setHr} /></View>
            </View>
            
            <Text style={[styles.sectionTitle, {marginTop: 24}]}>Pulmonary Function (Optional)</Text>
            <View style={styles.row}>
              <View style={styles.flex1}><Text style={styles.label}>FEV1 (L)</Text><TextInput style={styles.input} keyboardType="numeric" value={fev1} onChangeText={setFev1} /></View>
              <View style={styles.flex1}><Text style={styles.label}>FVC (L)</Text><TextInput style={styles.input} keyboardType="numeric" value={fvc} onChangeText={setFvc} /></View>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Medications</Text>
            <View style={styles.row}>
              <View style={{flex: 2}}><TextInput style={styles.input} placeholder="Drug Name" value={medName} onChangeText={setMedName} /></View>
              <View style={{flex: 1, marginLeft: 8}}><TextInput style={styles.input} placeholder="Dose" value={medDose} onChangeText={setMedDose} /></View>
              <TouchableOpacity style={styles.addMedBtn} onPress={addMed}><Plus color="#fff" size={20}/></TouchableOpacity>
            </View>
            
            <View style={styles.medList}>
              {meds.map((m, i) => (
                <View key={i} style={styles.medRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.medName}>{m.name}</Text>
                    <Text style={styles.medDose}>{m.dose} • {m.freq}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMed(i)}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
                </View>
              ))}
              {meds.length === 0 && <Text style={{color: '#94a3b8', textAlign: 'center', marginTop: 20}}>No medications added.</Text>}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.navBtn, step === 1 && {opacity: 0}]} onPress={() => step > 1 && setStep(step - 1)} disabled={step === 1}>
          <ChevronLeft size={24} color="#126969" />
        </TouchableOpacity>
        
        {step < 4 ? (
          <TouchableOpacity style={[styles.navBtn, {backgroundColor: '#126969'}]} onPress={() => setStep(step + 1)}>
            <Text style={{color: '#fff', fontWeight: 'bold', marginRight: 8}}>Next</Text>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.navBtn, {backgroundColor: '#10b981', paddingHorizontal: 24}]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontWeight: 'bold'}}>Submit</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  stepper: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: '#fff' },
  stepDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  stepDotActive: { backgroundColor: '#126969' },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16, color: '#0f172a' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1, marginHorizontal: 4 },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, alignItems: 'center' },
  genderActive: { backgroundColor: '#126969', borderColor: '#126969' },
  genderText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  genderTextActive: { color: '#fff' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  catActive: { backgroundColor: '#126969', borderColor: '#126969' },
  catText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  catTextActive: { color: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  navBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  addMedBtn: { backgroundColor: '#126969', width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  medList: { marginTop: 16 },
  medRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  medName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  medDose: { fontSize: 13, color: '#64748b' },
});
