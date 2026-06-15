  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id, doctor_id")
    .eq("id", patientId)
    .single();

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  if (user.id !== patientId && user.id !== patient.doctor_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date().toISOString().split("T")[0] as string;

  const { data: medications } = await supabase
    .from("medications")
    .select("id, drug_name, dose, dose_unit, route, frequency, start_date, end_date")
    .eq("patient_id", patientId)
    .lte("start_date", today)
    .order("drug_name", { ascending: true });

  const activeMeds = (medications ?? []).filter((med) => !med.end_date || med.end_date >= today);

  return NextResponse.json({ medications: activeMeds });
}
